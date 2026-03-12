const SUBJECTS = ['history', 'english', 'russian', 'kyrgyz', 'mathlogic'];
const LANGUAGES = ['ru', 'kg'];
const QUESTION_GRADES = [5, 6, 7];
const MATHLOGIC_GRADES = [6, 7];
const STUDENT_GRADES = [6, 7];
const MAIN_QUESTIONS_PER_GRADE = 125;
const TEST_TYPES = ['MAIN', 'TRIAL'];

const SUBJECT_META = {
  history: { ru: 'История', kg: 'Тарых' },
  english: { ru: 'Английский язык', kg: 'Англис тили' },
  russian: { ru: 'Русский язык', kg: 'Орус тили' },
  kyrgyz: { ru: 'Кыргызский язык', kg: 'Кыргыз тили' },
  mathlogic: { ru: 'Математика и Логика', kg: 'Математика жана Логика' },
};

// For trial tests we still display math and logic separately in the UI,
// but they come from the same unified mathlogic table filtered by question_type.
const MATH_LOGIC_META = {
  math: { ru: 'Математика', kg: 'Математика' },
  logic: { ru: 'Логика', kg: 'Логика' },
};

// Trial structure uses virtual subjects 'math' and 'logic' that map to the mathlogic table.
// For grade 6: all questions from grade 6 only (prev=0, curr=all)
// For grade 7: mix of grade 6 and 7 (prev + curr)
function getTrialStructure(studentGrade) {
  if (studentGrade === 6) {
    return {
      1: {
        title: {
          ru: '1-2 тур (80 вопросов)',
          kg: '1-2 тур суроолору (80 суроо)',
        },
        subjects: [
          { id: 'math', table: 'mathlogic', questionType: 'math', total: 25, prev: 0, curr: 25 },
          { id: 'logic', table: 'mathlogic', questionType: 'logic', total: 15, prev: 0, curr: 15 },
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
          { id: 'math', table: 'mathlogic', questionType: 'math', total: 25, prev: 0, curr: 25 },
          { id: 'logic', table: 'mathlogic', questionType: 'logic', total: 15, prev: 0, curr: 15 },
          { id: 'kyrgyz', total: 20, prev: 10, curr: 10 },
          { id: 'english', total: 20, prev: 10, curr: 10 },
        ],
      },
    };
  }

  // Grade 7: mix of 6 and 7
  return {
    1: {
      title: {
        ru: '1-2 тур (80 вопросов)',
        kg: '1-2 тур суроолору (80 суроо)',
      },
      subjects: [
        { id: 'math', table: 'mathlogic', questionType: 'math', total: 25, prev: 12, curr: 13 },
        { id: 'logic', table: 'mathlogic', questionType: 'logic', total: 15, prev: 7, curr: 8 },
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
        { id: 'math', table: 'mathlogic', questionType: 'math', total: 25, prev: 12, curr: 13 },
        { id: 'logic', table: 'mathlogic', questionType: 'logic', total: 15, prev: 7, curr: 8 },
        { id: 'kyrgyz', total: 20, prev: 10, curr: 10 },
        { id: 'english', total: 20, prev: 10, curr: 10 },
      ],
    },
  };
}

function normalizeLanguage(language) {
  return String(language || '').trim().toLowerCase();
}

function localizeText(language, ruText, kgText) {
  return normalizeLanguage(language) === 'kg' ? kgText : ruText;
}

function getSubjectName(subjectId, language) {
  // Handle virtual trial subjects math/logic
  if (MATH_LOGIC_META[subjectId]) {
    return MATH_LOGIC_META[subjectId][normalizeLanguage(language)] || subjectId;
  }
  return SUBJECT_META[subjectId]?.[normalizeLanguage(language)] || subjectId;
}

function getBranchTitle(language) {
  return localizeText(language, 'Русский класс', 'Кыргызский класс');
}

