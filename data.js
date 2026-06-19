'use strict';
/* قوالب البذور (٣ مستويات) — بصيغة مرنة موحّدة:
   template = { sections:[ {id,title,items:[ {id,label,note,kind,group} ]} ] }
   kind: check(افتراضي) | text | rating | time ، و group => تتعرض كأزرار (pills) */

const SALAH = g => [
  { id: 'salah_fajr', label: 'فجر', group: g }, { id: 'salah_dhuhr', label: 'ظهر', group: g },
  { id: 'salah_asr', label: 'عصر', group: g }, { id: 'salah_maghrib', label: 'مغرب', group: g },
  { id: 'salah_isha', label: 'عشا', group: g },
];
const SUNAN = g => [
  { id: 'sunan_fajr', label: 'الفجر', note: '٢ قبل', group: g },
  { id: 'sunan_dhuhr', label: 'الظهر', note: '٤ق+٢ب', group: g },
  { id: 'sunan_maghrib', label: 'المغرب', note: '٢ بعد', group: g },
  { id: 'sunan_isha', label: 'العشا', note: '٢ بعد', group: g },
];
const GOALS = { id: 'goals', title: 'أهم ٣ حاجات النهاردة', items: [
  { id: 'goal1', kind: 'goal', label: '١' }, { id: 'goal2', kind: 'goal', label: '٢' }, { id: 'goal3', kind: 'goal', label: '٣' },
] };
const SLEEP = extra => ({ id: 'sleep', title: 'قبل ما أنام', items: [
  { id: 'rating', kind: 'rating', label: 'تقييم يومك من ١٠' },
  { id: 'best_thing', kind: 'text', label: 'أحسن حاجة عملتها النهاردة' },
].concat(extra || []) });

const SEEDS = {
  beginner: { name: 'مبتدئ', motto: 'ابدأ صغير… الثبات أهم من الكثرة', sections: [
    GOALS,
    { id: 'faraid', title: 'الفرائض والأساسيات', items: [
      ...SALAH('الصلوات'),
      { id: 'sunan_fajr', label: 'السنن الرواتب', note: 'ابدأ بسنة الفجر' },
      { id: 'athkar_sabah', label: 'أذكار الصباح', note: 'بعد الفجر' },
      { id: 'athkar_masa', label: 'أذكار المساء', note: 'بعد العصر' },
      { id: 'quran', label: 'القرآن', note: 'ولو صفحة' },
    ] },
    { id: 'adhkar', title: 'أذكار اليوم — ابدأ بسيط', items: [
      { id: 'istighfar', label: 'استغفار', note: 'ولو ٣٣' },
      { id: 'salaa_nabi', label: 'صلاة على النبي ﷺ', note: 'ولو ١٠' },
    ] },
    { id: 'akhlaq', title: 'خير وأخلاق', items: [
      { id: 'sadaqa', label: 'صدقة' }, { id: 'birr', label: 'بر الوالدين / صلة رحم' }, { id: 'smile', label: 'بسمة وكلمة طيبة' },
    ] },
    { id: 'sehha', title: 'صحة ووقت زيادة', items: [
      { id: 'riyada', label: 'رياضة' }, { id: 'water', label: 'شرب مية كفاية' }, { id: 'sleep_early', label: 'نوم بدري' },
    ] },
    SLEEP(),
  ] },

  intermediate: { name: 'متوسط', motto: 'لو عملت دول، كسبت يومك', sections: [
    GOALS,
    { id: 'awrad', title: 'الأوراد — مربوطة بالصلاة', items: [
      ...SALAH('الصلوات'), ...SUNAN('السنن الرواتب'),
      { id: 'quran_read', label: 'قراءة', group: 'القرآن' }, { id: 'quran_review', label: 'مراجعة', group: 'القرآن' },
      { id: 'quran_memorize', label: 'حفظ', group: 'القرآن' }, { id: 'quran_tadabbur', label: 'تدبّر آية', group: 'القرآن' },
      { id: 'athkar_salah', label: 'أذكار بعد الصلاة', note: 'دبر كل صلاة' },
      { id: 'athkar_sabah', label: 'أذكار الصباح', note: 'بعد الفجر' },
      { id: 'duha', label: 'صلاة الضحى' },
      { id: 'athkar_masa', label: 'أذكار المساء', note: 'بعد العصر' },
      { id: 'qiyam', label: 'قيام الليل / الوتر', note: 'ولو ركعتين قبل النوم' },
    ] },
    { id: 'adhkar', title: 'أذكار اليوم — ١٠٠ مرة لكل ذكر', items: [
      { id: 'istighfar', label: 'استغفار' }, { id: 'salaa_nabi', label: 'صلاة على النبي ﷺ' }, { id: 'tasbeeh', label: 'سبحان الله وبحمده' },
    ] },
    { id: 'muamalat', title: 'معاملات وأخلاق', items: [
      { id: 'sadaqa', label: 'صدقة' }, { id: 'birr', label: 'بر الوالدين / صلة رحم' }, { id: 'siyam', label: 'صيام تطوّع' },
      { id: 'lisan', label: 'حفظ اللسان' }, { id: 'basar', label: 'غض البصر' }, { id: 'dua', label: 'دعاء / مناجاة' },
    ] },
    { id: 'sehha', title: 'صحة ووقت زيادة', items: [
      { id: 'riyada', label: 'رياضة' }, { id: 'water', label: 'شرب مية كفاية' }, { id: 'food', label: 'أكل صحي' }, { id: 'read_book', label: 'قراءة كتاب / كورس' },
    ] },
    { id: 'sleeptrack', title: 'متابعة النوم', items: [
      { id: 'sleep_time', kind: 'time', label: 'نمت إمبارح الساعة' }, { id: 'wake_time', kind: 'time', label: 'صحيت الساعة' },
    ] },
    SLEEP(),
  ] },

  advanced: { name: 'متقدم', motto: 'إحسان ومداومة — الزَم وِردك', sections: [
    GOALS,
    { id: 'awrad', title: 'الأوراد — مربوطة بالصلاة', items: [
      ...SALAH('الصلوات'), ...SUNAN('السنن الرواتب'),
      { id: 'quran_read', label: 'قراءة', note: 'وِرد', group: 'القرآن' }, { id: 'quran_review', label: 'مراجعة', group: 'القرآن' },
      { id: 'quran_memorize', label: 'حفظ', group: 'القرآن' }, { id: 'quran_tadabbur', label: 'تدبّر', group: 'القرآن' }, { id: 'quran_tafsir', label: 'تفسير', group: 'القرآن' },
      { id: 'jamaa', label: 'صلاة الجماعة / في المسجد' },
      { id: 'athkar_salah', label: 'أذكار بعد الصلاة', note: 'دبر كل صلاة' },
      { id: 'athkar_sabah', label: 'أذكار الصباح', note: 'بعد الفجر' },
      { id: 'duha', label: 'صلاة الضحى' },
      { id: 'athkar_masa', label: 'أذكار المساء', note: 'بعد العصر' },
      { id: 'qiyam', label: 'قيام الليل / الوتر' },
    ] },
    { id: 'adhkar', title: 'أذكار اليوم — المداومة ١٠٠', items: [
      { id: 'istighfar', label: 'استغفار' }, { id: 'salaa_nabi', label: 'صلاة على النبي ﷺ' }, { id: 'tasbeeh', label: 'سبحان الله وبحمده' },
      { id: 'tahleel', label: 'لا إله إلا الله' }, { id: 'hawqala', label: 'لا حول ولا قوة إلا بالله' },
    ] },
    { id: 'ilm', title: 'علم وتزكية', items: [
      { id: 'talab_ilm', label: 'طلب علم / حضور درس' }, { id: 'muhasaba', label: 'محاسبة النفس' }, { id: 'dua_muslimeen', label: 'الدعاء للمسلمين' },
    ] },
    { id: 'muamalat', title: 'معاملات وأخلاق', items: [
      { id: 'sadaqa', label: 'صدقة' }, { id: 'birr', label: 'بر الوالدين / صلة رحم' }, { id: 'siyam', label: 'صيام تطوّع' },
      { id: 'lisan', label: 'حفظ اللسان' }, { id: 'basar', label: 'غض البصر' }, { id: 'ghaydh', label: 'كظم الغيظ' },
    ] },
    { id: 'sehha', title: 'صحة ووقت زيادة', items: [
      { id: 'riyada', label: 'رياضة' }, { id: 'water', label: 'شرب مية كفاية' }, { id: 'food', label: 'أكل صحي' }, { id: 'read_book', label: 'قراءة كتاب / كورس' },
    ] },
    { id: 'sleeptrack', title: 'متابعة النوم', items: [
      { id: 'sleep_time', kind: 'time', label: 'نمت إمبارح الساعة' }, { id: 'wake_time', kind: 'time', label: 'صحيت الساعة' },
    ] },
    SLEEP(),
  ] },
};

