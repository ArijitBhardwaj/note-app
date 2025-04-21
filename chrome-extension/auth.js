import { auth } from "./firebase-config.js";
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

export const initAuth = (callback) => {
  return onAuthStateChanged(auth, user => {
    callback(user);
  });
};

export const handleSignIn = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const handleSignUp = async (email, password) => {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const handleSignOut = async () => {
  await signOut(auth);
};