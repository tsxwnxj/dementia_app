import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { auth } from '../../services/firebase';
import { signOut } from '../../services/auth';

export default function ProfileScreen() {
  const user = auth.currentUser;

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: async () => { await signOut(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>설정</Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>계정</Text>
        <Text style={styles.cardValue}>{user?.uid?.slice(0, 8) + '...' ?? '게스트'}</Text>
      </View>
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>로그아웃</Text>
      </TouchableOpacity>
      <Text style={styles.version}>HandFit v1.0.0</Text>
      <Text style={styles.disclaimer}>
        이 앱은 치매 예방을 위한{'\n'}손 협응 운동 보조 도구입니다.{'\n'}
        의료적 진단이나 치료를 대체하지 않습니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFE', padding: 22, paddingTop: 64 },
  title: { fontSize: 34, fontWeight: '700', color: '#212121', marginBottom: 28 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 22, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardLabel: { fontSize: 20, color: '#424242', fontWeight: '500' },
  cardValue: { fontSize: 18, color: '#9E9E9E' },
  signOutButton: { marginTop: 28, padding: 20, borderRadius: 36, borderWidth: 2, borderColor: '#EF5350', alignItems: 'center' },
  signOutText: { color: '#EF5350', fontSize: 20, fontWeight: '700' },
  version: { textAlign: 'center', color: '#BDBDBD', fontSize: 16, marginTop: 40, marginBottom: 10 },
  disclaimer: { textAlign: 'center', color: '#BDBDBD', fontSize: 15, lineHeight: 24 },
});
