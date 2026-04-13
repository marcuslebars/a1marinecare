-- Migration: init
-- Created: 2026-04-13

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable: quote_leads
CREATE TABLE "quote_leads" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boat_length" TEXT NOT NULL,
    "boat_type" TEXT NOT NULL,
    "services" TEXT[] NOT NULL DEFAULT '{}',
    "addons" TEXT[] NOT NULL DEFAULT '{}',
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "notes" TEXT,
    "location_slug" TEXT NOT NULL,
    "estimated_total" BIGINT,
    "requires_manual_review" BOOLEAN NOT NULL DEFAULT false,
    "review_reasons" TEXT[] NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "quote_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable: booking_requests
CREATE TABLE "booking_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quote_id" UUID,
    "service_slug" TEXT NOT NULL,
    "location_slug" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time_slot" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "booking_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_requests_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quote_leads"("id") ON DELETE SET NULL
);

-- CreateIndex: booking_requests_quote_id_idx
CREATE INDEX "booking_requests_quote_id_idx" ON "booking_requests"("quote_id");
