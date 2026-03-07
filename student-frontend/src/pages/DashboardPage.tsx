import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, Clock3, FlaskConical, Play, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchAvailableTests, generateStudentTest, type AvailableResponse } from '../lib/api';

function localizeUi(language: 'ru' | 'kg' | undefined, ruText: string, kgText: string) {
  return language === 'kg' ? kgText : ruText;
}

export default function DashboardPage() {
  const { student, token, logout } = useAuthStore();
  const navigate = useNavigate();

  const [availableData, setAvailableData] = useState<AvailableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedCard, setExpandedCard] = useState<'MAIN' | 'TRIAL' | null>(null);

  // MAIN test configuration state
  const [selectedMainSubject, setSelectedMainSubject] = useState<string>('');
  const [selectedMainGrade, setSelectedMainGrade] = useState<number | ''>('');

  // TRIAL test configuration state
  const [selectedTrialRound, setSelectedTrialRound] = useState<number | ''>('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    if (!student || !token) {
      navigate('/login');
      return;
    }

    const loadTree = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchAvailableTests(token);
        setAvailableData(data);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Ошибка загрузки ветки тестов';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadTree();
  }, [navigate, student, token]);

  const mainNode = availableData?.test_types.find((n) => n.id === 'MAIN' && 'items' in n);
  const trialNode = availableData?.test_types.find((n) => n.id === 'TRIAL' && 'rounds' in n);

  const handleStartMain = async () => {
    if (!token || !selectedMainSubject || !selectedMainGrade) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const testData = await generateStudentTest(token, {
        type: 'MAIN',
        subject: selectedMainSubject,
        grade: Number(selectedMainGrade),
      });

      navigate('/test/main', { state: { testData } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка генерации предметного теста';
      setGenerateError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartTrial = async () => {
    if (!token || !selectedTrialRound) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const testData = await generateStudentTest(token, {
        type: 'TRIAL',
        round: Number(selectedTrialRound),
      });

      navigate('/test/trial', { state: { testData } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка генерации пробного теста';
      setGenerateError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCard = (id: 'MAIN' | 'TRIAL') => {
    if (expandedCard === id) {
      setExpandedCard(null);
    } else {
      setExpandedCard(id);
      setGenerateError(null);
      if (id === 'MAIN') {
        setSelectedMainSubject('');
        setSelectedMainGrade('');
      } else {
        setSelectedTrialRound('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      <div className="mx-auto max-w-5xl px-4 py-8">

        {/* Header */}
        <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                <ShieldCheck className="h-4 w-4" />
                {localizeUi(student?.language, 'Личный кабинет', 'Жеке кабинет')}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {availableData?.branch.title || `${student?.grade} класс`}
                </h1>
                <p className="mt-2 text-base text-slate-500">
                  {localizeUi(
                    student?.language,
                    'Выберите тип теста, настройте параметры и приступайте к выполнению.',
                    'Тесттин түрүн тандап, параметрлерди орнотуп, аткарууну баштаңыз.',
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>
                    {localizeUi(student?.language, 'Ученик:', 'Окуучу:')}{' '}
                    <span className="font-medium text-slate-900">{student?.fullName}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-400">@</span>
                  <span>
                    {localizeUi(student?.language, 'Логин:', 'Логин:')}{' '}
                    <span className="font-medium text-slate-900">{student?.username}</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 active:bg-slate-100"
            >
              {localizeUi(student?.language, 'Выйти', 'Чыгуу')}
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Clock3 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="mt-4 text-sm font-medium text-slate-500">
              {localizeUi(student?.language, 'Загружаем тесты...', 'Тесттер жүктөлүүдө...')}
            </span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
            {error}
          </div>
        ) : (
          <main className="grid gap-6 md:grid-cols-2">

            {/* MAIN TEST CARD */}
            {mainNode && (
              <div
                className={`flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-200 ${expandedCard === 'MAIN'
                    ? 'border-blue-500 ring-1 ring-blue-500 shadow-md'
                    : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow'
                  }`}
              >
                <button
                  onClick={() => toggleCard('MAIN')}
                  className="flex w-full items-start justify-between gap-4 p-6 text-left focus:outline-none"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        {localizeUi(student?.language, 'Предметный тест', 'Предметтик тест')}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {localizeUi(student?.language, 'Тесты по отдельным предметам для проверки знаний', 'Билимди текшерүү үчүн өзүнчө предметтер боюнча тесттер')}
                      </p>
                    </div>
                  </div>
                  <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-transform duration-200 ${expandedCard === 'MAIN' ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-5 w-5" />
                  </div>
                </button>

                {expandedCard === 'MAIN' && (
                  <div className="flex-1 border-t border-slate-100 bg-slate-50/50 p-6 pt-5">
                    <div className="space-y-5">
                      {/* Subject Selection */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                          {localizeUi(student?.language, 'Предмет', 'Предмет')}
                        </label>
                        <select
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          value={selectedMainSubject}
                          onChange={(e) => setSelectedMainSubject(e.target.value)}
                        >
                          <option value="" disabled>
                            {localizeUi(student?.language, 'Выберите предмет...', 'Предметти тандаңыз...')}
                          </option>
                          {mainNode.items?.map((item) => (
                            <option key={item.id} value={item.id} disabled={item.status !== 'ready'}>
                              {item.title} {item.status !== 'ready' ? '(Недоступно)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Grade Selection */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                          {localizeUi(student?.language, 'Класс', 'Класс')}
                        </label>
                        <select
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          value={selectedMainGrade}
                          onChange={(e) => setSelectedMainGrade(Number(e.target.value))}
                          disabled={!selectedMainSubject}
                        >
                          <option value="" disabled>
                            {localizeUi(student?.language, 'Выберите класс...', 'Классты тандаңыз...')}
                          </option>
                          {selectedMainSubject &&
                            mainNode.items
                              ?.find((item) => item.id === selectedMainSubject)
                              ?.lines.map((line) => (
                                <option key={line.grade} value={line.grade} disabled={line.available < line.required}>
                                  {line.grade} {localizeUi(student?.language, 'класс', 'класс')} ({line.available}/{line.required})
                                </option>
                              ))}
                        </select>
                      </div>

                      {generateError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                          {generateError}
                        </div>
                      )}

                      <button
                        onClick={handleStartMain}
                        disabled={!selectedMainSubject || !selectedMainGrade || isGenerating}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
                      >
                        {isGenerating ? (
                          <>
                            <Clock3 className="h-4 w-4 animate-spin" />
                            {localizeUi(student?.language, 'Загрузка...', 'Жүктөлүүдө...')}
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            {localizeUi(student?.language, 'Начать тест', 'Тестти баштоо')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TRIAL TEST CARD */}
            {trialNode && (
              <div
                className={`flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-200 ${expandedCard === 'TRIAL'
                    ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md'
                    : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow'
                  }`}
              >
                <button
                  onClick={() => toggleCard('TRIAL')}
                  className="flex w-full items-start justify-between gap-4 p-6 text-left focus:outline-none"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <FlaskConical className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        {localizeUi(student?.language, 'Пробный тест', 'Пробный тест')}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {localizeUi(student?.language, 'Комплексный симулированный экзамен по всем предметам', 'Бардык предметтер боюнча комплекстүү реалдуу сынак')}
                      </p>
                    </div>
                  </div>
                  <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-transform duration-200 ${expandedCard === 'TRIAL' ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-5 w-5" />
                  </div>
                </button>

                {expandedCard === 'TRIAL' && (
                  <div className="flex-1 border-t border-slate-100 bg-slate-50/50 p-6 pt-5">
                    <div className="space-y-5">
                      {/* Round Selection */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                          {localizeUi(student?.language, 'Тур', 'Тур')}
                        </label>
                        <select
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          value={selectedTrialRound}
                          onChange={(e) => setSelectedTrialRound(Number(e.target.value))}
                        >
                          <option value="" disabled>
                            {localizeUi(student?.language, 'Выберите тур...', 'Турду тандаңыз...')}
                          </option>
                          {trialNode.rounds?.map((round) => (
                            <option key={round.id} value={round.id} disabled={round.status !== 'ready'}>
                              {round.title} {round.status !== 'ready' ? '(Недоступно)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {generateError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                          {generateError}
                        </div>
                      )}

                      <button
                        onClick={handleStartTrial}
                        disabled={!selectedTrialRound || isGenerating}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-indigo-300"
                      >
                        {isGenerating ? (
                          <>
                            <Clock3 className="h-4 w-4 animate-spin" />
                            {localizeUi(student?.language, 'Загрузка...', 'Жүктөлүүдө...')}
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            {localizeUi(student?.language, 'Начать тест', 'Тестти баштоо')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}
