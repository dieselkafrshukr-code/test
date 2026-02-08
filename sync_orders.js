const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ⚙️ نظام مزامنة التقارير - نسخة Supabase
const SUPABASE_URL = 'https://ymdnfohikgjkvdmdrthe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_J0JuDItWsSggSZPj0ATwYA_xXlGI92x';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateDailyReport() {
    console.log('⏳ جاري جلب البيانات من Supabase وتحديث التقارير...');

    try {
        // جلب الطلبات مرتبة حسب التاريخ
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;

        if (!orders || orders.length === 0) {
            console.log('📭 لا توجد طلبات في قاعدة البيانات.');
            return;
        }

        const allOrders = [];
        const todayOrders = [];
        const stats = {
            totalOrders: 0,
            deliveredOrders: 0,
            pendingOrders: 0,
            totalRevenue: 0,
            todayRevenue: 0
        };

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        orders.forEach(o => {
            const createdAt = o.createdAt ? new Date(o.createdAt) : null;
            const dateStr = createdAt ? createdAt.toLocaleString('ar-EG') : 'قيد المعالجة';

            // تحويل المنتجات لنص مقروء (JSONB field in Supabase)
            let items = o.items;
            if (typeof items === 'string') {
                try { items = JSON.parse(items); } catch (e) { }
            }
            const itemsList = Array.isArray(items)
                ? items.map(i => `${i.name} (${i.color}/${i.size}) x${i.quantity}`).join(' | ')
                : 'بدون منتجات';

            const orderEntry = {
                "التاريخ": dateStr,
                "اسم العميل": o.customerName || 'بدون اسم',
                "رقم الهاتف": o.phone || 'بدون رقم',
                "المحافظة": o.gov || 'غير محدد',
                "العنوان": o.address || 'بدون عنوان',
                "المنتجات": itemsList,
                "إجمالي المنتجات": (o.itemsTotal || (o.total - (o.shippingCost || 0))) + " ج.م",
                "مصاريف الشحن": (o.shippingCost || 0) + " ج.م",
                "الإجمالي النهائي": o.total + " ج.م",
                "الحالة": o.status || 'جديد',
                "حالة الدفع": o.paymentStatus || 'كاش/عند الاستلام',
                "معرف الطلب": o.id
            };

            allOrders.push(orderEntry);
            stats.totalOrders++;
            stats.totalRevenue += Number(o.total || 0);

            if (o.status === 'تم التسليم') {
                stats.deliveredOrders++;
            } else if (o.status !== 'ملغي') {
                stats.pendingOrders++;
            }

            // تحقق إذا كان الطلب اليوم
            if (createdAt && createdAt >= startOfToday) {
                todayOrders.push(orderEntry);
                stats.todayRevenue += Number(o.total || 0);
            }
        });

        // إنشاء كتاب إكسل جديد
        const workbook = XLSX.utils.book_new();

        // 1. ورقة الملخص العام
        const summaryData = [
            ["إحصائيات المحل الشاملة (Supabase)", ""],
            ["إجمالي عدد الطلبات", stats.totalOrders],
            ["طلبات تم تسليمها", stats.deliveredOrders],
            ["طلبات قيد التنفيذ", stats.pendingOrders],
            ["إجمالي المبيعات", stats.totalRevenue + " ج.م"],
            ["مبيعات اليوم", stats.todayRevenue + " ج.م"],
            ["تاريخ التحديث", new Date().toLocaleString('ar-EG')]
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, wsSummary, "الملخص العام");

        // 2. ورقة طلبات اليوم
        const wsToday = XLSX.utils.json_to_sheet(todayOrders);
        XLSX.utils.book_append_sheet(workbook, wsToday, "طلبات اليوم");

        // 3. ورقة كافة الطلبات
        const wsAll = XLSX.utils.json_to_sheet(allOrders);
        XLSX.utils.book_append_sheet(workbook, wsAll, "كافة الطلبات");

        // ضبط عرض الأعمدة
        const cols = [
            { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 40 }
        ];
        wsToday['!cols'] = cols;
        wsAll['!cols'] = cols;
        wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];

        // حفظ الملف
        const filePath = path.join(__dirname, 'تقرير_المبيعات_اليومي.xlsx');
        XLSX.writeFile(workbook, filePath);

        // تحديث ملف الوقت
        fs.writeFileSync(path.join(__dirname, 'last_update.txt'), `آخر تحديث ناجح للتقرير (Supabase): ${new Date().toLocaleString('ar-EG')}`);

        console.log(`✅ تم تحديث ملف الإكسل بنجاح من Supabase`);
        console.log(`⭐ إجمالي الطلبات: ${stats.totalOrders} | مبيعات اليوم: ${stats.todayRevenue} ج.م`);

    } catch (error) {
        console.error('❌ حدث خطأ أثناء التحديث من Supabase:', error);
    }
}

// البدء
generateDailyReport();
