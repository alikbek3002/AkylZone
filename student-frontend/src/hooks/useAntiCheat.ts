import { useEffect } from 'react';

interface UseAntiCheatProps {
    onViolation: (reason: string) => void;
    isActive: boolean;
}

export function useAntiCheat({ onViolation, isActive }: UseAntiCheatProps) {
    useEffect(() => {
        if (!isActive) return;

        // 1. Предотвращение копирования, вставки и вырезания
        const preventCopyPaste = (e: ClipboardEvent) => {
            e.preventDefault();
            onViolation('Попытка копирования/вставки текста.');
        };

        // 2. Предотвращение вызова контекстного меню (правый клик)
        const preventContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            onViolation('Попытка вызова контекстного меню.');
        };

        // 3. Отслеживание ухода со страницы (сворачивание, переключение вкладок)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                onViolation('Переключение на другую вкладку или сворачивание окна.');
            }
        };

        // 4. Отслеживание потери фокуса (клик вне окна браузера)
        const handleBlur = () => {
            onViolation('Потеря фокуса окна.');
        };

        // Вешаем слушатели
        document.addEventListener('copy', preventCopyPaste);
        document.addEventListener('cut', preventCopyPaste);
        document.addEventListener('paste', preventCopyPaste);
        document.addEventListener('contextmenu', preventContextMenu);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('copy', preventCopyPaste);
            document.removeEventListener('cut', preventCopyPaste);
            document.removeEventListener('paste', preventCopyPaste);
            document.removeEventListener('contextmenu', preventContextMenu);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, [isActive, onViolation]);

    // Возвращаем стили для запрета выделения текста
    return {
        style: {
            userSelect: 'none',
            WebkitUserSelect: 'none',
            msUserSelect: 'none',
        } as React.CSSProperties
    };
}
