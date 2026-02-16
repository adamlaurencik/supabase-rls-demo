-- ============================================
-- KROK 1: Vytvoreni tabulky notes (s chybnym RLS)
-- Spustte toto nejdrive pro nastaveni zranitelneho stavu
-- ============================================

CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Povoleni pristupu autentizovanym uzivatelum
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- TOTO JE CHYBA: Prilis permisivni politika, ktera umozni JAKEMUKOLI
-- autentizovanemu uzivateli cist VSECHNY poznamky, nejen sve vlastni.
CREATE POLICY "Allow authenticated users to read all notes" ON notes
  FOR SELECT
  TO authenticated
  USING (true);  -- <-- Zadna kontrola user_id! Kdokoli muze cist vsechno.

CREATE POLICY "Allow users to insert their own notes" ON notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own notes" ON notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ============================================
-- KROK 2: OPRAVA - Spustte toto PO ukazce
-- Tim se nahradi chybna SELECT politika za bezpecnou
-- ============================================
-- DROP POLICY "Allow authenticated users to read all notes" ON notes;
--
-- CREATE POLICY "Allow users to read only their own notes" ON notes
--   FOR SELECT
--   TO authenticated
--   USING (auth.uid() = user_id);  -- Nyni muze poznamky cist pouze jejich vlastnik
