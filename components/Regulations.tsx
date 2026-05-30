
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scale, BookOpen, Search, Filter, FileText, 
  ChevronRight, ChevronLeft, Download, ExternalLink,
  ShieldAlert, Info, CheckCircle2, AlertCircle, GraduationCap
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RegulationArticle {
  id: string;
  title: string;
  content: string;
  category: 'GENERAL' | 'ACADEMIC' | 'EXAMS' | 'DISCIPLINE' | 'GRADUATION';
  tags: string[];
}

const articles: RegulationArticle[] = [
  {
    id: '1',
    title: 'المادة 1: التعريفات',
    content: 'يقصد بالألفاظ والعبارات الآتية أينما وردت في هذه اللائحة المعاني الموضحة أمام كل منها، ما لم يقتض السياق خلاف ذلك...',
    category: 'GENERAL',
    tags: ['تعريفات', 'أحكام عامة']
  },
  {
    id: '18',
    title: 'المادة 18: مدة الدراسة',
    content: 'الحد الأقصى للحصول على درجة البكالوريوس هو ضعف المدة المقررة للتخرج، ولا يجوز للطالب البقاء في الكلية أكثر من ذلك إلا بقرار من مجلس الجامعة...',
    category: 'ACADEMIC',
    tags: ['مدة الدراسة', 'البكالوريوس']
  },
  {
    id: '32',
    title: 'المادة 32: المعدل التراكمي والإنذار الأكاديمي',
    content: 'يوضع الطالب تحت الإنذار الأكاديمي إذا انخفض معدله التراكمي عن (2.00) من (4.00) أو ما يعادلها بنسبة (50%) لطلاب البكالوريوس و (65%) لطلاب الدراسات العليا...',
    category: 'ACADEMIC',
    tags: ['المعدل', 'الإنذار']
  },
  {
    id: '46',
    title: 'المادة 46: الفصل من الجامعة',
    content: 'يفصل الطالب من الجامعة في الحالات الآتية: إذا حصل على ثلاثة إنذارات أكاديمية متتالية، أو إذا لم ينه متطلبات التخرج خلال المدة القصوى المحددة...',
    category: 'DISCIPLINE',
    tags: ['الفصل', 'العقوبات']
  },
  {
    id: '12',
    title: 'المادة 12: إدارة الكليات والجامعات',
    content: 'يتولى عميد الكلية إدارة الشؤون العلمية والمالية والإدارية بها، ويكون مسؤولاً عن تنفيذ اللوائح والأنظمة المعمول بها، والتنسيق بين الأقسام العلمية المختلفة...',
    category: 'GENERAL',
    tags: ['الإدارة', 'عميد الكلية']
  },
  {
    id: '25',
    title: 'المادة 25: واجبات أعضاء هيئة التدريس',
    content: 'يجب على عضو هيئة التدريس القيام بالتدريس والبحث العلمي والإشراف على الرسائل العلمية، والمشاركة في أعمال الامتحانات واللجان الإدارية والأكاديمية التي يكلف بها...',
    category: 'ACADEMIC',
    tags: ['هيئة التدريس', 'الواجبات']
  },
  {
    id: '55',
    title: 'المادة 55: ضوابط الامتحانات',
    content: 'يمنع دخول الطالب لقاعة الامتحان بعد مضي نصف ساعة من بدايته، كما لا يسمح له بالخروج إلا بعد مضي ساعة واحدة من البداية...',
    category: 'EXAMS',
    tags: ['الامتحانات', 'الحضور']
  },
  {
    id: '61',
    title: 'المادة 61: تجديد القيد وفترات التسجيل',
    content: 'تنص اللائحة الموحدة على إلزامية تجديد القيد مطلع كل فصل دراسي. ويتطلب ذلك سداد الرسوم السنوية المقررة وبراءة الذمة المالية من المصاريف والمكتبة. يحرم الطالب غير المجدد لقيده في المواعيد المعلنة من تنزيل المقررات الدراسية أو حضور المحاضرات.',
    category: 'ACADEMIC',
    tags: ['تجديد القيد', 'التسجيل الدراسي']
  },
  {
    id: '64',
    title: 'المادة 64: إيقاف القيد وتأجيل الدراسة',
    content: 'يجوز للطالب التقدم بطلب إيقاف قيده (تجميد الدراسة مؤقتاً) لظروف معترف بها وموثقة. الحد الأقصى للإيقاف هو فصلين متتاليين أو ثلاثة فصول دراسية منفصلة طوال مسيرته الأكاديمية. يجب تقديم الطلب قبل نهاية الأسبوع الرابع من انطلاق الدراسة كحد أقصى لتجنب اعتباره منقطعاً أو راسباً.',
    category: 'ACADEMIC',
    tags: ['إيقاف القيد', 'تأجيل الدراسة']
  },
  {
    id: '68',
    title: 'المادة 68: الانسحاب الجزئي والانسحاب الكلي',
    content: '• الانسحاب الجزئي: يحق للطالب إسقاط (انسحاب من) مقرر دراسي أو أكثر خلال فترات الحذف والإضافة (أول 3-4 أسابيع) دون تسجيل رسوب، وبشرط ألا يقل العبء الدراسي المتبقي عن الحد الأدنى (مثلاً 9 ساعات معتمدة).\n• الانسحاب الكلي: يجوز للطالب الانسحاب الكامل من الفصل الدراسي بطلب خطي قبل نهاية الأسبوع الثامن، ويسجل في سجله الحالة (منسحب الفصل - W) دون احتساب نقاط هذا الفصل في معدله التراكمي.',
    category: 'ACADEMIC',
    tags: ['الانسحاب الجزئي', 'الانسحاب الكلي', 'إسقاط المواد']
  },
  {
    id: '72',
    title: 'المادة 72: النتائج غير المكتملة وتصفيتها (Incomplete Grade - IC)',
    content: 'يُرصد تقدير (غير مكتمل - IC) للطالب الذي غاب عن الامتحان النهائي بعذر قهري يقبله مجلس الكلية (مثل أسباب صحية قاهرة أو حوادث استثنائية)، شريطة حصوله على 60% كحد أدنى في أعمال السنة. تُعقد له امتحانات تصفية "غير المكتمل" خلال الأسبوعين الأولين من الفصل الأكاديمي التالي، وفي حال عدم تقديم الامتحان أو تأخره يُرصد تقدير (0) في النهائي ويُحسب التقدير على أنه راسب تلقائياً.',
    category: 'EXAMS',
    tags: ['غير مكتمل', 'تصفية المواد', 'الامتحانات الاستدراكية']
  }
];

