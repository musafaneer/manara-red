
import { Permission, RoleDefinition, UserRole, RoleCategory, PermissionAction, PermissionScope, PermissionDefinition } from '../types';

const STORAGE_KEY_ROLES = 'oracle_campus_roles';

export const PERMISSION_METADATA: Record<Permission, PermissionDefinition> = {
  [Permission.STUDENTS_VIEW]: { id: Permission.STUDENTS_VIEW, label: 'عرض سجلات الطلاب', action: PermissionAction.VIEW, group: 'شؤون الطلاب', scope: PermissionScope.GLOBAL },
  [Permission.STUDENTS_EDIT]: { id: Permission.STUDENTS_EDIT, label: 'تعديل بيانات الطلاب', action: PermissionAction.EDIT, group: 'شؤون الطلاب', scope: PermissionScope.GLOBAL },
  [Permission.STUDENTS_DELETE]: { id: Permission.STUDENTS_DELETE, label: 'حذف سجلات الطلاب', action: PermissionAction.DELETE, group: 'شؤون الطلاب', scope: PermissionScope.GLOBAL },
  [Permission.GRADES_VIEW]: { id: Permission.GRADES_VIEW, label: 'عرض الدرجات', action: PermissionAction.VIEW, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.GRADES_EDIT]: { id: Permission.GRADES_EDIT, label: 'رصد وتعديل الدرجات', action: PermissionAction.EDIT, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.ACADEMICS_VIEW]: { id: Permission.ACADEMICS_VIEW, label: 'عرض السجل الأكاديمي والمناهج', action: PermissionAction.VIEW, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.ACADEMICS_MANAGE]: { id: Permission.ACADEMICS_MANAGE, label: 'إدارة السجل الأكاديمي', action: PermissionAction.MANAGE, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.DEPT_MANAGE]: { id: Permission.DEPT_MANAGE, label: 'إدارة شؤون القسم', action: PermissionAction.MANAGE, group: 'بوابة القسم', scope: PermissionScope.DEPARTMENT },
  [Permission.FINANCE_VIEW]: { id: Permission.FINANCE_VIEW, label: 'عرض السجلات المالية', action: PermissionAction.VIEW, group: 'المالية', scope: PermissionScope.GLOBAL },
  [Permission.FINANCE_EDIT]: { id: Permission.FINANCE_EDIT, label: 'معالجة المدفوعات', action: PermissionAction.EDIT, group: 'المالية', scope: PermissionScope.GLOBAL },
  [Permission.FACULTY_MANAGE]: { id: Permission.FACULTY_MANAGE, label: 'إدارة أعضاء هيئة التدريس', action: PermissionAction.MANAGE, group: 'الموارد البشرية', scope: PermissionScope.GLOBAL },
  [Permission.STAFF_MANAGE]: { id: Permission.STAFF_MANAGE, label: 'إدارة الموظفين الإداريين', action: PermissionAction.MANAGE, group: 'الموارد البشرية', scope: PermissionScope.GLOBAL },
  [Permission.ATTENDANCE_MANAGE]: { id: Permission.ATTENDANCE_MANAGE, label: 'إدارة الحضور والغياب', action: PermissionAction.MANAGE, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.REQUESTS_MANAGE]: { id: Permission.REQUESTS_MANAGE, label: 'إدارة طلبات الخدمة', action: PermissionAction.MANAGE, group: 'الخدمات والطلبات', scope: PermissionScope.GLOBAL },
  [Permission.REPORTS_VIEW]: { id: Permission.REPORTS_VIEW, label: 'عرض التقارير والتحليلات', action: PermissionAction.VIEW, group: 'النظام والتقارير', scope: PermissionScope.GLOBAL },
  [Permission.SETTINGS_MANAGE]: { id: Permission.SETTINGS_MANAGE, label: 'إدارة إعدادات النظام', action: PermissionAction.MANAGE, group: 'النظام والتقارير', scope: PermissionScope.GLOBAL },
  [Permission.ROLES_MANAGE]: { id: Permission.ROLES_MANAGE, label: 'إدارة الأدوار والصلاحيات', action: PermissionAction.MANAGE, group: 'النظام والتقارير', scope: PermissionScope.GLOBAL },
  [Permission.COMMUNICATIONS_MANAGE]: { id: Permission.COMMUNICATIONS_MANAGE, label: 'إدارة الإعلانات والإشعارات', action: PermissionAction.MANAGE, group: 'الخدمات والطلبات', scope: PermissionScope.GLOBAL },
  [Permission.FACILITIES_MANAGE]: { id: Permission.FACILITIES_MANAGE, label: 'إدارة مرافق الجامعة', action: PermissionAction.MANAGE, group: 'النظام والتقارير', scope: PermissionScope.GLOBAL },
  [Permission.ORGANIZATION_MANAGE]: { id: Permission.ORGANIZATION_MANAGE, label: 'إدارة الهيكل التنظيمي', action: PermissionAction.MANAGE, group: 'النظام والتقارير', scope: PermissionScope.GLOBAL },
  [Permission.EXAMS_VIEW]: { id: Permission.EXAMS_VIEW, label: 'عرض جداول ومواعيد الامتحانات', action: PermissionAction.VIEW, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.EXAMS_MANAGE]: { id: Permission.EXAMS_MANAGE, label: 'إدارة جداول الامتحانات', action: PermissionAction.MANAGE, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.EXAMS_RESULTS_PUBLISH]: { id: Permission.EXAMS_RESULTS_PUBLISH, label: 'اعتماد ونشر النتائج', action: PermissionAction.APPROVE, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.LECTURES_MANAGE]: { id: Permission.LECTURES_MANAGE, label: 'إدارة المحاضرات والجداول', action: PermissionAction.MANAGE, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.GRADUATE_MANAGE]: { id: Permission.GRADUATE_MANAGE, label: 'إدارة الدراسات العليا', action: PermissionAction.MANAGE, group: 'الدراسات العليا', scope: PermissionScope.GLOBAL },
  [Permission.AUDIT_VIEW]: { id: Permission.AUDIT_VIEW, label: 'عرض سجل التدقيق والرقابة', action: PermissionAction.VIEW, group: 'النظام والتقارير', scope: PermissionScope.GLOBAL },
  [Permission.ACADEMICS_APPROVE]: { id: Permission.ACADEMICS_APPROVE, label: 'اعتماد الخطط الأكاديمية', action: PermissionAction.APPROVE, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.FINANCE_APPROVE]: { id: Permission.FINANCE_APPROVE, label: 'اعتماد العمليات المالية الكبرى', action: PermissionAction.APPROVE, group: 'المالية', scope: PermissionScope.GLOBAL },
  [Permission.REGISTRATION_MANAGE]: { id: Permission.REGISTRATION_MANAGE, label: 'إدارة عمليات التسجيل (إداري)', action: PermissionAction.MANAGE, group: 'شؤون الطلاب', scope: PermissionScope.GLOBAL },
  [Permission.REGISTRATION_STUDENT]: { id: Permission.REGISTRATION_STUDENT, label: 'التسجيل الذاتي للطالب', action: PermissionAction.CREATE, group: 'شؤون الطلاب', scope: PermissionScope.OWN },
  [Permission.COURSE_MATERIAL_UPLOAD]: { id: Permission.COURSE_MATERIAL_UPLOAD, label: 'رفع وتحميل المواد التعليمية', action: PermissionAction.CREATE, group: 'الدرجات والأكاديميا', scope: PermissionScope.OWN },
  [Permission.STUDENTS_EXPORT]: { id: Permission.STUDENTS_EXPORT, label: 'تصدير بيانات الطلاب', action: PermissionAction.VIEW, group: 'شؤون الطلاب', scope: PermissionScope.GLOBAL },
  [Permission.STUDENTS_IMPORT]: { id: Permission.STUDENTS_IMPORT, label: 'استيراد بيانات الطلاب', action: PermissionAction.CREATE, group: 'شؤون الطلاب', scope: PermissionScope.GLOBAL },
  [Permission.GRADES_APPROVE]: { id: Permission.GRADES_APPROVE, label: 'اعتماد الدرجات النهائية', action: PermissionAction.APPROVE, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.GRADES_EXPORT]: { id: Permission.GRADES_EXPORT, label: 'تصدير كشوف الدرجات', action: PermissionAction.VIEW, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.FINANCE_REPORTS]: { id: Permission.FINANCE_REPORTS, label: 'تقارير مالية تفصيلية', action: PermissionAction.VIEW, group: 'المالية', scope: PermissionScope.GLOBAL },
  [Permission.AUDIT_EXPORT]: { id: Permission.AUDIT_EXPORT, label: 'تصدير سجلات التدقيق', action: PermissionAction.VIEW, group: 'النظام والتقارير', scope: PermissionScope.GLOBAL },
  [Permission.SYSTEM_LOGS_VIEW]: { id: Permission.SYSTEM_LOGS_VIEW, label: 'عرض سجلات النظام التقنية', action: PermissionAction.VIEW, group: 'النظام والتقارير', scope: PermissionScope.GLOBAL },
  [Permission.ENROLLMENT_OVERRIDE]: { id: Permission.ENROLLMENT_OVERRIDE, label: 'تجاوز ضوابط التسجيل', action: PermissionAction.MANAGE, group: 'شؤون الطلاب', scope: PermissionScope.GLOBAL },
  [Permission.GRADE_CHANGE_APPROVE]: { id: Permission.GRADE_CHANGE_APPROVE, label: 'اعتماد تعديلات الدرجات', action: PermissionAction.APPROVE, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.GPA_RECALCULATE]: { id: Permission.GPA_RECALCULATE, label: 'إعادة احتساب المعدلات التراكمية', action: PermissionAction.MANAGE, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
  [Permission.TRANSCRIPT_PRINT_OFFICIAL]: { id: Permission.TRANSCRIPT_PRINT_OFFICIAL, label: 'طباعة كشوف الدرجات الرسمية', action: PermissionAction.CREATE, group: 'الدرجات والأكاديميا', scope: PermissionScope.GLOBAL },
};

const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: UserRole.SUPER_ADMIN,
    name: 'مسؤول نظام متميز (Super Admin)',
    description: 'التحكم الكامل في النظام، إدارة جميع الأدوار، السياسات الأمنية، والوصول الشامل.',
    isSystem: true,
    permissions: Object.values(Permission),
    category: RoleCategory.ADMINISTRATIVE,
    legalBasis: 'المادة (1): الولاية الشاملة لمسؤول النظام على البنية التحتية والبيانات السيادية.'
  },
  {
    id: UserRole.IT_ADMIN,
    name: 'مسؤول تقني (IT Admin)',
    description: 'إدارة المستخدمين والأدوار، مراقبة السجلات، وإدارة سياسات ABAC.',
    isSystem: true,
    permissions: Object.values(Permission).filter(p => p !== Permission.ROLES_MANAGE), // IT Admin can't manage roles, only Super Admin can
    category: RoleCategory.ADMINISTRATIVE,
    legalBasis: 'المادة (75): حماية البيانات وحفظ السجلات الرقمية في مؤسسات التعليم العالي.'
  },
  {
    id: UserRole.STUDENT,
    name: 'طالب (Student)',
    description: 'الوصول إلى البيانات الشخصية، التسجيل، وعرض النتائج.',
    isSystem: true,
    permissions: [Permission.GRADES_VIEW, Permission.REQUESTS_MANAGE],
    category: RoleCategory.STUDENT,
    legalBasis: 'المادة (10): الحقوق والواجبات الأكاديمية للطالب وضوابط التسجيل والدراسة.'
  },
  {
    id: UserRole.FACULTY,
    name: 'عضو هيئة تدريس (Faculty)',
    description: 'الاطلاع على قوائم الطلاب، الدرجات، وجداول الامتحانات والمحاضرات.',
    isSystem: true,
    permissions: [
      Permission.STUDENTS_VIEW, 
      Permission.GRADES_VIEW, 
      Permission.ACADEMICS_VIEW, 
      Permission.EXAMS_VIEW
    ],
    category: RoleCategory.ACADEMIC,
    legalBasis: 'المادة (25): المهام الأكاديمية لعضو هيئة التدريس ومسؤولية التقييم والاطلاع على سجلات الطلاب.'
  },
  {
    id: UserRole.DEPT_HEAD,
    name: 'رئيس قسم (Department Head)',
    description: 'اعتماد قرارات القسم، متابعة تقارير الأداء، وإدارة شؤون الطلاب في القسم.',
    isSystem: true,
    permissions: [Permission.STUDENTS_VIEW, Permission.GRADES_VIEW, Permission.ACADEMICS_VIEW, Permission.ACADEMICS_MANAGE, Permission.ACADEMICS_APPROVE, Permission.DEPT_MANAGE, Permission.REPORTS_VIEW, Permission.EXAMS_MANAGE, Permission.REQUESTS_MANAGE],
    category: RoleCategory.ACADEMIC,
    legalBasis: 'المادة (18): صلاحيات رئيس القسم في الإشراف الفني والإداري على سير الدراسة والامتحانات، واعتماد النتائج الأولية.'
  },
  {
    id: UserRole.DEAN,
    name: 'عميد الكلية (Dean)',
    description: 'اعتماد قرارات الكلية، متابعة سير العمل، وإدارة السياسات على مستوى الكلية.',
    isSystem: true,
    permissions: [Permission.REPORTS_VIEW, Permission.ORGANIZATION_MANAGE, Permission.FACULTY_MANAGE, Permission.STUDENTS_VIEW, Permission.ACADEMICS_VIEW, Permission.ACADEMICS_APPROVE],
    category: RoleCategory.ACADEMIC,
    legalBasis: 'المادة (12): مسؤوليات عميد الكلية في إدارة الشؤون العلمية والمالية والإدارية للكلية، واعتماد محاضر الأقسام.'
  },
  {
    id: UserRole.REGISTRATION_OFFICER,
    name: 'موظف تسجيل (Registration Officer)',
    description: 'إدارة سجلات الطلاب، القيد، والمناهج والامتحانات بشكل كامل.',
    isSystem: true,
    permissions: [
      Permission.STUDENTS_VIEW, 
      Permission.STUDENTS_EDIT, 
      Permission.STUDENTS_DELETE,
      Permission.STUDENTS_EXPORT,
      Permission.STUDENTS_IMPORT,
      Permission.ACADEMICS_VIEW, 
      Permission.ACADEMICS_MANAGE, 
      Permission.ACADEMICS_APPROVE,
      Permission.ACADEMICS_VIEW, // Already included but for clarity
      Permission.REGISTRATION_MANAGE,
      Permission.GRADES_VIEW,
      Permission.GRADES_EDIT,
      Permission.GRADES_APPROVE,
      Permission.GRADES_EXPORT,
      Permission.REQUESTS_MANAGE, 
      Permission.EXAMS_VIEW,
      Permission.EXAMS_MANAGE,
      Permission.ATTENDANCE_MANAGE
    ],
    category: RoleCategory.ACADEMIC,
    legalBasis: 'المادة (42): مهام مكتب القبول والتسجيل في مراجعة ملفات الطلاب ومنح أرقام القيد.'
  },
  {
    id: UserRole.GRADUATE_OFFICER,
    name: 'موظف دراسات عليا (Graduate Officer)',
    description: 'إدارة برامج الماجستير والدكتوراه والبحث العلمي.',
    isSystem: true,
    permissions: [Permission.STUDENTS_VIEW, Permission.GRADUATE_MANAGE, Permission.ACADEMICS_VIEW, Permission.ACADEMICS_MANAGE, Permission.REQUESTS_MANAGE],
    category: RoleCategory.GRADUATE,
    legalBasis: 'المادة (115): اللائحة المنظمة للدراسات العليا والبحث العلمي وضوابط الإشراف.'
  },
  {
    id: UserRole.EXAMS_OFFICER,
    name: 'شؤون الامتحانات (Exams Officer)',
    description: 'إنشاء مواعيد الامتحانات، ربط اللجان، واعتماد النتائج النهائية.',
    isSystem: true,
    permissions: [Permission.EXAMS_VIEW, Permission.EXAMS_MANAGE, Permission.EXAMS_RESULTS_PUBLISH, Permission.GRADES_VIEW, Permission.STUDENTS_VIEW],
    category: RoleCategory.ACADEMIC,
    legalBasis: 'المادة (80): تشكيل لجان الامتحانات والمراقبة ورصد النتائج النهائية.'
  },
  {
    id: UserRole.APPEALS_COMMITTEE,
    name: 'لجنة التظلمات (Appeals Committee)',
    description: 'مراجعة طلبات التظلم ورفع التوصيات والقرارات.',
    isSystem: true,
    permissions: [Permission.REQUESTS_MANAGE, Permission.GRADES_VIEW],
    category: RoleCategory.SUPPORT,
    legalBasis: 'المادة (88): حق الطالب في التظلم من نتائج الامتحانات وتشكيل لجان المراجعة.'
  },
  {
    id: UserRole.TA_ASSISTANT,
    name: 'معيد / مساعد تدريس (TA)',
    description: 'مساعدة أعضاء هيئة التدريس في المهام الأكاديمية ورصد أعمال السنة.',
    isSystem: true,
    permissions: [Permission.STUDENTS_VIEW, Permission.ATTENDANCE_MANAGE, Permission.LECTURES_MANAGE],
    category: RoleCategory.ACADEMIC,
    legalBasis: 'المادة (30): مهام المعيدين والمساعدين في دعم العملية التعليمية تحت إشراف الأقسام.'
  },
  {
    id: UserRole.FINANCE_OFFICER,
    name: 'موظف مالية (Finance Officer)',
    description: 'إدارة الرسوم، تحصيل المدفوعات، وإصدار التسويات المالية.',
    isSystem: true,
    permissions: [Permission.FINANCE_VIEW, Permission.FINANCE_EDIT, Permission.FINANCE_APPROVE, Permission.REPORTS_VIEW],
    category: RoleCategory.FINANCIAL,
    legalBasis: 'قانون النظام المالي للدولة: ضوابط الجباية والرسوم الدراسية والتبرعات.'
  },
  {
    id: UserRole.HR_OFFICER,
    name: 'موظف HR (HR Officer)',
    description: 'إدارة بيانات الموظفين ومعالجة الطلبات الإدارية.',
    isSystem: true,
    permissions: [Permission.STAFF_MANAGE, Permission.FACULTY_MANAGE, Permission.ORGANIZATION_MANAGE],
    category: RoleCategory.ADMINISTRATIVE,
    legalBasis: 'قانون الخدمة المدنية رقم (12): تنظيم شؤون الموظفين وأعضاء هيئة التدريس.'
  },
  {
    id: UserRole.ACADEMIC_REGISTRAR,
    name: 'سجل أكاديمي (Academic Registrar)',
    description: 'إصدار الوثائق، إدارة السجلات الأكاديمية، والدرجات وحالات الطلاب.',
    isSystem: true,
    permissions: [
      Permission.STUDENTS_VIEW,
      Permission.STUDENTS_EDIT,
      Permission.STUDENTS_DELETE,
      Permission.STUDENTS_EXPORT,
      Permission.STUDENTS_IMPORT,
      Permission.GRADES_VIEW, 
      Permission.GRADES_EDIT,
      Permission.GRADES_APPROVE,
      Permission.GRADES_EXPORT,
      Permission.REPORTS_VIEW, 
      Permission.ACADEMICS_VIEW, 
      Permission.ACADEMICS_MANAGE, 
      Permission.ACADEMICS_APPROVE,
      Permission.EXAMS_VIEW,
      Permission.EXAMS_MANAGE,
      Permission.REGISTRATION_MANAGE
    ],
    category: RoleCategory.ACADEMIC,
    legalBasis: 'المادة (92): أحكام منح الدرجات العلمية وإصدار الوثائق والشهادات المعتمدة.'
  },
  {
    id: UserRole.DATA_STEWARD,
    name: 'منسق بيانات (Data Steward)',
    description: 'مراقبة جودة البيانات وتعديل البيانات المرجعية المعتمدة.',
    isSystem: true,
    permissions: [Permission.ORGANIZATION_MANAGE, Permission.ACADEMICS_MANAGE, Permission.AUDIT_VIEW],
    category: RoleCategory.SUPPORT,
    legalBasis: 'معايير الجودة (مركز ضمان الجودة): دقة وصحة البيانات الأكاديمية والمؤسسية.'
  },
  {
    id: UserRole.VISITOR_EXAMINER,
    name: 'ممتحن زائر (Visitor/Examiner)',
    description: 'صلاحيات محدودة لعرض مواد وطلاب معينين للتقييم الخارجي.',
    isSystem: true,
    permissions: [Permission.GRADES_VIEW, Permission.STUDENTS_VIEW],
    category: RoleCategory.SUPPORT,
    legalBasis: 'المادة (85): ضوابط مشاركة الممتحنين الخارجيين في تقييم الامتحانات والأبحاث.'
  }
];

