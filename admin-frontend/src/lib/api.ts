import { useAdminAuthStore } from '@/store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiErrorPayload {
  error?: string;
}

export interface AdminIdentity {
  username: string;
}

export interface Student {
  id: string;
  fullName: string;
  grade: number;
  class: string;
  language: string;
  username: string;
  password: string;
  createdAt: string;
}

interface StudentsResponse {
  students: Student[];
}

interface StudentResponse {
  student: Student;
}

interface LoginResponse {
  token: string;
  admin: AdminIdentity;
}

interface CreateStudentPayload {
  fullName: string;
  grade: number;
  language: 'ru' | 'kg';
  username?: string;
  password?: string;
}

interface AddQuestionPayload {
  subject: 'math' | 'logic' | 'history' | 'english' | 'russian' | 'kyrgyz';
  language: 'ru' | 'kg';
  grade: number;
  questionText: string;
  options: Array<{ text: string; is_correct: boolean }>;
  topic?: string;
  explanation?: string;
  imageUrl?: string;
}

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function request<T>(
  path: string,
  method: RequestMethod,
  payload?: unknown,
  requireAuth = true,
): Promise<T> {
  const token = useAdminAuthStore.getState().token;
  if (requireAuth && !token) {
    throw new Error('Не выполнен вход администратора');
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (requireAuth && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

  const text = await response.text();
  let data: ApiErrorPayload | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as ApiErrorPayload;
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    const errorMessage =
      (data && typeof data === 'object' && 'error' in data && data.error) ||
      `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return data as T;
}

export function adminLogin(username: string, password: string) {
  return request<LoginResponse>(
    '/admin/login',
    'POST',
    { username, password },
    false,
  );
}

export async function fetchStudents() {
  const response = await request<StudentsResponse>('/admin/students', 'GET');
  return response.students;
}

export async function createStudent(payload: CreateStudentPayload) {
  const response = await request<StudentResponse>('/admin/students', 'POST', payload);
  return response.student;
}

export function deleteStudent(studentId: string) {
  return request<null>(`/admin/students/${studentId}`, 'DELETE');
}

export function addQuestion(payload: AddQuestionPayload) {
  return request('/admin/questions', 'POST', payload);
}

export async function uploadImage(file: File): Promise<{ imageUrl: string }> {
  const token = useAdminAuthStore.getState().token;
  if (!token) {
    throw new Error('Не выполнен вход администратора');
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/admin/upload-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `Upload failed with status ${response.status}`);
  }

  return data;
}
