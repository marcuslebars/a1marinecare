-- Add google_calendar_event_id to booking_requests
ALTER TABLE "booking_requests" ADD COLUMN "google_calendar_event_id" TEXT;
