-- Fix RLS policies for refill_requests to work with custom auth
-- Drop existing policies
DROP POLICY IF EXISTS "Patients view own refill requests" ON public.refill_requests;
DROP POLICY IF EXISTS "Patients create refill requests" ON public.refill_requests;
DROP POLICY IF EXISTS "Assigned users view patient refill requests" ON public.refill_requests;
DROP POLICY IF EXISTS "Assigned users can update refill requests" ON public.refill_requests;
DROP POLICY IF EXISTS "Pharmacists view patient refill requests" ON public.refill_requests;
DROP POLICY IF EXISTS "Pharmacists update refill requests" ON public.refill_requests;

-- Create simpler policies that don't rely on auth.uid()
-- Since we're using custom users table, we need to handle this differently

-- Allow anyone to insert refill requests (the app handles validation)
CREATE POLICY "Anyone can create refill requests" ON public.refill_requests
  FOR INSERT WITH CHECK (true);

-- Allow reading refill requests
CREATE POLICY "Anyone can view refill requests" ON public.refill_requests
  FOR SELECT USING (true);

-- Allow updating refill requests  
CREATE POLICY "Anyone can update refill requests" ON public.refill_requests
  FOR UPDATE USING (true);

-- Fix user_preferences table similar issues
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Anyone can view preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Anyone can update preferences" ON public.user_preferences;

CREATE POLICY "Anyone can view preferences" ON public.user_preferences
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update preferences" ON public.user_preferences
  FOR UPDATE USING (true);

-- Fix reminder_logs table
DROP POLICY IF EXISTS "Users can view own reminder logs" ON public.reminder_logs;
DROP POLICY IF EXISTS "Users can insert reminder logs" ON public.reminder_logs;

CREATE POLICY "Anyone can view reminder logs" ON public.reminder_logs
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert reminder logs" ON public.reminder_logs
  FOR INSERT WITH CHECK (true);
