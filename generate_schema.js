const fs = require('fs');

const subjects = ['math', 'logic', 'history', 'english', 'russian', 'kyrgyz'];
const grades_questions = [5, 6, 7];
const grades_students = [6, 7];
const languages = ['ru', 'kg'];
const test_types = ['main', 'trial'];

let sql = `-- Этот скрипт нужно будет выполнить в SQL Editor в панели Supabase

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
);\n\n`;

// Generate question tables
sql += `-- 3. ТАБЛИЦЫ ВОПРОСОВ (по предметам, языкам и классам)\n`;
subjects.forEach(subject => {
    languages.forEach(lang => {
        grades_questions.forEach(grade => {
            const tableName = `questions_${subject}_${lang}_${grade}`;
            sql += `
CREATE TABLE IF NOT EXISTS ${tableName} (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"text": "Вариант А", "is_correct": true}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
        });
    });
});

sql += `\n\n-- 4. ТАБЛИЦЫ РЕЗУЛЬТАТОВ ТЕСТОВ (Отдельные таблицы для каждого типа теста, класса и языка)\n`;

test_types.forEach(type => {
    languages.forEach(lang => {
        grades_students.forEach(grade => {
            const tableName = `results_${type}_${lang}_${grade}`;
            sql += `
CREATE TABLE IF NOT EXISTS ${tableName} (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL DEFAULT 0,
    
    -- Какие вопросы ему выпали: { "math": [id1, id2], "logic": [id1, id2]... }
    generated_questions JSONB NOT NULL DEFAULT '{}'::jsonb, 
    
    -- Ответы ученика: { "math": {question_id: selected_option_index}, ... }
    answers JSONB, 
    
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
        });
    });
});

fs.writeFileSync('/Users/alikbekmukanbetov/Desktop/AkylZone/supabase_schema.sql', sql);
console.log('SQL Schema generated successfully.');
