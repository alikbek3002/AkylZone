import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAntiCheat, type AntiCheatViolation } from '../hooks/useAntiCheat';
import {
  fetchAvailableTests,
  generateStudentTest,
  submitStudentTest,
  type AvailableResponse,
  type GeneratedTestResponse,
  type SubmitTestResponse,
  type TerminationPayload,
} from '../lib/api';
import { useAuthStore } from '../store/authStore';

type TestType = 'MAIN' | 'TRIAL';
type TestPhase = 'setup' | 'active' | 'finished';

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface LockedState {
  termination: TerminationPayload;
  isSubmitting: boolean;
  submitError: string | null;
}

function normalizeTestType(value: string | undefined): TestType | null {
  const upper = String(value || '').toUpperCase();
  if (upper === 'MAIN' || upper === 'TRIAL') {
    return upper;
  }
  return null;
}

async function requestDocumentFullscreen() {
  if (document.fullscreenElement) {
    return;
  }

  const root = document.documentElement as FullscreenElement;
  if (root.requestFullscreen) {
    await root.requestFullscreen();
    return;
  }

  if (root.webkitRequestFullscreen) {
    await root.webkitRequestFullscreen();
    return;
  }

  throw new Error('Fullscreen API is not available');
}

async function exitDocumentFullscreen() {
  const fullscreenDocument = document as FullscreenDocument;
  if (document.fullscreenElement && fullscreenDocument.exitFullscreen) {
    await fullscreenDocument.exitFullscreen();
    return;
  }

  if (fullscreenDocument.webkitExitFullscreen) {
    await fullscreenDocument.webkitExitFullscreen();
  }
}

