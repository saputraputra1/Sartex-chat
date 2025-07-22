// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAQVIvZvxmYdcriHR8j0ormGzNRjGD0_no",
    authDomain: "online--suit.firebaseapp.com",
    databaseURL: "https://online--suit-default-rtdb.firebaseio.com",
    projectId: "online--suit",
    storageBucket: "online--suit.appspot.com",
    messagingSenderId: "463840835705",
    appId: "1:463840835705:web:f490fd49851c0afb8dfca8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// Database references
const usersRef = database.ref('users');
const deviceAccountsRef = database.ref('deviceAccounts');
const chatroomRef = database.ref('chatroom/global/messages');
const groupsRef = database.ref('groups');
const typingStatusRef = database.ref('typingStatus/global');
const bannedWordsRef = database.ref('bannedWords');
