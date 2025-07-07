import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const captivePortalConfig = {
  apiKey: "AIzaSyBQZgZM2pTrELCSR7y8H1_3SCRe3p2HFvI",
  authDomain: "captive-portal-f207c.firebaseapp.com",
  projectId: "captive-portal-f207c",
  storageBucket: "captive-portal-f207c.firebasestorage.app",
  messagingSenderId: "517112843283",
  appId: "1:517112843283:web:99622216d227c25d6e43e6"
};

const captivePortalApp = initializeApp(captivePortalConfig, 'captivePortal');
export const captiveAuth = getAuth(captivePortalApp);
export const captiveDb = getFirestore(captivePortalApp); 