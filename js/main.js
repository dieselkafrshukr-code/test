// 🚀 DIESEL SHOP - INVINCIBLE ENGINE
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
let remoteProducts = []; // To store products from Firebase

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBFRqe3lhvzG0FoN0uAJlAP-VEz9bKLjUc",
    authDomain: "mre23-4644a.firebaseapp.com",
    projectId: "mre23-4644a",
    storageBucket: "mre23-4644a.firebasestorage.app",
    messagingSenderId: "179268769077",
    appId: "1:179268769077:web:d9fb8cd25ad284ae0de87c"
};

// Initialize Firebase
let currentUser = null;
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();

    // Auth State Listener for Customers
    firebase.auth().onAuthStateChanged(user => {
        currentUser = user;
        updateAuthUI();
        if (user) loadCartFromFirebase();
    });
}

// DOM Elements
let menContainer, cartBtn, closeCart, cartSidebar, cartOverlay, loader, navbar, sizeModal, closeModal, modalProductName, modalProductPrice, mobileMenuBtn, navLinks, themeToggle, subFiltersContainer;

const initAll = () => {
    if (window.initialized) return;
    window.initialized = true;

    initElements();
    initTheme();
    setupEventListeners();
    updateCartUI();
    renderAll();

    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 800);
        }, 2200);
    }
};

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
}

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

    // Admin Panel Link
    const adminBtn = document.getElementById('admin-login-btn');
    if (adminBtn) {
        adminBtn.onclick = (e) => {
            e.preventDefault();
            sessionStorage.setItem('force_admin_login', 'true');
            window.location.href = "admin.html";
        };
    }

    if (closeModal) closeModal.onclick = () => sizeModal.classList.remove('active');

    // Checkout Button - MUST OPEN MODAL
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.onclick = () => {
            if (cart.length === 0) return alert("السلة فارغة!");
            closeCartSidebar();
            document.getElementById('checkout-modal').classList.add('active');
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
            const submitBtn = orderForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = "جاري تأكيد الطلب...";

            const orderData = {
                customerName: document.getElementById('customer-name').value,
                phone: document.getElementById('customer-phone').value,
                address: document.getElementById('customer-address').value,
                items: cart.map(i => ({
                    id: i.id,
                    name: i.name,
                    size: i.size,
                    color: i.color,
                    quantity: i.quantity,
                    price: i.price,
                    total: i.price * i.quantity
                })),
                total: cart.reduce((s, i) => s + (i.price * i.quantity), 0),
                status: "جديد",
                userId: currentUser ? currentUser.uid : null,
                userEmail: currentUser ? currentUser.email : null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                await db.collection('orders').add(orderData);
                cart = [];
                updateCartUI();
                saveCartToFirebase();
                document.getElementById('checkout-modal').classList.remove('active');
                document.getElementById('success-modal').classList.add('active');
                orderForm.reset();
            } catch (err) {
                alert("حدث خطأ!");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "تأكيد الطلب الآن ✨";
            }
        };
    }

    // Google Login & Logout Buttons
    const gLogin = document.getElementById('google-login-btn');
    if (gLogin) gLogin.onclick = signInWithGoogle;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = signOutUser;

    const myOrdersBtn = document.getElementById('my-orders-btn');
    if (myOrdersBtn) myOrdersBtn.onclick = (e) => { e.preventDefault(); openMyOrdersModal(); };

    const closeOrders = document.getElementById('close-orders-modal');
    if (closeOrders) closeOrders.onclick = () => document.getElementById('my-orders-modal').classList.remove('active');
}

// --- Product Logic (Restored to User Structure) ---
function renderAll() {
    if (!menContainer) return;
    menContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#fff;">جاري تحميل المنتجات...</div>';

    let localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');

    if (typeof db !== 'undefined') {
        db.collection('products').get().then(snapshot => {
            let fireProds = [];
            snapshot.forEach(doc => fireProds.push({ id: doc.id, ...doc.data() }));
            combineAndRender(fireProds, localProds);
        }).catch(() => combineAndRender([], localProds));
    } else {
        combineAndRender([], localProds);
    }
}

function combineAndRender(fireProds, localProds) {
    remoteProducts = [...fireProds, ...localProds];
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
    let filtered = remoteProducts;

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
    let sizes = p.sizes || [];
    if (p.colorVariants) {
        const v = p.colorVariants.find(x => x.name === color);
        if (v && v.sizes && v.sizes.length > 0) sizes = v.sizes;
    }
    container.innerHTML = sizes.map(s => `<button class="size-btn" onclick="addToCartFromModal('${s}')">${s}</button>`).join('');
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
    saveCartToFirebase();
    sizeModal.classList.remove('active');
    openCartSidebar();
};

