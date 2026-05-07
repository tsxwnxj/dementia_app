import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Linking,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  ListRenderItemInfo,
} from 'react-native';
import * as Location from 'expo-location';

interface Course {
  id: string;
  name: string;
  type: string;
  distance: string;
  duration: string;
  lat: number;
  lng: number;
  desc: string;
  icon: string;
}

interface Props {
  onBack: () => void;
}

async function openMap(lat: number, lng: number, name: string): Promise<void> {
  const encoded = encodeURIComponent(name);

  const apps: { label: string; url: string; webUrl: string }[] = [
    {
      label: '카카오맵',
      url: `kakaomap://route?ep=${lat},${lng}&by=FOOT`,
      webUrl: `https://map.kakao.com/link/to/${encoded},${lat},${lng}`,
    },
    {
      label: '네이버지도',
      url: `nmap://route/walk?dlat=${lat}&dlng=${lng}&dname=${encoded}&appname=com.junseojang.dementiaapp`,
      webUrl: `https://map.naver.com/v5/directions/-/-/-/walk?c=${lng},${lat},15,0,0,0,dh`,
    },
  ];

  if (Platform.OS === 'ios') {
    apps.push({
      label: '애플지도',
      url: `maps://route?daddr=${lat},${lng}&dirflg=w`,
      webUrl: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`,
    });
  }

  Alert.alert(
    '지도 앱 선택',
    `${name}까지 길 안내를 시작합니다`,
    [
      ...apps.map(({ label, url, webUrl }) => ({
        text: label,
        onPress: async () => {
          const supported = await Linking.canOpenURL(url);
          Linking.openURL(supported ? url : webUrl);
        },
      })),
      { text: '취소', style: 'cancel' as const },
    ]
  );
}

async function fetchNearbyParks(lat: number, lng: number): Promise<Course[]> {
  await new Promise<void>((r) => setTimeout(r, 800));
  return [
    {
      id: '1', name: '근처 공원', type: '공원',
      distance: '350m', duration: '약 5분',
      lat: lat + 0.003, lng: lng + 0.002,
      desc: '평탄한 산책로, 벤치 있음', icon: '🌳',
    },
    {
      id: '2', name: '근린공원', type: '공원',
      distance: '780m', duration: '약 10분',
      lat: lat + 0.007, lng: lng - 0.003,
      desc: '운동기구, 화장실 완비', icon: '🏞️',
    },
    {
      id: '3', name: '둘레길', type: '가벼운 등산',
      distance: '1.2km', duration: '약 15분',
      lat: lat - 0.005, lng: lng + 0.008,
      desc: '경사 완만, 왕복 40분 코스', icon: '⛰️',
    },
  ];
}

export default function WalkCourseScreen({ onBack }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<Course | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status: existing } = await Location.getForegroundPermissionsAsync();
        let finalStatus = existing;

        if (existing !== 'granted') {
          const { status: asked } = await Location.requestForegroundPermissionsAsync();
          finalStatus = asked;
        }

        if (finalStatus !== 'granted') {
          Alert.alert(
            '위치 권한 필요',
            '주변 산책 코스를 찾으려면 위치 권한이 필요합니다.\n설정 > 개인 정보 보호 > 위치 서비스에서 허용해 주세요.',
            [
              { text: '기본 코스 보기', onPress: async () => {
                setCourses(await fetchNearbyParks(37.5665, 126.9780));
                setLoading(false);
              }},
              { text: '설정 열기', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCourses(await fetchNearbyParks(loc.coords.latitude, loc.coords.longitude));
      } catch {
        setCourses(await fetchNearbyParks(37.5665, 126.9780));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const renderItem = ({ item }: ListRenderItemInfo<Course>) => (
    <TouchableOpacity
      style={[styles.courseCard, selected?.id === item.id && styles.courseCardSelected]}
      onPress={() => setSelected(item)}
      activeOpacity={0.85}
    >
      <View style={styles.courseHeader}>
        <Text style={styles.courseIcon}>{item.icon}</Text>
        <View style={styles.courseInfo}>
          <Text style={styles.courseName}>{item.name}</Text>
          <Text style={styles.courseType}>{item.type}</Text>
        </View>
        <View style={styles.distanceBox}>
          <Text style={styles.distanceText}>{item.distance}</Text>
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
      </View>
      <Text style={styles.courseDesc}>{item.desc}</Text>

      {selected?.id === item.id && (
        <TouchableOpacity
          style={styles.naviBtn}
          onPress={() => openMap(item.lat, item.lng, item.name)}
          activeOpacity={0.85}
        >
          <Text style={styles.naviBtnText}>🧭 길 안내 시작</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🗺️ 주변 산책 코스</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2D6A4F" />
          <Text style={styles.loadingText}>주변 산책 코스를 찾고 있어요...</Text>
        </View>
      ) : (
        <FlatList<Course>
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7F0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D8F3DC',
  },
  backBtn: { color: '#2D6A4F', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2D6A4F' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#666', marginTop: 15, fontSize: 16 },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  courseCardSelected: { borderColor: '#2D6A4F' },
  courseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  courseIcon: { fontSize: 32, marginRight: 12 },
  courseInfo: { flex: 1 },
  courseName: { fontSize: 17, fontWeight: 'bold', color: '#1B4332' },
  courseType: {
    fontSize: 13,
    color: '#52B788',
    backgroundColor: '#D8F3DC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  distanceBox: { alignItems: 'flex-end' },
  distanceText: { fontSize: 16, fontWeight: 'bold', color: '#2D6A4F' },
  durationText: { fontSize: 12, color: '#888' },
  courseDesc: { fontSize: 14, color: '#666', marginTop: 4 },
  naviBtn: {
    marginTop: 14,
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  naviBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
