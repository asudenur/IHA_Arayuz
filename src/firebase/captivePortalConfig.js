import { initializeApp } from "firebase/app";
import { getFirestore, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQZgZM2pTrELCSR7y8H1_3SCRe3p2HFvI",
  authDomain: "captive-portal-f207c.firebaseapp.com",
  projectId: "captive-portal-f207c",
  storageBucket: "captive-portal-f207c.firebasestorage.app",
  messagingSenderId: "517112843283",
  appId: "1:517112843283:web:99622216d227c25d6e43e6"
};

const captiveApp = initializeApp(firebaseConfig, "captive");
export const captiveDb = getFirestore(captiveApp);
export const malzemeKayitlariCol = collection(captiveDb, "malzemeKayitlari"); 