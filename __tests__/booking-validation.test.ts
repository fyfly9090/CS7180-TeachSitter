// RED: Booking Date Validation and Permissions Tests
import { describe, test, expect, vi } from 'vitest';
import fc from 'fast-check';
import { validateBookingDates } from '../lib/validations/booking';
import { updateBookingStatus } from '../lib/api/bookings';

describe('Booking Date Validations (Property-Based)', () => {
  test('should reject any booking where end_date is before start_date', () => {
    fc.assert(
      fc.property(
        fc.date(), fc.date(), (date1, date2) => {
          // 构造结束日期早于开始日期的场景
          const start = date1 > date2 ? date1 : date2;
          const end = date1 > date2 ? date2 : date1;

          if (start.getTime() === end.getTime()) return true;

          // 断言：验证逻辑必须抛出错误
          expect(() => validateBookingDates(start, end)).toThrow();
        }
      )
    );
  });
});

describe('Booking Permissions', () => {
  test('should prevent a teacher from confirming a booking that belongs to another teacher', async () => {
    const otherTeacherId = 'uuid-teacher-2';
    const bookingId = 'uuid-booking-1';

    // 模拟 Supabase 返回不匹配的 teacher_id
    const mockBooking = { id: bookingId, teacher_id: 'uuid-teacher-1' };

    // 断言：当 teacher_id 不一致时，PATCH 操作必须返回 403
    const response = await updateBookingStatus(bookingId, otherTeacherId, 'confirmed');

    expect(response.status).toBe(403);
    expect(response.error.code).toBe('UNAUTHORIZED_ACTION');
  });
});
