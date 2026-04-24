import { db, auth } from './firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

const getUid = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다');
  return user.uid;
};

export const saveSession = async (data: {
  score: number;
  exerciseType: string;
  durationSeconds: number;
  feedback: string;
}) => {
  const uid = getUid();
  await addDoc(collection(db, `users/${uid}/sessions`), {
    ...data,
    completedAt: serverTimestamp(),
  });
};

export const getTodaySessionCount = async (): Promise<number> => {
  const uid = getUid();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, `users/${uid}/sessions`),
    where('completedAt', '>=', Timestamp.fromDate(today))
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
};

export const getLastSessionTime = async (): Promise<Date | null> => {
  const uid = getUid();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, `users/${uid}/sessions`),
    where('completedAt', '>=', Timestamp.fromDate(today)),
    orderBy('completedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data().completedAt?.toDate?.() ?? null;
};

export const getUserProgress = async () => {
  const uid = getUid();
  const docRef = doc(db, `users/${uid}/progress/streak`);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : { streak: 0, badges: [] };
};

export const updateStreak = async (): Promise<void> => {
  const uid = getUid();
  const docRef = doc(db, `users/${uid}/progress/streak`);
  const docSnap = await getDoc(docRef);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (docSnap.exists()) {
    const data = docSnap.data();
    const lastDate = data.lastCompletedDate?.toDate?.();

    if (lastDate) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = lastDate >= yesterday && lastDate < today;
      const isToday = lastDate >= today;

      if (isToday) {
        return;
      } else if (isYesterday) {
        await setDoc(docRef, {
          streak: (data.streak ?? 0) + 1,
          lastCompletedDate: Timestamp.fromDate(new Date()),
          badges: data.badges ?? [],
        });
      } else {
        await setDoc(docRef, {
          streak: 1,
          lastCompletedDate: Timestamp.fromDate(new Date()),
          badges: data.badges ?? [],
        });
      }
    }
  } else {
    await setDoc(docRef, {
      streak: 1,
      lastCompletedDate: Timestamp.fromDate(new Date()),
      badges: [],
    });
  }
};

// 퀴즈 완료 저장
export const saveQuizSession = async (): Promise<number> => {
  const uid = getUid();
  await addDoc(collection(db, `users/${uid}/quizSessions`), {
    completedAt: serverTimestamp(),
  });
  return await getTodayQuizCount();
};

// 오늘 퀴즈 완료 횟수
export const getTodayQuizCount = async (): Promise<number> => {
  const uid = getUid();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, `users/${uid}/quizSessions`),
    where('completedAt', '>=', Timestamp.fromDate(today))
  );
  const snapshot = await getDocs(q);
  return Math.min(snapshot.size, 2);
};

// 말하기 완료 저장
export const saveSpeakSession = async (): Promise<number> => {
  const uid = getUid();
  await addDoc(collection(db, `users/${uid}/speakSessions`), {
    completedAt: serverTimestamp(),
  });
  return await getTodaySpeakCount();
};

// 오늘 말하기 완료 횟수
export const getTodaySpeakCount = async (): Promise<number> => {
  const uid = getUid();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, `users/${uid}/speakSessions`),
    where('completedAt', '>=', Timestamp.fromDate(today))
  );
  const snapshot = await getDocs(q);
  return Math.min(snapshot.size, 2);
};

// 날짜별 퀴즈 완료 횟수 (통계용)
export const getQuizCountByDate = async (date: Date): Promise<number> => {
  const uid = getUid();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const q = query(
    collection(db, `users/${uid}/quizSessions`),
    where('completedAt', '>=', Timestamp.fromDate(start)),
    where('completedAt', '<=', Timestamp.fromDate(end))
  );
  const snapshot = await getDocs(q);
  return Math.min(snapshot.size, 2);
};

// 날짜별 말하기 완료 횟수 (통계용)
export const getSpeakCountByDate = async (date: Date): Promise<number> => {
  const uid = getUid();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const q = query(
    collection(db, `users/${uid}/speakSessions`),
    where('completedAt', '>=', Timestamp.fromDate(start)),
    where('completedAt', '<=', Timestamp.fromDate(end))
  );
  const snapshot = await getDocs(q);
  return Math.min(snapshot.size, 2);
};

// 퀴즈 한 번 완료 시 오늘 퀴즈 퀘스트 완료 처리
export const completeQuizToday = async (): Promise<void> => {
  const uid = getUid();
  await addDoc(collection(db, `users/${uid}/quizSessions`), { completedAt: Timestamp.now() });
  await addDoc(collection(db, `users/${uid}/quizSessions`), { completedAt: Timestamp.now() });
};