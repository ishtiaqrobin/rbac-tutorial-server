import { TErrorSources } from "../interfaces/error.interface";

/**
 * Application-level operational error.
 *
 * Use this for ANY expected/handled error (validation, auth, business rules)
 * so the global error handler can return a consistent JSON response.
 *
 * Pass `errorSources` when you have field-specific details, otherwise the
 * handler will derive a default from `message`.
 *
 * @example
 *   throw new AppError(status.NOT_FOUND, "User not found");
 *   throw new AppError(status.BAD_REQUEST, "Invalid input", [
 *     { path: "email", message: "Email already in use" }
 *   ]);
 */
class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorSources: TErrorSources[] | undefined;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    errorSources?: TErrorSources[],
    stack = "",
  ) {
    super(message);

    this.statusCode = statusCode;
    this.errorSources = errorSources;
    this.isOperational = true; // distinguishes expected errors from bugs
    this.name = this.constructor.name;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
