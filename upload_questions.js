#!/usr/bin/env node
/**
 * Bulk upload questions from JSON to Supabase.
 * 
 * Usage:
 *   node upload_questions.js <path-to-json-file>
 * 
 * JSON format:
 * {
 *   "subjects": [{
 *     "id": "math",
 *     "grades": {
 *       "5": {
 *         "questions": [{
 *           "q": "Текст вопроса",
 *           "opts": ["A", "B", "C", "D"],
 *           "correct": 0,         // index of correct option (0-based)
 *           "topic": "Тема",
 *           "hint": "Объяснение",
 *           "lang": "ru"
 *         }]
 *       }
 *     }
 *   }]
 * }
 * 
 * Table naming: questions_{subject.id}_{lang}_{grade}
 * E.g. questions_math_ru_5
 */

const path = require('path');
const fs = require('fs');

// Load env from backend
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({
    path: path.join(__dirname, 'backend', '.env'),
});
const { createClient } = require(
    path.join(__dirname, 'backend', 'node_modules', '@supabase', 'supabase-js'),
);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const VALID_SUBJECTS = ['math', 'logic', 'history', 'english', 'russian', 'kyrgyz'];
const VALID_LANGUAGES = ['ru', 'kg'];
const VALID_GRADES = [5, 6, 7];

function buildTableName(subject, lang, grade) {
    return `questions_${subject}_${lang}_${grade}`;
}

async function uploadQuestions(jsonPath) {
    if (!jsonPath) {
        console.error('Usage: node upload_questions.js <path-to-json-file>');
        process.exit(1);
    }

    const absolutePath = path.resolve(jsonPath);
    if (!fs.existsSync(absolutePath)) {
        console.error(`File not found: ${absolutePath}`);
        process.exit(1);
    }

    const raw = fs.readFileSync(absolutePath, 'utf-8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (err) {
        console.error(`Invalid JSON: ${err.message}`);
        process.exit(1);
    }

    const subjects = data.subjects;
    if (!Array.isArray(subjects) || subjects.length === 0) {
        console.error('JSON must have a "subjects" array at the root level.');
        process.exit(1);
    }

    let totalInserted = 0;
    let totalErrors = 0;

    for (const subject of subjects) {
        const subjectId = String(subject.id || '').toLowerCase();
        if (!VALID_SUBJECTS.includes(subjectId)) {
            console.warn(`⚠️  Пропущен неизвестный предмет: "${subject.id}"`);
            continue;
        }

        const grades = subject.grades || {};

        for (const [gradeStr, gradeData] of Object.entries(grades)) {
            const grade = parseInt(gradeStr, 10);
            if (!VALID_GRADES.includes(grade)) {
                console.warn(`⚠️  Пропущен неверный класс: ${gradeStr} для ${subjectId}`);
                continue;
            }

            const questions = gradeData.questions || [];
            if (questions.length === 0) {
                continue;
            }

            // Group questions by language
            const byLang = {};
            for (const q of questions) {
                const lang = String(q.lang || 'ru').toLowerCase();
                // Normalize 'ky' -> 'kg'
                const normalizedLang = lang === 'ky' ? 'kg' : lang;

                if (!VALID_LANGUAGES.includes(normalizedLang)) {
                    console.warn(`⚠️  Пропущен неизвестный язык: "${q.lang}" (вопрос: "${q.q?.substring(0, 40)}...")`);
                    continue;
                }

                if (!byLang[normalizedLang]) {
                    byLang[normalizedLang] = [];
                }
                byLang[normalizedLang].push(q);
            }

            for (const [lang, langQuestions] of Object.entries(byLang)) {
                const tableName = buildTableName(subjectId, lang, grade);

                const rows = langQuestions.map((q) => {
                    const opts = Array.isArray(q.opts) ? q.opts : [];
                    const correctIdx = typeof q.correct === 'number' ? q.correct : -1;

                    const options = opts.map((text, idx) => ({
                        text: String(text),
                        is_correct: idx === correctIdx,
                    }));

                    return {
                        question_text: String(q.q || ''),
                        options,
                        topic: String(q.topic || ''),
                        explanation: String(q.hint || ''),
                    };
                });

                // Filter out empty questions
                const validRows = rows.filter((r) => r.question_text.trim() !== '');

                if (validRows.length === 0) {
                    continue;
                }

                console.log(`\n📝 ${tableName}: загружаю ${validRows.length} вопросов...`);

                // Insert in batches of 50
                const BATCH_SIZE = 50;
                let inserted = 0;

                for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
                    const batch = validRows.slice(i, i + BATCH_SIZE);
                    const { data: result, error } = await supabase
                        .from(tableName)
                        .insert(batch)
                        .select('id');

                    if (error) {
                        console.error(`   ❌ Ошибка при вставке в ${tableName}: ${error.message}`);
                        totalErrors += batch.length;
                    } else {
                        inserted += (result || []).length;
                    }
                }

                console.log(`   ✅ Вставлено: ${inserted} из ${validRows.length}`);
                totalInserted += inserted;
            }
        }
    }

    console.log(`\n========================================`);
    console.log(`✅ Итого загружено: ${totalInserted} вопросов`);
    if (totalErrors > 0) {
        console.log(`❌ Ошибок: ${totalErrors}`);
    }
    console.log(`========================================\n`);
}

const jsonFile = process.argv[2];
uploadQuestions(jsonFile).catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
