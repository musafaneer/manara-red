import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Clock, TrendingUp, Wallet, 
    CheckCircle2, Fingerprint, X, ShieldCheck,
    BookOpen, Award, FileText, UserPlus, 
    Calendar, ClipboardList, MessageSquare, ListTodo,
    History, ExternalLink, GraduationCap, Microscope,
    Scale, Archive, FileBadge, FileQuestion, ArrowUpRight
} from 'lucide-react';
import { 
    AuthUser, Student, Grade, ThesisStatus, 
    GraduateThesis, ResearchPublication, StudentStatus 
} from '../types';
import { verificationService } from '../services/verificationService';
import { academicService } from '../services/academicService';
import { Language } from '../services/i18nService';
import { cn } from '../lib/utils';
import { getStudentGrades } from '../services/gradesService';
import { getThesisByStudent, getPublicationsByStudent } from '../services/graduateService';
import { getRequests, getRequestTypeLabel } from '../services/requestService';

interface DossierContentProps {
    language: Language;
    student: any; // Can be AuthUser or Student record
    isAdminView?: boolean;
    setActiveTab?: (tab: string) => void;
}

type TabKey = 'summary' | 'academics' | 'grades' | 'research' | 'mentorship' | 'timeline' | 'dossier';

const TabButton = ({ id, active, label, icon: Icon, onClick, language }: any) => (
    <button
        onClick={() => onClick(id)}
        className={cn(
            "flex items-center gap-3 px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden italic",
            active 
                ? "bg-indigo-600 text-white shadow-xl scale-[1.02]" 
                : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-100"
        )}
    >
        <Icon size={16} className={cn(active ? "text-indigo-200" : "text-slate-300")} />
        {label}
    </button>
);

const StatCardV2 = ({ label, value, icon: Icon, color, delay, language }: any) => {
    const isAr = language !== 'en';
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.8 }}
            className={cn(
                "p-8 rounded-[2.5rem] flex items-center justify-between group cursor-pointer transition-all hover:scale-[1.02]",
                color === 'green' ? 'bg-[#ecfdf5]' : 
                color === 'cyan' ? 'bg-[#f0fdfa]' : 
                color === 'purple' ? 'bg-[#f5f3ff]' : 
                'bg-[#eff6ff]'
            )}
        >
            <div className="space-y-4">
                <p className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    color === 'green' ? 'text-emerald-500' : 
                    color === 'cyan' ? 'text-teal-600' : 
                    color === 'purple' ? 'text-violet-600' : 
                    'text-blue-600'
                )}>{label}</p>
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {isAr ? value.toString().replace('%', '٪') : value}
                </p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm group-hover:shadow-md transition-shadow">
                <Icon className={cn(
                    "w-8 h-8",
                     color === 'green' ? 'text-emerald-500' : 
                     color === 'cyan' ? 'text-teal-600' : 
                     color === 'purple' ? 'text-violet-600' : 
                     'text-blue-600'
                )} />
            </div>
        </motion.div>
    );
};

