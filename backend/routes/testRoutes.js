const express = require('express');
const supabase = require('../lib/supabase');
const { hashPassword, signStudentToken, verifyStudentToken } = require('../lib/studentAuth');

const router = express.Router();

const SUBJECTS = ['math', 'logic', 'history', 'english', 'russian', 'kyrgyz'];
const LANGUAGES = ['ru', 'kg'];
const STUDENT_GRADES = [6, 7];
const MAIN_QUESTIONS_PER_GRADE = 125;
const TEST_TYPES = ['MAIN', 'TRIAL'];
const TERMINATION_MODES = ['normal', 'violation'];
const TERMINATION_SOURCES = [
  'blur',
  'visibilitychange',
  'fullscreen_exit',
  'printscreen',
  'blocked_shortcut',
  'copy',
  'contextmenu',
  'navigation',
];

const subjectsList = [
  { id: 'math', name_ru: 'Математика', name_kg: 'Математика' },
  { id: 'logic', name_ru: 'Логика', name_kg: 'Логика' },
  { id: 'history', name_ru: 'История', name_kg: 'Тарых' },
  { id: 'english', name_ru: 'Английский язык', name_kg: 'Англис тили' },
  { id: 'russian', name_ru: 'Русский язык', name_kg: 'Орус тили' },
  { id: 'kyrgyz', name_ru: 'Кыргызский язык', name_kg: 'Кыргыз тили' },
];

// From site-navigation-tree.md
const TRIAL_STRUCTURE = {
  1: { // 1-2 тур (80)
    math: { prev: 12, curr: 13 },
    logic: { prev: 7, curr: 8 },
    kyrgyz: { prev: 7, curr: 8 },
    russian: { prev: 7, curr: 8 },
    history: { prev: 5, curr: 5 },
  },
  3: { // 3 тур (80)
    math: { prev: 12, curr: 13 },
    logic: { prev: 7, curr: 8 },
    kyrgyz: { prev: 10, curr: 10 },
    english: { prev: 10, curr: 10 },
  },
};

function normalizeLanguage(language) {
  return String(language || '').trim().toLowerCase();
}

