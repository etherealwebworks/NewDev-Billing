import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { createClientSchema, updateClientSchema, clientQuerySchema } from "../validators/clientValidators.js";
import { addDays } from "../utils/dates.js";

/**
 * GET /api/clients — admin only
 * Search + filter by staff/status + sort + pagination. Joins the client's
 * most recent project so the table can show deadline/status/amounts without
 * N+1 queries.
 */
export async function listClients(req, res, next) {
  try {
    const q = clientQuerySchema.parse(req.query);
    const from = (q.page - 1) * q.page_size;
    const to = from + q.page_size - 1;

    let query = supabaseAdmin
      .from("clients")
      .select(
        `
        id, client_name, company_name, phone, email, created_at,
        projects (
          id, project_name, work_status, submission_deadline, start_date,
          project_amount, advance_amount, assigned_staff_id,
          project_type, event_name, number_of_posters,
          assigned_staff:profiles!projects_assigned_staff_id_fkey ( id, full_name, avatar_url )
        )
      `,
        { count: "exact" }
      )
      .is("archived_at", null)
      .order(q.sort === "client_name" ? "client_name" : q.sort, { ascending: q.order === "asc" })
      .range(from, to);

    if (q.search) {
      query = query.or(
        `client_name.ilike.%${q.search}%,company_name.ilike.%${q.search}%,email.ilike.%${q.search}%,phone.ilike.%${q.search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw new ApiError(500, "Could not load clients.");

    // Filtering by staff/status happens post-fetch since it applies to the
    // nested project, not the client row itself (Supabase can't filter
    // parent rows by a nested-relation predicate in one query cleanly).
    let rows = data;
    if (q.staff_id) {
      rows = rows.filter((c) => c.projects?.some((p) => p.assigned_staff_id === q.staff_id));
    }
    if (q.status) {
      rows = rows.filter((c) =>
        c.projects?.some((p) => {
          const overdue = p.work_status !== "completed" && p.submission_deadline < today();
          return q.status === "overdue" ? overdue : p.work_status === q.status;
        })
      );
    }

    // Payment totals per client (sum across their projects' invoices).
    // Computed directly from invoices + payments rather than the
    // invoice_balances view, since PostgREST can't auto-embed a view with
    // no declared foreign key back to invoices.
    const clientIds = rows.map((c) => c.id);
    let balances = {};
    if (clientIds.length) {
      const { data: invoiceRows } = await supabaseAdmin
        .from("invoices")
        .select("id, client_id, total_amount")
        .in("client_id", clientIds)
        .in("invoice_status", ["issued", "paid"]);

      const invoiceIds = (invoiceRows || []).map((i) => i.id);
      let paidByInvoice = {};
      if (invoiceIds.length) {
        const { data: paymentRows } = await supabaseAdmin
          .from("payments")
          .select("invoice_id, amount")
          .in("invoice_id", invoiceIds)
          .eq("is_reversed", false);
        for (const p of paymentRows || []) {
          paidByInvoice[p.invoice_id] = (paidByInvoice[p.invoice_id] || 0) + Number(p.amount);
        }
      }

      for (const inv of invoiceRows || []) {
        const paid = paidByInvoice[inv.id] || 0;
        const b = balances[inv.client_id] || { total: 0, paid: 0, outstanding: 0 };
        b.total += Number(inv.total_amount);
        b.paid += paid;
        b.outstanding += Math.max(Number(inv.total_amount) - paid, 0);
        balances[inv.client_id] = b;
      }
    }

    res.json({
      clients: rows.map((c) => ({ ...c, billing: balances[c.id] || { total: 0, paid: 0, outstanding: 0 } })),
      pagination: { page: q.page, page_size: q.page_size, total: count ?? rows.length },
    });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ error: "Invalid query parameters." });
    next(err);
  }
}

/**
 * GET /api/clients/:id — admin only
 */
export async function getClient(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select(
        `*, projects ( *, assigned_staff:profiles!projects_assigned_staff_id_fkey ( id, full_name, avatar_url ) )`
      )
      .eq("id", req.params.id)
      .is("archived_at", null)
      .single();

    if (error || !data) throw new ApiError(404, "Client not found.");
    res.json({ client: data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/clients — admin only
 * Creates the client AND its first project atomically via the
 * create_client_with_project() Postgres function.
 */
export async function createClient(req, res, next) {
  try {
    const body = createClientSchema.parse(req.body);

    const deadline =
      body.submission_deadline && body.deadline_manually_set
        ? body.submission_deadline
        : addDays(body.start_date, body.allowed_submission_days);

    const { data, error } = await supabaseAdmin.rpc("create_client_with_project", {
      p_client_name: body.client_name,
      p_company_name: body.company_name || null,
      p_phone: body.phone,
      p_email: body.email || null,
      p_address: body.address || null,
      p_project_name: body.project_name,
      p_description: body.description || null,
      p_number_of_videos: body.number_of_videos,
      p_allowed_submission_days: body.allowed_submission_days,
      p_start_date: body.start_date,
      p_submission_deadline: deadline,
      p_deadline_manually_set: !!body.deadline_manually_set,
      p_assigned_staff_id: body.assigned_staff_id,
      p_notes: body.notes || null,
      p_project_amount: body.project_amount,
      p_advance_amount: body.advance_amount || 0,
      p_payment_due_date: body.payment_due_date || null,
      p_created_by: req.user.id,
    });

    if (error) throw new ApiError(400, error.message || "Could not create client.");

    const [{ client_id, project_id }] = data;

    // The create_client_with_project() RPC predates Phase 8's service/event
    // fields — set them with a follow-up update rather than touching the
    // migration 0002 function.
    const { error: extraFieldsError } = await supabaseAdmin
      .from("projects")
      .update({
        service_id: body.service_id || null,
        project_type: body.project_type || "standard",
        event_name: body.project_type === "event" ? body.event_name : null,
        number_of_posters: body.number_of_posters || 0,
      })
      .eq("id", project_id);
    if (extraFieldsError) throw new ApiError(500, "Client created, but could not save the service/event details.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "client.create",
      entity_type: "client",
      entity_id: client_id,
      details: { project_id },
    });

    res.status(201).json({ client_id, project_id });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0]?.message || "Invalid input." });
    }
    next(err);
  }
}

/**
 * PUT /api/clients/:id — admin only. Client fields only; project/billing
 * fields are edited through the Projects endpoints (Phase 3).
 */
export async function updateClient(req, res, next) {
  try {
    const body = updateClientSchema.parse(req.body);
    if (body.email === "") body.email = null;

    const { data, error } = await supabaseAdmin
      .from("clients")
      .update(body)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error || !data) throw new ApiError(404, "Client not found.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "client.update",
      entity_type: "client",
      entity_id: req.params.id,
      details: body,
    });

    res.json({ client: data });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0]?.message || "Invalid input." });
    }
    next(err);
  }
}

/**
 * DELETE /api/clients/:id — admin only. Soft delete (archive), never a hard
 * delete, so historical invoices/payments stay intact.
 */
export async function archiveClient(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error || !data) throw new ApiError(404, "Client not found.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "client.archive",
      entity_type: "client",
      entity_id: req.params.id,
    });

    res.json({ message: "Client archived." });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/clients/:id/permanent — admin only. A REAL delete, not the
 * archive above. Only allowed when the client has no billing history to
 * orphan — if it has any invoices, this is refused and the client stays
 * archivable-only, same principle as the rest of this app's soft-delete
 * defaults.
 */
export async function deleteClientPermanently(req, res, next) {
  try {
    const { count } = await supabaseAdmin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("client_id", req.params.id);

    if (count && count > 0) {
      throw new ApiError(
        400,
        "This client has billing history and can only be archived, not permanently deleted."
      );
    }

    const { data, error } = await supabaseAdmin.from("clients").delete().eq("id", req.params.id).select().single();
    if (error || !data) throw new ApiError(404, "Client not found.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "client.delete_permanent",
      entity_type: "client",
      entity_id: req.params.id,
    });

    res.json({ message: "Client permanently deleted." });
  } catch (err) {
    next(err);
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
