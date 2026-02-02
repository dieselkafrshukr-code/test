// 🚀 DIESEL SHOP - INVINCIBLE ENGINE
let cart = [];
try {
    const saved = localStorage.getItem('diesel_cart');
    if (saved) cart = JSON.parse(saved);
    console.log("📦 Initial cart loaded from localStorage:", cart);
} catch (e) {
    console.error("❌ Error parsing cart from localStorage:", e);
    cart = [];
}

let selectedProductForSize = null;
let selectedColor = null;
let activeCategory = "men";
let remoteProducts = []; // To store products from Firebase

// Firebase Config (Must match admin.js)
const firebaseConfig = {
    apiKey: "AIzaSyBFRqe3lhvzG0FoN0uAJlAP-VEz9bKLjUc",
    authDomain: "mre23-4644a.firebaseapp.com",
    projectId: "mre23-4644a",
    storageBucket: "mre23-4644a.firebasestorage.app",
    messagingSenderId: "179268769077",
    appId: "1:179268769077:web:d9fb8cd25ad284ae0de87c"
};

// Initialize Firebase if config is provided
let currentUser = null;
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();

    // Auth State Listener
    firebase.auth().onAuthStateChanged(user => {
        currentUser = user;
        if (window.initialized) {
            updateAuthUI();
            if (user) loadCartFromFirebase();
        }
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
    updateAuthUI(); // Update UI if auth triggered before init
    updateCartUI(); // Initial UI sync
    if (currentUser) loadCartFromFirebase(); // Sync if logged in
    renderAll();

    // Auto-hide loader (Slowed down for more premium feel)
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 800);
        }, 2500);
    }
};

document.addEventListener('DOMContentLoaded', initAll);

// Backup: If script loads after DOM is already ready
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
    // Nav & Section Anchors
    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                const navHeight = navbar.offsetHeight;
                window.scrollTo({
                    top: target.offsetTop - navHeight,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Cart Sidebar
    if (cartBtn) {
        cartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openCartSidebar();
        });
    }
    if (closeCart) closeCart.onclick = closeCartSidebar;
    if (cartOverlay) cartOverlay.onclick = closeCartSidebar;

    // Size Modal Close
    if (closeModal) {
        closeModal.onclick = () => sizeModal.classList.remove('active');
    }
    window.addEventListener('click', (e) => {
        if (e.target === sizeModal) sizeModal.classList.remove('active');
        if (e.target === document.getElementById('checkout-modal')) {
            document.getElementById('checkout-modal').classList.remove('active');
        }
        if (e.target === document.getElementById('my-orders-modal')) {
            document.getElementById('my-orders-modal').classList.remove('active');
        }
    });

    // Mobile Menu
    if (mobileMenuBtn) {
        mobileMenuBtn.onclick = () => {
            navLinks.classList.toggle('active');
        };
    }

    // Admin Panel Shortcut - FIXED & MORE ROBUST
    const adminBtn = document.getElementById('admin-login-btn');
    if (adminBtn) {
        adminBtn.style.cursor = 'pointer';
        adminBtn.style.opacity = '1'; // Ensure it's fully visible
        adminBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("🚀 Navigating to Admin Panel...");
            sessionStorage.setItem('force_admin_login', 'true');
            window.location.href = 'admin.html';
        });
    }

    // Theme Toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme();
        });
    }

    // Checkout Form Submission
    const orderForm = document.getElementById('order-form');
    const checkoutModal = document.getElementById('checkout-modal');

    if (orderForm) {
        orderForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = orderForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;

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
                if (typeof db !== 'undefined') {
                    await db.collection('orders').add(orderData);

                    // Clear cart
                    cart = [];
                    updateCartUI();
                    saveCartToFirebase();

                    // Show success
                    checkoutModal.classList.remove('active');
                    document.getElementById('success-modal').classList.add('active');
                    orderForm.reset();
                } else {
                    alert("حدث خطأ في الاتصال بقاعدة البيانات. برجاء المحاولة لاحقاً.");
                }
            } catch (error) {
                console.error("Error adding order: ", error);
                alert("حدث خطأ أثناء إرسال الطلب. برجاء المحاولة مرة أخرى.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        };
    }

    // Categories Sub-Filters
    const mainCategoryButtons = document.querySelectorAll('.filter-btn');
    mainCategoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            mainCategoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.getAttribute('data-category');
            renderSubFilters(activeCategory);
            renderAll();
        });
    });

    // My Orders Modal Initial Setup
    setupOrdersEventListeners();
}

