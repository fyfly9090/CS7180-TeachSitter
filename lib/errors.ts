// Centralized error handling for all API routes.
// Usage: wrap every route handler with withApiHandler().
// Throw errors.*(msg) anywhere inside the handler — the wrapper serializes them.

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

// =====================
// Error Codes
// =====================

export const ErrorCode = {
  INVALID_INPUT: "INVALID_INPUT",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  AI_FAILURE: "AI_FAILURE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// =====================
// AppError
// =====================

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCodeType,
    message: string,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Factory helpers — use these instead of `new AppError(...)` directly
export const errors = {
  invalidInput: (message: string) => new AppError(ErrorCode.INVALID_INPUT, message, 400),

  unauthorized: (message = "Authentication required") =>
    new AppError(ErrorCode.UNAUTHORIZED, message, 401),

  forbidden: (message = "Insufficient permissions") =>
    new AppError(ErrorCode.FORBIDDEN, message, 403),

  notFound: (resource: string) => new AppError(ErrorCode.NOT_FOUND, `${resource} not found`, 404),

  conflict: (message: string) => new AppError(ErrorCode.CONFLICT, message, 409),

  aiFailure: (message = "AI ranking service unavailable") =>
    new AppError(ErrorCode.AI_FAILURE, message, 502),

  internal: () => new AppError(ErrorCode.INTERNAL_ERROR, "An unexpected error occurred", 500),
};

// =====================
// Supabase Error Mapper
// Maps AuthError and PostgrestError shapes to AppError.
// Never leaks raw DB messages to the client.
// =====================

function mapSupabaseError(error: unknown): AppError {
  if (error && typeof error === "object") {
    // AuthApiError shape
    if ("name" in error && (error as { name: string }).name === "AuthApiError") {
      const authErr = error as unknown as { status?: number; message: string };
      const msg = authErr.message?.toLowerCase() ?? "";
      if (msg.includes("already registered") || msg.includes("already exists")) {
        return errors.conflict("Email already registered");
      }
      if (authErr.status === 400) return errors.invalidInput(authErr.message);
      if (authErr.status === 401 || msg.includes("invalid login")) {
        return errors.unauthorized("Invalid credentials");
      }
      return errors.unauthorized();
    }

    // PostgrestError shape
    if ("code" in error) {
      const pgErr = error as { code: string };
      if (pgErr.code === "23505") return errors.conflict("Resource already exists");
      if (pgErr.code === "23503") return errors.conflict("Referenced resource not found");
      if (pgErr.code === "PGRST116") return errors.notFound("Resource");
    }
  }

  return errors.internal();
}

// =====================
// withApiHandler
// Wraps every API route. Catches and serializes all error types.
// Stack traces and DB internals are never sent to the client.
// =====================

type RouteHandler = (req: Request, ctx?: unknown) => Promise<NextResponse>;

export function withApiHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      // Known application error — safe to surface code + message
      // Capture 5xx AppErrors (INTERNAL_ERROR, AI_FAILURE) in Sentry; 4xx are client errors, not actionable
      if (error instanceof AppError) {
        if (error.httpStatus >= 500) Sentry.captureException(error);
        return NextResponse.json(
          { error: { code: error.code, message: error.message } },
          { status: error.httpStatus }
        );
      }

      // Zod validation error — safe to surface field-level detail
      if (error instanceof ZodError) {
        const message = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
        return NextResponse.json(
          { error: { code: ErrorCode.INVALID_INPUT, message } },
          { status: 400 }
        );
      }

      // Supabase error — map to AppError, never leak raw DB messages
      // Only match AuthApiError (name === "AuthApiError") or PostgrestError (string code field)
      const isSupabaseError =
        error &&
        typeof error === "object" &&
        (("name" in error && (error as { name: unknown }).name === "AuthApiError") ||
          ("code" in error && typeof (error as { code: unknown }).code === "string"));
      if (isSupabaseError) {
        const mapped = mapSupabaseError(error);
        return NextResponse.json(
          { error: { code: mapped.code, message: mapped.message } },
          { status: mapped.httpStatus }
        );
      }

      // Unknown error — capture in Sentry, log server-side, return generic 500 to client
      Sentry.captureException(error);
      console.error("[API] Unhandled error:", error);
      return NextResponse.json(
        { error: { code: ErrorCode.INTERNAL_ERROR, message: "An unexpected error occurred" } },
        { status: 500 }
      );
    }
  };
}
