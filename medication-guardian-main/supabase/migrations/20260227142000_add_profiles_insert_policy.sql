-- Add INSERT policy for profiles table to allow authenticated users to create their own profile
-- This is needed in case the trigger doesn't work or for manual profile creation

-- Drop existing insert policies if they exist (to avoid duplicates)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Also allow the trigger function to insert profiles (reinforce with additional policy)
-- The trigger uses SECURITY DEFINER so this should work, but adding as backup
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT TO service_role
  WITH CHECK (true);
