import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, XCircle, Maximize, AlertTriangle, Shield, LogOut } from 'lucide-react';
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
  const screenRestoreTimerRef = useRef<number | null>(null);

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
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [screenBlacked, setScreenBlacked] = useState(false);

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
    } catch { /* may not be available */ }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    } catch { /* ignore */ }
  }, []);

  const clearScreenRestoreTimer = useCallback(() => {
    if (screenRestoreTimerRef.current !== null) {
      window.clearTimeout(screenRestoreTimerRef.current);
      screenRestoreTimerRef.current = null;
    }
  }, []);

  const triggerSecurityOverlay = useCallback((persistUntilResume = true) => {
    clearScreenRestoreTimer();
    setScreenBlacked(true);

    if (!persistUntilResume) {
      screenRestoreTimerRef.current = window.setTimeout(() => {
        setScreenBlacked(false);
        screenRestoreTimerRef.current = null;
      }, 1500);
    }
  }, [clearScreenRestoreTimer]);

  const registerSecurityViolation = useCallback((persistUntilResume = true) => {
    triggerSecurityOverlay(persistUntilResume);
    setTabSwitchCount((prev) => prev + 1);
    setTabSwitchWarning(true);
  }, [triggerSecurityOverlay]);

  if (!testData) {
    return <Navigate to="/dashboard" replace />;
  }

  const testType = testData.test_info.type;
  const isTrial = testType === 'TRIAL';

  // ——— Anti-cheat for ALL tests (desktop + mobile) ———
  useEffect(() => {
    const preventEvent = (e: Event) => { e.preventDefault(); };

    const preventShortcuts = (e: KeyboardEvent) => {
      const normalizedKey = e.key.toLowerCase();
      const normalizedCode = e.code.toLowerCase();
      const isPrimaryModifierPressed = e.ctrlKey || e.metaKey;
      const isScreenshotShortcut =
        e.key === 'PrintScreen' ||
        e.code === 'PrintScreen' ||
        e.key === 'Snapshot' ||
        e.code === 'Snapshot' ||
        (e.metaKey && e.shiftKey && ['digit3', 'digit4', 'digit5'].includes(normalizedCode));

      if (isPrimaryModifierPressed && ['c', 'v', 'x', 'p', 's', 'a', 'u'].includes(normalizedKey)) {
        e.preventDefault();
      }

      if (isScreenshotShortcut) {
        e.preventDefault();
        registerSecurityViolation(false);
        navigator.clipboard?.writeText('').catch(() => {});
      }

      if (e.key === 'F12') e.preventDefault();
      if (isPrimaryModifierPressed && e.shiftKey && ['i', 'j', 'c'].includes(normalizedKey)) {
        e.preventDefault();
      }
      if (e.altKey && e.key === 'Tab') e.preventDefault();
      if (isTrial && e.key === 'Escape') e.preventDefault();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerSecurityViolation();
      }
    };

    const handleBlur = () => {
      registerSecurityViolation();
    };

    const handlePageHide = () => {
      registerSecurityViolation();
    };

    // Mobile: block long-press context menu via touch
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    const handleTouchStart = (e: TouchEvent) => {
      longPressTimer = setTimeout(() => {
        e.preventDefault();
      }, 300);
    };
    const handleTouchEnd = () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    };
    const handleTouchMove = () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    };

    document.addEventListener('copy', preventEvent, true);
    document.addEventListener('cut', preventEvent, true);
    document.addEventListener('paste', preventEvent, true);
    document.addEventListener('contextmenu', preventEvent, true);
    document.addEventListener('selectstart', preventEvent, true);
    document.addEventListener('dragstart', preventEvent, true);
    document.addEventListener('keydown', preventShortcuts, true);
    document.addEventListener('visibilitychange', handleVisibilityChange, true);
    window.addEventListener('blur', handleBlur, true);
    window.addEventListener('pagehide', handlePageHide, true);
    document.addEventListener('freeze', handlePageHide as EventListener, true);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchmove', handleTouchMove);

    // TRIAL only: block back navigation + page close
    let cleanupTrial: (() => void) | null = null;
    if (isTrial) {
      enterFullscreen();

      const handlePopState = () => {
        window.history.pushState({ guard: true }, document.title, window.location.href);
      };
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };

      window.history.pushState({ guard: true }, document.title, window.location.href);
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);

      cleanupTrial = () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }

    return () => {
      clearScreenRestoreTimer();
      document.removeEventListener('copy', preventEvent, true);
      document.removeEventListener('cut', preventEvent, true);
      document.removeEventListener('paste', preventEvent, true);
      document.removeEventListener('contextmenu', preventEvent, true);
      document.removeEventListener('selectstart', preventEvent, true);
      document.removeEventListener('dragstart', preventEvent, true);
      document.removeEventListener('keydown', preventShortcuts, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange, true);
      window.removeEventListener('blur', handleBlur, true);
      window.removeEventListener('pagehide', handlePageHide, true);
      document.removeEventListener('freeze', handlePageHide as EventListener, true);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      cleanupTrial?.();
    };
  }, [clearScreenRestoreTimer, isTrial, enterFullscreen, registerSecurityViolation]);

  // Fullscreen state tracking (TRIAL only)
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
    if (isAnswering || currentReveal || !currentQuestion) return;

    setIsAnswering(true);
    setApiError(null);

    try {
      const reveal = await answerStudentQuestion(token, {
        test_session_id: testData.test_session_id,
        type: testType,
        question_id: currentQuestion.id,
        selected_index: selectedIndex,
      });

      setSelectedAnswers((prev) => ({ ...prev, [currentQuestion.id]: selectedIndex }));
      setRevealedAnswers((prev) => ({ ...prev, [currentQuestion.id]: reveal }));
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Ошибка проверки ответа');
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
      if (isTrial) exitFullscreen();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Ошибка отправки результата');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitTest = () => {
    exitFullscreen();
    navigate('/dashboard');
  };

  const handleGoPrev = () => {
    if (!isFirstQuestion) setCurrentQuestionIndex((prev) => prev - 1);
  };

  const handleGoNext = () => {
    if (!isLastQuestion) setCurrentQuestionIndex((prev) => prev + 1);
  };

  const canGoNext = isTrial ? Boolean(currentReveal) : true;
  const canSubmit = isTrial ? Boolean(currentReveal) : answeredCount === totalQuestions;

  // ——— Result screen ———
  if (submitResult) {
    const scoreColor = submitResult.score >= 70
      ? 'text-emerald-600' : submitResult.score >= 40
      ? 'text-amber-600' : 'text-rose-600';

    const scoreBg = submitResult.score >= 70
      ? 'bg-emerald-50 border-emerald-200' : submitResult.score >= 40
      ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200';

    const scoreIconBg = submitResult.score >= 70
      ? 'bg-emerald-100 text-emerald-600' : submitResult.score >= 40
      ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600';

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-50 px-4">
        <div className="mx-auto max-w-md w-full rounded-2xl sm:rounded-[32px] border bg-white p-6 sm:p-8 text-center shadow-[0_22px_65px_-38px_rgba(15,23,42,0.4)]">
          <div className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full ${scoreIconBg}`}>
            {submitResult.score >= 70
              ? <CheckCircle2 className="h-8 w-8" />
              : <XCircle className="h-8 w-8" />}
          </div>

          <h2 className="mt-5 text-2xl sm:text-3xl font-bold text-slate-950">
            {localizeUi(student?.language, 'Тест завершён', 'Тест аяктады')}
          </h2>

          <div className={`mt-4 mx-auto max-w-[200px] rounded-2xl border p-4 ${scoreBg}`}>
            <p className={`text-4xl font-black ${scoreColor}`}>{submitResult.score}%</p>
            <p className="mt-1 text-xs text-slate-500">
              {localizeUi(student?.language, 'результат', 'жыйынтык')}
            </p>
          </div>

          <div className="mt-4 space-y-1.5 text-sm text-slate-600">
            <p>
              {localizeUi(student?.language, 'Правильных', 'Туура жооптор')}: <span className="font-bold text-emerald-600">{submitResult.correct}</span> / {submitResult.total}
            </p>
            <p>
              {localizeUi(student?.language, 'Отвечено', 'Жооп берилди')}: <span className="font-bold text-slate-900">{submitResult.answered}</span> / {submitResult.total}
            </p>
            {tabSwitchCount > 0 && (
              <p className="text-amber-600 font-medium">
                {localizeUi(student?.language, `Переключений вкладки: ${tabSwitchCount}`, `Башка вкладкага өтүү: ${tabSwitchCount}`)}
              </p>
            )}
          </div>

          <button
            onClick={handleExitTest}
            className="mt-6 w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-8 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            {localizeUi(student?.language, 'На главную', 'Башкы бетке')}
          </button>
        </div>
      </div>
    );
  }

  // ——— Test UI ———
  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[9999] overflow-auto bg-white font-sans text-stone-900 ${isTrial ? 'bg-slate-50' : ''}`}
      style={{
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        touchAction: 'manipulation',
      } as React.CSSProperties}
    >
      {/* Exit confirmation for MAIN test */}
      {showExitConfirm && !isTrial && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-3xl bg-white p-6 sm:p-8 text-center shadow-2xl">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <LogOut className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">
              {localizeUi(student?.language, 'Выйти из теста?', 'Тесттен чыгасызбы?')}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {localizeUi(student?.language, 'Прогресс не будет сохранён.', 'Жүрүш сакталбайт.')}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 h-11 rounded-xl border-2 border-stone-200 text-sm font-bold text-stone-700 hover:bg-stone-50 transition-colors"
              >
                {localizeUi(student?.language, 'Остаться', 'Калуу')}
              </button>
              <button
                onClick={handleExitTest}
                className="flex-1 h-11 rounded-xl bg-rose-600 text-sm font-bold text-white hover:bg-rose-700 transition-colors"
              >
                {localizeUi(student?.language, 'Выйти', 'Чыгуу')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab switch warning */}
      {tabSwitchWarning && (
        <div className="fixed inset-0 z-[10004] flex items-center justify-center bg-black/70 backdrop-blur-sm">
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
                'Вы покинули окно теста. Это было зафиксировано. Не переключайтесь на другие вкладки и приложения во время теста.',
                'Сиз тест терезесинен чыктыңыз. Бул жазылды. Тест учурунда башка өтмөктөргө жана колдонмолорго өтпөңүз.',
              )}
            </p>
            <p className="mt-2 text-xs text-amber-600 font-medium">
              {localizeUi(student?.language, `Переключений: ${tabSwitchCount}`, `Өтүүлөр: ${tabSwitchCount}`)}
            </p>
            <button
              onClick={() => { clearScreenRestoreTimer(); setTabSwitchWarning(false); setScreenBlacked(false); if (isTrial) enterFullscreen(); }}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              {localizeUi(student?.language, 'Продолжить тест', 'Тестти улантуу')}
            </button>
          </div>
        </div>
      )}

      {/* Screenshot blackout overlay */}
      {screenBlacked && (
        <div className="fixed inset-0 z-[10003] bg-black" />
      )}

      {/* Watermark overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden"
        aria-hidden="true"
        style={{ opacity: 0.06 }}
      >
        <div className="absolute inset-0 -rotate-[25deg] scale-150 origin-center">
          <div className="flex flex-col items-center justify-center gap-12 pt-8">
            {Array.from({ length: 6 }).map((_, row) => (
              <div key={row} className="flex items-center gap-16" style={{ marginLeft: row % 2 === 0 ? 0 : -80 }}>
                {Array.from({ length: 5 }).map((_, col) => (
                  <svg key={col} width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <text x="100" y="110" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="120" fill="#000" letterSpacing="-4">
                      AZ
                    </text>
                    <path d="M60 30 Q100 10 140 30" stroke="#dc2626" strokeWidth="6" fill="none" strokeLinecap="round" />
                    <path d="M130 25 L140 30 L132 37" stroke="#dc2626" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M60 130 Q100 150 140 130" stroke="#dc2626" strokeWidth="6" fill="none" strokeLinecap="round" />
                    <path d="M70 135 L60 130 L68 123" stroke="#dc2626" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TRIAL: Fullscreen prompt */}
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
                'Для прохождения теста необходимо включить полноэкранный режим.',
                'Тесттен өтүү үчүн толук экран режимин иштетүү зарыл.',
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
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          {isTrial ? (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-rose-400">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {localizeUi(student?.language, 'Сынамык режим', 'Сынамык режими')}
            </div>
          ) : (
            <button
              onClick={() => setShowExitConfirm(true)}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-400 hover:text-stone-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {localizeUi(student?.language, 'Выйти', 'Чыгуу')}
            </button>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            {tabSwitchCount > 0 && (
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
