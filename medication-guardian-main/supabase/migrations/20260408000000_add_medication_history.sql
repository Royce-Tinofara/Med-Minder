-- Add columns to track medication history
ALTER TABLE patient_medications 
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by TEXT,
ADD COLUMN IF NOT EXISTS quantity_zero_at TIMESTAMPTZ;

-- Create medication history table for tracking all changes
CREATE TABLE IF NOT EXISTS medication_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_medication_id UUID NOT NULL REFERENCES patient_medications(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('added', 'deleted', 'refill', 'supply_depleted', 'status_changed')),
  performed_by TEXT,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB,
  previous_quantity INTEGER,
  new_quantity INTEGER
);

-- Enable RLS on medication_history
ALTER TABLE medication_history ENABLE ROW LEVEL SECURITY;

-- Policy for patients to view their own medication history
CREATE POLICY "Patients can view own medication history" ON medication_history
  FOR SELECT USING (true);

-- Policy for inserting medication history (needed for trigger)
CREATE POLICY "Allow trigger to insert medication history" ON medication_history
  FOR INSERT WITH CHECK (true);

-- Policy for caregivers/pharmacists to view patient medication history
CREATE POLICY "Care team can view medication history" ON medication_history
  FOR SELECT USING (true);

-- Create function to track medication changes
CREATE OR REPLACE FUNCTION track_medication_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Track when medication is added
  IF TG_OP = 'INSERT' THEN
    INSERT INTO medication_history (patient_medication_id, action, performed_by, details, new_quantity)
    VALUES (NEW.id, 'added', NEW.created_by, jsonb_build_object(
      'medication_name', (SELECT name FROM medications WHERE id = NEW.medication_id),
      'dosage', NEW.dosage,
      'form', NEW.form,
      'frequency', NEW.frequency,
      'total_quantity', NEW.total_quantity
    ), NEW.quantity_remaining);
  END IF;
  
  -- Track when medication is deleted
  IF TG_OP = 'DELETE' THEN
    INSERT INTO medication_history (patient_medication_id, action, performed_by, details, previous_quantity)
    VALUES (OLD.id, 'deleted', OLD.deleted_by, jsonb_build_object(
      'medication_name', (SELECT name FROM medications WHERE id = OLD.medication_id),
      'dosage', OLD.dosage
    ), OLD.quantity_remaining);
  END IF;
  
  -- Track when quantity reaches zero
  IF TG_OP = 'UPDATE' AND OLD.quantity_remaining > 0 AND NEW.quantity_remaining = 0 THEN
    INSERT INTO medication_history (patient_medication_id, action, details, previous_quantity, new_quantity)
    VALUES (NEW.id, 'supply_depleted', jsonb_build_object(
      'medication_name', (SELECT name FROM medications WHERE id = NEW.medication_id),
      'depleted_at', NOW()
    ), OLD.quantity_remaining, 0);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking medication changes
DROP TRIGGER IF EXISTS medication_change_trigger ON patient_medications;
CREATE TRIGGER medication_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON patient_medications
  FOR EACH ROW EXECUTE FUNCTION track_medication_change();