export const getRoles = (): RoleDefinition[] => {
  const data = localStorage.getItem(STORAGE_KEY_ROLES);
  if (!data) {
    localStorage.setItem(STORAGE_KEY_ROLES, JSON.stringify(DEFAULT_ROLES));
    return DEFAULT_ROLES;
  }
  return JSON.parse(data);
};

export const getRoleById = (id: string): RoleDefinition | undefined => {
  return getRoles().find(r => r.id === id);
};

export const saveRole = (role: RoleDefinition): void => {
  const roles = getRoles();
  const index = roles.findIndex(r => r.id === role.id);
  if (index >= 0) {
    roles[index] = role;
  } else {
    roles.push(role);
  }
  localStorage.setItem(STORAGE_KEY_ROLES, JSON.stringify(roles));
};

export const deleteRole = (id: string): void => {
  const roles = getRoles();
  const role = roles.find(r => r.id === id);
  if (role?.isSystem) return; 
  
  const filtered = roles.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY_ROLES, JSON.stringify(filtered));
};

export const getPermissionLabel = (p: Permission): string => {
  const labels: Record<Permission, string> = {
    [Permission.STUDENTS_VIEW]: 'عرض بيانات الطلاب',
    [Permission.STUDENTS_EDIT]: 'إضافة وتعديل الطلاب',
    [Permission.STUDENTS_DELETE]: 'حذف الطلاب',
    [Permission.GRADES_VIEW]: 'عرض كشف الدرجات',
    [Permission.GRADES_EDIT]: 'رصد وتعديل الدرجات',
    [Permission.ACADEMICS_VIEW]: 'عرض الخطط والمقررات الدراسية',
    [Permission.ACADEMICS_MANAGE]: 'إدارة المقررات الدراسية',
    [Permission.DEPT_MANAGE]: 'إدارة شؤون القسم العلمي',
    [Permission.FINANCE_VIEW]: 'عرض البيانات المالية',
    [Permission.FINANCE_EDIT]: 'إدارة الرسوم والمدفوعات',
    [Permission.FACULTY_MANAGE]: 'إدارة أعضاء هيئة التدريس',
    [Permission.STAFF_MANAGE]: 'إدارة الموظفين والكوادر',
    [Permission.ATTENDANCE_MANAGE]: 'رصد الحضور والغياب',
    [Permission.REQUESTS_MANAGE]: 'إدارة الطلبات والخدمات',
    [Permission.REPORTS_VIEW]: 'عرض التقارير والإحصائيات',
    [Permission.SETTINGS_MANAGE]: 'إعدادات النظام الرئيسية',
    [Permission.ROLES_MANAGE]: 'الأدوار والصلاحيات',
    [Permission.COMMUNICATIONS_MANAGE]: 'المراسلات والتعميمات',
    [Permission.FACILITIES_MANAGE]: 'المنشآت والقاعات التدريسية',
    [Permission.ORGANIZATION_MANAGE]: 'الهيكل الأكاديمي والجامعي',
    [Permission.EXAMS_VIEW]: 'عرض جداول الامتحانات',
    [Permission.EXAMS_MANAGE]: 'إدارة الجداول واللجان الامتحانية',
    [Permission.EXAMS_RESULTS_PUBLISH]: 'اعتماد ونشر النتائج النهائية',
    [Permission.LECTURES_MANAGE]: 'إدارة المحاضرات والحصص',
    [Permission.GRADUATE_MANAGE]: 'شؤون الدراسات العليا والبحث',
    [Permission.AUDIT_VIEW]: 'سجل التدقيق والمتابعة (Audit Log)',
    [Permission.ACADEMICS_APPROVE]: 'اعتماد الخطط والقرارات الأكاديمية',
    [Permission.FINANCE_APPROVE]: 'اعتماد التسويات والخصومات المالية',
    [Permission.REGISTRATION_MANAGE]: 'إدارة تسجيل الطلاب (إداري)',
    [Permission.REGISTRATION_STUDENT]: 'بوابة التسجيل الذاتي للطلاب',
    [Permission.COURSE_MATERIAL_UPLOAD]: 'رفع المواد الدراسية والمناهج',
    [Permission.STUDENTS_EXPORT]: 'تصدير قوائم الطلاب',
    [Permission.STUDENTS_IMPORT]: 'استيراد سجلات الطلاب',
    [Permission.GRADES_APPROVE]: 'اعتماد النتائج النهائية',
    [Permission.GRADES_EXPORT]: 'تصدير كشوف النتائج',
    [Permission.FINANCE_REPORTS]: 'التقارير المالية والتحليلية',
    [Permission.AUDIT_EXPORT]: 'تصدير سجل التدقيق',
    [Permission.SYSTEM_LOGS_VIEW]: 'سجلات النظام التقنية',
    [Permission.ENROLLMENT_OVERRIDE]: 'تجاوز قيود التسجيل',
    [Permission.GRADE_CHANGE_APPROVE]: 'اعتماد مراجعة الدرجات',
    [Permission.GPA_RECALCULATE]: 'إعادة حساب المعدل',
    [Permission.TRANSCRIPT_PRINT_OFFICIAL]: 'طباعة الشهادات الرسمية'
  };
  return labels[p] || p;
};
