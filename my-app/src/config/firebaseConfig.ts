import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  initializeAuth, 
  getReactNativePersistence,
  EmailAuthProvider,
  GoogleAuthProvider,
  PhoneAuthProvider
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your Firebase Web configuration fetched from your project
const firebaseConfig = {
  projectId: "safesphere-ai-64ea1",
  appId: "1:719972551474:web:a3443123b2db8b8c47e52b",
  storageBucket: "safesphere-ai-64ea1.firebasestorage.app",
  apiKey: "AIzaSyDohnt0TF7qn2CdQIwxukxpX1CaBmoVSjs",
  authDomain: "safesphere-ai-64ea1.firebaseapp.com",
  messagingSenderId: "719972551474",
  measurementId: "G-2Z3WPX8TJB",
};

// Initialize Firebase App only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with AsyncStorage persistence for React Native
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Auth Providers (Email, Google, Phone are supported by Firebase Auth)
const emailProvider = new EmailAuthProvider();
const googleProvider = new GoogleAuthProvider();
const phoneProvider = new PhoneAuthProvider(auth);

// Initialize Cloud Firestore
const db = getFirestore(app);

export { 
  app, 
  auth, 
  db,
  emailProvider,
  googleProvider,
  phoneProvider
};
