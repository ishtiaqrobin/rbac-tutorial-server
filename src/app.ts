// ─────────────────────────────────────────────────────────────────────────────
// app.ts — Express Application Setup
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandler";
import { notFound } from "./app/middlewares/notFound";
import { IndexRoutes } from "./app/routes";
import { env } from "./app/config/env";

const app: Application = express();

// ── Security Middlewares ─────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: [env.FRONTEND_URL, env.BETTER_AUTH_URL, "http://localhost:3000"],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "⚡ RBAC Tutorial API is running!",
    version: "1.0.0",
    environment: env.NODE_ENV,
  });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/v1", IndexRoutes);
app.use("/api", IndexRoutes);

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use(notFound);

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use(globalErrorHandler);

export default app;
