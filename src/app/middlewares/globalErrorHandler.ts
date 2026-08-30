/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// ─────────────────────────────────────────────────────────────────────────────
// middlewares/globalErrorHandler.ts — Central Express error handler
//
// EDUCATIONAL NOTE
// ─────────────────
// Express calls this middleware whenever next(err) is called anywhere.
// It maps every possible error type to a clean, consistent JSON response so
// the client never receives a raw stack trace in production.
//
// Error type hierarchy handled:
//   1. AppError          — our own operational errors (auth, validation, 404s)
//   2. ZodError          — request body validation errors (via handleZodError)
//   3. PrismaClient*     — all Prisma database error variants
//   4. SyntaxError       — malformed JSON body
//   5. Generic Error     — unexpected bugs (message hidden in production)
// ─────────────────────────────────────────────────────────────────────────────

import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import status from "http-status";
import { Prisma } from "../../generated/prisma";
import { TErrorResponse, TErrorSources } from "../interfaces/error.interface";
import AppError from "../errorHelpers/AppError";
import { handleZodError } from "../errorHelpers/handleZodError";
import {
  handlePrismaInitializationError,
  handlePrismaKnownRequestError,
  handlePrismaRustPanicError,
  handlePrismaUnknownRequestError,
  handlePrismaValidationError,
} from "../errorHelpers/handlePrismaError";
import { env } from "../config/env";

export const globalErrorHandler = async (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  // ── Defaults ─────────────────────────────────────────────────────────────
  let statusCode: number = status.INTERNAL_SERVER_ERROR;
  let message = "Internal Server Error";
  let errorSources: TErrorSources[] = [];

  // ── Map each error type ───────────────────────────────────────────────────
  if (err instanceof AppError) {
    // Operational / expected errors (thrown by us)
    statusCode = err.statusCode;
    message = err.message;
    errorSources = err.errorSources ?? [{ path: "", message: err.message }];
  } else if (err instanceof z.ZodError) {
    const simplified = handleZodError(err);
    statusCode = simplified.statusCode ?? status.BAD_REQUEST;
    message = simplified.message;
    errorSources = simplified.errorSources ?? [];
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const simplified = handlePrismaKnownRequestError(err);
    statusCode = simplified.statusCode ?? status.BAD_REQUEST;
    message = simplified.message;
    errorSources = simplified.errorSources ?? [];
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    const simplified = handlePrismaValidationError(err);
    statusCode = simplified.statusCode ?? status.BAD_REQUEST;
    message = simplified.message;
    errorSources = simplified.errorSources ?? [];
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    const simplified = handlePrismaInitializationError(err);
    statusCode = simplified.statusCode ?? status.SERVICE_UNAVAILABLE;
    message = simplified.message;
    errorSources = simplified.errorSources ?? [];
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    const simplified = handlePrismaUnknownRequestError(err);
    statusCode = simplified.statusCode ?? status.INTERNAL_SERVER_ERROR;
    message = simplified.message;
    errorSources = simplified.errorSources ?? [];
  } else if (err instanceof Prisma.PrismaClientRustPanicError) {
    const simplified = handlePrismaRustPanicError(err);
    statusCode = simplified.statusCode ?? status.INTERNAL_SERVER_ERROR;
    message = simplified.message;
    errorSources = simplified.errorSources ?? [];
  } else if (err instanceof SyntaxError && "body" in err) {
    // express.json() failed to parse the body
    statusCode = status.BAD_REQUEST;
    message = "Malformed JSON in request body";
    errorSources = [{ path: "body", message }];
  } else if (err instanceof Error) {
    // Generic unexpected bug — never expose in production
    message =
      env.NODE_ENV === "development" ? err.message : "Internal Server Error";
    errorSources = [{ path: "", message }];
  } else {
    errorSources = [{ path: "", message: "An unexpected error occurred." }];
  }

  // ── Server-side logging (5xx always, 4xx only in dev) ─────────────────────
  const shouldLog = statusCode >= 500 || env.NODE_ENV === "development";
  if (shouldLog) {
    console.error(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${statusCode} ${message}`,
    );
    if (env.NODE_ENV === "development") console.error(err);
  }

  // ── Send response ─────────────────────────────────────────────────────────
  const errorResponse: TErrorResponse = {
    statusCode,
    success: false,
    message,
    errorSources,
    stack: env.NODE_ENV === "development" ? err?.stack : undefined,
    error: env.NODE_ENV === "development" ? err : undefined,
  };

  res.status(statusCode).json(errorResponse);
};

export default globalErrorHandler;
