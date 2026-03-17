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
        이 앱은 치매 예방을 위한 손 협응 운동 보조 도구입니다.{'\n'}
        의료적 진단이나 치료를 대체하지 않습니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFE', padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', color: '#212121', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardLabel: { fontSize: 15, color: '#424242', fontWeight: '500' },
  cardValue: { fontSize: 14, color: '#9E9E9E' },
  signOutButton: { marginTop: 24, padding: 16, borderRadius: 30, borderWidth: 1.5, borderColor: '#EF5350', alignItems: 'center' },
  signOutText: { color: '#EF5350', fontSize: 16, fontWeight: '600' },
  version: { textAlign: 'center', color: '#BDBDBD', fontSize: 13, marginTop: 32, marginBottom: 8 },
  disclaimer: { textAlign: 'center', color: '#BDBDBD', fontSize: 12, lineHeight: 18 },
});
