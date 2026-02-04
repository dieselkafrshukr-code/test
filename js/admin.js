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
let messaging = null; // Add messaging variable
let adminRole = localStorage.getItem('adminRole') || 'none';

const governorates = [
    "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم", "الغربية", "الإسماعيلية", "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "السويس", "الشرقية", "دمياط", "بورسعيد", "جنوب سيناء", "كفر الشيخ", "مطروح", "الأقصر", "قنا", "شمال سيناء", "سوهاج", "بني سويف", "أسيوط", "أسوان"
];

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
        console.log("🔒 Security: Fresh login forced from home page.");
    }

    firebase.auth().onAuthStateChanged(user => {
        const loginOverlay = document.getElementById('login-overlay');
        const adminContent = document.getElementById('admin-main-content');

        if (user) {
            loginOverlay.style.display = 'none';
            adminContent.style.display = 'block';
            applyRoleRestrictions();

            if (adminRole === 'products') { showTab('products'); loadProducts(); }
            else if (adminRole === 'orders') { showTab('orders'); loadOrders(); setupRealtimeNotifications(); }
            else if (adminRole === 'shipping') { showTab('shipping'); loadShippingCosts(); }
            else if (adminRole === 'all') { showTab('products'); loadProducts(); loadShippingCosts(); setupRealtimeNotifications(); }

            // Initialize FCM Messaging
            initMessaging();
        } else {
            loginOverlay.style.display = 'flex';
            adminContent.style.display = 'none';
        }
    });
}

function initMessaging() {
    if (firebase.messaging.isSupported()) {
        messaging = firebase.messaging();
        messaging.getToken({ vapidKey: 'BLz8n6V4mXo_kK9S_vE9_Q7U8R1H_X9G_v9A_V9A_V9A_V9A_V9A' }) // Placeholder VAPID, will likely fail without real one but sets structure
            .then((currentToken) => {
                if (currentToken) {
                    db.collection('admin_tokens').doc('primary_admin').set({ token: currentToken, lastUpdated: new Date() });
                }
            }).catch((err) => console.log('An error occurred while retrieving token. ', err));
    }
}

function setupRealtimeNotifications() {
    if (!db) return;

    // Request permission for browser notifications
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // Listen to new orders
    db.collection('orders')
        .where('createdAt', '>', new Date()) // Only new orders since opening dashboard
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    const order = change.doc.data();
                    showOrderPushNotification(order);
                }
            });
        });
}

function showOrderPushNotification(order) {
    if (Notification.permission === "granted") {
        const n = new Notification("🛍️ طلب جديد!", {
            body: `قيمة الطلب: ${order.total} جنيه\nالعميل: ${order.customerName || order.userEmail}`,
            icon: 'images/logo/logo.png'
        });
        n.onclick = () => { window.focus(); showTab('orders'); };

        // Also play a sound if possible
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Sound blocked by browser"));
    }
}

// Global Elements
let productsListBody, subCatSelect, previewImg, globalLoader, colorVariantsContainer;
let colorVariants = [];
let remoteProducts = []; // Declare the missing variable 

