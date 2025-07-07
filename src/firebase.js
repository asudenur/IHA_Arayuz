import { initializeApp } from 'firebase/app';
import { getFirestore, doc } from 'firebase/firestore';

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyDrP1xO_QhJGuGIbEjEbvjRx15juqePcFg",
  authDomain: "iha-telemtry-values.firebaseapp.com",
  projectId: "iha-telemtry-values",
  storageBucket: "iha-telemtry-values.firebasestorage.app",
  messagingSenderId: "600586842354",
  appId: "1:600586842354:web:fc4185c585800d1af3a06b",
  measurementId: "G-71K4ZYKZZQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// IHA1 Document references
export const positionDoc = doc(db, 'IHAData', 'position');
export const attitudeDoc = doc(db, 'IHAData', 'attitude');
export const statusDoc = doc(db, 'IHAData', 'status');
export const gpsDoc = doc(db, 'IHAData', 'gps');
export const batteryDoc = doc(db, 'IHAData', 'battery');
export const personelDoc = doc(db, 'PersonelData', 'konum');

// IHA2 Document references
export const position2Doc = doc(db, 'IHA2Data', 'position2');
export const attitude2Doc = doc(db, 'IHA2Data', 'attitude');
export const status2Doc = doc(db, 'IHA2Data', 'status');
export const gps2Doc = doc(db, 'IHA2Data', 'gps');
export const battery2Doc = doc(db, 'IHA2Data', 'battery');

export default db;
