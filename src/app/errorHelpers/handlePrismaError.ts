import { Prisma } from "../../generated/prisma";
import { TErrorResponse, TErrorSources } from "../interfaces/error.interface";
import status from "http-status";

/**
 * Handles Prisma's `PrismaClientKnownRequestError` — the most common runtime
 * errors thrown by the query engine (unique constraint, missing record, FK).
 *
 * Reference: https://www.prisma.io/docs/orm/reference/error-reference
 */
export const handlePrismaKnownRequestError = (
  err: Prisma.PrismaClientKnownRequestError,
): TErrorResponse => {
  let statusCode: number = status.BAD_REQUEST;
  let message = "Database Request Error";
  let errorSources: TErrorSources[] = [];

  switch (err.code) {
    // ── Unique constraint failed ──────────────────────────────────────────
    case "P2002": {
      const target = err.meta?.target as string[] | string | undefined;
      const fieldName = Array.isArray(target)
        ? target.join(", ")
        : target || "field";
      statusCode = status.CONFLICT;
      message = `Duplicate value for ${fieldName}. This value already exists.`;
      errorSources = [
        {
          path: Array.isArray(target) ? target.join(".") : String(target || ""),
          message: `${fieldName} already exists`,
        },
      ];
      break;
    }

    // ── Record not found (update / delete / findUniqueOrThrow) ────────────
    case "P2025": {
      statusCode = status.NOT_FOUND;
      message = "Record Not Found";
      errorSources = [
        {
          path: "",
          message: (err.meta?.cause as string) || "Record not found",
        },
      ];
      break;
    }

    // ── Foreign key constraint failed ─────────────────────────────────────
    case "P2003": {
      const fieldName = (err.meta?.field_name as string) || "foreign key";
      statusCode = status.BAD_REQUEST;
      message = "Foreign Key Constraint Failed";
      errorSources = [
        {
          path: fieldName,
          message: `Related record for '${fieldName}' was not found or is still connected.`,
        },
      ];
      break;
    }

    // ── Value too long for column ─────────────────────────────────────────
    case "P2000": {
      const column = (err.meta?.column_name as string) || "field";
      statusCode = status.BAD_REQUEST;
      message = "Input Value Too Long";
      errorSources = [
        {
          path: column,
          message: `The value provided for '${column}' is too long.`,
        },
      ];
      break;
    }

    // ── Null constraint violation ─────────────────────────────────────────
    case "P2011": {
      const constraint = (err.meta?.constraint as string) || "field";
      statusCode = status.BAD_REQUEST;
      message = "Null Constraint Violation";
      errorSources = [
        {
          path: constraint,
          message: `'${constraint}' cannot be null.`,
        },
      ];
      break;
    }

    // ── Missing required value ────────────────────────────────────────────
    case "P2012": {
      const path = (err.meta?.path as string) || "field";
      statusCode = status.BAD_REQUEST;
      message = "Missing Required Value";
      errorSources = [
        {
          path,
          message: `A required value is missing for '${path}'.`,
        },
      ];
      break;
    }

    // ── Required relation violation ───────────────────────────────────────
    case "P2014": {
      const relation = (err.meta?.relation_name as string) || "relation";
      statusCode = status.BAD_REQUEST;
      message = "Relation Constraint Violation";
      errorSources = [
        {
          path: relation,
          message: `The change would violate the required relation '${relation}'.`,
        },
      ];
      break;
    }

    // ── Invalid ID format (e.g. bad UUID / ObjectId) ──────────────────────
    case "P2023": {
      statusCode = status.BAD_REQUEST;
      message = "Invalid ID Format";
      errorSources = [
        {
          path: "id",
          message:
            (err.meta?.message as string) || "The provided ID is malformed.",
        },
      ];
      break;
    }

    // ── Connection pool timeout ───────────────────────────────────────────
    case "P2024": {
      statusCode = status.SERVICE_UNAVAILABLE;
      message = "Database Connection Timeout";
      errorSources = [
        {
          path: "",
          message: "The database is busy. Please try again in a moment.",
        },
      ];
      break;
    }

    // ── Transaction write conflict / deadlock ─────────────────────────────
    case "P2034": {
      statusCode = status.CONFLICT;
      message = "Transaction Conflict";
      errorSources = [
        {
          path: "",
          message: "A conflicting write occurred. Please retry the operation.",
        },
      ];
      break;
    }

    // ── Fallback for other known Prisma errors ────────────────────────────
    default: {
      message = `Database Error (${err.code})`;
      errorSources = [
        {
          path: "",
          message: err.message.split("\n").pop()?.trim() || err.message,
        },
      ];
      break;
    }
  }

  return {
    statusCode,
    success: false,
    message,
    errorSources,
    error: err,
  };
};

/**
 * Handles `PrismaClientValidationError` — schema-level validation failures
 * (wrong types, missing required fields in `data`). The native message is
 * very verbose, so we collapse it to a single readable line.
 */
export const handlePrismaValidationError = (
  err: Prisma.PrismaClientValidationError,
): TErrorResponse => {
  const lines = err.message
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const reason = lines[lines.length - 1] || err.message;

  return {
    statusCode: status.BAD_REQUEST,
    success: false,
    message: "Invalid Data Provided",
    errorSources: [
      {
        path: "",
        message: reason,
      },
    ],
    error: err,
  };
};

/**
 * Handles `PrismaClientInitializationError` — thrown when the client fails to
 * connect to the database (wrong URL, DB down, auth failure).
 * Infra-level error — never expose internal details to the client.
 */
export const handlePrismaInitializationError = (
  err: Prisma.PrismaClientInitializationError,
): TErrorResponse => {
  return {
    statusCode: status.SERVICE_UNAVAILABLE,
    success: false,
    message: "Database Service Unavailable",
    errorSources: [
      {
        path: "",
        message: "Unable to connect to the database. Please try again later.",
      },
    ],
    error: err,
  };
};

/**
 * Handles `PrismaClientUnknownRequestError` — engine errors that could not
 * be classified. Treat as 500.
 */
export const handlePrismaUnknownRequestError = (
  err: Prisma.PrismaClientUnknownRequestError,
): TErrorResponse => {
  return {
    statusCode: status.INTERNAL_SERVER_ERROR,
    success: false,
    message: "Unexpected Database Error",
    errorSources: [
      {
        path: "",
        message: "An unknown database error occurred.",
      },
    ],
    error: err,
  };
};

/**
 * Handles `PrismaClientRustPanicError` — the underlying Rust engine crashed.
 * Critical: must be logged + surfaced as a generic 500.
 */
export const handlePrismaRustPanicError = (
  err: Prisma.PrismaClientRustPanicError,
): TErrorResponse => {
  return {
    statusCode: status.INTERNAL_SERVER_ERROR,
    success: false,
    message: "Critical Database Engine Error",
    errorSources: [
      {
        path: "",
        message: "A critical error occurred. The team has been notified.",
      },
    ],
    error: err,
  };
};