const subMap = {
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
    shoes: [
        { id: 'shoes', label: 'أحذية' }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    // Init Elements
    productsListBody = document.getElementById('products-list-body');
    subCatSelect = document.getElementById('p-subcategory');
    previewImg = document.getElementById('preview-img');
    globalLoader = document.getElementById('global-loader');
    colorVariantsContainer = document.getElementById('color-variants-container');

    updateSubCats();

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            const errEl = document.getElementById('login-error');

            try {
                let role = 'none';
                if (pass === '123456123456') role = 'products';
                else if (pass === '1234512345') role = 'orders';
                else if (pass === 'diesel7080') role = 'all'; // OWNER ROLE
                else {
                    errEl.innerText = "كلمة السر غير صحيحة لصلاحيات الأدمن ❌";
                    errEl.style.display = 'block';
                    return;
                }

                // Standard Firebase Login
                await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
                await firebase.auth().signInWithEmailAndPassword(email, pass);

                localStorage.setItem('adminRole', role);
                adminRole = role;
                applyRoleRestrictions();

                // Explicitly show the correct tab after login
                if (role === 'products') { showTab('products'); }
                else if (role === 'orders') { showTab('orders'); }
                else if (role === 'all') { showTab('products'); }

            } catch (err) {
                console.error(err);
                errEl.innerText = "خطأ في تسجيل الدخول: " + err.message;
                errEl.style.display = 'block';
            }
        };
    }

    // TRIGGER INITIAL LOAD IF ALREADY AUTHENTICATED
    if (firebase.auth().currentUser) {
        if (adminRole === 'products' || adminRole === 'all') { showTab('products'); loadProducts(); }
        else if (adminRole === 'orders') { showTab('orders'); loadOrders(); }
        else if (adminRole === 'shipping') { showTab('shipping'); loadShippingCosts(); }
    }
});

async function loadShippingCosts() {
    const container = document.getElementById('shipping-list-container');
    if (!container) return;

    showLoader(true);
    let currentCosts = {};
    try {
        const doc = await db.collection('settings').doc('shipping').get();
        if (doc.exists) currentCosts = doc.data().costs || {};
    } catch (e) { console.error(e); }

    container.innerHTML = governorates.map(gov => `
        <div class="stat-card" style="padding: 15px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02);">
            <label style="display:block; margin-bottom:10px; font-weight:bold;">${gov}</label>
            <div style="display:flex; align-items:center; gap:5px;">
                <input type="number" class="shipping-input" data-gov="${gov}" value="${currentCosts[gov] || 0}" style="width:100%; padding:8px; background:rgba(0,0,0,0.3); border:1px solid #444; color:#fff; border-radius:8px;">
                <span>ج.م</span>
            </div>
        </div>
    `).join('');
    showLoader(false);
}

async function saveShippingCosts() {
    const inputs = document.querySelectorAll('.shipping-input');
    const costs = {};
    inputs.forEach(input => {
        costs[input.dataset.gov] = Number(input.value) || 0;
    });

    showLoader(true);
    try {
        await db.collection('settings').doc('shipping').set({ costs, updatedAt: new Date().toISOString() });
        alert("تم حفظ تكاليف الشحن بنجاح! 🚚✅");
    } catch (e) { alert("حدث خطأ أثناء الحفظ!"); }
    showLoader(false);
}

function logout() {
    firebase.auth().signOut();
    localStorage.removeItem('adminRole');
    adminRole = 'none';
}

function applyRoleRestrictions() {
    const tabProducts = document.getElementById('tab-products');
    const tabOrders = document.getElementById('tab-orders');

    const tabShipping = document.getElementById('tab-shipping');

    if (adminRole === 'products') {
        if (tabProducts) tabProducts.style.display = 'flex';
        if (tabOrders) tabOrders.style.display = 'none';
        if (tabShipping) tabShipping.style.display = 'none';
    } else if (adminRole === 'orders') {
        if (tabProducts) tabProducts.style.display = 'none';
        if (tabOrders) tabOrders.style.display = 'flex';
        if (tabShipping) tabShipping.style.display = 'none';
    } else if (adminRole === 'shipping') {
        if (tabProducts) tabProducts.style.display = 'none';
        if (tabOrders) tabOrders.style.display = 'none';
        if (tabShipping) tabShipping.style.display = 'flex';
    } else if (adminRole === 'all') {
        if (tabProducts) tabProducts.style.display = 'flex';
        if (tabOrders) tabOrders.style.display = 'flex';
        if (tabShipping) tabShipping.style.display = 'flex';
    } else {
        if (tabProducts) tabProducts.style.display = 'none';
        if (tabOrders) tabOrders.style.display = 'none';
        if (tabShipping) tabShipping.style.display = 'none';
    }
}

