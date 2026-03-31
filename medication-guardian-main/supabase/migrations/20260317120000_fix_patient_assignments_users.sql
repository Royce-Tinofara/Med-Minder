-- Fix patient_assignments to use custom users table instead of auth.users
-- Drop the old foreign key constraints
ALTER TABLE public.patient_assignments DROP CONSTRAINT IF EXISTS patient_assignments_patient_id_fkey;
ALTER TABLE public.patient_assignments DROP CONSTRAINT IF EXISTS patient_assignments_assigned_user_id_fkey;

-- Add new foreign key constraints pointing to our custom users table
ALTER TABLE public.patient_assignments 
  ADD CONSTRAINT patient_assignments_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.patient_assignments 
  ADD CONSTRAINT patient_assignments_assigned_user_id_fkey 
  FOREIGN KEY (assigned_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Verify the changes
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'patient_assignments';
