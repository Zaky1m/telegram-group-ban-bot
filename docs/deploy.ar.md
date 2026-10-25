# النشر

[English](deploy.md) · [العودة إلى README](../README.ar.md)

يعمل البوت على [منصة تيليجرام الخالية من الخوادم](https://core.telegram.org/bots/serverless). لا خادم ولا
صورة Docker ولا عنوان webhook لتجهيزها. المنصة تشغّل الوحدات وتحفظ قاعدة البيانات.

## قبل أن تبدأ

تحتاج إلى:

- Node.js بإصدار 22 أو أحدث على الجهاز الذي تنشر منه
- بوت مسجَّل في [@BotFather](https://t.me/BotFather) مع تفعيل **Serverless**: افتح بوتك ثم **Serverless**
- رمز وصول الأداة للبوت: في @BotFather اختر بوتك ثم **Serverless** ثم **CLI Access** ثم **Access token**.
  شكله `app<id>:<secret>` وهو ليس رمز الـAPI الخاص بالبوت

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

## من الهاتف

يذكر دليل تيليجرام أن المشروع كله متاح أيضًا في @BotFather. افتح بوتك ثم **Serverless** وفعّله. تعرض الشاشة
**CLI Access** و**Handlers** و**Endpoints** و**Library** و**Database** و**Mini App Files**. يستخدم هذا البوت
ثلاثة منها:

- **Handlers**: ملفات `handlers/`، ملف لكل نوع تحديث في تيليجرام
- **Library**: ملفات `lib/`، وهي الوحدات المشتركة التي تستوردها المعالجات
- **Database**: الملف `schema.js`

وفيها تنشئ الملفات وتعدّلها وتجرّب معالجًا، وتعدّل مخطط قاعدة البيانات وتطبّقه. والحفظ ينشر.

في هذا المشروع نحو عشرين وحدة، فنسخها يدويًا بطيء. والطريق العملي من الهاتف بيئة فيها طرفية وNode.js 22،
مثل GitHub Codespace يُفتح في المتصفح، وتعمل فيه الخطوات أعلاه كما هي. ويبقى الرمز من @BotFather.

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