function showTab(tab) {
    // Strict Role Check - Allow if role exists
    if (!adminRole || adminRole === 'none') {
        // Try reading again from storage in case of race condition
        adminRole = localStorage.getItem('adminRole') || 'none';
    }

    if (adminRole === 'none') return;

    if (adminRole !== 'all' && adminRole !== tab) {
        console.warn("🚫 Access Denied to Tab:", tab);
        return;
    }

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const targetTab = document.getElementById(`tab-${tab}`);
    if (targetTab) targetTab.classList.add('active');

    if (tab === 'products') {
        document.getElementById('products-section').style.display = 'block';
        document.getElementById('orders-section').style.display = 'none';
        document.getElementById('shipping-section').style.display = 'none';
    } else if (tab === 'orders') {
        document.getElementById('products-section').style.display = 'none';
        document.getElementById('orders-section').style.display = 'block';
        document.getElementById('shipping-section').style.display = 'none';
        loadOrders();
    } else if (tab === 'shipping') {
        document.getElementById('products-section').style.display = 'none';
        document.getElementById('orders-section').style.display = 'none';
        document.getElementById('shipping-section').style.display = 'block';
        loadShippingCosts();
    }
}

function toggleForm() {
    const f = document.getElementById('productForm');
    const form = document.getElementById('saveProductForm');
    f.style.display = f.style.display === 'block' ? 'none' : 'block';
    if (f.style.display === 'none') {
        form.reset();
        previewImg.style.display = 'none';
        document.getElementById('edit-id').value = '';
        document.getElementById('p-image-base64').value = '';
        colorVariants = [];
        renderColorVariants();
        document.getElementById('form-title').innerText = 'إضافة منتج جديد';
    }
}

function addColorVariant(name = '', image = '') {
    const id = Date.now() + Math.random();
    colorVariants.push({ id, name, image });
    renderColorVariants();
}

function removeColorVariant(id) {
    colorVariants = colorVariants.filter(v => v.id !== id);
    renderColorVariants();
}

function renderColorVariants() {
    if (!colorVariantsContainer) return;
    colorVariantsContainer.innerHTML = colorVariants.map(v => `
        <div class="stat-card" style="padding: 15px; position: relative; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); text-align: right;">
            <i class="fas fa-times" style="position: absolute; top: 10px; left: 10px; color: #f44336; cursor: pointer; font-size: 1.1rem; z-index: 10;" onclick="removeColorVariant(${v.id})"></i>
            
            <label style="font-size: 0.75rem; color: #aaa; display: block; margin-bottom: 5px;">اسم اللون:</label>
            <input type="text" placeholder="مثال: أحمر" value="${v.name}" onchange="updateVariantName(${v.id}, this.value)" style="width: 100%; margin-bottom: 10px; font-size: 0.85rem; padding: 8px;">
            
            <label style="font-size: 0.75rem; color: #aaa; display: block; margin-bottom: 5px;">مقاسات هذا اللون (M, L, XL):</label>
            <input type="text" placeholder="M, L, XL" value="${v.sizes || ''}" onchange="updateVariantSizes(${v.id}, this.value)" style="width: 100%; margin-bottom: 10px; font-size: 0.85rem; padding: 8px; border-color: #444;">

            <label style="font-size: 0.75rem; color: #aaa; display: block; margin-bottom: 5px;">صورة اللون:</label>
            <input type="file" accept="image/*" onchange="handleVariantImage(this, ${v.id})" style="font-size: 0.7rem; width: 100%; margin-bottom: 10px;">
            <img src="${v.image || 'https://placehold.co/100x120?text=No+Color+Image'}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; ${v.image ? '' : 'filter: grayscale(1); opacity: 0.3;'}">
        </div>
    `).join('');
}

function updateVariantName(id, name) {
    const v = colorVariants.find(v => v.id === id);
    if (v) v.name = name;
}