export default function TestPage() {
  const { id: rawTestType } = useParams();
  const testType = normalizeTestType(rawTestType);
  const { student, token } = useAuthStore();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<TestPhase>('setup');
  const [availableData, setAvailableData] = useState<AvailableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedRound, setSelectedRound] = useState(1);

  const [testData, setTestData] = useState<GeneratedTestResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitResult, setSubmitResult] = useState<SubmitTestResponse | null>(null);
  const [finalTermination, setFinalTermination] = useState<TerminationPayload | null>(null);

  const [lockedState, setLockedState] = useState<LockedState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const returnToDashboard = useCallback(async () => {
    try {
      await exitDocumentFullscreen();
    } catch {
      // Ignore fullscreen exit failures on navigation.
    }
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!student || !token) {
      navigate('/login');
      return;
    }

    if (!testType) {
      navigate('/dashboard');
      return;
    }

    const loadAvailable = async () => {
      setLoading(true);
      setApiError(null);

      try {
        const data = await fetchAvailableTests(token);
        setAvailableData(data);

        if (data.subjects.length > 0) {
          setSelectedSubject(data.subjects[0].id);
        }

        if (data.rounds.length > 0) {
          setSelectedRound(data.rounds[0].id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ошибка загрузки параметров теста';
        setApiError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadAvailable();
  }, [student, token, testType, navigate]);

  const setupLabel = useMemo(() => {
    if (testType === 'MAIN') {
      return student?.language === 'kg' ? 'Предметтик тест' : 'Предметный тест';
    }

    return 'Пробный тест';
  }, [student?.language, testType]);

  const submitCurrentTest = useCallback(
    async (termination?: TerminationPayload, keepalive?: boolean) => {
      if (!token || !testData || !testType) {
        throw new Error('Тестовая сессия недоступна');
      }

      return submitStudentTest(
        token,
        {
          test_session_id: testData.test_session_id,
          type: testType,
          answers,
          termination,
        },
        keepalive ? { keepalive: true } : undefined,
      );
    },
    [answers, testData, testType, token],
  );

  const submitViolation = useCallback(
    async (termination: TerminationPayload) => {
      try {
        const result = await submitCurrentTest(termination, true);
        setSubmitResult(result);
        setFinalTermination(termination);
        setPhase('finished');
        setLockedState(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ошибка автоматической отправки результатов';
        setLockedState({
          termination,
          isSubmitting: false,
          submitError: message,
        });
      }
    },
    [submitCurrentTest],
  );

  const handleViolation = useCallback(
    (violation: AntiCheatViolation) => {
      if (phase !== 'active' || lockedState || !testData) {
        return;
      }

      const termination: TerminationPayload = {
        mode: 'violation',
        reason: violation.reason,
        source: violation.source,
        triggered_at: violation.triggered_at,
      };

      setApiError(null);
      setLockedState({
        termination,
        isSubmitting: true,
        submitError: null,
      });

      void submitViolation(termination);
    },
    [lockedState, phase, submitViolation, testData],
  );

  const { containerProps } = useAntiCheat({
    isActive: phase === 'active' && Boolean(testData) && lockedState === null,
    onViolation: handleViolation,
  });

  const activeQuestion = testData?.questions[currentQuestionIndex] ?? null;
  const totalQuestions = testData?.questions.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const selectedAnswer = activeQuestion ? answers[activeQuestion.id] : undefined;
  const isCurrentAnswered = selectedAnswer !== undefined;
  const isLastQuestion = totalQuestions > 0 && currentQuestionIndex === totalQuestions - 1;

  const handleStart = async () => {
    if (!token || !testType) {
      return;
    }

    if (testType === 'MAIN' && !selectedSubject) {
      setApiError('Выберите предмет для тестирования');
      return;
    }

    setApiError(null);
    setSubmitResult(null);
    setFinalTermination(null);
    setLockedState(null);
    setIsGenerating(true);

    try {
      await requestDocumentFullscreen();
    } catch {
      setApiError('Для начала теста необходимо разрешить полноэкранный режим.');
      setIsGenerating(false);
      return;
    }

    try {
      const data = await generateStudentTest(token, {
        type: testType,
        subject: testType === 'MAIN' ? selectedSubject : undefined,
        round: testType === 'TRIAL' ? selectedRound : undefined,
      });

      setTestData(data);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setPhase('active');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка генерации теста';
      setApiError(message);

      try {
        await exitDocumentFullscreen();
      } catch {
        // Ignore fullscreen exit failures after generation errors.
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (!activeQuestion || isCurrentAnswered || lockedState) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: index,
    }));
  };

  const handleNextQuestion = () => {
    if (!testData || !isCurrentAnswered || isLastQuestion) {
      return;
    }

    setCurrentQuestionIndex((prev) => prev + 1);
  };

  const handleSubmit = async () => {
    if (!testData || !testType) {
      return;
    }

    setApiError(null);
    setIsSubmitting(true);

    try {
      const result = await submitCurrentTest();
      setSubmitResult(result);
      setFinalTermination(null);
      setPhase('finished');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка отправки результатов';
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryViolationSubmit = () => {
    if (!lockedState) {
      return;
    }

    const termination = lockedState.termination;
    setLockedState({
      termination,
      isSubmitting: true,
      submitError: null,
    });

    void submitViolation(termination);
  };

  if (loading) {
    return <div className="p-10 text-center">Загрузка...</div>;
  }

  if (apiError && phase === 'setup' && !testData && !submitResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          {apiError}
        </div>
      </div>
    );
  }

  if (phase === 'finished' && submitResult) {
    const violationFinished = finalTermination?.mode === 'violation';

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <h2 className={`text-2xl font-bold mb-4 ${violationFinished ? 'text-amber-600' : 'text-green-600'}`}>
            {violationFinished ? 'Тест завершен автоматически' : 'Тест завершен'}
          </h2>
          {violationFinished && finalTermination && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              Причина: {finalTermination.reason}
            </p>
          )}
          <p className="text-gray-600">Правильных ответов: {submitResult.correct} из {submitResult.total}</p>
          <p className="text-gray-600 mt-1">Отвечено: {submitResult.answered}</p>
          <p className="text-gray-600 mt-1">Ваш результат: {submitResult.score}%</p>
          <button
            onClick={() => {
              void returnToDashboard();
            }}
            className="w-full mt-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'setup' || !testData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{setupLabel}</h2>
            <button
              onClick={() => {
                void returnToDashboard();
              }}
              className="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Назад
            </button>
          </div>

          {testType === 'MAIN' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Выберите предмет</label>
              <select
                value={selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(availableData?.subjects || []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {availableData?.main_test && (
                <p className="mt-2 text-xs text-gray-500">
                  Программа: {availableData.main_test.grades[0]}-{availableData.main_test.grades[1]} класс,
                  всего {availableData.main_test.total_questions} вопросов
                </p>
              )}
            </div>
          )}

          {testType === 'TRIAL' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Выберите тур</label>
              <select
                value={selectedRound}
                onChange={(event) => setSelectedRound(Number(event.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(availableData?.rounds || []).map((round) => (
                  <option key={round.id} value={round.id}>
                    {round.title} ({round.total_questions} вопросов)
                  </option>
                ))}
              </select>
            </div>
          )}

          {apiError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={isGenerating}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-medium"
          >
            {isGenerating ? 'Подготовка теста...' : 'Начать тестирование'}
          </button>
        </div>
      </div>
    );
  }

  if (!activeQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-xl border border-red-200 bg-white p-6 text-center">
          <p className="text-red-700 mb-4">Не удалось загрузить текущий вопрос.</p>
          <button
            onClick={() => {
              void returnToDashboard();
            }}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-white font-medium hover:bg-blue-700"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" {...containerProps}>
      {lockedState ? (
        <div className="max-w-2xl mx-auto min-h-[70vh] flex items-center justify-center">
          <div className="w-full rounded-2xl border border-amber-200 bg-white p-8 shadow-sm text-center">
            <h2 className="text-2xl font-bold text-amber-700 mb-3">Тест заблокирован</h2>
            <p className="text-gray-700">{lockedState.termination.reason}</p>

            {lockedState.isSubmitting ? (
              <p className="mt-6 text-sm text-gray-500">
                Результаты автоматически отправляются. Пожалуйста, не закрывайте страницу.
              </p>
            ) : (
              <>
                <p className="mt-6 text-sm text-red-600">{lockedState.submitError}</p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={handleRetryViolationSubmit}
                    className="w-full rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
                  >
                    Повторить отправку
                  </button>
                  <button
                    onClick={() => {
                      void returnToDashboard();
                    }}
                    className="w-full rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Выйти без сохранения
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <header className="max-w-4xl mx-auto flex justify-between items-center mb-8 gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {testData.test_info.type === 'MAIN'
                  ? student?.language === 'kg'
                    ? 'Предметтик тест'
                    : 'Предметный тест'
                  : 'Пробный тест'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Вопрос {currentQuestionIndex + 1} из {totalQuestions}
              </p>
            </div>
            <div className="flex bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm font-mono text-blue-600 font-medium">
              {answeredCount}/{totalQuestions}
            </div>
          </header>

          <div className="max-w-4xl mx-auto mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          {apiError && (
            <div className="max-w-4xl mx-auto mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <main className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {activeQuestion.topic && (
              <div className="px-6 md:px-10 pt-4">
                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                  {activeQuestion.topic}
                </span>
              </div>
            )}

            {activeQuestion.imageUrl && (
              <div className="px-6 md:px-10 pt-4">
                <img
                  src={activeQuestion.imageUrl}
                  alt="Иллюстрация к вопросу"
                  className="max-h-64 h-auto w-auto max-w-full rounded-xl border border-gray-200 object-contain"
                />
              </div>
            )}

            <div className="p-6 md:p-10 border-b border-gray-100">
              <h3 className="text-lg md:text-xl text-gray-900 leading-relaxed font-medium">
                {activeQuestion.text}
              </h3>
            </div>

            <div className="p-6 md:p-10 bg-gray-50/50">
              <div className="flex flex-col gap-3">
                {activeQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const optionClass = isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50';

                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={isCurrentAnswered}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${optionClass} ${
                        isCurrentAnswered ? 'cursor-default' : ''
                      }`}
                    >
                      <span
                        className={`inline-block w-8 h-8 text-center leading-8 rounded-full border mr-4 font-medium text-sm ${
                          isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option.text}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 md:p-10 border-t border-gray-100 flex justify-end items-center bg-white">
              {isCurrentAnswered && !isLastQuestion && (
                <button
                  onClick={handleNextQuestion}
                  className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Следующий вопрос
                </button>
              )}

              {isCurrentAnswered && isLastQuestion && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-8 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60"
                >
                  {isSubmitting ? 'Отправка...' : 'Завершить тест'}
                </button>
              )}

              {!isCurrentAnswered && (
                <p className="text-gray-400 text-sm italic">Выберите ответ, чтобы продолжить</p>
              )}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
