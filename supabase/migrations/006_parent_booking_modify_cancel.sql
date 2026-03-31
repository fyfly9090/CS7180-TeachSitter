-- Parents can update their own bookings (modify dates + message, resets status
-- to pending via application logic in PATCH /api/bookings/[id]).
CREATE POLICY "bookings: parent update dates"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (parent_id = auth.uid() AND get_user_role() = 'parent')
  WITH CHECK (parent_id = auth.uid());

-- Parents can delete their own bookings for cancellation.
-- Application logic in DELETE /api/bookings/[id] restricts this to
-- status = 'pending' only.
CREATE POLICY "bookings: parent delete"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (parent_id = auth.uid() AND get_user_role() = 'parent');
