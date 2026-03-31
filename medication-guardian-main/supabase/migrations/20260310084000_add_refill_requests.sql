-- Refill requests table
CREATE TABLE public.refill_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_medication_id UUID REFERENCES public.patient_medications(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'completed')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.refill_requests ENABLE ROW LEVEL SECURITY;

-- Update timestamp trigger
CREATE TRIGGER update_refill_requests_updated_at
  BEFORE UPDATE ON public.refill_requests FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies for refill_requests
CREATE POLICY "Patients view own refill requests" ON public.refill_requests
  FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "Patients create refill requests" ON public.refill_requests
  FOR INSERT WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Assigned users view patient refill requests" ON public.refill_requests
  FOR SELECT USING (public.is_assigned_to_patient(auth.uid(), patient_id));
CREATE POLICY "Assigned users can update refill requests" ON public.refill_requests
  FOR UPDATE USING (public.is_assigned_to_patient(auth.uid(), patient_id));

-- Pharmacists can view all refill requests for their patients
CREATE POLICY "Pharmacists view patient refill requests" ON public.refill_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.patient_assignments
      WHERE patient_id = refill_requests.patient_id
      AND assigned_user_id = auth.uid()
      AND assignment_role = 'pharmacist'
    )
  );
CREATE POLICY "Pharmacists update refill requests" ON public.refill_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.patient_assignments
      WHERE patient_id = refill_requests.patient_id
      AND assigned_user_id = auth.uid()
      AND assignment_role = 'pharmacist'
    )
  );
