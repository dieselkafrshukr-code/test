const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { createClient } = require('@supabase/supabase-js');
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// --- Paymob Configuration ---
const API_KEY = "YOUR_PAYMOB_API_KEY";
const INTEGRATION_ID = "YOUR_INTEGRATION_ID";
const IFRAME_ID = "YOUR_IFRAME_ID";

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://ymdnfohikgjkvdmdrthe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_J0JuDItWsSggSZPj0ATwYA_xXlGI92x';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 1. طلب الدفع (Payment Request) ---
app.post("/pay", async (req, res) => {
    const { amount, orderId, customer, items } = req.body;

    try {
        // 🟢 الخطوة 1: المصادقة
        const auth = await axios.post(
            "https://accept.paymob.com/api/auth/tokens",
            { api_key: API_KEY }
        );
        const token = auth.data.token;

        // 🟢 الخطوة 2: التحقق من السعر (Security Check)
        let calculatedAmount = amount;
        if (items && items.length > 0) {
            let total = 0;
            for (const item of items) {
                const { data: product } = await supabase.from('products').select('price').eq('id', item.id).single();
                if (product) {
                    const price = parseFloat(product.price.toString().replace(/[^0-9.]/g, ''));
                    total += price * item.quantity;
                }
            }
            // Logic for adding shipping if needed can be added here
            if (total > 0) calculatedAmount = total;
        }

        const orderResponse = await axios.post(
            "https://accept.paymob.com/api/ecommerce/orders",
            {
                auth_token: token,
                delivery_needed: false,
                amount_cents: Math.round(calculatedAmount * 100),
                currency: "EGP",
                items: []
            }
        );

        // 🟢 الخطوة 3: استلام Payment Token
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

        // ربط ID الطلب
        if (orderId) {
            await supabase.from('orders').update({
                paymobOrderId: orderResponse.data.id.toString(),
                totalCalculated: calculatedAmount
            }).eq('id', orderId);
        }

        res.json({
            iframe: `https://accept.paymob.com/api/acceptance/iframes/${IFRAME_ID}?payment_token=${paymentKeyResponse.data.token}`
        });

    } catch (error) {
        console.error("Paymob Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "تعذر معالجة الدفع حالياً" });
    }
});

// --- 2. استلام النتيجة من Paymob ---
app.post("/callback", async (req, res) => {
    const data = req.body;
    const type = data.type;
    const transaction = data.obj;

    if (type === "TRANSACTION") {
        const success = transaction.success;
        const paymobOrderId = transaction.order.id;

        if (success) {
            try {
                // تحديث حالة الطلب في Supabase
                const { error } = await supabase.from('orders')
                    .update({
                        paymentStatus: "تم الدفع",
                        status: "جاري التجهيز",
                        transactionId: transaction.id.toString()
                    })
                    .eq('paymobOrderId', paymobOrderId.toString());

                if (error) throw error;
                console.log(`✅ Order related to Paymob ID ${paymobOrderId} marked as paid.`);
            } catch (err) {
                console.error("Supabase Update Error:", err);
            }
        }
    }

    res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Paymob Server (Supabase Edition) running on port ${PORT}`);
});
