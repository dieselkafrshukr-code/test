
// 🚀 DIESEL SHOP - INVINCIBLE ENGINE (Supabase Edition)
let cart = [];
try {
    const saved = localStorage.getItem('diesel_cart');
    if (saved) cart = JSON.parse(saved);
} catch (e) {
    cart = [];
}

let selectedProductForSize = null;
let selectedColor = null;
let activeCategory = "all";
let remoteProducts = [];
let shippingCosts = {};
const governorates = [
    "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم", "الغربية", "الإسماعيلية", "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "السويس", "الشرقية", "دمياط", "بورسعيد", "جنوب سيناء", "كفر الشيخ", "مطروح", "الأقصر", "قنا", "شمال سيناء", "سوهاج", "بني سويف", "أسيوط", "أسوان"
];

// --- HYBRID CONFIGURATION ---
// 1. Supabase (Database)
const SUPABASE_URL = 'https://ymdnfohikgjkvdmdrthe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_J0JuDItWsSggSZPj0ATwYA_xXlGI92x';
let supabase = null;
try {
    if (window.supabase) supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) { console.error("Supabase init failed:", e); }

// 2. Firebase (Authentication only)
const firebaseConfig = {
    apiKey: "AIzaSyBFRqe3lhvzG0FoN0uAJlAP-VEz9bKLjUc",
    authDomain: "mre23-4644a.firebaseapp.com",
    projectId: "mre23-4644a",
    storageBucket: "mre23-4644a.firebasestorage.app",
    messagingSenderId: "179268769077",
    appId: "1:179268769077:web:d9fb8cd25ad284ae0de87c",
    measurementId: "G-D64MG9L66S"
};

let currentUser = null;

// Initialize Firebase safely
function initFirebase() {
    if (typeof firebase !== 'undefined') {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            // Auth Listener
            firebase.auth().onAuthStateChanged((user) => {
                console.log("Auth state changed:", user ? "Logged In" : "Logged Out");
                if (user) {
                    currentUser = {
                        id: user.uid,
                        email: user.email,
                        user_metadata: { full_name: user.displayName || user.email }
                    };
                    updateAuthUI();
                    loadCartFromSupabase();
                } else {
                    currentUser = null;
                    updateAuthUI();
                }
            });
        } catch (e) {
            console.error("Firebase init error:", e);
        }
    } else {
        console.warn("Firebase SDK not loaded");
    }
}

// Call initFirebase after DOM load inside initAll or listener
document.addEventListener('DOMContentLoaded', initFirebase);



function handleAuthChange(session) {
    // Deprecated for Client - using Firebase now
}

// Separate rendering from logic for reuse
function renderAuthUI(name) {
    const txt = document.getElementById('auth-text');
    const cartLoggedOut = document.getElementById('cart-auth-logged-out');
    const cartLoggedIn = document.getElementById('cart-auth-logged-in');
    const cartUserName = document.getElementById('cart-user-name');
    const myOrdersSection = document.getElementById('orders-list-section');
    const myOrdersLogin = document.getElementById('orders-login-section');

    const displayName = currentUser ? (currentUser.user_metadata.full_name ? currentUser.user_metadata.full_name.split(' ')[0] : 'حسابي') : null;

    if (currentUser) {
        if (txt) txt.innerText = displayName;
        if (cartLoggedOut) cartLoggedOut.style.display = 'none';
        if (cartLoggedIn) {
            cartLoggedIn.style.display = 'flex';
            if (cartUserName) cartUserName.innerText = `أهلاً، ${displayName}`;
        }
        if (myOrdersSection) myOrdersSection.style.display = 'block';
        if (myOrdersLogin) myOrdersLogin.style.display = 'none';
    } else {
        if (txt) txt.innerText = 'دخول';
        if (cartLoggedOut) cartLoggedOut.style.display = 'block';
        if (cartLoggedIn) cartLoggedIn.style.display = 'none';
        if (myOrdersSection) myOrdersSection.style.display = 'none';
        if (myOrdersLogin) myOrdersLogin.style.display = 'block';
    }
}

// Separate rendering from logic for reuse
// Duplicate renderAuthUI removed

