import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBgNmX4HC0NelU1vUry8SHce0kUJ0BzEwQ",
  authDomain: "feedback-54254.firebaseapp.com",
  projectId: "feedback-54254",
  storageBucket: "feedback-54254.firebasestorage.app",
  messagingSenderId: "609073338297",
  appId: "1:609073338297:web:3d9fa7bf695034f3cc0868"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 초기화
const db = getFirestore(app);

/**
 * Firebase 설정 여부
 */
export function isFirebaseConfigured() {
  return true;
}

/**
 * 전체 강의 피드백을 실시간으로 불러옵니다.
 */
export function subscribeFeedback(onData, onError) {
  const feedbackCollection = collection(
    db,
    "lectureFeedback"
  );

  return onSnapshot(
    feedbackCollection,
    snapshot => {
      const feedback = snapshot.docs.map(snapshotDoc => {
        const data = snapshotDoc.data();

        return {
          id: snapshotDoc.id,
          ...data,

          updatedAt:
            data.updatedAt?.toDate?.()?.toISOString() || ""
        };
      });

      onData(feedback);
    },
    error => {
      console.error(
        "Firebase 실시간 불러오기 오류:",
        error
      );

      if (onError) {
        onError(error);
      }
    }
  );
}

/**
 * 강의 한 개의 피드백을 저장합니다.
 */
export async function saveFeedback(
  lecture,
  writer
) {
  if (!lecture?.id) {
    throw new Error(
      "저장할 강의 ID가 없습니다."
    );
  }

  const feedbackDocument = doc(
    db,
    "lectureFeedback",
    lecture.id
  );

  await setDoc(
    feedbackDocument,
    {
      course: lecture.course || "",
      no: Number(lecture.no) || 0,
      title: lecture.title || "",
      owner: lecture.owner || "",
      minutes: lecture.minutes || "",

      weak: lecture.weak || "",
      good: lecture.good || "",
      memory: lecture.memory || "",
      improve: lecture.improve || "",
      surprise: lecture.surprise || "",
      timeline: lecture.timeline || "",

      status: lecture.status || "empty",

      updatedBy:
        writer?.trim() || "이름 미입력",

      updatedAt: serverTimestamp()
    },
    {
      merge: true
    }
  );
}

/**
 * 여러 강의의 피드백을 한꺼번에 저장합니다.
 * CSV 가져오기에서 사용합니다.
 */
export async function saveManyFeedback(
  lectures,
  writer
) {
  if (!Array.isArray(lectures)) {
    throw new Error(
      "저장할 강의 데이터가 올바르지 않습니다."
    );
  }

  /*
   * Firestore의 batch 작업 제한을 고려하여
   * 한 번에 최대 450개씩 저장합니다.
   */
  const chunks = [];

  for (
    let index = 0;
    index < lectures.length;
    index += 450
  ) {
    chunks.push(
      lectures.slice(index, index + 450)
    );
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);

    chunk.forEach(lecture => {
      if (!lecture?.id) {
        return;
      }

      const feedbackDocument = doc(
        db,
        "lectureFeedback",
        lecture.id
      );

      batch.set(
        feedbackDocument,
        {
          course: lecture.course || "",
          no: Number(lecture.no) || 0,
          title: lecture.title || "",
          owner: lecture.owner || "",
          minutes: lecture.minutes || "",

          weak: lecture.weak || "",
          good: lecture.good || "",
          memory: lecture.memory || "",
          improve: lecture.improve || "",
          surprise: lecture.surprise || "",
          timeline: lecture.timeline || "",

          status: lecture.status || "empty",

          updatedBy:
            writer?.trim() || "CSV 가져오기",

          updatedAt: serverTimestamp()
        },
        {
          merge: true
        }
      );
    });

    await batch.commit();
  }
}