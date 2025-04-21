import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBZ4PObd0QILVzMQQIrWW1Qoj5FgLbCifU",
    authDomain: "noteapp-75396.firebaseapp.com",
    projectId: "noteapp-75396",
    storageBucket: "noteapp-75396.firebasestorage.app",
    messagingSenderId: "1049748600496",
    appId: "1:1049748600496:web:f9c4179e9fed2f4fe8ad75"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);