// DOM Elements
let menContainer, cartBtn, closeCart, cartSidebar, cartOverlay, loader, navbar, sizeModal, closeModal, modalProductName, modalProductPrice, mobileMenuBtn, navLinks, themeToggle, subFiltersContainer;

// Global Error Handler
window.onerror = function (msg, url, line, col, error) {
    console.error("Global Error:", msg, error);
    // Force hide loader if critical error happens
    const l = document.getElementById('loader');
    if (l) l.style.display = 'none';
    return false;
};

const initAll = () => {
    console.log("Initializing App...");
    if (window.initialized) return;
    window.initialized = true;

    try {
        initElements();
    } catch (e) { console.error("Error initializing elements:", e); }

    try {
        initTheme();
    } catch (e) { console.error("Error initializing theme:", e); }

    try {
        setupEventListeners();
    } catch (e) { console.error("Error setting up listeners:", e); }

    try {
        updateCartUI();
    } catch (e) { console.error("Error updating cart UI:", e); }

    try {
        renderAll();
    } catch (e) { console.error("Error rendering products:", e); }

    // Try Hybrid Auth Init safely
    try {
        if (typeof initSupabaseAuthSafe === 'function') initSupabaseAuthSafe();
    } catch (e) { console.warn("Supabase Auth init skipped", e); }

    // Hide Loader finally
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }, 1500);
    }
    console.log("App Initialized Successfully ✅");
};

// Dummy function to prevent ReferenceError if called elsewhere
function initSupabaseAuthSafe() {
    try {
        if (typeof initSupabaseAuth === 'function') initSupabaseAuth();
    } catch (e) { console.warn("Auth init skipped", e); }
}

document.addEventListener('DOMContentLoaded', initAll);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initAll();
}

function initElements() {
    menContainer = document.getElementById('men-products');
    cartBtn = document.getElementById('cart-btn');
    closeCart = document.getElementById('close-cart');
    cartSidebar = document.getElementById('cart-sidebar');
    cartOverlay = document.getElementById('cart-overlay');
    loader = document.getElementById('loader');
    navbar = document.querySelector('.navbar');
    sizeModal = document.getElementById('size-modal');
    closeModal = document.getElementById('close-modal');
    modalProductName = document.getElementById('modal-product-name');
    modalProductPrice = document.getElementById('modal-product-price');
    mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    navLinks = document.querySelector('.nav-links');
    themeToggle = document.getElementById('theme-toggle');
    subFiltersContainer = document.getElementById('sub-filters-container');
    loadShippingData();
}

async function loadShippingData() {
    const govSelect = document.getElementById('customer-gov');
    if (govSelect) {
        govSelect.innerHTML = '<option value="" disabled selected>اختر المحافظة...</option>' +
            governorates.sort().map(g => `<option value="${g}" style="background: #111; color: #fff;">${g}</option>`).join('');
    }

    try {
        if (!supabase) return;
        const { data, error } = await supabase.from('settings').select('costs').eq('id', 'shipping').single();
        if (data) shippingCosts = data.costs || {};
    } catch (e) { console.error("Error loading shipping costs", e); }
}

window.updateCheckoutTotal = () => {
    const gov = document.getElementById('customer-gov').value;
    const cost = shippingCosts[gov] || 0;
    const itemsTotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);

    const shippingEl = document.getElementById('shipping-cost');
    const totalEl = document.getElementById('form-total-price');

    if (shippingEl) shippingEl.innerText = `${cost} جنيه`;
    if (totalEl) totalEl.innerText = `${itemsTotal + cost} جنيه`;
};

const parentSubMap = {
    all: [],
    clothes: [
        { id: 'hoodies', label: 'هوديز' },
        { id: 'jackets', label: 'جواكت' },
        { id: 'pullover', label: 'بلوفر' },
        { id: 'shirts', label: 'قمصان' },
        { id: 'coats', label: 'بالطو' },
        { id: 'tshirts', label: 'تيشيرت' },
        { id: 'polo', label: 'بولو' }
    ],
    pants: [
        { id: 'jeans', label: 'جينز' },
        { id: 'sweatpants', label: 'سويت بانتس' }
    ],
    shoes: []
};

