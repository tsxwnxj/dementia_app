import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

export const kakaoCreateCustomToken = onCall({ invoker: 'public' }, async (request) => {
  const { accessToken } = request.data;

  console.log('[kakao] 1. 함수 진입, accessToken 있음:', !!accessToken);

  if (!accessToken) {
    throw new HttpsError('invalid-argument', 'accessToken이 필요합니다');
  }

  let kakaoId: string;
  let nickname: string;

  try {
    const kakaoResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    kakaoId = String(kakaoResponse.data.id);
    nickname = kakaoResponse.data.kakao_account?.profile?.nickname ?? '';
    console.log('[kakao] 2. 카카오 API 성공, id:', kakaoId);
  } catch (e: any) {
    console.error('[kakao] 2. 카카오 API 실패:', e.message);
    throw new HttpsError('unauthenticated', '카카오 토큰 검증 실패');
  }

  try {
    const uid = `kakao:${kakaoId}`;
    const customToken = await admin.auth().createCustomToken(uid, { nickname });
    console.log('[kakao] 3. customToken 생성 성공');
    return { customToken, uid, nickname };
  } catch (e: any) {
    console.error('[kakao] 3. createCustomToken 실패:', e.code, e.message);
    throw new HttpsError('internal', `토큰 생성 실패: ${e.message}`);
  }
});
