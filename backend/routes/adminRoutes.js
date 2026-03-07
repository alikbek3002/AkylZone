const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const router = express.Router();
const supabase = require('../lib/supabase');
const { signAdminToken, verifyAdminToken } = require('../lib/adminAuth');
const { loadQuestionCounts, buildContentReadiness } = require('../lib/testCatalog');

const upload = multer({ storage: multer.memoryStorage() });

const SUBJECTS = ['math', 'logic', 'history', 'english', 'russian', 'kyrgyz'];
const LANGUAGES = ['ru', 'kg'];
const QUESTION_GRADES = [5, 6, 7];
const STUDENT_GRADES = [6, 7];
const TEST_TYPES = ['main', 'trial'];

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function normalizeLanguage(language) {
  return String(language || '').trim().toLowerCase();
}

function toDbLanguage(language) {
  return normalizeLanguage(language).toUpperCase();
}

function parseGrade(grade) {
  const parsed = Number(grade);
  return Number.isInteger(parsed) ? parsed : null;
}

function toSafeUsernamePart(value) {
  const translitMap = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ы: 'y', э: 'e',
    ю: 'yu', я: 'ya', ъ: '', ь: '',
  };

  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => translitMap[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]/g, '');
}

function generateBaseUsername(fullName) {
  const parts = String(fullName || '')
    .split(/\s+/)
    .filter(Boolean);
  const lastName = toSafeUsernamePart(parts[0] || '');
  const firstName = toSafeUsernamePart(parts[1] || '');

  if (firstName && lastName) {
    return `${firstName}.${lastName}`;
  }

  return firstName || lastName || 'student';
}

function generatePassword() {
  return `akyl${Math.floor(100 + Math.random() * 900)}`;
}

function formatStudent(student) {
  return {
    id: student.id,
    fullName: student.full_name,
    grade: student.grade,
    class: `Класс ${student.grade}`,
    language: student.language.toUpperCase(),
    username: student.username,
    password: student.plain_password ?? '',
    createdAt: student.created_at,
  };
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

async function ensureUniqueUsername(baseUsername) {
  const safeBase = toSafeUsernamePart(baseUsername).slice(0, 30) || 'student';
  const { data, error } = await supabase
    .from('students')
    .select('username')
    .ilike('username', `${safeBase}%`);

  if (error) {
    throw error;
  }

  const existing = new Set((data || []).map((item) => String(item.username || '').toLowerCase()));
  if (!existing.has(safeBase.toLowerCase())) {
    return safeBase;
  }

  let index = 1;
  let candidate = `${safeBase}${index}`;
  while (existing.has(candidate.toLowerCase())) {
    index += 1;
    candidate = `${safeBase}${index}`;
  }

  return candidate;
}

function buildQuestionTableName(subject, language, grade) {
  return `questions_${subject}_${language}_${grade}`;
}

function buildResultTableNames() {
  const tables = [];
  for (const type of TEST_TYPES) {
    for (const language of LANGUAGES) {
      for (const grade of STUDENT_GRADES) {
        tables.push(`results_${type}_${language}_${grade}`);
      }
    }
  }
  return tables;
}

const QUESTION_TABLES = SUBJECTS.flatMap((subject) =>
  LANGUAGES.flatMap((language) =>
    QUESTION_GRADES.map((grade) => buildQuestionTableName(subject, language, grade)),
  ),
);
const RESULT_TABLES = buildResultTableNames();

const requireAdmin = (req, res, next) => {
  try {
    const token = parseBearerToken(req.headers.authorization);
    const payload = verifyAdminToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.admin = payload;
    return next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({ error: 'Failed to verify admin token' });
  }
};

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const normalizedUsername = String(username).trim();
  const normalizedPassword = String(password);
  const fallbackUsername = process.env.ADMIN_USERNAME || 'admin';
  const fallbackPassword = process.env.ADMIN_PASSWORD || 'admin';

  let isValid = false;
  let adminIdentity = normalizedUsername;

  let adminUser = null;
  let adminTableError = null;
  try {
    const response = await supabase
      .from('admin_users')
      .select('id, username, password_hash, plain_password')
      .eq('username', normalizedUsername)
      .maybeSingle();

    adminUser = response.data;
    adminTableError = response.error;
  } catch (error) {
    adminTableError = error;
  }

  if (!adminTableError && adminUser) {
    const candidateHash = hashPassword(normalizedPassword);
    const hashMatches = adminUser.password_hash && adminUser.password_hash === candidateHash;
    const plainMatches = adminUser.plain_password && adminUser.plain_password === normalizedPassword;
    isValid = Boolean(hashMatches || plainMatches);
    adminIdentity = adminUser.username;
  }

  if (!isValid) {
    isValid = normalizedUsername === fallbackUsername && normalizedPassword === fallbackPassword;
  }

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signAdminToken({
    sub: adminIdentity,
    username: adminIdentity,
  });

  return res.json({
    token,
    admin: {
      username: adminIdentity,
    },
  });
});