function setupEventListeners() {
    // Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.onclick = () => closeMobileMenu();
    });

    // Main Filters
    document.querySelectorAll('.main-filter-btn').forEach(btn => {
        btn.onclick = () => {
            const parent = btn.dataset.parent;
            document.querySelectorAll('.main-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = parent;
            renderSubFilters(parent);
            filterAndRender('men', parent, 'all');
        };
    });

    if (cartBtn) cartBtn.onclick = (e) => { e.preventDefault(); openCartSidebar(); };
    if (closeCart) closeCart.onclick = closeCartSidebar;
    if (cartOverlay) cartOverlay.onclick = closeCartSidebar;

    if (mobileMenuBtn) {
        mobileMenuBtn.onclick = (e) => {
            e.stopPropagation();
            mobileMenuBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
        };
    }

    if (themeToggle) themeToggle.onclick = (e) => { e.preventDefault(); toggleTheme(); };

    if (closeModal) closeModal.onclick = () => sizeModal.classList.remove('active');

    // Checkout Button - MUST OPEN MODAL
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.onclick = () => {
            if (cart.length === 0) return alert("السلة فارغة!");
            closeCartSidebar();
            document.getElementById('checkout-modal').classList.add('active');
            updateCheckoutTotal();
        };
    }

    const closeCheckout = document.getElementById('close-checkout');
    if (closeCheckout) closeCheckout.onclick = () => document.getElementById('checkout-modal').classList.remove('active');

    if (closeModal) closeModal.onclick = () => sizeModal.classList.remove('active');

    // Checkout Form
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('order-submit-btn');
            const paymentMethod = orderForm.querySelector('input[name="payment-method"]:checked').value;

            submitBtn.disabled = true;
            submitBtn.innerText = "جاري الحفظ...";

            const gov = document.getElementById('customer-gov').value;
            const shippingCost = shippingCosts[gov] || 0;
            const itemsTotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);

            if (!gov) {
                alert("برجاء اختيار المحافظة!");
                submitBtn.disabled = false;
                submitBtn.innerText = "تأكيد الطلب الآن ✨";
                return;
            }

            const orderData = {
                customerName: document.getElementById('customer-name').value,
                phone: document.getElementById('customer-phone').value,
                gov: gov,
                address: document.getElementById('customer-address').value,
                items: cart.map(i => ({
                    id: i.id,
                    name: i.name,
                    size: i.size,
                    color: i.color,
                    quantity: i.quantity,
                    price: i.price,
                    total: i.price * i.quantity,
                    image: i.image
                })),
                itemsTotal: itemsTotal,
                shippingCost: shippingCost,
                total: itemsTotal + shippingCost,
                status: "جديد",
                paymentMethod: paymentMethod === 'cod' ? 'عند الاستلام' : 'أونلاين',
                paymentStatus: "لم يتم الدفع",
                // Use ID from whatever auth system is active (Supabase or Firebase)
                userId: currentUser ? currentUser.id : null,
                userEmail: currentUser ? currentUser.email : null
            };

            try {
                // Save order to Supabase
                // Check if Supabase client is available
                if (supabase) {
                    const { data, error } = await supabase.from('orders').insert([orderData]).select();
                    if (error) throw error;
                } else {
                    console.warn("Supabase offline, order not saved to DB");
                }
                if (paymentMethod === 'online') {
                    alert("الدفع الأونلاين غير مفعل حالياً مع قاعدة البيانات الجديدة");
                    return;
                }

                // COD Flow
                cart = [];
                updateCartUI();
                saveCartToSupabase();
                document.getElementById('checkout-modal').classList.remove('active');
                document.getElementById('success-modal').classList.add('active');
                orderForm.reset();
            } catch (err) {
                console.error(err);
                alert("حدث خطأ أثناء معالجة الطلب!");
            } finally {
                if (paymentMethod !== 'online') {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "تأكيد الطلب الآن ✨";
                }
            }
        };
    }

    // Auth Modal Logic
    const openAuthBtn = document.getElementById('open-auth-btn');
    const authModal = document.getElementById('auth-modal');
    const closeAuthBtn = document.getElementById('close-auth-modal');
    const authForm = document.getElementById('email-auth-form');
    const btnSignup = document.getElementById('btn-signup');

    if (openAuthBtn) openAuthBtn.onclick = () => {
        closeCartSidebar();
        authModal.classList.add('active');
    };
    if (closeAuthBtn) closeAuthBtn.onclick = () => authModal.classList.remove('active');

    // Handle Login Submit
    if (authForm) {
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const errorEl = document.getElementById('auth-error');
            const submitBtn = document.getElementById('btn-login');

            errorEl.style.display = 'none';
            if (!supabase) return alert("Offline Mode");

            submitBtn.disabled = true;
            submitBtn.innerText = "...";

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                if (error) throw error;

                authModal.classList.remove('active');
                authForm.reset();
            } catch (err) {
                console.error(err);
                errorEl.innerText = "بيانات الدخول غير صحيحة!";
                errorEl.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "دخول";
            }
        };
    }

    // Handle Signup Click
    if (btnSignup) {
        btnSignup.onclick = async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const errorEl = document.getElementById('auth-error');

            if (!email || !password || password.length < 6) {
                errorEl.innerText = "أدخل بريد صحيح وكلمة مرور 6 أحرف على الأقل";
                errorEl.style.display = 'block';
                return;
            }

            if (!supabase) return alert("Offline Mode");

            btnSignup.innerText = "...";
            try {
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { full_name: email.split('@')[0] } // Use part of email as name
                    }
                });
                if (error) throw error;

                alert("تم إنشاء الحساب بنجاح! تم تسجيل دخولك تلقائياً.");
                authModal.classList.remove('active');
                authForm.reset();
            } catch (err) {
                console.error(err);
                errorEl.innerText = "حدث خطأ: " + err.message;
                errorEl.style.display = 'block';
            } finally {
                btnSignup.innerText = "حساب جديد";
            }
        };
    }



    // Google Login Handler
    const gLogin = document.getElementById('google-login-btn');
    if (gLogin) {
        gLogin.onclick = (e) => {
            e.preventDefault();
            signInWithGoogle();
        };
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = signOutUser;

    const myOrdersBtn = document.getElementById('my-orders-btn');
    if (myOrdersBtn) myOrdersBtn.onclick = (e) => { e.preventDefault(); openMyOrdersModal(); };

    const closeOrders = document.getElementById('close-orders-modal');
    if (closeOrders) closeOrders.onclick = () => document.getElementById('my-orders-modal').classList.remove('active');
}