const DEFAULT_SETTINGS = {
  prayer: { lat: null, lng: null, city: '', method: 'EGYPT', asr: 'Standard', offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 } },
  adhan: { enabled: true, reciter: 'a1' },
  // التذكيرات: {on, time}. time فاضي = وقت تلقائي (نسبةً للصلاة). الصباح/المساء/النوم مفعّلة افتراضياً
  reminders: { sabah: { on: true, time: '' }, masa: { on: true, time: '' }, wird: { on: false, time: '' }, sleep: { on: true, time: '' } },
  pomodoro: { focus: 25, brk: 5, long: 15 },
};

// أصوات الأذان (محايدة — تفادي نسبة لقارئ غلط). إضافة صوت = ملف adhan/aN.mp3 + سطر هنا
const ADHANS = [
  { id: 'a1', name: 'أذان مختار ١' }, { id: 'a2', name: 'أذان مختار ٢' }, { id: 'a3', name: 'أذان مختار ٣' },
  { id: 'a4', name: 'أذان مختار ٤' }, { id: 'a5', name: 'أذان مختار ٥' }, { id: 'a6', name: 'أذان مختار ٦' },
  { id: 'a7', name: 'أذان مختار ٧' }, { id: 'a8', name: 'أذان مختار ٨' },
];

// آية/حديث اليوم (قائمة محلية تتغيّر يومياً)
const DAILY_ITEMS = [
  { t: 'حديث', body: 'أفلَحَ إن صَدَقَ.', src: 'البخاري' },
  { t: 'حديث', body: 'تعاهَدوا هذا القرآنَ.', src: 'متفق عليه' },
  { t: 'آية', body: '﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا﴾', src: 'النساء ١٠٣' },
  { t: 'حديث', body: 'أحبُّ الأعمالِ إلى اللهِ أدومُها وإن قَلَّ.', src: 'متفق عليه' },
  { t: 'آية', body: '﴿وَأَقِمِ الصَّلَاةَ لِذِكْرِي﴾', src: 'طه ١٤' },
  { t: 'حديث', body: 'مَن غَدا إلى المسجدِ أو راحَ أعدَّ اللهُ له نُزُلَه.', src: 'متفق عليه' },
  { t: 'آية', body: '﴿قَدْ أَفْلَحَ الْمُؤْمِنُونَ * الَّذِينَ هُمْ فِي صَلَاتِهِمْ خَاشِعُونَ﴾', src: 'المؤمنون' },
];
