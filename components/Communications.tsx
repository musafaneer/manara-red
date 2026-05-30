
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getStudents, saveStudent, getSystemSettings } from '../services/storageService';
import { calculateBalance } from '../services/financeService';
import { logBroadcast, getBroadcastHistory, BroadcastLog, getCohortLabel, addSystemNotification } from '../services/communicationService';
import { Student, StudentNotification, ProgramType, StudentStatus, UserRole, NotificationType } from '../types';
import { 
  Bell, Send, Users, CreditCard, ClipboardCheck, AlertCircle, 
  CheckCircle, Info, History, Trash2, Mail, MessageSquare, 
  Sparkles, ShieldAlert, GraduationCap, ArrowRight, Eye, Layers,
  ChevronLeft
} from 'lucide-react';
import { notifySuccess, notifyError } from '../services/notificationService';
import { logAction } from '../services/auditService';
import { getCurrentUser } from '../services/authService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TargetCohort = 'UNPAID' | 'UNREGISTERED' | 'CRITICAL' | 'EXCELLENT' | 'ALL';

import { Language } from '../services/i18nService';

interface CommunicationsProps {
    language?: Language;
}

const Communications: React.FC<CommunicationsProps> = ({ language = 'ar' }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [targetType, setTargetType] = useState<TargetCohort>('UNPAID');
    const [template, setTemplate] = useState<'TUITION' | 'REGISTRATION' | 'ACADEMIC_WARNING' | 'HONOR' | 'CUSTOM'>('TUITION');
    const [customTitle, setCustomTitle] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState<BroadcastLog[]>([]);
    
    const settings = getSystemSettings();
    const currentUser = getCurrentUser();

    useEffect(() => {
        setStudents(getStudents());
        setHistory(getBroadcastHistory());
    }, []);

    const getTargetStudents = () => {
        return students.filter(s => {
            if (s.status === StudentStatus.GRADUATED || s.status === StudentStatus.WITHDRAWN) return false;
            
            if (targetType === 'UNPAID') return calculateBalance(s.id) > 0;
            if (targetType === 'UNREGISTERED') {
                const isEnrolled = s.enrollments?.some(e => e.semester === settings.currentSemester);
                return !isEnrolled;
            }
            if (targetType === 'CRITICAL') return s.warningsCount >= 2;
            if (targetType === 'EXCELLENT') return s.gpa >= 85;
            return true;
        });
    };
    const [showStudentsList, setShowStudentsList] = useState(false);

    const targetStudents = getTargetStudents();

    // Auto-update message based on template
    useEffect(() => {
        if (template === 'TUITION') {
            setCustomTitle('تذكير بسداد الرسوم الدراسية');
            setCustomMessage(`نود تذكيركم بضرورة سداد الرسوم المتأخرة لتجنب إيقاف القيد. يرجى مراجعة القسم المالي للفصل الدراسي الحالي: ${settings.currentSemester}`);
        } else if (template === 'REGISTRATION') {
            setCustomTitle('تذكير بموعد تنزيل المواد');
            setCustomMessage(`يرجى التوجه للبوابة الإلكترونية لإتمام عملية تنزيل المواد قبل انتهاء المهلة المحددة (${settings.registrationDeadline}). الفصل: ${settings.currentSemester}`);
        } else if (template === 'ACADEMIC_WARNING') {
            setCustomTitle('تنبيه: وضعية أكاديمية حرجة');
            setCustomMessage('بناءً على نتائجك الأخير، نود إخطارك بأنك تجاوزت الحد المسموح به من الإنذارات. يرجى مراجعة المرشد الأكاديمي فوراً لتجنب الفصل النهائي حسب المادة 46 من اللائحة 501.');
        } else if (template === 'HONOR') {
            setCustomTitle('تهنئة: التميز الأكاديمي');
            setCustomMessage('بكل فخر واعتزاز، تبارك لك إدارة الكلية حصولك على معدل متميز يضعك ضمن لوحة الشرف لهذا الفصل. استمر في هذا العطاء!');
        }
    }, [template, settings.currentSemester, settings.registrationDeadline]);

    const handleSendBroadcast = async () => {
        if (targetStudents.length === 0) {
            notifyError('لا يوجد طلاب مستهدفون لهذه الفئة حالياً');
            return;
        }

        if (!customTitle || !customMessage) {
            notifyError('يرجى كتابة عنوان ورسالة التنبيه');
            return;
        }

        if (!confirm(`هل أنت متأكد من إرسال هذا التنبيه إلى ${targetStudents.length} طالب؟`)) return;

        setSending(true);

        // Simulate high-volume sending delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        const broadcastId = `BC-${Date.now()}`;

        targetStudents.forEach(s => {
            const notification: StudentNotification = {
                id: `NTF-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                title: customTitle,
                message: customMessage,
                date: new Date().toISOString(),
                type: template === 'ACADEMIC_WARNING' ? 'ALERT' : 'INFO',
                channel: 'PORTAL'
            };

            const updatedStudent = {
                ...s,
                notifications: [notification, ...(s.notifications || [])]
            };
            saveStudent(updatedStudent);
        });

        // 2. Add as a System Notification for the dashboard display
        addSystemNotification({
            title: customTitle,
            message: customMessage,
            type: template === 'ACADEMIC_WARNING' ? NotificationType.DEADLINE : NotificationType.SYSTEM,
            targetRole: UserRole.STUDENT
        });

        const logEntry: BroadcastLog = {
            id: broadcastId,
            title: customTitle,
            message: customMessage,
            targetCohort: getCohortLabel(targetType),
            recipientCount: targetStudents.length,
            timestamp: new Date().toISOString(),
            sender: currentUser?.name || 'النظام'
        };

        logBroadcast(logEntry);
        setHistory(getBroadcastHistory());
        
        logAction('إرسال تعميم ذكي', `تم إرسال تعميم "${customTitle}" إلى فئة ${getCohortLabel(targetType)} (${targetStudents.length} طالب)`, 'info', currentUser?.name);
        notifySuccess(`تم بنجاح إرسال ${targetStudents.length} تنبيه`);
        
        setSending(false);
        if (template === 'CUSTOM') {
            setCustomTitle('');
            setCustomMessage('');
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Bell size={28} />
                        </div>
                        مركز الاتصال والتعميمات الذكي
                    </h2>
                    <p className="text-slate-500 font-medium">استهداف دقيق للطلاب بناءً على السجل الأكاديمي والمالي</p>
                </div>
                <div className="flex gap-4">
                     <div className="bg-indigo-50 px-8 py-3 rounded-2xl border border-indigo-100 flex items-center gap-3 shadow-sm">
                         <Users size={20} className="text-indigo-600" />
                         <span className="text-sm font-black text-indigo-700 uppercase tracking-widest">الطلاب النشطون: {students.filter(s => s.status === StudentStatus.ACTIVE).length}</span>
                     </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* 1. Segmentation Panel */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 p-10">
                        <h3 className="font-black text-xl text-slate-800 mb-8 flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Layers size={22} />
                            </div>
                            تحديد الشريحة المستهدفة
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <CohortButton 
                                active={targetType === 'UNPAID'} 
                                onClick={() => setTargetType('UNPAID')}
                                icon={CreditCard} 
                                label="مطالبات مالية"
                                count={students.filter(s => calculateBalance(s.id) > 0).length}
                                color="red"
                            />
                            <CohortButton 
                                active={targetType === 'UNREGISTERED'} 
                                onClick={() => setTargetType('UNREGISTERED')}
                                icon={ClipboardCheck} 
                                label="متأخرات القيد"
                                count={students.filter(s => !s.enrollments?.some(e => e.semester === settings.currentSemester)).length}
                                color="amber"
                            />
                            <CohortButton 
                                active={targetType === 'CRITICAL'} 
                                onClick={() => setTargetType('CRITICAL')}
                                icon={ShieldAlert} 
                                label="مخاطر قانونية"
                                count={students.filter(s => s.warningsCount >= 2).length}
                                color="purple"
                            />
                            <CohortButton 
                                active={targetType === 'EXCELLENT'} 
                                onClick={() => setTargetType('EXCELLENT')}
                                icon={GraduationCap} 
                                label="لوحة الشرف"
                                count={students.filter(s => s.gpa >= 85).length}
                                color="emerald"
                            />
                        </div>

                        <div className="mt-12 pt-12 border-t border-slate-100 space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                        <MessageSquare size={22} />
                                    </div>
                                    محتوى الرسالة
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: 'TUITION', label: 'رسوم' },
                                        { id: 'REGISTRATION', label: 'قيد' },
                                        { id: 'ACADEMIC_WARNING', label: 'إنذار' },
                                        { id: 'HONOR', label: 'شكر' },
                                        { id: 'CUSTOM', label: 'مخصص' }
                                    ].map(t => (
                                        <button 
                                            key={t.id}
                                            onClick={() => setTemplate(t.id as any)}
                                            className={cn(
                                                "px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
                                                template === t.id 
                                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-105' 
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                            )}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">عنوان التنبيه</label>
                                    <input 
                                        type="text" 
                                        value={customTitle}
                                        onChange={e => setCustomTitle(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[20px] px-6 py-4 text-sm font-black text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="اكتب عنواناً جذاباً..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">نص الرسالة</label>
                                    <textarea 
                                        value={customMessage}
                                        onChange={e => setCustomMessage(e.target.value)}
                                        rows={4}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[24px] px-6 py-4 text-sm font-bold text-slate-600 leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                        placeholder="اكتب محتوى الرسالة بالتفصيل..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-10">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">المستهدفون حالياً ({targetStudents.length})</p>
                                <button 
                                    onClick={() => setShowStudentsList(!showStudentsList)}
                                    className="text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                    <Users size={12} />
                                    {showStudentsList ? 'إخفاء القائمة' : 'عرض قائمة المستهدفين'}
                                </button>
                            </div>
                            
                            <AnimatePresence>
                                {showStudentsList && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden mb-6 bg-slate-50 rounded-2xl border border-slate-200"
                                    >
                                        <div className="p-4 max-h-48 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {targetStudents.length > 0 ? targetStudents.map(s => (
                                                <div key={s.id} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600 shrink-0">
                                                        {s.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black text-slate-800 truncate">{s.name}</p>
                                                        <p className="text-[8px] font-bold text-slate-400 truncate">{s.id}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="col-span-2 text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    لا يوجد طلاب في هذه الشريحة
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button 
                                onClick={handleSendBroadcast}
                                disabled={sending || targetStudents.length === 0}
                                className="w-full bg-indigo-600 text-white py-5 rounded-[24px] font-black text-xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-4 active:scale-95"
                            >
                                {sending ? (
                                    <>
                                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                        جاري التواصل مع الطلاب...
                                    </>
                                ) : (
                                    <>
                                        <Send size={24} />
                                        إرسال التنبيه ({targetStudents.length} طالب)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    {/* 2. Broadcast History */}
                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                                    <History size={20} className="text-slate-400" />
                                </div>
                                سجل التعميمات الأخيرة
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto no-scrollbar">
                            <AnimatePresence mode="popLayout">
                                {history.length > 0 ? history.map(log => (
                                    <motion.div 
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        key={log.id} 
                                        className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                                                <Mail size={22} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 text-base">{log.title}</h4>
                                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                                    إلى: <span className="text-indigo-600">{log.targetCohort}</span> • بواسطة: {log.sender}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-2 inline-block uppercase tracking-widest">{log.recipientCount} مستلم</p>
                                            <p className="text-[10px] text-slate-400 font-black font-mono">{new Date(log.timestamp).toLocaleDateString('ar-LY')}</p>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div className="py-20 text-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                            <History size={40} className="text-slate-200" />
                                        </div>
                                        <p className="font-black text-slate-400 text-lg">لا يوجد سجل إرسال سابق</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* 3. Live Preview & Stats */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
                            <Sparkles size={160} />
                        </div>
                        <h4 className="font-black text-2xl mb-8 flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <Eye className="text-indigo-400" size={22} />
                            </div>
                            معاينة البث
                        </h4>
                        
                        <div className="bg-white/5 backdrop-blur-xl rounded-[32px] p-8 border border-white/10 relative z-10 shadow-2xl">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-[#C74634] rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-red-500/20">أ</div>
                                <div>
                                    <p className="text-xs font-black text-[#fca5a5] uppercase tracking-widest">بوابة أوراكل كامبس</p>
                                    <p className="text-[10px] text-slate-500 font-bold">منذ قليل</p>
                                </div>
                            </div>
                            <h5 className="font-black text-lg mb-3 tracking-tight">{customTitle || 'عنوان التنبيه يظهر هنا'}</h5>
                            <p className="text-sm text-slate-400 leading-relaxed line-clamp-4 font-medium">
                                {customMessage || 'اكتب رسالتك لترى كيف ستظهر للطلاب في حساباتهم الشخصية.'}
                            </p>
                        </div>

                        <div className="mt-10 flex items-center justify-between border-t border-white/5 pt-8">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">تغطية الجمهور</p>
                                <p className="text-4xl font-black text-indigo-400 font-mono tracking-tighter">%{students.length > 0 ? Math.round((targetStudents.length / students.length) * 100) : 0}</p>
                            </div>
                            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                                <ArrowRight className="text-white" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 p-10">
                        <h3 className="font-black text-slate-800 text-lg mb-8 flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Info size={18} />
                            </div>
                            ملاحظات إدارية
                        </h3>
                        <div className="space-y-6">
                            <AdminTip text="تنبيهات بوابة الطالب تظهر فوراً في الإشعارات الجانبية." />
                            <AdminTip text="يتم تسجيل كافة عمليات البث في سجل التدقيق لضمان الشفافية." />
                            <AdminTip text="الطلاب في حالة 'تخرج' أو 'انسحاب' مستبعدون تلقائياً من البث العام." />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CohortButton = ({ active, onClick, icon: Icon, label, count, color }: any) => (
    <motion.button 
        whileHover={{ y: -5 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
            "p-6 rounded-[32px] border-2 flex flex-col items-center gap-4 transition-all relative overflow-hidden",
            active 
            ? 'border-indigo-600 bg-indigo-50/30 shadow-xl shadow-indigo-100' 
            : 'border-slate-100 hover:border-slate-200 bg-white text-slate-500'
        )}
    >
        <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm",
            color === 'red' ? (active ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-rose-50 text-rose-500') :
            color === 'amber' ? (active ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-amber-50 text-amber-500') :
            color === 'purple' ? (active ? 'bg-purple-500 text-white shadow-purple-200' : 'bg-purple-50 text-purple-500') :
            (active ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-emerald-50 text-emerald-500')
        )}>
            <Icon size={28} />
        </div>
        <div className="text-center">
            <p className={cn(
                "text-[10px] font-black uppercase tracking-widest mb-1",
                active ? 'text-indigo-700' : 'text-slate-400'
            )}>{label}</p>
            <p className={cn(
                "text-2xl font-black font-mono tracking-tighter",
                active ? 'text-slate-900' : 'text-slate-700'
            )}>{count}</p>
        </div>
        {active && (
            <motion.div 
                layoutId="active-indicator"
                className="absolute top-3 left-3 w-2 h-2 bg-indigo-600 rounded-full"
            />
        )}
    </motion.button>
);

const AdminTip = ({ text }: { text: string }) => (
    <div className="flex gap-4 items-start p-5 bg-slate-50/50 rounded-3xl border border-slate-100 transition-colors hover:bg-slate-50">
        <div className="mt-1.5 w-2 h-2 bg-indigo-400 rounded-full shrink-0 shadow-[0_0_8px_rgba(129,140,248,0.5)]"></div>
        <p className="text-xs text-slate-600 leading-relaxed font-bold">{text}</p>
    </div>
);

export default Communications;

