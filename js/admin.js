

// 🚀 DIESEL ADMIN ENGINE - HYBRID VERSION (Supabase Edition)
// Configuration and Supabase client are loaded from config.js

let supabase = window.supabase;
let isSupabaseReady = !!supabase;

if (!supabase) {
    console.warn("⚠️ Supabase Client not found! Ensure config.js is loaded.");
} else {
    // Re-assign to local variable if needed or just rely on global
    console.log("✅ Admin Panel: Connected to Supabase");
}

let productsCol = null; // Legacy support
let adminRole = localStorage.getItem('adminRole') || 'none';
let currentUser = null;

const governorates = [
    "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم", "الغربية", "الإسماعيلية", "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "السويس", "الشرقية", "دمياط", "بورسعيد", "جنوب سيناء", "كفر الشيخ", "مطروح", "الأقصر", "قنا", "شمال سيناء", "سوهاج", "بني سويف", "أسيوط", "أسوان"
];

// Initialize Supabase Auth Logic
// --- ADMIN AUTH CONFIGURATION ---
const ALLOWED_ADMINS = [
    "dieselkafrshukr@gmail.com", // Owner
    "admin@diesel.com",
    // Add more admin emails here
];

async function initAdminAuth() {
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK not loaded");
        return;
    }

    firebase.auth().onAuthStateChanged((user) => {
        const loginOverlay = document.getElementById('login-overlay');
        const adminContent = document.getElementById('admin-main-content');
        const errorEl = document.getElementById('login-error');

        if (user) {
            console.log("Admin User Detected:", user.email);
            if (ALLOWED_ADMINS.includes(user.email)) {
                currentUser = user;
                localStorage.setItem('adminRole', 'all'); // Grants full access
                adminRole = 'all';

                loginOverlay.style.display = 'none';
                adminContent.style.display = 'block';

                applyRoleRestrictions();
                showTab('orders'); // Default to orders view
                loadOrders();
                setupRealtimeNotifications();
            } else {
                console.warn("Unauthorized Access Attempt:", user.email);
                currentUser = null;
                adminRole = 'none';
                loginOverlay.style.display = 'flex';
                adminContent.style.display = 'none';
                if (errorEl) {
                    errorEl.innerText = `عفواً، البريد الإلكتروني ${user.email} ليس لديه صلاحيات الأدمن.`;
                    errorEl.style.display = 'block';
                }
                firebase.auth().signOut();
            }
        } else {
            // CHECK FOR MANUAL LOGIN BEFORE RESETTING
            if (localStorage.getItem('manual_admin_login') === 'true') {
                console.log("🔓 Restoring Manual Session...");

                // Restore session state
                currentUser = { email: 'boss@diesel.com', id: 'master_admin', role: 'owner' };
                adminRole = 'all';

                loginOverlay.style.display = 'none';
                adminContent.style.display = 'block';

                applyRoleRestrictions();

                // Load critical checks if needed
                if (!document.getElementById('products-section') || scriptFirstLoad) {
                    showTab('orders');
                    loadOrders();
                    scriptFirstLoad = false;
                }
                return;
            }

            // Not logged in
            currentUser = null;
            adminRole = 'none';
            loginOverlay.style.display = 'flex';
            adminContent.style.display = 'none';
        }
    });
}
let scriptFirstLoad = true;

window.loginWithGoogle = async () => {
    const errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.style.display = 'none';

    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await firebase.auth().signInWithPopup(provider);
    } catch (error) {
        console.error("Login Error:", error);
        if (errorEl) {
            errorEl.innerText = "خطأ في تسجيل الدخول: " + error.message;
            errorEl.style.display = 'block';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Init Elements
    productsListBody = document.getElementById('products-list-body');
    subCatSelect = document.getElementById('p-subcategory');
    previewImg = document.getElementById('preview-img');
    globalLoader = document.getElementById('global-loader');
    colorVariantsContainer = document.getElementById('color-variants-container');

    updateSubCats();
    initAdminAuth();
});

