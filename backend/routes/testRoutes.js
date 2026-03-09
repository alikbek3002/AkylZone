const express = require('express');
const supabase = require('../lib/supabase');
const { hashPassword, signStudentToken, verifyStudentToken } = require('../lib/studentAuth');
const {
  SUBJECTS,
  LANGUAGES,
  STUDENT_GRADES,
  TEST_TYPES,
  normalizeLanguage,
  localizeText,
  buildQuestionTableName,
  buildResultTableName,
  loadQuestionCounts,
  buildStudentCatalog,
} = require('../lib/testCatalog');

const router = express.Router();

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

function shuffle(array) {
  const result = [...array];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
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

    return {
      text: String(option?.text || ''),
    };
  });
}

function getCorrectOptionIndex(options) {
  if (!Array.isArray(options)) {
    return -1;
  }

  return options.findIndex((option) => Boolean(option?.is_correct));
}

async function getStudentById(studentId) {
  let { data, error } = await supabase
    .from('students')
    .select('id, full_name, grade, language, username, password_hash, plain_password, active_session_token, screenshot_strikes, blocked_until, blocked_permanently')
    .eq('id', studentId)
    .maybeSingle();

  if (error) {
    const result = await supabase
      .from('students')
      .select('id, full_name, grade, language, username, password_hash, plain_password, active_session_token')
      .eq('id', studentId)
      .maybeSingle();
    data = result.data;
    if (result.error || !data) return null;
    data.screenshot_strikes = 0;
    data.blocked_until = null;
    data.blocked_permanently = false;
  }

  if (!data) return null;
  return data;
}

function isStudentBlocked(student) {
  if (student.blocked_permanently) return { blocked: true, reason: 'permanent' };
  if (student.blocked_until) {
    const until = new Date(student.blocked_until);
    if (until > new Date()) {
      return { blocked: true, reason: 'temporary', blocked_until: student.blocked_until };
    }
  }
  return { blocked: false };
}

async function authenticateStudent(req, res, next) {
  try {
    const token = parseBearerToken(req.headers.authorization);
    const payload = verifyStudentToken(token);

    if (!token || !payload?.sub) {
      return res.status(401).json({ error: 'Invalid or expired student token' });
    }

    const student = await getStudentById(payload.sub);
    if (!student) {
      return res.status(401).json({ error: 'Student not found for token' });
    }

    if (!student.active_session_token || student.active_session_token !== token) {
      return res.status(401).json({ error: 'Student session is no longer active' });
    }

    req.student = student;
    req.studentToken = token;
    return next();
  } catch (error) {
    console.error('Student auth error:', error);
    return res.status(500).json({ error: 'Failed to authenticate student' });
  }
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

function getNotReadyError(language, details) {
  return {
    code: 'test_not_ready',
    error: localizeText(
      language,
      'Этот тест пока недоступен — банк вопросов еще не заполнен.',
      'Бул тест азыр жеткиликсиз — суроолор базасы толо элек.',
    ),
    details,
  };
}

function getEmptyAnswersState() {
  return {
    by_question: {},
    answered_count: 0,
    correct_count: 0,
    total_questions: 0,
    score_percent: 0,
    submitted_at: null,
  };
}

function getAnswersState(rawAnswers) {
  const baseState = getEmptyAnswersState();
  if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
    return baseState;
  }

  return {
    ...baseState,
    ...rawAnswers,
    by_question:
      rawAnswers.by_question && typeof rawAnswers.by_question === 'object' && !Array.isArray(rawAnswers.by_question)
        ? rawAnswers.by_question
        : {},
  };
}

function buildMainLeafRequirements(leaf) {
  return leaf.lines.map((line) => ({
    grade: line.grade,
    required: line.required,
    available: line.available,
    label: line.label,
  }));
}

function buildTrialLeafRequirements(round) {
  return round.subjects.map((subject) => ({
    id: subject.id,
    title: subject.title,
    required_total: subject.required_total,
    available_total: subject.available_total,
    status: subject.status,
    lines: subject.lines.map((line) => ({
      grade: line.grade,
      required: line.required,
      available: line.available,
      label: line.label,
    })),
  }));
}

async function loadSessionContext({ student, type, sessionId }) {
  const normalizedType = String(type || '').trim().toUpperCase();
  const language = normalizeLanguage(student.language);
  const grade = student.grade;
  const resultTable = buildResultTableName(normalizedType, language, grade);

  const { data: sessionRow, error: sessionError } = await supabase
    .from(resultTable)
    .select('id, generated_questions, answers')
    .eq('id', sessionId)
    .eq('student_id', student.id)
    .maybeSingle();

  if (sessionError || !sessionRow) {
    return null;
  }

  return { normalizedType, language, grade, resultTable, sessionRow };
}

