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

export interface TreeLine {
  grade: number;
  required: number;
  available: number;
  label: string;
}

export interface MainTreeItem {
  id: string;
  title: string;
  required_total: number;
  available_total: number;
  status: 'ready' | 'locked';
  lines: TreeLine[];
}

export interface TrialTreeSubject {
  id: string;
  title: string;
  display_name: string;
  required_total: number;
  available_total: number;
  status: 'ready' | 'locked';
  lines: TreeLine[];
}

export interface TrialTreeRound {
  id: number;
  title: string;
  required_total: number;
  available_total: number;
  status: 'ready' | 'locked';
  subjects: TrialTreeSubject[];
}

export interface BranchInfo {
  grade: number;
  language: 'ru' | 'kg';
  title: string;
  class_title: string;
  language_title: string;
}

export interface AvailableMainNode {
  id: 'MAIN';
  title: string;
  status: 'ready' | 'locked';
  items: MainTreeItem[];
}

export interface AvailableTrialNode {
  id: 'TRIAL';
  title: string;
  status: 'ready' | 'locked';
  rounds: TrialTreeRound[];
}

export interface AvailableResponse {
  student: StudentAuthUser;
  branch: BranchInfo;
  test_types: [AvailableMainNode, AvailableTrialNode];
}

export interface GeneratedQuestion {
  id: string;
  text: string;
  options: Array<{ text: string }>;
  topic: string;
  imageUrl: string;
  question_type?: 'math' | 'logic';
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

export interface AnswerQuestionResponse {
  is_correct: boolean;
  correct_index: number;
  explanation: string;
  can_continue: boolean;
  answered_count: number;
  total_questions: number;
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
    grade?: number;
  },
) {
  return request<GeneratedTestResponse>('/tests/generate', 'POST', payload, token);
}

export function answerStudentQuestion(
  token: string,
  payload: {
    test_session_id: string;
    type: 'MAIN' | 'TRIAL';
    question_id: string;
    selected_index: number;
  },
) {
  return request<AnswerQuestionResponse>('/tests/answer', 'POST', payload, token);
}

export function submitStudentTest(
  token: string,
  payload: {
    test_session_id: string;
    type: 'MAIN' | 'TRIAL';
  },
) {
  return request<SubmitTestResponse>('/tests/submit', 'POST', payload, token);
}

export interface ScreenshotViolationResponse {
  action: 'warning' | 'blocked_48h' | 'blocked_permanent';
  strikes: number;
}

export function reportScreenshotViolation(token: string) {
  return request<ScreenshotViolationResponse>('/tests/screenshot-violation', 'POST', {}, token);
}
