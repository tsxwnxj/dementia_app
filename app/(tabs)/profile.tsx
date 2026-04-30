import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { onAuthChanged, signOut } from '../../services/auth';
import { User } from 'firebase/auth';
import { useFontSize } from '../../context/FontSizeContext';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const { fontSize, fontScale, setFontSize } = useFontSize();

  useEffect(() => {
    const unsub = onAuthChanged(setUser);
    return unsub;
  }, []);

  const displayName = user?.displayName || user?.email?.split('@')[0] || '게스트';

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: async () => { await signOut(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: 34 * fontScale }]}>설정</Text>
      <View style={styles.card}>
        <Text style={[styles.cardLabel, { fontSize: 20 * fontScale }]}>계정</Text>
        <Text style={[styles.cardValue, { fontSize: 18 * fontScale }]}>{displayName}</Text>
      </View>

      {/* 글씨 크기 설정 */}
      <View style={styles.fontCard}>
        <Text style={[styles.cardLabel, { fontSize: 20 * fontScale }]}>글씨 크기</Text>
        <View style={styles.buttonGroup}>
          {(['small', 'medium', 'large'] as const).map((size) => (
            <TouchableOpacity
              key={size}
              style={[styles.sizeButton, fontSize === size && styles.sizeButtonActive]}
              onPress={() => setFontSize(size)}
            >
              <Text style={[
                styles.sizeButtonText,
                fontSize === size && styles.sizeButtonTextActive,
                { fontSize: size === 'small' ? 20 : size === 'medium' ? 20 : 20 }
              ]}>
                {size === 'small' ? '작게' : size === 'medium' ? '보통' : '크게'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={[styles.signOutText, { fontSize: 20 * fontScale }]}>로그아웃</Text>
      </TouchableOpacity>
      <Text style={[styles.version, { fontSize: 16 * fontScale }]}>HandFit v1.0.0</Text>
      <Text style={[styles.disclaimer, { fontSize: 15 * fontScale }]}>
        이 앱은 치매 예방을 위한{'\n'}손 협응 운동 보조 도구입니다.{'\n'}
        의료적 진단이나 치료를 대체하지 않습니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFE', padding: 22, paddingTop: 64 },
  title: { fontWeight: '700', color: '#212121', marginBottom: 28 },
 card: { backgroundColor: '#fff', borderRadius: 20, padding: 22, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
  fontCard: { backgroundColor: '#fff', borderRadius: 20, padding: 22, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
  cardLabel: { color: '#424242', fontWeight: '500', marginBottom: 12 },
  cardValue: { color: '#9E9E9E' },
  buttonGroup: { flexDirection: 'row', gap: 12 },
  sizeButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center' },
  sizeButtonActive: { backgroundColor: '#4DA56F' },
  sizeButtonText: { color: '#666', fontWeight: '600' },
  sizeButtonTextActive: { color: '#fff' },
  signOutButton: { marginTop: 28, padding: 20, borderRadius: 36, borderWidth: 2, borderColor: '#EF5350', alignItems: 'center' },
  signOutText: { color: '#EF5350', fontWeight: '700' },
  version: { textAlign: 'center', color: '#BDBDBD', marginTop: 40, marginBottom: 10 },
  disclaimer: { textAlign: 'center', color: '#BDBDBD', lineHeight: 24 },
});