// --- Auth & Orders ---
async function signInWithGoogle() {
    if (!firebase || firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
        return alert("يرجى إعداد Firebase في ملف main.js أولاً");
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await firebase.auth().signInWithPopup(provider);
        // Auth state listener will handle the rest
    } catch (error) {
        console.error("Firebase Login Error", error);
        alert("خطأ في تسجيل الدخول: " + error.message);
    }
}

async function signOutUser() {
    if (firebase) {
        await firebase.auth().signOut();
        cart = []; // clear cart locally
        updateCartUI();
        document.getElementById('my-orders-modal').classList.remove('active');
    }
}

// Remove the explicit Auth UI call from here as it's handled by observer
function updateAuthUI() {
    renderAuthUI();
}

// --- Product Logic ---
function renderAll() {
    if (!menContainer) return;
    menContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#fff;">جاري تحميل المنتجات...</div>';

    let localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');

    if (supabase) {
        supabase.from('products').select('*').then(({ data, error }) => {
            let fireProds = [];
            if (!error && data) {
                fireProds = data;
            }
            combineAndRender(fireProds, localProds);
        }).catch(() => combineAndRender([], localProds));
    } else {
        combineAndRender([], localProds);
    }
}

function combineAndRender(fireProds, localProds) {
    remoteProducts = [...fireProds, ...localProds];
    // Fallback if empty and products variable exists (local js file)
    if (remoteProducts.length === 0 && typeof products !== 'undefined') remoteProducts = products;

    // Unique by name/id
    const seen = new Set();
    remoteProducts = remoteProducts.filter(p => {
        const id = p.id || p.name;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });

    // Manual Sort
    remoteProducts.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    filterAndRender('men', activeCategory, 'all');
}