function updateVariantSizes(id, sizes) {
    const v = colorVariants.find(v => v.id === id);
    if (v) v.sizes = sizes;
}

async function handleVariantImage(input, id) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result;
            // Variants can be smaller to save space (800px is plenty)
            const compressed = await compressImage(base64, 800);
            const v = colorVariants.find(v => v.id === id);
            if (v) {
                v.image = compressed;
                renderColorVariants();
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function compressImage(base64, maxWidth = 1200) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, width, height);
            // Quality 0.7 - 0.8 is best for Firestore size/quality balance
            resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
    });
}

function updateSubCats() {
    if (!subCatSelect) return;
    const cat = document.getElementById('p-category').value;
    const items = subMap[cat] || [];
    subCatSelect.innerHTML = items.map(i => `<option value="${i.id}">${i.label}</option>`).join('');
}

async function handleImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result;
            const hdImage = await compressImage(base64);
            document.getElementById('p-image-base64').value = hdImage;
            previewImg.src = hdImage;
            previewImg.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// CRUD Operations
const saveProductForm = document.getElementById('saveProductForm');
if (saveProductForm) {
    saveProductForm.onsubmit = async (e) => {
        e.preventDefault();
        showLoader(true);
        const id = document.getElementById('edit-id').value;

        let data = {
            name: document.getElementById('p-name').value,
            price: Number(document.getElementById('p-price').value),
            category: "men",
            parentCategory: document.getElementById('p-category').value,
            subCategory: document.getElementById('p-subcategory').value,
            sizes: document.getElementById('p-sizes').value.split(',').map(s => s.trim()).filter(s => s),
            colorVariants: colorVariants.map(v => ({
                name: v.name || "",
                image: v.image || "",
                sizes: v.sizes ? v.sizes.split(',').map(s => s.trim()).filter(s => s) : []
            })),
            colors: colorVariants.map(v => v.name || ""),
            badge: document.getElementById('p-badge').value || "",
            updatedAt: new Date().toISOString()
        };

        // Handle Image
        const imgInput = document.getElementById('p-image-base64').value;
        const variantImg = colorVariants.length > 0 && colorVariants[0].image ? colorVariants[0].image : null;

        if (imgInput && imgInput !== "undefined") {
            data.image = imgInput;
        } else if (variantImg) {
            data.image = variantImg;
        } else if (!id) {
            data.image = 'https://placehold.co/400x600?text=No+Image';
        }

        if (!id) {
            data.status = 'active';
        }

        // SANITIZE DATA
        const finalData = sanitizeFirestoreData(data);

        try {
            // Check Document Size (Firestore Limit: 1MB)
            const stringData = JSON.stringify(finalData);
            const sizeInBytes = new Blob([stringData]).size;
            if (isFirebaseReady && sizeInBytes > 1000000) {
                showLoader(false);
                return alert("⚠️ حجم المنتج كبير جداً بسبب كثرة الصور عالية الجودة. يرجى تقليل عدد الألوان أو استخدام صور أصغر.");
            }

            if (isFirebaseReady) {
                if (id) await productsCol.doc(id).update(finalData);
                else { finalData.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await productsCol.add(finalData); }
            } else {
                let localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');
                if (id) { const idx = localProds.findIndex(p => p.id == id); if (idx !== -1) { if (!finalData.image) finalData.image = localProds[idx].image; localProds[idx] = { ...localProds[idx], ...finalData }; } }
                else { finalData.id = 'L' + Date.now(); finalData.createdAt = new Date().toISOString(); localProds.push(finalData); }
                localStorage.setItem('diesel_products', JSON.stringify(localProds));
            }
            alert("تم الحفظ بنجاح! ✅"); toggleForm(); loadProducts();
        } catch (err) { console.error(err); alert("حدث خطأ! ❌\n" + (err.message || err)); }
        showLoader(false);
    };
}

