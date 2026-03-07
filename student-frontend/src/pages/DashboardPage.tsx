import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { MenuSelection } from '../components/ui/magic-menu';
import { BookOpen, FlaskConical, GraduationCap, Languages, LogOut, Shapes } from 'lucide-react';
import { fetchAvailableTests, type AvailableResponse } from '../lib/api';
import { getPortalCopy } from '../lib/portalI18n';

const DashboardPage = () => {
    const { student, token, logout } = useAuthStore();
    const navigate = useNavigate();
    const [availableData, setAvailableData] = useState<AvailableResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const copy = getPortalCopy(student?.language);

    useEffect(() => {
        if (!student || !token) {
            navigate('/login');
            return;
        }

        const fetchTests = async () => {
            try {
                const data = await fetchAvailableTests(token);
                setAvailableData(data);
            } catch (e) {
                const message = e instanceof Error ? e.message : copy.availableParamsError;
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        void fetchTests();
    }, [copy.availableParamsError, student, token, navigate]);

    const handleStartTest = (typeId: string) => {
        navigate(`/test/${typeId}`);
    };

    const subjectCount = availableData?.subjects.length ?? 0;
    const testCount = availableData?.test_types.length ?? 0;

    return (
        <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-8">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6">
                <header className="overflow-hidden rounded-[30px] border border-slate-200/70 bg-white/90 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.3)] backdrop-blur">
                    <div className="flex flex-col gap-5 border-b border-slate-100 px-5 py-5 sm:px-7 sm:py-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{copy.personalAccount}</p>
                            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                {copy.welcome(student?.fullName || copy.studentFallback)}
                            </h1>
                            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                                {copy.dashboardDescription}
                            </p>
                        </div>

                        <button
                            onClick={logout}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 sm:w-auto"
                        >
                            <LogOut className="h-4 w-4" />
                            {copy.logout}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-4 sm:px-7 sm:py-6">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                                <GraduationCap className="h-4 w-4" />
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.gradeLabel}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{copy.gradeValue(student?.grade ?? 0)}</p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                                <Languages className="h-4 w-4" />
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.languageLabel}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">
                                {copy.languageName(student?.language ?? 'ru')}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                                <Shapes className="h-4 w-4" />
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.subjectsLabel}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{subjectCount}</p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                                <BookOpen className="h-4 w-4" />
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.formatsLabel}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{testCount}</p>
                        </div>
                    </div>
                </header>

                <section className="rounded-[30px] border border-slate-200/70 bg-white/90 px-4 py-5 shadow-[0_24px_72px_-38px_rgba(15,23,42,0.28)] backdrop-blur sm:px-6 sm:py-6">
                    <div className="mb-5 flex flex-col gap-2 sm:mb-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{copy.availableTests}</p>
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{copy.chooseTestFormat}</h2>
                        <p className="text-sm leading-6 text-slate-500 sm:text-base">
                            {availableData?.main_test
                                ? copy.mainProgramSummary(availableData.main_test.grades[0], availableData.main_test.grades[1])
                                : copy.chooseAvailableFormat}
                        </p>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-base text-slate-500">
                            {copy.loadingAvailableTests}
                        </div>
                    ) : error ? (
                        <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 sm:p-6 sm:text-base">
                            {error}
                        </div>
                    ) : (
                        <MenuSelection
                            options={(availableData?.test_types || []).map(test => ({
                                id: test.id,
                                title: test.id === 'MAIN' ? copy.subjectTest : copy.trialTest,
                                description: test.id === 'MAIN'
                                    ? copy.mainTestDescription
                                    : copy.trialTestDescription,
                                icon: test.id === 'MAIN' ? <BookOpen className="h-7 w-7 sm:h-8 sm:w-8" /> : <FlaskConical className="h-7 w-7 sm:h-8 sm:w-8" />
                            }))}
                            onSelect={handleStartTest}
                            ctaLabel={copy.startTestCta}
                        />
                    )}
                </section>
            </div>
        </div>
    );
};

export default DashboardPage;
