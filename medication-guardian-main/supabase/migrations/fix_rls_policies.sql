-- Fix RLS Policies and PostgREST Embedding Issues
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. Ensure RLS is properly set up for reminder_logs
-- ============================================

-- Drop existing policies if they exist (optional, for fresh start)
DROP POLICY IF EXISTS "Patients can view own reminder logs" ON public.reminder_logs;
DROP POLICY IF EXISTS "Patients can insert own reminder logs" ON public.reminder_logs;
DROP POLICY IF EXISTS "Patients can update own reminder logs" ON public.reminder_logs;

-- Create policies for reminder_logs
CREATE POLICY "Patients can view own reminder logs" ON public.reminder_logs
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Patients can insert own reminder logs" ON public.reminder_logs
  FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own reminder logs" ON public.reminder_logs
  FOR UPDATE USING (patient_id = auth.uid());

-- ============================================
-- 2. Ensure RLS for user_preferences
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;

-- Create policies for user_preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- 3. Ensure patient_medications has proper policies
-- ============================================

-- Drop existing policies (check if they exist first)
DROP POLICY IF EXISTS "Patients can view own medications" ON public.patient_medications;
DROP POLICY IF EXISTS "Patients can insert own medications" ON public.patient_medications;
DROP POLICY IF EXISTS "Patients can update own medications" ON public.patient_medications;

-- Create policies for patient_medications
CREATE POLICY "Patients can view own medications" ON public.patient_medications
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Patients can insert own medications" ON public.patient_medications
  FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own medications" ON public.patient_medications
  FOR UPDATE USING (patient_id = auth.uid());

-- ============================================
-- 4. Fix medications table (if needed)
-- ============================================

-- Medications should be readable by everyone (it's a reference table)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.medications;
CREATE POLICY "Enable read access for all users" ON public.medications
  FOR SELECT USING (true);

-- ============================================
-- 5. Create a function to handle user preferences upsert
-- ============================================

CREATE OR REPLACE FUNCTION public.ensure_user_preferences()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- ============================================
-- 6. Grant necessary permissions
-- ============================================

-- Ensure the function can be called
GRANT EXECUTE ON FUNCTION public.ensure_user_preferences() TO public;

-- ============================================
-- Note: The 400 errors on nested embeds like 
-- patient_medications(medications(name)) are a 
-- PostgREST limitation, not an RLS issue.
-- 
-- The frontend code has been updated to fetch
-- data separately instead of using nested embeds.
-- ============================================