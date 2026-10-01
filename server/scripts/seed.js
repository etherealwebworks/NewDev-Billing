/**
 * Development seed script. Creates:
 *  - 1 admin account
 *  - 2 staff accounts
 *  - 5 sample clients, each with a project
 *  - invoices on some projects (issued)
 *  - partial and full payments on some of those invoices
 *
 * Run with: npm run seed   (from the server/ directory, after `npm install`
 * and after running BOTH migrations against your Supabase project)
 *
 * Requires server/.env to have real SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 * values — this talks to your actual Supabase project, so don't run it
 * against production.
 */
import { supabaseAdmin } from "../src/config/supabase.js";

const ADMIN = { email: "admin@yourcompany.dev", password: "Admin@12345", full_name: "Priya Sharma" };
const STAFF = [
  {
    email: "staff1@yourcompany.dev",
    password: "Staff@12345",
    full_name: "Arjun Mehta",
    phone: "9876500001",
    avatar_url: "https://i.pravatar.cc/200?u=arjun-mehta-newdev",
  },
  {
    email: "staff2@yourcompany.dev",
    password: "Staff@12345",
    full_name: "Divya Nair",
    phone: "9876500002",
    avatar_url: "https://i.pravatar.cc/200?u=divya-nair-newdev",
  },
];

const CLIENTS = [
  { client_name: "Rohan Kapoor", company_name: "Kapoor Textiles", phone: "9876512345", email: "rohan@kapoortextiles.example" },
  { client_name: "Sneha Iyer", company_name: "Iyer Organic Foods", phone: "9876523456", email: "sneha@iyerorganic.example" },
  { client_name: "Vikram Malhotra", company_name: null, phone: "9876534567", email: "vikram.m@example.com" },
  { client_name: "Ananya Reddy", company_name: "Reddy Interiors", phone: "9876545678", email: "ananya@reddyinteriors.example" },
  { client_name: "Karthik Subramaniam", company_name: "Subramaniam & Co", phone: "9876556789", email: "karthik@subco.example" },
];

