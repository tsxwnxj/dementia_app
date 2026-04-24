import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useFontSize } from '../../context/FontSizeContext';

export default function MinigameScreen() {
  const { fontScale } = useFontSize();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={[styles.backButtonText, { fontSize: 14 * fontScale }]}>{'<'} 뒤로</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { fontSize: 28 * fontScale }]}>🎮 미니게임</Text>
      <Text style={[styles.subtitle, { fontSize: 16 * fontScale }]}>즐기면서 두뇌를 훈련해요!</Text>

      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => router.push('/minigames/wordgame')}
      >
        <Text style={{ fontSize: 40 * fontScale }}>🔤</Text>
        <View style={styles.gameInfo}>
          <Text style={[styles.gameName, { fontSize: 20 * fontScale }]}>영단어 기억 게임</Text>
          <Text style={[styles.gameDesc, { fontSize: 14 * fontScale }]}>단어를 기억하고 알파벳을 맞춰보세요!</Text>
        </View>
      </TouchableOpacity>

      <View style={[styles.gameCard, styles.gameCardDisabled]}>
        <Text style={{ fontSize: 40 * fontScale }}>🧩</Text>
        <View style={styles.gameInfo}>
          <Text style={[styles.gameName, { fontSize: 20 * fontScale, color: '#BDBDBD' }]}>숫자 기억 게임</Text>
          <Text style={[styles.gameDesc, { fontSize: 14 * fontScale }]}>준비 중이에요!</Text>
        </View>
      </View>

      <View style={[styles.gameCard, styles.gameCardDisabled]}>
        <Text style={{ fontSize: 40 * fontScale }}>🎯</Text>
        <View style={styles.gameInfo}>
          <Text style={[styles.gameName, { fontSize: 20 * fontScale, color: '#BDBDBD' }]}>색깔 맞추기</Text>
          <Text style={[styles.gameDesc, { fontSize: 14 * fontScale }]}>준비 중이에요!</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2E7BB', padding: 22, paddingTop: 64 },
  backButton: { marginBottom: 16 },
  backButtonText: { color: '#2D6A4F', fontWeight: '600' },
  title: { fontWeight: '700', color: '#212121', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#666', textAlign: 'center', marginBottom: 32 },
  gameCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  gameCardDisabled: { opacity: 0.5 },
  gameInfo: { flex: 1 },
  gameName: { fontWeight: '700', color: '#212121', marginBottom: 4 },
  gameDesc: { color: '#9E9E9E' },
});