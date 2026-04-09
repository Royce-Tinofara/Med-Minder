-- Add medication_name and quantity columns to refill_requests
ALTER TABLE refill_requests 
ADD COLUMN IF NOT EXISTS medication_name TEXT,
ADD COLUMN IF NOT EXISTS quantity INTEGER;