async function fetchProducts() {
    let allP = [];

    // 1. Load Local Products (Backup/Manual)
    try {
        const local = JSON.parse(localStorage.getItem('diesel_products') || '[]');
        allP = [...local];
    } catch (e) { console.error("Local load error", e); }

    // 2. Load Firebase Products (Live)
    if (isFirebaseReady && db) {
        try {
            const snapshot = await db.collection('products').get();
            const remote = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Merge: Remote products overwrite local if IDs match, otherwise add
            remote.forEach(rp => {
                const idx = allP.findIndex(lp => lp.id === rp.id);
                if (idx !== -1) allP[idx] = rp;
                else allP.push(rp);
            });
        } catch (error) {
            console.error("Firebase fetch error:", error);
        }
    }

    // 3. Fallback to hardcoded products if everything is empty
    if (allP.length === 0 && typeof products !== 'undefined') {
        allP = products;
    }

    remoteProducts = allP;
    return allP;
}

async function loadProducts() {
    // Safety check for UI elements
    if (!productsListBody) productsListBody = document.getElementById('products-list-body');
    if (!productsListBody) return; // Still not ready

    if (adminRole !== 'all' && adminRole !== 'products') return;
    try {
        let allProducts = await fetchProducts(); // Use the new fetchProducts function

        // Ensure unique products after merging
        const uniqueProds = Array.from(new Map(allProducts.map(item => [item.id, item])).values());
        uniqueProds.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

        let html = '';
        let cats = { clothes: 0, shoes: 0, pants: 0 };
        uniqueProds.forEach(p => {
            const cat = p.parentCategory || 'clothes';
            cats[cat] = (cats[cat] || 0) + 1;
            const isHidden = p.status === 'hidden';

            html += `
                <tr style="${isHidden ? 'opacity: 0.5; background: rgba(0,0,0,0.2);' : ''}">
                    <td><img src="${p.image}" class="product-thumb"></td>
                    <td>
                        ${p.name}
                        ${isHidden ? '<br><span style="font-size:0.7rem; color:#f44336; font-weight:bold;">[مخفي]</span>' : ''}
                    </td>
                    <td style="color:#d4af37; font-weight:bold;">${p.price} ج.م</td>
                    <td>${p.subCategory}</td>
                    <td class="actions">
                        <i class="fas fa-edit btn-edit" onclick="editProduct('${p.id}')" title="تعديل"></i>
                        <i class="fas ${isHidden ? 'fa-eye' : 'fa-eye-slash'} btn-delete" 
                           style="color: ${isHidden ? '#4caf50' : '#ff9800'}" 
                           onclick="toggleVisibility('${p.id}', ${isHidden})" 
                           title="${isHidden ? 'إظهار المنتج' : 'إخفاء المنتج'}"></i>
                        <i class="fas fa-trash btn-delete" onclick="deleteProduct('${p.id}')" title="حذف نهائي"></i>
                    </td>
                </tr>`;
        });
        productsListBody.innerHTML = html || '<tr><td colspan="5" style="text-align:center">لا توجد منتجات.</td></tr>';

        const totalEl = document.getElementById('stat-total');
        const clothesEl = document.getElementById('stat-clothes');
        const shoesEl = document.getElementById('stat-shoes');

        if (totalEl) totalEl.innerText = uniqueProds.length;
        if (clothesEl) clothesEl.innerText = cats.clothes;
        if (shoesEl) shoesEl.innerText = cats.shoes;
    } catch (err) { console.error(err); }
}

async function toggleVisibility(id, currentlyHidden) {
    const action = currentlyHidden ? "إظهار" : "إخفاء";
    if (!confirm(`هل تريد ${action} هذا المنتج من الموقع؟`)) return;

    showLoader(true);
    const newStatus = currentlyHidden ? 'active' : 'hidden';
    try {
        if (isFirebaseReady && !id.startsWith('L')) {
            await productsCol.doc(id).update({ status: newStatus, updatedAt: new Date().toISOString() });
        }

        // Update local if exists
        let localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');
        const idx = localProds.findIndex(p => p.id == id);
        if (idx !== -1) {
            localProds[idx].status = newStatus;
            localProds[idx].updatedAt = new Date().toISOString();
            localStorage.setItem('diesel_products', JSON.stringify(localProds));
        }

        loadProducts();
    } catch (err) {
        alert("فشل تغيير الحالة!");
    }
    showLoader(false);
}

