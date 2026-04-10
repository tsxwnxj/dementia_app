import { auth } from './firebase';
import {
  signInAnonymously,
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
import { me as getKakaoMe, login as kakaoLogin } from '@react-native-kakao/user';

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
// 카카오 로그인은 Firebase Custom Token 없이는 Firebase Auth와 직접 연동 불가
// 현재 구현: 카카오 인증 후 익명 Firebase 계정 생성 + 카카오 프로필을 SecureStore에 저장
// 완전한 Firebase 연동이 필요하면 Firebase Functions으로 Custom Token 발급 필요
export const signInWithKakao = async (): Promise<User> => {
  await kakaoLogin();
  const profile = await getKakaoMe();
  const kakaoId = String(profile.id ?? "");
  const kakaoNickname = (profile as any).kakaoAccount?.profile?.nickname ?? (profile as any).nickname ?? "";

  const result = await signInAnonymously(auth);
  await SecureStore.setItemAsync('user_uid', result.user.uid);
  await SecureStore.setItemAsync('kakao_id', kakaoId);
  await SecureStore.setItemAsync('kakao_nickname', kakaoNickname);
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
