import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBtdzASSqHz2oirxJGl6deGkfIUBMUnO_c",
  authDomain: "totalappgt-d15b9.firebaseapp.com",
  projectId: "totalappgt-d15b9",
  storageBucket: "totalappgt-d15b9.firebasestorage.app",
  messagingSenderId: "776610472252",
  appId: "1:776610472252:web:21f1f7753f4191ac18be39",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export async function firebaseLogin(email: string, password: string): Promise<string> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user.getIdToken();
}

export async function firebaseRegister(email: string, password: string): Promise<string> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user.getIdToken();
}

export async function firebaseLogout(): Promise<void> {
  await signOut(auth);
}
