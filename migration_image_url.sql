-- Migration: Add image_url column to all question tables
-- Run this SQL in Supabase SQL Editor

ALTER TABLE questions_math_ru_5 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_math_ru_6 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_math_ru_7 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_math_kg_5 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_math_kg_6 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_math_kg_7 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_logic_ru_5 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_logic_ru_6 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_logic_ru_7 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_logic_kg_5 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_logic_kg_6 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_logic_kg_7 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_history_ru_5 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_history_ru_6 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_history_ru_7 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_history_kg_5 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_history_kg_6 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_history_kg_7 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_english_ru_5 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_english_ru_6 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_english_ru_7 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_english_kg_5 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_english_kg_6 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_english_kg_7 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_russian_ru_5 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_russian_ru_6 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_russian_ru_7 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_russian_kg_5 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_russian_kg_6 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_russian_kg_7 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_kyrgyz_ru_5 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_kyrgyz_ru_6 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_kyrgyz_ru_7 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_kyrgyz_kg_5 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_kyrgyz_kg_6 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE questions_kyrgyz_kg_7 ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

-- Also create Supabase Storage bucket (run in SQL Editor):
INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true) ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the bucket
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for question images'
  ) THEN
    CREATE POLICY "Public read access for question images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'question-images');
  END IF;
END $$;

-- Allow authenticated uploads (via service role key)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role upload access for question images'
  ) THEN
    CREATE POLICY "Service role upload access for question images"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'question-images');
  END IF;
END $$;
