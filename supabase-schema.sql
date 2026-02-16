-- ============================================
-- STEP 1: Create the notes table (RLS DISABLED)
-- Run this first to set up the vulnerable state
-- ============================================

CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Grant access to authenticated users via the anon/authenticated roles
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- THIS IS THE BUG: An overly permissive policy that lets ANY authenticated user
-- read ALL notes, not just their own.
CREATE POLICY "Allow authenticated users to read all notes" ON notes
  FOR SELECT
  TO authenticated
  USING (true);  -- <-- No user_id check! Anyone can read everything.

CREATE POLICY "Allow users to insert their own notes" ON notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own notes" ON notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ============================================
-- STEP 2: THE FIX - Run this AFTER the demo
-- This replaces the broken SELECT policy with a secure one
-- ============================================
-- DROP POLICY "Allow authenticated users to read all notes" ON notes;
--
-- CREATE POLICY "Allow users to read only their own notes" ON notes
--   FOR SELECT
--   TO authenticated
--   USING (auth.uid() = user_id);  -- Now only the note owner can read it
