// ⚙️ SYSTEM CONFIGURATION
// This file initializes both Firebase (Auth) and Supabase (DB) centrally.

window.SUPABASE_URL = 'https://ymdnfohikgjkvdmdrthe.supabase.co';
window.SUPABASE_KEY = 'sb_publishable_J0JuDItWsSggSZPj0ATwYA_xXlGI92x';
window.supabase = null;

window.firebaseConfig = {
    apiKey: "AIzaSyBFRqe3lhvzG0FoN0uAJlAP-VEz9bKLjUc",
    authDomain: "mre23-4644a.firebaseapp.com",
    projectId: "mre23-4644a",
    storageBucket: "mre23-4644a.firebasestorage.app",
    messagingSenderId: "179268769077",
    appId: "1:179268769077:web:d9fb8cd25ad284ae0de87c",
    measurementId: "G-D64MG9L66S"
};

console.log("🚀 System Config Loading...");

// Init Supabase
try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        window.supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        console.log("✅ Supabase Connected");
    } else if (window.supabase) {
        // Fallback if loaded differently
        window.supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    }
} catch (e) { console.error("❌ Supabase Init Error:", e); }

// Init Firebase
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(window.firebaseConfig);
            console.log("✅ Firebase Initialized");
        }
    } else {
        console.warn("⚠️ Firebase SDK not found");
    }
} catch (e) {
    console.error("❌ Firebase Init Error:", e);
}
