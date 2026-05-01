import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDVQZrcHb3nMFeTXkhjIrYQ1Trc_ZyiUZA",
  authDomain: "smm-pro-25489.firebaseapp.com",
  databaseURL: "https://smm-pro-25489-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "smm-pro-25489",
  storageBucket: "smm-pro-25489.firebasestorage.app",
  messagingSenderId: "102459113643",
  appId: "1:102459113643:web:e62f546dbc1f28e294f7ee"
};

const app = initializeApp(firebaseConfig);
export const db      = getDatabase(app);
export const auth    = getAuth(app);
export const storage = getStorage(app);

export function getFirebaseErrorMessage(error) {
  const msgs = {
    'auth/email-already-in-use':   'Bu email zaten kayıtlı',
    'auth/invalid-email':          'Geçersiz email adresi',
    'auth/weak-password':          'Şifre en az 6 karakter olmalı',
    'auth/user-not-found':         'Kullanıcı bulunamadı',
    'auth/wrong-password':         'Yanlış şifre',
    'auth/invalid-credential':     'Email veya şifre hatalı',
    'auth/network-request-failed': 'İnternet bağlantısı yok',
  };
  return msgs[error.code] || `Giriş yapılamadı: ${error.code}`;
}

export const registerUser      = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const loginUser         = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser        = ()                 => signOut(auth);
export const sendPasswordReset = (email)            => sendPasswordResetEmail(auth, email);
export const onAuthChange      = (cb)               => onAuthStateChanged(auth, cb);
