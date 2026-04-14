import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

export const kakaoCreateCustomToken = onCall({ invoker: 'public' }, async (request) => {
  const { accessToken } = request.data;

  if (!accessToken) {
    throw new HttpsError('invalid-argument', 'accessToken이 필요합니다');
  }

  const kakaoResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const kakaoId = String(kakaoResponse.data.id);
  const nickname = kakaoResponse.data.kakao_account?.profile?.nickname ?? '';

  const uid = `kakao:${kakaoId}`;
  const customToken = await admin.auth().createCustomToken(uid, { nickname });

  return { customToken, uid, nickname };
});
