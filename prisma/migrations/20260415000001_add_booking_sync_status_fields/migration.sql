-- Add calendar_sync_status and email_status to booking_requests
ALTER TABLE "booking_requests" ADD COLUMN "calendar_sync_status" TEXT;
ALTER TABLE "booking_requests" ADD COLUMN "email_status" TEXT;
