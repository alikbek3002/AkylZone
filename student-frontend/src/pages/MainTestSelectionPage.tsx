import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchAvailableTests, generateStudentTest, type AvailableMainNode, type MainTreeItem } from '../lib/api';
import { ArrowLeft, BookOpen, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import logo from '../assets/logo.jpg';

function localizeUi(language: 'ru' | 'kg' | undefined, ruText: string, kgText: string) {
    return language === 'kg' ? kgText : ruText;
}

export default function MainTestSelectionPage() {
    const { student, token } = useAuthStore();
    const navigate = useNavigate();

    const [mainNode, setMainNode] = useState<AvailableMainNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedSubject, setSelectedSubject] = useState<MainTreeItem | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (!token) {
            navigate('/login', { replace: true });
            return;
        }

        const loadCatalog = async () => {
            try {
                setLoading(true);
                const data = await fetchAvailableTests(token);
                const main = data.test_types.find((t) => t.id === 'MAIN') as AvailableMainNode | undefined;
                if (main) {
                    setMainNode(main);
                } else {
                    setError(localizeUi(student?.language, 'Предметные тесты не найдены.', 'Предметтик тесттер табылган жок.'));
                }
            } catch (err: any) {
                setError(err.message || 'Error loading catalog');
            } finally {
                setLoading(false);
            }
        };

        loadCatalog();
    }, [token, navigate, student?.language]);

    const handleStartTest = async () => {
        if (!token || !selectedSubject || !selectedGrade) return;

        try {
            const el = document.documentElement;
            if (el.requestFullscreen) {
                await el.requestFullscreen();
            } else if ((el as any).webkitRequestFullscreen) {
                await (el as any).webkitRequestFullscreen();
            }
        } catch {
            // Fullscreen may not be available
        }

        try {
            setGenerating(true);
            setError(null);
            const testData = await generateStudentTest(token, {
                type: 'MAIN',
                subject: selectedSubject.id,
                grade: selectedGrade,
            });

            navigate(`/test/${testData.test_session_id}`, {
                state: { testData },
            });
        } catch (err: any) {
            setError(err.message || localizeUi(student?.language, 'Не удалось сгенерировать тест', 'Тестти түзүүгө мүмкүн болгон жок'));
            setGenerating(false);
            try { document.exitFullscreen?.(); } catch { }
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans text-stone-900">
            {/* Top bar */}
            <div className="border-b-2 border-stone-100">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-black transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">{localizeUi(student?.language, 'Назад', 'Артка')}</span>
                    </button>
                    <img src={logo} alt="AkylZone" className="h-10 sm:h-14 w-auto" />
                </div>
            </div>

            <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10">
                {/* Title */}
                <div className="mb-8 sm:mb-10">
                    <h1 className="text-2xl sm:text-4xl font-black text-black">
                        {localizeUi(student?.language, 'Выбор предмета', 'Предметти тандоо')}
                    </h1>
                    <p className="mt-2 text-sm sm:text-base text-stone-500 font-medium">
                        {localizeUi(student?.language, 'Выберите предмет и класс, чтобы начать тест.', 'Тестти баштоо үчүн предметти жана классты тандаңыз.')}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-700 border-2 border-red-100">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* Step 1: Subject */}
                <div className="mb-8 sm:mb-10">
                    <h2 className="mb-4 text-base sm:text-lg font-bold text-stone-800">
                        {localizeUi(student?.language, '1. Предмет', '1. Предмет')}
                    </h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                        {mainNode?.items.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setSelectedSubject(item);
                                    setSelectedGrade(null);
                                    setError(null);
                                }}
                                className={`flex flex-col items-center justify-center gap-2 sm:gap-3 rounded-2xl border-2 p-4 sm:p-6 text-center transition-all active:scale-[0.97] ${selectedSubject?.id === item.id
                                    ? 'border-black bg-black text-white'
                                    : 'border-stone-200 bg-white hover:border-stone-400 text-stone-700'
                                    }`}
                            >
                                <BookOpen className={`h-5 w-5 sm:h-6 sm:w-6 ${selectedSubject?.id === item.id ? 'text-stone-400' : 'text-stone-300'}`} />
                                <span className="font-bold text-sm sm:text-base leading-tight">{item.title}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Step 2: Grade */}
                {selectedSubject && (
                    <div className="mb-8 sm:mb-10">
                        <h2 className="mb-4 text-base sm:text-lg font-bold text-stone-800">
                            {localizeUi(student?.language, '2. Класс', '2. Класс')}
                        </h2>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {selectedSubject.lines.map((line) => (
                                <button
                                    key={line.grade}
                                    onClick={() => setSelectedGrade(line.grade)}
                                    className={`flex items-center gap-4 rounded-2xl border-2 p-4 sm:p-5 transition-all active:scale-[0.98] ${selectedGrade === line.grade
                                        ? 'border-black bg-black text-white'
                                        : 'border-stone-200 bg-white hover:border-stone-400'
                                        }`}
                                >
                                    <div className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl font-black text-lg sm:text-xl border-2 ${selectedGrade === line.grade ? 'border-stone-700 bg-stone-800 text-white' : 'border-stone-200 bg-stone-50 text-stone-600'}`}>
                                        {line.grade}
                                    </div>
                                    <div className="text-left">
                                        <div className={`font-bold text-base ${selectedGrade === line.grade ? 'text-white' : 'text-stone-900'}`}>
                                            {line.grade} {localizeUi(student?.language, 'класс', 'класс')}
                                        </div>
                                        <div className={`text-xs sm:text-sm font-medium ${selectedGrade === line.grade ? 'text-stone-400' : 'text-stone-500'}`}>
                                            {line.available} <span className="opacity-50">/ {line.required}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Start */}
                {selectedSubject && selectedGrade && (
                    <div className="pb-8 sm:pb-12">
                        <button
                            onClick={handleStartTest}
                            disabled={generating}
                            className="w-full sm:max-w-sm sm:mx-auto flex h-14 sm:h-16 items-center justify-center gap-3 rounded-2xl bg-black px-8 text-base sm:text-lg font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    {localizeUi(student?.language, 'Создание теста...', 'Тест түзүлүүдө...')}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-5 w-5 text-stone-400" />
                                    {localizeUi(student?.language, 'Начать тест', 'Тестти баштоо')}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
