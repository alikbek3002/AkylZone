const SUBJECTS = ['history', 'english', 'russian', 'kyrgyz', 'math', 'logic'];
const LANGUAGES = ['ru', 'kg'];
const QUESTION_GRADES = [5, 6, 7];
const STUDENT_GRADES = [6, 7];
const MAIN_QUESTIONS_PER_GRADE = 125;
const TEST_TYPES = ['MAIN', 'TRIAL'];

const SUBJECT_META = {
  history: { ru: 'История', kg: 'Тарых' },
  english: { ru: 'Английский язык', kg: 'Англис тили' },
  russian: { ru: 'Русский язык', kg: 'Орус тили' },
  kyrgyz: { ru: 'Кыргызский язык', kg: 'Кыргыз тили' },
  math: { ru: 'Математика', kg: 'Математика' },
  logic: { ru: 'Логика', kg: 'Логика' },
};

const TRIAL_STRUCTURE = {
  1: {
    title: {
      ru: '1-2 тур (80 вопросов)',
      kg: '1-2 тур суроолору (80 суроо)',
    },
    subjects: [
      { id: 'math', total: 25, prev: 12, curr: 13 },
      { id: 'logic', total: 15, prev: 7, curr: 8 },
      { id: 'kyrgyz', total: 15, prev: 7, curr: 8 },
      { id: 'russian', total: 15, prev: 7, curr: 8 },
      { id: 'history', total: 10, prev: 5, curr: 5 },
    ],
  },
  3: {
    title: {
      ru: '3 тур (80 вопросов)',
      kg: '3 тур суроолору (80 суроо)',
    },
    subjects: [
      { id: 'math', total: 25, prev: 12, curr: 13 },
      { id: 'logic', total: 15, prev: 7, curr: 8 },
      { id: 'kyrgyz', total: 20, prev: 10, curr: 10 },
      { id: 'english', total: 20, prev: 10, curr: 10 },
    ],
  },
};

function normalizeLanguage(language) {
  return String(language || '').trim().toLowerCase();
}

function localizeText(language, ruText, kgText) {
  return normalizeLanguage(language) === 'kg' ? kgText : ruText;
}

function getSubjectName(subjectId, language) {
  return SUBJECT_META[subjectId]?.[normalizeLanguage(language)] || subjectId;
}

function getBranchTitle(language) {
  return localizeText(language, 'Русский класс', 'Кыргызский класс');
}

function getTestTypeTitle(type, language) {
  if (String(type || '').toUpperCase() === 'TRIAL') {
    return 'Пробный тест';
  }

  return localizeText(language, 'Предметный тест', 'Предметтик тест');
}

function buildQuestionTableName(subject, language, grade) {
  return `questions_${subject}_${normalizeLanguage(language)}_${grade}`;
}

function buildResultTableName(type, language, grade) {
  return `results_${String(type || '').toLowerCase()}_${normalizeLanguage(language)}_${grade}`;
}

function getMainGradeLineLabel(language, grade, requiredCount) {
  return localizeText(
    language,
    `${grade} класс → ${requiredCount} вопросов`,
    `${grade} класс → ${requiredCount} суроо`,
  );
}

function getTrialGradeLineLabel(language, grade, requiredCount) {
  return localizeText(
    language,
    `${grade} класс → ${requiredCount} вопросов`,
    `${grade} класстан → ${requiredCount} суроо`,
  );
}

function getTrialSubjectLabel(language, subjectId, totalCount) {
  return localizeText(
    language,
    `${getSubjectName(subjectId, language)} — ${totalCount} вопросов`,
    `${getSubjectName(subjectId, language)} — ${totalCount} суроо`,
  );
}

function getCountKey(subject, language, grade) {
  return buildQuestionTableName(subject, language, grade);
}

async function loadQuestionCounts(supabase) {
  const tableNames = SUBJECTS.flatMap((subject) =>
    LANGUAGES.flatMap((language) =>
      QUESTION_GRADES.map((grade) => buildQuestionTableName(subject, language, grade)),
    ),
  );

  const results = await Promise.all(
    tableNames.map(async (tableName) => {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      return [tableName, count || 0];
    }),
  );

  return Object.fromEntries(results);
}

