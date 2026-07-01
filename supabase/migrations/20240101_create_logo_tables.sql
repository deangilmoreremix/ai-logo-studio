-- AI Logo Studio - Supabase Database Schema
-- Run this in the Supabase SQL Editor or via migration

-- Users table (anonymous session-based)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT UNIQUE NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Logo creations table
CREATE TABLE IF NOT EXISTS logo_creations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  resolution TEXT NOT NULL DEFAULT '1k',
  input_image TEXT,
  result_image TEXT,
  request_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  credit_cost INTEGER NOT NULL DEFAULT 18,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_logo_creations_user_id ON logo_creations(user_id);
CREATE INDEX IF NOT EXISTS idx_logo_creations_request_id ON logo_creations(request_id);

-- Storage bucket for logo sketches and results
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for public access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'logos');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'logos');
