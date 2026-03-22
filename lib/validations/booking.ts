// Booking Date Validation

/**
 * Validates that end_date is not before start_date.
 * @throws Error if dates are invalid or end_date is before start_date
 */
export function validateBookingDates(startDate: Date, endDate: Date): void {
  // Check for invalid dates (NaN)
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid date provided");
  }

  if (endDate < startDate) {
    throw new Error("end_date must not be before start_date");
  }
}
