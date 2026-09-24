-- Column has been in schema.prisma since the calendar link was surfaced, but never got a migration.
-- Every booking's post-create update (calendar event id, sync status) failed silently until now.
ALTER TABLE "booking_requests" ADD COLUMN IF NOT EXISTS "google_calendar_html_link" TEXT;
