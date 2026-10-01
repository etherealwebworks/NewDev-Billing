import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import clientsRoutes from "./routes/clientsRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import projectsRoutes from "./routes/projectsRoutes.js";
import invoicesRoutes from "./routes/invoicesRoutes.js";
import paymentsRoutes from "./routes/paymentsRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import reportsRoutes from "./routes/reportsRoutes.js";
import servicesRoutes from "./routes/servicesRoutes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/services", servicesRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
