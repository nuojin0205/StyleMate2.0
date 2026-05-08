import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  console.log("Attempting sign in with Google...");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Sign in success:", result.user.email);
    return result;
  } catch (error) {
    console.error("Sign in error:", error);
    if (error instanceof Error && error.message.includes('popup-closed-by-user')) {
      return;
    }
    alert("Sign in failed. If you are in a private window or on mobile, please try again or check browser settings.");
    throw error;
  }
};

// CRITICAL: Test connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