function findSessionItem(items, questionId) {
  return items.find((item) => String(item.id) === String(questionId)) || null;
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const plainPassword = String(password);

    let student = null;
    const fullResult = await supabase
      .from('students')
      .select('id, full_name, grade, language, username, password_hash, plain_password, screenshot_strikes, blocked_until, blocked_permanently')
      .ilike('username', normalizedUsername)
      .maybeSingle();

    if (!fullResult.error && fullResult.data) {
      student = fullResult.data;
    } else {
      const fallbackResult = await supabase
        .from('students')
        .select('id, full_name, grade, language, username, password_hash, plain_password')
        .ilike('username', normalizedUsername)
        .maybeSingle();
      if (!fallbackResult.error && fallbackResult.data) {
        student = { ...fallbackResult.data, screenshot_strikes: 0, blocked_until: null, blocked_permanently: false };
      }
    }

    if (!student) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const candidateHash = hashPassword(plainPassword);
    const hashMatches = student.password_hash && student.password_hash === candidateHash;
    const plainMatches = student.plain_password && student.plain_password === plainPassword;

    if (!hashMatches && !plainMatches) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const blockStatus = isStudentBlocked(student);
    if (blockStatus.blocked) {
      if (blockStatus.reason === 'permanent') {
        return res.status(403).json({
          error: 'Ваша учётная запись заблокирована навсегда.',
          code: 'BLOCKED_PERMANENT',
        });
      }
      return res.status(403).json({
        error: `Ваша учётная запись заблокирована до ${new Date(blockStatus.blocked_until).toLocaleString('ru-RU')}.`,
        code: 'BLOCKED_TEMPORARY',
        blocked_until: blockStatus.blocked_until,
      });
    }

    const language = normalizeLanguage(student.language);
    if (!LANGUAGES.includes(language) || !STUDENT_GRADES.includes(student.grade)) {
      return res.status(400).json({ error: 'У ученика не настроены корректные язык/класс' });
    }

    const token = signStudentToken({
      sub: student.id,
      language,
      grade: student.grade,
    });

    const { error: updateError } = await supabase
      .from('students')
      .update({ active_session_token: token })
      .eq('id', student.id);

    if (updateError) {
      console.error('Failed to update active student session token:', updateError);
      return res.status(500).json({ error: 'Ошибка входа ученика' });
    }

    return res.json(toStudentResponse(student, token));
  } catch (error) {
    console.error('Student login error:', error);
    return res.status(500).json({ error: 'Ошибка входа ученика' });
  }
});

router.use(authenticateStudent);