function renderSubFilters(parent) {
    if (!subFiltersContainer) return;
    const subs = parentSubMap[parent] || [];
    if (subs.length === 0) {
        subFiltersContainer.classList.remove('active');
        subFiltersContainer.style.display = 'none';
        return;
    }

    subFiltersContainer.innerHTML = '<button class="sub-btn active" onclick="applySubFilter(\'' + parent + '\', \'all\', this)">الكل</button>' +
        subs.map(s => `<button class="sub-btn" onclick="applySubFilter('${parent}', '${s.id}', this)">${s.label}</button>`).join('');

    subFiltersContainer.style.display = 'flex';
    subFiltersContainer.classList.add('active');
}

window.applySubFilter = (parent, subId, btn) => {
    subFiltersContainer.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterAndRender('men', parent, subId);
};

function filterAndRender(section, parent, sub) {
    if (!menContainer) return;
    // Hide products with status: 'hidden'
    let filtered = remoteProducts.filter(p => p.status !== 'hidden');

    if (parent !== 'all') {
        if (parent === 'clothes') {
            const clothesSubs = parentSubMap.clothes.map(s => s.id);
            filtered = filtered.filter(p => clothesSubs.includes(p.subCategory) || p.subCategory === 'clothes' || p.parentCategory === 'clothes');
        } else if (parent === 'pants') {
            const pantsSubs = parentSubMap.pants.map(s => s.id);
            filtered = filtered.filter(p => pantsSubs.includes(p.subCategory) || p.subCategory === 'pants' || p.parentCategory === 'pants');
        } else {
            filtered = filtered.filter(p => p.subCategory === parent || p.parentCategory === parent);
        }
    }

    if (sub !== 'all') {
        filtered = filtered.filter(p => p.subCategory === sub);
    }

    if (filtered.length === 0) {
        menContainer.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; opacity:0.5;">لا توجد نتائج مطابقة</div>`;
        return;
    }

    menContainer.innerHTML = filtered.map(p => `
        <div class="product-card" data-aos="fade-up">
            <div class="product-img">
                ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
                <img src="${p.image}" loading="lazy" alt="${p.name}">
                <div class="product-actions" onclick="openSizeModal('${p.id}')">
                    <button class="action-btn"><i class="fas fa-shopping-cart"></i></button>
                </div>
            </div>
            <div class="product-info">
                <span class="product-category-tag">Diesel Men</span>
                <h3>${p.name}</h3>
                <div class="price">${p.price}</div>
            </div>
        </div>
    `).join('');
}

// --- Cart Logic ---
window.openSizeModal = (id) => {
    const p = remoteProducts.find(prod => prod.id === id);
    if (!p) return;
    selectedProductForSize = p;
    selectedColor = (p.colorVariants && p.colorVariants.length > 0) ? p.colorVariants[0].name : "أساسي";

    modalProductName.innerText = p.name;
    modalProductPrice.innerText = `${p.price} جنيه`;
    document.getElementById('modal-img').src = p.image;

    // Colors
    const colorContainer = document.getElementById('modal-color-options');
    const colors = (p.colorVariants && p.colorVariants.length > 0) ? p.colorVariants.map(v => v.name) : ["أساسي"];
    colorContainer.innerHTML = colors.map((c, i) => `<button class="color-btn ${i === 0 ? 'selected' : ''}" onclick="modalSelectColor('${c}', this)">${c}</button>`).join('');

    // Update selected color state
    selectedColor = colors[0];

    // Initial Image for Color
    if (p.colorVariants && p.colorVariants[0] && p.colorVariants[0].image) document.getElementById('modal-img').src = p.colorVariants[0].image;

    // Sizes
    renderModalSizes(p, selectedColor);
    sizeModal.classList.add('active');
};

// Global handlers for buttons generated via innerHTML
window.modalSelectColor = (color, btn) => {
    selectedColor = color;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const p = selectedProductForSize;
    if (p.colorVariants) {
        const v = p.colorVariants.find(x => x.name === color);
        if (v && v.image) document.getElementById('modal-img').src = v.image;
        else document.getElementById('modal-img').src = p.image;
        renderModalSizes(p, color);
    }
};

