import { auth, app } from './firebase';
import {
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithCustomToken,
  User,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { login as kakaoLogin } from '@react-native-kakao/user';

// ─── Google 설정 ─────────────────────────────────────────────────────────────
// Firebase Console → Authentication → Google 활성화 후
// GoogleService-Info.plist 의 WEB_CLIENT_ID 값을 아래에 입력
// app.json iosUrlScheme 에는 REVERSED_CLIENT_ID 값 입력
GoogleSignin.configure({
  webClientId: '381761400205-es0vjv4cgnam2291628e57e25eg5tf7l.apps.googleusercontent.com',
});

// ─── 익명 로그인 ──────────────────────────────────────────────────────────────
export const signInAnon = async () => {
  const result = await signInAnonymously(auth);
  await SecureStore.setItemAsync('user_uid', result.user.uid);
  return result.user;
};

// ─── Google 로그인 ────────────────────────────────────────────────────────────
export const signInWithGoogle = async (): Promise<User> => {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error('Google ID Token을 가져오지 못했습니다.');
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  await SecureStore.setItemAsync('user_uid', result.user.uid);
  return result.user;
};

// ─── Apple 로그인 ─────────────────────────────────────────────────────────────
// Firebase Console → Authentication → Apple 활성화 필요
// Apple Developer 계정에서 Sign in with Apple 서비스 ID 설정 필요
export const signInWithApple = async (): Promise<User> => {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const { identityToken } = credential;
  if (!identityToken) throw new Error('Apple Identity Token을 가져오지 못했습니다.');
  const provider = new OAuthProvider('apple.com');
  const oauthCredential = provider.credential({ idToken: identityToken });
  const result = await signInWithCredential(auth, oauthCredential);
  await SecureStore.setItemAsync('user_uid', result.user.uid);
  return result.user;
};

// ─── 카카오 로그인 ────────────────────────────────────────────────────────────
export const signInWithKakao = async (): Promise<User> => {
  console.log('[Kakao] 1. kakaoLogin 시작');
  const tokenInfo = await kakaoLogin();
  const accessToken = tokenInfo.accessToken;
  console.log('[Kakao] 2. accessToken 획득:', accessToken?.slice(0, 10) + '...');

  const fns = getFunctions(app, 'us-central1');
  const createToken = httpsCallable<{ accessToken: string }, { customToken: string; uid: string; nickname: string }>(
    fns, 'kakaoCreateCustomToken'
  );

  console.log('[Kakao] 3. Cloud Function 호출 중...');
  let data: { customToken: string; uid: string; nickname: string };
  try {
    const res = await createToken({ accessToken });
    data = res.data;
    console.log('[Kakao] 4. customToken 획득, uid:', data.uid);
  } catch (e: any) {
    console.error('[Kakao] Cloud Function 실패:', e.code, e.message, e.details);
    throw e;
  }

  console.log('[Kakao] 5. signInWithCustomToken 시작');
  try {
    const result = await signInWithCustomToken(auth, data.customToken);
    console.log('[Kakao] 6. 로그인 성공:', result.user.uid);
    await SecureStore.setItemAsync('user_uid', result.user.uid);
    await SecureStore.setItemAsync('kakao_nickname', data.nickname);
    return result.user;
  } catch (e: any) {
    console.error('[Kakao] signInWithCustomToken 실패:', e.code, e.message);
    throw e;
  }
};

// ─── 공통 ──────────────────────────────────────────────────────────────────────
export const signOut = async () => {
  await SecureStore.deleteItemAsync('user_uid');
  await SecureStore.deleteItemAsync('kakao_id');
  await SecureStore.deleteItemAsync('kakao_nickname');
  await firebaseSignOut(auth);
};

export const getCurrentUser = (): User | null => auth.currentUser;

export const onAuthChanged = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);
