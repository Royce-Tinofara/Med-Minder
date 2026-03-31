-- Fix patient_assignments table for our custom auth

-- Allow anyone to create/view assignments
DROP POLICY IF EXISTS "Patients can view own assignments" ON public.patient_assignments;
DROP POLICY IF EXISTS "Assigned users can view their assignments" ON public.patient_assignments;
DROP POLICY IF EXISTS "Patients can create assignments" ON public.patient_assignments;
DROP POLICY IF EXISTS "Patients can delete assignments" ON public.patient_assignments;

CREATE POLICY "Anyone can view assignments" ON public.patient_assignments
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can create assignments" ON public.patient_assignments
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can delete assignments" ON public.patient_assignments
  FOR DELETE TO anon, authenticated USING (true);