function buildMainSubjects(grade, language, countsByTable) {
  const prevGrade = grade - 1;

  return SUBJECTS.map((subjectId) => {
    const prevAvailable = countsByTable[getCountKey(subjectId, language, prevGrade)] || 0;
    const currentAvailable = countsByTable[getCountKey(subjectId, language, grade)] || 0;
    const lines = [
      {
        grade: prevGrade,
        required: MAIN_QUESTIONS_PER_GRADE,
        available: prevAvailable,
        label: getMainGradeLineLabel(language, prevGrade, MAIN_QUESTIONS_PER_GRADE),
      },
      {
        grade,
        required: MAIN_QUESTIONS_PER_GRADE,
        available: currentAvailable,
        label: getMainGradeLineLabel(language, grade, MAIN_QUESTIONS_PER_GRADE),
      },
    ];
    const status = lines.every((line) => line.available >= line.required) ? 'ready' : 'locked';

    return {
      id: subjectId,
      title: getSubjectName(subjectId, language),
      required_total: MAIN_QUESTIONS_PER_GRADE * 2,
      available_total: prevAvailable + currentAvailable,
      status,
      lines,
    };
  });
}

function buildTrialRounds(grade, language, countsByTable) {
  const prevGrade = grade - 1;

  return Object.entries(TRIAL_STRUCTURE).map(([roundKey, config]) => {
    const subjects = config.subjects.map((subjectConfig) => {
      const prevAvailable = countsByTable[getCountKey(subjectConfig.id, language, prevGrade)] || 0;
      const currentAvailable = countsByTable[getCountKey(subjectConfig.id, language, grade)] || 0;
      const lines = [
        {
          grade: prevGrade,
          required: subjectConfig.prev,
          available: prevAvailable,
          label: getTrialGradeLineLabel(language, prevGrade, subjectConfig.prev),
        },
        {
          grade,
          required: subjectConfig.curr,
          available: currentAvailable,
          label: getTrialGradeLineLabel(language, grade, subjectConfig.curr),
        },
      ];
      const status = lines.every((line) => line.available >= line.required) ? 'ready' : 'locked';

      return {
        id: subjectConfig.id,
        title: getTrialSubjectLabel(language, subjectConfig.id, subjectConfig.total),
        display_name: getSubjectName(subjectConfig.id, language),
        required_total: subjectConfig.total,
        available_total: prevAvailable + currentAvailable,
        status,
        lines,
      };
    });

    return {
      id: Number(roundKey),
      title: config.title[normalizeLanguage(language)],
      required_total: subjects.reduce((sum, subject) => sum + subject.required_total, 0),
      available_total: subjects.reduce(
        (sum, subject) => sum + Math.min(subject.available_total, subject.required_total),
        0,
      ),
      status: subjects.every((subject) => subject.status === 'ready') ? 'ready' : 'locked',
      subjects,
    };
  });
}

function buildStudentCatalog(student, countsByTable) {
  const grade = Number(student.grade);
  const language = normalizeLanguage(student.language);
  const mainSubjects = buildMainSubjects(grade, language, countsByTable);
  const trialRounds = buildTrialRounds(grade, language, countsByTable);

  return {
    student: {
      id: student.id,
      fullName: student.full_name || student.fullName || '',
      grade,
      language,
      username: student.username || '',
    },
    branch: {
      grade,
      language,
      title: `${grade} класс / ${getBranchTitle(language)}`,
      class_title: `${grade} класс`,
      language_title: getBranchTitle(language),
    },
    test_types: [
      {
        id: 'MAIN',
        title: getTestTypeTitle('MAIN', language),
        status: mainSubjects.some((subject) => subject.status === 'ready') ? 'ready' : 'locked',
        items: mainSubjects,
      },
      {
        id: 'TRIAL',
        title: getTestTypeTitle('TRIAL', language),
        status: trialRounds.some((round) => round.status === 'ready') ? 'ready' : 'locked',
        rounds: trialRounds,
      },
    ],
  };
}

function buildContentReadiness(countsByTable) {
  return STUDENT_GRADES.flatMap((grade) =>
    LANGUAGES.map((language) =>
      buildStudentCatalog(
        {
          id: `${grade}-${language}`,
          full_name: '',
          grade,
          language,
          username: '',
        },
        countsByTable,
      ),
    ),
  );
}

module.exports = {
  SUBJECTS,
  LANGUAGES,
  QUESTION_GRADES,
  STUDENT_GRADES,
  MAIN_QUESTIONS_PER_GRADE,
  TEST_TYPES,
  TRIAL_STRUCTURE,
  normalizeLanguage,
  localizeText,
  getSubjectName,
  getBranchTitle,
  getTestTypeTitle,
  buildQuestionTableName,
  buildResultTableName,
  loadQuestionCounts,
  buildMainSubjects,
  buildTrialRounds,
  buildStudentCatalog,
  buildContentReadiness,
};