router.get('/students', requireAdmin, async (req, res) => {
  try {
    const search = String(req.query.search || '').trim().replace(/,/g, ' ');
    const queryGrade = req.query.grade;
    const queryLanguage = req.query.language;

    let query = supabase
      .from('students')
      .select('id, full_name, grade, language, username, plain_password, created_at')
      .order('created_at', { ascending: false });

    if (queryGrade !== undefined && queryGrade !== '') {
      const grade = parseGrade(queryGrade);
      if (!grade || !STUDENT_GRADES.includes(grade)) {
        return res.status(400).json({ error: 'Invalid grade' });
      }
      query = query.eq('grade', grade);
    }

    if (queryLanguage !== undefined && queryLanguage !== '') {
      const language = normalizeLanguage(queryLanguage);
      if (!LANGUAGES.includes(language)) {
        return res.status(400).json({ error: 'Invalid language' });
      }
      query = query.ilike('language', language);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to fetch students:', error);
      return res.status(500).json({ error: 'Failed to fetch students' });
    }

    return res.json({
      students: (data || []).map(formatStudent),
    });
  } catch (error) {
    console.error('Get students error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/students', requireAdmin, async (req, res) => {
  try {
    const {
      fullName,
      grade: rawGrade,
      language: rawLanguage,
      username: rawUsername,
      password: rawPassword,
    } = req.body || {};

    const fullNameNormalized = String(fullName || '').trim();
    const grade = parseGrade(rawGrade);
    const language = normalizeLanguage(rawLanguage);

    if (!fullNameNormalized) {
      return res.status(400).json({ error: 'fullName is required' });
    }
    if (!grade || !STUDENT_GRADES.includes(grade)) {
      return res.status(400).json({ error: 'grade must be 6 or 7' });
    }
    if (!LANGUAGES.includes(language)) {
      return res.status(400).json({ error: 'language must be ru or kg' });
    }

    const candidateBaseUsername = rawUsername
      ? toSafeUsernamePart(rawUsername)
      : generateBaseUsername(fullNameNormalized);
    const username = await ensureUniqueUsername(candidateBaseUsername);
    const password = String(rawPassword || generatePassword());

    const { data, error } = await supabase
      .from('students')
      .insert({
        full_name: fullNameNormalized,
        grade,
        language: toDbLanguage(language),
        username,
        password_hash: hashPassword(password),
        plain_password: password,
      })
      .select('id, full_name, grade, language, username, plain_password, created_at')
      .single();

    if (error) {
      console.error('Create student failed:', error);
      return res.status(500).json({ error: 'Failed to create student' });
    }

    return res.status(201).json({
      student: formatStudent(data),
    });
  } catch (error) {
    console.error('Create student error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/students/:id', requireAdmin, async (req, res) => {
  try {
    const studentId = String(req.params.id || '').trim();
    const {
      fullName,
      grade: rawGrade,
      language: rawLanguage,
      username: rawUsername,
      password: rawPassword,
    } = req.body || {};

    const updates = {};

    if (fullName !== undefined) {
      const fullNameNormalized = String(fullName || '').trim();
      if (!fullNameNormalized) {
        return res.status(400).json({ error: 'fullName cannot be empty' });
      }
      updates.full_name = fullNameNormalized;
    }

    if (rawGrade !== undefined) {
      const grade = parseGrade(rawGrade);
      if (!grade || !STUDENT_GRADES.includes(grade)) {
        return res.status(400).json({ error: 'grade must be 6 or 7' });
      }
      updates.grade = grade;
    }

    if (rawLanguage !== undefined) {
      const language = normalizeLanguage(rawLanguage);
      if (!LANGUAGES.includes(language)) {
        return res.status(400).json({ error: 'language must be ru or kg' });
      }
      updates.language = toDbLanguage(language);
    }

    if (rawUsername !== undefined) {
      const username = toSafeUsernamePart(rawUsername);
      if (!username) {
        return res.status(400).json({ error: 'username cannot be empty' });
      }

      const { data: duplicate, error: duplicateError } = await supabase
        .from('students')
        .select('id')
        .eq('username', username)
        .neq('id', studentId)
        .limit(1)
        .maybeSingle();

      if (duplicateError) {
        console.error('Check duplicate username failed:', duplicateError);
        return res.status(500).json({ error: 'Failed to validate username' });
      }

      if (duplicate) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      updates.username = username;
    }

    if (rawPassword !== undefined) {
      const password = String(rawPassword || '').trim();
      if (!password) {
        return res.status(400).json({ error: 'password cannot be empty' });
      }

      updates.plain_password = password;
      updates.password_hash = hashPassword(password);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', studentId)
      .select('id, full_name, grade, language, username, plain_password, created_at')
      .single();

    if (error) {
      console.error('Update student failed:', error);
      return res.status(500).json({ error: 'Failed to update student' });
    }

    return res.json({
      student: formatStudent(data),
    });
  } catch (error) {
    console.error('Update student error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/students/:id', requireAdmin, async (req, res) => {
  try {
    const studentId = String(req.params.id || '').trim();
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) {
      console.error('Delete student failed:', error);
      return res.status(500).json({ error: 'Failed to delete student' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Delete student error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const studentsCountPromise = supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    const questionCountPromises = QUESTION_TABLES.map((table) =>
      supabase.from(table).select('*', { count: 'exact', head: true }),
    );
    const resultCountPromises = RESULT_TABLES.map((table) =>
      supabase.from(table).select('*', { count: 'exact', head: true }),
    );
    const scorePromises = RESULT_TABLES.map((table) =>
      supabase.from(table).select('total_score'),
    );

    const [studentsCountResult, questionResults, resultResults, scoreResults] = await Promise.all([
      studentsCountPromise,
      Promise.all(questionCountPromises),
      Promise.all(resultCountPromises),
      Promise.all(scorePromises),
    ]);

    const studentsTotal = studentsCountResult.count || 0;
    const questionsTotal = questionResults.reduce((sum, result) => sum + (result.count || 0), 0);
    const testsCompleted = resultResults.reduce((sum, result) => sum + (result.count || 0), 0);

    let scoreSum = 0;
    let scoreCount = 0;
    for (const scoreResult of scoreResults) {
      if (!scoreResult.error && Array.isArray(scoreResult.data)) {
        for (const row of scoreResult.data) {
          if (typeof row.total_score === 'number') {
            scoreSum += row.total_score;
            scoreCount += 1;
          }
        }
      }
    }

    const averageScore = scoreCount > 0 ? Number((scoreSum / scoreCount).toFixed(2)) : 0;

    return res.json({
      studentsTotal,
      questionsTotal,
      testsCompleted,
      averageScore,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

router.get('/content-readiness', requireAdmin, async (req, res) => {
  try {
    const countsByTable = await loadQuestionCounts(supabase);
    return res.json({
      branches: buildContentReadiness(countsByTable),
    });
  } catch (error) {
    console.error('Content readiness error:', error);
    return res.status(500).json({ error: 'Failed to fetch content readiness' });
  }
});

router.post('/upload-image', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload directly using Supabase client
    const { data, error } = await supabase.storage
      .from('question-images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    const { data: publicData } = supabase.storage
      .from('question-images')
      .getPublicUrl(fileName);

    return res.status(200).json({ imageUrl: publicData.publicUrl });
  } catch (error) {
    console.error('Upload image error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/questions', requireAdmin, async (req, res) => {
  try {
    const { subject, language: rawLanguage, grade: rawGrade, questionText, options, topic, explanation, imageUrl } = req.body || {};
    const language = normalizeLanguage(rawLanguage);
    const grade = parseGrade(rawGrade);
    const normalizedSubject = String(subject || '').trim().toLowerCase();
    const normalizedText = String(questionText || '').trim();
    const normalizedTopic = String(topic || '').trim();
    const normalizedExplanation = String(explanation || '').trim();
    const normalizedImageUrl = String(imageUrl || '').trim();
    const questionOptions = Array.isArray(options) ? options : [];

    if (!SUBJECTS.includes(normalizedSubject)) {
      return res.status(400).json({ error: 'Invalid subject' });
    }
    if (!LANGUAGES.includes(language)) {
      return res.status(400).json({ error: 'Invalid language' });
    }
    if (!grade || !QUESTION_GRADES.includes(grade)) {
      return res.status(400).json({ error: 'Invalid grade' });
    }
    if (!normalizedText) {
      return res.status(400).json({ error: 'Question text is required' });
    }
    if (questionOptions.length < 2) {
      return res.status(400).json({ error: 'At least two options are required' });
    }

    const validOptions = questionOptions.map((option) => ({
      text: String(option?.text || '').trim(),
      is_correct: Boolean(option?.is_correct),
    }));

    if (validOptions.some((option) => !option.text)) {
      return res.status(400).json({ error: 'All options must have text' });
    }

    const correctAnswersCount = validOptions.filter((option) => option.is_correct).length;
    if (correctAnswersCount !== 1) {
      return res.status(400).json({ error: 'Exactly one option must be marked as correct' });
    }

    const tableName = buildQuestionTableName(normalizedSubject, language, grade);
    const { data, error } = await supabase
      .from(tableName)
      .insert({
        question_text: normalizedText,
        options: validOptions,
        topic: normalizedTopic,
        explanation: normalizedExplanation,
        image_url: normalizedImageUrl,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert question error:', error);
      return res.status(500).json({ error: 'Failed to insert question into database' });
    }

    return res.status(201).json({
      message: 'Question added successfully',
      question: data,
    });
  } catch (error) {
    console.error('Add question error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── GET questions (list with filters) ───────────────────────────────────────
router.get('/questions', requireAdmin, async (req, res) => {
  try {
    const subject = String(req.query.subject || '').trim().toLowerCase();
    const language = normalizeLanguage(req.query.language);
    const grade = parseGrade(req.query.grade);
    if (!SUBJECTS.includes(subject)) return res.status(400).json({ error: 'Invalid subject' });
    if (!LANGUAGES.includes(language)) return res.status(400).json({ error: 'Invalid language' });
    if (!grade || !QUESTION_GRADES.includes(grade)) return res.status(400).json({ error: 'Invalid grade' });
    const tableName = buildQuestionTableName(subject, language, grade);
    const { data, error } = await supabase.from(tableName)
      .select('id, question_text, options, topic, explanation, image_url, created_at')
      .order('created_at', { ascending: false });
    if (error) { console.error('Fetch questions error:', error); return res.status(500).json({ error: 'Failed to fetch questions' }); }
    return res.json({ questions: data || [], table: tableName, total: (data || []).length });
  } catch (error) { console.error('Get questions error:', error); return res.status(500).json({ error: 'Internal server error' }); }
});

// ─── PATCH question (edit) ──────────────────────────────────────────────────
router.patch('/questions/:id', requireAdmin, async (req, res) => {
  try {
    const questionId = String(req.params.id || '').trim();
    const { subject, language: rawLanguage, grade: rawGrade, questionText, options, topic, explanation, imageUrl } = req.body || {};
    const language = normalizeLanguage(rawLanguage);
    const grade = parseGrade(rawGrade);
    const normalizedSubject = String(subject || '').trim().toLowerCase();
    if (!SUBJECTS.includes(normalizedSubject)) return res.status(400).json({ error: 'Invalid subject' });
    if (!LANGUAGES.includes(language)) return res.status(400).json({ error: 'Invalid language' });
    if (!grade || !QUESTION_GRADES.includes(grade)) return res.status(400).json({ error: 'Invalid grade' });
    const tableName = buildQuestionTableName(normalizedSubject, language, grade);
    const updates = {};
    if (questionText !== undefined) {
      const text = String(questionText || '').trim();
      if (!text) return res.status(400).json({ error: 'Question text cannot be empty' });
      updates.question_text = text;
    }
    if (options !== undefined) {
      const qOpts = Array.isArray(options) ? options : [];
      if (qOpts.length < 2) return res.status(400).json({ error: 'At least two options required' });
      const valid = qOpts.map((o) => ({ text: String(o?.text || '').trim(), is_correct: Boolean(o?.is_correct) }));
      if (valid.some((o) => !o.text)) return res.status(400).json({ error: 'All options must have text' });
      if (valid.filter((o) => o.is_correct).length !== 1) return res.status(400).json({ error: 'Exactly one correct option required' });
      updates.options = valid;
    }
    if (topic !== undefined) updates.topic = String(topic || '').trim();
    if (explanation !== undefined) updates.explanation = String(explanation || '').trim();
    if (imageUrl !== undefined) updates.image_url = String(imageUrl || '').trim();
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updates provided' });
    const { data, error } = await supabase.from(tableName).update(updates).eq('id', questionId)
      .select('id, question_text, options, topic, explanation, image_url, created_at').single();
    if (error) { console.error('Update question error:', error); return res.status(500).json({ error: 'Failed to update question' }); }
    return res.json({ question: data });
  } catch (error) { console.error('Patch question error:', error); return res.status(500).json({ error: 'Internal server error' }); }
});

// ─── DELETE question ────────────────────────────────────────────────────────
router.delete('/questions/:id', requireAdmin, async (req, res) => {
  try {
    const questionId = String(req.params.id || '').trim();
    const subject = String(req.query.subject || '').trim().toLowerCase();
    const language = normalizeLanguage(req.query.language);
    const grade = parseGrade(req.query.grade);
    if (!SUBJECTS.includes(subject)) return res.status(400).json({ error: 'Invalid subject' });
    if (!LANGUAGES.includes(language)) return res.status(400).json({ error: 'Invalid language' });
    if (!grade || !QUESTION_GRADES.includes(grade)) return res.status(400).json({ error: 'Invalid grade' });
    const tableName = buildQuestionTableName(subject, language, grade);
    const { error } = await supabase.from(tableName).delete().eq('id', questionId);
    if (error) { console.error('Delete question error:', error); return res.status(500).json({ error: 'Failed to delete question' }); }
    return res.status(204).send();
  } catch (error) { console.error('Delete question error:', error); return res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
