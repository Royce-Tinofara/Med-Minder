
-- Role enum
CREATE TYPE public.app_role AS ENUM ('patient', 'caregiver', 'pharmacist');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  role app_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Medications catalog
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  manufacturer TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Patient medications (assigned to a user)
CREATE TABLE public.patient_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE NOT NULL,
  dosage TEXT NOT NULL DEFAULT '',
  form TEXT DEFAULT 'Tablet',
  frequency TEXT DEFAULT 'Once daily',
  times TEXT[] DEFAULT '{}',
  instructions TEXT DEFAULT '',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'discontinued')),
  refills_remaining INT DEFAULT 0,
  quantity_remaining INT DEFAULT 0,
  total_quantity INT DEFAULT 0,
  prescriber_name TEXT DEFAULT '',
  pharmacy_name TEXT DEFAULT '',
  added_by UUID REFERENCES auth.users(id),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_medications ENABLE ROW LEVEL SECURITY;

-- Caregiver/Pharmacist assignments to patients
CREATE TABLE public.patient_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assignment_role app_role NOT NULL CHECK (assignment_role IN ('caregiver', 'pharmacist')),
  permissions TEXT[] DEFAULT '{view_medications,add_medications}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, assigned_user_id)
);
ALTER TABLE public.patient_assignments ENABLE ROW LEVEL SECURITY;

-- Reminders
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_medication_id UUID REFERENCES public.patient_medications(id) ON DELETE CASCADE NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'missed', 'snoozed', 'skipped')),
  taken_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Helper: check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if user is assigned to patient
CREATE OR REPLACE FUNCTION public.is_assigned_to_patient(_user_id UUID, _patient_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patient_assignments
    WHERE assigned_user_id = _user_id AND patient_id = _patient_id
  )
$$;

-- Helper: get user role from profiles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Trigger for auto-creating profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
BEGIN
  _role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'patient'
  );
  
  INSERT INTO public.profiles (user_id, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    _role
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_patient_medications_updated_at
  BEFORE UPDATE ON public.patient_medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- Profiles: users see own, caregivers/pharmacists can see assigned patients' profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Assigned users can view patient profiles" ON public.profiles
  FOR SELECT USING (
    public.is_assigned_to_patient(auth.uid(), user_id)
  );

-- User roles: view own
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Medications catalog: public read
CREATE POLICY "Anyone can view medications" ON public.medications
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacists can insert medications" ON public.medications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'pharmacist'));
CREATE POLICY "Pharmacists can update medications" ON public.medications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'pharmacist'));

-- Patient medications: patient sees own, assigned users see assigned patients
CREATE POLICY "Patients view own medications" ON public.patient_medications
  FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "Assigned users view patient medications" ON public.patient_medications
  FOR SELECT USING (public.is_assigned_to_patient(auth.uid(), patient_id));
CREATE POLICY "Patients can insert own medications" ON public.patient_medications
  FOR INSERT WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Assigned users can insert patient medications" ON public.patient_medications
  FOR INSERT WITH CHECK (public.is_assigned_to_patient(auth.uid(), patient_id));
CREATE POLICY "Patients can update own medications" ON public.patient_medications
  FOR UPDATE USING (patient_id = auth.uid());
CREATE POLICY "Assigned users can update patient medications" ON public.patient_medications
  FOR UPDATE USING (public.is_assigned_to_patient(auth.uid(), patient_id));

-- Patient assignments
CREATE POLICY "Patients can view own assignments" ON public.patient_assignments
  FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "Assigned users can view their assignments" ON public.patient_assignments
  FOR SELECT USING (assigned_user_id = auth.uid());
CREATE POLICY "Patients can create assignments" ON public.patient_assignments
  FOR INSERT WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Patients can delete assignments" ON public.patient_assignments
  FOR DELETE USING (patient_id = auth.uid());

-- Reminders
CREATE POLICY "Patients view own reminders" ON public.reminders
  FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "Assigned users view patient reminders" ON public.reminders
  FOR SELECT USING (public.is_assigned_to_patient(auth.uid(), patient_id));
CREATE POLICY "Patients can update own reminders" ON public.reminders
  FOR UPDATE USING (patient_id = auth.uid());
CREATE POLICY "Patients can insert own reminders" ON public.reminders
  FOR INSERT WITH CHECK (patient_id = auth.uid());

-- Seed some medications in the catalog
INSERT INTO public.medications (name, generic_name, description) VALUES
  ('Metformin', 'Metformin HCl', 'Used to treat type 2 diabetes'),
  ('Lisinopril', 'Lisinopril', 'ACE inhibitor for blood pressure'),
  ('Atorvastatin', 'Atorvastatin Calcium', 'Statin for cholesterol'),
  ('Aspirin', 'Acetylsalicylic Acid', 'Pain relief and blood thinner'),
  ('Amoxicillin', 'Amoxicillin', 'Antibiotic for bacterial infections'),
  ('Omeprazole', 'Omeprazole', 'Proton pump inhibitor for acid reflux'),
  ('Levothyroxine', 'Levothyroxine Sodium', 'Thyroid hormone replacement'),
  ('Amlodipine', 'Amlodipine Besylate', 'Calcium channel blocker for blood pressure');