window.handleManualLogin = (e) => {
    e.preventDefault();
    console.log("Attempting Manual Login...");

    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const errEl = document.getElementById('login-error');
    if (errEl) errEl.style.display = 'none';

    if (email === 'boss@diesel.com' && pass === 'diesel7080') {
        // Success
        console.log("✅ Credentials Correct");
        currentUser = { email: email, id: 'master_admin', role: 'owner' };
        localStorage.setItem('adminRole', 'all');
        localStorage.setItem('manual_admin_login', 'true');
        adminRole = 'all';

        const overlay = document.getElementById('login-overlay');
        const content = document.getElementById('admin-main-content');

        if (overlay) overlay.style.display = 'none';
        if (content) content.style.display = 'block';

        applyRoleRestrictions();
        showTab('orders');
        loadOrders();
    } else {
        console.error("❌ Credentials Incorrect");
        if (errEl) {
            errEl.innerText = "بيانات الدخول غير صحيحة ❌";
            errEl.style.display = 'block';
        }
    }
};

async function loadShippingCosts() {
    const container = document.getElementById('shipping-list-container');
    if (!container) return;

    showLoader(true);
    let currentCosts = {};
    try {
        if (supabase) {
            const { data, error } = await supabase.from('settings').select('costs').eq('id', 'shipping').single();
            if (data) currentCosts = data.costs || {};
        }
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
        if (supabase) {
            const { error } = await supabase.from('settings').upsert({ id: 'shipping', costs: costs, updatedAt: new Date() });
            if (error) throw error;
        } else {
            alert("أنت غير متصل بالإنترنت، لن يتم حفظ التغييرات على السيرفر.");
        }
        alert("تم حفظ تكاليف الشحن بنجاح! 🚚✅");
    } catch (e) {
        console.error("Save error:", e);
        alert("حدث خطأ أثناء الحفظ! ❌\n" + (e.message || "تأكد من صلاحيات الأدمن"));
    }
    showLoader(false);
}

function logout() {
    if (typeof firebase !== 'undefined') firebase.auth().signOut();
    localStorage.removeItem('adminRole');
    localStorage.removeItem('manual_admin_login');
    adminRole = 'none';
    location.reload();
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
    if (!adminRole || adminRole === 'none') {
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
        loadProducts();
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

        try {
            // Supabase Size Limit Check (Edge case but good practice)
            const stringData = JSON.stringify(data);
            const sizeInBytes = new Blob([stringData]).size;
            if (sizeInBytes > 1000 * 1000) {
                showLoader(false);
                return alert("⚠️ حجم المنتج كبير جداً بسبب كثرة الصور عالية الجودة. يرجى تقليل عدد الألوان أو استخدام صور أصغر.");
            }

            if (isSupabaseReady) {
                if (id && !id.startsWith('L')) {
                    // Update existing
                    const { error } = await supabase.from('products').update(data).eq('id', id);
                    if (error) throw error;
                } else {
                    // Create new
                    // Remove id if it's new, Supabase generates it
                    const { error } = await supabase.from('products').insert([data]);
                    if (error) throw error;
                }
            }
            // Update Local Backup just in case
            let localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');
            if (id) {
                const idx = localProds.findIndex(p => p.id == id);
                if (idx !== -1) {
                    // Merge updates
                    localProds[idx] = { ...localProds[idx], ...data };
                }
            } else {
                localProds.push({ ...data, id: 'L' + Date.now() }); // Temporary local ID
            }
            localStorage.setItem('diesel_products', JSON.stringify(localProds));

            alert("تم الحفظ بنجاح! ✅"); toggleForm(); loadProducts();
        } catch (err) { console.error(err); alert("حدث خطأ! ❌\n" + (err.message || err)); }
        showLoader(false);
    };
}

async function fetchProducts() {
    let allP = [];

    // 1. Load Local (Immediate Feedback)
    try {
        const local = JSON.parse(localStorage.getItem('diesel_products') || '[]');
        allP = [...local];
    } catch (e) { console.error("Local error", e); }

    // 2. Load Remote Supabase
    if (isSupabaseReady && supabase) {
        try {
            const { data, error } = await supabase.from('products').select('*');
            if (data) {
                // Merge logic could be improved, but simply taking remote is safer to avoid sync conflicts
                // If remote exists, prioritize it.
                if (data.length > 0) allP = data;
                else if (allP.length > 0) {
                    // If remote is empty but local has data (first migration?), maybe keep local
                    // But usually remote is source of truth.
                }
            }
        } catch (error) {
            console.error("Supabase fetch error:", error);
        }
    }

    // 3. Fallback
    if (allP.length === 0 && typeof products !== 'undefined' && products.length > 0) {
        allP = products;
    }

    remoteProducts = allP;
    return allP;
}

async function loadProducts() {
    if (!productsListBody) productsListBody = document.getElementById('products-list-body');
    if (!productsListBody) return;

    if (adminRole !== 'all' && adminRole !== 'products') return;
    try {
        let allProducts = await fetchProducts();

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
        if (isSupabaseReady && !id.startsWith('L')) {
            await supabase.from('products').update({ status: newStatus, updatedAt: new Date() }).eq('id', id);
        }

        // Local Update
        let localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');
        const idx = localProds.findIndex(p => p.id == id);
        if (idx !== -1) {
            localProds[idx].status = newStatus;
            localStorage.setItem('diesel_products', JSON.stringify(localProds));
        }

        loadProducts();
    } catch (err) {
        alert("فشل تغيير الحالة!");
    }
    showLoader(false);
}

async function deleteProduct(id) {
    if (!confirm("⚠️ هذا سيحذف المنتج تماماً ولن تتمكن من استعادته. هل أنت متأكد؟")) return;
    showLoader(true);
    try {
        if (isSupabaseReady && !id.startsWith('L')) await supabase.from('products').delete().eq('id', id);

        let localProds = JSON.parse(localStorage.getItem('diesel_products') || '[]');
        localProds = localProds.filter(p => p.id != id);
        localStorage.setItem('diesel_products', JSON.stringify(localProds));

        loadProducts();
    } catch (err) { alert("فشل الحذف!"); }
    showLoader(false);
}