function updateCartUI() {
    document.querySelectorAll('.cart-count').forEach(c => c.innerText = cart.reduce((s, i) => s + i.quantity, 0));
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-price');
    if (!list) return;

    if (cart.length === 0) {
        list.innerHTML = '<p class="empty-msg">السلة فارغة حالياً</p>';
        totalEl.innerText = '0 جنيه';
    } else {
        list.innerHTML = cart.map(i => `
            <div class="cart-item">
                <img src="${i.image}">
                <div class="cart-item-info">
                    <h4>${i.name}</h4>
                    <div class="cart-item-details"><span>${i.size}</span> | <span>${i.color}</span></div>
                    <div class="qty-control" style="display:flex; align-items:center; gap:10px; margin-top:8px;">
                        <button onclick="updateCartQuantity('${i.cartId}', -1)">-</button>
                        <span>${i.quantity}</span>
                        <button onclick="updateCartQuantity('${i.cartId}', 1)">+</button>
                    </div>
                </div>
                <button onclick="removeFromCart('${i.cartId}')" style="color:red; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
        totalEl.innerText = `${cart.reduce((s, i) => s + (i.price * i.quantity), 0)} جنيه`;
    }
}

window.updateCartQuantity = (id, d) => {
    const i = cart.find(x => x.cartId === id);
    if (i) { i.quantity += d; if (i.quantity <= 0) removeFromCart(id); else { updateCartUI(); saveCartToFirebase(); } }
};

window.removeFromCart = (id) => { cart = cart.filter(x => x.cartId !== id); updateCartUI(); saveCartToFirebase(); };

function openCartSidebar() { cartSidebar.classList.add('open'); cartOverlay.classList.add('show'); }
function closeCartSidebar() { cartSidebar.classList.remove('open'); cartOverlay.classList.remove('show'); }
function closeMobileMenu() { if (mobileMenuBtn) { mobileMenuBtn.classList.remove('active'); navLinks.classList.remove('active'); } }

// --- Auth & Orders (Latest Features) ---
async function signInWithGoogle() {
    try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        const provider = new firebase.auth.GoogleAuthProvider();
        await firebase.auth().signInWithPopup(provider);
        openMyOrdersModal();
    } catch (e) { alert("خطأ في الدخول"); }
}

async function signOutUser() {
    await firebase.auth().signOut();
    cart = [];
    localStorage.removeItem('diesel_cart');
    updateCartUI();
    document.getElementById('my-orders-modal').classList.remove('active');
}

function updateAuthUI() {
    const txt = document.getElementById('auth-text');
    if (currentUser) {
        txt.innerText = currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'حسابي';
        document.getElementById('cart-auth-box').style.display = 'none';
        document.getElementById('login-prompt-banner').style.display = 'none';
    } else {
        txt.innerText = 'دخول';
        document.getElementById('cart-auth-box').style.display = 'block';
        document.getElementById('login-prompt-banner').style.display = 'block';
    }
}

window.openMyOrdersModal = () => {
    const modal = document.getElementById('my-orders-modal');
    if (currentUser) {
        document.getElementById('orders-login-section').style.display = 'none';
        document.getElementById('orders-list-section').style.display = 'block';
        document.getElementById('user-email-display').innerText = currentUser.email;
        loadMyOrders();
    } else {
        document.getElementById('orders-login-section').style.display = 'block';
        document.getElementById('orders-list-section').style.display = 'none';
    }
    modal.classList.add('active');
};

async function loadMyOrders() {
    const list = document.getElementById('my-orders-list');
    list.innerHTML = 'جاري التحميل...';
    try {
        const snap = await db.collection('orders').where('userId', '==', currentUser.uid).get();
        let orders = []; snap.forEach(doc => orders.push(doc.data()));
        if (orders.length === 0) {
            const snapEmail = await db.collection('orders').where('userEmail', '==', currentUser.email).get();
            snapEmail.forEach(doc => orders.push(doc.data()));
        }
        orders.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

        list.innerHTML = orders.map(o => `
            <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between;">
                    <span>${o.createdAt?.toDate().toLocaleDateString('ar-EG') || ''}</span>
                    <span style="color:var(--primary)">${o.status}</span>
                </div>
                <div style="font-size:0.8rem; margin:10px 0;">${o.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</div>
                <div style="font-weight:bold;">${o.total} جنيه</div>
            </div>
        `).join('') || 'لا توجد طلبات';
    } catch (e) { list.innerHTML = 'خطأ في التحميل'; }
}

async function saveCartToFirebase() {
    localStorage.setItem('diesel_cart', JSON.stringify(cart));
    if (currentUser && db) {
        await db.collection('user_carts').doc(currentUser.uid).set({ items: cart, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    }
}

async function loadCartFromFirebase() {
    if (!currentUser || !db) return;
    const doc = await db.collection('user_carts').doc(currentUser.uid).get();
    if (doc.exists) {
        const remote = doc.data().items || [];
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

function showToast(msg) { /* ... defined elsewhere or inline ... */ }
