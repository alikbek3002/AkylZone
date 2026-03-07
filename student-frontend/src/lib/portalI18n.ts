import type { StudentAuthUser } from './api';

export type PortalLanguage = StudentAuthUser['language'];

export interface PortalCopy {
  secureLogin: string;
  individualAccess: string;
  portalTitle: string;
  loginDescription: string;
  loginFormatLabel: string;
  loginFormatValue: string;
  loginDeviceLabel: string;
  loginDeviceValue: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  passwordLabel: string;
  signIn: string;
  signingIn: string;
  loginHint: string;
  personalAccount: string;
  welcome: (name: string) => string;
  studentFallback: string;
  dashboardDescription: string;
  logout: string;
  gradeLabel: string;
  gradeValue: (grade: number) => string;
  languageLabel: string;
  languageName: (language: PortalLanguage) => string;
  subjectsLabel: string;
  formatsLabel: string;
  availableTests: string;
  chooseTestFormat: string;
  mainProgramSummary: (fromGrade: number, toGrade: number) => string;
  chooseAvailableFormat: string;
  loadingAvailableTests: string;
  mainTestDescription: string;
  trialTestDescription: string;
  startTestCta: string;
  subjectTest: string;
  trialTest: string;
  setup: string;
  reviewParams: string;
  back: string;
  selectSubject: string;
  selectRound: string;
  subjectRequiredError: string;
  programInfo: (fromGrade: number, toGrade: number, totalQuestions: number) => string;
  questionsCountLabel: (count: number) => string;
  preparingTest: string;
  startTesting: string;
  currentQuestionLoadError: string;
  returnHome: string;
  testCompleted: string;
  testCompletedAuto: string;
  reasonLabel: string;
  correctAnswersLabel: (correct: number, total: number) => string;
  answeredLabel: (answered: number) => string;
  scoreLabel: (score: number) => string;
  testBlocked: string;
  autoSubmittingResults: string;
  retrySubmit: string;
  exitWithoutSave: string;
  activeTest: string;
  questionCounter: (current: number, total: number) => string;
  progress: string;
  imageAlt: string;
  answerSaved: string;
  chooseOneAnswer: string;
  nextQuestion: string;
  finishTest: string;
  submitting: string;
  loading: string;
  sessionUnavailable: string;
  fullscreenRequired: string;
  availableParamsError: string;
  autoSubmitError: string;
  generationError: string;
  submitError: string;
  loginError: string;
  antiCheatScreenshot: string;
  antiCheatShortcut: string;
  antiCheatCopyPaste: string;
  antiCheatContextMenu: string;
  antiCheatVisibility: string;
  antiCheatBlur: string;
  antiCheatFullscreenExit: string;
  antiCheatNavigation: string;
}