const DossierContent: React.FC<DossierContentProps> = ({ language, student, isAdminView = false, setActiveTab: onNavigateToTab }) => {
    const [activeTab, setActiveTab] = useState<TabKey>('summary');
    const isAr = language !== 'en';

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <FileText size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-black uppercase tracking-widest">{isAr ? 'بيانات الطالب غير متوفرة' : 'No student data available'}</p>
            </div>
        );
    }

    // Data simulation (in real app, this would be fetched based on student.id)
    const grades: Grade[] = student.grades || getStudentGrades(student.id) || [];
    const thesis: GraduateThesis | undefined = getThesisByStudent(student.id);
    const publications: ResearchPublication[] = getPublicationsByStudent(student.id);

    const isPostgrad = student.graduateLevel || (thesis !== undefined);

    const tabs = [
        { id: 'summary', label: isAr ? 'الملخص' : 'Summary', icon: ClipboardList },
        { id: 'academics', label: isAr ? 'الخطة الدراسية' : 'Academic Plan', icon: ListTodo },
        { id: 'grades', label: isAr ? 'سجل الدرجات' : 'Transcript', icon: FileText },
        { id: 'dossier', label: isAr ? 'التوثيق القانوني' : 'Legal Dossier', icon: Scale },
        ...(isPostgrad ? [{ id: 'research', label: isAr ? 'البحث العلمي' : 'Research Node', icon: Microscope }] : []),
        { id: 'mentorship', label: isAr ? 'الإرشاد الأكاديمي' : 'Mentorship', icon: MessageSquare },
        { id: 'timeline', label: isAr ? 'الخط الزمني' : 'Timeline', icon: History },
    ];

    const renderDossier = () => (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Physical Archival Tracking */}
                <div className="bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter mb-10 flex items-center gap-4 text-slate-800">
                        <Archive className="text-indigo-600" />
                        {isAr ? 'الأرشفة المركزية (الأصل الورقي)' : 'Central Archive Tracking'}
                    </h3>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Archive Ref ID</p>
                                <p className="font-mono font-black text-slate-700">{student.dossierMetadata?.archiveId || 'N/A'}</p>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Box / Rack Location</p>
                                <p className="font-mono font-black text-slate-700">{student.dossierMetadata?.boxNumber || 'UNCATEGORIZED'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-6 bg-indigo-600/5 rounded-3xl border border-indigo-100">
                             <FileBadge className="text-indigo-600 shrink-0" />
                             <p className="text-[10px] font-bold text-indigo-900 leading-tight">
                                {isAr 
                                    ? "ملاحظة: السند القانوني الأهم هو شهادة الثانوية الأصلية المودعة في الأرشيف المركزي."
                                    : "Advisory: The original High School diploma is the primary legal instrument stored in the central vault."}
                             </p>
                        </div>
                    </div>
                </div>

                {/* Audit & Verification Checks */}
                <div className="bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter mb-10 flex items-center gap-4 text-slate-800">
                        <ShieldCheck className="text-emerald-500" />
                        {isAr ? 'فحص المطابقة الإجرائية' : 'Procedural Compliance Audit'}
                    </h3>
                    <div className="space-y-4">
                        {[
                            { label: isAr ? 'الشهادة الأصلية' : 'Original Certificate', ok: student.dossierMetadata?.originalDocumentsVerified },
                            { label: isAr ? 'كشف طبي معتمد' : 'Medical Fitness Cert', ok: true },
                            { label: isAr ? 'براءة ذمة مالية' : 'Financial Clearance', ok: student.financialBalance === 0 },
                            { label: isAr ? 'المطابقة الوطنية' : 'Registry Match', ok: true },
                        ].map((check, idx) => (
                            <div key={idx} className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl group transition-all hover:bg-white hover:shadow-sm">
                                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wide">{check.label}</span>
                                {check.ok ? (
                                    <CheckCircle2 size={20} className="text-emerald-500" />
                                ) : (
                                    <X size={20} className="text-rose-500" />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100">
                         <div className="p-6 bg-slate-900 rounded-3xl text-white">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 font-mono">Digital Record Hash (Security Fingerprint)</p>
                            <p className="text-[10px] font-mono break-all opacity-80">{student.verificationHash || verificationService.generateVerificationHash(student)}</p>
                         </div>
                    </div>
                </div>
            </div>

            {/* Clearance Roadmap (Libyan Procedure Integration) */}
            <div className="bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm">
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-10 flex items-center gap-4 text-slate-800">
                    <ListTodo className="text-amber-500" />
                    {isAr ? 'مسار براءة الذمة (دورة التخرج)' : 'Clearance Roadmap (Graduation Cycle)'}
                </h3>
                <div className="relative">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 z-0" />
                    <div className="flex justify-between relative z-10">
                        {['LIBRARY', 'FINANCE', 'LABS', 'DEPARTMENT', 'REGISTRAR', 'COMPLETED'].map((stage, idx) => {
                            const isCompleted = student.clearance?.completedStages.includes(stage) || student.clearance?.currentStage === 'COMPLETED';
                            const isCurrent = student.clearance?.currentStage === stage;
                            
                            return (
                                <div key={stage} className="flex flex-col items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all",
                                        isCompleted ? "bg-emerald-500 border-white text-white shadow-lg shadow-emerald-200" :
                                        isCurrent ? "bg-white border-indigo-500 text-indigo-600 scale-125" :
                                        "bg-white border-slate-200 text-slate-300"
                                    )}>
                                        {isCompleted ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-black">{idx + 1}</span>}
                                    </div>
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-widest text-center max-w-[60px]",
                                        isCurrent ? "text-indigo-600" : "text-slate-400"
                                    )}>
                                        {stage}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Council Resolutions Linked to Student */}
            <div className="bg-slate-900 text-white rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.05] rotate-12">
                     <Scale size={200} />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-10 relative z-10">
                    {isAr ? 'سجل قرارات المجالس العلمية' : 'Scientific Council Decisions Log'}
                </h3>
                <div className="space-y-4 relative z-10">
                    {student.grades?.filter((g: any) => g.resolutionId).map((g: any, i: number) => (
                        <div key={i} className="p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 flex justify-between items-center group hover:bg-white/20 transition-all">
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">{isAr ? 'تعديل درجة' : 'GRADE REVISION'}</p>
                                <p className="text-lg font-black italic">{g.courseName}</p>
                                <p className="text-[10px] text-white/50 font-bold uppercase">RESOLUTION REF: {g.resolutionId}</p>
                             </div>
                             <div className="text-right">
                                <Scale size={24} className="text-indigo-400 opacity-50 mb-2" />
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">EXECUTED</p>
                             </div>
                        </div>
                    ))}
                    {!student.grades?.some((g: any) => g.resolutionId) && (
                        <div className="py-12 text-center opacity-30 italic">
                             <p className="text-xs font-bold uppercase tracking-widest">{isAr ? 'لا توجد قرارات مجلس مرتبطة بهذا السجل' : 'No council resolutions linked to this record node'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderSummary = () => (
        <div className="space-y-12">
            {/* Top Grid Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-8">
                <StatCardV2 
                    label={isAr ? 'رصيد المحفظة' : 'Wallet Balance'} 
                    value={student.financialBalance || "0"} 
                    icon={Wallet} 
                    color="green" 
                    delay={0.1}
                    language={language}
                />
                <StatCardV2 
                    label={isAr ? 'حالة القيد' : 'Enrollment Status'} 
                    value={student.status || (isAr ? 'نشط' : 'Active')} 
                    icon={CheckCircle2} 
                    color="cyan" 
                    delay={0.2}
                    language={language}
                />
                <StatCardV2 
                    label={isAr ? 'الإنجاز الأكاديمي' : 'Merit Progress'} 
                    value={`${((student.creditsEarned || 0) / 132 * 100).toFixed(1)}%`} 
                    icon={TrendingUp} 
                    color="purple" 
                    delay={0.3}
                    language={language}
                />
                <StatCardV2 
                    label={isAr ? 'المعدل التراكمي' : 'Cumulative Score'} 
                    value={`${student.gpa || 78.5}%`} 
                    icon={TrendingUp} 
                    color="blue" 
                    delay={0.4}
                    language={language}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
                {/* Completion Gauge */}
                <div className="xl:col-span-4 bg-white p-12 rounded-[4rem] border border-stone-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="96"
                                cy="96"
                                r="80"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                className="text-slate-50"
                            />
                            <motion.circle
                                cx="96"
                                cy="96"
                                r="80"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={`${2 * Math.PI * 80}`}
                                initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - (student.creditsEarned || 33) / 132) }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="text-indigo-600 transition-all stroke-round shadow-lg"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-2xl md:text-3xl font-bold text-slate-900 leading-none">
                                {language === 'ar' ? `${Math.round((student.creditsEarned || 33) / 132 * 100)}٪` : `${Math.round((student.creditsEarned || 33) / 132 * 100)}%`}
                            </span>
                             <span className="text-[10px] font-black text-slate-400 mt-2">
                                {student.creditsEarned || 33} / 132
                            </span>
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">{language === 'ar' ? 'التراكم الدراسي المعتمد' : 'CERTIFIED CREDIT ACCUMULATION'}</p>
                </div>

                {/* Mentor / Supervisor Focus */}
                <div className="xl:col-span-8 bg-slate-50 rounded-[4rem] p-12 text-slate-900 shadow-sm border border-slate-100 relative overflow-hidden group">
                     <div className="flex justify-between items-start mb-12">
                        <div className="space-y-4">
                             <div className="bg-indigo-600 text-white px-6 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex italic">
                                {language === 'ar' ? 'فريق الإشراف الأكاديمي' : 'Assigned Supervisory Node'}
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                                {language === 'ar' ? 'التوجيه والإرشاد الشامل' : 'Holistic Guidance & Oversight'}
                            </h3>
                        </div>
                        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            <MessageSquare className="text-indigo-500" />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 shadow-sm">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center font-black text-xl italic text-slate-400">SA</div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{language === 'ar' ? 'المرشد الأكاديمي' : 'Academic Advisor'}</p>
                                <p className="font-black italic text-slate-800">د. سارة أحمد</p>
                                <button onClick={() => setActiveTab('mentorship')} className="text-[10px] font-black text-indigo-600 mt-2 uppercase tracking-wide hover:underline italic">
                                    {language === 'ar' ? 'عرض السجل' : 'View Logs'}
                                </button>
                            </div>
                        </div>

                        {thesis && (
                            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 shadow-sm">
                                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center font-black text-xl italic text-indigo-400">MA</div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{language === 'ar' ? 'المشرف البحثي' : 'Research Supervisor'}</p>
                                    <p className="font-black italic text-slate-800">{thesis.advisorName}</p>
                                    <button onClick={() => setActiveTab('research')} className="text-[10px] font-black text-indigo-600 mt-2 uppercase tracking-wide hover:underline italic">
                                        {language === 'ar' ? 'إدارة الخطة' : 'Manage Plan'}
                                    </button>
                                </div>
                            </div>
                        )}
                     </div>

                     <div className="mt-12 p-8 bg-indigo-600/5 rounded-[2.5rem] border border-indigo-100 italic">
                        <p className="text-xs text-indigo-900 font-medium leading-relaxed">
                            {language === 'ar' 
                                ? "تمت مراجعة الخط الزمني للطالب وتحديث ملاحظات المشرفين. الحالة الحالية: تقدم مستقر نحو الأهداف النهائية." 
                                : "Student trajectory audit complete. Supervisor logs synchronized. Current status: Stable ascension towards terminal degree objectives."}
                        </p>
                     </div>
                </div>
            </div>

            {/* Academic Services & Requests Summary */}
            <div className="bg-white rounded-[4rem] border border-slate-100 p-12 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="space-y-2">
                        <div className="bg-[#C74634]/10 text-[#C74634] px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex italic">
                            {language === 'ar' ? 'التعاملات والطلبات الرسمية' : 'OFFICIAL ACADEMIC TRANSACTIONS'}
                        </div>
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800">
                            {language === 'ar' ? 'الانسحابات وإيقاف القيد والخدمات' : 'Academic Requests & Clearances'}
                        </h3>
                    </div>
                    {onNavigateToTab && (
                        <button 
                            onClick={() => onNavigateToTab('requests')}
                            className="bg-slate-950 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs transition-all active:scale-95"
                        >
                            <span>{language === 'ar' ? 'البوابة الكاملة للطلبات' : 'Go to Requests Portal'}</span>
                            <ArrowUpRight size={14} />
                        </button>
                    )}
                </div>

                {(() => {
                    const studentRequests = getRequests().filter(r => r.studentId === student.id);
                    if (studentRequests.length === 0) {
                        return (
                            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100/60 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <p className="text-sm font-black text-slate-800 leading-tight">
                                        {language === 'ar' ? 'المسار الأكاديمي آمن ومستقر' : 'Your Academic path is fully updated & secure'}
                                    </p>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {language === 'ar' 
                                            ? 'لم تقم بتقديم أي طلبات انسحاب (جزئي أو كلي) أو إيقاف قيد حتى الآن. كافة معاملاتك الأكاديمية تحت السيطرة.' 
                                            : 'No withdrawal or registration freeze requests recorded. Your academic status is completely clear.'}
                                    </p>
                                </div>
                                {onNavigateToTab && (
                                    <button 
                                        onClick={() => onNavigateToTab('requests')}
                                        className="bg-[#C74634] hover:bg-[#a63525] text-white px-6 py-3 rounded-xl font-black text-xs transition-all whitespace-nowrap active:scale-95"
                                    >
                                        {language === 'ar' ? 'تقديم طلب جديد' : 'Submit a Request'}
                                    </button>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 tracking-wider font-mono italic">{language === 'ar' ? 'سجل الطلبات الأخير' : 'LATEST TRANSACTIONS HISTORY'}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {studentRequests.slice(0, 2).map((req, i) => {
                                    return (
                                        <div key={i} className="p-6 bg-slate-50/70 hover:bg-white rounded-[2rem] border border-slate-100 flex flex-col justify-between gap-4 hover:shadow-lg transition-all group">
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <p className="text-xs font-black text-indigo-600 uppercase">
                                                        {getRequestTypeLabel(req.type)}
                                                     </p>
                                                     <p className="text-[10px] text-slate-400 font-mono mt-0.5">{req.id} • {req.submissionDate}</p>
                                                 </div>
                                                 <span className={cn(
                                                     "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0",
                                                     req.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                                     req.status === 'REJECTED' ? "bg-rose-50 text-rose-700 border border-rose-100" :
                                                     "bg-yellow-50 text-yellow-700 border border-yellow-100"
                                                 )}>
                                                     {language === 'ar' ? (
                                                         req.status === 'COMPLETED' ? 'مقبول / منجز' :
                                                         req.status === 'REJECTED' ? 'مرفوض' : 'قيد المراجعة'
                                                     ) : req.status}
                                                 </span>
                                             </div>
                                             <p className="text-xs text-slate-600 font-medium leading-relaxed font-sans">
                                                 {req.comments}
                                             </p>
                                             {req.adminResponse && (
                                                <div className="p-4 bg-white border border-slate-100 rounded-2xl text-[11px] text-slate-500 font-bold shadow-sm">
                                                    <span className="font-extrabold text-[#C74634]">{language === 'ar' ? 'الرد الأكاديمي: ' : 'Admin Node: '}</span>
                                                    {req.adminResponse}
                                                </div>
                                             )}
                                         </div>
                                     );
                                })}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );

    const renderAcademics = () => (
        <div className="space-y-12">
            <div className="bg-slate-50 border border-slate-100 rounded-[3rem] p-12 text-slate-900 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12">
                    <BookOpen size={200} />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-6 relative z-10 text-slate-800 tracking-tight">
                    {language === 'ar' ? 'الخطة الدراسية المعتمدة' : 'Institutional Study Vector'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <div key={sem} className={cn(
                            "p-8 rounded-[2rem] border transition-all shadow-sm",
                            sem <= 2 ? "bg-white border-indigo-100" : "bg-white/50 border-slate-100 opacity-50"
                        )}>
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-black text-indigo-500 tracking-widest italic">{language === 'ar' ? `فصل ${sem}` : `SEM-0${sem}`}</p>
                                {sem <= 2 && <CheckCircle2 size={16} className="text-emerald-500" />}
                            </div>
                            <p className="text-lg font-black italic text-slate-700">{sem <= 2 ? (language === 'ar' ? 'مكتمل' : 'Validated') : (language === 'ar' ? 'قادم' : 'Queued')}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm">
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-10 flex items-center gap-4">
                    <GraduationCap className="text-indigo-600" />
                    {language === 'ar' ? 'متطلبات التخرج' : 'Graduation Milestone Tracking'}
                </h3>
                <div className="space-y-8">
                    {[
                        { label: language === 'ar' ? 'المتطلبات الجامعية' : 'University Requirements', val: 100 },
                        { label: language === 'ar' ? 'متطلبات الكلية' : 'College Requirements', val: 75 },
                        { label: language === 'ar' ? 'متطلبات القسم' : 'Major Core Modules', val: 40 },
                        { label: language === 'ar' ? 'التدريب العملي' : 'Internship & Practicum', val: 0 },
                    ].map((item, i) => (
                        <div key={i} className="space-y-3">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-[1000] uppercase tracking-widest text-slate-500">{item.label}</span>
                                <span className="text-sm font-black italic">{item.val}%</span>
                            </div>
                            <div className="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.val}%` }}
                                    className="h-full bg-slate-900"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderGrades = () => (
        <div className="space-y-12">
            <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-12 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-4">
                        <Award className="text-amber-500" />
                        {language === 'ar' ? 'كشف الدرجات الأكاديمي' : 'Official Academic Transcript'}
                    </h3>
                    <div className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                        GPA: {student.gpa || 78.5}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-12 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Code</th>
                                <th className="px-12 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Course</th>
                                <th className="px-12 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Semester</th>
                                <th className="px-12 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Score</th>
                                <th className="px-12 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Points</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {grades.map((g, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-12 py-8 font-mono text-sm text-slate-500">{g.courseId}</td>
                                    <td className="px-12 py-8 font-black italic text-slate-800">{g.courseName}</td>
                                    <td className="px-12 py-8 text-[10px] font-black text-slate-500 tracking-widest">{g.semester}</td>
                                    <td className="px-12 py-8">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center font-black italic",
                                                g.score >= 85 ? "bg-emerald-50 text-emerald-600" :
                                                g.score >= 70 ? "bg-blue-50 text-blue-600" :
                                                "bg-amber-50 text-amber-600"
                                            )}>
                                                {g.score}
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {g.score >= 85 ? 'Excellent' : g.score >= 75 ? 'Very Good' : g.score >= 65 ? 'Good' : 'Acceptable'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-12 py-8 text-right font-black italic text-slate-400 group-hover:text-slate-900 transition-colors">4.0</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderResearch = () => (
        <div className="space-y-12">
            {thesis && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-[3rem] p-12 text-slate-900 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.05] rotate-12 text-indigo-600">
                        < Microscope size={200} />
                    </div>
                    <div className="relative z-10">
                        <div className="bg-indigo-600 text-white px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex mb-8 italic shadow-md">
                            Scientific Thesis Profile
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold mb-4 text-slate-800 tracking-tight leading-snug">
                            {thesis.title}
                        </h2>
                        <div className="flex flex-wrap gap-12 mt-12">
                            <div>
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 italic">Principal Advisor</p>
                                <p className="text-xl font-black italic text-slate-700">{thesis.advisorName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 italic">Current Status</p>
                                <p className="text-xl font-black italic flex items-center gap-3 text-slate-700">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                                    {thesis.status}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 italic">Alpha Completion</p>
                                <p className="text-xl font-black italic text-emerald-600">{thesis.progressPercentage}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter mb-10 flex items-center gap-4">
                        <FileText className="text-indigo-600" />
                        {language === 'ar' ? 'المنشورات العلمية' : 'Scientific Output & Publications'}
                    </h3>
                    <div className="space-y-4">
                        {(publications && publications.length > 0) ? publications.map((pub, i) => (
                            <div key={i} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between hover:bg-white hover:shadow-xl transition-all group">
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{pub.journalName} • {pub.publicationDate}</p>
                                    <p className="text-lg font-black italic leading-tight group-hover:text-indigo-600 transition-colors">{pub.title}</p>
                                </div>
                                <ExternalLink size={20} className="text-slate-300 group-hover:text-slate-900" />
                            </div>
                        )) : (
                            <div className="p-12 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-center opacity-40">
                                <FileText size={48} className="mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest italic">No active publications indexed in research node</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter mb-10 flex items-center gap-4">
                        <CheckCircle2 className="text-emerald-500" />
                        {language === 'ar' ? 'علامات الخطة البحثية' : 'Research Milestone Ledger'}
                    </h3>
                    <div className="space-y-6">
                        {[
                            { label: 'Proposal Defense', status: 'COMPLETED' },
                            { label: 'Literature Review Alpha', status: 'COMPLETED' },
                            { label: 'Data Collection Framework', status: 'IN_PROGRESS' },
                            { label: 'Final Dissertation Submission', status: 'PENDING' },
                        ].map((m, i) => (
                            <div key={i} className="flex items-center gap-6 p-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                                    m.status === 'COMPLETED' ? "bg-emerald-500 text-white shadow-emerald-200" :
                                    m.status === 'IN_PROGRESS' ? "bg-indigo-500 text-white shadow-indigo-200" :
                                    "bg-slate-100 text-slate-400"
                                )}>
                                    <CheckCircle2 size={16} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-black italic text-slate-800">{m.label}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{m.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMentorship = () => (
        <div className="space-y-12">
            <div className="bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12">
                    <MessageSquare size={200} />
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-12 flex items-center gap-4">
                    <UserPlus className="text-indigo-600" />
                    {language === 'ar' ? 'سجل الإرشاد الأكاديمي' : 'Clinical Advisor Notes & Mentorship Logs'}
                </h3>
                <div className="space-y-8">
                    {[
                        { author: 'Dr. Sarah Ahmed', role: 'Academic Advisor', date: '2026-05-10', content: 'Student shows exceptional progress in software architecture. Recommended for advanced faculty honors.', type: 'positive' },
                        { author: 'Prof. Mohammed Ali', role: 'Research Supervisor', date: '2026-04-20', content: 'The research methodology needs refinement in the neural network training set section.', type: 'standard' },
                        { author: 'Institutional Board', role: 'Compliance', date: '2026-01-15', content: 'Verified all prerequisite modules for the current semester.', type: 'verified' },
                    ].map((note, i) => (
                        <div key={i} className="flex gap-8 group">
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xl shadow-xl">
                                    {note.author.charAt(0)}
                                </div>
                                <div className="flex-1 w-px bg-slate-100 my-4" />
                            </div>
                            <div className="flex-1 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 group-hover:bg-white group-hover:shadow-2xl transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-xl font-black italic leading-none">{note.author}</p>
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-2 italic">{note.role}</p>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{note.date}</p>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    {note.content}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderTimeline = () => (
        <div className="space-y-12">
            <div className="bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm">
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-12 flex items-center gap-4">
                    <History className="text-slate-900" />
                    {language === 'ar' ? 'سجل الأحداث المؤسسي' : 'Historical Institutional Journey'}
                </h3>
                <div className="space-y-1">
                    {[
                        { date: 'MAY 14, 2026', event: 'Dossier Access Request Flagged', type: 'system', details: 'Administrative terminal access via portal dashboard' },
                        { date: 'APR 02, 2026', event: 'Semester Midterms Validated', type: 'academic', details: 'Passed 5 core modules with aggregate score of 82.5' },
                        { date: 'FEB 10, 2026', event: 'Scientific Research Proposal Approved', type: 'milestone', details: 'Board of governors signed proposal ID #7721' },
                        { date: 'JAN 15, 2026', event: 'Institutional Registration Complete', type: 'admin', details: 'Enrollment phase for Spring 2026 finalized' },
                        { date: 'OCT 20, 2025', event: 'Admission Granted', type: 'milestone', details: 'Department of Software Engineering entry' },
                    ].map((entry, i) => (
                        <div key={i} className="flex gap-8 p-12 hover:bg-slate-50 transition-all rounded-[3rem] relative group">
                            <div className="w-48 pt-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">{entry.date}</p>
                            </div>
                            <div className="flex flex-col items-center relative z-10">
                                <div className={cn(
                                    "w-4 h-4 rounded-full border-[3px] border-white ring-4 ring-slate-100 transition-all group-hover:scale-150",
                                    entry.type === 'milestone' ? "bg-amber-500 ring-amber-50" :
                                    entry.type === 'system' ? "bg-indigo-500 ring-indigo-50" :
                                    "bg-slate-900 ring-slate-50"
                                )} />
                                <div className="flex-1 w-px bg-slate-100 mt-6" />
                            </div>
                            <div className="flex-1 pt-1">
                                <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-2 group-hover:translate-x-2 transition-transform">{entry.event}</h4>
                                <p className="text-sm text-slate-500 font-medium">{entry.details}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-16">
            {/* Dossier Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                <div className="flex-1 space-y-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="bg-blue-50 text-blue-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-2">
                            <GraduationCap size={14} />
                            {student.graduateLevel ? student.graduateLevel : (language === 'ar' ? 'جامعي / بكالوريوس' : 'University / UG')}
                        </div>
                        <div className="bg-emerald-50 text-emerald-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                            <ShieldCheck size={14} />
                            DOC_VERIFIED_REF_44
                        </div>
                        {isAdminView && (
                            <div className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-900 flex items-center gap-2">
                                ADMIN_NODE_ACCESS
                            </div>
                        )}
                    </div>
                    
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-normal">
                        {student.name}
                    </h1>
                    
                    <div className="flex flex-wrap gap-8 pt-2">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Faculty / Section</p>
                            <p className="text-xs font-black text-slate-600 uppercase">{language === 'ar' ? 'هندسة البرمجيات' : 'Software Engineering'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Institutional ID</p>
                            <p className="text-xs font-black text-slate-600 uppercase flex items-center gap-2 tracking-tighter font-mono">
                                {student.id} <Fingerprint size={12} className="text-slate-300" />
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative group">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black text-slate-300 border border-slate-100 shadow-lg relative overflow-hidden group-hover:bg-slate-50 transition-colors">
                        {student.name ? student.name.charAt(0) : '?' }
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-3 sticky top-0 z-[60] py-6 bg-white/80 backdrop-blur-3xl border-b border-slate-50">
                {tabs.map(tab => (
                    <TabButton 
                        key={tab.id}
                        id={tab.id}
                        active={activeTab === tab.id}
                        label={tab.label}
                        icon={tab.icon}
                        onClick={setActiveTab}
                        language={language}
                    />
                ))}
            </div>

            {/* Dynamic Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {activeTab === 'summary' && renderSummary()}
                {activeTab === 'academics' && renderAcademics()}
                {activeTab === 'grades' && renderGrades()}
                {activeTab === 'dossier' && renderDossier()}
                {activeTab === 'research' && renderResearch()}
                {activeTab === 'mentorship' && renderMentorship()}
                {activeTab === 'timeline' && renderTimeline()}
            </motion.div>
        </div>
    );
};

export default DossierContent;
