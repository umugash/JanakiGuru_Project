import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCje-Ek5-JAEx5hI44olLYlrEd5OO4WqkE",
  authDomain: "retail-store-ff6e0.firebaseapp.com",
  projectId: "retail-store-ff6e0",
  storageBucket: "retail-store-ff6e0.firebasestorage.app",
  messagingSenderId: "655278303289",
  appId: "1:655278303289:web:ec30b208ef2cd147a285e8"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);