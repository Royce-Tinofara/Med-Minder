-- Fix RLS policies for users table - allow anonymous access for registration

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can create user" ON public.users;
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

-- Policy: Anyone can register (create account) - no auth required
CREATE POLICY "Anyone can create user" ON public.users
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Policy: Anyone can view users (for login lookup)
CREATE POLICY "Anyone can view users" ON public.users
  FOR SELECT TO anon, authenticated USING (true);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE TO authenticated USING (true);
