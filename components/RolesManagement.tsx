
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getRoles, saveRole, deleteRole, getPermissionLabel, PERMISSION_METADATA } from '../services/rbacService';
import { Permission, RoleDefinition, UserRole, RoleCategory, PermissionAction, PermissionScope } from '../types';
import { 
  Shield, Plus, Trash2, Edit2, CheckCircle, Info, Save, X, 
  Settings, Search, History, Filter, LayoutGrid, List,
  Lock, Globe, Building2, User, Scale, Copy, Users, Eye
} from 'lucide-react';
import { notifySuccess, notifyError, notifyInfo } from '../services/notificationService';
import { logAction } from '../services/auditService';
import { cn } from '../lib/utils';
import { getRoleCategoryLabel, getRoleCategoryColor, getScopeIcon, getScopeLabel } from '../services/rbacUtils';
import Modal from './ui/Modal';

import { Language } from '../services/i18nService';
import { switchRole, getCurrentUser } from '../services/authService';

interface RolesManagementProps {
    language?: Language;
}

const ENGLISH_PERMISSION_LABELS: Record<Permission, string> = {
  [Permission.STUDENTS_VIEW]: 'View Student Data',
  [Permission.STUDENTS_EDIT]: 'Add/Edit Students',
  [Permission.STUDENTS_DELETE]: 'Delete Students',
  [Permission.GRADES_VIEW]: 'View Transcripts & Grades',
  [Permission.GRADES_EDIT]: 'Record/Edit Course Grades',
  [Permission.ACADEMICS_VIEW]: 'View Curriculums & Courses',
  [Permission.ACADEMICS_MANAGE]: 'Manage Courses & Programs',
  [Permission.DEPT_MANAGE]: 'Manage Academic Departments',
  [Permission.FINANCE_VIEW]: 'View Financial Ledgers',
  [Permission.FINANCE_EDIT]: 'Manage Fees & Financials',
  [Permission.FACULTY_MANAGE]: 'Manage Faculty Members',
  [Permission.STAFF_MANAGE]: 'Manage Staff Members',
  [Permission.ATTENDANCE_MANAGE]: 'Record/Monitor Attendance',
  [Permission.REQUESTS_MANAGE]: 'Manage Service Requests',
  [Permission.REPORTS_VIEW]: 'View Statistics & Reports',
  [Permission.SETTINGS_MANAGE]: 'Manage Primary Settings',
  [Permission.ROLES_MANAGE]: 'Manage Roles & Permissions',
  [Permission.COMMUNICATIONS_MANAGE]: 'Manage Center Messaging',
  [Permission.FACILITIES_MANAGE]: 'Manage Campus Structures',
  [Permission.ORGANIZATION_MANAGE]: 'Manage Academic Hierarchy',
  [Permission.EXAMS_VIEW]: 'View Exam Schedules',
  [Permission.EXAMS_MANAGE]: 'Manage Exams & Committees',
  [Permission.EXAMS_RESULTS_PUBLISH]: 'Approve & Release Final Results',
  [Permission.LECTURES_MANAGE]: 'Manage Teaching Sessions',
  [Permission.GRADUATE_MANAGE]: 'Manage Graduate Admissions',
  [Permission.AUDIT_VIEW]: 'View Forensic Audit Trail',
  [Permission.ACADEMICS_APPROVE]: 'Approve Curriculum Changes',
  [Permission.FINANCE_APPROVE]: 'Approve Fee Adjustments',
  [Permission.REGISTRATION_MANAGE]: 'Administrative Registration',
  [Permission.REGISTRATION_STUDENT]: 'Student Self-Service Portal',
  [Permission.COURSE_MATERIAL_UPLOAD]: 'Upload Course Curriculum Specs',
  [Permission.STUDENTS_EXPORT]: 'Export Student Rosters',
  [Permission.STUDENTS_IMPORT]: 'Import Student Records',
  [Permission.GRADES_APPROVE]: 'Approve Final Results Release',
  [Permission.GRADES_EXPORT]: 'Export Grade Sheets',
  [Permission.FINANCE_REPORTS]: 'Detailed Fiscal Analysis Reports',
  [Permission.AUDIT_EXPORT]: 'Export Systems Security Logs',
  [Permission.SYSTEM_LOGS_VIEW]: 'View Low-level Technical System Logs',
  [Permission.ENROLLMENT_OVERRIDE]: 'Override Registration Restrictions',
  [Permission.GRADE_CHANGE_APPROVE]: 'Approve Grade Corrections',
  [Permission.GPA_RECALCULATE]: 'Recalculate GPAs',
  [Permission.TRANSCRIPT_PRINT_OFFICIAL]: 'Print Sealed Official Transcripts'
};

