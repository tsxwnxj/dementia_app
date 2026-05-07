/**
 * 산책 AI 대화 서비스
 * - /api/v1/walk/start : 산책 시작 인사말 + session_id 발급
 * - /api/v1/walk/chat  : 텍스트/사진 → LLM → 텍스트 응답
 *
 * session_id는 모듈 내부에서 관리하므로 activewalkscreen에서 별도 처리 불필요.
 * 산책 종료 시 resetSession() 호출.
 */

import { auth } from './firebase';

const API_BASE = process.env.EXPO_PUBLIC_MODEL_API_URL ?? 'http://localhost:8000/api/v1';

// session_id 모듈 레벨 관리 (walk/start 시 설정, resetSession 시 초기화)
let _sessionId: string | null = null;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WalkStartResult {
  message: string;
  session_id: string;
  audio_base64: string | null;
}

export interface WalkChatResponse {
  user_text: string | null;
  raw_stt: string | null;
  ai_text: string;
  audio_base64: string | null;
  corrections: Array<{ original: string; corrected: string; method: string }>;
}

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) return 'dev_token';
  return user.getIdToken();
}

/** 세션 초기화 (산책 종료 시 호출) */
export function resetSession(): void {
  _sessionId = null;
}

/**
 * 산책 세션 종료 — 서버에 종료 신호 전송.
 * 서버가 대화 내용을 LLM으로 요약해 장기 기억에 누적 저장 (백그라운드).
 * 실패해도 앱 동작에 영향 없음.
 */
export async function endWalkSession(): Promise<void> {
  if (!_sessionId) return;

  const sessionId = _sessionId;
  resetSession(); // UI 응답성을 위해 먼저 초기화

  try {
    const token = await getIdToken();
    await fetch(`${API_BASE}/walk/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
  } catch {
    // 네트워크 오류 시 무시 — 다음 세션에 영향 없음
  }
}

/** 실외 산책 시작 — 날씨 기반 AI 인사말 + session_id + TTS 오디오 반환 */
export async function fetchWalkGreeting(lat?: number, lon?: number): Promise<WalkStartResult> {
  const token = await getIdToken();
  const res = await fetch(`${API_BASE}/walk/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: lat ?? null, lon: lon ?? null }),
  });
  if (!res.ok) throw new Error(`walk/start 오류: ${res.status}`);

  const data = await res.json();

  if (data.session_id) {
    _sessionId = data.session_id;
  }

  return {
    message: data.message as string,
    session_id: data.session_id as string,
    audio_base64: data.audio_base64 as string | null,
  };
}

/**
 * 텍스트 + 사진(선택) → LLM → 응답 텍스트 반환
 * @param messages  현재 대화 기록
 * @param userText  사용자 텍스트 입력
 * @param imageUri  사진 URI (선택)
 * @param imageMime 이미지 MIME 타입
 */
export async function sendWalkChat(
  messages: ChatMessage[],
  userText?: string,
  imageUri?: string,
  imageMime = 'image/jpeg',
): Promise<WalkChatResponse> {
  const token = await getIdToken();

  // session_id가 없으면 fallback UUID 생성 (walk/start 실패 시 대비)
  const sessionId = _sessionId ?? _makeUUID();
  if (!_sessionId) _sessionId = sessionId;

  const form = new FormData();
  form.append('messages', JSON.stringify(messages));
  form.append('session_id', sessionId);
  form.append('include_tts', 'true');

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

function _makeUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