function renderModalSizes(p, color) {
    const container = document.querySelector('.size-options');
    const sizeLabel = document.querySelector('.size-label:last-of-type');

    let sizes = p.sizes || [];
    if (p.colorVariants && p.colorVariants.length > 0) {
        const v = p.colorVariants.find(x => x.name === color);
        if (v && v.sizes && v.sizes.length > 0) {
            sizes = v.sizes;
        } else if (v) {
            sizes = []; // This specific color has no sizes
        }
    }

    if (sizes.length > 0) {
        if (sizeLabel) sizeLabel.style.display = 'block';
        container.innerHTML = sizes.map(s => `<button class="size-btn" onclick="addToCartFromModal('${s}')">${s}</button>`).join('');
    } else {
        if (sizeLabel) sizeLabel.style.display = 'none';
        container.innerHTML = '<p style="color:var(--primary); font-weight:bold; width:100%; margin:10px 0;">عفواً، هذا اللون غير متوفر حالياً</p>';
    }
}

window.addToCartFromModal = (size) => {
    const p = selectedProductForSize;
    const color = selectedColor;
    const cartId = `${p.id}-${size}-${color}`;

    let img = p.image;
    if (p.colorVariants) {
        const v = p.colorVariants.find(x => x.name === color);
        if (v && v.image) img = v.image;
    }

    const existing = cart.find(i => i.cartId === cartId);
    if (existing) existing.quantity++;
    else cart.push({ ...p, cartId, size, color, quantity: 1, image: img });

    updateCartUI();
    saveCartToSupabase();
    sizeModal.classList.remove('active');
    openCartSidebar();
};

function updateCartUI() {
    document.querySelectorAll('.cart-count').forEach(c => c.innerText = cart.reduce((s, i) => s + i.quantity, 0));
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-price');
    if (!list) return;

    if (cart.length === 0) {
        list.innerHTML = '<div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; opacity:0.5; gap:20px;">' +
            '<i class="fas fa-shopping-bag" style="font-size:3rem;"></i>' +
            '<p>السلة فارغة حالياً</p>' +
            '</div>';
        totalEl.innerText = '0 جنيه';
    } else {
        list.innerHTML = cart.map(i => `
            <div class="cart-item">
                <img src="${i.image}" alt="${i.name}">
                
                <div class="cart-item-info">
                    <h4>${i.name}</h4>
                    <div class="cart-item-details">
                        ${i.size || 'M'} | ${i.color || 'أساسي'}
                    </div>
                    
                    <div class="qty-control">
                        <button class="qty-btn-inc" onclick="updateCartQuantity('${i.cartId}', 1)">+</button>
                        <span>${i.quantity}</span>
                        <button class="qty-btn-dec" onclick="updateCartQuantity('${i.cartId}', -1)">−</button>
                    </div>
                </div>

                <div class="delete-btn" onclick="removeFromCart('${i.cartId}')">
                    <i class="fas fa-trash-alt"></i>
                </div>
            </div>
        `).join('');
        totalEl.innerText = `${cart.reduce((s, i) => s + (i.price * i.quantity), 0)} جنيه`;
    }
    // Sync checkout total if modal is open (or update it anyway)
    if (document.getElementById('checkout-modal').classList.contains('active')) {
        updateCheckoutTotal();
    }
}

window.updateCartQuantity = (id, d) => {
    const i = cart.find(x => x.cartId === id);
    if (i) { i.quantity += d; if (i.quantity <= 0) removeFromCart(id); else { updateCartUI(); saveCartToSupabase(); } }
};

window.removeFromCart = (id) => { cart = cart.filter(x => x.cartId !== id); updateCartUI(); saveCartToSupabase(); };

function openCartSidebar() { cartSidebar.classList.add('open'); cartOverlay.classList.add('show'); }
function closeCartSidebar() { cartSidebar.classList.remove('open'); cartOverlay.classList.remove('show'); }
function closeMobileMenu() { if (mobileMenuBtn) { mobileMenuBtn.classList.remove('active'); navLinks.classList.remove('active'); } }

// Duplicate Supabase Auth functions removed to use Firebase Auth above

function updateAuthUI() {
    const name = currentUser ? (currentUser.user_metadata.full_name ? currentUser.user_metadata.full_name.split(' ')[0] : 'حسابي') : null;
    renderAuthUI(name);
}

