// Zod validation schemas — single source of truth for all API input validation.
// Every API route parses its input through one of these schemas.
// ZodError thrown by .parse() is caught and serialized by withApiHandler in lib/errors.ts.

import { z } from "zod";
import { ALL_EXPERTISE } from "@/lib/utils/expertise";

// =====================
// Shared Primitives
// =====================

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format");

// Cross-field refinement: dates must be provided together, and end_date >= start_date.
function dateRangeRefinement(
  data: { start_date?: string; end_date?: string },
  ctx: z.RefinementCtx
) {
  const hasStart = Boolean(data.start_date);
  const hasEnd = Boolean(data.end_date);

  if (hasStart && !hasEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "end_date is required when start_date is provided",
      path: ["end_date"],
    });
    return;
  }
  if (hasEnd && !hasStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "start_date is required when end_date is provided",
      path: ["start_date"],
    });
    return;
  }
  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "end_date must be on or after start_date",
      path: ["end_date"],
    });
  }
}

// =====================
// Auth
// =====================

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["parent", "teacher"]),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// =====================
// Teacher Search — GET /api/teachers/available
// Note: URL query params arrive as strings; optional fields should be
// stripped of the literal string "undefined" before passing to this schema.
// =====================

export const teachersAvailableQuerySchema = z
  .object({
    start_date: dateString.optional(),
    end_date: dateString.optional(),
    classroom: z.string().max(100).optional(),
    name: z.string().max(100).optional(),
  })
  .superRefine(dateRangeRefinement);
export type TeachersAvailableQuery = z.infer<typeof teachersAvailableQuerySchema>;

// =====================
// AI Match — POST /api/match
// bio is capped at 2000 chars: sanitization barrier before AI prompt construction.
// =====================

const teacherInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(200),
  classroom: z.string().max(100),
  bio: z.string().max(2000),
});

export const matchRequestSchema = z
  .object({
    parent_id: z.string().uuid(),
    child_classroom: z.string().max(100),
    start_date: dateString,
    end_date: dateString,
    teachers: z.array(teacherInputSchema).min(1).max(50),
  })
  .superRefine(dateRangeRefinement);
export type MatchRequestInput = z.infer<typeof matchRequestSchema>;

// =====================
// Bookings — POST /api/bookings
// message is capped at 500 chars: guards against prompt injection via booking message.
// =====================

export const createBookingSchema = z
  .object({
    teacher_id: z.string().uuid(),
    start_date: dateString,
    end_date: dateString,
    message: z.string().max(500).optional(),
  })
  .superRefine(dateRangeRefinement);
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// =====================
// Booking Status Update — PATCH /api/bookings/[id]
// Only confirmed or declined are valid teacher actions.
// =====================

export const updateBookingSchema = z.object({
  status: z.enum(["confirmed", "declined"]),
});
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

// =====================
// Evals Query — GET /api/evals
// z.coerce.number() converts URL string params to numbers before validation.
// =====================

// =====================
// Teacher Profile Update — PATCH /api/teachers/[id]
// bio capped at 2000 chars: same sanitization guard as matchRequestSchema.
// expertise is an enum array capped at 6 (one per allowed value).
// availability replaces existing unbooked rows when present.
// =====================

export const availabilityBlockSchema = z
  .object({
    start_date: dateString,
    end_date: dateString,
  })
  .superRefine(dateRangeRefinement);
export type AvailabilityBlockInput = z.infer<typeof availabilityBlockSchema>;

export const updateTeacherProfileSchema = z.object({
  classroom: z.string().min(1, "Classroom name is required").max(100),
  bio: z.string().max(2000).optional(),
  expertise: z.array(z.enum(ALL_EXPERTISE)).max(6).optional(),
  availability: z.array(availabilityBlockSchema).optional(),
});
export type UpdateTeacherProfileInput = z.infer<typeof updateTeacherProfileSchema>;

// =====================
// Evals Query — GET /api/evals
// z.coerce.number() converts URL string params to numbers before validation.
// =====================

export const evalsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type EvalsQuery = z.infer<typeof evalsQuerySchema>;
