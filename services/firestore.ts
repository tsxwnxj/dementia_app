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