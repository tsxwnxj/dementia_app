import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { signInAnon } from '../../services/auth';

export default function LoginScreen() {
  const handleStart = async () => {
    try {
      await signInAnon();
    } catch (e) {
      console.error('로그인 실패:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HandFit</Text>
      <Text style={styles.subtitle}>매일 두 번, 손 건강 지키기</Text>
      <TouchableOpacity style={styles.button} onPress={handleStart}>
        <Text style={styles.buttonText}>시작하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFE', padding: 24 },
  title: { fontSize: 40, fontWeight: '700', color: '#4A90E2', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#757575', marginBottom: 48 },
  button: { backgroundColor: '#4A90E2', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 30 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
