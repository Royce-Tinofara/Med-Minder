-- Fix refill_requests to use custom users table instead of auth.users
ALTER TABLE public.refill_requests DROP CONSTRAINT IF EXISTS refill_requests_patient_id_fkey;
ALTER TABLE public.refill_requests 
  ADD CONSTRAINT refill_requests_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.refill_requests DROP CONSTRAINT IF EXISTS refill_requests_requested_by_fkey;
ALTER TABLE public.refill_requests 
  ADD CONSTRAINT refill_requests_requested_by_fkey 
  FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Create notifications table for caregiver/patient messaging
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('refill_request', 'medication_taken', 'medication_missed', 'alert', 'message', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (user_id = (
    SELECT id FROM public.users WHERE auth.uid() = public.users.id
  ));

CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT WITH CHECK (user_id = (
    SELECT id FROM public.users WHERE auth.uid() = public.users.id
  ));

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = (
    SELECT id FROM public.users WHERE auth.uid() = public.users.id
  ));

-- Function to create notification for all caregivers of a patient
CREATE OR REPLACE FUNCTION public.notify_caregivers(
  p_patient_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_related_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caregiver RECORD;
BEGIN
  -- Get all caregivers assigned to this patient
  FOR v_caregiver IN 
    SELECT assigned_user_id 
    FROM public.patient_assignments 
    WHERE patient_id = p_patient_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (v_caregiver.assigned_user_id, p_type, p_title, p_message, p_related_id);
  END LOOP;
END;
$$;
