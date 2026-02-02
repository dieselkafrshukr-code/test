// 🚀 DIESEL ADMIN ENGINE - HYBRID VERSION (Firebase + Local Fallback)
const firebaseConfig = {
    apiKey: "AIzaSyBFRqe3lhvzG0FoN0uAJlAP-VEz9bKLjUc",
    authDomain: "mre23-4644a.firebaseapp.com",
    projectId: "mre23-4644a",
    storageBucket: "mre23-4644a.firebasestorage.app",
    messagingSenderId: "179268769077",
    appId: "1:179268769077:web:d9fb8cd25ad284ae0de87c"
};

let db = null;
let productsCol = null;
let isFirebaseReady = false;
let adminRole = localStorage.getItem('adminRole') || 'none';

// Initialize Firebase
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    productsCol = db.collection('products');
    isFirebaseReady = true;

    // SECURITY: If we came from the home page button, force a logout to ask for credentials again
    if (sessionStorage.getItem('force_admin_login') === 'true') {
        sessionStorage.removeItem('force_admin_login');
        firebase.auth().signOut();
        localStorage.removeItem('adminRole');
        adminRole = 'none';
    }

    firebase.auth().onAuthStateChanged(user => {
        const loginOverlay = document.getElementById('login-overlay');
        const adminContent = document.getElementById('admin-main-content');

        if (user) {
            loginOverlay.style.display = 'none';
            adminContent.style.display = 'block';
            applyRoleRestrictions();

            if (adminRole === 'products') { showTab('products'); loadProducts(); }
            else if (adminRole === 'orders') { showTab('orders'); loadOrders(); }
            else if (adminRole === 'all') { showTab('products'); loadProducts(); }
        } else {
            loginOverlay.style.display = 'flex';
            adminContent.style.display = 'none';
        }
    });
}