async function deleteProduct(id) {
    if (!confirm("⚠️ هذا سيحذف المنتج تماماً ولن تتمكن من استعادته. هل أنت متأكد؟ (يفضل استخدام الإخفاء بدلاً من الحذف)")) return;
    showLoader(true);
    try {
        if (isFirebaseReady && !id.startsWith('L')) await productsCol.doc(id).delete();
        let localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');
        localProds = localProds.filter(p => p.id != id);
        localStorage.setItem('diesel_products', JSON.stringify(localProds));
        loadProducts();
    } catch (err) { alert("فشل الحذف!"); }
    showLoader(false);
}

async function editProduct(id) {
    let p = null;
    if (isFirebaseReady && !id.startsWith('L')) { const doc = await productsCol.doc(id).get(); p = doc.data(); }
    else { const localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]'); p = localProds.find(item => item.id == id); }
    if (!p) return;
    document.getElementById('edit-id').value = id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-price').value = p.price;
    document.getElementById('p-category').value = p.parentCategory || 'clothes';
    updateSubCats();
    document.getElementById('p-subcategory').value = p.subCategory;
    document.getElementById('p-sizes').value = (p.sizes || []).join(', ');
    colorVariants = (p.colorVariants || (p.colors || []).map(c => ({ name: c, image: '', sizes: '' }))).map(v => ({ ...v, id: Math.random(), sizes: Array.isArray(v.sizes) ? v.sizes.join(', ') : (v.sizes || '') }));
    renderColorVariants();
    document.getElementById('p-badge').value = p.badge || '';
    document.getElementById('p-image-base64').value = p.image || "";
    previewImg.src = p.image || "";
    previewImg.style.display = p.image ? 'block' : 'none';
    document.getElementById('form-title').innerText = 'تعديل المنتج';
    document.getElementById('productForm').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Other management
async function clearAllProducts() {
    if (!confirm("⚠️ تحذير: سيتم حذف جميع المنتجات نهائياً من المتجر والداتابيز. هل أنت متأكد؟")) return;
    showLoader(true);
    try {
        if (isFirebaseReady) { const snapshot = await productsCol.get(); const batch = db.batch(); snapshot.forEach(doc => batch.delete(doc.ref)); await batch.commit(); }
        localStorage.removeItem('diesel_products');
        alert("تم تفريغ المتجر بنجاح! 🗑️"); loadProducts();
    } catch (err) { alert("حدث خطأ أثناء الحذف!"); }
    showLoader(false);
}

async function resetStore() {
    if (!confirm("سيتم استيراد المنتجات الافتراضية للمتجر. استمرار؟")) return;
    showLoader(true);
    const script = document.createElement('script');
    script.src = './js/products.js';
    script.onload = async () => {
        let localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');
        if (typeof products === 'undefined' || products.length === 0) { alert("لا توجد منتجات افتراضية للاستيراد."); showLoader(false); return; }
        for (const p of products) { if (!localProds.some(lp => lp.name === p.name)) { const newP = { ...p, id: 'L' + Date.now() + Math.random(), parentCategory: p.subCategory === 'shoes' ? 'shoes' : (p.subCategory === 'jeans' || p.subCategory === 'sweatpants' ? 'pants' : 'clothes'), updatedAt: new Date().toISOString() }; localProds.push(newP); if (isFirebaseReady) { try { await productsCol.add(newP); } catch (e) { } } } }
        localStorage.setItem('diesel_products', JSON.stringify(localProds));
        alert("تم الاستيراد بنجاح!"); loadProducts(); showLoader(false);
    };
    document.body.appendChild(script);
}

function showLoader(show) { if (globalLoader) globalLoader.style.display = show ? 'flex' : 'none'; }

// Order functions
async function loadOrders() {
    if (!isFirebaseReady) return;
    if (adminRole !== 'all' && adminRole !== 'orders') return;
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return; // UI not ready yet
    db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        let html = ''; let newCount = 0;
        if (snapshot.empty) { ordersList.innerHTML = '<div style="text-align: center; padding: 50px; opacity: 0.5;">لا توجد طلبات بعد.</div>'; return; }
        snapshot.forEach(doc => {
            const order = doc.data(); const id = doc.id; const date = order.createdAt ? order.createdAt.toDate().toLocaleString('ar-EG') : 'قيد المعالجة...';
            if (order.status === 'جديد') newCount++;
            html += `<div class="order-card">
                        <div class="order-header">
                            <div>
                                <h3>${order.customerName}</h3>
                                <p style="font-size: 0.9rem; opacity: 0.7;"><i class="fas fa-clock"></i> ${date}</p>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                                <span class="order-status status-${getStatusClass(order.status)}">${order.status}</span>
                                <span style="font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px;">
                                    ${order.paymentMethod || 'دفع عند الاستلام'}
                                </span>
                                <span style="font-size: 0.75rem; font-weight: bold; color: ${order.paymentStatus === 'تم الدفع' ? '#4CAF50' : '#f44336'}">
                                    <i class="fas ${order.paymentStatus === 'تم الدفع' ? 'fa-check-circle' : 'fa-hourglass-start'}"></i> ${order.paymentStatus || 'لم يتم الدفع'}
                                </span>
                            </div>
                        </div>
                        <div style="font-size: 1rem; margin-bottom: 10px;">
                            <p><i class="fas fa-phone"></i> <strong>الهاتف:</strong> <a href="tel:${order.phone}" style="color:var(--accent)">${order.phone}</a></p>
                            <p><i class="fas fa-map-marker-alt"></i> <strong>المحافظة:</strong> ${order.gov || 'غير محدد'}</p>
                            <p><i class="fas fa-map-marker"></i> <strong>العنوان:</strong> ${order.address}</p>
                        </div>
                        <div class="order-items">${order.items.map(item => `<div class="order-item"><span>${item.name} (${item.color} - ${item.size}) x${item.quantity}</span><span style="font-weight: bold;">${item.total} ج.م</span></div>`).join('')}</div>
                        <div class="order-footer">
                            <div style="font-size: 1rem; opacity: 0.8; margin-bottom: 5px;">
                                <div style="display:flex; justify-content:space-between;"><span>إجمالي المنتجات:</span><span>${order.itemsTotal || (order.total - (order.shippingCost || 0))} ج.م</span></div>
                                <div style="display:flex; justify-content:space-between;"><span>مصاريف الشحن:</span><span>${order.shippingCost || 0} ج.م</span></div>
                            </div>
                            <div style="font-size: 1.3rem; font-weight: 900; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 5px;">الاجمالي النهائي: <span style="color:var(--accent)">${order.total} ج.م</span></div>
                            <div style="display: flex; gap: 8px; margin-top: 10px;">
                                <select onchange="updateOrderStatus('${id}', this.value)" class="btn-status">
                                    <option value="جديد" ${order.status === 'جديد' ? 'selected' : ''}>جديد</option>
                                    <option value="جاري التجهيز" ${order.status === 'جاري التجهيز' ? 'selected' : ''}>جاري التجهيز</option>
                                    <option value="تم الشحن" ${order.status === 'تم الشحن' ? 'selected' : ''}>تم الشحن</option>
                                    <option value="تم التسليم" ${order.status === 'تم التسليم' ? 'selected' : ''}>تم التسليم</option>
                                    <option value="ملغي" ${order.status === 'ملغي' ? 'selected' : ''}>ملغي</option>
                                </select>
                                <button onclick="deleteOrder('${id}')" class="btn-status" style="background:#f44336; border-color:#f44336;"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    </div>`;
        });
        ordersList.innerHTML = html;
        const badge = document.getElementById('new-orders-count');
        if (newCount > 0) { badge.innerText = newCount; badge.style.display = 'inline-block'; } else { badge.style.display = 'none'; }
    });
}

