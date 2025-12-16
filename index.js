require('dotenv').config(); // تحميل المتغيرات من ملف .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware (الوسيط) ---
app.use(cors()); // السماح لـ React بالاتصال بالسيرفر
app.use(express.json()); // السماح بقراءة بيانات JSON

// --- الاتصال بقاعدة البيانات (MongoDB Atlas) ---
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ خطأ: لم يتم العثور على رابط قاعدة البيانات في ملف .env");
  process.exit(1); // إيقاف التطبيق إذا لم يوجد الرابط
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ تم الاتصال بقاعدة البيانات MongoDB Atlas بنجاح'))
  .catch((err) => {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', err);
    process.exit(1);
  });

// --- تصميم شكل البيانات (Schema) ---
const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true }, // العنوان مطلوب
  description: { type: String, required: true },
  goal: { type: Number, required: true },
  raised: { type: Number, default: 0 }, // القيمة الافتراضية 0
  image: String,
  organizer: { type: String, default: "فاعل خير" },
  daysLeft: { type: Number, default: 30 },
  location: { type: [Number], default: [33.3152, 44.3661] }, // [خط العرض، خط الطول] - الافتراضي بغداد
  createdAt: { type: Date, default: Date.now } // تاريخ الإنشاء
});

const Campaign = mongoose.model('Campaign', campaignSchema);

// --- روابط API (Routes) ---

// 1. فحص السيرفر (للتأكد أنه يعمل)
app.get('/', (req, res) => {
  res.send('🚀 الخادم يعمل بنجاح! اذهب إلى /api/campaigns للحصول على البيانات.');
});

// 2. جلب جميع الحملات (GET)
app.get('/api/campaigns', async (req, res) => {
  try {
    // جلب البيانات وترتيبها من الأحدث للأقدم
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.delete('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Campaign.findByIdAndDelete(id);
    res.json({ message: 'تم حذف الحملة بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'فشل حذف الحملة' });
  }
});

// 4. تعديل حملة (Update) - مثلاً لتحديث المبلغ المجمّع أو الموافقة عليها
app.put('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCampaign = await Campaign.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedCampaign);
  } catch (error) {
    res.status(500).json({ error: 'فشل تحديث الحملة' });
  }
});

// 1. تعريف شكل بيانات المستخدم (Schema)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: { type: String, default: 'متبرع' }, // مدير، متبرع، متطوع
  status: { type: String, default: 'نشط' }, // نشط، محظور
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// 2. روابط التحكم بالمستخدمين (Routes)

// جلب كل المستخدمين
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ date: -1 }); // الأحدث أولاً
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'فشل جلب المستخدمين' });
  }
});

// إضافة مستخدم جديد
app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'فشل إضافة المستخدم' });
  }
});

// حذف مستخدم
app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم حذف المستخدم' });
  } catch (error) {
    res.status(500).json({ error: 'فشل الحذف' });
  }
});
// 3. جلب تفاصيل حملة واحدة (GET by ID)
// ملاحظة: React حالياً يستخدم ID رقمي (1, 2)، بينما MongoDB يستخدم ID نصي طويل (_id)
// سنقوم بتحديث React لاحقاً ليتعامل مع _id، لكن هذا الكود جاهز للمستقبل
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'الحملة غير موجودة' });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. إنشاء حملة جديدة (POST)
app.post('/api/campaigns', async (req, res) => {
  try {
    const { title, description, goal, image, location } = req.body;

    const newCampaign = new Campaign({
      title,
      description,
      goal,
      image,
      location: location || [33.3152, 44.3661], // استخدام موقع بغداد إذا لم يحدد المستخدم موقعاً
    });

    const savedCampaign = await newCampaign.save();
    res.status(201).json(savedCampaign); // إرجاع الحملة التي تم حفظها
  } catch (error) {
    res.status(400).json({ message: "حدث خطأ أثناء حفظ البيانات", error: error.message });
  }
});

// --- تشغيل السيرفر ---
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل الآن على الرابط: http://localhost:${PORT}`);
});


module.exports = app;
