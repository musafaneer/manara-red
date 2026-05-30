
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, Users, BookOpen, GraduationCap, Settings, 
  FileText, TrendingUp, Wallet, FileQuestion, Briefcase, 
  UserCheck, Calendar, Clock, Shield, ClipboardCheck, 
  Bell, School, Network, Contact, Scale, LogOut, ChevronLeft,
  ChevronUp, ChevronDown, UserSquare, CheckCircle2, Award, Boxes
} from 'lucide-react';
import { getStudents } from '../services/storageService';
import { getRoles } from '../services/rbacService';
import { StudentStatus, AuthUser, UserRole, Permission, RoleDefinition } from '../types';
import { getAccessibleTabs, hasPermission, switchRole } from '../services/authService';

import { Language, getTranslation } from '../services/i18nService';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: AuthUser;
  onLogout: () => void;
  language: Language;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, onLogout, language }) => {
  const [warningCount, setWarningCount] = useState(0);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const isStudent = (currentUser.effectiveRole || currentUser.role) === UserRole.STUDENT;
  
  const isAr = language !== 'en';

  useEffect(() => {
    setRoles(getRoles());
  }, []);

  useEffect(() => {
    if (hasPermission(currentUser, Permission.STUDENTS_VIEW)) {
        const fetchCounts = () => {
            const students = getStudents();
            const count = students.filter(s => s.warningsCount > 0 || s.status === StudentStatus.WARNING).length;
            setWarningCount(count);
        };
        
        fetchCounts();
        const interval = setInterval(fetchCounts, 5000);
        return () => clearInterval(interval);
    } else {
        setWarningCount(0);
    }
  }, [currentUser]);

  const getMenuItemLabel = (id: string, arDef: string, enDef: string): string => {
    if (id === 'dashboard') {
        const key = isStudent ? 'self_service' : 'dashboard';
        const trans = getTranslation(key, language);
        if (trans !== key) return trans;
        return isAr ? (isStudent ? 'بوابة الخدمة الذاتية' : 'لوحة التحكم') : (isStudent ? 'Self-Service Portal' : 'Dashboard');
    }
    const translated = getTranslation(id, language);
    if (translated && translated !== id) {
        return translated;
    }
    return isAr ? arDef : enDef;
  };

  const allMenuItems = [
    { id: 'dashboard', label: getMenuItemLabel('dashboard', 'لوحة التحكم', 'Dashboard'), icon: LayoutDashboard },
    { id: 'tasks', label: getMenuItemLabel('tasks', 'المهام والإنتاجية', 'Tasks & Productivity'), icon: CheckCircle2 },
    { id: 'department', label: getMenuItemLabel('department', 'بوابة القسم', 'Dept Portal'), icon: Briefcase },
    { id: 'compliance', label: getMenuItemLabel('compliance', 'مراقبة الامتثال', 'Compliance Monitoring'), icon: Scale },
    { id: 'students', label: getMenuItemLabel('students', 'سجلات الطلاب', 'Student Records'), icon: Users, badge: warningCount },
    { id: 'organization', label: getMenuItemLabel('organization', 'الهيكل الأكاديمي', 'Academic Structure'), icon: Network },
    { id: 'courses_mgmt', label: getMenuItemLabel('courses_mgmt', 'إدارة المقررات', 'Course Management'), icon: Boxes },
    { id: 'curriculum', label: getMenuItemLabel('curriculum', 'إدارة المناهج والخطط', 'Curriculum & Plans'), icon: BookOpen },
    { id: 'dept_performance', label: getMenuItemLabel('dept_performance', 'أداء طلاب القسم', 'Dept. Performance'), icon: TrendingUp },
    { id: 'registration', label: getMenuItemLabel('registration', 'تسجيل المقررات', 'Course Enrollment'), icon: ClipboardCheck },
    { id: 'transcript', label: getMenuItemLabel('transcript', 'الدرجات والكشوف', 'Grades & Transcripts'), icon: FileText },
    { id: 'academics', label: getMenuItemLabel('academics', 'السجل الأكاديمي', 'Academic History'), icon: BookOpen },
    { id: 'facilities', label: getMenuItemLabel('facilities', 'مرافق الحرم الجامعي', 'Campus Facilities'), icon: School },
    { id: 'schedule', label: getMenuItemLabel('schedule', 'الجدول الدراسي', 'Class Schedule'), icon: Calendar },
    { id: 'calendar', label: getMenuItemLabel('calendar', 'التقويم الأكاديمي', 'Academic Calendar'), icon: Clock },
    { id: 'exams', label: getMenuItemLabel('exams', 'مواعيد الامتحانات', 'Exam Timings'), icon: Clock },
    { id: 'faculty', label: getMenuItemLabel('faculty', 'دليل أعضاء هيئة التدريس', 'Faculty Directory'), icon: Contact },
    { id: 'staff', label: getMenuItemLabel('staff', 'الموارد البشرية', 'Human Resources (HR)'), icon: Users },
    { id: 'attendance', label: getMenuItemLabel('attendance', 'تتبع الحضور', 'Attendance Tracking'), icon: UserCheck },
    { id: 'financials', label: getMenuItemLabel('financials', 'الإدارة المالية', 'Financial Management'), icon: Wallet },
    { id: 'wallet', label: getMenuItemLabel('wallet', 'المحفظة الرقمية الذكية', 'Digital e-Wallet'), icon: Wallet },
    { id: 'graduate_studies', label: getMenuItemLabel('graduate_studies', 'الدراسات العليا', 'Graduate Studies'), icon: Network },
    { id: 'requests', label: getMenuItemLabel('requests', 'طلبات الخدمة', 'Service Requests'), icon: FileQuestion },
    { id: 'communications', label: getMenuItemLabel('communications', 'الإشعارات العامة', 'Global Notifications'), icon: Bell },
    { id: 'reports', label: getMenuItemLabel('reports', 'التحليلات والتقارير', 'Analytics & Reporting'), icon: TrendingUp },
    { id: 'graduates', label: getMenuItemLabel('graduates', 'سجل الخريجين', 'Alumni Registry'), icon: GraduationCap },
    { id: 'graduation_requirements', label: getMenuItemLabel('graduation_requirements', 'معايير وبراءات التخرج', 'Graduation Auditing'), icon: Award },
    { id: 'grading_portal', label: getMenuItemLabel('grading_portal', 'بوابة رصد الدرجات', 'Grading Portal'), icon: Award },
    { id: 'course_registration', label: getMenuItemLabel('course_registration', 'التسجيل الذاتي', 'Self Registration'), icon: CheckCircle2 },
    { id: 'finance_portal', label: getMenuItemLabel('finance_portal', 'البوابة المالية', 'Finance Portal'), icon: Wallet },
    { id: 'roles', label: getMenuItemLabel('roles', 'إدارة الهوية', 'Identity Management'), icon: Shield },
    { id: 'audit', label: getMenuItemLabel('audit', 'سجل التدقيق', 'Audit Logs'), icon: ClipboardCheck },
    { id: 'regulations', label: getMenuItemLabel('regulations', 'دليل الامتثال', 'Compliance Guide'), icon: FileText },
    { id: 'settings', label: getMenuItemLabel('settings', 'إعدادات النظام', 'System Configuration'), icon: Settings },
  ];

  const categories = [
    {
      id: 'main',
      label: isAr ? 'الرئيسية' : 'Core',
      items: ['dashboard', 'tasks', 'communications']
    },
    {
      id: 'academic',
      label: isAr ? 'البوابة الأكاديمية' : 'Academic Portal',
      items: ['students', 'organization', 'courses_mgmt', 'curriculum', 'academics', 'registration', 'course_registration', 'grading_portal', 'transcript', 'schedule', 'exams', 'attendance', 'faculty', 'department', 'dept_performance', 'graduate_studies', 'graduates', 'graduation_requirements']
    },
    {
      id: 'management',
      label: isAr ? 'إدارة الموارد' : 'Resource Management',
      items: ['financials', 'wallet', 'finance_portal', 'staff', 'facilities', 'requests', 'reports']
    },
    {
      id: 'system',
      label: isAr ? 'النظام والامتثال' : 'Security & Rules',
      items: ['compliance', 'roles', 'audit', 'regulations', 'settings']
    }
  ];

  const allowedTabs = getAccessibleTabs(currentUser);

  return (
    <div className={`w-72 bg-slate-50 text-slate-800 shadow-[0_4px_30px_rgba(15,23,42,0.08)] print:hidden h-screen sticky top-0 flex flex-col ${isAr ? 'border-l' : 'border-r'} border-slate-200/60 shrink-0 z-50 overflow-hidden`}>
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #64748b 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      
      <div className="p-8 border-b border-slate-200/60 flex items-center gap-4 shrink-0 relative bg-slate-100/40">
        <motion.div 
            whileHover={{ rotate: -10, scale: 1.1, filter: 'brightness(1.1)' }}
            className="w-12 h-12 bg-gradient-to-br from-[#C74634] to-[#A53A2A] rounded-2xl flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(199,70,52,0.3)] border border-red-400/20"
        >
          <span className="text-white">{isAr ? 'أ' : 'O'}</span>
        </motion.div>
        <div>
          <h1 className="font-black text-xl leading-none bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-[#C74634] uppercase tracking-tighter">
            {isAr ? 'أوراكل كامبس' : 'Oracle Campus'}
          </h1>
          <p className="text-[9px] font-black text-[#C74634] uppercase tracking-[0.4em] mt-1 opacity-80">
            {isAr ? 'نظام إدارة الجامعة' : 'Academic Core'}
          </p>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar relative" role="navigation" aria-label={isAr ? 'القائمة الرئيسية' : 'Main Navigation'}>
        {categories.map((category) => {
            const visibleItems = allMenuItems.filter(item => 
                category.items.includes(item.id) && allowedTabs.includes(item.id)
            );

            if (visibleItems.length === 0) return null;

            return (
                <div key={category.id} className="space-y-2" role="group" aria-labelledby={`category-${category.id}`}>
                    <h3 id={`category-${category.id}`} className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">
                        {category.label}
                    </h3>
                    <div className="space-y-1" role="list">
                        {visibleItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <div key={item.id} role="listitem">
                                    <motion.button
                                        onClick={() => setActiveTab(item.id)}
                                        whileHover={{ x: language === 'ar' ? -4 : 4, backgroundColor: isActive ? '' : 'rgba(15,23,42,0.03)' }}
                                        whileTap={{ scale: 0.97 }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group relative ${
                                            isActive 
                                            ? 'bg-gradient-to-r from-[#C74634] to-[#A53A2A] text-white shadow-[0_10px_20px_-10px_rgba(199,70,52,0.4)] border border-red-400/20' 
                                            : 'text-slate-600 border border-transparent hover:text-slate-900'
                                        }`}
                                        aria-current={isActive ? 'page' : undefined}
                                        aria-label={item.label}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-white/15 opacity-100' : 'bg-transparent opacity-60 group-hover:opacity-100 group-hover:bg-slate-200/50'}`} aria-hidden="true">
                                                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-[#C74634] transition-colors'} />
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-950'}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                        
                                        {item.badge !== undefined && item.badge > 0 && (
                                            <span 
                                                className="bg-rose-600 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-sm border border-rose-500"
                                                aria-label={`${item.badge} notifications`}
                                            >
                                                {item.badge}
                                            </span>
                                        )}

                                        {isActive && (
                                            <motion.div 
                                                layoutId="active-pill"
                                                className={`absolute ${language === 'ar' ? '-left-6' : '-right-6'} top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C74634] rounded-full blur-[2px]`}
                                                aria-hidden="true"
                                            />
                                        )}
                                    </motion.button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        })}
      </nav>


      <div className="p-6 border-t border-slate-200/60 space-y-6 shrink-0 bg-slate-100/40 backdrop-blur-xl relative">
        {/* System Node Status Indicator */}
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Oracle Node-01 Online</span>
            </div>
            <span className="text-[8px] font-mono text-slate-400">v2.4.0-SECURE</span>
        </div>

        {/* Role Switcher for Superadmin or IT Admin */}
        {(currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.IT_ADMIN) && (
          <div className="space-y-1">
              <button 
                onClick={() => setIsRoleSwitcherOpen(!isRoleSwitcherOpen)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all group shadow-sm"
                aria-expanded={isRoleSwitcherOpen}
                aria-controls="role-switcher-dropdown"
              >
                  <div className="flex items-center gap-2">
                      <UserSquare size={14} className="group-hover:text-indigo-400" aria-hidden="true" />
                      <span className="text-[9px] font-black uppercase tracking-wider">
                        {isAr ? 'محاكاة دور' : 'Impersonate Role'}
                      </span>
                  </div>
                  {isRoleSwitcherOpen ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronUp size={14} aria-hidden="true" />}
              </button>
              
              {isRoleSwitcherOpen && (
                <motion.div 
                  id="role-switcher-dropdown"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="bg-white rounded-xl border border-slate-200/80 overflow-y-auto max-h-60 custom-scrollbar shadow-xl mt-2"
                  role="listbox"
                >
                    {roles.map(role => (
                        <button
                            key={role.id}
                            onClick={() => {
                                switchRole(role.id);
                                setIsRoleSwitcherOpen(false);
                            }}
                            className={`w-full text-right px-4 py-2.5 text-[9px] font-black uppercase tracking-tight hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${
                                (currentUser.effectiveRole || currentUser.role) === role.id ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-600'
                            }`}
                            role="option"
                            aria-selected={(currentUser.effectiveRole || currentUser.role) === role.id}
                        >
                            {role.name}
                        </button>
                    ))}
                    {currentUser.effectiveRole && (
                        <button
                            onClick={() => {
                                switchRole(null);
                                setIsRoleSwitcherOpen(false);
                            }}
                            className="w-full text-right px-4 py-2.5 text-[9px] font-black uppercase text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                            {isAr ? 'إعادة تعيين الدور' : 'Reset Simulation'}
                        </button>
                    )}
                </motion.div>
              )}
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 border border-slate-200/85 group relative overflow-hidden shadow-sm">
            <div className="absolute inset-0 bg-[#C74634]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C74634] to-[#A53A2A] flex items-center justify-center shadow-xl shrink-0 border border-white/20 group-hover:scale-105 transition-transform">
                        <span className="text-sm font-black text-white">{currentUser.name.charAt(0)}</span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[11px] font-black truncate text-slate-800 uppercase tracking-tight">{currentUser.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Shield size={10} className={currentUser.effectiveRole ? "text-[#C74634]" : "text-slate-400"} />
                            <p className={`text-[8px] font-black truncate uppercase tracking-widest ${currentUser.effectiveRole ? 'text-[#C74634] font-bold' : 'text-slate-400'}`}>
                                {currentUser.effectiveRole 
                                  ? (isAr ? `محاكاة: ${currentUser.effectiveRole}` : `SIM: ${currentUser.effectiveRole}`)
                                  : currentUser.role
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/60 hover:border-rose-100 rounded-xl transition-all text-[9px] font-black uppercase tracking-[0.2em] relative z-10 shadow-sm bg-white">
                <LogOut size={14} />
                <span>{isAr ? 'تسجيل الخروج' : 'Exit System'}</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