function getStatusClass(status) { return status === 'جديد' ? 'new' : status === 'جاري التجهيز' ? 'preparing' : status === 'تم الشحن' ? 'shipped' : status === 'تم التسليم' ? 'delivered' : 'default'; }
async function updateOrderStatus(id, newStatus) { try { await db.collection('orders').doc(id).update({ status: newStatus }); alert("تم تحديث حالة الطلب ✅"); } catch (err) { alert("خطأ في التحديث!"); } }
async function deleteOrder(id) { if (!isFirebaseReady) return; if (!confirm("هل تريد حذف هذا الطلب؟")) return; try { await db.collection('orders').doc(id).delete(); alert("تم حذف الطلب 🗑️"); } catch (err) { alert("خطأ في الحذف!"); } }

async function deleteAllOrders() {
    if (!isFirebaseReady) return;
    if (!confirm("⚠️ هل أنت متأكد من حذف كافة الطلبات؟")) return;
    const finalPass = prompt("اكتب 'ديزل' لإتمام الحذف:");
    if (finalPass !== "ديزل") return;
    showLoader(true);
    try {
        const snapshot = await db.collection('orders').get();
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        alert("تم مسح جميع الطلبات بنجاح 🗑️");
    } catch (err) { alert("حدث خطأ!"); }
    showLoader(false);
}

