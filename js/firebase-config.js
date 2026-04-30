import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
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
export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export function initAuth() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('[Firebase] Authenticated as:', user.uid);
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then((result) => {
            console.log('[Firebase] Signed in anonymously:', result.user.uid);
            resolve(result.user);
          })
          .catch((error) => {
            console.error('[Firebase] Auth error:', error);
            reject(error);
          });
      }
    });
  });
}
