import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFontSize } from '../context/FontSizeContext';
import { Ionicons } from '@expo/vector-icons';

const GESTURES = [
  {
    name: '손가락 움직이기',
    desc: '손가락을 천천히 움직여 보세요.',
    gif: require('../assets/gestures/fingerwave.gif'),
  },
  {
    name: '손 털기',
    desc: '손을 가볍게 털어 보세요.',
    gif: require('../assets/gestures/handshake.gif'),
  },
  {
    name: '손가락 접기',
    desc: '손가락을 하나씩 접어 보세요.',
    gif: require('../assets/gestures/fingerfold.gif'),
  },
  {
    name: '주먹 쥐고 펴기',
    desc: '주먹을 쥐었다가 펴 보세요.',
    gif: require('../assets/gestures/fistopen.gif'),
  },
  {
    name: '엇갈려 주먹 쥐고 펴기',
    desc: '양손을 엇갈려 주먹을 쥐었다가 펴 보세요.',
    gif: require('../assets/gestures/crossfist.gif'),
  },
  {
    name: '손끝 박수',
    desc: '손끝끼리 가볍게 박수를 쳐 보세요.',
    gif: require('../assets/gestures/fingertipclap.gif'),
  },
];

export default function TutorialScreen() {
  const { fontScale } = useFontSize();
  const { isPractice } = useLocalSearchParams<{ isPractice?: string }>();
  const [step, setStep] = useState(0);

  const isLast = step === GESTURES.length - 1;
  const gesture = GESTURES[step];

  const handleSkip = () => {
    router.replace({
      pathname: '/(tabs)/session',
      params: { isPractice },
    });
  };

  const handleNext = () => {
    if (isLast) {
      router.replace({
        pathname: '/(tabs)/session',
        params: { isPractice },
      });
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  return (
    <View style={styles.container}>
      {/* 상단 */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text
            style={[
              styles.backButtonText,
              { fontSize: 14 * fontScale },
            ]}
          >
            {'<'} 뒤로
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip}>
          <Text
            style={[
              styles.skipText,
              { fontSize: 14 * fontScale },
            ]}
          >
            건너뛰기
          </Text>
        </TouchableOpacity>
      </View>

      {/* 제목 */}
      <Text
        style={[
          styles.title,
          { fontSize: 24 * fontScale },
        ]}
      >
        운동 튜토리얼
      </Text>

      {/* 진행 표시 */}
      <View style={styles.stepRow}>
        {GESTURES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.stepDot,
              i === step && styles.stepDotActive,
            ]}
          />
        ))}
      </View>

      {/* GIF 영역 */}
      <View style={styles.gifRow}>
        <TouchableOpacity
          onPress={handlePrev}
          disabled={step === 0}
          style={[
            styles.arrowBtn,
            step === 0 && styles.arrowDisabled,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={40 * fontScale}
            color="#4DA56F"
          />
        </TouchableOpacity>

        <View style={styles.gifBox}>
          {gesture.gif ? (
            <Image
              source={gesture.gif}
              style={styles.gifImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.gifPlaceholder}>
              <Text
                style={[
                  styles.gifPlaceholderText,
                  { fontSize: 16 * fontScale },
                ]}
              >
                🎬 GIF 준비 중
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          style={styles.arrowBtn}
        >
          <Ionicons
            name="chevron-forward"
            size={40 * fontScale}
            color="#4DA56F"
          />
        </TouchableOpacity>
      </View>

      {/* 설명 */}
      <View style={styles.infoBox}>
        <Text
          style={[
            styles.gestureName,
            { fontSize: 26 * fontScale },
          ]}
        >
          {gesture.name}
        </Text>

        <Text
          style={[
            styles.gestureDesc,
            { fontSize: 17 * fontScale },
          ]}
        >
          {gesture.desc}
        </Text>
      </View>

      {/* 마지막 버튼 */}
      {isLast && (
        <TouchableOpacity
          style={styles.startBtn}
          onPress={handleNext}
        >
          <Text
            style={[
              styles.startBtnText,
              { fontSize: 18 * fontScale },
            ]}
          >
            운동 시작! 🖐️
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C2E7BB',
    padding: 22,
    paddingTop: 64,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  backButtonText: {
    color: '#2D6A4F',
    fontWeight: '600',
  },

  skipText: {
    color: '#2D6A4F',
    fontWeight: '600',
  },

  title: {
    fontWeight: '700',
    color: '#212121',
    textAlign: 'center',
    marginBottom: 20,
  },

  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },

  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#B0BEC5',
  },

  stepDotActive: {
    backgroundColor: '#4DA56F',
    width: 24,
    borderRadius: 5,
  },

  gifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },

  arrowBtn: {
    padding: 8,
  },

  arrowDisabled: {
    opacity: 0.2,
  },

  // GIF 전체 박스 크기 통일
  gifBox: {
    width: 260,
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 10,

    shadowColor: '#000',
    shadowOffset: {
      width: 5,
      height: 5,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },

  // GIF 자동 맞춤
  gifImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },

  gifPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  gifPlaceholderText: {
    color: '#9E9E9E',
    fontWeight: '600',
  },

  infoBox: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,

    shadowColor: '#000',
    shadowOffset: {
      width: 5,
      height: 5,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },

  gestureName: {
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
    textAlign: 'center',
  },

  gestureDesc: {
    color: '#212121',
    textAlign: 'center',
    lineHeight: 26,
  },

  startBtn: {
    backgroundColor: '#4DA56F',
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 5,
      height: 5,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },

  startBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});