async function exportOrders() {
    if (!isFirebaseReady) return;
    showLoader(true);
    try {
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
        if (snapshot.empty) { alert("لا توجد طلبات."); showLoader(false); return; }
        const allOrders = []; const todayOrders = [];
        const stats = { revenue: 0, todayRevenue: 0 };
        const now = new Date(); const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        snapshot.forEach(doc => {
            const o = doc.data(); const createdAt = o.createdAt ? o.createdAt.toDate() : null;
            const row = {
                "التاريخ": createdAt ? createdAt.toLocaleString('ar-EG') : 'قيد المعالجة',
                "اسم العميل": o.customerName,
                "رقم الهاتف": o.phone,
                "المحافظة": o.gov || 'غير محدد',
                "العنوان": o.address,
                "المنتجات": o.items.map(i => `${i.name} (${i.color}/${i.size}) x${i.quantity}`).join(' | '),
                "إجمالي المنتجات": (o.itemsTotal || (o.total - (o.shippingCost || 0))) + " ج.م",
                "مصاريف الشحن": (o.shippingCost || 0) + " ج.م",
                "الإجمالي النهائي": o.total + " ج.م",
                "الحالة": o.status,
                "حالة الدفع": o.paymentStatus || 'كاش/عند الاستلام'
            };
            allOrders.push(row); stats.revenue += Number(o.total || 0);
            if (createdAt && createdAt >= startOfToday) { todayOrders.push(row); stats.todayRevenue += Number(o.total || 0); }
        });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(allOrders), "كافة الطلبات");
        XLSX.writeFile(workbook, `Diesel_Report_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.xlsx`);
        alert("تم التصدير بنجاح!");
    } catch (err) { alert("خطأ في التصدير!"); }
    showLoader(false);
}

function sanitizeFirestoreData(obj) {
    if (obj === undefined) return undefined;
    if (obj === null) return null;
    if (Array.isArray(obj)) return obj.map(v => sanitizeFirestoreData(v)).filter(v => v !== undefined);
    if (typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            const val = sanitizeFirestoreData(obj[key]);
            if (val !== undefined) newObj[key] = val;
        }
        return newObj;
    }
    return obj;
}
