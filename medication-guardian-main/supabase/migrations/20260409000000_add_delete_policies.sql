-- Add DELETE policy for patient_medications
DROP POLICY IF EXISTS "Anyone can delete patient_medications" ON public.patient_medications;
CREATE POLICY "Anyone can delete patient_medications" ON public.patient_medications
  FOR DELETE USING (true);

-- Add DELETE policy for medication_history
DROP POLICY IF EXISTS "Anyone can delete medication_history" ON public.medication_history;
CREATE POLICY "Anyone can delete medication_history" ON public.medication_history
  FOR DELETE USING (true);

-- Fix trigger function to use SECURITY DEFINER so it can bypass RLS
CREATE OR REPLACE FUNCTION public.track_medication_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
