import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { MenuSelection } from '../components/ui/magic-menu';
import { BookOpen, FlaskConical } from 'lucide-react';
import { fetchAvailableTests, type AvailableResponse } from '../lib/api';

const DashboardPage = () => {
    const { student, token, logout } = useAuthStore();
    const navigate = useNavigate();
    const [availableData, setAvailableData] = useState<AvailableResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                const message = e instanceof Error ? e.message : 'Ошибка загрузки доступных тестов';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        void fetchTests();
    }, [student, token, navigate]);

    const handleStartTest = (typeId: string) => {
        navigate(`/test/${typeId}`);
    };

    return (
        <div className="min-h-screen bg-neutral-50 px-4 py-8">
            <header className="flex justify-between items-center mb-12 max-w-4xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">Добро пожаловать, {student?.fullName || 'Ученик'}</h1>
                    <p className="text-neutral-500 mt-1">Класс: {student?.grade} | Обучение: {student?.language === 'kg' ? 'Кыргызча' : 'Русский'}</p>
                </div>
                <button
                    onClick={logout}
                    className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors"
                >
                    Выйти
                </button>
            </header>

            <main className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6 justify-center items-stretch mt-20">
                {loading ? (
                    <p className="text-center w-full text-neutral-500 text-lg">Загрузка доступных тестов...</p>
                ) : error ? (
                    <div className="w-full rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
                        {error}
                    </div>
                ) : (
                    <MenuSelection
                        options={(availableData?.test_types || []).map(test => ({
                            id: test.id,
                            title: test.title,
                            description: test.id === 'MAIN' ? 'Полный срез знаний по предмету' : 'Тренировочный тест (туры 1-3)',
                            icon: test.id === 'MAIN' ? <BookOpen className="h-8 w-8" /> : <FlaskConical className="h-8 w-8" />
                        }))}
                        onSelect={handleStartTest}
                    />
                )}
            </main>
        </div>
    );
};

export default DashboardPage;
