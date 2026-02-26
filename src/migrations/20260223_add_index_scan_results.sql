CREATE INDEX IF NOT EXISTS idx_scan_results_user_disease_scanned
ON scan_results (user_id, disease_key, scanned_at DESC);