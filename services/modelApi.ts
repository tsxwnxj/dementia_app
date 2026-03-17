import { auth } from './firebase';

const MODEL_API_URL = 'http://172.21.11.171:8000/api/v1';

export interface MotionResult {
  is_correct: boolean;
  score: number;
  feedback: string;
  exercise_type: string;
}

export const analyzeMotion = async (imageUri: string): Promise<MotionResult> => {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다');
  const token = await user.getIdToken();

  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'frame.jpg',
  } as any);

  const response = await fetch(`${MODEL_API_URL}/motion/analyze`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`모델 서버 오류: ${response.status}`);
  }

  return await response.json();
};
