/**
 * 산책 AI 대화 서비스
 * - /api/v1/walk/start : 산책 시작 인사말 (날씨 포함)
 * - /api/v1/walk/chat  : 텍스트 입력 → LLM → 텍스트 응답
 *                        (음성 STT는 OPENAI_API_KEY 활성화 후 사용 가능)
 */

import { auth } from './firebase';

const API_BASE = process.env.EXPO_PUBLIC_MODEL_API_URL ?? 'http://localhost:8000/api/v1';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WalkChatResponse {
  user_text: string | null;
  ai_text: string;
}

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) return 'dev_token';
  return user.getIdToken();
}

/** 실외 산책 시작 — 날씨 기반 AI 인사말 요청 */
export async function fetchWalkGreeting(lat?: number, lon?: number): Promise<string> {
  const token = await getIdToken();
  const res = await fetch(`${API_BASE}/walk/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: lat ?? null, lon: lon ?? null }),
  });
  if (!res.ok) throw new Error(`walk/start 오류: ${res.status}`);
  return (await res.json()).message as string;
}

/**
 * 텍스트 입력 + 사진(선택) → LLM → 응답 텍스트 반환
 * @param messages  대화 기록
 * @param userText  사용자가 입력한 텍스트
 * @param imageUri  촬영 사진 URI (선택)
 * @param imageMime 이미지 MIME 타입 (기본: image/jpeg)
 */
export async function sendWalkChat(
  messages: ChatMessage[],
  userText?: string,
  imageUri?: string,
  imageMime = 'image/jpeg',
): Promise<WalkChatResponse> {
  const token = await getIdToken();

  const form = new FormData();
  form.append('messages', JSON.stringify(messages));

  if (userText) {
    form.append('text', userText);
  }

  if (imageUri) {
    const fileName = imageUri.split('/').pop() ?? 'photo.jpg';
    form.append('image', { uri: imageUri, name: fileName, type: imageMime } as any);
  }

  const res = await fetch(`${API_BASE}/walk/chat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `walk/chat 오류: ${res.status}`);
  }

  return res.json() as Promise<WalkChatResponse>;
}
