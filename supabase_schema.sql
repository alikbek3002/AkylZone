-- Этот скрипт нужно будет выполнить в SQL Editor в панели Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Таблица администраторов
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plain_password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Таблица студентов (учеников)
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    grade INTEGER NOT NULL CHECK (grade IN (6, 7)),
    language TEXT NOT NULL CHECK (language IN ('ru', 'kg')),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, 
    plain_password TEXT, 
    active_session_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ТАБЛИЦЫ ВОПРОСОВ (по предметам, языкам и классам)

CREATE TABLE IF NOT EXISTS questions_math_ru_5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_math_ru_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_math_ru_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_math_kg_5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_math_kg_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_math_kg_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_logic_ru_5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_logic_ru_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_logic_ru_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_logic_kg_5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_logic_kg_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_logic_kg_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_history_ru_5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_history_ru_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_history_ru_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_history_kg_5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_history_kg_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_history_kg_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_english_ru_5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_english_ru_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_english_ru_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_english_kg_5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_english_kg_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_english_kg_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_russian_ru_5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_russian_ru_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_russian_ru_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_russian_kg_5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_russian_kg_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_russian_kg_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_kyrgyz_ru_5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_kyrgyz_ru_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_kyrgyz_ru_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_kyrgyz_kg_5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_kyrgyz_kg_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS questions_kyrgyz_kg_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ТАБЛИЦЫ РЕЗУЛЬТАТОВ ТЕСТОВ (Отдельные таблицы для каждого типа теста, класса и языка)

CREATE TABLE IF NOT EXISTS results_main_ru_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL DEFAULT 0,
    
    -- Какие вопросы ему выпали: { "math": [id1, id2], "logic": [id1, id2]... }
    generated_questions JSONB NOT NULL DEFAULT '{}'::jsonb, 
    
    -- Ответы ученика: { "math": {question_id: selected_option_index}, ... }
    answers JSONB, 
    
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS results_main_ru_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL DEFAULT 0,
    
    -- Какие вопросы ему выпали: { "math": [id1, id2], "logic": [id1, id2]... }
    generated_questions JSONB NOT NULL DEFAULT '{}'::jsonb, 
    
    -- Ответы ученика: { "math": {question_id: selected_option_index}, ... }
    answers JSONB, 
    
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS results_main_kg_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL DEFAULT 0,
    
    -- Какие вопросы ему выпали: { "math": [id1, id2], "logic": [id1, id2]... }
    generated_questions JSONB NOT NULL DEFAULT '{}'::jsonb, 
    
    -- Ответы ученика: { "math": {question_id: selected_option_index}, ... }
    answers JSONB, 
    
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS results_main_kg_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL DEFAULT 0,
    
    -- Какие вопросы ему выпали: { "math": [id1, id2], "logic": [id1, id2]... }
    generated_questions JSONB NOT NULL DEFAULT '{}'::jsonb, 
    
    -- Ответы ученика: { "math": {question_id: selected_option_index}, ... }
    answers JSONB, 
    
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS results_trial_ru_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL DEFAULT 0,
    
    -- Какие вопросы ему выпали: { "math": [id1, id2], "logic": [id1, id2]... }
    generated_questions JSONB NOT NULL DEFAULT '{}'::jsonb, 
    
    -- Ответы ученика: { "math": {question_id: selected_option_index}, ... }
    answers JSONB, 
    
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS results_trial_ru_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL DEFAULT 0,
    
    -- Какие вопросы ему выпали: { "math": [id1, id2], "logic": [id1, id2]... }
    generated_questions JSONB NOT NULL DEFAULT '{}'::jsonb, 
    
    -- Ответы ученика: { "math": {question_id: selected_option_index}, ... }
    answers JSONB, 
    
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS results_trial_kg_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL DEFAULT 0,
    
    -- Какие вопросы ему выпали: { "math": [id1, id2], "logic": [id1, id2]... }
    generated_questions JSONB NOT NULL DEFAULT '{}'::jsonb, 
    
    -- Ответы ученика: { "math": {question_id: selected_option_index}, ... }
    answers JSONB, 
    
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS results_trial_kg_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL DEFAULT 0,
    
    -- Какие вопросы ему выпали: { "math": [id1, id2], "logic": [id1, id2]... }
    generated_questions JSONB NOT NULL DEFAULT '{}'::jsonb, 
    
    -- Ответы ученика: { "math": {question_id: selected_option_index}, ... }
    answers JSONB, 
    
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);