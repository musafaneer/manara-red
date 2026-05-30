
export type Language = 'ar' | 'en' | 'ar-ly';

export interface Translations {
  [key: string]: {
    ar: string;
    en: string;
    'ar-ly'?: string;
  };
}

export const translations: Translations = {
  // Navigation
  dashboard: { ar: 'لوحة التحكم', en: 'Dashboard', 'ar-ly': 'لوحة الإشراف (المنارة)' },
  students: { ar: 'شؤون الطلاب', en: 'Student Affairs', 'ar-ly': 'إدارة شؤون الطلاب' },
  academics: { ar: 'السجل الأكاديمي', en: 'Academic Records', 'ar-ly': 'السجل الأكاديمي والتعليمي' },
  financials: { ar: 'المعاملات المالية', en: 'Financial Ledger', 'ar-ly': 'الحسابات والميزانية المالية' },
  registration: { ar: 'منظومة التسجيل', en: 'Registration System', 'ar-ly': 'منظومة تنزيل المواد وتسجيل الطلاب' },
  settings: { ar: 'إعدادات النظام', en: 'System Settings', 'ar-ly': 'إعدادات المنظومة واللوائح' },
  reports: { ar: 'التقارير', en: 'Reports', 'ar-ly': 'التقارير والإحصائيات القانونية' },
  communications: { ar: 'مركز الاتصالات', en: 'Communications Hub', 'ar-ly': 'مركز البث والتعميمات الذكي' },
  
  // General UI
  search: { ar: 'بحث...', en: 'Search...', 'ar-ly': 'بحث سريع...' },
  save: { ar: 'حفظ', en: 'Save', 'ar-ly': 'اعتماد وحفظ' },
  cancel: { ar: 'إلغاء', en: 'Cancel', 'ar-ly': 'إلغاء الأمر' },
  logout: { ar: 'تسجيل الخروج', en: 'Logout', 'ar-ly': 'خروج آمن' },
  welcome: { ar: 'مرحباً بك', en: 'Welcome', 'ar-ly': 'مرحباً بك في منظومة المنارة' },
  
  // Dashboard Strings
  total_students: { ar: 'إجمالي الطلاب', en: 'Total Students', 'ar-ly': 'العدد الإجمالي للطلاب المقيدين' },
  compliance_score: { ar: 'نسبة الامتثال', en: 'Compliance Score', 'ar-ly': 'مؤشر الامتثال للائحة 501' },
  academic_health: { ar: 'الاستقرار الأكاديمي', en: 'Academic Stability', 'ar-ly': 'الاستقرار الأكاديمي الفصلي' },
  financial_health: { ar: 'الاستقرار المالي', en: 'Financial Health', 'ar-ly': 'الموقف المالي العام' },
  
  // Common Labels
  active: { ar: 'نشط', en: 'Active', 'ar-ly': 'نشط ومستمر' },
  warning: { ar: 'إنذار', en: 'Warning', 'ar-ly': 'تحت الإنذار الأكاديمي' },
  graduated: { ar: 'خريج', en: 'Graduated', 'ar-ly': 'خريج معتمد' },
};

export const getTranslation = (key: string, lang: Language): string => {
  if (lang === 'ar-ly') {
    return translations[key]?.['ar-ly'] || translations[key]?.['ar'] || key;
  }
  return translations[key]?.[lang] || key;
};
