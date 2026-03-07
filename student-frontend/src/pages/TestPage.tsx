import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, XCircle, Maximize, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  answerStudentQuestion,
  submitStudentTest,
  type AnswerQuestionResponse,
  type GeneratedTestResponse,
  type SubmitTestResponse,
} from '../lib/api';

function localizeUi(language: 'ru' | 'kg' | undefined, ruText: string, kgText: string) {
  return language === 'kg' ? kgText : ruText;
}

type RevealState = Record<string, AnswerQuestionResponse>;

export default function TestPage() {
  const { student, token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  const testData = location.state?.testData as GeneratedTestResponse | undefined;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<RevealState>({});
  const [submitResult, setSubmitResult] = useState<SubmitTestResponse | null>(null);

  const [isAnswering, setIsAnswering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchWarning, setTabSwitchWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Request fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        await (el as any).webkitRequestFullscreen();
      } else if ((el as any).msRequestFullscreen) {
        await (el as any).msRequestFullscreen();
      }
    } catch {
      // Fullscreen may not be available
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  if (!testData) {
    return <Navigate to="/dashboard" replace />;
  }

  const testType = testData.test_info.type;
  const isTrial = testType === 'TRIAL';

  // ——— TRIAL ONLY: Full anti-cheat + fullscreen ———
  useEffect(() => {
    if (!isTrial) return;

    // Enter fullscreen on mount for TRIAL
    enterFullscreen();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
        setTabSwitchWarning(true);
      }
    };

    const handleBlur = () => {
      setTabSwitchCount((prev) => prev + 1);
      setTabSwitchWarning(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isTrial, enterFullscreen]);

  // Handle Fullscreen state tracking (TRIAL only)
  useEffect(() => {
    if (!isTrial) return;

    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFull);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      exitFullscreen();
    };
  }, [isTrial, exitFullscreen]);

  if (!student || !token) {
    return <Navigate to="/login" replace />;
  }

  const currentQuestion = testData.questions[currentQuestionIndex] || null;
  const currentReveal = currentQuestion ? revealedAnswers[currentQuestion.id] : undefined;
  const currentSelectedIndex = currentQuestion ? selectedAnswers[currentQuestion.id] : undefined;
  const answeredCount = Object.keys(revealedAnswers).length;
  const totalQuestions = testData.total_questions;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  const handleAnswerSelect = async (selectedIndex: number) => {
    if (isAnswering || currentReveal || !currentQuestion) {
      return;
    }

    setIsAnswering(true);
    setApiError(null);

    try {
      const reveal = await answerStudentQuestion(token, {
        test_session_id: testData.test_session_id,
        type: testType,
        question_id: currentQuestion.id,
        selected_index: selectedIndex,
      });

      setSelectedAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: selectedIndex,
      }));
      setRevealedAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: reveal,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка проверки ответа';
      setApiError(message);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      const result = await submitStudentTest(token, {
        test_session_id: testData.test_session_id,
        type: testType,
      });
      setSubmitResult(result);
      // Exit fullscreen after submitting
      if (isTrial) {
        exitFullscreen();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка отправки результата';
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitTest = () => {
    exitFullscreen();
    navigate('/dashboard');
  };

  const handleGoPrev = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleGoNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  // For MAIN test: can always navigate freely
  // For TRIAL test: must answer current question before going next
  const canGoNext = isTrial ? Boolean(currentReveal) : true;
  const canSubmit = isTrial ? Boolean(currentReveal) : answeredCount === totalQuestions;

  // Submit result screen
  if (submitResult) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-50 select-none px-4">
        <div className="mx-auto max-w-md w-full rounded-2xl sm:rounded-[32px] border border-emerald-200 bg-white p-6 sm:p-8 text-center shadow-[0_22px_65px_-38px_rgba(15,23,42,0.4)]">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl sm:text-3xl font-bold text-slate-950">
            {localizeUi(student?.language, 'Тест завершён', 'Тест аяктады')}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {localizeUi(
              student?.language,
              `Правильных ответов: ${submitResult.correct} из ${submitResult.total}`,
              `Туура жооптор: ${submitResult.correct} / ${submitResult.total}`,
            )}
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {localizeUi(student?.language, `Результат: ${submitResult.score}%`, `Жыйынтык: ${submitResult.score}%`)}
          </p>
          {tabSwitchCount > 0 && (
            <p className="mt-2 text-xs text-amber-600 font-medium">
              {localizeUi(student?.language, `Переключений вкладки: ${tabSwitchCount}`, `Башка вкладкага өтүү: ${tabSwitchCount}`)}
            </p>
          )}
          <button
            onClick={handleExitTest}
            className="mt-6 w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-6 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            {localizeUi(student?.language, 'На главную', 'Башкы бетке')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[9999] overflow-auto bg-white font-sans text-stone-900 ${isTrial ? 'bg-slate-50' : ''}`}
    >
      {/* Tab switch warning overlay (TRIAL only) */}
      {isTrial && tabSwitchWarning && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-4 max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-900">
              {localizeUi(student?.language, 'Внимание!', 'Көңүл буруңуз!')}
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {localizeUi(
                student?.language,
                'Вы покинули окно теста. Это было зафиксировано. Пожалуйста, не переключайтесь на другие вкладки и приложения во время теста.',
                'Сиз тест терезесинен чыктыңыз. Бул жазылды. Тест учурунда башка өтмөктөргө жана колдонмолорго өтпөңүз.',
              )}
            </p>
            <p className="mt-2 text-xs text-amber-600 font-medium">
              {localizeUi(student?.language, `Переключений: ${tabSwitchCount}`, `Өтүүлөр: ${tabSwitchCount}`)}
            </p>
            <button
              onClick={() => {
                setTabSwitchWarning(false);
                enterFullscreen();
              }}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              {localizeUi(student?.language, 'Продолжить тест', 'Тестти улантуу')}
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen prompt if not in fullscreen (ONLY FOR TRIAL) */}
      {isTrial && !isFullscreen && !tabSwitchWarning && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <Maximize className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-900">
              {localizeUi(student?.language, 'Полноэкранный режим', 'Толук экран режими')}
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {localizeUi(
                student?.language,
                'Для прохождения теста необходимо включить полноэкранный режим. Это требуется для обеспечения честности тестирования.',
                'Тесттен өтүү үчүн толук экран режимин иштетүү зарыл. Бул тестирлөөнүн адилеттүүлүгүн камсыз кылуу үчүн талап кылынат.',
              )}
            </p>
            <button
              onClick={enterFullscreen}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-sky-600 px-6 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
            >
              <Maximize className="h-4 w-4" />
              {localizeUi(student?.language, 'Войти в полноэкранный режим', 'Толук экран режимине кирүү')}
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-3 sm:px-4 py-3 sm:py-8">
        {/* Top bar: exit + progress */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button
            onClick={handleExitTest}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-400 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {localizeUi(student?.language, 'Выйти', 'Чыгуу')}
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            {isTrial && tabSwitchCount > 0 && (
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] sm:text-xs font-bold text-amber-700">
                {tabSwitchCount}
              </span>
            )}
            <span className="text-xs sm:text-sm font-bold text-stone-500">
              {answeredCount}/{totalQuestions}
            </span>
          </div>
        </div>

        {/* Question counter + type */}
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <h1 className="text-lg sm:text-3xl font-black text-black">
            {currentQuestionIndex + 1}<span className="text-stone-300">/{totalQuestions}</span>
          </h1>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-400">
            {isTrial ? localizeUi(student?.language, 'Сынамык', 'Сынамык') : (testData.test_info.subject || '')}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4 sm:mb-6 overflow-hidden rounded-full bg-stone-100 h-1.5 sm:h-2">
          <div
            className="h-full rounded-full bg-black transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>

        {apiError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {apiError}
          </div>
        )}

        {/* Question card */}
        <main className="overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-stone-200 bg-white">
          {currentQuestion?.topic && (
            <div className="border-b border-stone-100 px-4 pt-4 sm:px-6 sm:pt-5">
              <span className="inline-flex items-center rounded-full border border-stone-200 px-2.5 py-1 text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-wider">
                {currentQuestion.topic}
              </span>
            </div>
          )}

          {currentQuestion?.imageUrl && (
            <div className="border-b border-stone-100 px-4 pt-4 sm:px-6 sm:pt-5">
              <img
                src={currentQuestion.imageUrl}
                alt={localizeUi(student?.language, 'Иллюстрация к вопросу', 'Суроого сүрөт')}
                className="max-h-40 sm:max-h-72 w-auto max-w-full rounded-xl border border-stone-200 object-contain pointer-events-none"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          )}

          <div className="border-b border-stone-100 px-3.5 py-3 sm:px-6 sm:py-6">
            <h2 className="text-base sm:text-xl font-medium leading-relaxed text-black">
              {currentQuestion?.text}
            </h2>
          </div>

          <div className="px-3.5 py-3.5 sm:px-6 sm:py-6">
            <div className="grid gap-2 sm:gap-3">
              {currentQuestion?.options.map((option, index) => {
                const isSelected = currentSelectedIndex === index;
                const isCorrect = currentReveal?.correct_index === index;
                const isAnswered = Boolean(currentReveal);

                let optionClassName = 'border-stone-200 bg-white hover:border-black active:scale-[0.98]';
                let badgeClassName = 'border-stone-300 bg-white text-stone-500';

                if (isAnswered) {
                  if (isCorrect) {
                    optionClassName = 'border-emerald-500 bg-emerald-50 text-emerald-950';
                    badgeClassName = 'border-emerald-600 bg-emerald-500 text-white';
                  } else if (isSelected) {
                    optionClassName = 'border-rose-500 bg-rose-50 text-rose-950';
                    badgeClassName = 'border-rose-600 bg-rose-500 text-white';
                  } else {
                    optionClassName = 'border-stone-200 bg-stone-50 text-stone-400 opacity-60';
                    badgeClassName = 'border-stone-200 bg-stone-100 text-stone-400';
                  }
                } else if (isSelected) {
                  optionClassName = 'border-black bg-stone-50 text-black';
                  badgeClassName = 'border-black bg-black text-white';
                }

                return (
                  <button
                    key={`${currentQuestion.id}-${index}`}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={isAnswering || isAnswered}
                    className={`flex w-full items-start gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl border-2 p-2.5 sm:p-4 text-left transition-all ${optionClassName}`}
                  >
                    <span className={`inline-flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border-2 text-xs sm:text-sm font-bold ${badgeClassName}`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="pt-0.5 sm:pt-1 text-sm sm:text-base font-medium leading-snug">{option.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {currentReveal && (
            <div className={`border-t px-4 py-4 sm:px-6 sm:py-5 ${currentReveal.is_correct
              ? 'border-emerald-200 bg-emerald-50/50'
              : 'border-rose-200 bg-rose-50/50'
              }`}>
              <div className="flex items-center gap-2.5">
                {currentReveal.is_correct ? (
                  <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="bg-rose-100 p-1.5 rounded-lg text-rose-600">
                    <XCircle className="h-5 w-5" />
                  </div>
                )}
                <span className={`text-sm font-bold ${currentReveal.is_correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {currentReveal.is_correct
                    ? localizeUi(student?.language, 'Правильно', 'Туура')
                    : localizeUi(student?.language, 'Неправильно', 'Туура эмес')}
                  {' — '}
                  {String.fromCharCode(65 + currentReveal.correct_index)}
                </span>
              </div>

              {currentReveal.explanation && (
                <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-600">
                  {currentReveal.explanation}
                </p>
              )}
            </div>
          )}
        </main>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4 sm:mt-6 gap-2 pb-6">
          <button
            onClick={handleGoPrev}
            disabled={isFirstQuestion}
            className={`inline-flex h-10 sm:h-12 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-5 text-xs sm:text-sm font-bold transition-all border-2 ${isFirstQuestion
              ? 'border-stone-100 text-stone-300 cursor-not-allowed'
              : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400 active:scale-[0.97]'
              }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{localizeUi(student?.language, 'Назад', 'Артка')}</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Submit */}
            {isTrial ? (
              isLastQuestion && (
                <button
                  onClick={handleSubmit}
                  disabled={!currentReveal || isSubmitting}
                  className={`inline-flex h-10 sm:h-12 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3.5 sm:px-6 text-xs sm:text-sm font-bold transition-colors ${currentReveal && !isSubmitting
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97]'
                    : 'cursor-not-allowed bg-stone-100 text-stone-400'
                    }`}
                >
                  {isSubmitting
                    ? localizeUi(student?.language, 'Отправляем...', 'Жөнөтүүдө...')
                    : localizeUi(student?.language, 'Завершить', 'Аяктоо')}
                </button>
              )
            ) : (
              canSubmit && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`inline-flex h-10 sm:h-12 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3.5 sm:px-6 text-xs sm:text-sm font-bold transition-colors ${!isSubmitting
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97]'
                    : 'cursor-not-allowed bg-stone-100 text-stone-400'
                    }`}
                >
                  {isSubmitting
                    ? localizeUi(student?.language, 'Отправляем...', 'Жөнөтүүдө...')
                    : localizeUi(student?.language, 'Завершить', 'Аяктоо')}
                </button>
              )
            )}

            {/* Next */}
            {!isLastQuestion && (
              <button
                onClick={handleGoNext}
                disabled={!canGoNext}
                className={`inline-flex h-10 sm:h-12 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3.5 sm:px-5 text-xs sm:text-sm font-bold transition-all ${canGoNext
                  ? 'bg-black text-white hover:opacity-80 active:scale-[0.97]'
                  : 'cursor-not-allowed bg-stone-100 text-stone-400'
                  }`}
              >
                <span className="hidden sm:inline">{localizeUi(student?.language, 'Далее', 'Кийинки')}</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
