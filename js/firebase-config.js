// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCGVi5VjNnMrLlDftWjRrGJQHxxE4QKfZ8",
    authDomain: "u-student-e93de.firebaseapp.com",
    projectId: "u-student-e93de",
    storageBucket: "u-student-e93de.firebasestorage.app",
    messagingSenderId: "471202889839",
    appId: "1:471202889839:web:39fa20ec13cde439984d9a",
    measurementId: "G-L1304Y7BF4"
};

// Initialize Firebase (Compat)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    // Initialize Analytics if supported
    if (firebase.analytics) {
        firebase.analytics();
    }
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage ? firebase.storage() : null;

console.log("Firebase Initialized with U-Student Credentials");
