import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, XCircle } from 'lucide-react';
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

function getProgressLabel(answered: number, total: number, language: 'ru' | 'kg' | undefined) {
  return localizeUi(language, `Отвечено ${answered} из ${total}`, `${answered} / ${total} жооп берилди`);
}

type RevealState = Record<string, AnswerQuestionResponse>;

export default function TestPage() {
  const { student, token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const testData = location.state?.testData as GeneratedTestResponse | undefined;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<RevealState>({});
  const [submitResult, setSubmitResult] = useState<SubmitTestResponse | null>(null);

  const [isAnswering, setIsAnswering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!testData) {
      navigate('/dashboard', { replace: true });
    }
  }, [testData, navigate]);

  if (!student || !token) {
    return <Navigate to="/login" replace />;
  }

  if (!testData) {
    return null;
  }

  const currentQuestion = testData.questions[currentQuestionIndex] || null;
  const currentReveal = currentQuestion ? revealedAnswers[currentQuestion.id] : undefined;
  const currentSelectedIndex = currentQuestion ? selectedAnswers[currentQuestion.id] : undefined;
  const answeredCount = Object.keys(revealedAnswers).length;
  const totalQuestions = testData.total_questions;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const testType = testData.test_info.type;

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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка отправки результата';
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitResult) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#ecfdf5_0%,_#f8fafc_38%,_#eef2ff_100%)] px-4 py-10">
        <div className="mx-auto max-w-xl rounded-[32px] border border-emerald-200 bg-white p-8 text-center shadow-[0_22px_65px_-38px_rgba(15,23,42,0.4)]">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold text-slate-950">
            {localizeUi(student?.language, 'Тест завершён', 'Тест аяктады')}
          </h2>
          <p className="mt-3 text-slate-600">
            {localizeUi(
              student?.language,
              `Правильных ответов: ${submitResult.correct} из ${submitResult.total}`,
              `Туура жооптор: ${submitResult.correct} / ${submitResult.total}`,
            )}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {localizeUi(student?.language, `Итоговый результат: ${submitResult.score}%`, `Жыйынтык упай: ${submitResult.score}%`)}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            {localizeUi(student?.language, 'Вернуться на главную', 'Башкы бетке кайтуу')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_20%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_55px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                <Sparkles className="h-3.5 w-3.5" />
                {testType === 'MAIN' ? localizeUi(student?.language, 'Предметный тест', 'Предметтик тест') : localizeUi(student?.language, 'Пробный тест', 'Пробный тест')}
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-slate-950">
                {localizeUi(student?.language, 'Вопрос', 'Суроо')} {currentQuestionIndex + 1} / {totalQuestions}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {testType === 'MAIN' ? `Предмет: ${testData.test_info.subject}` : `Тур: ${testData.test_info.round}`}
              </p>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                {getProgressLabel(answeredCount, totalQuestions, student?.language)}
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                {localizeUi(student?.language, 'Прервать тест', 'Тестти токтотуу')}
              </button>
            </div>
          </div>
        </header>

        <div className="mb-6 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-slate-950 transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>

        {apiError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {apiError}
          </div>
        )}

        <main className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_22px_65px_-38px_rgba(15,23,42,0.4)]">
          {currentQuestion?.topic && (
            <div className="border-b border-slate-100 px-6 pt-6 md:px-10">
              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                {currentQuestion.topic}
              </span>
            </div>
          )}

          {currentQuestion?.imageUrl && (
            <div className="border-b border-slate-100 px-6 pt-6 md:px-10">
              <img
                src={currentQuestion.imageUrl}
                alt={localizeUi(student?.language, 'Иллюстрация к вопросу', 'Суроого сүрөт')}
                className="max-h-72 w-auto max-w-full rounded-3xl border border-slate-200 object-contain"
              />
            </div>
          )}

          <div className="border-b border-slate-100 px-6 py-8 md:px-10">
            <h2 className="text-xl font-medium leading-relaxed text-slate-950 md:text-2xl">
              {currentQuestion?.text}
            </h2>
          </div>

          <div className="bg-slate-50/70 px-6 py-6 md:px-10">
            <div className="grid gap-3">
              {currentQuestion?.options.map((option, index) => {
                const isSelected = currentSelectedIndex === index;
                const isCorrect = currentReveal?.correct_index === index;
                const isAnswered = Boolean(currentReveal);

                let optionClassName = 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50';
                let badgeClassName = 'border-slate-200 bg-white text-slate-600';

                if (isAnswered) {
                  if (isCorrect) {
                    optionClassName = 'border-emerald-300 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200';
                    badgeClassName = 'border-emerald-500 bg-emerald-500 text-white';
                  } else if (isSelected) {
                    optionClassName = 'border-rose-300 bg-rose-50 text-rose-900 ring-1 ring-rose-200';
                    badgeClassName = 'border-rose-500 bg-rose-500 text-white';
                  } else {
                    optionClassName = 'border-slate-200 bg-slate-50 text-slate-400';
                    badgeClassName = 'border-slate-200 bg-slate-50 text-slate-400';
                  }
                } else if (isSelected) {
                  optionClassName = 'border-slate-900 bg-slate-50 text-slate-950 ring-1 ring-slate-900/10';
                  badgeClassName = 'border-slate-900 bg-slate-900 text-white';
                }

                return (
                  <button
                    key={`${currentQuestion.id}-${index}`}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={isAnswering || isAnswered}
                    className={`flex w-full items-start gap-4 rounded-[24px] border p-4 text-left transition-colors ${optionClassName}`}
                  >
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${badgeClassName}`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="pt-1 text-sm leading-6 md:text-base">{option.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {currentReveal && (
            <div className={`border-t px-6 py-6 md:px-10 ${currentReveal.is_correct
                ? 'border-emerald-200 bg-emerald-50/70'
                : 'border-amber-200 bg-amber-50/70'
              }`}>
              <div className="flex items-center gap-3">
                {currentReveal.is_correct ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-rose-600" />
                )}
                <div className={`text-sm font-semibold ${currentReveal.is_correct ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                  {currentReveal.is_correct
                    ? localizeUi(student?.language, 'Правильно', 'Туура')
                    : localizeUi(student?.language, 'Неправильно', 'Туура эмес')}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                <p>
                  <span className="font-semibold text-slate-950">
                    {localizeUi(student?.language, 'Правильный вариант:', 'Туура вариант:')}{' '}
                  </span>
                  {String.fromCharCode(65 + currentReveal.correct_index)}
                </p>

                {currentReveal.explanation ? (
                  <p>
                    <span className="font-semibold text-slate-950">
                      {localizeUi(student?.language, 'Объяснение:', 'Түшүндүрмө:')}{' '}
                    </span>
                    {currentReveal.explanation}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-6 py-5 md:flex-row md:items-center md:justify-between md:px-10">
            <div className="text-sm text-slate-500">
              {currentReveal
                ? localizeUi(student?.language, 'Ответ зафиксирован, можно переходить дальше.', 'Жооп бекитилди, кийинкиге өтсөңүз болот.')
                : isAnswering
                  ? localizeUi(student?.language, 'Проверяем ответ...', 'Жоопту текшерип жатабыз...')
                  : localizeUi(student?.language, 'Выберите вариант, чтобы открыть разбор.', 'Түшүндүрмөнү ачуу үчүн вариант тандаңыз.')}
            </div>

            <div className="flex items-center gap-3">
              {!isLastQuestion && (
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  disabled={!currentReveal}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors ${currentReveal
                      ? 'bg-slate-950 text-white hover:bg-slate-800'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500'
                    }`}
                >
                  {localizeUi(student?.language, 'Следующий вопрос', 'Кийинки суроо')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              {isLastQuestion && (
                <button
                  onClick={handleSubmit}
                  disabled={!currentReveal || isSubmitting}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors ${currentReveal && !isSubmitting
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500'
                    }`}
                >
                  {isSubmitting
                    ? localizeUi(student?.language, 'Отправляем', 'Жөнөтүп жатабыз')
                    : localizeUi(student?.language, 'Завершить тест', 'Тестти аяктоо')}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
