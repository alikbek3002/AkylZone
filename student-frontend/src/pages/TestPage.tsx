import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  fetchAvailableTests,
  generateStudentTest,
  submitStudentTest,
  type AvailableResponse,
  type GeneratedTestResponse,
  type SubmitTestResponse,
} from '../lib/api';

function normalizeTestType(value: string | undefined): 'MAIN' | 'TRIAL' | null {
  const upper = String(value || '').toUpperCase();
  if (upper === 'MAIN' || upper === 'TRIAL') {
    return upper;
  }
  return null;
}

export default function TestPage() {
  const { id: rawTestType } = useParams();
  const testType = normalizeTestType(rawTestType);
  const { student, token } = useAuthStore();
  const navigate = useNavigate();

  const [availableData, setAvailableData] = useState<AvailableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<number>(1);

  const [testData, setTestData] = useState<GeneratedTestResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitResult, setSubmitResult] = useState<SubmitTestResponse | null>(null);

  // New state: whether the user has answered the current question
  const [answered, setAnswered] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    return student?.language === 'kg' ? 'Пробный тест' : 'Пробный тест';
  }, [student?.language, testType]);

  const handleStart = async () => {
    if (!token || !testType) {
      return;
    }

    setIsGenerating(true);
    setApiError(null);
    try {
      const data = await generateStudentTest(token, {
        type: testType,
        subject: testType === 'MAIN' ? selectedSubject : undefined,
        round: testType === 'TRIAL' ? selectedRound : undefined,
      });
      setTestData(data);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setAnswered(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка генерации теста';
      setApiError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (answered) return; // Lock after answering

    const questionId = testData?.questions[currentQuestionIndex]?.id;
    if (!questionId) return;

    setAnswers((prev) => ({
      ...prev,
      [questionId]: index,
    }));
    setAnswered(true);
  };

  const handleNextQuestion = () => {
    if (!testData) return;
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < testData.questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setAnswered(false);
    }
  };

  const handleSubmit = async () => {
    if (!token || !testData || !testType) {
      return;
    }

    setIsSubmitting(true);
    setApiError(null);
    try {
      const result = await submitStudentTest(token, {
        test_session_id: testData.test_session_id,
        type: testType,
        answers,
      });
      setSubmitResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка отправки результатов';
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Загрузка...</div>;
  }

  if (apiError && !testData && !submitResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          {apiError}
        </div>
      </div>
    );
  }

  if (submitResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-green-600 mb-4">Тест завершен!</h2>
          <p className="text-gray-600">Правильных ответов: {submitResult.correct} из {submitResult.total}</p>
          <p className="text-gray-600 mt-1">Ваш результат: {submitResult.score}%</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full mt-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{setupLabel}</h2>

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
            {isGenerating ? 'Генерация...' : 'Начать тестирование'}
          </button>
        </div>
      </div>
    );
  }

  // ── Active test view ──
  const question = testData.questions[currentQuestionIndex];
  const totalQuestions = testData.questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const selectedAnswer = answers[question?.id];
  const correctIndex = question?.options?.findIndex((o) => o.is_correct) ?? -1;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {testData.test_info.type === 'MAIN'
              ? (student?.language === 'kg' ? 'Предметтик тест' : 'Предметный тест')
              : 'Пробный тест'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Вопрос {currentQuestionIndex + 1} из {totalQuestions}
          </p>
        </div>
        <div className="flex bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm font-mono text-blue-600 font-medium">
          {Object.keys(answers).length}/{totalQuestions}
        </div>
      </header>

      {/* Progress bar */}
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
        {/* Topic badge */}
        {question?.topic && (
          <div className="px-6 md:px-10 pt-4">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
              {question.topic}
            </span>
          </div>
        )}

        {/* Question image */}
        {question?.imageUrl && (
          <div className="px-6 md:px-10 pt-4">
            <img
              src={question.imageUrl}
              alt="Иллюстрация к вопросу"
              className="max-h-64 h-auto w-auto max-w-full rounded-xl border border-gray-200 object-contain"
            />
          </div>
        )}

        {/* Question text */}
        <div className="p-6 md:p-10 border-b border-gray-100">
          <h3 className="text-lg md:text-xl text-gray-900 leading-relaxed font-medium">
            {question?.text || 'Загрузка вопроса...'}
          </h3>
        </div>

        {/* Answer options */}
        <div className="p-6 md:p-10 bg-gray-50/50">
          <div className="flex flex-col gap-3">
            {question?.options?.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === correctIndex;

              let optionClass = 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50';

              if (answered) {
                if (isCorrect) {
                  // Always highlight the correct answer in green
                  optionClass = 'border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500';
                } else if (isSelected && !isCorrect) {
                  // Highlight user's wrong answer in red
                  optionClass = 'border-red-500 bg-red-50 text-red-800 ring-1 ring-red-500';
                } else {
                  // Other options: dim
                  optionClass = 'border-gray-200 bg-gray-50 opacity-50';
                }
              } else if (isSelected) {
                optionClass = 'border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-500';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={answered}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${optionClass} ${answered ? 'cursor-default' : ''
                    }`}
                >
                  <span
                    className={`inline-block w-8 h-8 text-center leading-8 rounded-full border mr-4 font-medium text-sm ${answered && isCorrect
                      ? 'bg-green-500 text-white border-green-500'
                      : answered && isSelected && !isCorrect
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white'
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

        {/* Explanation block (shows after answering) */}
        {answered && (
          <div className="px-6 md:px-10 pb-2 pt-4 bg-gray-50/50">
            <div
              className={`rounded-xl p-5 border ${selectedAnswer === correctIndex
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
                }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-lg ${selectedAnswer === correctIndex ? 'text-green-600' : 'text-red-500'
                    }`}
                >
                  {selectedAnswer === correctIndex ? '✅' : '❌'}
                </span>
                <span
                  className={`font-semibold ${selectedAnswer === correctIndex ? 'text-green-700' : 'text-red-600'
                    }`}
                >
                  {selectedAnswer === correctIndex ? 'Правильно!' : 'Неправильно'}
                </span>
              </div>
              {question?.explanation ? (
                <p className="text-gray-700 text-sm leading-relaxed">
                  <span className="font-medium text-gray-900">Объяснение: </span>
                  {question.explanation}
                </p>
              ) : (
                <p className="text-gray-500 text-sm italic">
                  Правильный ответ: {String.fromCharCode(65 + correctIndex)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="p-6 md:p-10 border-t border-gray-100 flex justify-end items-center bg-white">
          {answered && !isLastQuestion && (
            <button
              onClick={handleNextQuestion}
              className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              Следующий вопрос →
            </button>
          )}

          {answered && isLastQuestion && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {isSubmitting ? 'Отправка...' : 'Завершить тест'}
            </button>
          )}

          {!answered && (
            <p className="text-gray-400 text-sm italic">Выберите ответ, чтобы продолжить</p>
          )}
        </div>
      </main>
    </div>
  );
}
