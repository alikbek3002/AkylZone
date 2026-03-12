-- ============================================================================
-- МИГРАЦИЯ: Объединение math + logic → mathlogic с колонкой question_type
-- Удаление 5 класса для математики и логики
-- ============================================================================

-- 1. Создание новых таблиц questions_mathlogic_{lang}_{grade}
-- Только для 6 и 7 классов

CREATE TABLE IF NOT EXISTS questions_mathlogic_ru_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_type TEXT NOT NULL CHECK (question_type IN ('math', 'logic')),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    topic TEXT DEFAULT '',
    explanation TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS questions_mathlogic_ru_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_type TEXT NOT NULL CHECK (question_type IN ('math', 'logic')),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    topic TEXT DEFAULT '',
    explanation TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS questions_mathlogic_kg_6 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_type TEXT NOT NULL CHECK (question_type IN ('math', 'logic')),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    topic TEXT DEFAULT '',
    explanation TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS questions_mathlogic_kg_7 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_type TEXT NOT NULL CHECK (question_type IN ('math', 'logic')),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    topic TEXT DEFAULT '',
    explanation TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Миграция данных из старых таблиц (только 6 и 7 классы)

-- math_ru_6 → mathlogic_ru_6
INSERT INTO questions_mathlogic_ru_6 (id, question_type, question_text, options, topic, explanation, image_url, created_at)
SELECT id, 'math', question_text, options,
       COALESCE(topic, ''), COALESCE(explanation, ''), COALESCE(image_url, ''), created_at
FROM questions_math_ru_6
ON CONFLICT (id) DO NOTHING;

-- logic_ru_6 → mathlogic_ru_6
INSERT INTO questions_mathlogic_ru_6 (id, question_type, question_text, options, topic, explanation, image_url, created_at)
SELECT id, 'logic', question_text, options,
       COALESCE(topic, ''), COALESCE(explanation, ''), COALESCE(image_url, ''), created_at
FROM questions_logic_ru_6
ON CONFLICT (id) DO NOTHING;

-- math_ru_7 → mathlogic_ru_7
INSERT INTO questions_mathlogic_ru_7 (id, question_type, question_text, options, topic, explanation, image_url, created_at)
SELECT id, 'math', question_text, options,
       COALESCE(topic, ''), COALESCE(explanation, ''), COALESCE(image_url, ''), created_at
FROM questions_math_ru_7
ON CONFLICT (id) DO NOTHING;

-- logic_ru_7 → mathlogic_ru_7
INSERT INTO questions_mathlogic_ru_7 (id, question_type, question_text, options, topic, explanation, image_url, created_at)
SELECT id, 'logic', question_text, options,
       COALESCE(topic, ''), COALESCE(explanation, ''), COALESCE(image_url, ''), created_at
FROM questions_logic_ru_7
ON CONFLICT (id) DO NOTHING;

-- math_kg_6 → mathlogic_kg_6
INSERT INTO questions_mathlogic_kg_6 (id, question_type, question_text, options, topic, explanation, image_url, created_at)
SELECT id, 'math', question_text, options,
       COALESCE(topic, ''), COALESCE(explanation, ''), COALESCE(image_url, ''), created_at
FROM questions_math_kg_6
ON CONFLICT (id) DO NOTHING;

-- logic_kg_6 → mathlogic_kg_6
INSERT INTO questions_mathlogic_kg_6 (id, question_type, question_text, options, topic, explanation, image_url, created_at)
SELECT id, 'logic', question_text, options,
       COALESCE(topic, ''), COALESCE(explanation, ''), COALESCE(image_url, ''), created_at
FROM questions_logic_kg_6
ON CONFLICT (id) DO NOTHING;

-- math_kg_7 → mathlogic_kg_7
INSERT INTO questions_mathlogic_kg_7 (id, question_type, question_text, options, topic, explanation, image_url, created_at)
SELECT id, 'math', question_text, options,
       COALESCE(topic, ''), COALESCE(explanation, ''), COALESCE(image_url, ''), created_at
FROM questions_math_kg_7
ON CONFLICT (id) DO NOTHING;

-- logic_kg_7 → mathlogic_kg_7
INSERT INTO questions_mathlogic_kg_7 (id, question_type, question_text, options, topic, explanation, image_url, created_at)
SELECT id, 'logic', question_text, options,
       COALESCE(topic, ''), COALESCE(explanation, ''), COALESCE(image_url, ''), created_at
FROM questions_logic_kg_7
ON CONFLICT (id) DO NOTHING;

-- 3. Создание индексов для быстрой фильтрации по question_type

CREATE INDEX IF NOT EXISTS idx_mathlogic_ru_6_type ON questions_mathlogic_ru_6 (question_type);
CREATE INDEX IF NOT EXISTS idx_mathlogic_ru_7_type ON questions_mathlogic_ru_7 (question_type);
CREATE INDEX IF NOT EXISTS idx_mathlogic_kg_6_type ON questions_mathlogic_kg_6 (question_type);
CREATE INDEX IF NOT EXISTS idx_mathlogic_kg_7_type ON questions_mathlogic_kg_7 (question_type);

-- ПРИМЕЧАНИЕ: Старые таблицы math/logic НЕ удаляются сразу.
-- После проверки работоспособности можно удалить старые таблицы вручную:
-- DROP TABLE IF EXISTS questions_math_ru_5, questions_math_ru_6, questions_math_ru_7;
-- DROP TABLE IF EXISTS questions_math_kg_5, questions_math_kg_6, questions_math_kg_7;
-- DROP TABLE IF EXISTS questions_logic_ru_5, questions_logic_ru_6, questions_logic_ru_7;
-- DROP TABLE IF EXISTS questions_logic_kg_5, questions_logic_kg_6, questions_logic_kg_7;
