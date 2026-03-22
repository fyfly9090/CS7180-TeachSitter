// Booking Date Validation

/**
 * Validates that end_date is not before start_date.
 * @throws Error if end_date is before start_date
 */
export function validateBookingDates(startDate: Date, endDate: Date): void {
  if (endDate < startDate) {
    throw new Error('end_date must not be before start_date');
  }
}
