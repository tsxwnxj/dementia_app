/**
 * 산책 AI 대화 서비스
 * - /api/v1/walk/start : 산책 시작 인사말 (날씨 포함)
 * - /api/v1/walk/chat  : STT(음성) → LLM → 텍스트 응답
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

/** Firebase ID 토큰 획득 */
async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) return 'dev_token';
  return user.getIdToken();
}

/**
 * 실외 산책 시작 — 날씨 기반 AI 인사말 요청
 * @param lat 현재 위도 (선택)
 * @param lon 현재 경도 (선택)
 */
export async function fetchWalkGreeting(
  lat?: number,
  lon?: number,
): Promise<string> {
  const token = await getIdToken();

  const res = await fetch(`${API_BASE}/walk/start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lat: lat ?? null, lon: lon ?? null }),
  });

  if (!res.ok) {
    throw new Error(`walk/start 오류: ${res.status}`);
  }

  const data = await res.json();
  return data.message as string;
}

/**
 * 음성(선택) + 사진(선택)을 서버로 전송 → STT → LLM → 응답 텍스트 반환
 * @param messages 지금까지의 대화 기록
 * @param audioUri  expo-av 녹음 파일 URI (선택)
 * @param imageUri  expo-camera / expo-image-picker 촬영 URI (선택)
 * @param imageMime 이미지 MIME 타입 (기본: image/jpeg)
 */
export async function sendWalkChat(
  messages: ChatMessage[],
  audioUri?: string,
  imageUri?: string,
  imageMime = 'image/jpeg',
): Promise<WalkChatResponse> {
  const token = await getIdToken();

  const form = new FormData();
  form.append('messages', JSON.stringify(messages));

  if (audioUri) {
    const fileName = audioUri.split('/').pop() ?? 'audio.m4a';
    // React Native FormData에서 파일은 { uri, name, type } 객체로 첨부
    form.append('audio', { uri: audioUri, name: fileName, type: 'audio/m4a' } as any);
  }

  if (imageUri) {
    const fileName = imageUri.split('/').pop() ?? 'photo.jpg';
    form.append('image', { uri: imageUri, name: fileName, type: imageMime } as any);
  }

  const res = await fetch(`${API_BASE}/walk/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Content-Type은 FormData가 자동으로 multipart/form-data + boundary 설정
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `walk/chat 오류: ${res.status}`);
  }

  return res.json() as Promise<WalkChatResponse>;
}
