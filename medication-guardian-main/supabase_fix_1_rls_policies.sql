-- Fix RLS policies for all tables to work with custom auth (username/password)
-- This is needed because the app uses a custom users table, not Supabase auth

-- =============================================
-- FIX reminder_logs table
-- =============================================
DROP POLICY IF EXISTS "Users can view own reminder logs" ON public.reminder_logs;
DROP POLICY IF EXISTS "Users can insert reminder logs" ON public.reminder_logs;
DROP POLICY IF EXISTS "Patients can view own reminder logs" ON public.reminder_logs;
DROP POLICY IF EXISTS "Patients can insert own reminder_logs" ON public.reminder_logs;

CREATE POLICY "Anyone can view reminder_logs" ON public.reminder_logs
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert reminder_logs" ON public.reminder_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update reminder_logs" ON public.reminder_logs
  FOR UPDATE USING (true);

-- =============================================
-- FIX user_preferences table
-- =============================================
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;

CREATE POLICY "Anyone can view user_preferences" ON public.user_preferences
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert user_preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update user_preferences" ON public.user_preferences
  FOR UPDATE USING (true);

-- =============================================
-- FIX refill_requests table
-- =============================================
DROP POLICY IF EXISTS "Patients view own refill requests" ON public.refill_requests;
DROP POLICY IF EXISTS "Patients create refill requests" ON public.refill_requests;
DROP POLICY IF EXISTS "Assigned users view patient refill requests" ON public.refill_requests;
DROP POLICY IF EXISTS "Assigned users can update patient refill requests" ON public.refill_requests;
DROP POLICY IF EXISTS "Pharmacists view patient refill requests" ON public.refill_requests;
DROP POLICY IF EXISTS "Pharmacists update patient refill requests" ON public.refill_requests;

CREATE POLICY "Anyone can view refill_requests" ON public.refill_requests
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert refill_requests" ON public.refill_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update refill_requests" ON public.refill_requests
  FOR UPDATE USING (true);

-- =============================================
-- FIX patient_medications table
-- =============================================
DROP POLICY IF EXISTS "Patients can view own medications" ON public.patient_medications;
DROP POLICY IF EXISTS "Patients can insert own medications" ON public.patient_medications;
DROP POLICY IF EXISTS "Assigned users can view patient medications" ON public.patient_medications;
DROP POLICY IF EXISTS "Care team can view medications" ON public.patient_medications;

CREATE POLICY "Anyone can view patient_medications" ON public.patient_medications
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert patient_medications" ON public.patient_medications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update patient_medications" ON public.patient_medications
  FOR UPDATE USING (true);

-- =============================================
-- FIX patient_assignments table
-- =============================================
DROP POLICY IF EXISTS "Users can view own assignments" ON public.patient_assignments;
DROP POLICY IF EXISTS "Users can view their patient assignments" ON public.patient_assignments;
DROP POLICY IF EXISTS "Pharmacists can view all assignments" ON public.patient_assignments;
DROP POLICY IF EXISTS "Caregivers can view assignments" ON public.patient_assignments;

CREATE POLICY "Anyone can view patient_assignments" ON public.patient_assignments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert patient_assignments" ON public.patient_assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update patient_assignments" ON public.patient_assignments
  FOR UPDATE USING (true);

-- =============================================
-- FIX users table
-- =============================================
-- First, drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
DROP POLICY IF EXISTS "Anyone can update users" ON public.users;

CREATE POLICY "Anyone can view users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert users" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update users" ON public.users
  FOR UPDATE USING (true);

-- =============================================
-- FIX messages table
-- =============================================
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

CREATE POLICY "Anyone can view messages" ON public.messages
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert messages" ON public.messages
  FOR INSERT WITH CHECK (true);

-- =============================================
-- FIX notifications table
-- =============================================
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

CREATE POLICY "Anyone can view notifications" ON public.notifications
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- =============================================
-- FIX profiles table
-- =============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update profiles" ON public.profiles
  FOR UPDATE USING (true);

-- Confirm policies are set up correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
