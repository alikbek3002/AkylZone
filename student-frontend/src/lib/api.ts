const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiErrorPayload {
  error?: string;
}

export interface StudentAuthUser {
  id: string;
  fullName: string;
  grade: number;
  language: 'ru' | 'kg';
  username: string;
}

export interface StudentLoginResponse {
  token: string;
  student: StudentAuthUser;
}

export interface AvailableSubject {
  id: string;
  name: string;
}

export interface AvailableRoundSubject {
  id: string;
  name: string;
  counts: Record<string, number>;
  total: number;
}

export interface AvailableRound {
  id: number;
  title: string;
  total_questions: number;
  subjects: AvailableRoundSubject[];
}

export interface AvailableResponse {
  student: StudentAuthUser;
  test_types: Array<{ id: 'MAIN' | 'TRIAL'; title: string }>;
  subjects: AvailableSubject[];
  rounds: AvailableRound[];
  main_test: {
    grades: [number, number];
    questions_per_grade: number;
    total_questions: number;
  };
}

export interface GeneratedQuestion {
  id: string;
  text: string;
  options: Array<{ text: string; is_correct: boolean }>;
  topic: string;
  explanation: string;
  imageUrl: string;
}

export interface GeneratedTestResponse {
  test_session_id: string;
  test_info: {
    type: 'MAIN' | 'TRIAL';
    subject: string | null;
    round: number | null;
    language: 'ru' | 'kg';
    grade: number;
    grade_window: [number, number];
  };
  breakdown: Record<string, { total: number; by_grade: Record<string, number> }>;
  total_questions: number;
  questions: GeneratedQuestion[];
}

export interface SubmitTestResponse {
  message: string;
  score: number;
  correct: number;
  answered: number;
  total: number;
}

type RequestMethod = 'GET' | 'POST';

async function request<T>(
  path: string,
  method: RequestMethod,
  payload?: unknown,
  token?: string,
): Promise<T> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

  const raw = await response.text();
  let data: ApiErrorPayload | null = null;
  if (raw) {
    try {
      data = JSON.parse(raw) as ApiErrorPayload;
    } catch {
      data = { error: raw };
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

export function loginStudent(username: string, password: string) {
  return request<StudentLoginResponse>('/tests/login', 'POST', { username, password });
}

export function fetchAvailableTests(token: string) {
  return request<AvailableResponse>('/tests/available', 'GET', undefined, token);
}

export function generateStudentTest(
  token: string,
  payload: {
    type: 'MAIN' | 'TRIAL';
    subject?: string;
    round?: number;
  },
) {
  return request<GeneratedTestResponse>('/tests/generate', 'POST', payload, token);
}

export function submitStudentTest(
  token: string,
  payload: {
    test_session_id: string;
    type: 'MAIN' | 'TRIAL';
    answers: Record<string, number>;
  },
) {
  return request<SubmitTestResponse>('/tests/submit', 'POST', payload, token);
}
