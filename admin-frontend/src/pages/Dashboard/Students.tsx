import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Edit, Trash2, Search, UserPlus, X, Save, Loader2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GenerateStudentModal, type GeneratedStudentPayload } from "@/components/modals/GenerateStudentModal";
import { createStudent, deleteStudent, fetchStudents, updateStudent, type Student } from "@/lib/api";
import { toast } from "sonner";

const PasswordCell = ({ password }: { password: string }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="flex items-center gap-2">
            <span className="font-mono text-sm inline-block w-20">
                {isVisible ? password : "••••••••"}
            </span>
            <button
                onClick={() => setIsVisible(!isVisible)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={isVisible ? "Скрыть пароль" : "Показать пароль"}
            >
                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    );
};

function parseGradeFromClass(classLabel: string) {
    if (classLabel.includes("7")) {
        return 7;
    }
    return 6;
}

function toLanguageCode(language: string): "ru" | "kg" {
    return language.toLowerCase() === "kg" ? "kg" : "ru";
}

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [classFilter, setClassFilter] = useState("all");
    const [languageFilter, setLanguageFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit state
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editForm, setEditForm] = useState({
        fullName: "",
        grade: 6,
        language: "ru" as "ru" | "kg",
        username: "",
        password: "",
    });
    const [editLoading, setEditLoading] = useState(false);
    const [showEditPassword, setShowEditPassword] = useState(false);

    const filteredStudents = useMemo(() => {
        return students.filter((student) => {
            const matchesSearch =
                student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.username.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesClass = classFilter === "all" || student.class === classFilter;
            const matchesLanguage = languageFilter === "all" || student.language === languageFilter;

            return matchesSearch && matchesClass && matchesLanguage;
        });
    }, [students, searchQuery, classFilter, languageFilter]);

    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadStudents = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchStudents();
            setStudents(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Не удалось загрузить учеников";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadStudents();
    }, [loadStudents]);

    const handleGenerateStudent = async (newStudent: GeneratedStudentPayload) => {
        setIsSubmitting(true);
        try {
            const created = await createStudent({
                fullName: newStudent.fullName,
                grade: parseGradeFromClass(newStudent.class),
                language: toLanguageCode(newStudent.language),
                username: newStudent.username,
                password: newStudent.password,
            });
            setStudents((prev) => [created, ...prev]);
            toast.success("Ученик успешно добавлен");
            setIsModalOpen(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Не удалось добавить ученика";
            toast.error(message);
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Вы уверены что хотите удалить ученика?")) {
            try {
                await deleteStudent(id);
                setStudents((prev) => prev.filter((s) => s.id !== id));
                toast.success("Ученик удален");
            } catch (error) {
                const message = error instanceof Error ? error.message : "Не удалось удалить ученика";
                toast.error(message);
            }
        }
    };

    const handleOpenEdit = (student: Student) => {
        setEditingStudent(student);
        setEditForm({
            fullName: student.fullName,
            grade: student.grade,
            language: student.language.toLowerCase() === "kg" ? "kg" : "ru",
            username: student.username,
            password: "",
        });
        setShowEditPassword(false);
    };

    const handleCloseEdit = () => {
        setEditingStudent(null);
    };

    const handleSaveEdit = async () => {
        if (!editingStudent) return;
        setEditLoading(true);
        try {
            const payload: {
                fullName?: string;
                grade?: number;
                language?: string;
                username?: string;
                password?: string;
            } = {};

            if (editForm.fullName !== editingStudent.fullName) {
                payload.fullName = editForm.fullName;
            }
            if (editForm.grade !== editingStudent.grade) {
                payload.grade = editForm.grade;
            }
            const currentLang = editingStudent.language.toLowerCase() === "kg" ? "kg" : "ru";
            if (editForm.language !== currentLang) {
                payload.language = editForm.language;
            }
            if (editForm.username !== editingStudent.username) {
                payload.username = editForm.username;
            }
            if (editForm.password.trim()) {
                payload.password = editForm.password.trim();
            }

            if (Object.keys(payload).length === 0) {
                toast.info("Нет изменений для сохранения");
                handleCloseEdit();
                return;
            }

            const updated = await updateStudent(editingStudent.id, payload);
            setStudents((prev) =>
                prev.map((s) => (s.id === editingStudent.id ? updated : s))
            );
            toast.success("Данные ученика обновлены");
            handleCloseEdit();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Не удалось обновить ученика";
            toast.error(message);
        } finally {
            setEditLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Ученики</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Управление учениками, классами и доступами к платформе.
                    </p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary text-primary-foreground font-medium"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Сгенерировать доступ
                </Button>
            </div>

            <GenerateStudentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onGenerate={handleGenerateStudent}
                isSubmitting={isSubmitting}
            />

            <div className="w-full bg-card rounded-xl border border-border shadow-sm">
                {/* Filters */}
                <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Поиск по ФИО или логину..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-full bg-background"
                        />
                    </div>

                    <div className="flex gap-4 sm:w-auto w-full">
                        <select
                            value={classFilter}
                            onChange={(e) => setClassFilter(e.target.value)}
                            className="px-3 py-2 border border-input rounded-md bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="all">Все классы</option>
                            <option value="Класс 6">6 Класс</option>
                            <option value="Класс 7">7 Класс</option>
                        </select>

                        <select
                            value={languageFilter}
                            onChange={(e) => setLanguageFilter(e.target.value)}
                            className="px-3 py-2 border border-input rounded-md bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="all">Все языки</option>
                            <option value="RU">RU</option>
                            <option value="KG">KG</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/30">
                            <TableHead>ФИО</TableHead>
                            <TableHead>Класс</TableHead>
                            <TableHead>Язык</TableHead>
                            <TableHead>Логин</TableHead>
                            <TableHead>Пароль</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    Загрузка учеников...
                                </TableCell>
                            </TableRow>
                        ) : filteredStudents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    Ученики не найдены
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredStudents.map((student) => (
                                <TableRow key={student.id}>
                                    <TableCell className="font-medium text-foreground">{student.fullName}</TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                                            {student.class}
                                        </span>
                                    </TableCell>
                                    <TableCell>{student.language}</TableCell>
                                    <TableCell className="font-mono text-sm">{student.username}</TableCell>
                                    <TableCell>
                                        <PasswordCell password={student.password} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenEdit(student)}
                                                className="text-muted-foreground hover:text-primary transition-colors h-8 w-8"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(student.id)}
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-8 w-8"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                    <p>
                        Показано {filteredStudents.length} {filteredStudents.length === 1 ? 'ученик' : 'учеников'}
                    </p>
                </div>
            </div>

            {/* Edit Student Modal */}
            {editingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <h3 className="text-lg font-bold">Редактирование ученика</h3>
                            <button
                                onClick={handleCloseEdit}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-2">
                                <Label>ФИО</Label>
                                <Input
                                    value={editForm.fullName}
                                    onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                                    placeholder="Полное имя ученика"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Класс</Label>
                                    <div className="flex gap-2">
                                        {[6, 7].map((g) => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setEditForm((p) => ({ ...p, grade: g }))}
                                                className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${editForm.grade === g
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : 'border-border bg-card hover:border-primary/50'
                                                    }`}
                                            >
                                                {g} класс
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Язык</Label>
                                    <div className="flex gap-2">
                                        {([{ id: "ru", label: "Русский" }, { id: "kg", label: "Кыргыз" }] as const).map((l) => (
                                            <button
                                                key={l.id}
                                                type="button"
                                                onClick={() => setEditForm((p) => ({ ...p, language: l.id }))}
                                                className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-xs sm:text-sm font-medium transition-all truncate ${editForm.language === l.id
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : 'border-border bg-card hover:border-primary/50'
                                                    }`}
                                            >
                                                {l.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Логин</Label>
                                <Input
                                    value={editForm.username}
                                    onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                                    placeholder="Логин ученика"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Новый пароль</Label>
                                    <button
                                        type="button"
                                        onClick={() => setShowEditPassword(!showEditPassword)}
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showEditPassword ? "Скрыть" : "Показать"}
                                    </button>
                                </div>
                                <Input
                                    type={showEditPassword ? "text" : "password"}
                                    value={editForm.password}
                                    onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                                    placeholder="Оставьте пустым, чтобы не менять"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Если оставить пустым, пароль не изменится.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-border">
                            <Button
                                variant="secondary"
                                onClick={handleCloseEdit}
                                className="flex-1"
                            >
                                Отмена
                            </Button>
                            <Button
                                onClick={handleSaveEdit}
                                disabled={editLoading || !editForm.fullName.trim() || !editForm.username.trim()}
                                className="flex-1"
                            >
                                {editLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Сохранение...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Сохранить
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
