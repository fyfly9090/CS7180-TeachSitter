// Booking Date Validation — Property-Based Tests
// Ownership permission tests live in __tests__/api-bookings.test.ts (real PATCH handler).
import { describe, test } from "vitest";
import fc from "fast-check";
import { validateBookingDates } from "../lib/validations/booking";

describe("Booking Date Validations (Property-Based)", () => {
  test("should reject any booking where end_date is before start_date", () => {
    fc.assert(
      fc.property(fc.date(), fc.date(), (date1, date2) => {
        const start = date1 > date2 ? date1 : date2;
        const end = date1 > date2 ? date2 : date1;

        if (start.getTime() === end.getTime()) return true;

        expect(() => validateBookingDates(start, end)).toThrow();
      })
    );
  });
});
