CREATE INDEX IF NOT EXISTS idx_scan_results_user_scanned
ON scan_results (user_id, scanned_at DESC);