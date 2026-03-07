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
import { getPortalCopy } from '../lib/portalI18n';
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
  const copy = getPortalCopy(student?.language);

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
        const message = error instanceof Error ? error.message : copy.availableParamsError;
        setApiError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadAvailable();
  }, [copy.availableParamsError, student, token, testType, navigate]);

  const setupLabel = useMemo(() => {
    if (testType === 'MAIN') {
      return copy.subjectTest;
    }

    return copy.trialTest;
  }, [copy.subjectTest, copy.trialTest, testType]);

  const submitCurrentTest = useCallback(
    async (termination?: TerminationPayload, keepalive?: boolean) => {
      if (!token || !testData || !testType) {
        throw new Error(copy.sessionUnavailable);
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
    [answers, copy.sessionUnavailable, testData, testType, token],
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
        const message = error instanceof Error ? error.message : copy.autoSubmitError;
        setLockedState({
          termination,
          isSubmitting: false,
          submitError: message,
        });
      }
    },
    [copy.autoSubmitError, submitCurrentTest],
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
    language: student?.language,
    onViolation: handleViolation,
  });

  const activeQuestion = testData?.questions[currentQuestionIndex] ?? null;
  const totalQuestions = testData?.questions.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const selectedAnswer = activeQuestion ? answers[activeQuestion.id] : undefined;
  const isCurrentAnswered = selectedAnswer !== undefined;
  const isLastQuestion = totalQuestions > 0 && currentQuestionIndex === totalQuestions - 1;
  const activeTestTitle = testData?.test_info.type === 'MAIN'
    ? copy.subjectTest
    : copy.trialTest;

  const handleStart = async () => {
    if (!token || !testType) {
      return;
    }

    if (testType === 'MAIN' && !selectedSubject) {
      setApiError(copy.subjectRequiredError);
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
      setApiError(copy.fullscreenRequired);
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
      const message = error instanceof Error ? error.message : copy.generationError;
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
      const message = error instanceof Error ? error.message : copy.submitError;
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
    return <div className="p-10 text-center">{copy.loading}</div>;
  }

  if (apiError && phase === 'setup' && !testData && !submitResult) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-6 sm:px-6">
        <div className="max-w-lg w-full rounded-[28px] border border-red-200 bg-white p-6 text-red-700 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.28)]">
          {apiError}
        </div>
      </div>
    );
  }

  if (phase === 'finished' && submitResult) {
    const violationFinished = finalTermination?.mode === 'violation';

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-md rounded-[30px] border border-slate-200/70 bg-white/95 p-6 text-center shadow-[0_30px_90px_-40px_rgba(15,23,42,0.32)] sm:p-8">
          <h2 className={`text-2xl font-bold mb-4 ${violationFinished ? 'text-amber-600' : 'text-green-600'}`}>
            {violationFinished ? copy.testCompletedAuto : copy.testCompleted}
          </h2>
          {violationFinished && finalTermination && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              {copy.reasonLabel}: {finalTermination.reason}
            </p>
          )}
          <p className="text-gray-600">{copy.correctAnswersLabel(submitResult.correct, submitResult.total)}</p>
          <p className="text-gray-600 mt-1">{copy.answeredLabel(submitResult.answered)}</p>
          <p className="text-gray-600 mt-1">{copy.scoreLabel(submitResult.score)}</p>
          <button
            onClick={() => {
              void returnToDashboard();
            }}
            className="w-full mt-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
          >
            {copy.returnHome}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'setup' || !testData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-5 sm:px-6 sm:py-8">
        <div className="w-full max-w-lg rounded-[30px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_28px_80px_-38px_rgba(15,23,42,0.3)] sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{copy.setup}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{setupLabel}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {copy.reviewParams}
              </p>
            </div>
            <button
              onClick={() => {
                void returnToDashboard();
              }}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {copy.back}
            </button>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.gradeLabel}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{copy.gradeValue(student?.grade ?? 0)}</p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.languageLabel}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">
                {copy.languageName(student?.language ?? 'ru')}
              </p>
            </div>
          </div>

          {testType === 'MAIN' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{copy.selectSubject}</label>
              <select
                value={selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-base outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(availableData?.subjects || []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {availableData?.main_test && (
                <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-gray-500">
                  {copy.programInfo(
                    availableData.main_test.grades[0],
                    availableData.main_test.grades[1],
                    availableData.main_test.total_questions,
                  )}
                </p>
              )}
            </div>
          )}

          {testType === 'TRIAL' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{copy.selectRound}</label>
              <select
                value={selectedRound}
                onChange={(event) => setSelectedRound(Number(event.target.value))}
                className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-base outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(availableData?.rounds || []).map((round) => (
                  <option key={round.id} value={round.id}>
                    {round.title} ({copy.questionsCountLabel(round.total_questions)})
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
            className="h-12 w-full rounded-xl bg-blue-600 px-4 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isGenerating ? copy.preparingTest : copy.startTesting}
          </button>
        </div>
      </div>
    );
  }

  if (!activeQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-6">
        <div className="max-w-lg w-full rounded-[28px] border border-red-200 bg-white p-6 text-center shadow-[0_24px_70px_-36px_rgba(15,23,42,0.28)]">
          <p className="text-red-700 mb-4">{copy.currentQuestionLoadError}</p>
          <button
            onClick={() => {
              void returnToDashboard();
            }}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-white font-medium hover:bg-blue-700"
          >
            {copy.returnHome}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-8 sm:pt-6" {...containerProps}>
      {lockedState ? (
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-[30px] border border-amber-200 bg-white p-6 text-center shadow-[0_28px_80px_-36px_rgba(15,23,42,0.32)] sm:p-8">
            <h2 className="text-2xl font-bold text-amber-700 mb-3">{copy.testBlocked}</h2>
            <p className="text-gray-700">{lockedState.termination.reason}</p>

            {lockedState.isSubmitting ? (
              <p className="mt-6 text-sm text-gray-500">
                {copy.autoSubmittingResults}
              </p>
            ) : (
              <>
                <p className="mt-6 text-sm text-red-600">{lockedState.submitError}</p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={handleRetryViolationSubmit}
                    className="h-12 w-full rounded-xl bg-blue-600 px-5 font-medium text-white hover:bg-blue-700"
                  >
                    {copy.retrySubmit}
                  </button>
                  <button
                    onClick={() => {
                      void returnToDashboard();
                    }}
                    className="h-12 w-full rounded-xl border border-gray-300 px-5 font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {copy.exitWithoutSave}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <header className="sticky top-0 z-20 mx-auto mb-4 max-w-4xl rounded-[24px] border border-slate-200/80 bg-white/92 px-4 py-4 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.3)] backdrop-blur sm:mb-6 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{copy.activeTest}</p>
                <h1 className="mt-1 text-base font-bold text-gray-800 sm:text-xl">
                  {activeTestTitle}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {copy.questionCounter(currentQuestionIndex + 1, totalQuestions)}
                </p>
              </div>
              <div className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                {answeredCount}/{totalQuestions}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                <span>{copy.progress}</span>
                <span>{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%</span>
              </div>
              <div className="w-full rounded-full bg-slate-200 h-2">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                />
              </div>
            </div>
          </header>

          {apiError && (
            <div className="mx-auto mb-4 max-w-4xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <main className="mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.25)]">
            {activeQuestion.topic && (
              <div className="px-4 pt-4 sm:px-8 sm:pt-5">
                <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700 sm:text-xs">
                  {activeQuestion.topic}
                </span>
              </div>
            )}

            {activeQuestion.imageUrl && (
              <div className="px-4 pt-4 sm:px-8">
                <img
                  src={activeQuestion.imageUrl}
                  alt={copy.imageAlt}
                  className="max-h-72 w-auto max-w-full rounded-2xl border border-gray-200 object-contain"
                />
              </div>
            )}

            <div className="border-b border-gray-100 px-4 py-5 sm:px-8 sm:py-8">
              <h3 className="text-lg font-semibold leading-8 text-gray-900 sm:text-2xl sm:leading-10">
                {activeQuestion.text}
              </h3>
            </div>

            <div className="bg-gray-50/60 px-4 py-4 sm:px-8 sm:py-6">
              <div className="flex flex-col gap-3 sm:gap-4">
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
                      className={`w-full rounded-2xl border p-4 text-left transition-all sm:p-5 ${optionClass} ${
                        isCurrentAnswered ? 'cursor-default' : ''
                      }`}
                    >
                      <span
                        className={`mr-4 inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium sm:h-9 sm:w-9 ${
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
          </main>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/96 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_50px_-34px_rgba(15,23,42,0.24)] backdrop-blur sm:static sm:mx-auto sm:mt-4 sm:max-w-4xl sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0 sm:shadow-none">
            <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-sm text-gray-500 sm:text-left">
                {isCurrentAnswered ? copy.answerSaved : copy.chooseOneAnswer}
              </p>

              {isCurrentAnswered && !isLastQuestion && (
                <button
                  onClick={handleNextQuestion}
                  className="h-12 w-full rounded-xl bg-blue-600 px-6 text-base font-semibold text-white shadow-sm hover:bg-blue-700 sm:w-auto"
                >
                  {copy.nextQuestion}
                </button>
              )}

              {isCurrentAnswered && isLastQuestion && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-xl bg-emerald-600 px-6 text-base font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
                >
                  {isSubmitting ? copy.submitting : copy.finishTest}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
