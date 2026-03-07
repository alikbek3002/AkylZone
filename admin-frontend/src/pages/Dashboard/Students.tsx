import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Edit, Trash2, Search, UserPlus } from "lucide-react";
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
import { GenerateStudentModal, type GeneratedStudentPayload } from "@/components/modals/GenerateStudentModal";
import { createStudent, deleteStudent, fetchStudents, type Student } from "@/lib/api";
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
        </div>
    );
}