function daysFromNow(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function upsertAuthUser({ email, password, full_name, phone, avatar_url, role }) {
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === email);
  if (found) {
    console.log(`  already exists: ${email}`);
    return found.id;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  await supabaseAdmin.from("profiles").insert({
    id: data.user.id,
    full_name,
    email,
    phone: phone || null,
    avatar_url: avatar_url || null,
    role,
    is_active: true,
  });

  console.log(`  created: ${email} / ${password}`);
  return data.user.id;
}

async function main() {
  console.log("Seeding admin + staff accounts...");
  await upsertAuthUser({ ...ADMIN, role: "admin" });
  const staffIds = [];
  for (const s of STAFF) {
    staffIds.push(await upsertAuthUser({ ...s, role: "staff" }));
  }

  const { data: adminProfile } = await supabaseAdmin.from("profiles").select("id").eq("email", ADMIN.email).single();

  console.log("Seeding services...");
  const SERVICES = [
    { name: "Instagram Reels Package", description: "Short-form reels for social media.", number_of_videos: 5, number_of_posters: 2, budget: 8000 },
    { name: "Event Highlight Video", description: "Same-day or next-day event highlight edit.", number_of_videos: 1, number_of_posters: 1, budget: 15000 },
  ];
  for (const svc of SERVICES) {
    const { data: existing } = await supabaseAdmin.from("services").select("id").eq("name", svc.name).maybeSingle();
    if (!existing) {
      await supabaseAdmin.from("services").insert({ ...svc, created_by: adminProfile.id });
    }
  }

  console.log("Seeding clients + projects...");
  const projectSeeds = [
    { videos: 8, days: 10, startOffset: -20, statusOverride: "completed", amount: 12000, staffIdx: 0 },
    { videos: 5, days: 7, startOffset: -12, statusOverride: "in_progress", amount: 8000, staffIdx: 1 },
    { videos: 10, days: 5, startOffset: -18, statusOverride: "not_started", amount: 15000, staffIdx: 0 }, // overdue
    { videos: 6, days: 14, startOffset: -3, statusOverride: "in_progress", amount: 9500, staffIdx: 1 },
    { videos: 4, days: 7, startOffset: 0, statusOverride: "not_started", amount: 6000, staffIdx: 0 },
  ];

  const createdProjects = [];

  for (let i = 0; i < CLIENTS.length; i++) {
    const c = CLIENTS[i];
    const seed = projectSeeds[i];

    const { data: existingClient } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("phone", c.phone)
      .maybeSingle();

    let clientId = existingClient?.id;
    if (!clientId) {
      const { data: client, error } = await supabaseAdmin
        .from("clients")
        .insert({ ...c, created_by: adminProfile.id })
        .select()
        .single();
      if (error) throw error;
      clientId = client.id;
    }

    const startDate = daysFromNow(seed.startOffset);
    const deadline = daysFromNow(seed.startOffset + seed.days);

    const { data: existingProject } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("client_id", clientId)
      .maybeSingle();

    let project = existingProject;
    if (!project) {
      const { data: newProject, error } = await supabaseAdmin
        .from("projects")
        .insert({
          client_id: clientId,
          project_name: `${c.company_name || c.client_name} — Video Editing`,
          description: "Seeded sample project.",
          number_of_videos: seed.videos,
          allowed_submission_days: seed.days,
          start_date: startDate,
          submission_deadline: deadline,
          assigned_staff_id: staffIds[seed.staffIdx],
          work_status: seed.statusOverride,
          completion_date: seed.statusOverride === "completed" ? new Date().toISOString() : null,
          project_amount: seed.amount,
          advance_amount: 0,
          created_by: adminProfile.id,
        })
        .select()
        .single();
      if (error) throw error;
      project = newProject;
    }

    createdProjects.push({ project, client: { ...c, id: clientId }, seed });
  }

  console.log("Seeding invoices + payments...");
  const { data: settings } = await supabaseAdmin.from("company_settings").select("*").eq("id", 1).single();

  // Invoice + payment scenarios: [0] fully paid, [1] partially paid,
  // [2] unpaid + overdue, [3] no invoice yet, [4] no invoice yet.
  for (let i = 0; i < 3; i++) {
    const { project, client } = createdProjects[i];

    const { data: existingInvoice } = await supabaseAdmin
      .from("invoices")
      .select("id")
      .eq("project_id", project.id)
      .maybeSingle();
    if (existingInvoice) continue;

    const { data: invoiceNumber } = await supabaseAdmin.rpc("next_invoice_number", {
      prefix: settings.invoice_prefix || "INV",
    });

    const { data: invoice, error } = await supabaseAdmin
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        client_id: client.id,
        project_id: project.id,
        invoice_date: daysFromNow(-2),
        due_date: daysFromNow(7),
        client_details_snapshot: {
          client_name: client.client_name,
          company_name: client.company_name,
          phone: client.phone,
          email: client.email,
          address: null,
        },
        company_details_snapshot: {
          company_name: settings.company_name,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          website: settings.website,
          footer: settings.invoice_footer,
          payment_instructions: settings.payment_instructions,
          authorized_signatory_name: settings.authorized_signatory_name,
          currency: settings.default_currency,
        },
        items: [{ description: project.project_name, quantity: 1, unit_price: project.project_amount, total: project.project_amount }],
        subtotal: project.project_amount,
        total_amount: project.project_amount,
        invoice_status: "issued",
        created_by: adminProfile.id,
      })
      .select()
      .single();
    if (error) throw error;

    if (i === 0) {
      // Fully paid
      await supabaseAdmin.from("payments").insert({
        invoice_id: invoice.id,
        amount: invoice.total_amount,
        payment_method: "upi",
        payment_date: daysFromNow(-1),
        transaction_reference: "UTR-SEED-0001",
        recorded_by: adminProfile.id,
      });
      await supabaseAdmin.from("invoices").update({ invoice_status: "paid" }).eq("id", invoice.id);
    } else if (i === 1) {
      // Partially paid
      await supabaseAdmin.from("payments").insert({
        invoice_id: invoice.id,
        amount: Math.round(invoice.total_amount * 0.4),
        payment_method: "bank_transfer",
        payment_date: daysFromNow(-1),
        transaction_reference: "UTR-SEED-0002",
        recorded_by: adminProfile.id,
      });
    }
    // i === 2: left unpaid on purpose (overdue project + unpaid invoice)
  }

  console.log("\nDone. Sign in with:");
  console.log(`  Admin — ${ADMIN.email} / ${ADMIN.password}`);
  STAFF.forEach((s) => console.log(`  Staff — ${s.email} / ${s.password}`));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
