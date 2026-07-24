// Firebase 초기화 — Phase 3 로그인·동기화 뿌리.
// 설정 키는 .env(VITE_FIREBASE_*)에서 로드. 코드 하드코딩 금지.
// 웹 apiKey는 공개 식별자이며 진짜 보안은 Firestore 규칙·Auth 도메인 제한이 담당.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 키 누락 시(.env 미로드) 조용히 비활성 — 게스트 모드로 동작 지속(회귀 방지).
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

export const firebaseApp = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
