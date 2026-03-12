import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  Loader2,
  Search,
  ImagePlus,
  X,
  CheckCircle2,
  XCircle,
  Save,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { MathToolbar } from '@/components/MathToolbar';
import { VisualMathModal } from '@/components/VisualMathModal';
import {
  addQuestion,
  fetchQuestions,
  updateQuestion,
  deleteQuestion,
  uploadImage,
  type Question,
} from '@/lib/api';

const SUBJECTS = [
  { id: 'mathlogic', label: 'Математика и Логика' },
  { id: 'history', label: 'История' },
  { id: 'russian', label: 'Русский язык' },
  { id: 'kyrgyz', label: 'Кыргызский язык' },
  { id: 'english', label: 'Английский язык' },
];

const QUESTION_TYPES = [
  { id: 'math', label: 'Математика' },
  { id: 'logic', label: 'Логика' },
];

const LANGUAGES = [
  { id: 'ru', label: 'Русский' },
  { id: 'kg', label: 'Кыргызский' },
];

const ALL_GRADES = [
  { id: 5, label: '5 класс' },
  { id: 6, label: '6 класс' },
  { id: 7, label: '7 класс' },
];

const MATHLOGIC_GRADES = [
  { id: 6, label: '6 класс' },
  { id: 7, label: '7 класс' },
];

type View = 'filters' | 'list' | 'add' | 'edit';

