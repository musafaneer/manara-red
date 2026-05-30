
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StudentsList from './components/StudentsList';
import UniversityManagement from './components/UniversityManagement';
import Registration from './components/Registration';
import Academics from './components/Academics';
import Facilities from './components/Facilities';
import Graduates from './components/Graduates';
import GraduationRequirements from './components/GraduationRequirements';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Financials from './components/Financials';
import ServiceRequests from './components/ServiceRequests';
import Communications from './components/Communications';
import StaffManagement from './components/StaffManagement';
import Transcript from './components/Transcript';
import Faculty from './components/Faculty';
import DepartmentPortal from './components/DepartmentPortal';
import ComplianceMonitor from './components/ComplianceMonitor';
import Attendance from './components/Attendance';
import Schedule from './components/Schedule';
import ExamSchedule from './components/ExamSchedule';
import RolesManagement from './components/RolesManagement';
import AuditLogs from './components/AuditLogs';
import Regulations from './components/Regulations';
import TaskManager from './components/TaskManager';
import GraduateManagement from './components/GraduateManagement';
import CurriculumManagement from './components/CurriculumManagement';
import CourseManagement from './components/CourseManagement';
import DepartmentPerformancePage from './components/DepartmentPerformancePage';
import CourseRegistration from './components/CourseRegistration';
import FinancePortal from './components/FinancePortal';
import FacultyGrading from './components/FacultyGrading';
import Login from './components/Login';
import AdmissionPortal from './components/AdmissionPortal';
import ToastContainer from './components/ToastContainer';
import NotificationCenter from './components/NotificationCenter';
import { Bell, Book, FileText, Download, Lock, LogOut, Search, Languages, Eye } from 'lucide-react';
import { LIBYAN_REGULATION_501_SUMMARY } from './constants';
import { AuthUser, Permission, UserRole } from './types';
import { getCurrentUser, logout, getAccessibleTabs, hasPermission, switchRole } from './services/authService';
import { getNotifications } from './services/communicationService';
import CommandPalette from './components/CommandPalette';
import AIInsights from './components/AIInsights';
import { Language, getTranslation } from './services/i18nService';

import CalendarView from './components/CalendarView';
import StudentWallet from './components/StudentWallet';

import Verify from './components/Verify';

