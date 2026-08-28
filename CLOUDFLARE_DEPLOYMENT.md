# نشر تطبيق أكتبلي (EKTBLY) على Cloudflare Pages

تم إعداد تطبيق **أكتبلي (EKTBLY)** ليعمل كـ Full-stack Application متكامل على **Cloudflare Pages** باستخدام **Pages Functions** لتشغيل خدمة التفريغ الصوتي بأمان وسرعة فائقة بدون كشف مفتاح الذكاء الاصطناعي للمتصفح.

---

## 📋 المتطلبات وإعدادات البناء (Build Configuration)

عند ربط المشروع في لوحة تحكم **Cloudflare Pages Dashboard**:

| الإعداد (Setting) | القيمة (Value) |
|---|---|
| **Framework preset** | `Vite` (أو `None`) |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (المجلد الرئيسي للمستودع) |

---

## 🔑 المتغيرات السرية المشفرة (Environment Variables & Secrets)

يجب إضافة مفتاح Gemini API في إعدادات Cloudflare Pages كـ **Secret** مشفر:

1. اذهب إلى مشروعك في **Cloudflare Pages Dashboard**.
2. انتقل إلى **Settings** > **Environment variables**.
3. أضف المتغير التالي لكل من بيئتي **Production** و **Preview**:

```env
GEMINI_API_KEY = your_gemini_api_key_here
```

> ⚠️ **ملاحظة أمنية هامة**: مفتاح `GEMINI_API_KEY` محمي ومخزن على الخادم السحابي لـ Cloudflare Pages Function فقط، ولا يتم تضمينه أو إرساله أو كشفه للمتصفح نهائياً.

---

## 🚀 طريقة النشر الصحيحة (Deployment Methods)

### 1. النشر عبر مستودع Git (GitHub / GitLab) - الطريقة الموصى بها ⭐
- قم بربط مستودع Git الخاص بالمشروع مباشرة في Cloudflare Pages.
- سيقوم Cloudflare ببناء واجهة React إلى مجلد `dist` ونشر مسار الخادم الخلفي `functions/api/transcribe.ts` تلقائياً ليصبح متاحاً على الرابط:
  `POST /api/transcribe`

### 2. النشر عبر سطر الأوامر (Wrangler CLI)
إذا كنت تفضل النشر اليدوي عبر أداة Wrangler:
```bash
# 1. بناء المشروع
npm run build

# 2. نشر واجهة المستخدم وملفات الدوال السحابية
npx wrangler pages deploy dist
```

---

## ⚠️ تنبيه هام بخصوص السحب والإفلات (Direct Upload / Drag-and-Drop)
> **تنبيه:** رفع مجلد `dist` بمفرده عبر السحب والإفلات اليدوي (Direct Upload) **غير كافٍ** ولن يشغل خدمة التفريغ الصوتي، لأن مجلد `dist` يحتوي فقط على ملفات الواجهة الأمامية الثابتة، بينما تتطلب خدمة التحويل تواجد مجلد `functions/` الذي يتم نشره تلقائياً عبر تكامل **Git** أو عبر **Wrangler**.

---

## 🛠️ البنية البرمجية للنشر (Architecture Overview)

```
├── dist/                      # مخرجات بناء واجهة React / Vite
├── functions/                 # خادم Cloudflare Pages Functions
│   └── api/
│       └── transcribe.ts      # معالج POST /api/transcribe السحابي المشفر
├── src/                       # الكود المصدري لواجهة React
├── server.ts                  # خادم التطوير المحلي وبيئة Google AI Studio
└── package.json
```