function getTestTypeTitle(type, language) {
  if (String(type || '').toUpperCase() === 'TRIAL') {
    return localizeText(language, 'Сынамык тест', 'Сынамык тест');
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

// Returns counts for all question tables, including mathlogic split by question_type
async function loadQuestionCounts(supabase) {
  // Regular subjects (non-mathlogic)
  const regularSubjects = ['history', 'english', 'russian', 'kyrgyz'];
  const regularTableNames = regularSubjects.flatMap((subject) =>
    LANGUAGES.flatMap((language) =>
      QUESTION_GRADES.map((grade) => buildQuestionTableName(subject, language, grade)),
    ),
  );

  // Mathlogic tables (only grades 6, 7)
  const mathlogicTableNames = LANGUAGES.flatMap((language) =>
    MATHLOGIC_GRADES.map((grade) => buildQuestionTableName('mathlogic', language, grade)),
  );

  const allTableNames = [...regularTableNames, ...mathlogicTableNames];

  const results = await Promise.all(
    allTableNames.map(async (tableName) => {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        // Table might not exist yet, treat as 0
        console.warn(`Warning: could not count table ${tableName}:`, error.message);
        return [tableName, 0];
      }

      return [tableName, count || 0];
    }),
  );

  const countsByTable = Object.fromEntries(results);

  // Also load math/logic type counts from mathlogic tables
  for (const language of LANGUAGES) {
    for (const grade of MATHLOGIC_GRADES) {
      const tableName = buildQuestionTableName('mathlogic', language, grade);
      for (const qType of ['math', 'logic']) {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .eq('question_type', qType);

        const key = `${tableName}__${qType}`;
        countsByTable[key] = error ? 0 : (count || 0);
      }
    }
  }

  return countsByTable;
}

// Get count for a mathlogic table filtered by question_type
function getMathLogicCount(countsByTable, language, grade, questionType) {
  const tableName = buildQuestionTableName('mathlogic', language, grade);
  return countsByTable[`${tableName}__${questionType}`] || 0;
}

function buildMainSubjects(grade, language, countsByTable) {
  const prevGrade = grade - 1;
  const regularSubjects = ['history', 'english', 'russian', 'kyrgyz'];

  const items = [];

  // Regular subjects: same as before with prev+curr grades
  for (const subjectId of regularSubjects) {
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

    items.push({
      id: subjectId,
      title: getSubjectName(subjectId, language),
      required_total: MAIN_QUESTIONS_PER_GRADE * 2,
      available_total: prevAvailable + currentAvailable,
      status,
      lines,
    });
  }

  // Mathlogic: show as two separate items (math & logic) for the student UI
  // Grade 6: only grade 6 questions
  // Grade 7: grades 6 + 7
  for (const qType of ['math', 'logic']) {
    if (grade === 6) {
      // Only current grade (6)
      const currentAvailable = getMathLogicCount(countsByTable, language, grade, qType);
      const lines = [
        {
          grade,
          required: MAIN_QUESTIONS_PER_GRADE,
          available: currentAvailable,
          label: getMainGradeLineLabel(language, grade, MAIN_QUESTIONS_PER_GRADE),
        },
      ];
      const status = lines.every((line) => line.available >= line.required) ? 'ready' : 'locked';

      items.push({
        id: qType,
        title: getSubjectName(qType, language),
        subject_table: 'mathlogic',
        question_type: qType,
        required_total: MAIN_QUESTIONS_PER_GRADE,
        available_total: currentAvailable,
        status,
        lines,
      });
    } else {
      // Grade 7: prev (6) + curr (7)
      const prevAvailable = getMathLogicCount(countsByTable, language, prevGrade, qType);
      const currentAvailable = getMathLogicCount(countsByTable, language, grade, qType);
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

      items.push({
        id: qType,
        title: getSubjectName(qType, language),
        subject_table: 'mathlogic',
        question_type: qType,
        required_total: MAIN_QUESTIONS_PER_GRADE * 2,
        available_total: prevAvailable + currentAvailable,
        status,
        lines,
      });
    }
  }

  return items;
}

function buildTrialRounds(grade, language, countsByTable) {
  const prevGrade = grade - 1;
  const trialStructure = getTrialStructure(grade);

  return Object.entries(trialStructure).map(([roundKey, config]) => {
    const subjects = config.subjects.map((subjectConfig) => {
      let lines;

      if (subjectConfig.table === 'mathlogic') {
        // Math/logic from the unified mathlogic table
        if (subjectConfig.prev === 0) {
          // Grade 6: all from current grade
          const currentAvailable = getMathLogicCount(countsByTable, language, grade, subjectConfig.questionType);
          lines = [
            {
              grade,
              required: subjectConfig.curr,
              available: currentAvailable,
              label: getTrialGradeLineLabel(language, grade, subjectConfig.curr),
            },
          ];
        } else {
          // Grade 7: mix of prev + current
          const prevAvailable = getMathLogicCount(countsByTable, language, prevGrade, subjectConfig.questionType);
          const currentAvailable = getMathLogicCount(countsByTable, language, grade, subjectConfig.questionType);
          lines = [
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
        }
      } else {
        // Regular subjects
        const prevAvailable = countsByTable[getCountKey(subjectConfig.id, language, prevGrade)] || 0;
        const currentAvailable = countsByTable[getCountKey(subjectConfig.id, language, grade)] || 0;
        lines = [
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
      }

      const status = lines.every((line) => line.available >= line.required) ? 'ready' : 'locked';

      return {
        id: subjectConfig.id,
        title: getTrialSubjectLabel(language, subjectConfig.id, subjectConfig.total),
        display_name: getSubjectName(subjectConfig.id, language),
        required_total: subjectConfig.total,
        available_total: lines.reduce((sum, line) => sum + Math.min(line.available, line.required), 0),
        status,
        lines,
        // Pass through extra info for test generation
        ...(subjectConfig.table ? { subject_table: subjectConfig.table, question_type: subjectConfig.questionType } : {}),
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
  MATHLOGIC_GRADES,
  STUDENT_GRADES,
  MAIN_QUESTIONS_PER_GRADE,
  TEST_TYPES,
  MATH_LOGIC_META,
  normalizeLanguage,
  localizeText,
  getSubjectName,
  getBranchTitle,
  getTestTypeTitle,
  buildQuestionTableName,
  buildResultTableName,
  getTrialStructure,
  getMathLogicCount,
  loadQuestionCounts,
  buildMainSubjects,
  buildTrialRounds,
  buildStudentCatalog,
  buildContentReadiness,
};