router.get('/available', async (req, res) => {
  try {
    const countsByTable = await loadQuestionCounts(supabase);
    return res.json(buildStudentCatalog(req.student, countsByTable));
  } catch (error) {
    console.error('Load student catalog error:', error);
    return res.status(500).json({ error: 'Failed to load student navigation tree' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { type, subject, round, grade: selectedGrade } = req.body || {};
    const normalizedType = String(type || '').trim().toUpperCase();
    const normalizedSubject = String(subject || '').trim().toLowerCase();
    const selectedRound = Number(round);
    const requestedGrade = Number(selectedGrade);
    const language = normalizeLanguage(req.student.language);
    const studentGrade = req.student.grade;

    if (!TEST_TYPES.includes(normalizedType)) {
      return res.status(400).json({ error: 'Invalid test type' });
    }

    const countsByTable = await loadQuestionCounts(supabase);
    const catalog = buildStudentCatalog(req.student, countsByTable);
    const mainNode = catalog.test_types.find((node) => node.id === 'MAIN');
    const trialNode = catalog.test_types.find((node) => node.id === 'TRIAL');

    const fetchPlan = [];
    let blockedLeaf = null;

    if (normalizedType === 'MAIN') {
      if (!SUBJECTS.includes(normalizedSubject)) {
        return res.status(400).json({ error: 'Invalid subject for MAIN test' });
      }

      // If a specific grade is requested, validate it against the student's allowed window
      const validGrades = [studentGrade - 1, studentGrade];
      if (requestedGrade && !validGrades.includes(requestedGrade)) {
        return res.status(400).json({ error: 'Invalid grade selection for this test' });
      }

      const leaf = mainNode?.items?.find((item) => item.id === normalizedSubject) || null;

      let isReady = false;
      let linesToFetch = [];

      if (leaf) {
        if (requestedGrade) {
          const requestedLine = leaf.lines.find((line) => line.grade === requestedGrade);
          isReady = requestedLine && requestedLine.available >= requestedLine.required;
          if (isReady) linesToFetch = [requestedLine];
        } else {
          isReady = leaf.status === 'ready';
          if (isReady) linesToFetch = leaf.lines;
        }
      }

      if (!isReady) {
        blockedLeaf = leaf || { id: normalizedSubject, status: 'locked', lines: [] };
      } else {
        for (const line of linesToFetch) {
          fetchPlan.push({
            subject: normalizedSubject,
            grade: line.grade,
            count: line.required,
          });
        }
      }
    } else {
      if (![1, 3].includes(selectedRound)) {
        return res.status(400).json({ error: 'Invalid round for TRIAL test' });
      }

      const roundLeaf = trialNode?.rounds?.find((item) => item.id === selectedRound) || null;
      if (!roundLeaf || roundLeaf.status !== 'ready') {
        blockedLeaf = roundLeaf || { id: selectedRound, status: 'locked', subjects: [] };
      } else {
        for (const subjectLeaf of roundLeaf.subjects) {
          for (const line of subjectLeaf.lines) {
            fetchPlan.push({
              subject: subjectLeaf.id,
              grade: line.grade,
              count: line.required,
            });
          }
        }
      }
    }

    if (blockedLeaf) {
      return res.status(409).json(
        getNotReadyError(language, normalizedType === 'MAIN'
          ? {
            type: normalizedType,
            subject: normalizedSubject,
            requirements: buildMainLeafRequirements(blockedLeaf),
          }
          : {
            type: normalizedType,
            round: selectedRound,
            requirements: buildTrialLeafRequirements(blockedLeaf),
          }),
      );
    }

    const groupedQuestions = await Promise.all(
      fetchPlan.map((planItem) =>
        fetchRandomQuestionsStrict({
          subject: planItem.subject,
          language,
          grade: planItem.grade,
          requiredCount: planItem.count,
        })),
    );

    const questions = shuffle(groupedQuestions.flat());
    const breakdown = buildBreakdown(questions);
    const generatedMeta = {
      schema_version: 3,
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
        answers: getEmptyAnswersState(),
        total_score: 0,
      })
      .select('id')
      .single();

    if (resultError || !resultData) {
      console.error('Test session insert error:', resultError);
      return res.status(500).json({ error: 'Failed to create test session' });
    }

    return res.json({
      test_session_id: resultData.id,
      test_info: {
        type: normalizedType,
        subject: normalizedType === 'MAIN' ? normalizedSubject : null,
        round: normalizedType === 'TRIAL' ? selectedRound : null,
        language,
        grade: studentGrade,
        grade_window: [studentGrade - 1, studentGrade],
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
      return res.status(409).json(
        getNotReadyError(normalizeLanguage(req.student.language), {
          type: String(req.body?.type || '').trim().toUpperCase(),
          reason: 'not_enough_questions',
          tableName: error.meta?.tableName,
          requiredCount: error.meta?.requiredCount,
          availableCount: error.meta?.availableCount,
        }),
      );
    }

    console.error('Test generation error:', error);
    return res.status(500).json({ error: 'Internal server error during test generation' });
  }
});

router.post('/answer', async (req, res) => {
  try {
    const { test_session_id: sessionId, type, question_id: questionId, selected_index: selectedIndexRaw } = req.body || {};
    const selectedIndex = Number(selectedIndexRaw);

    if (!sessionId || !questionId || !TEST_TYPES.includes(String(type || '').trim().toUpperCase())) {
      return res.status(400).json({ error: 'Invalid answer payload' });
    }

    if (!Number.isInteger(selectedIndex) || selectedIndex < 0) {
      return res.status(400).json({ error: 'selected_index must be a non-negative integer' });
    }

    const sessionContext = await loadSessionContext({
      student: req.student,
      type,
      sessionId,
    });

    if (!sessionContext) {
      return res.status(404).json({ error: 'Test session not found' });
    }

    const { resultTable, sessionRow } = sessionContext;
    const generatedMeta = sessionRow.generated_questions;
    const items = Array.isArray(generatedMeta?.items) ? generatedMeta.items : [];
    const sessionItem = findSessionItem(items, questionId);
    if (!sessionItem) {
      return res.status(404).json({ error: 'Question not found in this session' });
    }

    const answersState = getAnswersState(sessionRow.answers);
    if (answersState.submitted_at) {
      return res.status(409).json({ error: 'Test session is already submitted' });
    }

    if (answersState.by_question[String(questionId)]) {
      return res.status(409).json({ error: 'Answer for this question is already locked' });
    }

    const tableName = buildQuestionTableName(sessionItem.subject, req.student.language, sessionItem.grade);
    const { data: questionRow, error: questionError } = await supabase
      .from(tableName)
      .select('id, options, explanation')
      .eq('id', questionId)
      .maybeSingle();

    if (questionError || !questionRow) {
      console.error('Load single question for answer reveal failed:', questionError);
      return res.status(500).json({ error: 'Failed to reveal answer' });
    }

    if (!Array.isArray(questionRow.options) || selectedIndex >= questionRow.options.length) {
      return res.status(400).json({ error: 'selected_index is out of range for this question' });
    }

    const correctIndex = getCorrectOptionIndex(questionRow.options);
    const isCorrect = correctIndex >= 0 && selectedIndex === correctIndex;
    const nextAnswers = {
      ...answersState,
      by_question: {
        ...answersState.by_question,
        [String(questionId)]: {
          selected_index: selectedIndex,
          is_correct: isCorrect,
          correct_index: correctIndex,
          answered_at: new Date().toISOString(),
        },
      },
    };

    nextAnswers.answered_count = Object.keys(nextAnswers.by_question).length;
    nextAnswers.correct_count = Object.values(nextAnswers.by_question).reduce(
      (sum, answer) => sum + (answer.is_correct ? 1 : 0),
      0,
    );
    nextAnswers.total_questions = items.length;
    nextAnswers.score_percent = items.length > 0
      ? Math.round((nextAnswers.correct_count / items.length) * 100)
      : 0;

    const { error: updateError } = await supabase
      .from(resultTable)
      .update({
        answers: nextAnswers,
      })
      .eq('id', sessionId)
      .eq('student_id', req.student.id);

    if (updateError) {
      console.error('Persist answer reveal failed:', updateError);
      return res.status(500).json({ error: 'Failed to save answer result' });
    }

    return res.json({
      is_correct: isCorrect,
      correct_index: correctIndex,
      explanation: String(questionRow.explanation || ''),
      can_continue: true,
      answered_count: nextAnswers.answered_count,
      total_questions: items.length,
    });
  } catch (error) {
    console.error('Test answer error:', error);
    return res.status(500).json({ error: 'Internal server error during answer reveal' });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const { test_session_id: sessionId, type } = req.body || {};
    const normalizedType = String(type || '').trim().toUpperCase();

    if (!sessionId || !TEST_TYPES.includes(normalizedType)) {
      return res.status(400).json({ error: 'Invalid submit payload' });
    }

    const sessionContext = await loadSessionContext({
      student: req.student,
      type: normalizedType,
      sessionId,
    });

    if (!sessionContext) {
      return res.status(404).json({ error: 'Test session not found' });
    }

    const { resultTable, sessionRow } = sessionContext;
    const generatedMeta = sessionRow.generated_questions;
    const items = Array.isArray(generatedMeta?.items) ? generatedMeta.items : [];

    if (items.length === 0) {
      return res.status(400).json({ error: 'No generated questions attached to session' });
    }

    const answersState = getAnswersState(sessionRow.answers);
    if (answersState.submitted_at) {
      return res.status(409).json({ error: 'Test session is already submitted' });
    }

    const answeredCount = Object.keys(answersState.by_question).length;
    const correctCount = Object.values(answersState.by_question).reduce(
      (sum, answer) => sum + (answer.is_correct ? 1 : 0),
      0,
    );
    const totalQuestions = items.length;
    const scorePercent = totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

    const finalAnswers = {
      ...answersState,
      answered_count: answeredCount,
      correct_count: correctCount,
      total_questions: totalQuestions,
      score_percent: scorePercent,
      submitted_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from(resultTable)
      .update({
        answers: finalAnswers,
        total_score: scorePercent,
      })
      .eq('id', sessionId)
      .eq('student_id', req.student.id);

    if (updateError) {
      console.error('Submit update error:', updateError);
      return res.status(500).json({ error: 'Failed to save test submission' });
    }

    return res.json({
      message: 'Submission successful',
      score: scorePercent,
      correct: correctCount,
      answered: answeredCount,
      total: totalQuestions,
    });
  } catch (error) {
    console.error('Test submit error:', error);
    return res.status(500).json({ error: 'Internal server error during test submit' });
  }
});

router.post('/screenshot-violation', async (req, res) => {
  try {
    const student = req.student;
    const currentStrikes = (student.screenshot_strikes || 0) + 1;

    let action = 'warning';
    if (currentStrikes === 1) {
      action = 'warning';
    } else if (currentStrikes === 2) {
      action = 'blocked_48h';
    } else if (currentStrikes >= 3) {
      action = 'blocked_permanent';
    }

    const updates = { screenshot_strikes: currentStrikes };
    if (action === 'blocked_48h') {
      updates.blocked_until = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      updates.active_session_token = null;
    } else if (action === 'blocked_permanent') {
      updates.blocked_permanently = true;
      updates.active_session_token = null;
    }

    const { error: updateError } = await supabase
      .from('students')
      .update(updates)
      .eq('id', student.id);

    if (updateError) {
      console.error('Screenshot violation update error (columns may not exist yet):', updateError);
    }

    return res.json({
      action,
      strikes: currentStrikes,
    });
  } catch (error) {
    console.error('Screenshot violation error:', error);
    return res.json({ action: 'warning', strikes: 1 });
  }
});

module.exports = router;
