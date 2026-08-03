import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const FirebaseConfig = {
    apiKey: "AIzaSyByUjBK6lA_OIKCAvGYgGXZq-mMqY-QnR4",
    authDomain: "sftr-589d6.firebaseapp.com",
    projectId: "sftr-589d6",
    storageBucket: "sftr-589d6.firebasestorage.app",
    messagingSenderId: "692453606237",
    appId: "1:692453606237:web:245d2f8372cefdeeefdeb4",
    measurementId: "G-8JPYXEFY11"
};

const app = initializeApp(FirebaseConfig);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };