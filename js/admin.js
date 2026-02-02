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
let adminRole = localStorage.getItem('adminRole') || 'none'; // 'products' or 'orders'

// Initialize Firebase if keys are provided
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    productsCol = db.collection('products');
    isFirebaseReady = true;

    // Check Auth State
    firebase.auth().onAuthStateChanged(user => {
        const loginOverlay = document.getElementById('login-overlay');
        const adminContent = document.getElementById('admin-main-content');

        if (user) {
            loginOverlay.style.display = 'none';
            adminContent.style.display = 'block';

            // Apply Role Restrictions
            applyRoleRestrictions();

            if (adminRole === 'products') {
                showTab('products');
                loadProducts();
            } else if (adminRole === 'orders') {
                showTab('orders');
                loadOrders();
            } else {
                // If no role set (e.g. session expired), logout
                logout();
            }
        } else {
            loginOverlay.style.display = 'flex';
            adminContent.style.display = 'none';
        }
    });
}

// DOM Elements
const form = document.getElementById('saveProductForm');
const productsListBody = document.getElementById('products-list-body');
const subCatSelect = document.getElementById('p-subcategory');
const previewImg = document.getElementById('preview-img');
const globalLoader = document.getElementById('global-loader');
const colorVariantsContainer = document.getElementById('color-variants-container');

let colorVariants = [];

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

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    updateSubCats();

    // Login Form Handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            const errEl = document.getElementById('login-error');

            // Determine Role based on password
            if (pass === 'admin123') {
                adminRole = 'products';
            } else if (pass === 'admin1234') {
                adminRole = 'orders';
            } else {
                errEl.innerText = "كلمة مرور غير صحيحة لصلاحيات الأدمن";
                errEl.style.display = 'block';
                return;
            }

            try {
                await firebase.auth().signInWithEmailAndPassword(email, pass);
                localStorage.setItem('adminRole', adminRole);
            } catch (err) {
                errEl.innerText = "خطأ في تسجيل الدخول: " + err.message;
                errEl.style.display = 'block';
            }
        };
    }

    if (!isFirebaseReady) {
        console.warn("⚠️ Firebase keys missing. Running in LOCAL MODE.");
    }
});

function logout() {
    firebase.auth().signOut();
    localStorage.removeItem('adminRole');
    adminRole = 'none';
}

function applyRoleRestrictions() {
    const tabProducts = document.getElementById('tab-products');
    const tabOrders = document.getElementById('tab-orders');

    if (adminRole === 'products') {
        if (tabProducts) tabProducts.style.display = 'flex';
        if (tabOrders) tabOrders.style.display = 'none';
    } else if (adminRole === 'orders') {
        if (tabProducts) tabProducts.style.display = 'none';
        if (tabOrders) tabOrders.style.display = 'flex';
    }
}

function showTab(tab) {
    if (adminRole !== 'none' && adminRole !== tab) return;

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    if (tab === 'products') {
        document.getElementById('products-section').style.display = 'block';
        document.getElementById('orders-section').style.display = 'none';
    } else {
        document.getElementById('products-section').style.display = 'none';
        document.getElementById('orders-section').style.display = 'block';
        loadOrders();
    }
}

function toggleForm() {
    const f = document.getElementById('productForm');
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
            const compressed = await compressImage(base64);
            const v = colorVariants.find(v => v.id === id);
            if (v) {
                v.image = compressed;
                renderColorVariants();
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function compressImage(base64, maxWidth = 800) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ratio = img.width / img.height;
            canvas.width = Math.min(maxWidth, img.width);
            canvas.height = canvas.width / ratio;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.85)); // Higher quality
        };
    });
}

function updateSubCats() {
    const cat = document.getElementById('p-category').value;
    const items = subMap[cat] || [];
    subCatSelect.innerHTML = items.map(i => `<option value="${i.id}">${i.label}</option>`).join('');
}

// Handle Image & Base64
async function handleImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const base64 = e.target.result;
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 450;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);

                document.getElementById('p-image-base64').value = compressedBase64;
                previewImg.src = compressedBase64;
                previewImg.style.display = 'block';
            };
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// CRUD: Create / Update
form.onsubmit = async (e) => {
    e.preventDefault();
    showLoader(true);

    const id = document.getElementById('edit-id').value;
    const data = {
        name: document.getElementById('p-name').value,
        price: Number(document.getElementById('p-price').value),
        category: "men",
        parentCategory: document.getElementById('p-category').value,
        subCategory: document.getElementById('p-subcategory').value,
        // Main product sizes (fallback)
        sizes: document.getElementById('p-sizes').value.split(',').map(s => s.trim()).filter(s => s),
        // Color specific variants (detailed)
        colorVariants: colorVariants.map(v => ({
            name: v.name,
            image: v.image,
            sizes: v.sizes ? v.sizes.split(',').map(s => s.trim()).filter(s => s) : []
        })),
        colors: colorVariants.map(v => v.name),
        badge: document.getElementById('p-badge').value,
        image: document.getElementById('p-image-base64').value || (colorVariants.length > 0 && colorVariants[0].image ? colorVariants[0].image : (id ? undefined : 'https://placehold.co/400x600?text=No+Image')),
        updatedAt: new Date().toISOString()
    };

    try {
        if (isFirebaseReady) {
            if (id) {
                await productsCol.doc(id).update(data);
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await productsCol.add(data);
            }
        } else {
            // Local Storage Logic
            let localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');
            if (id) {
                const index = localProds.findIndex(p => p.id == id);
                if (index !== -1) {
                    if (!data.image) data.image = localProds[index].image;
                    localProds[index] = { ...localProds[index], ...data };
                }
            } else {
                data.id = 'L' + Date.now();
                data.createdAt = new Date().toISOString();
                localProds.push(data);
            }
            localStorage.setItem('diesel_products', JSON.stringify(localProds));
        }

        alert("تم الحفظ بنجاح! ✅");
        toggleForm();
        loadProducts();
    } catch (err) {
        console.error(err);
        alert("حدث خطأ! ❌");
    }
    showLoader(false);
};

// CRUD: Read
async function loadProducts() {
    try {
        let allProducts = [];

        if (isFirebaseReady) {
            const snapshot = await productsCol.orderBy('updatedAt', 'desc').get();
            snapshot.forEach(doc => allProducts.push({ id: doc.id, ...doc.data() }));
        }

        // Also load from Local Storage
        const localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');
        allProducts = [...allProducts, ...localProds];

        // Unique by ID
        const uniqueProds = Array.from(new Map(allProducts.map(item => [item.id, item])).values());

        let html = '';
        let cats = { clothes: 0, shoes: 0, pants: 0 };

        uniqueProds.forEach(p => {
            const cat = p.parentCategory || 'clothes';
            cats[cat] = (cats[cat] || 0) + 1;
            html += `
                <tr>
                    <td><img src="${p.image}" class="product-thumb"></td>
                    <td>${p.name}</td>
                    <td style="color:#d4af37; font-weight:bold;">${p.price} ج.م</td>
                    <td>${p.subCategory}</td>
                    <td class="actions">
                        <i class="fas fa-edit btn-edit" onclick="editProduct('${p.id}')"></i>
                        <i class="fas fa-trash btn-delete" onclick="deleteProduct('${p.id}')"></i>
                    </td>
                </tr>
            `;
        });

        productsListBody.innerHTML = html || '<tr><td colspan="5" style="text-align:center">لا توجد منتجات.</td></tr>';
        document.getElementById('stat-total').innerText = uniqueProds.length;
        document.getElementById('stat-clothes').innerText = cats.clothes;
        document.getElementById('stat-shoes').innerText = cats.shoes;

    } catch (err) {
        console.error(err);
    }
}

// CRUD: Delete
async function deleteProduct(id) {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج نهائياً؟")) return;
    showLoader(true);
    try {
        if (isFirebaseReady && !id.startsWith('L')) {
            await productsCol.doc(id).delete();
        }
        // Always try to delete from local too
        let localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');
        localProds = localProds.filter(p => p.id != id);
        localStorage.setItem('diesel_products', JSON.stringify(localProds));

        loadProducts();
    } catch (err) {
        alert("فشل الحذف!");
    }
    showLoader(false);
}

// CRUD: Edit
async function editProduct(id) {
    let p = null;
    if (isFirebaseReady && !id.startsWith('L')) {
        const doc = await productsCol.doc(id).get();
        p = doc.data();
    } else {
        const localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');
        p = localProds.find(item => item.id == id);
    }

    if (!p) return;

    document.getElementById('edit-id').value = id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-price').value = p.price;
    document.getElementById('p-category').value = p.parentCategory || 'clothes';
    updateSubCats();
    document.getElementById('p-subcategory').value = p.subCategory;
    document.getElementById('p-sizes').value = (p.sizes || []).join(', ');

    // Load Color Variants
    colorVariants = (p.colorVariants || (p.colors || []).map(c => ({ name: c, image: '', sizes: '' }))).map(v => ({
        ...v,
        id: Math.random(),
        sizes: Array.isArray(v.sizes) ? v.sizes.join(', ') : (v.sizes || '')
    }));
    renderColorVariants();

    document.getElementById('p-badge').value = p.badge || '';
    document.getElementById('p-image-base64').value = p.image;
    previewImg.src = p.image;
    previewImg.style.display = 'block';

    document.getElementById('form-title').innerText = 'تعديل المنتج';
    document.getElementById('productForm').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Clear All Products
async function clearAllProducts() {
    if (!confirm("⚠️ تحذير: سيتم حذف جميع المنتجات نهائياً من المتجر والداتابيز. هل أنت متأكد؟")) return;
    showLoader(true);
    try {
        // Clear Firebase
        if (isFirebaseReady) {
            const snapshot = await productsCol.get();
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        // Clear Local
        localStorage.removeItem('diesel_products');

        alert("تم تفريغ المتجر بنجاح! 🗑️");
        loadProducts();
    } catch (err) {
        console.error(err);
        alert("حدث خطأ أثناء الحذف!");
    }
    showLoader(false);
}

// Migration: Initial Import
async function resetStore() {
    if (!confirm("سيتم استيراد المنتجات الافتراضية للمتجر. استمرار؟")) return;
    showLoader(true);

    const script = document.createElement('script');
    script.src = './js/products.js';
    script.onload = async () => {
        let localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');

        // Since products.js is now empty, this will essentially do nothing 
        // unless you add products back to that file.
        if (typeof products === 'undefined' || products.length === 0) {
            alert("لا توجد منتجات افتراضية لاستيرادها (الملف فارغ).");
            showLoader(false);
            return;
        }

        for (const p of products) {
            if (!localProds.some(lp => lp.name === p.name)) {
                const newP = {
                    ...p,
                    id: 'L' + Date.now() + Math.random(),
                    parentCategory: p.subCategory === 'shoes' ? 'shoes' : (p.subCategory === 'jeans' || p.subCategory === 'sweatpants' ? 'pants' : 'clothes'),
                    updatedAt: new Date().toISOString()
                };
                localProds.push(newP);
                if (isFirebaseReady) {
                    try { await productsCol.add(newP); } catch (e) { }
                }
            }
        }

        localStorage.setItem('diesel_products', JSON.stringify(localProds));
        alert("تم الاستيراد بنجاح!");
        loadProducts();
        showLoader(false);
    };
    document.body.appendChild(script);
}

function showLoader(show) { globalLoader.style.display = show ? 'flex' : 'none'; }

// Order Management
async function loadOrders() {
    if (!isFirebaseReady) return;
    const ordersList = document.getElementById('orders-list');

    db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        let html = '';
        let newCount = 0;

        if (snapshot.empty) {
            ordersList.innerHTML = '<div style="text-align: center; padding: 50px; opacity: 0.5;">لا توجد طلبات بعد.</div>';
            return;
        }

        snapshot.forEach(doc => {
            const order = doc.data();
            const id = doc.id;
            const date = order.createdAt ? order.createdAt.toDate().toLocaleString('ar-EG') : 'قيد المعالجة...';

            if (order.status === 'جديد') newCount++;

            html += `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <h3 style="margin-bottom: 5px;">${order.customerName}</h3>
                            <p style="font-size: 0.9rem; opacity: 0.7;"><i class="fas fa-clock"></i> ${date}</p>
                        </div>
                        <span class="order-status status-${getStatusClass(order.status)}">${order.status}</span>
                    </div>
                    
                    <div style="font-size: 1rem; margin-bottom: 10px;">
                        <p><i class="fas fa-phone"></i> <strong>الهاتف:</strong> <a href="tel:${order.phone}" style="color:var(--accent)">${order.phone}</a></p>
                        <p><i class="fas fa-map-marker-alt"></i> <strong>العنوان:</strong> ${order.address}</p>
                    </div>

                    <div class="order-items">
                        ${order.items.map(item => `
                            <div class="order-item">
                                <span>${item.name} (${item.color} - ${item.size}) x${item.quantity}</span>
                                <span style="font-weight: bold;">${item.total} ج.م</span>
                            </div>
                        `).join('')}
                    </div>

                    <div class="order-footer">
                        <div style="font-size: 1.2rem; font-weight: 900;">الاجمالي: <span style="color:var(--accent)">${order.total} ج.م</span></div>
                        <div style="display: flex; gap: 8px;">
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
                </div>
            `;
        });

        ordersList.innerHTML = html;

        // Update new orders badge
        const badge = document.getElementById('new-orders-count');
        if (newCount > 0) {
            badge.innerText = newCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    });
}

function getStatusClass(status) {
    if (status === 'جديد') return 'new';
    if (status === 'جاري التجهيز') return 'preparing';
    if (status === 'تم الشحن') return 'shipped';
    if (status === 'تم التسليم') return 'delivered';
    return 'default';
}

async function updateOrderStatus(id, newStatus) {
    try {
        await db.collection('orders').doc(id).update({ status: newStatus });
        alert("تم تحديث حالة الطلب ✅");
    } catch (err) {
        alert("خطأ في التحديث!");
    }
}

async function deleteOrder(id) {
    if (!isFirebaseReady) return;
    if (!confirm("هل تريد حذف هذا الطلب؟")) return;

    try {
        await db.collection('orders').doc(id).delete();
        alert("تم حذف الطلب 🗑️");
    } catch (err) {
        alert("خطأ في الحذف!");
    }
}

async function deleteAllOrders() {
    if (!isFirebaseReady) return;

    const confirmation = confirm("⚠️ هل أنت متأكد من حذف كااااافة الطلبات؟ لا يمكن التراجع عن هذه العملية!");
    if (!confirmation) return;

    const finalPass = prompt("من فضلك اكتب 'ديزل' لإتمام الحذف النهائي:");
    if (finalPass !== "ديزل") {
        alert("لم يتم الحذف. يجب كتابة كلمة 'ديزل' بشكل صحيح.");
        return;
    }

    showLoader(true);
    try {
        const snapshot = await db.collection('orders').get();
        if (snapshot.empty) {
            alert("لا توجد طلبات لحذفها! 📭");
            showLoader(false);
            return;
        }

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        alert("تم مسح جميع الطلبات بنجاح 🗑️🧹");
    } catch (err) {
        console.error("Error deleting all orders:", err);
        alert("حدث خطأ أثناء محاولة حذف جميع الطلبات!");
    } finally {
        showLoader(false);
    }
}

async function exportOrders() {
    if (!isFirebaseReady) return;

    showLoader(true);
    try {
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            alert("لا توجد طلبات لتصديرها! 📭");
            showLoader(false);
            return;
        }

        const allOrders = [];
        const todayOrders = [];
        const stats = {
            total: 0,
            delivered: 0,
            pending: 0,
            revenue: 0,
            todayRevenue: 0
        };

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        snapshot.forEach(doc => {
            const o = doc.data();
            const createdAt = o.createdAt ? o.createdAt.toDate() : null;
            const dateStr = createdAt ? createdAt.toLocaleString('ar-EG') : 'قيد المعالجة';
            const itemsList = o.items.map(i => `${i.name} (${i.color}/${i.size}) x${i.quantity}`).join(' | ');

            const row = {
                "التاريخ": dateStr,
                "اسم العميل": o.customerName,
                "رقم الهاتف": o.phone,
                "الايميل": o.userEmail || 'زائر',
                "العنوان": o.address,
                "المنتجات": itemsList,
                "الإجمالي": o.total + " ج.م",
                "الحالة": o.status,
                "حالة الدفع": o.paymentStatus || 'كاش/عند الاستلام'
            };

            allOrders.push(row);
            stats.total++;
            stats.revenue += Number(o.total || 0);

            if (o.status === 'تم التسليم') stats.delivered++;
            else if (o.status !== 'ملغي') stats.pending++;

            if (createdAt && createdAt >= startOfToday) {
                todayOrders.push(row);
                stats.todayRevenue += Number(o.total || 0);
            }
        });

        const workbook = XLSX.utils.book_new();

        // 1. Summary Sheet
        const summaryData = [
            ["تقرير مبيعات ديزل كفر شكر", ""],
            ["إجمالي الطلبات", stats.total],
            ["تم التسليم", stats.delivered],
            ["قيد التنفيذ", stats.pending],
            ["إجمالي الإيرادات", stats.revenue + " ج.م"],
            ["إيرادات اليوم", stats.todayRevenue + " ج.م"],
            ["تاريخ استخراج التقرير", new Date().toLocaleString('ar-EG')]
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, wsSummary, "الملخص");

        // 2. Today's Orders
        const wsToday = XLSX.utils.json_to_sheet(todayOrders);
        XLSX.utils.book_append_sheet(workbook, wsToday, "طلبات اليوم");

        // 3. All Orders
        const wsAll = XLSX.utils.json_to_sheet(allOrders);
        XLSX.utils.book_append_sheet(workbook, wsAll, "كافة الطلبات");

        // Column widths
        const wscols = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 35 }, { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
        wsToday['!cols'] = wscols;
        wsAll['!cols'] = wscols;
        wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];

        const fileName = `Diesel_Report_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        alert("تم استخراج التقرير بنجاح! 📊🚀");
    } catch (err) {
        console.error(err);
        alert("حدث خطأ أثناء التصدير!");
    } finally {
        showLoader(false);
    }
}
