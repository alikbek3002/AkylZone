import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, FlaskConical, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchAvailableTests, type AvailableResponse } from '../lib/api';

function getNodeMeta(typeId: 'MAIN' | 'TRIAL') {
  if (typeId === 'MAIN') {
    return {
      icon: BookOpen,
      accent: 'from-sky-600 via-blue-600 to-indigo-700',
      surface: 'border-sky-200 bg-sky-50/70',
      description: 'Выбор предмета по вашей ветке и запуск строгого предметного теста.',
    };
  }

  return {
    icon: FlaskConical,
    accent: 'from-emerald-600 via-teal-600 to-cyan-700',
    surface: 'border-emerald-200 bg-emerald-50/70',
    description: 'Выбор тура с фиксированной разбивкой по предметам и количествам.',
  };
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 rounded-[28px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_55px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                Ваша ветка
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {availableData?.branch.title || `${student?.grade} класс`}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  После входа доступен только ваш маршрут: сначала выбор типа теста, затем предмета или тура.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  Ученик: <span className="font-medium text-slate-900">{student?.fullName}</span>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  Логин: <span className="font-medium text-slate-900">{student?.username}</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex h-11 items-center justify-center rounded-full border border-red-200 bg-red-50 px-5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              Выйти
            </button>
          </div>
        </header>

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white/85 p-10 text-center text-slate-500 shadow-[0_18px_55px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
            Загружаем вашу ветку тестов...
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-red-700 shadow-[0_18px_55px_-28px_rgba(15,23,42,0.25)]">
            {error}
          </div>
        ) : (
          <main className="grid gap-6 md:grid-cols-2">
            {(availableData?.test_types || []).map((node) => {
              const meta = getNodeMeta(node.id);
              const Icon = meta.icon;

              return (
                <button
                  key={node.id}
                  onClick={() => navigate(`/test/${node.id.toLowerCase()}`)}
                  className="group relative overflow-hidden rounded-[30px] border border-slate-200 bg-white p-6 text-left shadow-[0_22px_60px_-35px_rgba(15,23,42,0.35)] transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.accent}`} />
                  <div className="flex items-start justify-between gap-4">
                    <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl border ${meta.surface}`}>
                      <Icon className="h-7 w-7 text-slate-900" />
                    </div>
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                      node.status === 'ready'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {node.status === 'ready' ? 'Есть доступные ветки' : 'Пока все ветки закрыты'}
                    </div>
                  </div>

                  <div className="mt-8 space-y-3">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-950">{node.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{meta.description}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                      {node.id === 'MAIN'
                        ? `Предметов в ветке: ${node.items.length}`
                        : `Туров в ветке: ${node.rounds.length}`}
                    </div>
                  </div>

                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    Открыть ветку
                    {node.status === 'locked' ? <LockKeyhole className="h-4 w-4" /> : <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                  </div>
                </button>
              );
            })}
          </main>
        )}
      </div>
    </div>
  );
}
