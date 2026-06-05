-- Migration: add_lead_events
-- Created: 2026-06-05
-- Purpose: Create lead_events table for contact/booking lead tracking and email notification status

-- CreateTable: lead_events
CREATE TABLE "lead_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "service_interest" TEXT,
    "boat_length" TEXT,
    "boat_type" TEXT,
    "location_slug" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "raw_payload" JSONB NOT NULL DEFAULT '{}',
    "notification_status" TEXT,
    "resend_email_id" TEXT,
    "calendar_event_id" TEXT,
    "lead_id" TEXT,
    "lead_type" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: lead_events_source_idx
CREATE INDEX "lead_events_source_idx" ON "lead_events"("source");

-- CreateIndex: lead_events_status_idx
CREATE INDEX "lead_events_status_idx" ON "lead_events"("status");

-- CreateIndex: lead_events_notification_status_idx
CREATE INDEX "lead_events_notification_status_idx" ON "lead_events"("notification_status");