function parseBearerToken(headerValue) {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = String(headerValue).split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function toStudentResponse(student, token) {
  return {
    token,
    student: {
      id: student.id,
      fullName: student.full_name,
      grade: student.grade,
      language: normalizeLanguage(student.language),
      username: student.username,
    },
  };
}

function localizeText(language, ruText, kgText) {
  return language === 'kg' ? kgText : ruText;
}

function localizeStudentText(student, ruText, kgText) {
  return localizeText(normalizeLanguage(student?.language), ruText, kgText);
}

function buildQuestionTableName(subject, language, grade) {
  return `questions_${subject}_${language}_${grade}`;
}

function buildResultTableName(type, language, grade) {
  return `results_${type.toLowerCase()}_${language}_${grade}`;
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function sanitizeOptionsForStudent(options) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.map((option) => {
    if (typeof option === 'string') {
      return { text: option };
    }

    return { text: String(option?.text || '') };
  });
}

function normalizeTerminationPayload(termination) {
  if (!termination || typeof termination !== 'object') {
    return null;
  }

  const mode = String(termination.mode || '').trim().toLowerCase();
  const reason = String(termination.reason || '').trim();
  const source = String(termination.source || '').trim().toLowerCase();
  const triggeredAt = String(termination.triggered_at || '').trim();

  if (!TERMINATION_MODES.includes(mode)) {
    return null;
  }

  if (!reason) {
    return null;
  }

  if (!TERMINATION_SOURCES.includes(source)) {
    return null;
  }

  if (!triggeredAt) {
    return null;
  }

  return {
    mode,
    reason,
    source,
    triggered_at: triggeredAt,
  };
}

async function getStudentById(studentId) {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, grade, language, username, password_hash, plain_password')
    .eq('id', studentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

async function authenticateStudent(req, res, next) {
  try {
    const token = parseBearerToken(req.headers.authorization);
    let student = null;

    if (token) {
      const payload = verifyStudentToken(token);
      if (!payload?.sub) {
        return res.status(401).json({
          error: localizeText(payload?.language, 'Недействительный или просроченный токен ученика', 'Окуучунун токени жараксыз же мөөнөтү өтүп кеткен'),
        });
      }

      student = await getStudentById(payload.sub);
      if (!student) {
        return res.status(401).json({
          error: localizeText(payload.language, 'Ученик для токена не найден', 'Токен үчүн окуучу табылган жок'),
        });
      }
    } else if (req.headers['x-student-id']) {
      // Compatibility fallback for old clients.
      student = await getStudentById(String(req.headers['x-student-id']));
      if (!student) {
        return res.status(401).json({ error: 'Invalid student id' });
      }
    } else {
      return res.status(401).json({ error: 'Student authorization is required' });
    }

    req.student = student;
    return next();
  } catch (error) {
    console.error('Student auth error:', error);
    return res.status(500).json({ error: 'Failed to authenticate student' });
  }
}

function buildTrialSubjectsForRound(grade, language, round) {
  const structure = TRIAL_STRUCTURE[round];
  const prevGrade = grade - 1;

  return Object.entries(structure).map(([subject, counts]) => ({
    id: subject,
    name: subjectsList.find((item) => item.id === subject)?.[`name_${language}`] || subject,
    counts: {
      [prevGrade]: counts.prev,
      [grade]: counts.curr,
    },
    total: counts.prev + counts.curr,
  }));
}

async function fetchRandomQuestionsStrict({ subject, language, grade, requiredCount }) {
  const tableName = buildQuestionTableName(subject, language, grade);
  const { data, error } = await supabase
    .from(tableName)
    .select('id, question_text, options, topic, explanation, image_url');

  if (error) {
    const err = new Error(`Failed to load questions from table ${tableName}`);
    err.cause = error;
    throw err;
  }

  const rows = data || [];
  if (rows.length < requiredCount) {
    const err = new Error(
      `Not enough questions in ${tableName}: required ${requiredCount}, available ${rows.length}`,
    );
    err.code = 'NOT_ENOUGH_QUESTIONS';
    err.meta = {
      tableName,
      requiredCount,
      availableCount: rows.length,
    };
    throw err;
  }

  return shuffle(rows).slice(0, requiredCount).map((row) => ({
    ...row,
    subject,
    grade,
    tableName,
  }));
}

function buildBreakdown(items) {
  const breakdown = {};

  for (const item of items) {
    if (!breakdown[item.subject]) {
      breakdown[item.subject] = { total: 0, by_grade: {} };
    }

    breakdown[item.subject].total += 1;
    breakdown[item.subject].by_grade[item.grade] = (breakdown[item.subject].by_grade[item.grade] || 0) + 1;
  }

  return breakdown;
}

function getCorrectOptionIndex(options) {
  if (!Array.isArray(options)) {
    return -1;
  }
  return options.findIndex((option) => Boolean(option?.is_correct));
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Требуются логин и пароль / Логин жана сырсөз талап кылынат' });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const plainPassword = String(password);
    const { data: student, error } = await supabase
      .from('students')
      .select('id, full_name, grade, language, username, password_hash, plain_password')
      .ilike('username', normalizedUsername)
      .maybeSingle();

    if (error || !student) {
      return res.status(401).json({ error: 'Неверный логин или пароль / Логин же сырсөз туура эмес' });
    }

    const language = normalizeLanguage(student.language);
    const candidateHash = hashPassword(plainPassword);
    const hashMatches = student.password_hash && student.password_hash === candidateHash;
    const plainMatches = student.plain_password && student.plain_password === plainPassword;

    if (!hashMatches && !plainMatches) {
      return res.status(401).json({
        error: localizeText(language, 'Неверный логин или пароль', 'Логин же сырсөз туура эмес'),
      });
    }

    if (!LANGUAGES.includes(language) || !STUDENT_GRADES.includes(student.grade)) {
      return res.status(400).json({
        error: localizeText(language, 'У ученика не настроены корректные язык/класс', 'Окуучу үчүн тил же класс туура жөндөлгөн эмес'),
      });
    }

    const token = signStudentToken({
      sub: student.id,
      language,
      grade: student.grade,
    });

    await supabase
      .from('students')
      .update({ active_session_token: token })
      .eq('id', student.id);

    return res.json(toStudentResponse(student, token));
  } catch (error) {
    console.error('Student login error:', error);
    return res.status(500).json({ error: 'Ошибка входа ученика / Окуучунун кирүүсүндө ката кетти' });
  }
});

router.use(authenticateStudent);

router.get('/available', (req, res) => {
  const student = req.student;
  const language = normalizeLanguage(student.language);
  const grade = student.grade;
  const prevGrade = grade - 1;

  const subjects = subjectsList.map((subject) => ({
    id: subject.id,
    name: language === 'kg' ? subject.name_kg : subject.name_ru,
  }));

  return res.json({
    student: {
      id: student.id,
      fullName: student.full_name,
      grade,
      language,
      username: student.username,
    },
    test_types: [
      {
        id: 'MAIN',
        title: localizeText(language, 'Предметный тест', 'Предметтик тест'),
      },
      {
        id: 'TRIAL',
        title: localizeText(language, 'Пробный тест', 'Сыноо тест'),
      },
    ],
    subjects,
    rounds: [
      {
        id: 1,
        title: localizeText(language, '1-2 тур', '1-2 тур'),
        total_questions: 80,
        subjects: buildTrialSubjectsForRound(grade, language, 1),
      },
      {
        id: 3,
        title: localizeText(language, '3 тур', '3 тур'),
        total_questions: 80,
        subjects: buildTrialSubjectsForRound(grade, language, 3),
      },
    ],
    main_test: {
      grades: [prevGrade, grade],
      questions_per_grade: MAIN_QUESTIONS_PER_GRADE,
      total_questions: MAIN_QUESTIONS_PER_GRADE * 2,
    },
  });
});

router.post('/generate', async (req, res) => {
  try {
    const { type, subject, round } = req.body || {};
    const normalizedType = String(type || '').trim().toUpperCase();
    const normalizedSubject = String(subject || '').trim().toLowerCase();
    const selectedRound = Number(round) === 3 ? 3 : 1;

    const studentGrade = req.student.grade;
    const prevGrade = studentGrade - 1;
    const language = normalizeLanguage(req.student.language);

    if (!TEST_TYPES.includes(normalizedType)) {
      return res.status(400).json({ error: localizeText(language, 'Некорректный тип теста', 'Тесттин тиби туура эмес') });
    }

    const fetchPlan = [];
    if (normalizedType === 'MAIN') {
      if (!SUBJECTS.includes(normalizedSubject)) {
        return res.status(400).json({
          error: localizeText(language, 'Некорректный предмет для предметного теста', 'Предметтик тест үчүн предмет туура эмес'),
        });
      }

      fetchPlan.push(
        { subject: normalizedSubject, grade: prevGrade, count: MAIN_QUESTIONS_PER_GRADE },
        { subject: normalizedSubject, grade: studentGrade, count: MAIN_QUESTIONS_PER_GRADE },
      );
    } else {
      const structure = TRIAL_STRUCTURE[selectedRound];
      for (const [trialSubject, counts] of Object.entries(structure)) {
        fetchPlan.push(
          { subject: trialSubject, grade: prevGrade, count: counts.prev },
          { subject: trialSubject, grade: studentGrade, count: counts.curr },
        );
      }
    }

    const groupedQuestions = await Promise.all(
      fetchPlan.map((planItem) =>
        fetchRandomQuestionsStrict({
          subject: planItem.subject,
          language,
          grade: planItem.grade,
          requiredCount: planItem.count,
        }),
      ),
    );

    const questions = shuffle(groupedQuestions.flat());
    const breakdown = buildBreakdown(questions);
    const generatedMeta = {
      schema_version: 2,
      type: normalizedType,
      subject: normalizedType === 'MAIN' ? normalizedSubject : null,
      round: normalizedType === 'TRIAL' ? selectedRound : null,
      items: questions.map((question) => ({
        id: question.id,
        subject: question.subject,
        grade: question.grade,
      })),
    };

    const resultTable = buildResultTableName(normalizedType, language, studentGrade);
    const { data: resultData, error: resultError } = await supabase
      .from(resultTable)
      .insert({
        student_id: req.student.id,
        generated_questions: generatedMeta,
        answers: {},
        total_score: 0,
      })
      .select('id')
      .single();

    if (resultError || !resultData) {
      console.error('Test session insert error:', resultError);
      return res.status(500).json({
        error: localizeText(language, 'Не удалось создать тестовую сессию', 'Тест сессиясын түзүү мүмкүн болгон жок'),
      });
    }

    return res.json({
      test_session_id: resultData.id,
      test_info: {
        type: normalizedType,
        subject: normalizedType === 'MAIN' ? normalizedSubject : null,
        round: normalizedType === 'TRIAL' ? selectedRound : null,
        language,
        grade: studentGrade,
        grade_window: [prevGrade, studentGrade],
      },
      breakdown,
      total_questions: questions.length,
      questions: questions.map((question) => ({
        id: question.id,
        text: question.question_text,
        options: sanitizeOptionsForStudent(question.options),
        topic: question.topic || '',
        imageUrl: question.image_url || '',
      })),
    });
  } catch (error) {
    if (error.code === 'NOT_ENOUGH_QUESTIONS') {
      const language = normalizeLanguage(req.student.language);
      return res.status(400).json({
        error: localizeText(language, 'Недостаточно вопросов в базе для генерации теста', 'Тест түзүү үчүн базада суроолор жетишсиз'),
        details: error.meta,
      });
    }

    console.error('Test generation error:', error);
    return res.status(500).json({
      error: localizeStudentText(req.student, 'Внутренняя ошибка при генерации теста', 'Тестти түзүүдө ички ката кетти'),
    });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const {
      test_session_id: sessionId,
      type,
      answers,
      termination,
    } = req.body || {};
    const normalizedType = String(type || '').trim().toUpperCase();
    const submittedAnswers = answers && typeof answers === 'object' ? answers : {};
    const normalizedTermination = normalizeTerminationPayload(termination);
    const language = normalizeLanguage(req.student.language);

    if (!sessionId || !TEST_TYPES.includes(normalizedType)) {
      return res.status(400).json({ error: localizeText(language, 'Некорректные данные отправки', 'Жөнөтүлгөн маалыматтар туура эмес') });
    }

    if (termination && !normalizedTermination) {
      return res.status(400).json({ error: localizeText(language, 'Некорректные данные завершения теста', 'Тестти аяктоо маалыматы туура эмес') });
    }

    const grade = req.student.grade;
    const resultTable = buildResultTableName(normalizedType, language, grade);

    const { data: sessionRow, error: sessionError } = await supabase
      .from(resultTable)
      .select('id, generated_questions')
      .eq('id', sessionId)
      .eq('student_id', req.student.id)
      .maybeSingle();

    if (sessionError || !sessionRow) {
      return res.status(404).json({ error: localizeText(language, 'Тестовая сессия не найдена', 'Тест сессиясы табылган жок') });
    }

    const generatedMeta = sessionRow.generated_questions;
    const items = Array.isArray(generatedMeta?.items) ? generatedMeta.items : [];

    if (items.length === 0) {
      return res.status(400).json({
        error: localizeText(language, 'К тестовой сессии не привязаны сгенерированные вопросы', 'Тест сессиясына түзүлгөн суроолор байланган эмес'),
      });
    }

    const idsByTable = new Map();
    for (const item of items) {
      const itemSubject = String(item.subject || '').toLowerCase();
      const itemGrade = Number(item.grade);
      if (!SUBJECTS.includes(itemSubject) || !Number.isInteger(itemGrade)) {
        continue;
      }

      const tableName = buildQuestionTableName(itemSubject, language, itemGrade);
      if (!idsByTable.has(tableName)) {
        idsByTable.set(tableName, new Set());
      }
      idsByTable.get(tableName).add(item.id);
    }

    const questionsById = new Map();
    for (const [tableName, idsSet] of idsByTable.entries()) {
      const ids = Array.from(idsSet);
      if (ids.length === 0) {
        continue;
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('id, options')
        .in('id', ids);

      if (error) {
        console.error(`Failed to load submitted questions from ${tableName}:`, error);
        return res.status(500).json({ error: localizeText(language, 'Не удалось проверить ответы теста', 'Тесттин жоопторун текшерүү мүмкүн болгон жок') });
      }

      for (const row of data || []) {
        questionsById.set(row.id, row);
      }
    }

    let answeredCount = 0;
    let correctCount = 0;
    for (const item of items) {
      const questionId = String(item.id || '');
      const selectedValue = submittedAnswers[questionId];
      if (selectedValue === undefined || selectedValue === null || selectedValue === '') {
        continue;
      }

      const selectedIndex = Number(selectedValue);
      if (!Number.isInteger(selectedIndex) || selectedIndex < 0) {
        continue;
      }

      answeredCount += 1;
      const question = questionsById.get(questionId);
      const correctIndex = getCorrectOptionIndex(question?.options);
      if (correctIndex >= 0 && selectedIndex === correctIndex) {
        correctCount += 1;
      }
    }

    const totalQuestions = items.length;
    const scorePercent = totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

    const answersPayload = {
      submitted_answers: submittedAnswers,
      answered_count: answeredCount,
      correct_count: correctCount,
      total_questions: totalQuestions,
      score_percent: scorePercent,
      submitted_at: new Date().toISOString(),
      termination: normalizedTermination,
    };

    const { error: updateError } = await supabase
      .from(resultTable)
      .update({
        answers: answersPayload,
        total_score: scorePercent,
      })
      .eq('id', sessionId)
      .eq('student_id', req.student.id);

    if (updateError) {
      console.error('Submit update error:', updateError);
      return res.status(500).json({ error: localizeText(language, 'Не удалось сохранить результаты теста', 'Тесттин жыйынтыктарын сактоо мүмкүн болгон жок') });
    }

    return res.json({
      message: localizeText(language, 'Результаты успешно отправлены', 'Жыйынтыктар ийгиликтүү жөнөтүлдү'),
      score: scorePercent,
      correct: correctCount,
      answered: answeredCount,
      total: totalQuestions,
    });
  } catch (error) {
    console.error('Test submit error:', error);
    return res.status(500).json({
      error: localizeStudentText(req.student, 'Внутренняя ошибка при отправке теста', 'Тестти жөнөтүүдө ички ката кетти'),
    });
  }
});

module.exports = router;