async function editProduct(id) {
    let p = null;
    if (isSupabaseReady && !id.startsWith('L')) {
        const { data } = await supabase.from('products').select('*').eq('id', id).single();
        p = data;
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

    // Handle sizes if array or string
    let sizesStr = '';
    if (Array.isArray(p.sizes)) sizesStr = p.sizes.join(', ');
    else if (typeof p.sizes === 'string') sizesStr = p.sizes;
    document.getElementById('p-sizes').value = sizesStr;

    // Handle Color Variants
    let rawVariants = p.colorVariants;
    // Map existing structure or fallback to simple colors array
    let mappedVariants = [];
    if (rawVariants && Array.isArray(rawVariants)) {
        mappedVariants = rawVariants.map(v => ({
            id: Math.random(),
            name: v.name,
            image: v.image,
            sizes: Array.isArray(v.sizes) ? v.sizes.join(', ') : (v.sizes || '')
        }));
    } else if (p.colors && Array.isArray(p.colors)) {
        mappedVariants = p.colors.map(c => ({ id: Math.random(), name: c, image: '', sizes: '' }));
    }

    colorVariants = mappedVariants;
    renderColorVariants();
    document.getElementById('p-badge').value = p.badge || '';
    document.getElementById('p-image-base64').value = p.image || "";
    previewImg.src = p.image || "";
    previewImg.style.display = p.image ? 'block' : 'none';
    document.getElementById('form-title').innerText = 'تعديل المنتج';
    document.getElementById('productForm').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function clearAllProducts() {
    if (!confirm("⚠️ تحذير: سيتم حذف جميع المنتجات نهائياً من المتجر والداتابيز. هل أنت متأكد؟")) return;
    showLoader(true);
    try {
        // Supabase doesn't have "truncate" via client easily without policy, loop delete is slow.
        // But for client app usually we delete one by one or batch if small.
        // Assuming moderate size, we issue a delete for all (CAREFUL in prod)
        if (isSupabaseReady) {
            const { error } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete not null trick
        }
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
        if (typeof products === 'undefined' || products.length === 0) { alert("لا توجد منتجات افتراضية للاستيراد."); showLoader(false); return; }

        let toInsert = [];
        for (const p of products) {
            const newP = {
                name: p.name,
                price: p.price,
                image: p.image,
                category: "men",
                parentCategory: p.subCategory === 'shoes' ? 'shoes' : (p.subCategory === 'jeans' || p.subCategory === 'sweatpants' ? 'pants' : 'clothes'),
                subCategory: p.subCategory,
                sizes: p.sizes, // array
                colors: p.colors || [],
                colorVariants: p.colorVariants, // json
                badge: p.badge || "",
                updatedAt: new Date().toISOString()
            };
            toInsert.push(newP);
        }

        if (isSupabaseReady && toInsert.length > 0) {
            try {
                const { error } = await supabase.from('products').insert(toInsert);
                if (error) throw error;
            } catch (e) {
                console.error("Batch insert failed", e);
            }
        }

        alert("تم الاستيراد بنجاح!"); loadProducts(); showLoader(false);
    };
    document.body.appendChild(script);
}

function showLoader(show) { if (globalLoader) globalLoader.style.display = show ? 'flex' : 'none'; }

// Order functions
async function loadOrders() {
    if (!isSupabaseReady || !supabase) {
        document.getElementById('orders-list').innerHTML = "لا يوجد اتصال بالسيرفر";
        return;
    }
    if (adminRole !== 'all' && adminRole !== 'orders') return;

    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;

    // Load from Supabase
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('createdAt', { ascending: false });

    if (!orders || orders.length === 0) {
        ordersList.innerHTML = '<div style="text-align: center; padding: 50px; opacity: 0.5;">لا توجد طلبات بعد.</div>';
        return;
    }

    let html = '';
    let newCount = 0;

    orders.forEach(order => {
        const id = order.id;
        const date = order.createdAt ? new Date(order.createdAt).toLocaleString('ar-EG') : 'غير متوفر';
        if (order.status === 'جديد') newCount++;

        // Handle items: Supabase JSONB returns object directly, no need to parse if client handles it well
        let items = order.items;
        if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch (e) { }
        }
        if (!Array.isArray(items)) items = [];

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
                    <div class="order-items">${items.map(item => `<div class="order-item"><span>${item.name} (${item.color} - ${item.size}) x${item.quantity}</span><span style="font-weight: bold;">${item.total} ج.م</span></div>`).join('')}</div>
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
}

function getStatusClass(status) { return status === 'جديد' ? 'new' : status === 'جاري التجهيز' ? 'preparing' : status === 'تم الشحن' ? 'shipped' : status === 'تم التسليم' ? 'delivered' : 'default'; }
async function updateOrderStatus(id, newStatus) {
    try {
        await supabase.from('orders').update({ status: newStatus }).eq('id', id);
        alert("تم تحديث حالة الطلب ✅");
        loadOrders();
    } catch (err) { alert("خطأ في التحديث!"); }
}
async function deleteOrder(id) {
    if (!isSupabaseReady) return;
    if (!confirm("هل تريد حذف هذا الطلب؟")) return;
    try {
        await supabase.from('orders').delete().eq('id', id);
        alert("تم حذف الطلب 🗑️");
        loadOrders();
    } catch (err) { alert("خطأ في الحذف!"); }
}

async function deleteAllOrders() {
    if (!isSupabaseReady) return;
    if (!confirm("⚠️ هل أنت متأكد من حذف كافة الطلبات؟")) return;
    const finalPass = prompt("اكتب 'ديزل' لإتمام الحذف:");
    if (finalPass !== "ديزل") return;
    showLoader(true);
    try {
        const { error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        alert("تم مسح جميع الطلبات بنجاح 🗑️");
        loadOrders();
    } catch (err) { alert("حدث خطأ!"); }
    showLoader(false);
}

async function exportOrders() {
    if (!isSupabaseReady) return;
    showLoader(true);
    try {
        const { data: snapshot } = await supabase.from('orders').select('*').order('createdAt', { ascending: false });
        if (!snapshot || snapshot.length === 0) { alert("لا توجد طلبات."); showLoader(false); return; }

        const allOrders = [];
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        snapshot.forEach(o => {
            const createdAt = o.createdAt ? new Date(o.createdAt) : null;

            let itemsStr = '';
            let items = o.items;
            if (typeof items === 'string') { try { items = JSON.parse(items); } catch (e) { } }
            if (Array.isArray(items)) {
                itemsStr = items.map(i => `${i.name} (${i.color}/${i.size}) x${i.quantity}`).join(' | ');
            }

            const row = {
                "التاريخ": createdAt ? createdAt.toLocaleString('ar-EG') : 'قيد المعالجة',
                "اسم العميل": o.customerName,
                "رقم الهاتف": o.phone,
                "المحافظة": o.gov || 'غير محدد',
                "العنوان": o.address,
                "المنتجات": itemsStr,
                "إجمالي المنتجات": (o.itemsTotal || (o.total - (o.shippingCost || 0))) + " ج.م",
                "مصاريف الشحن": (o.shippingCost || 0) + " ج.م",
                "الإجمالي النهائي": o.total + " ج.م",
                "الحالة": o.status,
                "حالة الدفع": o.paymentStatus || 'كاش/عند الاستلام'
            };
            allOrders.push(row);
        });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(allOrders), "كافة الطلبات");
        XLSX.writeFile(workbook, `Diesel_Report_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.xlsx`);
        alert("تم التصدير بنجاح!");
    } catch (err) { console.error(err); alert("خطأ في التصدير!"); }
    showLoader(false);
}
