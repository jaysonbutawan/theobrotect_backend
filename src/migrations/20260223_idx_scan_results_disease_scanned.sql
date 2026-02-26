CREATE INDEX IF NOT EXISTS idx_scan_results_disease_scanned
ON scan_results (disease_key, scanned_at DESC);