function renderSubFilters(category) {
    if (!subFiltersContainer) return;
    const subs = parentSubMap[category] || [];

    if (subs.length > 0) {
        subFiltersContainer.style.display = 'flex';
        subFiltersContainer.innerHTML = '<button class="sub-filter-btn active" data-sub="all">الكل</button>' +
            subs.map(s => `<button class="sub-filter-btn" data-sub="${s.id}">${s.label}</button>`).join('');

        const subBtns = subFiltersContainer.querySelectorAll('.sub-filter-btn');
        subBtns.forEach(b => {
            b.onclick = () => {
                subBtns.forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                renderAll(b.getAttribute('data-sub'));
            };
        });
    } else {
        subFiltersContainer.style.display = 'none';
        subFiltersContainer.innerHTML = '';
    }
}

async function fetchProducts() {
    if (typeof db === 'undefined') {
        console.warn("Firestore not available, using products.js");
        return products;
    }
    try {
        const snapshot = await db.collection('products').get();
        remoteProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return remoteProducts;
    } catch (error) {
        console.error("Error fetching products from Firebase:", error);
        return products;
    }
}

async function renderAll(subFilter = 'all') {
    if (!menContainer) return;

    // Show skeletons or clear
    menContainer.innerHTML = Array(4).fill(0).map(() => '<div class="product-skeleton"></div>').join('');

    const allData = await fetchProducts();
    let filtered = allData.filter(p => p.parentCategory === activeCategory);

    if (subFilter !== 'all') {
        filtered = filtered.filter(p => p.subCategory === subFilter);
    }

    if (filtered.length === 0) {
        menContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; opacity: 0.5;">قريباً...</div>';
        return;
    }

    menContainer.innerHTML = filtered.map(p => `
        <div class="product-card" data-aos="fade-up">
            ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
            <div class="product-image">
                <img src="${p.image}" alt="${p.name}" loading="lazy">
                <div class="product-actions" onclick="openSizeModal('${p.id}')">
                    <button class="btn-add">إضافة للسلة</button>
                </div>
            </div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="price-container">
                    <span class="price">${p.price} جنيه</span>
                    ${p.oldPrice ? `<span class="old-price">${p.oldPrice} جنيه</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

window.openSizeModal = async (id) => {
    const p = (remoteProducts.length > 0 ? remoteProducts : products).find(x => x.id === id);
    if (!p) return;
    selectedProductForSize = p;

    modalProductName.innerText = p.name;
    modalProductPrice.innerText = `${p.price} جنيه`;

    const img = document.getElementById('modal-img');
    img.src = p.image;

    // Render Colors
    const colorContainer = document.querySelector('.color-options');
    if (colorContainer) {
        const colors = (p.colorVariants && p.colorVariants.length > 0)
            ? p.colorVariants.map(v => v.name)
            : (p.colors && p.colors.length > 0 ? p.colors : ["أساسي"]);

        colorContainer.innerHTML = colors.map((c, index) =>
            `<button class="color-btn ${index === 0 ? 'selected' : ''}">${c}</button>`
        ).join('');

        const colorBtns = colorContainer.querySelectorAll('.color-btn');
        colorBtns.forEach(btn => {
            btn.onclick = () => {
                colorBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                const selectedC = btn.innerText;

                // Update Image if variant exists
                if (p.colorVariants) {
                    const variant = p.colorVariants.find(v => v.name === selectedC);
                    if (variant && variant.image) img.src = variant.image;

                    // Update Sizes for this color
                    if (variant && variant.sizes && variant.sizes.length > 0) {
                        const sizeContainer = document.querySelector('.size-options');
                        sizeContainer.innerHTML = variant.sizes.map(s => `<button class="size-btn">${s}</button>`).join('');
                        attachSizeEvents();
                    }
                }
            };
        });
    }

    // Re-render sizes for initial color
    const sizeContainer = document.querySelector('.size-options');
    let initialSizes = p.sizes || [];
    if (p.colorVariants && p.colorVariants.length > 0) {
        if (p.colorVariants[0].sizes) initialSizes = p.colorVariants[0].sizes;
    }
    sizeContainer.innerHTML = initialSizes.map(s => `<button class="size-btn">${s}</button>`).join('');
    attachSizeEvents();

    sizeModal.classList.add('active');
};

function attachSizeEvents() {
    const sizeBtns = document.querySelectorAll('.size-btn');
    sizeBtns.forEach(btn => {
        btn.onclick = () => {
            sizeBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        };
    });
}

window.addToCartFromModal = () => {
    const selectedSizeBtn = document.querySelector('.size-btn.selected');
    const selectedColorBtn = document.querySelector('.color-btn.selected');

    if (!selectedSizeBtn) {
        showToast("يرجى اختيار المقاس");
        return;
    }

    const size = selectedSizeBtn.innerText;
    const color = selectedColorBtn ? selectedColorBtn.innerText : "أساسي";
    const p = selectedProductForSize;
    const cartId = `${p.id}-${size}-${color}`;

    let cartImage = p.image;
    if (p.colorVariants) {
        const variant = p.colorVariants.find(v => v.name === color);
        if (variant && variant.image) cartImage = variant.image;
    }

    const existing = cart.find(i => i.cartId === cartId);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ ...p, cartId, size, color, quantity: 1, image: cartImage });
    }

    updateCartUI();
    saveCartToFirebase();
    sizeModal.classList.remove('active');
    openCartSidebar();
};

