const express = require("express");
const axios = require("axios");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// --- Paymob Configuration ---
// يرجى استبدال هذه البيانات من لوحة تحكم Paymob الخاصة بك
const API_KEY = "YOUR_PAYMOB_API_KEY";
const INTEGRATION_ID = "YOUR_INTEGRATION_ID"; // كود الربط الخاص بك
const IFRAME_ID = "YOUR_IFRAME_ID"; // كود الإطار (Iframe)

// --- Firebase Admin Configuration ---
const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");

if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} else {
    console.warn("⚠️ Warning: serviceAccountKey.json not found. Firebase features will be disabled.");
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

// --- 1. طلب الدفع (Payment Request) ---
app.post("/pay", async (req, res) => {
    const { amount, orderId, customer, items } = req.body;

    try {
        // 🟢 الخطوة 1: المصادقة (Authentication)
        const auth = await axios.post(
            "https://accept.paymob.com/api/auth/tokens",
            { api_key: API_KEY }
        );
        const token = auth.data.token;

        // 🟢 الخطوة 2: إنشاء طلب (Create Order)
        // هنا يمكننا حساب السعر في السيرفر للتأكد من صحته (مطلب 12)
        let calculatedAmount = amount;

        if (db && items && items.length > 0) {
            let total = 0;
            for (const item of items) {
                const productDoc = await db.collection('products').doc(item.id).get();
                if (productDoc.exists) {
                    const price = parseFloat(productDoc.data().price.toString().replace(/[^0-9.]/g, ''));
                    total += price * item.quantity;
                }
            }
            if (total > 0) calculatedAmount = total;
        }

        const orderResponse = await axios.post(
            "https://accept.paymob.com/api/ecommerce/orders",
            {
                auth_token: token,
                delivery_needed: false,
                amount_cents: Math.round(calculatedAmount * 100),
                currency: "EGP",
                items: [] // Paymob items list is optional here
            }
        );

        // 🟢 الخطوة 3: استلام Payment Token (Payment Key Generation)
        const paymentKeyResponse = await axios.post(
            "https://accept.paymob.com/api/acceptance/payment_keys",
            {
                auth_token: token,
                amount_cents: Math.round(calculatedAmount * 100),
                expiration: 3600,
                order_id: orderResponse.data.id,
                billing_data: {
                    first_name: customer.name.split(' ')[0] || "Client",
                    last_name: customer.name.split(' ')[1] || "User",
                    phone_number: customer.phone || "01000000000",
                    email: customer.email || "test@test.com",
                    country: "EG",
                    city: "Cairo",
                    street: "NA"
                },
                currency: "EGP",
                integration_id: INTEGRATION_ID
            }
        );

        // ربط ID الطلب في دايزل بـ ID الطلب في بايموب (اختياري)
        if (db && orderId) {
            await db.collection('orders').doc(orderId).update({
                paymobOrderId: orderResponse.data.id,
                totalCalculated: calculatedAmount
            });
        }

        res.json({
            iframe: `https://accept.paymob.com/api/acceptance/iframes/${IFRAME_ID}?payment_token=${paymentKeyResponse.data.token}`
        });

    } catch (error) {
        console.error("Paymob Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "تعذر معالجة الدفع حالياً" });
    }
});

// --- 2. استلام النتيجة من Paymob (Transaction Callback) ---
// يتم ضبط هذا الرابط في صفحة الربط في Paymob لوحة التحكم
app.post("/callback", async (req, res) => {
    const data = req.body;
    const type = data.type; // TRANSACTION
    const transaction = data.obj;

    if (type === "TRANSACTION") {
        const success = transaction.success;
        const paymobOrderId = transaction.order.id;
        const amount = transaction.amount_cents / 100;

        if (success && db) {
            try {
                // البحث عن الطلب في فايربيز وتحديث حالته
                const snapshot = await db.collection('orders').where('paymobOrderId', '==', paymobOrderId).get();
                if (!snapshot.empty) {
                    const orderDoc = snapshot.docs[0];
                    await orderDoc.ref.update({
                        paymentStatus: "تم الدفع",
                        status: "جاري التجهيز", // تحويل الحالة تلقائياً بعد الدفع
                        transactionId: transaction.id
                    });
                    console.log(`✅ Order ${orderDoc.id} marked as paid.`);
                }
            } catch (err) {
                console.error("Firebase Update Error:", err);
            }
        }
    }

    res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Paymob Server running on port ${PORT}`);
});
