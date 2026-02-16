CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  local_id TEXT NOT NULL,
  image_url TEXT NULL,  
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disease_key TEXT NOT NULL,
  severity_key TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  location_lat DOUBLE PRECISION NULL,
  location_lng DOUBLE PRECISION NULL,
  location_accuracy DOUBLE PRECISION NULL,
  location_label TEXT NULL,
  next_scan_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, local_id)
);