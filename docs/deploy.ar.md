# النشر

[English](deploy.md) · [العودة إلى README](../README.ar.md)

يعمل البوت على [منصة تيليجرام الخالية من الخوادم](https://core.telegram.org/bots/serverless). لا خادم ولا
صورة Docker ولا عنوان webhook لتجهيزها. المنصة تشغّل الوحدات وتحفظ قاعدة البيانات.

## قبل أن تبدأ

تحتاج إلى:

- Node.js بإصدار 22 أو أحدث على الجهاز الذي تنشر منه
- بوت على منصة تيليجرام الخالية من الخوادم. يشرح دليل المنصة كيف تنشئه، والأمر `tgcloud login` يطلب
  الرمز الذي يربط هذا المشروع به

## النشر

```bash
git clone https://github.com/Zaky1m/telegram-group-ban-bot.git
cd telegram-group-ban-bot
npm install
npx tgcloud login        # paste the token that links this project to your bot
npx tgcloud push         # uploads schema.js, lib/ and handlers/
npx tgcloud migrate      # creates the tables on the first deploy
```

يحفظ `tgcloud login` الرمز في `.tgcloud/` وgit يتجاهله. ولتشغيل الأوامر من سكربت اضبط `TGCLOUD_TOKEN`
بدلًا من ذلك (انظر `.env.example`).

## تولَّ ملكية البوت

أرسل `/start` إلى البوت فورًا. أول حساب يفعل ذلك يصبح المالك، وقبل ذلك يستطيع أي شخص يجد البوت أن يستولي
عليه. افعل هذا قبل أن تشارك اسم مستخدم البوت أو تضيفه إلى أي محادثة.

## إضافة المحادثات

أضف البوت إلى مجموعة أو قناة مشرفًا بهذه الصلاحيات:

- **حظر المستخدمين** و**حذف الرسائل**، وهما إلزاميتان. بدونهما يغادر البوت المحادثة
- **تثبيت الرسائل**، وهي اختيارية وتتيح للبوت إلغاء تثبيت منشورات القنوات التي يثبّتها تيليجرام في مجموعة النقاش

يرسل البوت إلى المالك رسالة يسأل فيها هل يراقب المحادثة. أكّد ذلك.

## التحديث

```bash
git pull
npm install
npm test
npx tgcloud status       # lists what differs from the last deployed version
npx tgcloud push
npx tgcloud migrate      # only when schema.js gained tables or columns
```

يصل `push` إلى البوت الحي فورًا، فشغّل الاختبارات قبله.

## أين تُحفظ البيانات

كل ما يتذكره البوت في قاعدة بيانات المنصة: المالك والمشرفون الإضافيون والحسابات المحظورة والمحادثات
المراقَبة والقائمة الممنوعة والتحذيرات والأسئلة المعلقة وقائمة المشكلات واسم مستخدم البوت. ولا يبقى شيء على
جهازك سوى الرمز في `.tgcloud/`.