const portalCopy: Record<PortalLanguage, PortalCopy> = {
  ru: {
    secureLogin: 'Защищенный вход',
    individualAccess: 'Индивидуальный доступ',
    portalTitle: 'Портал ученика',
    loginDescription: 'Войдите по логину и паролю, которые выдал администратор.',
    loginFormatLabel: 'Формат',
    loginFormatValue: 'Персональный доступ',
    loginDeviceLabel: 'Устройство',
    loginDeviceValue: 'Телефон и ПК',
    usernameLabel: 'Логин',
    usernamePlaceholder: 'Введите логин',
    passwordLabel: 'Пароль',
    signIn: 'Войти',
    signingIn: 'Вход...',
    loginHint: 'Используйте только выданные данные. После входа вам сразу откроются доступные тесты по вашему классу и языку.',
    personalAccount: 'Личный кабинет',
    welcome: (name) => `Добро пожаловать, ${name}`,
    studentFallback: 'Ученик',
    dashboardDescription: 'Вам показаны только те тесты, которые доступны по вашему классу и языку обучения.',
    logout: 'Выйти',
    gradeLabel: 'Класс',
    gradeValue: (grade) => `${grade} класс`,
    languageLabel: 'Язык',
    languageName: (language) => (language === 'kg' ? 'Кыргызча' : 'Русский'),
    subjectsLabel: 'Предметы',
    formatsLabel: 'Форматы',
    availableTests: 'Доступные тесты',
    chooseTestFormat: 'Выберите формат тестирования',
    mainProgramSummary: (fromGrade, toGrade) => `Основной тест формируется по ${fromGrade}-${toGrade} классам.`,
    chooseAvailableFormat: 'Выберите один из доступных форматов.',
    loadingAvailableTests: 'Загрузка доступных тестов...',
    mainTestDescription: 'Полный срез знаний по одному предмету с вопросами за два класса.',
    trialTestDescription: 'Случайно собранный тренировочный тест по турам и предметам.',
    startTestCta: 'Начать тест',
    subjectTest: 'Предметный тест',
    trialTest: 'Пробный тест',
    setup: 'Подготовка',
    reviewParams: 'Проверьте параметры и начните тестирование.',
    back: 'Назад',
    selectSubject: 'Выберите предмет',
    selectRound: 'Выберите тур',
    subjectRequiredError: 'Выберите предмет для тестирования',
    programInfo: (fromGrade, toGrade, totalQuestions) => `Программа: ${fromGrade}-${toGrade} класс, всего ${totalQuestions} вопросов`,
    questionsCountLabel: (count) => `${count} вопросов`,
    preparingTest: 'Подготовка теста...',
    startTesting: 'Начать тестирование',
    currentQuestionLoadError: 'Не удалось загрузить текущий вопрос.',
    returnHome: 'Вернуться на главную',
    testCompleted: 'Тест завершен',
    testCompletedAuto: 'Тест завершен автоматически',
    reasonLabel: 'Причина',
    correctAnswersLabel: (correct, total) => `Правильных ответов: ${correct} из ${total}`,
    answeredLabel: (answered) => `Отвечено: ${answered}`,
    scoreLabel: (score) => `Ваш результат: ${score}%`,
    testBlocked: 'Тест заблокирован',
    autoSubmittingResults: 'Результаты автоматически отправляются. Пожалуйста, не закрывайте страницу.',
    retrySubmit: 'Повторить отправку',
    exitWithoutSave: 'Выйти без сохранения',
    activeTest: 'Активный тест',
    questionCounter: (current, total) => `Вопрос ${current} из ${total}`,
    progress: 'Прогресс',
    imageAlt: 'Иллюстрация к вопросу',
    answerSaved: 'Ответ сохранен. Можно переходить дальше.',
    chooseOneAnswer: 'Выберите один вариант ответа.',
    nextQuestion: 'Следующий вопрос',
    finishTest: 'Завершить тест',
    submitting: 'Отправка...',
    loading: 'Загрузка...',
    sessionUnavailable: 'Тестовая сессия недоступна',
    fullscreenRequired: 'Для начала теста необходимо разрешить полноэкранный режим.',
    availableParamsError: 'Ошибка загрузки параметров теста',
    autoSubmitError: 'Ошибка автоматической отправки результатов',
    generationError: 'Ошибка генерации теста',
    submitError: 'Ошибка отправки результатов',
    loginError: 'Ошибка входа',
    antiCheatScreenshot: 'Обнаружена попытка сделать снимок экрана.',
    antiCheatShortcut: 'Обнаружено использование запрещенного сочетания клавиш.',
    antiCheatCopyPaste: 'Обнаружена попытка копирования или вставки во время теста.',
    antiCheatContextMenu: 'Обнаружена попытка открыть контекстное меню.',
    antiCheatVisibility: 'Зафиксировано переключение на другую вкладку или скрытие окна.',
    antiCheatBlur: 'Окно тестирования потеряло фокус.',
    antiCheatFullscreenExit: 'Полноэкранный режим был отключен во время теста.',
    antiCheatNavigation: 'Зафиксирована попытка покинуть тест через навигацию браузера.',
  },
  kg: {
    secureLogin: 'Корголгон кирүү',
    individualAccess: 'Жеке жеткилик',
    portalTitle: 'Окуучу порталы',
    loginDescription: 'Администратор берген логин жана сырсөз менен кириңиз.',
    loginFormatLabel: 'Формат',
    loginFormatValue: 'Жеке жеткилик',
    loginDeviceLabel: 'Түзмөк',
    loginDeviceValue: 'Телефон жана ПК',
    usernameLabel: 'Логин',
    usernamePlaceholder: 'Логинди киргизиңиз',
    passwordLabel: 'Сырсөз',
    signIn: 'Кирүү',
    signingIn: 'Кирип жатат...',
    loginHint: 'Берилген маалыматтарды гана колдонуңуз. Киргенден кийин сизге классыңызга жана тилиңизге ылайык тесттер ачылат.',
    personalAccount: 'Жеке кабинет',
    welcome: (name) => `Кош келиңиз, ${name}`,
    studentFallback: 'Окуучу',
    dashboardDescription: 'Сизге классыңызга жана окуу тилиңизге ылайык гана тесттер көрсөтүлөт.',
    logout: 'Чыгуу',
    gradeLabel: 'Класс',
    gradeValue: (grade) => `${grade}-класс`,
    languageLabel: 'Тил',
    languageName: (language) => (language === 'kg' ? 'Кыргызча' : 'Орусча'),
    subjectsLabel: 'Предметтер',
    formatsLabel: 'Форматтар',
    availableTests: 'Жеткиликтүү тесттер',
    chooseTestFormat: 'Тест форматын тандаңыз',
    mainProgramSummary: (fromGrade, toGrade) => `Негизги тест ${fromGrade}-${toGrade}-класстардын программасы боюнча түзүлөт.`,
    chooseAvailableFormat: 'Жеткиликтүү форматтардын бирин тандаңыз.',
    loadingAvailableTests: 'Жеткиликтүү тесттер жүктөлүүдө...',
    mainTestDescription: 'Бир предмет боюнча эки класстын суроолорун камтыган толук тест.',
    trialTestDescription: 'Турлар жана предметтер боюнча туш келди чогултулган машыгуу тести.',
    startTestCta: 'Тестти баштоо',
    subjectTest: 'Предметтик тест',
    trialTest: 'Сыноо тест',
    setup: 'Даярдык',
    reviewParams: 'Параметрлерди текшерип, тестти баштаңыз.',
    back: 'Артка',
    selectSubject: 'Предметти тандаңыз',
    selectRound: 'Турду тандаңыз',
    subjectRequiredError: 'Тест үчүн предметти тандаңыз',
    programInfo: (fromGrade, toGrade, totalQuestions) => `Программа: ${fromGrade}-${toGrade}-класс, жалпысынан ${totalQuestions} суроо`,
    questionsCountLabel: (count) => `${count} суроо`,
    preparingTest: 'Тест даярдалып жатат...',
    startTesting: 'Тестти баштоо',
    currentQuestionLoadError: 'Учурдагы суроону жүктөө мүмкүн болгон жок.',
    returnHome: 'Башкы бетке кайтуу',
    testCompleted: 'Тест аяктады',
    testCompletedAuto: 'Тест автоматтык түрдө аяктады',
    reasonLabel: 'Себеби',
    correctAnswersLabel: (correct, total) => `Туура жооптор: ${correct} / ${total}`,
    answeredLabel: (answered) => `Жооп берилген: ${answered}`,
    scoreLabel: (score) => `Жыйынтык: ${score}%`,
    testBlocked: 'Тест бөгөттөлдү',
    autoSubmittingResults: 'Жыйынтыктар автоматтык түрдө жөнөтүлүүдө. Сураныч, баракты жаппаңыз.',
    retrySubmit: 'Кайра жөнөтүү',
    exitWithoutSave: 'Сактабай чыгуу',
    activeTest: 'Активдүү тест',
    questionCounter: (current, total) => `${current}/${total}-суроо`,
    progress: 'Прогресс',
    imageAlt: 'Суроого тиешелүү сүрөт',
    answerSaved: 'Жооп сакталды. Кийинки суроого өтсөңүз болот.',
    chooseOneAnswer: 'Бир жооп вариантын тандаңыз.',
    nextQuestion: 'Кийинки суроо',
    finishTest: 'Тестти аяктоо',
    submitting: 'Жөнөтүлүүдө...',
    loading: 'Жүктөлүүдө...',
    sessionUnavailable: 'Тест сессиясы жеткиликтүү эмес',
    fullscreenRequired: 'Тестти баштоо үчүн толук экран режимине уруксат берүү керек.',
    availableParamsError: 'Тест параметрлерин жүктөөдө ката кетти',
    autoSubmitError: 'Жыйынтыктарды автоматтык жөнөтүүдө ката кетти',
    generationError: 'Тестти түзүүдө ката кетти',
    submitError: 'Жыйынтыктарды жөнөтүүдө ката кетти',
    loginError: 'Кирүүдө ката кетти',
    antiCheatScreenshot: 'Экрандын сүрөтүн тартуу аракети аныкталды.',
    antiCheatShortcut: 'Тыюу салынган баскыч айкалышы колдонулду.',
    antiCheatCopyPaste: 'Тест учурунда көчүрүү же коюу аракети аныкталды.',
    antiCheatContextMenu: 'Контексттик менюну ачуу аракети аныкталды.',
    antiCheatVisibility: 'Башка өтмөккө өтүү же терезени жашыруу аныкталды.',
    antiCheatBlur: 'Тест терезеси фокусту жоготту.',
    antiCheatFullscreenExit: 'Тест учурунда толук экран режими өчүрүлдү.',
    antiCheatNavigation: 'Браузер навигациясы аркылуу тесттен чыгуу аракети аныкталды.',
  },
};

export function normalizePortalLanguage(language?: string | null): PortalLanguage {
  return language === 'kg' ? 'kg' : 'ru';
}

export function getPortalCopy(language?: string | null): PortalCopy {
  return portalCopy[normalizePortalLanguage(language)];
}
