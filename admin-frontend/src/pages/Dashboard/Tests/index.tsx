import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { addQuestion, uploadImage } from "@/lib/api";

export default function TestsPage() {
    const [loading, setLoading] = useState(false);
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
        correctOption: 'A'
    });
    const [imageUrl, setImageUrl] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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

            toast.success('Вопрос успешно добавлен!');
            // Reset form
            setFormData(prev => ({
                ...prev,
                questionText: '',
                topic: '',
                explanation: '',
                optionA: '',
                optionB: '',
                optionC: '',
                optionD: '',
                correctOption: 'A'
            }));
            setImageUrl('');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Сетевая ошибка';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Управление тестами</h1>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Добавить новый вопрос в банк</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Предмет</Label>
                                <Select value={formData.subject} onValueChange={(v) => handleInputChange('subject', v)}>
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
                                <Select value={formData.language} onValueChange={(v) => handleInputChange('language', v)}>
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
                                <Select value={formData.grade} onValueChange={(v) => handleInputChange('grade', v)}>
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
                                onChange={(e) => handleInputChange('topic', e.target.value)}
                                placeholder="Например: Дроби, Падежи, Past Simple..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Текст вопроса</Label>
                            <Input
                                required
                                value={formData.questionText}
                                onChange={(e) => handleInputChange('questionText', e.target.value)}
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
                            {isUploading && <p className="text-sm text-gray-500">Загрузка...</p>}
                            {imageUrl && (
                                <div className="mt-2">
                                    <img src={imageUrl} alt="Предпросмотр" className="max-h-48 object-contain rounded-md border" />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Вариант А</Label>
                                <Input required value={formData.optionA} onChange={(e) => handleInputChange('optionA', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Вариант B</Label>
                                <Input required value={formData.optionB} onChange={(e) => handleInputChange('optionB', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Вариант C</Label>
                                <Input required value={formData.optionC} onChange={(e) => handleInputChange('optionC', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Вариант D</Label>
                                <Input required value={formData.optionD} onChange={(e) => handleInputChange('optionD', e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Правильный ответ</Label>
                            <Select value={formData.correctOption} onValueChange={(v) => handleInputChange('correctOption', v)}>
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
                                onChange={(e) => handleInputChange('explanation', e.target.value)}
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
        </div>
    );
}