import { Language } from '../services/i18nService';

interface RegulationsProps {
    language?: Language;
}

const Regulations: React.FC<RegulationsProps> = ({ language = 'ar' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  const filteredArticles = articles.filter(art => {
    const matchesSearch = art.title.includes(searchTerm) || art.content.includes(searchTerm);
    const matchesCategory = selectedCategory === 'ALL' || art.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'ALL', label: 'الكل', icon: BookOpen },
    { id: 'GENERAL', label: 'أحكام عامة', icon: Info },
    { id: 'ACADEMIC', label: 'الشؤون الأكاديمية', icon: GraduationCap },
    { id: 'EXAMS', label: 'الامتحانات', icon: FileText },
    { id: 'DISCIPLINE', label: 'الانضباط والفصل', icon: ShieldAlert },
    { id: 'GRADUATION', label: 'التخرج', icon: CheckCircle2 },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200">
              <Scale size={32} />
            </div>
            اللائحة الموحدة (501)
          </h2>
          <p className="text-slate-500 font-medium text-lg">الدليل القانوني المنظم للعملية التعليمية بالجامعات الليبية</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
          <Download size={20} />
          تحميل النسخة الكاملة (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="بحث في المواد..."
                className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">التصنيفات</p>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-right",
                    selectedCategory === cat.id 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <cat.icon size={18} className={selectedCategory === cat.id ? "text-white" : "text-slate-400"} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-indigo-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
            <AlertCircle className="text-indigo-400 mb-4" size={32} />
            <h4 className="text-xl font-black mb-2">تنبيه قانوني</h4>
            <p className="text-indigo-200 text-sm leading-relaxed">
              هذه المواد مستخرجة من اللائحة 501 المعتمدة من وزارة التعليم العالي. في حال وجود تعارض، المرجع هو النسخة الورقية المختومة.
            </p>
          </div>
        </div>

        {/* Articles List */}
        <div className="lg:col-span-3 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredArticles.map((art, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={art.id}
                className={cn(
                  "bg-white border rounded-[32px] transition-all overflow-hidden",
                  expandedArticle === art.id ? "border-indigo-500 shadow-xl" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <button 
                  onClick={() => setExpandedArticle(expandedArticle === art.id ? null : art.id)}
                  className="w-full p-8 flex items-center justify-between text-right"
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm",
                      expandedArticle === art.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      {art.id}
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-slate-900">{art.title}</h3>
                      <div className="flex gap-2 mt-2">
                        {art.tags.map(tag => (
                          <span key={tag} className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full uppercase tracking-tighter">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className={cn("transition-transform duration-300", expandedArticle === art.id ? "rotate-90" : "")}>
                    <ChevronLeft className="text-slate-300" />
                  </div>
                </button>

                <AnimatePresence>
                  {expandedArticle === art.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 bg-slate-50/30"
                    >
                      <div className="p-8 pt-0">
                        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-inner">
                          <p className="text-slate-700 leading-loose text-lg font-medium whitespace-pre-wrap">
                            {art.content}
                          </p>
                          <div className="mt-8 flex justify-end gap-4">
                            <button className="flex items-center gap-2 text-sm font-black text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">
                              <ExternalLink size={16} />
                              عرض الشرح التوضيحي
                            </button>
                            <button className="flex items-center gap-2 text-sm font-black text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-xl transition-all">
                              <FileText size={16} />
                              المواد المرتبطة
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredArticles.length === 0 && (
            <div className="py-32 text-center bg-white rounded-[40px] border border-slate-200 border-dashed">
              <Search size={64} className="mx-auto text-slate-200 mb-6" />
              <p className="text-xl font-black text-slate-400">لم يتم العثور على نتائج للبحث</p>
              <p className="text-slate-300 font-medium mt-2">جرب استخدام كلمات مفتاحية مختلفة أو تغيير التصنيف</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Regulations;
