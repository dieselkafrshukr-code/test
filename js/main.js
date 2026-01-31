// 🚀 DIESEL SHOP - INVINCIBLE ENGINE
let cart = [];
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
        updateAuthUI();
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
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.onclick = (e) => {
            const href = anchor.getAttribute('href');
            if (href === '#men-section' || href === '#home') {
                closeMobileMenu();
            }
        };
    });

    // Hierarchical Filter Tabs
    document.querySelectorAll('.main-filter-btn').forEach(btn => {
        btn.onclick = (e) => {
            const parent = btn.dataset.parent;
            document.querySelectorAll('.main-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            renderSubFilters(parent);
            filterAndRender('men', parent, 'all');
        };
    });

    // UI Toggles
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

    if (themeToggle) {
        themeToggle.onclick = (e) => {
            e.preventDefault();
            toggleTheme();
        };
    }

    const adminBtn = document.getElementById('admin-login-btn');
    if (adminBtn) {
        adminBtn.onclick = (e) => {
            e.preventDefault();
            const pass = prompt("الرجاء إدخال كلمة مرور المدير:");
            if (pass === "admin123") { // يمكنك تغيير كلمة المرور هنا
                window.location.href = "admin.html";
            } else if (pass !== null) {
                alert("كلمة المرور غير صحيحة! ❌");
            }
        };
    }

    if (closeModal) closeModal.onclick = () => sizeModal.classList.remove('active');

    // DYNAMIC SIZE SELECTION (FIXED)
    const sizeOptionsContainer = document.querySelector('.size-options');
    if (sizeOptionsContainer) {
        sizeOptionsContainer.onclick = (e) => {
            const btn = e.target.closest('.size-btn');
            if (btn && selectedProductForSize) {
                confirmAddToCart(selectedProductForSize, btn.innerText);
                sizeModal.classList.remove('active');
                showToast("تمت الإضافة للسلة بنجاح ✅");
            }
        };
    }

    // DYNAMIC COLOR SELECTION
    const colorOptionsContainer = document.getElementById('modal-color-options');
    if (colorOptionsContainer) {
        colorOptionsContainer.onclick = (e) => {
            const btn = e.target.closest('.color-btn');
            if (btn) {
                colorOptionsContainer.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedColor = btn.innerText;

                // Update modal image if color has a specific image
                if (selectedProductForSize && selectedProductForSize.colorVariants) {
                    const variant = selectedProductForSize.colorVariants.find(v => v.name === selectedColor);
                    if (variant) {
                        if (variant.image) document.getElementById('modal-img').src = variant.image;
                        else document.getElementById('modal-img').src = selectedProductForSize.image;

                        // UPDATE SIZES for this color
                        const sizeContainer = document.querySelector('.size-options');
                        const variantSizes = (variant.sizes && variant.sizes.length > 0) ? variant.sizes : (selectedProductForSize.sizes || []);
                        sizeContainer.innerHTML = variantSizes.map(s => `<button class="size-btn">${s}</button>`).join('');
                    }
                }
            }
        };
    }

    // Checkout Button
    const checkoutBtn = document.querySelector('.checkout-btn');
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckout = document.getElementById('close-checkout');
    const orderForm = document.getElementById('order-form');
    const formTotalPrice = document.getElementById('form-total-price');

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) return;
            const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
            formTotalPrice.innerText = `${total} جنيه`;
            checkoutModal.classList.add('active');
            closeCartSidebar();
        });
    }

    if (closeCheckout) {
        closeCheckout.onclick = () => checkoutModal.classList.remove('active');
    }

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
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.style = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:var(--primary); color:#fff; padding:12px 30px; border-radius:50px; z-index:9999; font-weight:bold; box-shadow:0 10px 30px rgba(0,0,0,0.5); animation: fadeInUp 0.3s ease;";
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 2000);
}

// Global scope functions
window.openSizeModal = (id) => {
    const p = remoteProducts.find(prod => prod.id === id);
    if (!p) return;
    selectedProductForSize = p;
    selectedColor = (p.colors && p.colors.length > 0) ? p.colors[0] : null; // Default to first color

    modalProductName.innerText = p.name;
    modalProductPrice.innerText = `${p.price} جنيه`;
    document.getElementById('modal-img').src = p.image;

    // Render Colors
    const colorContainer = document.getElementById('modal-color-options');
    if (colorContainer) {
        const colors = (p.colorVariants && p.colorVariants.length > 0)
            ? p.colorVariants.map(v => v.name)
            : (p.colors && p.colors.length > 0 ? p.colors : ["أساسي"]);

        colorContainer.innerHTML = colors.map((c, index) =>
            `<button class="color-btn ${index === 0 ? 'selected' : ''}">${c}</button>`
        ).join('');

        if (p.colorVariants && p.colorVariants[0] && p.colorVariants[0].image) {
            document.getElementById('modal-img').src = p.colorVariants[0].image;
        }
    }

    // Render Sizes (based on first color or global)
    const sizeContainer = document.querySelector('.size-options');
    let initialSizes = p.sizes || [];
    if (p.colorVariants && p.colorVariants.length > 0) {
        const firstVariant = p.colorVariants[0];
        if (firstVariant.sizes && firstVariant.sizes.length > 0) {
            initialSizes = firstVariant.sizes;
        }
    }
    sizeContainer.innerHTML = initialSizes.map(s => `<button class="size-btn">${s}</button>`).join('');

    sizeModal.classList.add('active');
};

