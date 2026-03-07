import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StudentAuthUser } from '../lib/api';
import { normalizePortalLanguage, type PortalLanguage } from '../lib/portalI18n';

interface AuthState {
    token: string | null;
    student: StudentAuthUser | null;
    preferredLanguage: PortalLanguage;
    setStudent: (payload: { token: string; student: StudentAuthUser } | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            student: null,
            preferredLanguage: 'ru',
            setStudent: (payload) => set({
                token: payload?.token ?? null,
                student: payload?.student ?? null,
                preferredLanguage: normalizePortalLanguage(payload?.student?.language),
            }),
            logout: () => set((state) => ({
                token: null,
                student: null,
                preferredLanguage: state.preferredLanguage,
            })),
        }),
        {
            name: 'auth-storage', // Данные сохранятся в localStorage 
            storage: createJSONStorage(() => localStorage),
            merge: (persistedState, currentState) => {
                const state = persistedState as Partial<AuthState>;
                const token = state?.token ?? null;
                const student = state?.student ?? null;
                const preferredLanguage = normalizePortalLanguage(state?.preferredLanguage ?? student?.language);

                return {
                    ...currentState,
                    ...state,
                    token,
                    student,
                    preferredLanguage,
                };
            },
        }
    )
);
