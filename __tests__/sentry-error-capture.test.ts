// @vitest-environment node
// TDD RED: Sentry captureException is called for 5xx and unknown errors in withApiHandler.
// These tests fail until lib/errors.ts imports and calls Sentry.captureException.

import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock @sentry/nextjs BEFORE importing withApiHandler so the module picks up the mock
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { withApiHandler, errors } from "../lib/errors";
import { ZodError, ZodIssueCode } from "zod";

const captureException = vi.mocked(Sentry.captureException);

// Helper: build a minimal Request object
function makeRequest(): Request {
  return new Request("http://localhost/api/test", { method: "GET" });
}

beforeEach(() => {
  captureException.mockClear();
});

describe("withApiHandler — Sentry capture", () => {
  it("captures unknown errors (not AppError or ZodError)", async () => {
    const unknownError = new Error("database exploded");
    const handler = withApiHandler(async () => {
      throw unknownError;
    });

    await handler(makeRequest());

    expect(captureException).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledWith(unknownError);
  });

  it("captures AppError with httpStatus >= 500", async () => {
    const internalError = errors.internal(); // INTERNAL_ERROR, 500
    const handler = withApiHandler(async () => {
      throw internalError;
    });

    await handler(makeRequest());

    expect(captureException).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledWith(internalError);
  });

  it("does NOT capture AppError with httpStatus < 500", async () => {
    const handler = withApiHandler(async () => {
      throw errors.unauthorized(); // 401
    });

    await handler(makeRequest());

    expect(captureException).not.toHaveBeenCalled();
  });

  it("does NOT capture ZodError", async () => {
    const zodError = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: "string",
        received: "undefined",
        path: ["email"],
        message: "Required",
      },
    ]);
    const handler = withApiHandler(async () => {
      throw zodError;
    });

    await handler(makeRequest());

    expect(captureException).not.toHaveBeenCalled();
  });
});