window.removeFromCart = (id) => {
    cart = cart.filter(i => i.cartId !== id);
    updateCartUI();
};

window.updateCartQuantity = (id, delta) => {
    const item = cart.find(i => i.cartId === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            updateCartUI();
        }
    }
};

function confirmAddToCart(p, size) {
    const color = selectedColor || (p.colors ? p.colors[0] : "أساسي");
    const cartId = `${p.id}-${size}-${color}`;

    // Find variant image for cart
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
    openCartSidebar();
}

function updateCartUI() {
    const counts = document.querySelectorAll('.cart-count');
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-price');
    const totalQty = cart.reduce((s, i) => s + i.quantity, 0);

    counts.forEach(c => c.innerText = totalQty);

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

function renderAll() {
    if (!menContainer) return;
    menContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#fff;">جاري تحميل المنتجات...</div>';

    let allProds = [];

    // 1. Get Local Storage Products
    const localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');

    // 2. Get Firebase Products (If configured)
    if (typeof db !== 'undefined') {
        db.collection('products').orderBy('createdAt', 'desc').get().then(snapshot => {
            let fireProds = [];
            snapshot.forEach(doc => fireProds.push({ id: doc.id, ...doc.data() }));

            combineAndRender(fireProds, localProds);
        }).catch(err => {
            combineAndRender([], localProds);
        });
    } else {
        combineAndRender([], localProds);
    }
}

function combineAndRender(fireProds, localProds) {
    // Combine all
    remoteProducts = [...fireProds, ...localProds];

    // If both empty, use the static products.js (Initial state)
    if (remoteProducts.length === 0) {
        remoteProducts = products;
    }

    // Filter out duplicates (if any) based on name
    const seen = new Set();
    remoteProducts = remoteProducts.filter(p => {
        const duplicate = seen.has(p.name);
        seen.add(p.name);
        return !duplicate;
    });

    filterAndRender('men', 'all', 'all');
}

function renderSubFilters(parent) {
    if (!subFiltersContainer) return;

    const subs = parentSubMap[parent] || [];
    if (subs.length === 0) {
        subFiltersContainer.classList.remove('active');
        subFiltersContainer.innerHTML = "";
        return;
    }

    subFiltersContainer.innerHTML = subs.map(s => `
        <button class="sub-btn" onclick="applySubFilter('${parent}', '${s.id}', this)">${s.label}</button>
    `).join('');

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
            filtered = filtered.filter(p => clothesSubs.includes(p.subCategory) || p.subCategory === 'clothes');
        } else if (parent === 'pants') {
            const pantsSubs = parentSubMap.pants.map(s => s.id);
            filtered = filtered.filter(p => pantsSubs.includes(p.subCategory) || p.subCategory === 'pants');
        } else {
            filtered = filtered.filter(p => p.subCategory === parent);
        }
    }

    if (sub !== 'all') {
        filtered = filtered.filter(p => p.subCategory === sub);
    }

    if (filtered.length === 0) {
        menContainer.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#666;">لا توجد نتائج مطابقة</div>`;
        return;
    }

    menContainer.innerHTML = filtered.map(p => `
        <div class="product-card">
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

function openCartSidebar() { cartSidebar.classList.add('open'); cartOverlay.classList.add('show'); }
function closeCartSidebar() { cartSidebar.classList.remove('open'); cartOverlay.classList.remove('show'); }
function closeMobileMenu() { if (mobileMenuBtn) { mobileMenuBtn.classList.remove('active'); navLinks.classList.remove('active'); } }



window.onscroll = () => {
    if (navbar) window.scrollY > 50 ? navbar.classList.add('scrolled') : navbar.classList.remove('scrolled');
};

// Theme Toggle Logic
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to dark as requested
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

// ========== CUSTOMER AUTH & ORDERS TRACKING ==========

function updateAuthUI() {
    const authText = document.getElementById('auth-text');
    const cartAuthBox = document.getElementById('cart-auth-box');

    if (currentUser) {
        if (authText) authText.innerText = 'طلباتي';
        if (cartAuthBox) cartAuthBox.style.display = 'none';
    } else {
        if (authText) authText.innerText = 'دخول';
        if (cartAuthBox) cartAuthBox.style.display = 'block';
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

// Initialize orders event listeners
document.addEventListener('DOMContentLoaded', setupOrdersEventListeners);