export default function TestsPage() {
  // Filter state
  const [subject, setSubject] = useState('mathlogic');
  const [language, setLanguage] = useState('ru');
  const [grade, setGrade] = useState(6);
  const [questionType, setQuestionType] = useState('');  // '' = all, 'math', 'logic'

  // View state
  const [view, setView] = useState<View>('filters');

  // Questions list
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit form
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    questionText: '',
    topic: '',
    explanation: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    imageUrl: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Visual Math Editor State
  const [mathModalOpen, setMathModalOpen] = useState(false);
  const [mathModalTargetField, setMathModalTargetField] = useState<keyof typeof formData | null>(null);

  const GRADES = subject === 'mathlogic' ? MATHLOGIC_GRADES : ALL_GRADES;
  const subjectLabel = SUBJECTS.find((s) => s.id === subject)?.label ?? subject;
  const languageLabel = LANGUAGES.find((l) => l.id === language)?.label ?? language;
  const gradeLabel = GRADES.find((g) => g.id === grade)?.label ?? `${grade} класс`;
  const questionTypeLabel = QUESTION_TYPES.find((t) => t.id === questionType)?.label ?? '';

  const loadQuestions = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await fetchQuestions(subject, language, grade, subject === 'mathlogic' && questionType ? questionType : undefined);
      setQuestions(data.questions);
      setTotalCount(data.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка загрузки вопросов');
    } finally {
      setListLoading(false);
    }
  }, [subject, language, grade, questionType]);

  // Load questions when entering list view
  useEffect(() => {
    if (view === 'list') {
      loadQuestions();
    }
  }, [view, loadQuestions]);

  const resetForm = () => {
    setFormData({
      questionText: '',
      topic: '',
      explanation: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOption: 'A',
      imageUrl: '',
    });
    setEditingQuestion(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setView('add');
  };

  const handleOpenEdit = (q: Question) => {
    const correctIdx = q.options.findIndex((o) => o.is_correct);
    const letters = ['A', 'B', 'C', 'D'];
    setEditingQuestion(q);
    setFormData({
      questionText: q.question_text,
      topic: q.topic || '',
      explanation: q.explanation || '',
      optionA: q.options[0]?.text || '',
      optionB: q.options[1]?.text || '',
      optionC: q.options[2]?.text || '',
      optionD: q.options[3]?.text || '',
      correctOption: letters[correctIdx] || 'A',
      imageUrl: q.image_url || '',
    });
    setView('edit');
  };

  const handleDelete = async (q: Question) => {
    if (!confirm(`Удалить вопрос?\n\n"${q.question_text.slice(0, 80)}..."`)) return;
    try {
      await deleteQuestion(q.id, subject, language, grade);
      toast.success('Вопрос удалён');
      await loadQuestions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка удаления');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const result = await uploadImage(file);
      setFormData((prev) => ({ ...prev, imageUrl: result.imageUrl }));
      toast.success('Изображение загружено');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка загрузки');
    } finally {
      setImageUploading(false);
    }
  };

  const handleInsertMath = (template: string, field: keyof typeof formData) => {
    setFormData((prev) => {
      const currentVal = prev[field];
      return { ...prev, [field]: currentVal + ' ' + template + ' ' };
    });
  };

  const openVisualMathEditor = (field: keyof typeof formData) => {
    setMathModalTargetField(field);
    setMathModalOpen(true);
  };

  const handleVisualMathInsert = (latex: string) => {
    if (mathModalTargetField) {
      setFormData((prev) => {
        const currentVal = prev[mathModalTargetField];
        // Если поле пустое, просто вставляем, иначе добавляем через пробел
        const newVal = currentVal.trim() ? currentVal + ' ' + latex : latex;
        return { ...prev, [mathModalTargetField]: newVal };
      });
    }
  };

  const buildOptions = () => [
    { text: formData.optionA, is_correct: formData.correctOption === 'A' },
    { text: formData.optionB, is_correct: formData.correctOption === 'B' },
    { text: formData.optionC, is_correct: formData.correctOption === 'C' },
    { text: formData.optionD, is_correct: formData.correctOption === 'D' },
  ];

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload: any = {
        subject: subject as any,
        language: language as 'ru' | 'kg',
        grade,
        questionText: formData.questionText,
        options: buildOptions(),
        topic: formData.topic,
        explanation: formData.explanation,
        imageUrl: formData.imageUrl,
      };
      // Add questionType for mathlogic
      if (subject === 'mathlogic') {
        payload.questionType = questionType || 'math';
      }
      await addQuestion(payload);
      toast.success('Вопрос добавлен');
      resetForm();
      setView('list');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка добавления');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setFormLoading(true);
    try {
      const payload: any = {
        subject,
        language,
        grade,
        questionText: formData.questionText,
        options: buildOptions(),
        topic: formData.topic,
        explanation: formData.explanation,
        imageUrl: formData.imageUrl,
      };
      // Add questionType for mathlogic
      if (subject === 'mathlogic') {
        payload.questionType = questionType || editingQuestion?.question_type || 'math';
      }
      await updateQuestion(editingQuestion.id, payload);
      toast.success('Вопрос обновлён');
      resetForm();
      setView('list');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка обновления');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredQuestions = searchQuery
    ? questions.filter(
      (q) =>
        q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.topic && q.topic.toLowerCase().includes(searchQuery.toLowerCase())),
    )
    : questions;

  // ─── FILTER VIEW (Step 1: select subject, language, grade) ────────────────

  if (view === 'filters') {
    return (
      <div className="space-y-8 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Банк вопросов</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Выберите предмет, язык и класс чтобы просмотреть и редактировать вопросы.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Предмет</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SUBJECTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSubject(s.id);
                      // Reset grade to 6 when switching to mathlogic (no 5th grade)
                      if (s.id === 'mathlogic' && grade === 5) {
                        setGrade(6);
                      }
                    }}
                    className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${subject === s.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card hover:border-primary/50'
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {subject === 'mathlogic' && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">Тип вопроса</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setQuestionType('')}
                    className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${questionType === ''
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card hover:border-primary/50'
                      }`}
                  >
                    Все
                  </button>
                  {QUESTION_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setQuestionType(t.id)}
                      className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${questionType === t.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card hover:border-primary/50'
                        }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Язык</Label>
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLanguage(l.id)}
                      className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${language === l.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card hover:border-primary/50'
                        }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Класс</Label>
                <div className="grid grid-cols-3 gap-2">
                  {GRADES.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGrade(g.id)}
                      className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${grade === g.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card hover:border-primary/50'
                        }`}
                    >
                      {g.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={() => setView('list')}
              className="w-full h-12 text-base"
            >
              Открыть вопросы
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── ADD / EDIT FORM ──────────────────────────────────────────────────────

  if (view === 'add' || view === 'edit') {
    const isEdit = view === 'edit';
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { resetForm(); setView('list'); }}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Назад к списку
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? 'Редактирование вопроса' : 'Новый вопрос'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subjectLabel} • {languageLabel} • {gradeLabel}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form
              onSubmit={isEdit ? handleSubmitEdit : handleSubmitAdd}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label>Тема</Label>
                <Input
                  value={formData.topic}
                  onChange={(e) => setFormData((p) => ({ ...p, topic: e.target.value }))}
                  placeholder="Например: Дроби, Падежи, Past Simple..."
                />
              </div>

              <div className="space-y-2">
                <Label>Текст вопроса *</Label>
                <div className="text-xs text-muted-foreground mb-1">
                  Поддерживается Markdown и формулы. Для дробей и математики используйте <code>$</code>: например <code>$\frac{1}{2}$</code> или <code>$$x^2 + y^2$$</code>.
                </div>
                <MathToolbar
                  onInsert={(t) => handleInsertMath(t, 'questionText')}
                  onOpenVisualEditor={() => openVisualMathEditor('questionText')}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <textarea
                    required
                    value={formData.questionText}
                    onChange={(e) => setFormData((p) => ({ ...p, questionText: e.target.value }))}
                    placeholder="Введите текст вопроса..."
                    rows={5}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <div className="rounded-md border bg-muted/30 p-3 overflow-auto min-h-[120px]">
                    <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Предпросмотр:</div>
                    <MarkdownRenderer content={formData.questionText || '*Текст вопроса будет здесь*'} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Изображение</Label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
                    <ImagePlus className="h-4 w-4" />
                    {imageUploading ? 'Загрузка...' : 'Выбрать файл'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={imageUploading}
                      className="hidden"
                    />
                  </label>
                  {formData.imageUrl && (
                    <div className="relative">
                      <img
                        src={formData.imageUrl}
                        alt="Превью"
                        className="h-16 w-auto rounded-md border object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, imageUrl: '' }))}
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                  const key = `option${letter}` as keyof typeof formData;
                  const isCorrect = formData.correctOption === letter;
                  return (
                    <div key={letter} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label>Вариант {letter}</Label>
                        <div className="flex items-center gap-2">
                          <MathToolbar
                            onInsert={(t) => handleInsertMath(t, key)}
                            onOpenVisualEditor={() => openVisualMathEditor(key)}
                          />
                          <button
                            type="button"
                            onClick={() => setFormData((p) => ({ ...p, correctOption: letter }))}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${isCorrect
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                          >
                            {isCorrect ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {isCorrect ? 'Правильный' : 'Неправильный'}
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          required
                          value={formData[key]}
                          onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
                          className="flex-1"
                        />
                        <div className="flex items-center justify-center min-w-[100px] max-w-[150px] rounded-md border bg-muted/30 px-2 py-1 text-sm overflow-hidden">
                          <MarkdownRenderer content={formData[key] || '*пусто*'} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label>Объяснение ответа</Label>
                <MathToolbar
                  onInsert={(t) => handleInsertMath(t, 'explanation')}
                  onOpenVisualEditor={() => openVisualMathEditor('explanation')}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <textarea
                    value={formData.explanation}
                    onChange={(e) => setFormData((p) => ({ ...p, explanation: e.target.value }))}
                    placeholder="Объясните, почему этот ответ правильный..."
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <div className="rounded-md border bg-muted/30 p-3 overflow-auto min-h-[100px]">
                    <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Предпросмотр:</div>
                    <MarkdownRenderer content={formData.explanation || '*Объяснение будет здесь*'} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { resetForm(); setView('list'); }}
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={formLoading} className="flex-1">
                  {formLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEdit ? 'Сохраняем...' : 'Добавляем...'}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEdit ? 'Сохранить изменения' : 'Добавить вопрос'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <VisualMathModal
          isOpen={mathModalOpen}
          onClose={() => setMathModalOpen(false)}
          onInsert={handleVisualMathInsert}
        />
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Breadcrumb & header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => setView('filters')}
            className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Выбрать другой предмет
          </button>
          <h1 className="text-2xl font-bold tracking-tight">
            {subjectLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            {languageLabel} • {gradeLabel}{questionTypeLabel ? ` • ${questionTypeLabel}` : ''} • {totalCount} вопросов
          </p>
        </div>

        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Добавить вопрос
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по тексту или теме..."
          className="pl-9"
        />
      </div>

      {/* Loading */}
      {listLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">
              {searchQuery
                ? 'По запросу ничего не найдено'
                : 'В этой таблице пока нет вопросов. Добавьте первый!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q, index) => {
            return (
              <Card key={q.id} className="border-border/70 hover:border-border transition-colors">
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    {/* Number */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                      {index + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {q.topic && (
                            <span className="inline-block mb-1.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              {q.topic}
                            </span>
                          )}
                          {q.question_type && (
                            <span className={`inline-block mb-1.5 ml-1 rounded-md px-2 py-0.5 text-xs font-medium ${q.question_type === 'math'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                              }`}>
                              {q.question_type === 'math' ? 'Математика' : 'Логика'}
                            </span>
                          )}
                          <div className="font-medium text-foreground leading-relaxed">
                            <MarkdownRenderer content={q.question_text} />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEdit(q)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Редактировать"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(q)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Options preview */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {q.options.map((opt, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${opt.is_correct
                              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                              : 'border-border bg-muted/50 text-muted-foreground'
                              }`}
                          >
                            <span className="font-bold">{String.fromCharCode(65 + i)}</span>
                            <span className="inline-block max-w-[200px] truncate align-bottom">
                              <MarkdownRenderer content={opt.text} />
                            </span>
                            {opt.is_correct && <CheckCircle2 className="h-3 w-3" />}
                          </span>
                        ))}
                      </div>

                      {/* Image thumbnail */}
                      {q.image_url && (
                        <div className="mt-3">
                          <img
                            src={q.image_url}
                            alt="img"
                            className="h-12 w-auto rounded-md border object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