import { getSystemSettings } from './services/storageService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [verifyHash, setVerifyHash] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('preferred_lang') as Language) || 'ar';
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAdmissionPortal, setShowAdmissionPortal] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
        const hash = window.location.hash.replace('#/', '');
        const tab = hash.split('?')[0];
        if (tab && getAccessibleTabs(currentUser || { role: UserRole.STUDENT } as AuthUser).includes(tab)) {
            setActiveTab(tab);
        }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser]);
  
  // Accessibility Observer
  useEffect(() => {
    const applyAccessibility = () => {
        const settings = getSystemSettings();
        const access = settings.accessibility;
        
        if (access) {
            document.body.classList.toggle('high-contrast', access.highContrast);
            document.body.classList.toggle('reduced-motion', access.reducedMotion);
            document.body.classList.toggle('large-text', access.largeText);
        }
    };

    applyAccessibility();
    // Listen for changes (e.g. from Settings save)
    window.addEventListener('storage', applyAccessibility);
    // Simple polling for in-memory changes if needed, but storage event covers multi-tab
    const interval = setInterval(applyAccessibility, 2000); 
    
    return () => {
        window.removeEventListener('storage', applyAccessibility);
        clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Dynamically update root document lang and dir attributes based on selected language
    const html = document.documentElement;
    if (language === 'en') {
        html.lang = 'en';
        html.dir = 'ltr';
    } else if (language === 'ar-ly') {
        html.lang = 'ar-LY';
        html.dir = 'rtl';
    } else {
        html.lang = 'ar';
        html.dir = 'rtl';
    }
  }, [language]);
  
  useEffect(() => {
    // Check if we are on a verification URL (supports path-based, query-based, or hash-based routing)
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const hashData = window.location.hash;

    if (path.startsWith('/verify/')) {
        const hash = path.split('/verify/')[1];
        if (hash) setVerifyHash(hash);
    } else if (searchParams.has('verify')) {
        const hash = searchParams.get('verify');
        if (hash) setVerifyHash(hash);
    } else if (searchParams.has('v')) {
        const hash = searchParams.get('v');
        if (hash) setVerifyHash(hash);
    } else if (hashData.startsWith('#/verify/')) {
        const hash = hashData.split('#/verify/')[1]?.split('?')[0];
        if (hash) setVerifyHash(hash);
    } else if (hashData.startsWith('#verify=')) {
        const hash = hashData.split('#verify=')[1]?.split('&')[0];
        if (hash) setVerifyHash(hash);
    }
  }, []);
  const [activeSubTab, setActiveSubTab] = useState<any>(undefined);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const toggleLanguage = () => {
    let newLang: Language = 'ar';
    if (language === 'ar') newLang = 'ar-ly';
    else if (language === 'ar-ly') newLang = 'en';
    else newLang = 'ar';
    setLanguage(newLang);
    localStorage.setItem('preferred_lang', newLang);
  };

  const navigateToTab = (tab: string, subTab?: string) => {
    setActiveTab(tab);
    setActiveSubTab(subTab);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsCommandPaletteOpen(true);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // Refresh unread count periodically
    const checkUnread = () => {
        const notifs = getNotifications();
        const unread = notifs.filter(n => !n.isRead && (!n.targetRole || (currentUser && n.targetRole === currentUser.role))).length;
        setUnreadNotifsCount(unread);
    };

    checkUnread();
    const interval = setInterval(checkUnread, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [currentUser, isNotificationCenterOpen]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
        setCurrentUser(user);
    }
  }, []);

  const handleLogin = (user: AuthUser) => {
      setCurrentUser(user);
      setActiveTab('dashboard');
  };

  const handleLogout = () => {
      logout();
      setCurrentUser(null);
  };

  const renderContent = () => {
    if (currentUser) {
        const allowedTabs = getAccessibleTabs(currentUser);
        // Student can always see registration portal in this app's logic
        const isStudent = (currentUser.effectiveRole || currentUser.role) === UserRole.STUDENT;
        
        if (!allowedTabs.includes(activeTab)) {
            return (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center h-[80vh] text-slate-400"
                >
                    <div className="bg-red-50 p-6 rounded-full mb-4">
                        <Lock size={48} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        {language === 'ar' ? 'الدخول غير مصرح به' : 'Access Denied'}
                    </h2>
                    <p>{language === 'ar' ? 'ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة.' : 'You do not have sufficient permissions to access this page.'}</p>
                </motion.div>
            );
        }
    }

    const PageWrapper = ({ children }: { children: React.ReactNode }) => (
        <motion.div
            initial={{ opacity: 0, x: language !== 'en' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: language !== 'en' ? -20 : 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="min-h-full"
        >
            {children}
        </motion.div>
    );

    switch (activeTab) {
      case 'dashboard': return <PageWrapper><Dashboard setActiveTab={navigateToTab} language={language} /></PageWrapper>;
      case 'compliance': return <PageWrapper><ComplianceMonitor language={language} /></PageWrapper>;
      case 'students': return <PageWrapper><StudentsList language={language} /></PageWrapper>;
      case 'organization': return <PageWrapper><UniversityManagement language={language} /></PageWrapper>;
      case 'curriculum': return <PageWrapper><CurriculumManagement language={language} /></PageWrapper>;
      case 'courses_mgmt': return <PageWrapper><CourseManagement language={language} /></PageWrapper>;
      case 'dept_performance': return <PageWrapper><DepartmentPerformancePage language={language} /></PageWrapper>;
      case 'registration': return <PageWrapper><Registration language={language} /></PageWrapper>;
      case 'academics': return <PageWrapper><Academics language={language} /></PageWrapper>;
      case 'facilities': return <PageWrapper><Facilities language={language} /></PageWrapper>;
      case 'schedule': return <PageWrapper><Schedule language={language} /></PageWrapper>;
      case 'exams': return <PageWrapper><ExamSchedule language={language} /></PageWrapper>;
      case 'staff': return <PageWrapper><StaffManagement language={language} /></PageWrapper>;
      case 'faculty': return <PageWrapper><Faculty language={language} /></PageWrapper>;
      case 'department': return <PageWrapper><DepartmentPortal language={language} /></PageWrapper>;
      case 'transcript': return <PageWrapper><Transcript language={language} /></PageWrapper>;
      case 'attendance': return <PageWrapper><Attendance language={language} /></PageWrapper>;
      case 'financials': return <PageWrapper><Financials language={language} /></PageWrapper>;
      case 'wallet': return <PageWrapper><StudentWallet language={language} /></PageWrapper>;
      case 'graduate_studies': return <PageWrapper><GraduateManagement language={language} /></PageWrapper>;
      case 'requests': return <PageWrapper><ServiceRequests language={language} currentUser={currentUser} /></PageWrapper>;
      case 'tasks': return <PageWrapper><div className="p-8"><TaskManager language={language} /></div></PageWrapper>;
      case 'communications': return <PageWrapper><Communications language={language} /></PageWrapper>;
      case 'reports': return <PageWrapper><Reports language={language} /></PageWrapper>;
      case 'graduates': return <PageWrapper><Graduates language={language} /></PageWrapper>;
      case 'graduation_requirements': return <PageWrapper><GraduationRequirements language={language} /></PageWrapper>;
      case 'course_registration': return <PageWrapper><CourseRegistration language={language} /></PageWrapper>;
      case 'finance_portal': return <PageWrapper><FinancePortal language={language} /></PageWrapper>;
      case 'grading_portal': return <PageWrapper><FacultyGrading language={language} /></PageWrapper>;
      case 'calendar': return <PageWrapper><CalendarView language={language} /></PageWrapper>;
      case 'roles': return <PageWrapper><RolesManagement language={language} /></PageWrapper>;
      case 'audit': return <PageWrapper><AuditLogs language={language} /></PageWrapper>;
      case 'settings': return <PageWrapper><Settings defaultTab={activeSubTab} language={language} /></PageWrapper>;
      case 'regulations': return <PageWrapper><Regulations language={language} /></PageWrapper>;
      default:
        return <div className="p-8 text-center text-slate-400">{language === 'ar' ? 'قيد التطوير' : 'Under Development'}</div>;
    }
  };

  if (verifyHash) return <Verify hash={verifyHash} />;
  if (!currentUser) {
    if (showAdmissionPortal) {
      return <AdmissionPortal onClose={() => setShowAdmissionPortal(false)} language={language === 'en' ? 'en' : 'ar'} />;
    }
    return <Login onLogin={handleLogin} language={language} onOpenAdmission={() => setShowAdmissionPortal(true)} />;
  }

  return (
    <div 
        className={`flex min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 ${language === 'en' ? 'flex-row-reverse' : 'flex-row'}`} 
        dir={language === 'en' ? 'ltr' : 'rtl'}
    >
        <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-6 focus:py-3 focus:bg-brand-600 focus:text-white focus:rounded-xl focus:shadow-2xl focus:font-bold"
        >
            {language === 'en' ? 'Skip to Content' : 'تخطي إلى المحتوى'}
        </a>
        <ToastContainer />
        
        {currentUser && (
            <NotificationCenter 
                isOpen={isNotificationCenterOpen} 
                onClose={() => setIsNotificationCenterOpen(false)} 
                currentUser={currentUser}
            />
        )}

        <AnimatePresence>
            {isCommandPaletteOpen && (
                <CommandPalette 
                    onClose={() => setIsCommandPaletteOpen(false)} 
                    navigateToTab={navigateToTab}
                />
            )}
        </AnimatePresence>
        
        <Sidebar 
            activeTab={activeTab} 
            setActiveTab={navigateToTab} 
            currentUser={currentUser} 
            onLogout={handleLogout}
            language={language}
        />
        
        <main id="main-content" className="flex-1 overflow-x-hidden overflow-y-auto h-screen print:overflow-visible print:h-auto relative">
            {/* Simulation Identifier Banner */}
            {currentUser?.effectiveRole && (
                <div className="bg-indigo-600 text-white px-8 py-2 flex items-center justify-between sticky top-0 z-[40] shadow-lg animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-1.5 rounded-lg">
                            <Eye size={16} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest">
                            {language === 'en' ? `Simulation Mode Active: ${currentUser.effectiveRole}` : `وضع المحاكاة نشط: ${currentUser.effectiveRole}`}
                        </p>
                    </div>
                    <button 
                        onClick={() => {
                            switchRole(null);
                        }}
                        className="bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/10"
                    >
                        {language === 'en' ? 'Exit Simulation' : 'إنهاء المحاكاة'}
                    </button>
                </div>
            )}

            {/* Global Actions Interface */}
            <div className={`absolute top-6 ${language === 'en' ? 'right-8' : 'left-8'} z-30 flex items-center gap-4`}>
                <button 
                    onClick={toggleLanguage}
                    className="p-2.5 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-sm text-slate-600 hover:text-brand-600 hover:border-brand-200 transition-all flex items-center gap-2"
                    title={language === 'ar' ? 'Switch to Libyan Arabic' : language === 'ar-ly' ? 'Switch to English' : 'التبديل للعربية'}
                >
                    <Languages size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        {language === 'ar' ? 'AR' : language === 'ar-ly' ? 'AR-LY' : 'EN'}
                    </span>
                </button>

                <button 
                    onClick={() => setIsNotificationCenterOpen(true)}
                    className="relative p-2.5 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-sm text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all group"
                >
                    <Bell size={20} className="group-hover:rotate-12 transition-transform" />
                    {unreadNotifsCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce-short">
                            {unreadNotifsCount}
                        </span>
                    )}
                </button>

                <button 
                    onClick={() => setIsCommandPaletteOpen(true)}
                    className="flex items-center gap-4 px-6 py-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-sm text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all group hidden lg:flex"
                >
                    <Search size={16} className="group-hover:scale-125 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        {language === 'en' ? 'Smart Search • Cmd+K' : 'البحث الذكي • Cmd+K'}
                    </span>
                </button>
            </div>

            <AnimatePresence mode="wait">
                <div key={activeTab}>
                    {renderContent()}
                </div>
            </AnimatePresence>

            <AIInsights />
        </main>
    </div>
  );
};

export default App;
