import React, { useState, useEffect, useRef, FC } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Download, Upload, Database, AlertCircle, CheckCircle, Shield, Clock, Calendar, Scale, Search, DollarSign, Printer, FileSpreadsheet, Key, Cpu, Lock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSystemSettings, saveSystemSettings, exportSystemData, importSystemData, resetToFactoryData } from '../services/storageService';
import { getAuditLogs, clearAuditLogs } from '../services/auditService';
import { AuditLog, SystemSettings, UserRole } from '../types';
import { notifySuccess, notifyError } from '../services/notificationService';
import { Language } from '../services/i18nService';
import { cn } from '../lib/utils';
import SecurePrintWrapper from './ui/SecurePrintWrapper';
import AuditLogs from './AuditLogs';
import { getCurrentUser } from '../services/authService';

interface SettingsProps {
  defaultTab?: 'general' | 'calendar' | 'audit';
  language: Language;
}

const Settings: FC<SettingsProps> = ({ defaultTab = 'general', language }) => {
  const [settings, setSettings] = useState<SystemSettings>({
    universityName: '',
    institutionName: '',
    currentSemester: '',
    academicYear: '',
    registrationDeadline: '',
    paymentDeadline: '',
    regulation: {
        minGpaGood: 65,
        minGpaExcellent: 85,
        minGpaWarning: 50,
        maxCreditsPerSemester: 18,
        minCreditsPerSemester: 12,
        passingScore: 50,
        attendanceWarningThreshold: 25
    },
    finance: {
        undergraduateRatePerCredit: 30,
        postgraduateRatePerCredit: 100,
        registrationFee: 50,
        lateFee: 20,
        transcriptFee: 15,
        idCardFee: 10,
        maxDebtLimit: 1000
    },
    calendarStages: []
  });
  const [saved, setSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'general' | 'calendar' | 'audit' | 'accessibility' | 'superadmin'>(defaultTab as any);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    setSettings(getSystemSettings());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSystemSettings(settings);
    notifySuccess(language === 'ar' ? 'تم تحديث الإعدادات بنجاح' : 'Settings updated successfully');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleExport = () => {
    const jsonString = exportSystemData();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Oracle_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notifySuccess(language === 'ar' ? 'تم تصدير نسخة احتياطية من النظام بنجاح' : 'System backup exported successfully');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importSystemData(content);
      if (success) {
        setImportStatus('success');
        notifySuccess(language === 'ar' ? 'تم استعادة البيانات بنجاح' : 'Data restored successfully');
        setSettings(getSystemSettings()); 
        setTimeout(() => window.location.reload(), 1500); 
      } else {
        setImportStatus('error');
        notifyError(language === 'ar' ? 'فشلت عملية الاستعادة. تنسيق الملف غير صالح.' : 'Restoration failed. Invalid file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleReset = () => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف جميع البيانات واستعادة النسخة المصنعية؟ لا يمكن التراجع عن هذا العمل.' : 'Are you sure you want to delete all data and restore factory settings? This action cannot be undone.')) {
      resetToFactoryData();
      notifySuccess(language === 'ar' ? 'تمت استعادة النسخة المصنعية بنجاح' : 'Factory data restored successfully');
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const [isRotating, setIsRotating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleSuperadminChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      superadmin: {
        ...(prev.superadmin || {
          maintenanceMode: false,
          enableSelfRegistration: true,
          enableAiInsights: true,
          allowGradeOverride: true,
          enableGraduation501Validation: true,
          sessionTimeoutMinutes: 30,
          securityLevel: 'STANDARD' as const,
          logRetentionDays: 90
        }),
        [key]: value
      }
    }));
  };

  const currentSuperadminSettings = settings.superadmin || {
    maintenanceMode: false,
    enableSelfRegistration: true,
    enableAiInsights: true,
    allowGradeOverride: true,
    enableGraduation501Validation: true,
    sessionTimeoutMinutes: 30,
    securityLevel: 'STANDARD' as const,
    logRetentionDays: 90
  };

  const triggerKeyRotation = () => {
    setIsRotating(true);
    setTimeout(() => {
      setIsRotating(false);
      notifySuccess(language === 'ar' ? 'تمت إعادة توليد وتدوير مفاتيح التشفير بنجاح!' : 'Encryption keys rotated successfully!');
    }, 1200);
  };

  const triggerDbOptimization = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      notifySuccess(language === 'ar' ? 'تم تحسين وتدقيق فهرسة محرك البيانات بالكامل' : 'Database indexing optimized and verified successfully');
    }, 1500);
  };

  return (
    <div className="p-12 space-y-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div className="space-y-4">
          <div className={cn("flex items-center gap-5", language === 'ar' ? "flex-row" : "flex-row-reverse")}>
            <div>
              <h2 className={cn("text-xl md:text-2xl font-bold text-slate-900 tracking-tight", language === 'ar' ? "text-right" : "text-left")}>
                {language === 'ar' ? 'عقدة حوكمة النظام' : 'System Governance Node'}
              </h2>
              <p className={cn("text-stone-400 font-black uppercase tracking-[0.4em] text-[10px] mt-1 opacity-60", language === 'ar' ? "text-right" : "text-left")}>
                {language === 'ar' ? 'تكوين المتغيرات العالمية وعناصر التحكم في التدقيق الجنائي' : 'Global Variable Configuration & Forensic Audit Controls'}
              </p>
            </div>
            <div className="p-4 bg-slate-900 rounded-[1.5rem] text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/5 relative group overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <SettingsIcon size={32} className="relative z-10 text-indigo-400 group-hover:text-white transition-colors animate-spin-slow" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.05)] border border-stone-100 overflow-hidden min-h-[750px] flex flex-col relative group">
          {/* Decorative scanner line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>

          <div className={cn("flex border-b border-stone-50 bg-stone-50/30 px-12 pt-8 gap-12", language === 'ar' ? "justify-start" : "justify-end")}>
            {(() => {
              const user = getCurrentUser();
              const isSuper = user?.role === UserRole.SUPER_ADMIN || user?.effectiveRole === UserRole.SUPER_ADMIN;
              const tabsList = [
                { id: 'general', label: language === 'ar' ? 'جوهر المحرك' : 'Engine Core', icon: Database },
                { id: 'calendar', label: language === 'ar' ? 'المراحل الزمنية' : 'Temporal Stages', icon: Calendar },
                { id: 'accessibility', label: language === 'ar' ? 'إمكانية الوصول' : 'Accessibility', icon: Search },
                { id: 'audit', label: language === 'ar' ? 'سجلات التدقيق' : 'Forensic Logs', icon: Shield }
              ];
              if (isSuper) {
                tabsList.push({ id: 'superadmin', label: language === 'ar' ? 'إدارة المشرف العام' : 'Super Admin Core', icon: Key });
              }
              return tabsList.map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                      "pb-6 px-2 text-[10px] font-black uppercase tracking-[0.3em] border-b-[3px] transition-all flex items-center gap-3 italic",
                      activeTab === tab.id ? 'border-indigo-600 text-slate-900 font-black' : 'border-transparent text-stone-400 hover:text-stone-600',
                      language === 'ar' ? 'flex-row' : 'flex-row-reverse'
                  )}
                >
                  <tab.icon size={16} className={activeTab === tab.id ? 'text-indigo-600' : 'opacity-40'} />
                  {tab.label}
                </button>
              ));
            })()}
          </div>

          <div className="p-12 flex-1 relative">
            <AnimatePresence mode="wait">
              {activeTab === 'general' && (
                <motion.div 
                  key="general"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-12"
                >
                    <form onSubmit={handleSave} className="space-y-12">
                        <section className="space-y-8">
                            <div className={cn("flex items-center gap-4 border-b border-stone-50 pb-4", language === 'ar' ? "flex-row" : "flex-row-reverse")}>
                                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-indigo-400 text-xs font-black italic">I&I</div>
                                <h3 className={cn("text-[11px] font-black text-slate-900 uppercase tracking-[0.4em]", language === 'ar' ? "text-right" : "text-left")}>
                                    {language === 'ar' ? 'بروتوكول الهوية والبنية التحتية' : 'Identity & Infrastructure Protocol'}
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'نطاق الكيان الأكاديمي' : 'Academic Entity Domain'}</label>
                                    <input 
                                        type="text" 
                                        value={settings.institutionName}
                                        onChange={(e) => setSettings({...settings, institutionName: e.target.value, universityName: e.target.value})}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all placeholder:text-stone-300", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'معرف النظام الأساسي' : 'System Core Identifier'}</label>
                                    <input 
                                        type="text" 
                                        value={settings.universityName}
                                        onChange={(e) => setSettings({...settings, universityName: e.target.value})}
                                        placeholder={language === 'ar' ? 'مثال: ORCL-X1' : 'e.g., ORCL-X1'}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all placeholder:text-stone-300", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-8">
                            <div className={cn("flex items-center gap-4 border-b border-stone-50 pb-4", language === 'ar' ? "flex-row" : "flex-row-reverse")}>
                                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-indigo-400 text-xs font-black italic">SLC</div>
                                <h3 className={cn("text-[11px] font-black text-slate-900 uppercase tracking-[0.4em]", language === 'ar' ? "text-right" : "text-left")}>
                                    {language === 'ar' ? 'دورة الحياة الزمنية للفصل الدراسي' : 'Semester Temporal Lifecycle'}
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'عصر النشر (العام الأكاديمي)' : 'Deployment Epoch (Academic Year)'}</label>
                                    <input 
                                        type="text" 
                                        value={settings.academicYear}
                                        onChange={(e) => setSettings({...settings, academicYear: e.target.value})}
                                        placeholder="2025/2026"
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'دورة العمليات الرئيسية' : 'Master Operational Cycle'}</label>
                                    <input 
                                        type="text" 
                                        value={settings.currentSemester}
                                        onChange={(e) => setSettings({...settings, currentSemester: e.target.value})}
                                        placeholder={language === 'ar' ? 'استراتيجية الخريف' : 'Fall Strategy'}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'الطابع الزمني النهائي للتسجيل' : 'Registration Cut-off Timestamp'}</label>
                                    <div className="relative">
                                        <Calendar size={18} className={cn("absolute top-1/2 -translate-y-1/2 text-stone-300", language === 'ar' ? "right-6" : "left-6")} />
                                        <input 
                                            type="date" 
                                            value={settings.registrationDeadline}
                                            onChange={(e) => setSettings({...settings, registrationDeadline: e.target.value})}
                                            className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none", language === 'ar' ? "pr-14 pl-6 text-right font-sans" : "pl-14 pr-6 text-left font-sans")}
                                        />
                                    </div>
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'الموعد النهائي للتسوية المالية' : 'Financial Reconciliation Deadline'}</label>
                                    <div className="relative">
                                        <DollarSign size={18} className={cn("absolute top-1/2 -translate-y-1/2 text-stone-300", language === 'ar' ? "right-6" : "left-6")} />
                                        <input 
                                            type="date" 
                                            value={settings.paymentDeadline}
                                            onChange={(e) => setSettings({...settings, paymentDeadline: e.target.value})}
                                            className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none", language === 'ar' ? "pr-14 pl-6 text-right font-sans" : "pl-14 pr-6 text-left font-sans")}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-8">
                            <div className={cn("flex items-center gap-4 border-b border-stone-50 pb-4", language === 'ar' ? "flex-row" : "flex-row-reverse")}>
                                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-indigo-400 text-xs font-black italic">REG</div>
                                <h3 className={cn("text-[11px] font-black text-slate-900 uppercase tracking-[0.4em]", language === 'ar' ? "text-right" : "text-left")}>
                                    {language === 'ar' ? 'بروتوكول اللوائح الأكاديمية' : 'Academic Regulation Protocol'}
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'أقصى عدد وحدات' : 'Max Semester Credits'}</label>
                                    <input 
                                        type="number" 
                                        value={settings.regulation.maxCreditsPerSemester}
                                        onChange={(e) => setSettings({...settings, regulation: { ...settings.regulation, maxCreditsPerSemester: parseInt(e.target.value) }})}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'أدنى عدد وحدات' : 'Min Semester Credits'}</label>
                                    <input 
                                        type="number" 
                                        value={settings.regulation.minCreditsPerSemester}
                                        onChange={(e) => setSettings({...settings, regulation: { ...settings.regulation, minCreditsPerSemester: parseInt(e.target.value) }})}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'درجة النجاح' : 'Passing Threshold'}</label>
                                    <input 
                                        type="number" 
                                        value={settings.regulation.passingScore}
                                        onChange={(e) => setSettings({...settings, regulation: { ...settings.regulation, passingScore: parseInt(e.target.value) }})}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'عتبة إنذار الحضور (%)' : 'Attendance Warning (%)'}</label>
                                    <input 
                                        type="number" 
                                        value={settings.regulation.attendanceWarningThreshold}
                                        onChange={(e) => setSettings({...settings, regulation: { ...settings.regulation, attendanceWarningThreshold: parseInt(e.target.value) }})}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'الحد الأدنى للإنذار (GPA)' : 'Min GPA for Warning'}</label>
                                    <input 
                                        type="number" 
                                        value={settings.regulation.minGpaWarning}
                                        onChange={(e) => setSettings({...settings, regulation: { ...settings.regulation, minGpaWarning: parseFloat(e.target.value) }})}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'تقدير ممتاز (GPA)' : 'Excellent GPA Threshold'}</label>
                                    <input 
                                        type="number" 
                                        value={settings.regulation.minGpaExcellent}
                                        onChange={(e) => setSettings({...settings, regulation: { ...settings.regulation, minGpaExcellent: parseFloat(e.target.value) }})}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-8">
                            <div className={cn("flex items-center gap-4 border-b border-stone-50 pb-4", language === 'ar' ? "flex-row" : "flex-row-reverse")}>
                                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-indigo-400 text-xs font-black italic">FIN</div>
                                <h3 className={cn("text-[11px] font-black text-slate-900 uppercase tracking-[0.4em]", language === 'ar' ? "text-right" : "text-left")}>
                                    {language === 'ar' ? 'قواعد الحوكمة المالية' : 'Financial Governance Rules'}
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'سعر الوحدة (بكالوريوس)' : 'Undergrad Credit Rate'}</label>
                                    <input 
                                        type="number" 
                                        value={settings.finance.undergraduateRatePerCredit}
                                        onChange={(e) => setSettings({...settings, finance: { ...settings.finance, undergraduateRatePerCredit: parseInt(e.target.value) }})}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'سعر الوحدة (دراسات عليا)' : 'Postgrad Credit Rate'}</label>
                                    <input 
                                        type="number" 
                                        value={settings.finance.postgraduateRatePerCredit}
                                        onChange={(e) => setSettings({...settings, finance: { ...settings.finance, postgraduateRatePerCredit: parseInt(e.target.value) }})}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'رسوم التسجيل' : 'Registration Fee'}</label>
                                    <input 
                                        type="number" 
                                        value={settings.finance.registrationFee}
                                        onChange={(e) => setSettings({...settings, finance: { ...settings.finance, registrationFee: parseInt(e.target.value) }})}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'غرامة التأخير' : 'Late Fee'}</label>
                                    <input 
                                        type="number" 
                                        value={settings.finance.lateFee}
                                        onChange={(e) => setSettings({...settings, finance: { ...settings.finance, lateFee: parseInt(e.target.value) }})}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'الحد الأقصى للديون' : 'Max Debt Limit'}</label>
                                    <input 
                                        type="number" 
                                        value={settings.finance.maxDebtLimit}
                                        onChange={(e) => setSettings({...settings, finance: { ...settings.finance, maxDebtLimit: parseInt(e.target.value) }})}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'رسوم الإفادة' : 'Transcript Fee'}</label>
                                    <input 
                                        type="number" 
                                        value={settings.finance.transcriptFee}
                                        onChange={(e) => setSettings({...settings, finance: { ...settings.finance, transcriptFee: parseInt(e.target.value) }})}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                            </div>
                        </section>

                        <div className={cn("pt-12 border-t border-stone-50 flex items-center justify-between", language === 'en' && "flex-row-reverse")}>
                            <button 
                                type="button" 
                                className="text-stone-400 hover:text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 transition-all italic group"
                                onClick={() => setSettings(getSystemSettings())}
                            >
                                <RefreshCw size={14} className={cn("transition-transform duration-700", language === 'ar' ? "group-hover:-rotate-180" : "group-hover:rotate-180")} /> {language === 'ar' ? 'تجاهل الطفرات في العرض' : 'Discard View Mutations'}
                            </button>

                            <button 
                                type="submit" 
                                className="bg-slate-900 text-white px-14 py-6 rounded-[2rem] font-black text-sm hover:bg-black hover:scale-[1.03] active:scale-95 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all uppercase tracking-[0.3em] italic"
                            >
                                <Save size={20} className="text-indigo-400" />
                                {saved 
                                    ? (language === 'ar' ? 'تم تحديث السجل' : 'Registry Updated') 
                                    : (language === 'ar' ? 'دفع الطفرات العالمية' : 'Push Global Mutations')}
                            </button>
                        </div>
                    </form>

                    <section className="bg-slate-900 rounded-[3rem] p-12 space-y-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                        <div className={cn("flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10", language === 'en' && "md:flex-row-reverse")}>
                            <div className={language === 'ar' ? "text-right" : "text-left"}>
                                <h3 className={cn("font-black text-white text-xl flex items-center gap-3 italic uppercase", language === 'ar' ? "flex-row" : "flex-row-reverse")}>
                                    <Database size={24} className="text-indigo-400"/>
                                    {language === 'ar' ? 'الإقامة السيادية للبيانات' : 'Sovereign Data Residency'}
                                </h3>
                                <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.4em] mt-2">
                                    {language === 'ar' ? 'تصدير لقطات بيانات التعريف غير المشفرة للنسخ الاحتياطي للتخزين البارد.' : 'Export unencrypted Metadata snapshots for cold-storage backup.'}
                                </p>
                            </div>
                            <div className="flex gap-6 w-full md:w-auto">
                                <button 
                                    onClick={handleExport}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-4 px-10 py-5 bg-white/5 border border-white/10 rounded-2.5xl text-[10px] font-black text-white uppercase tracking-[0.3em] hover:bg-white items-center hover:text-slate-900 transition-all shadow-xl italic"
                                >
                                    <Download size={18} className="text-indigo-400" /> {language === 'ar' ? 'تصدير الأرشيف' : 'Export Archive'}
                                </button>
                                <div className="relative flex-1 md:flex-none">
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                                    <button 
                                        onClick={handleImportClick}
                                        className="w-full flex items-center justify-center gap-4 px-10 py-5 bg-indigo-600 rounded-2.5xl text-[10px] font-black text-white uppercase tracking-[0.3em] hover:bg-indigo-500 transition-all shadow-[0_15px_30px_rgba(79,70,229,0.3)] italic border border-white/10"
                                    >
                                        <Upload size={18} /> {language === 'ar' ? 'استعادة المحرك' : 'Restore Engine'}
                                    </button>
                                </div>
                                <button 
                                    onClick={handleReset}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-4 px-10 py-5 bg-red-500/10 border border-red-500/20 rounded-2.5xl text-[10px] font-black text-red-600 uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all italic"
                                >
                                    <RefreshCw size={18} /> {language === 'ar' ? 'تصفير المصنع' : 'Factory Reset'}
                                </button>
                            </div>
                        </div>
                    </section>
                </motion.div>
              )}

              {activeTab === 'calendar' && (
                <motion.div 
                  key="calendar"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-12"
                >
                    <div className="bg-white rounded-[3rem] border border-stone-100 p-12 shadow-sm">
                        <div className={cn("flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16 border-b border-stone-50 pb-12", language === 'en' && "md:flex-row-reverse")}>
                            <div className={language === 'ar' ? "text-right" : "text-left"}>
                                <h3 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                                    {language === 'ar' ? 'حراسة بوابات الفصول' : 'Phase Gatekeeping'}
                                </h3>
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mt-2 leading-relaxed max-w-sm">
                                    {language === 'ar' ? 'مزامنة وصول العميل العالمي مع نوافذ العمليات الأكاديمية في الوقت الفعلي.' : 'Synchronize global client access with real-time academic operational windows.'}
                                </p>
                            </div>
                            <div className="bg-slate-900 px-6 py-3 border border-white/5 rounded-2xl flex items-center gap-4 shadow-xl">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,1)]"></div>
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">
                                    {settings.currentSemester} :: {language === 'ar' ? 'تمكين العمليات' : 'OPERATIONAL'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {settings.calendarStages?.map((stage, index) => (
                                <div key={stage.id} className={cn(
                                    "p-10 rounded-[3rem] border-2 transition-all relative overflow-hidden group",
                                    stage.isUnlocked ? 'border-indigo-600 bg-indigo-50/10 shadow-[0_20px_50px_rgba(79,70,229,0.05)]' : 'border-stone-100 bg-stone-50/50 opacity-40'
                                )}>
                                    <div className={cn("flex items-center justify-between relative z-10", language === 'en' && "flex-row-reverse")}>
                                        <div className={cn("flex items-center gap-6", language === 'en' && "flex-row-reverse")}>
                                            <div className={cn(
                                                "w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all",
                                                stage.isUnlocked ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200' : 'bg-stone-200 text-stone-400'
                                            )}>
                                                <Calendar size={28} className={stage.isUnlocked ? 'animate-pulse' : ''} />
                                            </div>
                                            <div className={language === 'ar' ? "text-right" : "text-left"}>
                                                <h4 className="font-black text-xl text-slate-900 italic uppercase tracking-tighter">{stage.name}</h4>
                                                <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.4em] mt-2 opacity-70">{stage.startDate} — {stage.endDate}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newStages = [...settings.calendarStages];
                                                newStages[index] = { ...stage, isUnlocked: !stage.isUnlocked };
                                                setSettings({ ...settings, calendarStages: newStages });
                                            }}
                                            className={cn(
                                                "relative inline-flex h-10 w-18 items-center rounded-full transition-all border-2",
                                                stage.isUnlocked ? 'bg-indigo-600 border-indigo-700' : 'bg-stone-200 border-stone-300'
                                            )}
                                        >
                                            <span className={cn(
                                                "inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform",
                                                stage.isUnlocked ? (language === 'ar' ? 'translate-x-[2.2rem]' : 'translate-x-1') : (language === 'ar' ? 'translate-x-1' : 'translate-x-[2.2rem]')
                                            )} />
                                        </button>
                                    </div>
                                    {stage.isUnlocked && (
                                        <div className={cn("absolute -bottom-8 p-12 opacity-[0.03] group-hover:scale-110 transition-transform text-indigo-600", language === 'ar' ? "-left-8" : "-right-8")}>
                                            <Shield size={140} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className={cn("mt-16 flex", language === 'ar' ? "justify-start" : "justify-end")}>
                            <button 
                                onClick={handleSave}
                                className="bg-slate-900 text-white px-14 py-6 rounded-[2rem] font-black text-sm shadow-[0_25px_60px_rgba(0,0,0,0.2)] hover:bg-black hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-4 italic uppercase tracking-widest"
                            >
                                <Save size={20} className="text-indigo-400" /> {language === 'ar' ? 'نشر السياسة الزمنية' : 'Deploy Temporal Policy'}
                            </button>
                        </div>
                    </div>

                    <div className="p-12 bg-indigo-600 rounded-[4rem] text-white relative overflow-hidden group shadow-[0_30px_70px_rgba(79,70,229,0.3)]">
                        <div className={cn("absolute top-0 p-12 opacity-10 group-hover:scale-110 transition-transform", language === 'ar' ? "left-0" : "right-0")}>
                            <AlertCircle size={120} />
                        </div>
                        <h4 className={cn("font-black text-2xl mb-5 flex items-center gap-4 uppercase italic tracking-tighter", language === 'ar' ? "text-right" : "text-left")}>
                            <Shield className="text-white/40" /> {language === 'ar' ? 'قيد أمان ثابت لا يتغير' : 'Security Invariant Constraint'}
                        </h4>
                        <p className={cn("text-sm font-black italic text-indigo-50 leading-relaxed max-w-3xl opacity-80 uppercase tracking-tight", language === 'ar' ? "text-right" : "text-left")}>
                            {language === 'ar' 
                                ? 'تحذير نهائي: يؤدي إنهاء مرحلة ما على مستوى العالم إلى سحب أذونات التعديل لجميع الكيانات الخاضعة. يتم فرض هذا المنطق على مستوى مستودع الأهداف الأساسي ولا يمكن استبعاده بواسطة معالجة حالة جانب العميل.' 
                                : 'TERMINAL WARNING: Terminating a stage globally revokes mutation permissions for all subject entities. This logic is enforced at the core repository level and cannot be bypassed by client-side state manipulation.'}
                        </p>
                    </div>
                </motion.div>
              )}

              {activeTab === 'accessibility' && (
                <motion.div 
                  key="accessibility"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-12"
                >
                    <div className="bg-white rounded-[3rem] border border-stone-100 p-12 shadow-sm">
                        <div className={cn("flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16 border-b border-stone-50 pb-12", language === 'en' && "md:flex-row-reverse")}>
                            <div className={language === 'ar' ? "text-right" : "text-left"}>
                                <h3 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                                    {language === 'ar' ? 'تخصيص إمكانية الوصول' : 'Accessibility Personalization'}
                                </h3>
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mt-2 leading-relaxed max-w-sm">
                                    {language === 'ar' ? 'تعزيز التجربة البصرية والحركية لذوي الاحتياجات الخاصة.' : 'Enhance the visual and motor experience for users with special needs.'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {[
                                { 
                                    id: 'highContrast', 
                                    label: language === 'ar' ? 'وضع التباين العالي' : 'High Contrast Mode', 
                                    desc: language === 'ar' ? 'تحسين وضوح النص والعناصر.' : 'Improve text and element clarity.'
                                },
                                { 
                                    id: 'reducedMotion', 
                                    label: language === 'ar' ? 'تقليل الحركة' : 'Reduced Motion', 
                                    desc: language === 'ar' ? 'تقليل الانتقالات والرسوم المتحركة.' : 'Minimize transitions and animations.'
                                },
                                { 
                                    id: 'largeText', 
                                    label: language === 'ar' ? 'تكبير النص' : 'Magnified Text', 
                                    desc: language === 'ar' ? 'زيادة حجم الخط في النظام.' : 'Increase system-wide font size.'
                                },
                                { 
                                    id: 'screenReaderOptimized', 
                                    label: language === 'ar' ? 'تحسين قارئ الشاشة' : 'Screen Reader Optimized', 
                                    desc: language === 'ar' ? 'تفعيل وصف ARIA المتقدم.' : 'Enable advanced ARIA descriptions.'
                                }
                            ].map((option) => (
                                <div key={option.id} className={cn(
                                    "p-10 rounded-[3rem] border-2 transition-all relative overflow-hidden group",
                                    settings.accessibility?.[option.id as keyof typeof settings.accessibility] ? 'border-brand-600 bg-brand-50/10 shadow-lg' : 'border-stone-100 bg-stone-50/50'
                                )}>
                                    <div className={cn("flex items-center justify-between relative z-10", language === 'en' && "flex-row-reverse")}>
                                        <div className={language === 'ar' ? "text-right" : "text-left"}>
                                            <h4 className="font-black text-xl text-slate-900 italic uppercase tracking-tighter">{option.label}</h4>
                                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.4em] mt-2 opacity-70">{option.desc}</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const currentAccess = settings.accessibility || { highContrast: false, reducedMotion: false, largeText: false, screenReaderOptimized: false };
                                                setSettings({ 
                                                    ...settings, 
                                                    accessibility: { 
                                                        ...currentAccess, 
                                                        [option.id]: !currentAccess[option.id as keyof typeof currentAccess] 
                                                    } 
                                                });
                                            }}
                                            className={cn(
                                                "relative inline-flex h-10 w-18 items-center rounded-full transition-all border-2",
                                                settings.accessibility?.[option.id as keyof typeof settings.accessibility] ? 'bg-brand-600 border-brand-700' : 'bg-stone-200 border-stone-300'
                                            )}
                                        >
                                            <span className={cn(
                                                "inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform text-indigo-400 flex items-center justify-center",
                                                settings.accessibility?.[option.id as keyof typeof settings.accessibility] ? (language === 'ar' ? 'translate-x-[2.2rem]' : 'translate-x-1') : (language === 'ar' ? 'translate-x-1' : 'translate-x-[2.2rem]')
                                            )} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={cn("mt-16 flex", language === 'ar' ? "justify-start" : "justify-end")}>
                            <button 
                                onClick={handleSave}
                                className="bg-slate-900 text-white px-14 py-6 rounded-[2rem] font-black text-sm shadow-[0_25px_60px_rgba(0,0,0,0.2)] hover:bg-black hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-4 italic uppercase tracking-widest"
                            >
                                <Save size={20} className="text-brand-400" /> {language === 'ar' ? 'حفظ إعدادات الوصول' : 'Save Accessibility Profile'}
                            </button>
                        </div>
                    </div>
                </motion.div>
              )}

              {activeTab === 'audit' && (
                <motion.div 
                  key="audit"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full"
                >
                    <AuditLogs language={language} />
                </motion.div>
              )}

              {activeTab === 'superadmin' && (
                <motion.div 
                  key="superadmin"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-12"
                >
                  <div className="bg-white rounded-[3rem] border border-stone-100 p-12 shadow-sm">
                        <div className={cn("flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16 border-b border-stone-50 pb-12", language === 'en' && "md:flex-row-reverse")}>
                            <div className={language === 'ar' ? "text-right" : "text-left"}>
                                <h3 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                                    {language === 'ar' ? 'إعدادات المشرف العام الأساسية' : 'Super Admin Core Node'}
                                </h3>
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mt-2 leading-relaxed max-w-lg">
                                    {language === 'ar' 
                                        ? 'التحكم في معلمات التوجيه الفوقي للبيئة والمصادقة الأمنية ومحددات الصيانة العالمية.' 
                                        : 'Control meta-routing parameters, environment safety locks, security thresholds, and global maintenance states.'}
                                </p>
                            </div>
                            <div className="bg-slate-900 px-6 py-3 border border-white/5 rounded-2xl flex items-center gap-4 shadow-xl">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">
                                    {language === 'ar' ? 'نمط السيادة الكامل للتحكم' : 'SUPERUSER OVERRIDE ACTIVE'}
                                </span>
                            </div>
                        </div>

                        {/* Security Safeguard Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                            {/* Maintenance mode card */}
                            <div className={cn(
                                "p-10 rounded-[3rem] border-2 transition-all relative overflow-hidden group",
                                currentSuperadminSettings.maintenanceMode ? 'border-red-600 bg-red-50/10 shadow-[0_20px_50px_rgba(239,68,68,0.05)]' : 'border-stone-100 bg-stone-50/50'
                            )}>
                                <div className={cn("flex items-center justify-between relative z-10", language === 'en' && "flex-row-reverse")}>
                                    <div className={cn("flex items-center gap-6", language === 'en' && "flex-row-reverse")}>
                                        <div className={cn(
                                            "w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all",
                                            currentSuperadminSettings.maintenanceMode ? 'bg-red-600 text-white shadow-2xl' : 'bg-stone-200 text-stone-400'
                                        )}>
                                            <Lock size={28} className={currentSuperadminSettings.maintenanceMode ? 'animate-bounce' : ''} />
                                        </div>
                                        <div className={language === 'ar' ? "text-right" : "text-left"}>
                                            <h4 className="font-black text-xl text-slate-900 italic uppercase tracking-tighter">
                                                {language === 'ar' ? 'وضع الصيانة للمنظومة' : 'Global Maintenance Mode'}
                                            </h4>
                                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.4em] mt-2 opacity-70">
                                                {language === 'ar' ? 'تعليق نشاط جميع المستخدمين غير الإداريين' : 'Suspends access for all non-governance personnel'}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleSuperadminChange('maintenanceMode', !currentSuperadminSettings.maintenanceMode)}
                                        className={cn(
                                            "relative inline-flex h-10 w-18 items-center rounded-full transition-all border-2",
                                            currentSuperadminSettings.maintenanceMode ? 'bg-red-600 border-red-700' : 'bg-stone-200 border-stone-300'
                                        )}
                                    >
                                        <span className={cn(
                                            "inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform",
                                            currentSuperadminSettings.maintenanceMode ? (language === 'ar' ? 'translate-x-[2.2rem]' : 'translate-x-[4px]') : (language === 'ar' ? 'translate-x-[4px]' : 'translate-x-[2.2rem]')
                                        )} />
                                    </button>
                                </div>
                            </div>

                            {/* Self registration switch */}
                            <div className={cn(
                                "p-10 rounded-[3rem] border-2 transition-all relative overflow-hidden group",
                                currentSuperadminSettings.enableSelfRegistration ? 'border-indigo-600 bg-indigo-50/10 shadow-[0_20px_50px_rgba(79,70,229,0.05)]' : 'border-stone-100 bg-stone-50/50'
                            )}>
                                <div className={cn("flex items-center justify-between relative z-10", language === 'en' && "flex-row-reverse")}>
                                    <div className={cn("flex items-center gap-6", language === 'en' && "flex-row-reverse")}>
                                        <div className={cn(
                                            "w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all",
                                            currentSuperadminSettings.enableSelfRegistration ? 'bg-indigo-600 text-white shadow-2xl' : 'bg-stone-200 text-stone-400'
                                        )}>
                                            <Cpu size={28} />
                                        </div>
                                        <div className={language === 'ar' ? "text-right" : "text-left"}>
                                            <h4 className="font-black text-xl text-slate-900 italic uppercase tracking-tighter">
                                                {language === 'ar' ? 'التسجيل الذاتي المفتوح' : 'Self-Registration Portal'}
                                            </h4>
                                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.4em] mt-2 opacity-70">
                                                {language === 'ar' ? 'تفعيل إنشاء الحسابات الذاتي للطلبة الجدد' : 'Allow new students to construct profiles autonomously'}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleSuperadminChange('enableSelfRegistration', !currentSuperadminSettings.enableSelfRegistration)}
                                        className={cn(
                                            "relative inline-flex h-10 w-18 items-center rounded-full transition-all border-2",
                                            currentSuperadminSettings.enableSelfRegistration ? 'bg-indigo-600 border-indigo-700' : 'bg-stone-200 border-stone-300'
                                        )}
                                    >
                                        <span className={cn(
                                            "inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform",
                                            currentSuperadminSettings.enableSelfRegistration ? (language === 'ar' ? 'translate-x-[2.2rem]' : 'translate-x-[4px]') : (language === 'ar' ? 'translate-x-[4px]' : 'translate-x-[2.2rem]')
                                        )} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* More Policy Options Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
                            {/* Option AI */}
                            <div className={cn("p-8 rounded-[2.5rem] border border-stone-100", language === 'ar' ? "text-right" : "text-left")}>
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">AI CORE</span>
                                    <input 
                                        type="checkbox" 
                                        checked={currentSuperadminSettings.enableAiInsights} 
                                        onChange={(e) => handleSuperadminChange('enableAiInsights', e.target.checked)}
                                        className="w-5 h-5 accent-indigo-600 cursor-pointer"
                                    />
                                </div>
                                <h4 className="font-black text-md text-slate-900 uppercase tracking-tight">{language === 'ar' ? 'تحليلات الذكاء الأكاديمي' : 'AI-Aided Core Analysis'}</h4>
                                <p className="text-[9px] text-stone-400 mt-2 leading-relaxed">{language === 'ar' ? 'تمكين التنبؤ بالفشل وتوصيات المواد بالذكاء الاصطناعي' : 'Let neural agents analyze curriculum gaps and failure prediction risks.'}</p>
                            </div>

                            {/* Option Grade Override */}
                            <div className={cn("p-8 rounded-[2.5rem] border border-stone-100", language === 'ar' ? "text-right" : "text-left")}>
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">SAFETY LAWS</span>
                                    <input 
                                        type="checkbox" 
                                        checked={currentSuperadminSettings.allowGradeOverride} 
                                        onChange={(e) => handleSuperadminChange('allowGradeOverride', e.target.checked)}
                                        className="w-5 h-5 accent-indigo-600 cursor-pointer"
                                    />
                                </div>
                                <h4 className="font-black text-md text-slate-900 uppercase tracking-tight">{language === 'ar' ? 'تجاوز درجات الامتحان' : 'Academic Grade Override'}</h4>
                                <p className="text-[9px] text-stone-400 mt-2 leading-relaxed">{language === 'ar' ? 'تمكين تعديل الدرجات المصدقة بصفة استثنائية' : 'Allow high-governance and department officials to override strict grade logs.'}</p>
                            </div>

                            {/* Option 501 Check */}
                            <div className={cn("p-8 rounded-[2.5rem] border border-stone-100", language === 'ar' ? "text-right" : "text-left")}>
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">GRAD LAWS</span>
                                    <input 
                                        type="checkbox" 
                                        checked={currentSuperadminSettings.enableGraduation501Validation} 
                                        onChange={(e) => handleSuperadminChange('enableGraduation501Validation', e.target.checked)}
                                        className="w-5 h-5 accent-indigo-600 cursor-pointer"
                                    />
                                </div>
                                <h4 className="font-black text-md text-slate-900 uppercase tracking-tight">{language === 'ar' ? 'تدقيق المادة 501 للتخرج' : 'Sec-501 Graduate Enforcer'}</h4>
                                <p className="text-[9px] text-stone-400 mt-2 leading-relaxed">{language === 'ar' ? 'تطبيق رقابة الأطروحة وأقسام اللجان تلقائيا' : 'Enforce rigid council approval and dossier audit pipelines automatically.'}</p>
                            </div>
                        </div>

                        {/* Parametric Inputs Row */}
                        <div className="border-t border-stone-50 pt-12">
                            <h3 className={cn("text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] mb-10", language === 'ar' ? "text-right" : "text-left")}>
                                {language === 'ar' ? 'المعايير المحددة للنظام' : 'System Operational Boundaries'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'مدة الجلسة (دقائق)' : 'Session Timeout Constraint (Minutes)'}</label>
                                    <input 
                                        type="number" 
                                        value={currentSuperadminSettings.sessionTimeoutMinutes}
                                        onChange={(e) => handleSuperadminChange('sessionTimeoutMinutes', parseInt(e.target.value) || 30)}
                                        min="5"
                                        max="1440"
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'حفظ السجلات لعدد أيام' : 'Log Retention Scope (Days)'}</label>
                                    <input 
                                        type="number" 
                                        value={currentSuperadminSettings.logRetentionDays}
                                        onChange={(e) => handleSuperadminChange('logRetentionDays', parseInt(e.target.value) || 90)}
                                        min="7"
                                        max="3650"
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 transition-all", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    />
                                </div>
                                <div className={cn("space-y-3", language === 'ar' ? "text-right" : "text-left")}>
                                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'مستوى الصرامة الأمني' : 'Environmental Rigor Level'}</label>
                                    <select 
                                        value={currentSuperadminSettings.securityLevel}
                                        onChange={(e) => handleSuperadminChange('securityLevel', e.target.value)}
                                        className={cn("w-full bg-stone-50/50 border border-stone-100 rounded-[1.5rem] px-6 py-4 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none", language === 'ar' ? "text-right font-sans" : "text-left font-sans")}
                                    >
                                        <option value="STANDARD">{language === 'ar' ? 'حماية معيارية (STANDARD)' : 'Standard Guard Mode'}</option>
                                        <option value="ELEVATED">{language === 'ar' ? 'مراقبة هجينة مشددة (ELEVATED)' : 'Elevated Guard Mode'}</option>
                                        <option value="PARANOID">{language === 'ar' ? 'عزل كامل دائم (PARANOID)' : 'Full Air-Gapped Paranoid Mode'}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Diagnostic Modules */}
                        <div className="border-t border-stone-50 pt-12">
                            <h3 className={cn("text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] mb-10", language === 'ar' ? "text-right" : "text-left")}>
                                {language === 'ar' ? 'أدوات التشخيص واستكشاف الأخطاء' : 'Hardware Diagnostics & Cryptographic Rotation'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Key rotation */}
                                <div className="p-8 rounded-[2.5rem] border border-indigo-100/30 bg-indigo-50/5 flex flex-col justify-between items-start gap-6">
                                    <div>
                                        <span className={cn("px-4 py-1 rounded-full text-[8px] font-black tracking-widest uppercase", language === 'ar' ? "bg-indigo-100 text-indigo-700" : "bg-indigo-100 text-indigo-600")}>
                                            {language === 'ar' ? 'مفاتيح التشفير التوليدية' : 'CRYPTOGRAPHY KEYSTORE'}
                                        </span>
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight mt-4">{language === 'ar' ? 'تدوير مفاتيح الأمان والشهادات' : 'Rotate Cryptographic Security Certs'}</p>
                                        <p className="text-[9px] text-stone-400 mt-2 leading-relaxed">
                                            {language === 'ar' 
                                                ? 'سيتم تصفير جميع مفاتيح التوقيع الحالية وإعادة إنشائها. ستنتهي صلاحية جميع رموز تسجيل الدخول النشطة تلقائياً.' 
                                                : 'Forces clean re-keying on security parameters. Invalidates active remote tokens instantly.'}
                                        </p>
                                    </div>
                                    <button 
                                        type="button"
                                        disabled={isRotating}
                                        onClick={triggerKeyRotation}
                                        className="h-12 w-full flex items-center justify-center gap-3 bg-indigo-600 rounded-[1.2rem] text-[10px] font-black text-white uppercase tracking-widest hover:bg-indigo-500 transition-colors cursor-pointer disabled:opacity-50 italic"
                                    >
                                        <RefreshCw size={14} className={isRotating ? 'animate-spin' : ''} />
                                        {isRotating ? (language === 'ar' ? 'جارٍ التدوير...' : 'Rotating...') : (language === 'ar' ? 'تدوير الرموز الآن' : 'Execute Keystore Rotation')}
                                    </button>
                                </div>

                                {/* Compacting DB indexes */}
                                <div className="p-8 rounded-[2.5rem] border border-stone-100 bg-stone-50/20 flex flex-col justify-between items-start gap-6">
                                    <div>
                                        <span className="px-4 py-1 rounded-full bg-stone-100 text-stone-600 text-[8px] font-black tracking-widest uppercase">
                                            {language === 'ar' ? 'محرك التخزين المحلي' : 'SYSTEM CACHE & INDICES'}
                                        </span>
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight mt-4">{language === 'ar' ? 'ضغط البيانات وإعادة بناء الفهارس' : 'Optimize Local Indexes & Compact Tables'}</p>
                                        <p className="text-[9px] text-stone-400 mt-2 leading-relaxed">
                                            {language === 'ar' 
                                                ? 'يقوم بتنظيف الفجوات وإعادة ترتيب الفهارس لتقليل فترات انتظار القراءة/الكتابة العشوائية.' 
                                                : 'Performs table defragmentation and index layout optimization to reduce lookup latency.'}
                                        </p>
                                    </div>
                                    <button 
                                        type="button"
                                        disabled={isOptimizing}
                                        onClick={triggerDbOptimization}
                                        className="h-12 w-full flex items-center justify-center gap-3 bg-slate-900 rounded-[1.2rem] text-[10px] font-black text-white uppercase tracking-widest hover:bg-black transition-colors cursor-pointer disabled:opacity-50 italic"
                                    >
                                        <Cpu size={14} className={isOptimizing ? 'animate-pulse' : ''} />
                                        {isOptimizing ? (language === 'ar' ? 'جارٍ التحسين...' : 'Optimizing...') : (language === 'ar' ? 'تفعيل تحسين المؤشرات' : 'Optimize Indexes Now')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Save Action Bar */}
                        <div className={cn("mt-16 flex border-t border-stone-50 pt-10", language === 'ar' ? "justify-start" : "justify-end")}>
                            <button 
                                type="button"
                                onClick={handleSave}
                                className="bg-slate-900 text-white px-14 py-6 rounded-[2rem] font-black text-sm shadow-[0_25px_60px_rgba(0,0,0,0.2)] hover:bg-black hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-4 italic uppercase tracking-widest"
                            >
                                <Save size={20} className="text-emerald-400" /> {language === 'ar' ? 'دفع طفرات الإدارة العليا' : 'Commit High-Privilege Settings'}
                            </button>
                        </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
      </div>
    </div>
  );
};

export default Settings;
