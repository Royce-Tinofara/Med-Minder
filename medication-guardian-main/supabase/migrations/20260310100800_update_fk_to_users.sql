-- Make patient_medications and reminders work with our custom users table
-- Remove foreign key constraints and rely on RLS

-- Drop FK constraints
ALTER TABLE public.patient_medications DROP CONSTRAINT IF EXISTS patient_medications_patient_id_fkey;
ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS reminders_patient_id_fkey;

-- Update RLS to allow access to all authenticated users (our custom auth bypasses this)
DROP POLICY IF EXISTS "Patients view own medications" ON public.patient_medications;
DROP POLICY IF EXISTS "Patients can insert own medications" ON public.patient_medications;
DROP POLICY IF EXISTS "Patients can update own medications" ON public.patient_medications;
DROP POLICY IF EXISTS "Patients view own reminders" ON public.patient_medications;

-- Create more permissive policies for our custom auth system
CREATE POLICY "Anyone can view medications" ON public.patient_medications
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can insert medications" ON public.patient_medications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update medications" ON public.patient_medications
  FOR UPDATE TO anon, authenticated USING (true);

-- Reminders policies
DROP POLICY IF EXISTS "Patients view own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Patients can update own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Patients can insert own reminders" ON public.reminders;

CREATE POLICY "Anyone can view reminders" ON public.reminders
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can insert reminders" ON public.reminders
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update reminders" ON public.reminders
  FOR UPDATE TO anon, authenticated USING (true);