window.removeFromCart = (id) => {
    cart = cart.filter(i => i.cartId !== id);
    updateCartUI();
    saveCartToFirebase();
};

window.updateCartQuantity = (id, delta) => {
    const item = cart.find(i => i.cartId === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            updateCartUI();
            saveCartToFirebase();
        }
    }
};

function updateCartUI() {
    const counts = document.querySelectorAll('.cart-count');
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-price');

    // Always update the count badges if they exist
    const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
    counts.forEach(c => c.innerText = totalQty);

    // Stop if the sidebar elements aren't ready yet
    if (!list || !totalEl) return;

    if (cart.length === 0) {
        list.innerHTML = '<p class="empty-msg">السلة فارغة حالياً</p>';
        totalEl.innerText = '0 جنيه';
    } else {
        list.innerHTML = cart.map(i => `
            <div class="cart-item">
                <img src="${i.image}">
                <div class="cart-item-info">
                    <h4>${i.name}</h4>
                    <div class="cart-item-details">المقاس: <span>${i.size}</span> | اللون: <span>${i.color}</span></div>
                    
                    <div class="qty-control" style="display:flex; align-items:center; gap:10px; margin-top:8px;">
                        <button onclick="updateCartQuantity('${i.cartId}', -1)" style="background:rgba(255,255,255,0.1); border:none; color:#fff; width:28px; height:28px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="fas fa-minus" style="font-size:0.8rem;"></i></button>
                        <span style="font-weight:bold; font-size:1rem; min-width:24px; text-align:center;">${i.quantity}</span>
                        <button onclick="updateCartQuantity('${i.cartId}', 1)" style="background:var(--primary); border:none; color:#fff; width:28px; height:28px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="fas fa-plus" style="font-size:0.8rem;"></i></button>
                    </div>

                    <div style="color:#d4af37; font-weight:800; margin-top:10px; font-size:1.1rem;">${i.price * i.quantity} جنيه</div>
                </div>
                <button onclick="removeFromCart('${i.cartId}')" style="background:none; border:none; color:#ff4444; cursor:pointer; font-size:1.2rem; padding:8px; align-self: flex-start;">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `).join('');
        const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
        totalEl.innerText = `${total} جنيه`;
    }
}

