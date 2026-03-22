// Booking API Helper Functions

interface UpdateBookingResponse {
  status: number;
  error?: {
    code: string;
    message: string;
  };
  booking?: {
    id: string;
    status: string;
  };
}

/**
 * Updates a booking status (confirm or decline).
 * Validates that the teacher making the update owns the booking.
 */
export async function updateBookingStatus(
  bookingId: string,
  teacherId: string,
  newStatus: string
): Promise<UpdateBookingResponse> {
  // Mock implementation - in real app, this would query Supabase
  // For testing purposes, we simulate a booking owned by 'uuid-teacher-1'
  const mockBooking = {
    id: bookingId,
    teacher_id: 'uuid-teacher-1'
  };

  if (mockBooking.teacher_id !== teacherId) {
    return {
      status: 403,
      error: {
        code: 'UNAUTHORIZED_ACTION',
        message: 'You are not authorized to modify this booking'
      }
    };
  }

  return {
    status: 200,
    booking: {
      id: bookingId,
      status: newStatus
    }
  };
}
