-- Create reminders table for server-generated reminders
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_medication_id UUID REFERENCES public.patient_medications(id) ON DELETE CASCADE NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'missed', 'snoozed', 'skipped')),
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_medication_id, scheduled_time)
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reminders_patient_id ON public.reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_time ON public.reminders(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);

-- RLS Policies for reminders
CREATE POLICY "Patients can view own reminders" ON public.reminders
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Patients can insert own reminders" ON public.reminders
  FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own reminders" ON public.reminders
  FOR UPDATE USING (patient_id = auth.uid());

CREATE POLICY "Patients can delete own reminders" ON public.reminders
  FOR DELETE USING (patient_id = auth.uid());

-- Trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_reminders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.update_reminders_updated_at();

-- Add column to track snoozed_until in patient_medications
ALTER TABLE public.patient_medications ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
