import { auth } from './firebase';
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { login as kakaoLogin, me as kakaoMe } from '@react-native-kakao/user';

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
  await kakaoLogin();
  const profile = await kakaoMe();
  const kakaoId = String(profile.id ?? '');
  const nickname = (profile as any).nickname ?? (profile as any).kakaoAccount?.profile?.nickname ?? '';

  // 카카오 ID로 결정론적 이메일/패스워드 생성 → Cloud Functions 없이 동일 계정 보장
  const email = `kakao_${kakaoId}@kakao.dementiaapp.com`;
  const password = `kakao_${kakaoId}_hf2024!`;

  let result;
  try {
    result = await signInWithEmailAndPassword(auth, email, password);
  } catch (e: any) {
    if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-email') {
      result = await createUserWithEmailAndPassword(auth, email, password);
    } else {
      throw e;
    }
  }

  if (nickname && !result.user.displayName) {
    await updateProfile(result.user, { displayName: nickname });
  }
  await SecureStore.setItemAsync('user_uid', result.user.uid);
  return result.user;
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
