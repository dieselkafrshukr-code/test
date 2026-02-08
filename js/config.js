// ⚙️ SYSTEM CONFIGURATION
// This file initializes both Firebase (Auth) and Supabase (DB) centrally.

// 1. Supabase Config (Database & Storage)
const SUPABASE_URL = 'https://ymdnfohikgjkvdmdrthe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_J0JuDItWsSggSZPj0ATwYA_xXlGI92x';
let supabase = null;

// 2. Firebase Config (Authentication)
const firebaseConfig = {
    apiKey: "AIzaSyBFRqe3lhvzG0FoN0uAJlAP-VEz9bKLjUc",
    authDomain: "mre23-4644a.firebaseapp.com",
    projectId: "mre23-4644a",
    storageBucket: "mre23-4644a.firebasestorage.app",
    messagingSenderId: "179268769077",
    appId: "1:179268769077:web:d9fb8cd25ad284ae0de87c",
    measurementId: "G-D64MG9L66S"
};

// --- Initialization Logic ---
console.log("🚀 System Config Loading...");

// Init Supabase
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ Supabase Connected");
    } else {
        console.warn("⚠️ Supabase SDK not found");
    }
} catch (e) { console.error("❌ Supabase Init Error:", e); }

// Init Firebase
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("✅ Firebase Initialized");
        }
    } else {
        console.warn("⚠️ Firebase SDK not found");
    }
} catch (e) {
    console.error("❌ Firebase Init Error:", e);
}
