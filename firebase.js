import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgFWRXS_ifNjOU4mmVKhR7m8Fej8tN0ow",
  authDomain: "bistrotbastards.firebaseapp.com",
  projectId: "bistrotbastards",
  storageBucket: "bistrotbastards.firebasestorage.app",
  messagingSenderId: "675653435927",
  appId: "1:675653435927:web:e98d449eb59c6e6a425252",
  measurementId: "G-Q0MNN9DRFE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