const RolesManagement: React.FC<RolesManagementProps> = ({ language = 'ar' }) => {
  const user = getCurrentUser();
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleDefinition>({
    id: '',
    name: '',
    description: '',
    permissions: [],
    category: RoleCategory.ADMINISTRATIVE
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [permSearchTerm, setPermSearchTerm] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [filterAction, setFilterAction] = useState<PermissionAction | 'ALL'>('ALL');
  const [filterScope, setFilterScope] = useState<PermissionScope | 'ALL'>('ALL');
  const [activeCategory, setActiveCategory] = useState<RoleCategory | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'details' | 'permissions' | 'audit'>('details');

  const t = {
    title: language === 'ar' ? 'إدارة الأدوار والصلاحيات' : 'Roles & Access Permissions',
    subtitle: language === 'ar' ? 'هيكلة الوصول والتحكم القائم على السياسات الأكاديمية' : 'Structure access control and governance based on university policies',
    searchPlaceholder: language === 'ar' ? 'البحث في الأدوار والمسميات...' : 'Search roles and job titles...',
    createButton: language === 'ar' ? 'إنشاء مسمى جديد' : 'Create New Role Name',
    allRoles: language === 'ar' ? 'جميع الأدوار' : 'All Roles',
    systemRoles: language === 'ar' ? 'أدوار النظام الأساسية' : 'System Default Roles',
    customRoles: language === 'ar' ? 'الأدوار المخصصة' : 'Custom Built Roles',
    permissionsCount: language === 'ar' ? 'صلاحية' : 'permissions',
    riskProtectionLevel: language === 'ar' ? 'مستوى الحماية: ' : 'Security Shield Level: ',
    simulateTooltip: language === 'ar' ? 'محاكاة هذا الدور' : 'Simulate This Role',
    duplicateTooltip: language === 'ar' ? 'نسخ الدور' : 'Duplicate Role Template',
    editTooltip: language === 'ar' ? 'تعديل' : 'Edit',
    deleteTooltip: language === 'ar' ? 'حذف' : 'Delete',
    tableTitle: language === 'ar' ? 'المسمى الوظيفي' : 'Job Title Name',
    tableCategory: language === 'ar' ? 'التصنيف' : 'Administrative Category',
    tableSecurity: language === 'ar' ? 'أمن المعلومات' : 'Risk Assessment Rating',
    tableCount: language === 'ar' ? 'عدد الصلاحيات' : 'Capabilities Count',
    tableActions: language === 'ar' ? 'الإجراءات' : 'Sovereign Actions',
    modalEditTitle: language === 'ar' ? 'تعديل سياسة الوصول' : 'Modify Access Policy Configuration',
    modalCreateTitle: language === 'ar' ? 'مسمى وظيفي جديد' : 'New Role Configuration Instance',
    modalTotalPermissions: language === 'ar' ? 'إجمالي الصلاحيات' : 'Total Permissions Allowed',
    modalProtectionLevel: language === 'ar' ? 'مستوى الحماية' : 'Security Isolation Level',
    systemProtected: language === 'ar' ? 'نظام محمي' : 'Core Sovereign Shield',
    fullCustom: language === 'ar' ? 'تخصيص كامل' : 'Configurable Client Custom',
    cancel: language === 'ar' ? 'تراجع' : 'Cancel / Revert',
    savePolicy: language === 'ar' ? 'حفظ السياسة' : 'Apply & Save Policy',
    tabDetails: language === 'ar' ? 'البيانات الأساسية' : 'Primary Details',
    tabPermissions: language === 'ar' ? 'مصفوفة الصلاحيات' : 'Capabilities Matrix',
    tabAudit: language === 'ar' ? 'التدقيق الأمني' : 'Forensic Audit',
    categoryLabel: language === 'ar' ? 'تصنيف الدور الوظيفي' : 'Administrative Area Classification',
    guideTitle: language === 'ar' ? 'إرشادات التخصيص' : 'Compliance Alignment Guidance',
    guideDesc: language === 'ar' ? 'يُنصح بمطابقة المسمى الوظيفي مع هيكلية الجامعة المعتمدة لضمان التوافق مع التقارير الإحصائية السنوية الموجهة للوزارة.' : 'It is advised to align customized roles with the approved institutional hierarchy for seamless structural correspondence.',
    roleNameAr: language === 'ar' ? 'المسمى الوظيفي (اللغة العربية)' : 'Job Title',
    roleNamePlaceholder: language === 'ar' ? 'مثال: مسجل شؤون الطلاب' : 'Example: Admissions registrar officer',
    roleKey: language === 'ar' ? 'معرف الربط (Role Key)' : 'Sovereign Role Key',
    roleKeyPlaceholder: language === 'ar' ? 'سيتم التوليد للمخصص' : 'Generated automatically for custom',
    roleDesc: language === 'ar' ? 'وصف الصلاحيات وموجبات الوصول' : 'Role Access Scope & Purpose Statement',
    roleDescPlaceholder: language === 'ar' ? 'صف بدقة نطاق العمل الأكاديمي أو الإداري لهذا الدور...' : 'Provide a detailed explanation of the administrative scope...',
    legalBasisLabel: language === 'ar' ? 'السند القانوني لإنشاء الدور (Regulation 501)' : 'Statutory Decree Legal Basis Reference',
    legalBasisPlaceholder: language === 'ar' ? 'مثال: المادة (34) - اللائحة العامة للتعليم العالي' : 'Example: Article (34) of Executive Regulations',
    quickTemplates: language === 'ar' ? 'قوالب سريعة:' : 'Quick Templates:',
    templateReadOnly: language === 'ar' ? 'عرض فقط' : 'Read Only Specs',
    templateAcademic: language === 'ar' ? 'الطاقم الأكاديمي' : 'Faculty Scholars',
    templateTechnical: language === 'ar' ? 'إداري تقني' : 'Operations Officers',
    selectedOnly: language === 'ar' ? 'المحددة فقط' : 'Selected Matrix Actions Only',
    searchPermPlaceholder: language === 'ar' ? 'بحث في مصفوفة الصلاحيات الرقمية...' : 'Search capabilities & permission names...',
    selectAll: language === 'ar' ? 'تحديد الكل' : 'Grant All Group',
    deselectAll: language === 'ar' ? 'إلغاء تحديد الكل' : 'Revoke All Group',
    totalGroupPerms: language === 'ar' ? 'إجمالي' : 'Total group',
    riskImpactTitle: language === 'ar' ? 'تأثير الوصول للبيانات السيادية' : 'Sovereign Data Security Risk Metrics',
    recentChangesTitle: language === 'ar' ? 'سجل التعديلات الأخير' : 'Active Session Audit Trace',
    noAuditLogs: language === 'ar' ? 'لا توجد سجلات تعديل لهذا الدور في الجلسة الحالية' : 'No governance modification trails detected in the active window.',
    totalPolicies: language === 'ar' ? 'إجمالي السياسات' : 'Total Defined Policies',
    protectedRoles: language === 'ar' ? 'الأدوار المحمية' : 'Active System Shields',
    footerStatus: language === 'ar' ? 'نظام RBAC مفعّل وقابل للتوسع وفق اللوائح' : 'Sovereign RBAC operational, compliant, and scalable under decree',
    more: language === 'ar' ? 'أخرى' : 'more',
    capabilitiesDesc: language === 'ar' ? 'تفصيل تفويض الإجراءات والنطاق الخاص بحماية البيانات السيادية الأكاديمية' : 'Fine-grained action and scope delegation protecting academic registers',
    selectedOnlyBtn: language === 'ar' ? 'المحددة فقط' : 'Selected Only',
    permissionSearchPlaceholder: language === 'ar' ? 'البحث في الصلاحيات المعروضة...' : 'Search capabilities & actions...',
    allActions: language === 'ar' ? 'جميع الإجراءات' : 'All Actions',
    allScopes: language === 'ar' ? 'جميع النطاقات' : 'All Scopes',
    totalLabel: language === 'ar' ? 'إجمالي' : 'Total of',
    permissionsLabel: language === 'ar' ? 'صلاحية مفعّلة' : 'permissions granted'
  };

  const getLocalizedPermissionLabel = (p: Permission) => {
    if (language === 'ar') {
      return getPermissionLabel(p);
    }
    return ENGLISH_PERMISSION_LABELS[p] || p;
  };

  const getLocalizedCategoryLabel = (cat: RoleCategory) => {
    if (language === 'ar') {
      return getRoleCategoryLabel(cat);
    }
    const engLabels: Record<RoleCategory, string> = {
      [RoleCategory.ADMINISTRATIVE]: 'Administrative',
      [RoleCategory.ACADEMIC]: 'Academic',
      [RoleCategory.FINANCIAL]: 'Financial',
      [RoleCategory.STUDENT]: 'Student',
      [RoleCategory.GRADUATE]: 'Graduate Studies',
      [RoleCategory.SUPPORT]: 'Technical Support'
    };
    return engLabels[cat] || cat;
  };

  const getLocalizedScopeLabel = (scope?: PermissionScope) => {
    if (!scope) return language === 'ar' ? 'غير محدد' : 'Not Defined';
    if (language === 'ar') {
      return getScopeLabel(scope);
    }
    const engLabels: Record<PermissionScope, string> = {
      [PermissionScope.GLOBAL]: 'University-Wide',
      [PermissionScope.DEPARTMENT]: 'Department-Only',
      [PermissionScope.OWN]: 'Self-Authenticated'
    };
    return engLabels[scope] || scope;
  };

  const getLocalizedGroupName = (gName: string) => {
    if (language === 'ar') return gName;
    const EngGroups: Record<string, string> = {
      'شؤون الطلاب': 'Student Affairs',
      'الدرجات والأكاديميا': 'Academic & Grades',
      'بوابة القسم': 'Departmental Gateway',
      'المالية': 'Financials / Treasury',
      'الموارد البشرية': 'Human Resources (HR)',
      'الخدمات والطلبات': 'Services & Requests',
      'النظام والتقارير': 'System Controls & Compliance',
      'الدراسات العليا': 'Graduate Studies'
    };
    return EngGroups[gName] || gName;
  };

  useEffect(() => {
    setRoles(getRoles());
  }, []);

  const calculateRisk = (role: RoleDefinition) => {
    const critical = [Permission.STUDENTS_DELETE, Permission.SETTINGS_MANAGE, Permission.ROLES_MANAGE, Permission.FINANCE_APPROVE, Permission.AUDIT_VIEW];
    const score = role.permissions.filter(p => critical.includes(p)).length;
    if (score >= 3) return { 
      label: language === 'ar' ? 'حرِج جداً' : 'Highly Critical', 
      color: 'text-rose-600 bg-rose-50', 
      icon: Shield 
    };
    if (score >= 1) return { 
      label: language === 'ar' ? 'مرتفع' : 'High Risk', 
      color: 'text-amber-600 bg-amber-50', 
      icon: Shield 
    };
    return { 
      label: language === 'ar' ? 'اعتيادي' : 'Standard / Normal', 
      color: 'text-emerald-600 bg-emerald-50', 
      icon: CheckCircle 
    };
  };

  const handleApplyTemplate = (template: 'READ' | 'ADMIN' | 'ACADEMIC') => {
    let perms: Permission[] = [];
    if (template === 'READ') {
      perms = Object.values(Permission).filter(p => p.includes('VIEW'));
    } else if (template === 'ADMIN') {
      perms = [Permission.SETTINGS_MANAGE, Permission.ROLES_MANAGE, Permission.AUDIT_VIEW, Permission.ORGANIZATION_MANAGE];
    } else if (template === 'ACADEMIC') {
      perms = [Permission.GRADES_VIEW, Permission.GRADES_EDIT, Permission.ACADEMICS_MANAGE, Permission.ATTENDANCE_MANAGE];
    }
    setCurrentRole(prev => ({ ...prev, permissions: perms }));
    notifyInfo('تم تطبيق القالب بنجاح');
  };

  const handleTogglePermission = (p: Permission) => {
    setCurrentRole(prev => {
      const exists = prev.permissions.includes(p);
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter(perm => perm !== p) };
      } else {
        return { ...prev, permissions: [...prev.permissions, p] };
      }
    });
  };

  const handleDuplicate = (role: RoleDefinition) => {
    const duplicatedRole: RoleDefinition = {
      ...role,
      id: '',
      name: `${role.name} (نسخة)`,
      isSystem: false
    };
    setCurrentRole(duplicatedRole);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRole.name) return;

    // Prevent overriding system IDs if editing a system role (though UI should prevent it)
    const roleToSave = {
      ...currentRole,
      id: currentRole.id || `custom_${Date.now()}`
    };

    if (currentRole.id && roles.find(r => r.id === currentRole.id)?.isSystem) {
      // Only allow updating permissions/description for system roles if we really want to
      // But typically we should protect system roles entirely or allow subtle changes.
      // The user asked for "Super Admins to ... edit ... roles" but "Ensure system roles ... are protected from deletion"
      // Usually "edit" applies to custom roles mostly, but Super Admin might need to tweak system roles too.
      // For now, let's allow editing but protect name/id.
    }

    saveRole(roleToSave);
    setRoles(getRoles());
    notifySuccess(isEditMode ? 'تم تحديث الدور بنجاح' : 'تم إنشاء الدور الجديد');
    logAction('إدارة الصلاحيات', `تم ${isEditMode ? 'تحديث' : 'إنشاء'} الدور: ${roleToSave.name}`, 'warning');
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const role = roles.find(r => r.id === id);
    if (role?.isSystem) {
        notifyError('لا يمكن حذف أدوار النظام الأساسية');
        return;
    }
    if (confirm('هل أنت متأكد من حذف هذا الدور؟ قد يؤثر ذلك على المستخدمين المرتبطين به.')) {
      deleteRole(id);
      setRoles(getRoles());
      notifyInfo('تم حذف الدور');
    }
  };

  // Group permissions using metadata
  const groupedPermissions: Record<string, Permission[]> = {};
  Object.values(Permission).forEach(p => {
    const group = PERMISSION_METADATA[p]?.group || 'أخرى';
    if (!groupedPermissions[group]) groupedPermissions[group] = [];
    groupedPermissions[group].push(p);
  });

  const filteredRoles = roles.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.description.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesCategory = activeCategory === 'ALL' || r.category === activeCategory;
    
    if (activeCategory === ('SYSTEM' as any)) matchesCategory = !!r.isSystem;
    if (activeCategory === ('CUSTOM' as any)) matchesCategory = !r.isSystem;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
             <Shield size={32} />
           </div>
           <div>
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.title}</h2>
             <p className="text-slate-400 text-sm font-medium mt-1">{t.subtitle}</p>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 md:w-64 min-w-[200px]">
             <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", language === 'ar' ? "right-4" : "left-4")} size={18} />
             <input 
               type="text" 
               placeholder={t.searchPlaceholder}
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className={cn("w-full py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20", language === 'ar' ? "pr-12 pl-4" : "pl-12 pr-4")}
             />
          </div>
          <button 
            onClick={() => {
              setIsEditMode(false);
              setCurrentRole({ id: '', name: '', description: '', permissions: [], category: RoleCategory.ADMINISTRATIVE });
              setActiveTab('details');
              setIsModalOpen(true);
            }}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-blue-600 shadow-lg shadow-slate-100 transition-all active:scale-95 text-sm font-black"
          >
            <Plus size={20} />
            {t.createButton}
          </button>
        </div>
      </div>

      {/* Categories & View Options */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-1 bg-slate-100/50 p-1 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar" dir={language === 'ar' ? 'rtl' : 'ltr'}>
           <button 
            onClick={() => setActiveCategory('ALL')}
            className={cn(
               "px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap",
               activeCategory === 'ALL' ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            )}
           >
              {t.allRoles}
           </button>
           <button 
            onClick={() => setActiveCategory('SYSTEM' as any)}
            className={cn(
               "px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2",
               activeCategory === ('SYSTEM' as any) ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            )}
           >
              <Lock size={12} />
              {t.systemRoles}
           </button>
           <button 
            onClick={() => setActiveCategory('CUSTOM' as any)}
            className={cn(
               "px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2",
               activeCategory === ('CUSTOM' as any) ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            )}
           >
              <Plus size={12} />
              {t.customRoles}
           </button>
           <div className="w-px h-6 bg-slate-200 self-center mx-2" />
           {Object.values(RoleCategory).map(cat => (
             <button 
               key={cat}
               onClick={() => setActiveCategory(cat)}
               className={cn(
                 "px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2",
                 activeCategory === cat ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
               )}
             >
                <div className={cn("w-1.5 h-1.5 rounded-full", getRoleCategoryColor(cat))} />
                {getLocalizedCategoryLabel(cat)}
             </button>
           ))}
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-100">
           <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-slate-100 text-blue-600" : "text-slate-400 hover:text-slate-600")}>
             <LayoutGrid size={18} />
           </button>
           <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-slate-100 text-blue-600" : "text-slate-400 hover:text-slate-600")}>
             <List size={18} />
           </button>
        </div>
      </div>

      {/* Roles Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredRoles.map(role => {
              const risk = calculateRisk(role);
              const RiskIcon = risk.icon;
              return (
              <motion.div 
                layout
                key={role.id} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-slate-100 transition-all flex flex-col group/card relative"
              >
                {role.isSystem && (
                  <div className={cn("absolute top-4", language === 'ar' ? "left-4" : "right-4")}>
                     <div className="bg-slate-800 text-white p-1.5 rounded-lg shadow-sm" title={t.systemProtected}>
                        <Lock size={12} />
                     </div>
                  </div>
                )}
                
                <div className="p-8 flex-1">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2", 
                      role.isSystem ? 'bg-slate-50 border-slate-100 text-slate-800' : 'bg-blue-50 border-blue-100 text-blue-600'
                    )}>
                      <Shield size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-slate-800 tracking-tight leading-tight">
                        {role.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getLocalizedCategoryLabel(role.category)}</span>
                        <div className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{role.permissions.length} {t.permissionsCount}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 font-medium leading-relaxed mb-4 h-12 line-clamp-2">{role.description}</p>

                  {role.legalBasis && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 mb-6 group/legal">
                       <Scale size={14} className="text-amber-600 mt-0.5 shrink-0" />
                       <p className="text-[10px] text-amber-700 font-bold leading-tight line-clamp-2 transition-all group-hover/legal:line-clamp-none">
                         {role.legalBasis}
                       </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                       {role.permissions.slice(0, 4).map(p => (
                        <div key={p} className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1 rounded-xl text-[10px] font-bold border border-slate-100">
                          {getLocalizedPermissionLabel(p)}
                        </div>
                      ))}
                      {role.permissions.length > 4 && (
                        <div className="bg-slate-100 text-slate-400 px-3 py-1 rounded-xl text-[10px] font-black">
                          +{role.permissions.length - 4} {t.more}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
                    risk.color
                  )}>
                    <RiskIcon size={10} />
                    {t.riskProtectionLevel} {risk.label}
                  </div>
                  <div className="flex gap-1">
                    {(user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.IT_ADMIN) && (
                      <button 
                        onClick={() => {
                          switchRole(role.id);
                          notifyInfo(language === 'ar' ? `جاري محاكاة دور: ${role.name}` : `Simulating role: ${role.name}`);
                        }}
                        className={cn(
                          "p-2.5 rounded-xl transition-all",
                          (user?.effectiveRole || user?.role) === role.id 
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                            : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        )}
                        title={t.simulateTooltip}
                      >
                        <Eye size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDuplicate(role)}
                      className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title={t.duplicateTooltip}
                    >
                      <Copy size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        setCurrentRole(role);
                        setIsEditMode(true);
                        setActiveTab('details');
                        setIsModalOpen(true);
                      }}
                      className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title={t.editTooltip}
                    >
                      <Edit2 size={18} />
                    </button>
                    {!role.isSystem && (
                      <button 
                        onClick={() => handleDelete(role.id)}
                        className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title={t.deleteTooltip}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )})}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className={cn("w-full", language === 'ar' ? "text-right" : "text-left")}>
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t.tableTitle}</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t.tableCategory}</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">{t.tableSecurity}</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t.tableCount}</th>
                <th className={cn("px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest", language === 'ar' ? "text-left" : "text-right")}>{t.tableActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRoles.map(role => {
                const risk = calculateRisk(role);
                return (
                <tr key={role.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black", 
                        role.isSystem ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'
                      )}>
                        {role.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{role.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{role.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight")}>
                       {getLocalizedCategoryLabel(role.category)}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", risk.color)}>
                        {risk.label}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-mono font-bold text-slate-600">{role.permissions.length}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className={cn("flex gap-2", language === 'ar' ? "justify-end" : "justify-end")}>
                       {(user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.IT_ADMIN) && (
                         <button 
                            onClick={() => {
                              switchRole(role.id);
                              notifyInfo(language === 'ar' ? `جاري محاكاة دور: ${role.name}` : `Simulating role: ${role.name}`);
                            }} 
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                (user?.effectiveRole || user?.role) === role.id ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            )}
                            title={t.simulateTooltip}
                         >
                            <Eye size={16} />
                         </button>
                       )}
                       <button onClick={() => handleDuplicate(role)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title={t.duplicateTooltip}><Copy size={16} /></button>
                       <button onClick={() => { setCurrentRole(role); setIsEditMode(true); setActiveTab('details'); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title={t.editTooltip}><Edit2 size={16} /></button>
                       {!role.isSystem && <button onClick={() => handleDelete(role.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title={t.deleteTooltip}><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {/* Enhanced Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? t.modalEditTitle : t.modalCreateTitle}
        description="RBAC Policy Configuration & Legal Foundation"
        icon={Shield}
        maxWidth="6xl"
        footer={
            <div className="flex items-center justify-between w-full">
               <div className="hidden sm:flex items-center gap-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                        <Shield size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t.modalTotalPermissions}</p>
                        <p className="text-xl font-black text-blue-600 leading-none">{currentRole.permissions.length}</p>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-slate-200" />
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-slate-100">
                        <Lock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t.modalProtectionLevel}</p>
                        <p className="text-sm font-black text-slate-700 leading-none">{currentRole.isSystem ? t.systemProtected : t.fullCustom}</p>
                    </div>
                  </div>
               </div>
               <div className="flex gap-4 w-full sm:w-auto">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 sm:flex-none px-8 py-4 text-slate-500 font-black hover:bg-slate-50 rounded-[1.5rem] transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit"
                    form="role-form"
                    className="flex-3 sm:flex-none px-12 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black hover:bg-blue-600 shadow-xl shadow-slate-200 flex items-center justify-center gap-3 transition-all active:scale-95"
                  >
                    <Save size={20} />
                    {t.savePolicy}
                  </button>
               </div>
            </div>
        }
      >
        <div className="flex gap-1 mb-8 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
            {[
                { id: 'details', label: t.tabDetails, icon: User },
                { id: 'permissions', label: t.tabPermissions, icon: Shield },
                { id: 'audit', label: t.tabAudit, icon: History }
            ].map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                        activeTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <tab.icon size={14} />
                    {tab.label}
                </button>
            ))}
        </div>

        <form id="role-form" onSubmit={handleSave} className="space-y-12">
            {activeTab === 'details' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-4">
                            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.categoryLabel}</label>
                                    <select 
                                    disabled={currentRole.isSystem}
                                    value={currentRole.category}
                                    onChange={e => setCurrentRole({...currentRole, category: e.target.value as RoleCategory})}
                                    className={cn(
                                        "w-full border border-slate-200 rounded-3xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none appearance-none",
                                        currentRole.isSystem ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
                                    )}
                                    >
                                    {Object.values(RoleCategory).map(cat => (
                                        <option key={cat} value={cat}>{getLocalizedCategoryLabel(cat)}</option>
                                    ))}
                                    </select>
                                </div>

                                <div className="p-6 bg-blue-50/50 rounded-[2rem] space-y-3 border border-blue-100">
                                    <div className="flex items-center gap-2 text-blue-600">
                                        <Info size={16} />
                                        <span className="text-[11px] font-black uppercase tracking-widest italic">{t.guideTitle}</span>
                                    </div>
                                    <p className="text-[10px] text-blue-800 font-bold leading-relaxed">
                                        {t.guideDesc}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.roleNameAr}</label>
                                <input 
                                    required
                                    readOnly={currentRole.isSystem}
                                    type="text"
                                    className={cn(
                                    "w-full border border-slate-100 rounded-3xl px-6 py-4 text-sm font-bold outline-none transition-all",
                                    currentRole.isSystem ? "bg-slate-100 text-slate-500 cursor-default" : "bg-white border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                                    )}
                                    placeholder={t.roleNamePlaceholder}
                                    value={currentRole.name}
                                    onChange={e => setCurrentRole({...currentRole, name: e.target.value})}
                                />
                                </div>
                                <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.roleKey}</label>
                                <input 
                                    readOnly
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-4 text-sm font-bold font-mono text-slate-400 outline-none cursor-not-allowed"
                                    value={currentRole.id || t.roleKeyPlaceholder}
                                />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.roleDesc}</label>
                                <textarea 
                                readOnly={currentRole.isSystem}
                                rows={4}
                                className={cn(
                                    "w-full border border-slate-100 rounded-[2rem] px-6 py-5 text-sm font-bold outline-none transition-all resize-none shadow-inner bg-slate-50",
                                    currentRole.isSystem ? "bg-slate-100 text-slate-500 cursor-default" : "focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                                )}
                                placeholder={t.roleDescPlaceholder}
                                value={currentRole.description}
                                onChange={e => setCurrentRole({...currentRole, description: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.legalBasisLabel}</label>
                                <div className="relative">
                                    <Scale className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", language === 'ar' ? "right-6" : "left-6")} size={18} />
                                    <input 
                                        readOnly={currentRole.isSystem}
                                        type="text"
                                        className={cn(
                                        "w-full border border-slate-100 rounded-3xl py-4 text-sm font-bold outline-none transition-all",
                                        currentRole.isSystem ? "bg-slate-100 text-slate-500 cursor-default" : "bg-white border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500",
                                        language === 'ar' ? "pr-14 pl-6" : "pl-14 pr-6"
                                        )}
                                        placeholder={t.legalBasisPlaceholder}
                                        value={currentRole.legalBasis || ''}
                                        onChange={e => setCurrentRole({...currentRole, legalBasis: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'permissions' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                    {/* Quick Selection Toolbar */}
                    <div className="flex flex-wrap items-center gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic px-2">{t.quickTemplates}</span>
                         <button type="button" onClick={() => handleApplyTemplate('READ')} className="px-5 py-2 bg-white text-slate-600 text-[10px] font-black rounded-xl border border-slate-200 hover:bg-blue-50 hover:text-blue-600 transition-all uppercase tracking-widest shadow-sm">{t.templateReadOnly}</button>
                         <button type="button" onClick={() => handleApplyTemplate('ACADEMIC')} className="px-5 py-2 bg-white text-slate-600 text-[10px] font-black rounded-xl border border-slate-200 hover:bg-blue-50 hover:text-blue-600 transition-all uppercase tracking-widest shadow-sm">{t.templateAcademic}</button>
                         <button type="button" onClick={() => handleApplyTemplate('ADMIN')} className="px-5 py-2 bg-white text-slate-600 text-[10px] font-black rounded-xl border border-slate-200 hover:bg-blue-50 hover:text-blue-600 transition-all uppercase tracking-widest shadow-sm">{t.templateTechnical}</button>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-100 pb-10">
                        <div>
                            <h4 className="text-2xl font-black text-slate-800 tracking-tighter italic uppercase">{language === 'ar' ? 'مصفوفة القدرات الرقمية' : 'Capabilities Matrix'}</h4>
                            <p className="text-sm text-slate-400 font-medium mt-1">{t.capabilitiesDesc}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <button 
                                type="button"
                                onClick={() => setShowSelectedOnly(!showSelectedOnly)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2",
                                    showSelectedOnly 
                                        ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200" 
                                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                )}
                             >
                                <CheckCircle size={14} />
                                {t.selectedOnlyBtn}
                            </button>
                            <div className="relative w-full md:w-[350px]">
                                <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", language === 'ar' ? "right-4" : "left-4")} size={20} />
                                <input 
                                  type="text" 
                                  placeholder={t.permissionSearchPlaceholder}
                                  value={permSearchTerm}
                                  onChange={(e) => setPermSearchTerm(e.target.value)}
                                  className={cn(
                                    "w-full py-4 bg-slate-50 border-none rounded-[1.5rem] text-sm font-bold focus:ring-4 focus:ring-blue-500/10",
                                    language === 'ar' ? "pr-14 pl-6" : "pl-14 pr-6"
                                  )}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Advanced Filters */}
                    <div className="flex flex-wrap gap-2 animate-in fade-in duration-700">
                        <select 
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value as any)}
                            className="bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="ALL">{t.allActions}</option>
                            {Object.values(PermissionAction).map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                        <select 
                            value={filterScope}
                            onChange={(e) => setFilterScope(e.target.value as any)}
                            className="bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="ALL">{t.allScopes}</option>
                            {Object.values(PermissionScope).map(scope => (
                                <option key={scope} value={scope}>{getLocalizedScopeLabel(scope)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 gap-16">
                        {Object.keys(groupedPermissions).map(groupName => {
                            const permsInGroup = groupedPermissions[groupName].filter(p => {
                                const meta = PERMISSION_METADATA[p];
                                const label = getLocalizedPermissionLabel(p);
                                const matchesSearch = label.toLowerCase().includes(permSearchTerm.toLowerCase()) || p.toLowerCase().includes(permSearchTerm.toLowerCase());
                                const matchesSelected = !showSelectedOnly || currentRole.permissions.includes(p);
                                const matchesAction = filterAction === 'ALL' || meta?.action === filterAction;
                                const matchesScope = filterScope === 'ALL' || meta?.scope === filterScope;
                                
                                return matchesSearch && matchesSelected && matchesAction && matchesScope;
                            });
                            if (permsInGroup.length === 0) return null;

                            const allGroupSelected = permsInGroup.every(p => currentRole.permissions.includes(p));

                            return (
                            <div key={groupName} className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <h5 className="flex items-center gap-4 text-base font-black text-slate-800 uppercase tracking-tighter italic">
                                            <div className="w-3 h-3 bg-blue-600 rounded-full shadow-lg shadow-blue-200" />
                                            {getLocalizedGroupName(groupName)}
                                        </h5>
                                        <p className="text-[10px] text-slate-400 font-bold mr-7">{t.totalLabel}: {permsInGroup.length} {t.permissionsLabel}</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if (allGroupSelected) {
                                              setCurrentRole(prev => ({
                                                  ...prev,
                                                  permissions: prev.permissions.filter(p => !permsInGroup.includes(p))
                                              }));
                                            } else {
                                              setCurrentRole(prev => ({
                                                  ...prev,
                                                  permissions: Array.from(new Set([...prev.permissions, ...permsInGroup]))
                                              }));
                                            }
                                        }}
                                        className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest shadow-sm"
                                    >
                                        {allGroupSelected ? t.deselectAll : t.selectAll}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {permsInGroup.map(p => {
                                      const isSelected = currentRole.permissions.includes(p);
                                      const meta = PERMISSION_METADATA[p];
                                      return (
                                          <div 
                                            key={p}
                                            onClick={(e) => {
                                                // Prevent triggering twice if clicking specifically on the checkbox
                                                handleTogglePermission(p);
                                            }}
                                            className={cn(
                                                "p-6 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between group h-full relative overflow-hidden",
                                                isSelected ? "bg-white border-blue-600 shadow-xl shadow-blue-100/50 -translate-y-1" : "bg-slate-50/50 border-transparent hover:border-slate-200 hover:bg-white"
                                            )}
                                          >
                                              {isSelected && (
                                                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600 opacity-[0.03] translate-x-12 -translate-y-12 rounded-full" />
                                              )}
                                              <div className="flex justify-between items-start mb-4 relative z-10">
                                                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all", 
                                                      isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-300" : "bg-slate-200/50 text-slate-400"
                                                  )}>
                                                      {isSelected ? <Shield size={18} className="animate-pulse" /> : <Shield size={18} />}
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                      <div className={cn(
                                                          "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                          isSelected ? "bg-blue-600 border-blue-600 shadow-md" : "bg-white border-slate-200 group-hover:border-blue-400"
                                                      )}>
                                                           <input 
                                                                type="checkbox" 
                                                                checked={isSelected}
                                                                onChange={() => {}} // Controlled by card click
                                                                className="hidden"
                                                            />
                                                            {isSelected && <CheckCircle size={14} className="text-white" strokeWidth={4} />}
                                                      </div>
                                                  </div>
                                              </div>
                                              
                                              <div className="space-y-3">
                                                  <span className={cn("text-xs font-black transition-all block min-h-[32px] leading-tight", isSelected ? "text-slate-900" : "text-slate-500")}>
                                                      {getLocalizedPermissionLabel(p)}
                                                  </span>
                                                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                                                      <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tight", 
                                                          isSelected ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                                                      )}>
                                                          {meta?.scope === PermissionScope.GLOBAL ? <Globe size={8} /> : <Building2 size={8} />}
                                                          {getLocalizedScopeLabel(meta?.scope)}
                                                      </div>
                                                      <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tight", 
                                                          isSelected ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400"
                                                      )}>
                                                          {meta?.action}
                                                      </div>
                                                  </div>
                                              </div>
                                          </div>
                                      )
                                    })}
                                </div>
                            </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'audit' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 h-full min-h-[400px]">
                    <div className="p-10 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12" aria-hidden="true">
                             <Shield size={300} />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                            <div className="space-y-4 text-center md:text-right">
                                <h4 className="text-3xl font-black italic tracking-tighter uppercase leading-tight">Security & Risk Assessment</h4>
                                <p className="text-slate-400 text-sm font-bold leading-relaxed max-w-xl">{language === 'ar' ? 'تحليل المخاطر الرقمية والتبعات القانونية وفق إطار العمل الأكاديمي الصارم.' : 'Digital risk assessment and legal implications aligned with strict academic framework.'}</p>
                            </div>
                            <div className="p-8 bg-white/10 backdrop-blur-xl rounded-[2.5rem] border border-white/10 text-center">
                                <Users className="mx-auto mb-3 text-blue-400" size={32} />
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">{language === 'ar' ? 'إجمالي المستخدمين' : 'Affected Users Count'}</p>
                                <p className="text-5xl font-black italic">08</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                             <h5 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-3">
                                 <Lock size={20} className="text-rose-500" />
                                 {t.riskImpactTitle}
                             </h5>
                             <div className="space-y-4">
                                {[
                                    { label: language === 'ar' ? 'الوصول للبيانات الشخصية والوطنية' : 'Personal and National Registry Data', risk: language === 'ar' ? 'عالي جداً' : 'CRITICAL', color: 'text-rose-600 bg-rose-50/50 border border-rose-100' },
                                    { label: language === 'ar' ? 'الوصول للسجلات المالية' : 'Academic Financial Ledgers', risk: language === 'ar' ? 'متوسط' : 'MODERATE', color: 'text-amber-600 bg-amber-50/50 border border-amber-100' },
                                    { label: language === 'ar' ? 'الوصول للدرجات العلمية والنتائج' : 'Student Grades and Exam Transcripts', risk: language === 'ar' ? 'عالي' : 'HIGH RISK', color: 'text-orange-600 bg-orange-50/50 border border-orange-100' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                        <span className="text-[11px] font-black text-slate-600">{item.label}</span>
                                        <span className={cn("px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", item.color)}>{item.risk}</span>
                                    </div>
                                ))}
                             </div>
                        </div>

                        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 flex flex-col">
                             <h5 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-3">
                                 <History size={20} className="text-blue-500" />
                                 {t.recentChangesTitle}
                             </h5>
                             <div className="space-y-4 flex-1 flex flex-col justify-center items-center opacity-50 italic text-center py-12">
                                <History size={48} className="mb-4 text-slate-300" />
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t.noAuditLogs}</p>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </form>
      </Modal>

      {/* Footer Stats Summary */}
      <div className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-sm flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-12">
              <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                      <Shield size={32} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.totalPolicies}</p>
                      <p className="text-3xl font-black text-slate-800 leading-none">{roles.length}</p>
                  </div>
              </div>
              <div className="w-px h-12 bg-slate-100 hidden sm:block" />
              <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                      <Lock size={32} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.protectedRoles}</p>
                      <p className="text-3xl font-black text-slate-800 leading-none">{roles.filter(r => r.isSystem).length}</p>
                  </div>
              </div>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-[2rem] border border-slate-100">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-200" />
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest italic">{t.footerStatus}</span>
          </div>
      </div>
    </div>
  );
};

export default RolesManagement;
