import { BookOpen, Clock3, FlaskConical, User, GraduationCap, LogOut, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useEffect, useState } from 'react';
import { fetchAvailableTests, type AvailableResponse } from '../lib/api';
import logo from '../assets/logo.jpg';

function localizeUi(language: 'ru' | 'kg' | undefined, ruText: string, kgText: string) {
  return language === 'kg' ? kgText : ruText;
}

export default function DashboardPage() {
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

  const mainNode = availableData?.test_types?.find((n) => n.id === 'MAIN' && 'items' in n);
  const trialNode = availableData?.test_types?.find((n) => n.id === 'TRIAL' && 'rounds' in n);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (student?.language === 'kg') {
      if (hour < 12) return 'Кутман таң';
      if (hour < 18) return 'Кутман күн';
      return 'Кутман кеч';
    }
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  return (
    <div className="min-h-screen bg-white font-sans text-stone-900 selection:bg-stone-200">
      {/* Top bar */}
      <div className="border-b-2 border-stone-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <img src={logo} alt="AkylZone" className="h-16 sm:h-20 w-auto" />
          <button
            onClick={logout}
            className="flex items-center gap-2 text-stone-500 hover:text-red-600 transition-colors font-medium text-sm border-2 border-stone-200 hover:border-red-200 px-3 sm:px-4 py-2 rounded-full"
          >
            <span className="hidden sm:inline">{localizeUi(student?.language, 'Выйти', 'Чыгуу')}</span>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10">

        {/* Profile card */}
        <div className="mb-6 sm:mb-12 rounded-2xl sm:rounded-3xl border-2 border-stone-200 p-4 sm:p-8">
          <p className="text-stone-400 font-medium uppercase tracking-widest text-[10px] sm:text-xs mb-1.5 sm:mb-2">
            {getGreeting()}
          </p>
          <h1 className="text-2xl sm:text-5xl font-black tracking-tight text-black leading-tight">
            {student?.fullName}
          </h1>
          <div className="flex flex-wrap gap-3 sm:gap-6 mt-3 sm:mt-6 text-xs sm:text-sm font-medium text-stone-500">
            <span className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> {student?.grade} {localizeUi(student?.language, 'класс', 'класс')}
            </span>
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" /> {student?.username}
            </span>
          </div>
        </div>

        {/* Tests */}
        {error ? (
          <div className="p-5 border-2 border-red-200 text-red-600 font-medium bg-red-50 rounded-2xl text-sm">{error}</div>
        ) : loading ? (
          <div className="flex items-center gap-4 text-stone-400 font-medium p-6 border-2 border-stone-100 rounded-2xl">
            <Clock3 className="h-5 w-5 animate-spin" />
            {localizeUi(student?.language, 'Загрузка тестов...', 'Тесттер жүктөлүүдө...')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {mainNode && (
              <button
                onClick={() => navigate('/select/main')}
                className="group flex items-center w-full text-left border-2 border-stone-200 hover:border-black rounded-2xl sm:rounded-3xl p-4 sm:p-8 transition-all active:scale-[0.99] gap-3 sm:gap-6 outline-none"
              >
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-black group-hover:bg-black group-hover:text-white transition-colors">
                  <BookOpen className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-2xl font-bold mb-0.5 sm:mb-1 truncate">
                    {localizeUi(student?.language, 'Предметный тест', 'Предметтик тест')}
                  </h2>
                  <p className="text-stone-500 text-xs sm:text-sm leading-relaxed line-clamp-2">
                    {localizeUi(student?.language, 'Тренируйтесь и проверяйте знания по отдельным школьным предметам.', 'Мектеп предметтери боюнча билимиңизди текшерип, машыгыңыз.')}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-stone-300 group-hover:text-black transition-colors" />
              </button>
            )}

            {trialNode && (
              <button
                onClick={() => navigate('/select/trial')}
                className="group flex items-center w-full text-left border-2 border-stone-200 hover:border-black rounded-2xl sm:rounded-3xl p-4 sm:p-8 transition-all active:scale-[0.99] gap-3 sm:gap-6 outline-none"
              >
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-black group-hover:bg-black group-hover:text-white transition-colors">
                  <FlaskConical className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-2xl font-bold mb-0.5 sm:mb-1 truncate">
                    {localizeUi(student?.language, 'Сынамык тест', 'Сынамык тест')}
                  </h2>
                  <p className="text-stone-500 text-xs sm:text-sm leading-relaxed line-clamp-2">
                    {localizeUi(student?.language, 'Пройдите комплексную симуляцию реального экзамена по всем дисциплинам.', 'Бардык сабактар боюнча реалдуу экзамендин комплекстүү симуляциясынан өтүңүз.')}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-stone-300 group-hover:text-black transition-colors" />
              </button>
            )}

            {(!mainNode && !trialNode) && (
              <div className="p-8 text-center text-stone-500 border-2 border-stone-200 border-dashed rounded-2xl">
                {localizeUi(student?.language, 'Нет доступных тестов в данный момент.', 'Учурда жеткиликтүү тесттер жок.')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