function openCartSidebar() {
    cartSidebar.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartSidebar() {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

window.openCheckout = () => {
    if (cart.length === 0) {
        showToast("السلة فارغة");
        return;
    }
    const checkoutModal = document.getElementById('checkout-modal');
    closeCartSidebar();
    checkoutModal.classList.add('active');
};

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    if (!themeToggle) return;
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

window.closeSuccessModal = () => {
    document.getElementById('success-modal').classList.remove('active');
};

// ========== CART FIREBASE SYNC ==========

async function saveCartToFirebase() {
    console.log("💾 Saving cart...", cart);
    // Save to localStorage always as backup
    localStorage.setItem('diesel_cart', JSON.stringify(cart));

    if (!currentUser || typeof db === 'undefined') {
        console.log("ℹ️ No user logged in, only local save.");
        return;
    }

    try {
        await db.collection('user_carts').doc(currentUser.uid).set({
            items: cart,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("✅ Cart saved to Firebase for user:", currentUser.uid);
    } catch (error) {
        console.error("❌ Error saving cart to Firebase:", error);
    }
}

async function loadCartFromFirebase() {
    if (!currentUser || typeof db === 'undefined') return;
    console.log("⏳ Loading cart from Firebase for:", currentUser.uid);

    try {
        const doc = await db.collection('user_carts').doc(currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            console.log("📄 Remote cart found:", data);
            if (data.items) {
                const remoteItems = data.items || [];
                let merged = [...cart];
                let changed = false;

                remoteItems.forEach(ri => {
                    const existing = merged.find(li => li.cartId === ri.cartId);
                    if (!existing) {
                        merged.push(ri);
                        changed = true;
                    } else {
                        if (ri.quantity > existing.quantity) {
                            existing.quantity = ri.quantity;
                            changed = true;
                        }
                    }
                });

                if (changed) {
                    console.log("🔄 Merged remote items into local cart.");
                    cart = merged;
                    updateCartUI();
                    saveCartToFirebase();
                } else {
                    console.log("✅ Local cart is already up to date.");
                }
            }
        } else {
            console.log("📭 No remote cart document found. Current cart will be saved on next action.");
            if (cart.length > 0) {
                saveCartToFirebase();
            }
        }
    } catch (error) {
        console.error("❌ Error loading cart from Firebase:", error);
    }
}

// ========== CUSTOMER AUTH & ORDERS TRACKING ==========

function updateAuthUI() {
    const authText = document.getElementById('auth-text');
    const authBtn = document.getElementById('my-orders-btn');
    const cartAuthBox = document.getElementById('cart-auth-box');
    const loginBanner = document.getElementById('login-prompt-banner');

    if (currentUser) {
        if (authText) authText.innerText = currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'حسابي';
        if (authBtn) authBtn.classList.add('logged-in');
        if (cartAuthBox) cartAuthBox.style.display = 'none';
        if (loginBanner) loginBanner.style.display = 'none';
    } else {
        if (authText) authText.innerText = 'دخول';
        if (authBtn) authBtn.classList.remove('logged-in');
        if (cartAuthBox) cartAuthBox.style.display = 'block';
        if (loginBanner) loginBanner.style.display = 'block';
    }
}

function setupOrdersEventListeners() {
    const myOrdersBtn = document.getElementById('my-orders-btn');
    const myOrdersModal = document.getElementById('my-orders-modal');
    const closeOrdersModal = document.getElementById('close-orders-modal');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (myOrdersBtn) {
        myOrdersBtn.onclick = (e) => {
            e.preventDefault();
            window.openMyOrdersModal();
        };
    }

    if (closeOrdersModal) {
        closeOrdersModal.onclick = () => {
            if (myOrdersModal) myOrdersModal.classList.remove('active');
        };
    }

    if (googleLoginBtn) {
        googleLoginBtn.onclick = window.signInWithGoogle;
    }

    if (logoutBtn) {
        logoutBtn.onclick = window.signOutUser;
    }
}

window.openMyOrdersModal = () => {
    const modal = document.getElementById('my-orders-modal');
    const loginSection = document.getElementById('orders-login-section');
    const ordersSection = document.getElementById('orders-list-section');
    if (!modal) return;

    if (currentUser) {
        if (loginSection) loginSection.style.display = 'none';
        if (ordersSection) ordersSection.style.display = 'block';
        const emailDisplay = document.getElementById('user-email-display');
        if (emailDisplay) emailDisplay.innerText = currentUser.email;
        loadMyOrders();
    } else {
        if (loginSection) loginSection.style.display = 'block';
        if (ordersSection) ordersSection.style.display = 'none';
    }

    modal.classList.add('active');
};

window.signInWithGoogle = async () => {
    try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
        const provider = new firebase.auth.GoogleAuthProvider();
        await firebase.auth().signInWithPopup(provider);
        showToast("تم تسجيل الدخول بنجاح ✅");
        if (typeof window.openMyOrdersModal === 'function') {
            window.openMyOrdersModal();
        }
    } catch (error) {
        console.error("Google Sign-in Error:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            alert("حدث خطأ أثناء تسجيل الدخول: " + error.message);
        }
    }
};

window.signOutUser = async () => {
    try {
        await firebase.auth().signOut();
        // Clear cart on logout
        cart = [];
        localStorage.removeItem('diesel_cart');
        updateCartUI();

        showToast("تم تسجيل الخروج");
        const modal = document.getElementById('my-orders-modal');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.error("Sign-out Error:", error);
    }
};

async function loadMyOrders() {
    const ordersList = document.getElementById('my-orders-list');
    if (!currentUser || !db) return;

    ordersList.innerHTML = '<div style="text-align: center; padding: 30px; opacity: 0.5;">جاري تحميل الطلبات...</div>';

    try {
        // Try fetching by userId first, then by userEmail as fallback
        let snapshot = await db.collection('orders')
            .where('userId', '==', currentUser.uid)
            .get();

        // If no results, try by email
        if (snapshot.empty && currentUser.email) {
            snapshot = await db.collection('orders')
                .where('userEmail', '==', currentUser.email)
                .get();
        }

        // Sort results manually (newest first)
        let orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        orders.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });

        if (orders.length === 0) {
            ordersList.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px;"></i>
                    <p style="opacity: 0.6;">لا توجد طلبات مسجلة لهذا الحساب</p>
                    <p style="font-size: 0.8rem; margin-top: 10px; opacity: 0.5;">(${currentUser.email})</p>
                    <p style="font-size: 0.8rem; margin-top: 20px; color: var(--primary);">تنبيه: الطلبات التي تمت بدون تسجيل دخول لا تظهر هنا.</p>
                </div>`;
            return;
        }

        let html = '';
        orders.forEach(order => {
            const dateStr = order.createdAt ? (order.createdAt.toDate ? order.createdAt.toDate().toLocaleDateString('ar-EG') : new Date(order.createdAt).toLocaleDateString('ar-EG')) : 'قيد المعالجة';
            const statusColor = getOrderStatusColor(order.status);

            html += `
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 0.85rem; opacity: 0.7;"><i class="fas fa-calendar"></i> ${dateStr}</span>
                        <span style="background: ${statusColor}; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold;">${order.status}</span>
                    </div>
                    <div style="font-size: 0.9rem; margin-bottom: 10px;">
                        ${order.items.map(i => `<div style="padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">${i.name} (${i.color} - ${i.size}) × ${i.quantity}</div>`).join('')}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <span style="font-weight: bold; color: var(--primary);">${order.total} جنيه</span>
                    </div>
                </div>`;
        });

        ordersList.innerHTML = html;

    } catch (error) {
        console.error("Error loading orders:", error);
        ordersList.innerHTML = '<div style="text-align: center; padding: 30px; color: #f44336;">حدث خطأ في تحميل الطلبات</div>';
    }
}

function getOrderStatusClass(status) {
    const map = {
        'جديد': 'new',
        'جاري التجهيز': 'preparing',
        'تم الشحن': 'shipped',
        'تم التسليم': 'delivered'
    };
    return map[status] || 'default';
}

function getOrderStatusColor(status) {
    const map = {
        'جديد': '#2196F3',
        'جاري التجهيز': '#FF9800',
        'تم الشحن': '#9C27B0',
        'تم التسليم': '#4CAF50',
        'ملغي': '#f44336'
    };
    return map[status] || '#666';
}
