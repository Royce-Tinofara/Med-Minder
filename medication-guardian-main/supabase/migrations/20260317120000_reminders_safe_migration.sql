-- Safe migration that handles existing objects
-- Run this if the previous migration had errors

-- Create user_preferences table if not exists (idempotent)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  snooze_duration INT NOT NULL DEFAULT 15,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences (use OR REPLACE to handle existing)
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences" ON public.user_preferences FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE USING (user_id = auth.uid());

-- Create reminders table if not exists
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

-- RLS Policies for reminders
DROP POLICY IF EXISTS "Patients can view own reminders" ON public.reminders;
CREATE POLICY "Patients can view own reminders" ON public.reminders FOR SELECT USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Patients can insert own reminders" ON public.reminders;
CREATE POLICY "Patients can insert own reminders" ON public.reminders FOR INSERT WITH CHECK (patient_id = auth.uid());

DROP POLICY IF EXISTS "Patients can update own reminders" ON public.reminders;
CREATE POLICY "Patients can update own reminders" ON public.reminders FOR UPDATE USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Patients can delete own reminders" ON public.reminders;
CREATE POLICY "Patients can delete own reminders" ON public.reminders FOR DELETE USING (patient_id = auth.uid());

-- Add snoozed_until column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patient_medications' AND column_name = 'snoozed_until'
  ) THEN
    ALTER TABLE public.patient_medications ADD COLUMN snoozed_until TIMESTAMPTZ;
  END IF;
END $$;

-- Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_reminders_patient_id ON public.reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_time ON public.reminders(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);

-- Create trigger function if not exists
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

DROP TRIGGER IF EXISTS update_reminders_updated_at ON public.reminders;
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.update_reminders_updated_at();
