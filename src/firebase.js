// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyDyV7h2Jq62nBopH8OwA5WPUc9224kiOcA",
  authDomain: "jeyo-store.firebaseapp.com",
  projectId: "jeyo-store",
  storageBucket: "jeyo-store.firebasestorage.app",
  messagingSenderId: "548999110937",
  appId: "1:548999110937:web:7ee825c67c0e55126ea588",
  measurementId: "G-8GPSQYD899"
};

// Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);

// Inisialisasi Firestore dan Auth
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };

