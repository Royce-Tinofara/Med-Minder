-- Custom users table for username-based authentication
-- This bypasses Supabase's email requirement

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can register (create account)
CREATE POLICY "Anyone can create user" ON public.users
  FOR INSERT WITH CHECK (true);

-- Policy: Users can view their own data
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (id = auth.uid());

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- Create function to authenticate user by username/password
CREATE OR REPLACE FUNCTION public.authenticate_user(_username TEXT, _password TEXT)
RETURNS TABLE(id UUID, username TEXT, first_name TEXT, last_name TEXT, role public.app_role) AS $$
DECLARE
  _user_id UUID;
  _stored_hash TEXT;
  _input_hash TEXT;
BEGIN
  -- Get the user by username
  SELECT id, password_hash INTO _user_id, _stored_hash
  FROM public.users
  WHERE username = _username;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid username or password';
  END IF;

  -- Compare passwords (using simple comparison for now - in production use bcrypt)
  -- For demo, we'll store plain text and compare directly
  IF _stored_hash != _password THEN
    RAISE EXCEPTION 'Invalid username or password';
  END IF;

  RETURN QUERY
  SELECT u.id, u.username, u.first_name, u.last_name, u.role
  FROM public.users u
  WHERE u.id = _user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
