import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { signInWithGoogle, signInWithApple, signInWithKakao } from '../../services/auth';

export default function LoginScreen() {
  const [loading, setLoading] = useState<'google' | 'apple' | 'kakao' | null>(null);

  const handleGoogle = async () => {
    setLoading('google');
    try {
      await signInWithGoogle();
    } catch (e: any) {
      Alert.alert('Google 로그인 실패', e.message ?? '다시 시도해주세요.');
    } finally {
      setLoading(null);
    }
  };

  const handleApple = async () => {
    setLoading('apple');
    try {
      await signInWithApple();
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple 로그인 실패', e.message ?? '다시 시도해주세요.');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleKakao = async () => {
    setLoading('kakao');
    try {
      await signInWithKakao();
    } catch (e: any) {
      Alert.alert('카카오 로그인 실패', e.message ?? '다시 시도해주세요.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HandFit</Text>
      <Text style={styles.subtitle}>매일 두 번, 뇌 건강 지키기</Text>

      <View style={styles.buttonGroup}>
        {/* 카카오 로그인 */}
        <TouchableOpacity
          style={[styles.button, styles.kakaoButton]}
          onPress={handleKakao}
          disabled={loading !== null}
        >
          {loading === 'kakao' ? (
            <ActivityIndicator color="#3C1E1E" />
          ) : (
            <>
              <Text style={[styles.buttonText, styles.kakaoText]}>카카오로 로그인</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Google 로그인 */}
        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={handleGoogle}
          disabled={loading !== null}
        >
          {loading === 'google' ? (
            <ActivityIndicator color="#333" />
          ) : (
            <>
              <Text style={[styles.buttonText, styles.googleText]}>Google로 로그인</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Apple 로그인 (iOS 전용) */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.button, styles.appleButton]}
            onPress={handleApple}
            disabled={loading !== null}
          >
            {loading === 'apple' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={[styles.buttonText, styles.appleText]}>Apple로 로그인</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFE',
    padding: 24,
  },
  title: { fontSize: 45, fontWeight: '700', color: '#4DA56F', marginBottom: 8 },
  subtitle: { fontSize: 20, color: '#757575', marginBottom: 56 },
  buttonGroup: { width: '100%', gap: 12 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  // 카카오
  kakaoButton: { backgroundColor: '#FEE500' },
  kakaoIcon: { fontSize: 18 },
  kakaoText: { color: '#3C1E1E' },
  // Google
  googleButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0' },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  googleText: { color: '#333' },
  // Apple
  appleButton: { backgroundColor: '#000' },
  appleIcon: { fontSize: 20, color: '#fff' },
  appleText: { color: '#fff' },
});
