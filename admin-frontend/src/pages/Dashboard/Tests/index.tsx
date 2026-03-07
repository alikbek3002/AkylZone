import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, LockKeyhole } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge-extended';
import { toast } from 'sonner';
import { addQuestion, fetchContentReadiness, uploadImage, type ReadinessBranch } from '@/lib/api';

function ReadinessStatusBadge({ status }: { status: 'ready' | 'locked' }) {
  if (status === 'ready') {
    return (
      <Badge variant="success" appearance="light" className="gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" />
        ready
      </Badge>
    );
  }

  return (
    <Badge variant="warning" appearance="light" className="gap-1.5">
      <LockKeyhole className="h-3.5 w-3.5" />
      locked
    </Badge>
  );
}

function BranchReadinessCard({ branch }: { branch: ReadinessBranch }) {
  const mainNode = branch.test_types.find((node) => node.id === 'MAIN');
  const trialNode = branch.test_types.find((node) => node.id === 'TRIAL');

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-3 border-b border-border/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{branch.branch.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {branch.branch.class_title} • {branch.branch.language_title}
            </p>
          </div>
          <div className="flex gap-2">
            {mainNode ? <ReadinessStatusBadge status={mainNode.status} /> : null}
            {trialNode ? <ReadinessStatusBadge status={trialNode.status} /> : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {mainNode && 'items' in mainNode && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {mainNode.title}
              </h3>
            </div>

            <div className="grid gap-3">
              {mainNode.items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-foreground">{item.title}</div>
                    <ReadinessStatusBadge status={item.status} />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {item.lines.map((line) => (
                      <div key={`${item.id}-${line.grade}`} className="rounded-xl border border-border/60 bg-background p-3 text-sm">
                        <div className="font-medium text-foreground">{line.label}</div>
                        <div className="mt-1 text-muted-foreground">
                          {line.available} / {line.required}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {trialNode && 'rounds' in trialNode && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {trialNode.title}
            </h3>

            <div className="grid gap-3">
              {trialNode.rounds.map((round) => (
                <div key={round.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-foreground">{round.title}</div>
                    <ReadinessStatusBadge status={round.status} />
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {round.subjects.map((subject) => (
                      <div key={`${round.id}-${subject.id}`} className="rounded-xl border border-border/60 bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-foreground">{subject.title}</div>
                          <ReadinessStatusBadge status={subject.status} />
                        </div>
                        <div className="mt-2 space-y-2 text-sm">
                          {subject.lines.map((line) => (
                            <div key={`${round.id}-${subject.id}-${line.grade}`} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                              <div className="font-medium text-foreground">{line.label}</div>
                              <div className="mt-1 text-muted-foreground">
                                {line.available} / {line.required}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

export default function TestsPage() {
  const [loading, setLoading] = useState(false);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [readinessData, setReadinessData] = useState<ReadinessBranch[]>([]);
  const [formData, setFormData] = useState({
    subject: 'math',
    language: 'ru',
    grade: '6',
    questionText: '',
    topic: '',
    explanation: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
  });
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const loadReadiness = async () => {
      setReadinessLoading(true);

      try {
        const branches = await fetchContentReadiness();
        setReadinessData(branches);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки готовности веток';
        toast.error(errorMessage);
      } finally {
        setReadinessLoading(false);
      }
    };

    void loadReadiness();
  }, []);

  const refreshReadiness = async () => {
    try {
      const branches = await fetchContentReadiness();
      setReadinessData(branches);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка обновления готовности веток';
      toast.error(errorMessage);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const options = [
      { text: formData.optionA, is_correct: formData.correctOption === 'A' },
      { text: formData.optionB, is_correct: formData.correctOption === 'B' },
      { text: formData.optionC, is_correct: formData.correctOption === 'C' },
      { text: formData.optionD, is_correct: formData.correctOption === 'D' },
    ];

    try {
      await addQuestion({
        subject: formData.subject as 'math' | 'logic' | 'history' | 'english' | 'russian' | 'kyrgyz',
        language: formData.language as 'ru' | 'kg',
        grade: parseInt(formData.grade, 10),
        questionText: formData.questionText,
        options,
        topic: formData.topic,
        explanation: formData.explanation,
        imageUrl,
      });

      toast.success('Вопрос успешно добавлен');
      setFormData((previous) => ({
        ...previous,
        questionText: '',
        topic: '',
        explanation: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
      }));
      setImageUrl('');
      await refreshReadiness();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Сетевая ошибка';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadImage(file);
      setImageUrl(result.imageUrl);
      toast.success('Изображение загружено');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки изображения';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Готовность дерева</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Статусы строятся из реальных counts в `questions_*`. После внешней загрузки вопросов нужные ветки автоматически откроются.
            </p>
          </div>

          <Button variant="secondary" onClick={() => void refreshReadiness()} disabled={readinessLoading}>
            {readinessLoading ? (
              <>
                <Clock3 className="mr-2 h-4 w-4 animate-spin" />
                Обновляем
              </>
            ) : (
              'Обновить counts'
            )}
          </Button>
        </div>

        {readinessLoading ? (
          <Card className="border-border/70">
            <CardContent className="py-10 text-center text-muted-foreground">
              Загружаем готовность веток...
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {readinessData.map((branch) => (
              <BranchReadinessCard key={branch.branch.title} branch={branch} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Управление тестами</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Форму добавления оставляем рабочей, но основной источник готовности теперь виден выше.
          </p>
        </div>

        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Добавить новый вопрос в банк</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Предмет</Label>
                  <Select value={formData.subject} onValueChange={(value) => handleInputChange('subject', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="math">Математика</SelectItem>
                      <SelectItem value="logic">Логика</SelectItem>
                      <SelectItem value="history">История</SelectItem>
                      <SelectItem value="russian">Русский язык</SelectItem>
                      <SelectItem value="kyrgyz">Кыргызский язык</SelectItem>
                      <SelectItem value="english">Английский язык</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Язык</Label>
                  <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="kg">Кыргызский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Класс (программа)</Label>
                  <Select value={formData.grade} onValueChange={(value) => handleInputChange('grade', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 класс</SelectItem>
                      <SelectItem value="6">6 класс</SelectItem>
                      <SelectItem value="7">7 класс</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Тема</Label>
                <Input
                  value={formData.topic}
                  onChange={(event) => handleInputChange('topic', event.target.value)}
                  placeholder="Например: Дроби, Падежи, Past Simple..."
                />
              </div>

              <div className="space-y-2">
                <Label>Текст вопроса</Label>
                <Input
                  required
                  value={formData.questionText}
                  onChange={(event) => handleInputChange('questionText', event.target.value)}
                  placeholder="Введите текст вопроса..."
                />
              </div>

              <div className="space-y-2">
                <Label>Изображение к вопросу (опционально)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isUploading}
                />
                {isUploading ? <p className="text-sm text-muted-foreground">Загрузка...</p> : null}
                {imageUrl ? (
                  <div className="mt-2">
                    <img src={imageUrl} alt="Предпросмотр" className="max-h-48 rounded-md border object-contain" />
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Вариант A</Label>
                  <Input required value={formData.optionA} onChange={(event) => handleInputChange('optionA', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Вариант B</Label>
                  <Input required value={formData.optionB} onChange={(event) => handleInputChange('optionB', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Вариант C</Label>
                  <Input required value={formData.optionC} onChange={(event) => handleInputChange('optionC', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Вариант D</Label>
                  <Input required value={formData.optionD} onChange={(event) => handleInputChange('optionD', event.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Правильный ответ</Label>
                <Select value={formData.correctOption} onValueChange={(value) => handleInputChange('correctOption', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Вариант A</SelectItem>
                    <SelectItem value="B">Вариант B</SelectItem>
                    <SelectItem value="C">Вариант C</SelectItem>
                    <SelectItem value="D">Вариант D</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Объяснение ответа</Label>
                <textarea
                  value={formData.explanation}
                  onChange={(event) => handleInputChange('explanation', event.target.value)}
                  placeholder="Объясните, почему этот ответ правильный..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Добавление...' : 'Добавить вопрос в базу'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