window.openMyOrdersModal = () => {
    const modal = document.getElementById('my-orders-modal');
    const loginSection = document.getElementById('orders-login-section');
    const listSection = document.getElementById('orders-list-section');

    if (currentUser) {
        loginSection.style.display = 'none';
        listSection.style.display = 'block';
        document.getElementById('user-email-display').innerText = currentUser.email;
        loadMyOrders();
    } else {
        loginSection.style.display = 'block';
        listSection.style.display = 'none';
    }
    modal.classList.add('active');
};

async function loadMyOrders() {
    const list = document.getElementById('my-orders-list');
    list.innerHTML = 'جاري التحميل...';
    if (!supabase) {
        list.innerHTML = '<div style="text-align:center; padding:40px; opacity:0.5;">غير متصل بالإنترنت</div>';
        return;
    }
    try {
        const { data: orders, error } = await supabase.from('orders')
            .select('*')
            .eq('userId', currentUser.id)
            .order('createdAt', { ascending: false });

        if (error) throw error;

        // If no orders by ID, try by email (legacy/guest support)
        let finalOrders = orders;
        if (!finalOrders || finalOrders.length === 0) {
            const { data: emailOrders } = await supabase.from('orders')
                .select('*')
                .eq('userEmail', currentUser.email)
                .order('createdAt', { ascending: false });
            finalOrders = emailOrders || [];
        }

        list.innerHTML = finalOrders.map(o => {
            const statusClass = o.status === 'جديد' ? 'status-new' :
                o.status === 'جاري التجهيز' ? 'status-preparing' :
                    o.status === 'تم الشحن' ? 'status-shipped' :
                        o.status === 'تم التسليم' ? 'status-delivered' : 'status-new';

            const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString('ar-EG') : '';

            // Handle items being string (from existing code) or JSON
            let items = o.items;
            if (typeof items === 'string') {
                try { items = JSON.parse(items); } catch (e) { }
            }

            return `
            <div class="order-card-mini">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:10px;">
                    <span style="font-size:0.85rem; opacity:0.6; font-family:'Outfit', sans-serif;">${date}</span>
                    <span class="order-status ${statusClass}">${o.status}</span>
                </div>
                
                <div class="order-items-list">
                    ${items.map(i => `
                        <div style="display:flex; align-items:center; gap:15px; margin-bottom:12px;">
                            <img src="${i.image}" style="width:50px; height:60px; object-fit:cover; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                            <div style="flex:1; text-align:right;">
                                <div style="font-weight:700; font-size:0.95rem;">${i.name}</div>
                                <div style="font-size:0.8rem; opacity:0.6;">${i.size} | ${i.color} | x${i.quantity}</div>
                            </div>
                            <div style="font-weight:900; color:var(--primary);">${i.price} ج.م</div>
                        </div>
                    `).join('')}
                </div>

                <div style="margin-top:15px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700;">إجمالي الطلب:</span>
                    <span style="font-weight:900; font-size:1.2rem; color:var(--primary); font-family:'Outfit', sans-serif;">${o.total} جنيه</span>
                </div>
            </div>`;
        }).join('') || '<div style="text-align:center; padding:40px; opacity:0.5;">لا توجد طلبات سابقة</div>';
    } catch (e) { console.error(e); list.innerHTML = 'خطأ في التحميل'; }
}

async function saveCartToSupabase() {
    localStorage.setItem('diesel_cart', JSON.stringify(cart));
    if (currentUser && supabase) {
        // Upsert cart to Supabase
        await supabase.from('user_carts').upsert({ userId: currentUser.id, items: cart, updatedAt: new Date() });
    }
}

async function loadCartFromSupabase() {
    if (!currentUser || !supabase) return;
    const { data } = await supabase.from('user_carts').select('items').eq('userId', currentUser.id).single();
    if (data && data.items) {
        const remote = data.items;
        if (remote.length > 0) { cart = remote; updateCartUI(); }
    }
}

function initTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('theme-toggle')?.querySelector('i');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const icon = document.getElementById('theme-toggle')?.querySelector('i');
    if (icon) icon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) modal.classList.remove('active');
}
