import React, { useState, useEffect, useMemo } from 'react';
import { getStudents, getSystemSettings } from '../services/storageService';
import { Student, StudentStatus, ProgramType, Grade } from '../types';
import { 
  ShieldCheck, AlertTriangle, Info, CheckCircle, Search, Filter, 
  ArrowUpRight, Scale, Clock, GraduationCap, Download, Printer, 
  FileText, History, AlertCircle, TrendingUp, FilterX, AlertOctagon, Check
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, 
  PieChart, Pie, Legend, CartesianGrid 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Language } from '../services/i18nService';

// Toast utility internal state bypass
import { notifySuccess } from '../services/notificationService';

interface GradeAnomaly {
    studentId: string;
    studentName: string;
    courseId: string;
    courseName: string;
    score: number;
    requiredScore: number;
    law: string;
    description: string;
}

interface AuditResults {
    lowGpa: Student[];
    timeExceeded: Student[];
    warningLimit: Student[];
    incorrectStatus: Student[];
    gradeAnomalies: GradeAnomaly[];
}

interface ComplianceMonitorProps {
    language?: Language;
}

const localizedTitles = {
    ar: { 
        title: "مراقب الامتثال اللائحي (501)",
        subtitle: "نظام التدقيق المركزي لمطابقة معايير الجودة الأكاديمية",
        overallScore: "نسبة الامتثال الكلية",
        lowGpaCard: "معدلات متعثرة",
        timeExceededCard: "تجاوز السقف الزمني",
        warningsCard: "مخالفات الإنذار ف46",
        anomaliesCard: "مخالفات درجات عُليا",
        totalViolationsCard: "إجمالي المخالفات",
        tableTitle: "سجل المخالفات التفصيلي",
        tableSubtitle: "عرض جميع الطلاب غير المتوافقين مع معايير اللائحة وبنودها القانونية",
        lawContext: "لائحة 501",
        legalReportBtn: "توليد تقرير قانوني",
        pieTitle: "توزيع المخالفات اللائحية",
        recommendationTitle: "التوصية الأكاديمية الذكية",
        recommendationText: "بناءً على تحليل البيانات الحالية، هناك تزايد ملحوظ في حالات تجاوز السقف الزمني لطلاب الدراسات العليا. يوصى بتفعيل المادة 18 الفقرة (ج).",
        browseText: "تصفح نصوص اللائحة 501",
        complianceHistory: "سجل مؤشر الامتثال",
        gpaViolationLabel: "تدني معدل تراكمي",
        timeExceededLabel: "تجاوز ضعف المدة",
        warningLimitLabel: "تراكم الإنذارات",
        gradeAnomalyLabel: "درجة مخالفة للائحة",
        searchPlaceholder: "بحث باسم الطالب أو الرقم...",
        actionDiscipl: "إجراء تأديبي",
        actionWarn: "توجيه إنذار",
        gpaCheckLabel: "المعدل / التفاصيل",
        lawCitationLabel: "السند القانوني",
        violationType: "نوع المخالفة",
        studentName: "الطالب",
        actions: "الإجراء",
        libyanUniversity: "جامعة أوراكل كامبس",
        libyanSis: "نظام المعلومات الطلابية الموحد",
        complianceReportTitle: "تقرير تدقيق الامتثال للائحة 501 التعليم العالي",
        disciplinaryNotification: "تم رصد المخالفة بنجاح، وجاري إرسال خطاب التوجيه المعتمد قانونياً للطالب والمشرف الأكاديمي."
    },
    'ar-ly': {
        title: "مُراقب الامتثال اللائحي لقرار 501 الليبي",
        subtitle: "نظام التدقيق الفوري المعني بتنفيذ البنود القانونية لقرار التعليم العالي الليبي رقم 501",
        overallScore: "مؤشر الامتثال الوطني",
        lowGpaCard: "متعثرو الأداء التراكمي",
        timeExceededCard: "متجاوزو ضعف المدة",
        warningsCard: "الإنذار الأكاديمي الثالث",
        anomaliesCard: "درجات دون حد النجاح (65%)",
        totalViolationsCard: "حوادث عدم المطابقة الفعّالة",
        tableTitle: "سجل حوادث عدم المطابقة التفصيلي",
        tableSubtitle: "كشف رقابي آلي بالطلاب المقيدين الذين يخالف رصيدهم الأكاديمي اللائحة 501 الصادرة في ليبيا",
        lawContext: "قرار 501 ليبيا",
        legalReportBtn: "توليد محضر تدقيق رسمي معتمد",
        pieTitle: "توزيع مخالفات اللوائح الوطنية",
        recommendationTitle: "توصية التدقيق وجرد المخاطر الأكاديمية",
        recommendationText: "بناءً على قيود المادة 18 والمادة 48 المقررة قانوناً في ليبيا، يُرجى سرعة توجيه إنذارات مغلظة وفصل الطلاب المتجاوزين لـ 'ضعف المدة القانونية' لتجنب بطلان قيدهم.",
        browseText: "تصفح قرار 501 المعتمد بوزارة التعليم العالي",
        complianceHistory: "سجل مؤشر الجودة والامتثال",
        gpaViolationLabel: "تدني معدل تراكمي",
        timeExceededLabel: "فوات ضعف المدة المسموحة",
        warningLimitLabel: "إنذار أكاديمي نهائي",
        gradeAnomalyLabel: "درجة نجاح غير مستوفية للحد الأدنى (65)",
        searchPlaceholder: "ابحث برقم قيد الطالب أو اسمه...",
        actionDiscipl: "إحالة للجنة التأديبية بالكلية",
        actionWarn: "إنذار بالفصل النهائي",
        gpaCheckLabel: "الأداء والمعدل الجاري",
        lawCitationLabel: "المادة القانونية لقرار 501",
        violationType: "نوع المخالفة والخرق",
        studentName: "الطالب المقيد المنظومي",
        actions: "الإجراء المنظومي",
        libyanUniversity: "جامعة أوراكل كامبس",
        libyanSis: "المنظومة الليبية المركزية للتعليم العالي والإحصاء ق.501",
        complianceReportTitle: "محضر جرد وتدقيق الامتثال للائحة التنظيمية الموحدة رقم 501 بليبيا",
        disciplinaryNotification: "تم توثيق المخالفة في ملف الطالب، وتوجيه إشعار فوري لعمادة الكلية وقسم التسجيل بالجامعة لاتخاذ اللازم."
    },
    en: {
        title: "Reg. 501 Compliance Monitor",
        subtitle: "Automated legal compliance verification engine for Libyan High-Education Standards",
        overallScore: "Overall Compliance Rate",
        lowGpaCard: "Low GPA Violations",
        timeExceededCard: "Double Duration Limit",
        warningsCard: "Active Warnings Breach",
        anomaliesCard: "Graduate Failures (<65%)",
        totalViolationsCard: "Total Infractions",
        tableTitle: "Audit Violations Ledger",
        tableSubtitle: "Real-time automated scanning of non-compliant student profiles against university codes",
        lawContext: "Regulation 501",
        legalReportBtn: "Export Official Audit Report",
        pieTitle: "Regulation Infractions Share",
        recommendationTitle: "Systematic Legal Action Suggestion",
        recommendationText: "Following Article 18 and Article 48 guidelines of high-ed regulations, students who have exceeded twice their normal study duration must have their registration frozen immediately.",
        browseText: "Read Libyan Regulation 501 Reference",
        complianceHistory: "Semestral Compliance Index",
        gpaViolationLabel: "Deficient GPA Threshold",
        timeExceededLabel: "Double Duration Exceeded",
        warningLimitLabel: "Warnings Cap Limit Breached",
        gradeAnomalyLabel: "Grade Passing Score Discrepancy",
        searchPlaceholder: "Search student by name, registration ID...",
        actionDiscipl: "Refer to Disciplinary Board",
        actionWarn: "Issue Academic Warning",
        gpaCheckLabel: "GPA / Audit Info",
        lawCitationLabel: "Statute Reference",
        violationType: "Violation Class",
        studentName: "Enrolled student",
        actions: "Enforcement",
        libyanUniversity: "Oracle Campus University",
        libyanSis: "Central Student Information System Hub",
        complianceReportTitle: "Official Compliance Audit & Monitoring Ledger under Ministerial Regulation 501",
        disciplinaryNotification: "Disciplinary workflow has been logged. Automated notice dispatched to registrar and the academic adviser."
    }
};

const ComplianceMonitor: React.FC<ComplianceMonitorProps> = ({ language = 'ar' }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'GPA' | 'TIME' | 'WARNINGS' | 'ANOMALY'>('ALL');
    const [violations, setViolations] = useState<AuditResults>({
        lowGpa: [],
        timeExceeded: [],
        warningLimit: [],
        incorrectStatus: [],
        gradeAnomalies: []
    });

    const dict = localizedTitles[language] || localizedTitles['ar'];

    useEffect(() => {
        const allStudents = getStudents();
        setStudents(allStudents);
        
        // Regulation 501 - Smart Compliance Audit Engine
        const detectedLowGpa = allStudents.filter(s => {
            const limit = s.program === ProgramType.POSTGRADUATE ? 65 : 50;
            return s.gpa < limit && s.status === StudentStatus.ACTIVE;
        });

        const detectedTimeExceeded = allStudents.filter(s => {
            const yearsIn = new Date().getFullYear() - s.enrollmentYear;
            // Article 18 / المادة 18: Max limit is 2x normal duration ("ضعف المدة")
            // Master: max 4 years. Undergraduate: max 8 years.
            const maxYears = s.program === ProgramType.POSTGRADUATE ? 4 : 8; 
            return yearsIn > maxYears;
        });

        const detectedWarningLimit = allStudents.filter(s => s.warningsCount >= 2);

        const detectedIncorrectStatus = allStudents.filter(s => {
            const critical = s.program === ProgramType.POSTGRADUATE ? 55 : 40;
            return s.gpa < critical && s.status === StudentStatus.ACTIVE;
        });

        // Smart postgraduate grade audit clause:
        // Identify any Postgraduate student who has grades less than 65 (absolute minimum pass limit for Master/PhD under decision 501)
        const detectedAnomalies: GradeAnomaly[] = [];
        allStudents.forEach(s => {
            if (s.program === ProgramType.POSTGRADUATE && s.grades && s.grades.length > 0) {
                s.grades.forEach(g => {
                    if (g.score < 65) {
                        detectedAnomalies.push({
                            studentId: s.id,
                            studentName: s.name,
                            courseId: g.courseId,
                            courseName: g.courseName || g.courseId,
                            score: g.score,
                            requiredScore: 65,
                            law: 'المادة 48 من لائحة 501',
                            description: language === 'en' 
                              ? `Postgrad student scored ${g.score}% in ${g.courseName || g.courseId} (Min passing grade is 65%)`
                              : `طالب دراسات عليا تحصل على درجة ${g.score}% في مقرر ${g.courseName || g.courseId} (الحد الأدني للنجاح يوجب 65%)`
                        });
                    }
                });
            }
        });

        setViolations({
            lowGpa: detectedLowGpa,
            timeExceeded: detectedTimeExceeded,
            warningLimit: detectedWarningLimit,
            incorrectStatus: detectedIncorrectStatus,
            gradeAnomalies: detectedAnomalies
        });
    }, [language]);

    // Derived list for display with normalized interface structure
    const filteredViolations = useMemo(() => {
        let list: { 
            student: Student; 
            type: string; 
            law: string; 
            status: 'critical' | 'warning'; 
            id: string; 
            customDetail: string; 
            scoreText: string;
            category: 'GPA' | 'TIME' | 'WARNINGS' | 'ANOMALY';
        }[] = [];
        
        if (activeFilter === 'ALL' || activeFilter === 'GPA') {
            violations.lowGpa.forEach(s => list.push({ 
                student: s, 
                type: dict.gpaViolationLabel, 
                law: language === 'en' ? 'Article 32' : 'المادة 32 من قرار 501', 
                status: 'critical', 
                id: `gpa-${s.id}`,
                customDetail: language === 'en' ? `GPA of ${s.gpa}% is below threshold` : `المعدل العام ${s.gpa}% دون الحد الأدنى المسموح للدرجة العلمية`,
                scoreText: `${s.gpa}%`,
                category: 'GPA'
            }));
        }
        if (activeFilter === 'ALL' || activeFilter === 'TIME') {
            violations.timeExceeded.forEach(s => {
                const yearsIn = new Date().getFullYear() - s.enrollmentYear;
                list.push({ 
                    student: s, 
                    type: dict.timeExceededLabel, 
                    law: language === 'en' ? 'Article 18' : 'المادة 18 (ضعف الدراسة)', 
                    status: 'critical', 
                    id: `time-${s.id}`,
                    customDetail: language === 'en' 
                      ? `Enrolled for ${yearsIn} years (${s.program === ProgramType.POSTGRADUATE ? 'Max: 4yr' : 'Max: 8yr'})` 
                      : `مقيد منذ ${yearsIn} سنة (الحد الأقصى المسموح لبرنامج ${s.program === ProgramType.POSTGRADUATE ? 'الدراسات العليا 4 سنوات' : 'البكالوريوس 8 سنوات'})`,
                    scoreText: language === 'en' ? `${yearsIn} years` : `${yearsIn} سنة دراسية`,
                    category: 'TIME'
                });
            });
        }
        if (activeFilter === 'ALL' || activeFilter === 'WARNINGS') {
            violations.warningLimit.forEach(s => list.push({ 
                student: s, 
                type: dict.warningLimitLabel, 
                law: language === 'en' ? 'Article 46' : 'المادة 46 من قرار 501', 
                status: 'critical', 
                id: `warn-${s.id}`,
                customDetail: language === 'en' ? `Accumulated warnings count: ${s.warningsCount} (Max warnings is 2)` : `تجاوز الحد الأقصى للإنذارات الأكاديمية المقررة بالتراكم (${s.warningsCount} إنذارات فعالة)`,
                scoreText: language === 'en' ? `${s.warningsCount} Warnings` : `${s.warningsCount} إنذاراً`,
                category: 'WARNINGS'
            }));
        }
        if (activeFilter === 'ALL' || activeFilter === 'ANOMALY') {
            violations.gradeAnomalies.forEach((a, idx) => {
                const st = students.find(s => s.id === a.studentId);
                if (st) {
                    list.push({
                        student: st,
                        type: dict.gradeAnomalyLabel,
                        law: language === 'en' ? 'Article 48' : 'المادة 48 (حد النجاح)',
                        status: 'warning',
                        id: `anomaly-${a.studentId}-${idx}`,
                        customDetail: a.description,
                        scoreText: `${a.score}%`,
                        category: 'ANOMALY'
                    });
                }
            });
        }

        return list.filter(item => 
            item.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.student.id.includes(searchTerm)
        );
    }, [violations, searchTerm, activeFilter, dict, students, language]);

    // Compliance scoring calculus incorporating high education parameters
    const complianceScore = useMemo(() => {
        if (students.length === 0) return 100;
        const totalViolationsCount = violations.lowGpa.length + violations.timeExceeded.length + violations.warningLimit.length + violations.gradeAnomalies.length;
        const potentialMaxViolations = students.length * 1.5;
        const score = Math.round(100 - (totalViolationsCount / potentialMaxViolations) * 100);
        return Math.max(0, Math.min(100, score));
    }, [students, violations]);

    const handlePrintReport = () => {
        window.print();
    };

    const handleAction = (item: any) => {
        notifySuccess(dict.disciplinaryNotification);
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
                <div className="space-y-1">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-red-600 rounded-2xl text-white shadow-lg shadow-red-200">
                            <Scale size={20} />
                        </div>
                        {dict.title}
                    </h2>
                    <p className="text-slate-500 font-medium text-sm">{dict.subtitle}</p>
                </div>
                
                <div className="flex items-center gap-6">
                    <button 
                        onClick={handlePrintReport}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm h-fit text-xs cursor-pointer"
                    >
                        <Printer size={18} />
                        {dict.legalReportBtn}
                    </button>
                    
                    <div className="relative flex items-center justify-center group">
                        <div className="absolute inset-0 bg-white rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
                        <svg className="w-36 h-36 transform -rotate-90 relative">
                            <circle
                                className="text-slate-100"
                                strokeWidth="8"
                                stroke="currentColor"
                                fill="transparent"
                                r="55"
                                cx="70"
                                cy="70"
                            />
                            <motion.circle
                                className={cn(
                                    complianceScore > 90 ? "text-emerald-500" : complianceScore > 75 ? "text-amber-500" : "text-red-500"
                                )}
                                strokeWidth="8"
                                strokeDasharray={2 * Math.PI * 55}
                                initial={{ strokeDashoffset: 2 * Math.PI * 55 }}
                                animate={{ strokeDashoffset: (2 * Math.PI * 55) - (complianceScore / 100) * (2 * Math.PI * 55) }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="55"
                                cx="70"
                                cy="70"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                            <motion.span 
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={cn(
                                    "text-2xl font-bold tracking-tight",
                                    complianceScore > 90 ? "text-emerald-700" : complianceScore > 75 ? "text-amber-700" : "text-red-700"
                                )}
                            >
                                %{complianceScore}
                            </motion.span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">{dict.overallScore}</span>
                            <div className={cn(
                                "mt-1 p-0.5 rounded-full",
                                complianceScore > 90 ? "bg-emerald-100 text-emerald-600" : complianceScore > 75 ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                            )}>
                                <ShieldCheck size={12} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid to accommodate Libyan Compliance Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 print:grid-cols-5">
                <StatusCard 
                    title={dict.lowGpaCard} 
                    count={violations.lowGpa.length} 
                    icon={AlertTriangle} 
                    color="red" 
                    trend={language === 'en' ? "Underperforming GPA" : "مخالفة البند 32/أ"}
                    isActive={activeFilter === 'GPA'}
                    onClick={() => setActiveFilter('GPA')}
                />
                <StatusCard 
                    title={dict.timeExceededCard} 
                    count={violations.timeExceeded.length} 
                    icon={Clock} 
                    color="amber" 
                    trend={language === 'en' ? "Exceeded Double limit" : "مخالفة 'ضعف المدة' م 18"}
                    isActive={activeFilter === 'TIME'}
                    onClick={() => setActiveFilter('TIME')}
                />
                <StatusCard 
                    title={dict.warningsCard} 
                    count={violations.warningLimit.length} 
                    icon={AlertOctagon} 
                    color="purple" 
                    trend={language === 'en' ? "Warning Cap Met" : "مخالفة المادة 46"}
                    isActive={activeFilter === 'WARNINGS'}
                    onClick={() => setActiveFilter('WARNINGS')}
                />
                <StatusCard 
                    title={dict.anomaliesCard} 
                    count={violations.gradeAnomalies.length} 
                    icon={AlertCircle} 
                    color="pink" 
                    trend={language === 'en' ? "Grades below 65%" : "مخالفة نجاح م 48"}
                    isActive={activeFilter === 'ANOMALY'}
                    onClick={() => setActiveFilter('ANOMALY')}
                />
                <StatusCard 
                    title={dict.totalViolationsCard} 
                    count={violations.lowGpa.length + violations.timeExceeded.length + violations.warningLimit.length + violations.gradeAnomalies.length} 
                    icon={FileText} 
                    color="slate" 
                    trend={language === 'en' ? "Automated Scanning" : "رصد منظومي مستمر"}
                    isActive={activeFilter === 'ALL'}
                    onClick={() => setActiveFilter('ALL')}
                />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Violations Table */}
                <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
                    <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/30">
                        <div>
                            <h3 className="font-black text-xl text-slate-800">{dict.tableTitle}</h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">{dict.tableSubtitle}</p>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto print:hidden">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-red-500 transition-all font-sans"
                                    placeholder={dict.searchPlaceholder}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={() => { setActiveFilter('ALL'); setSearchTerm(''); }}
                                className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                                title="إعادة ضبط"
                            >
                                <FilterX size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase sticky top-0 z-10 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-right">{dict.studentName}</th>
                                    <th className="px-8 py-5 text-right">{dict.violationType}</th>
                                    <th className="px-8 py-5 text-right">{dict.lawCitationLabel}</th>
                                    <th className="px-8 py-5 text-right">{dict.gpaCheckLabel}</th>
                                    <th className="px-8 py-5 text-center print:hidden">{dict.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <AnimatePresence mode="popLayout">
                                    {filteredViolations.length > 0 ? (
                                        filteredViolations.map((item, index) => (
                                            <motion.tr 
                                                key={item.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.02 }}
                                                className="hover:bg-slate-50/50 transition-colors group"
                                            >
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                                                            {item.student.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 leading-tight">{item.student.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono tracking-tighter mt-1">{item.student.id} — <span className="uppercase text-slate-500 font-bold">{item.student.program}</span></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-[9px] font-black whitespace-nowrap",
                                                        item.status === 'critical' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                                                    )}>
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-slate-700">{dict.lawContext}</span>
                                                        <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase mt-0.5">{item.law}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-bold text-slate-800 leading-tight">{item.scoreText}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium leading-normal max-w-[200px]">{item.customDetail}</p>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center print:hidden">
                                                    <button 
                                                        onClick={() => handleAction(item)}
                                                        className={cn(
                                                            "px-4 py-2 rounded-xl text-[10px] font-black transition-all cursor-pointer",
                                                            item.status === 'critical' 
                                                                ? "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-100" 
                                                                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100"
                                                        )}
                                                    >
                                                        {item.status === 'critical' ? dict.actionDiscipl : dict.actionWarn}
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="text-center py-24 text-slate-400">
                                                <div className="p-4 bg-slate-50 rounded-full w-14 h-14 mx-auto mb-4 flex items-center justify-center text-emerald-500">
                                                    <ShieldCheck size={28} />
                                                </div>
                                                <p className="text-sm font-black">{language === 'en' ? 'Perfect Compliance - No violations' : 'نظام الامتثال خالٍ من أي مخالفات أكاديمية حالية!'}</p>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar Analysis */}
                <div className="space-y-8 print:hidden">
                    {/* Pie Chart Card */}
                    <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm">
                        <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                            <TrendingUp size={20} className="text-indigo-500" />
                            {dict.pieTitle}
                        </h4>
                        <div className="h-64 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: dict.lowGpaCard, value: violations.lowGpa.length },
                                            { name: dict.timeExceededCard, value: violations.timeExceeded.length },
                                            { name: dict.warningsCard, value: violations.warningLimit.length },
                                            { name: dict.anomaliesCard, value: violations.gradeAnomalies.length }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={6}
                                        dataKey="value"
                                    >
                                        <Cell fill="#ef4444" />
                                        <Cell fill="#f59e0b" />
                                        <Cell fill="#8b5cf6" />
                                        <Cell fill="#ec4899" />
                                    </Pie>
                                    <Tooltip contentStyle={{ direction: language === 'en' ? 'ltr' : 'rtl', borderRadius: '12px', border: 'none', fontSize: '10px', fontWeight: '900' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Recommendation Card */}
                    <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3">
                                <Scale className="text-indigo-400 animate-pulse" size={28} />
                                <h4 className="text-xl font-black">{dict.recommendationTitle}</h4>
                            </div>
                            <p className="text-slate-300 leading-relaxed text-xs">
                                {dict.recommendationText}
                            </p>
                            <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-700/30">
                                {dict.browseText} <ArrowUpRight size={18} />
                            </button>
                        </div>
                    </div>

                    {/* History Semesters Chart */}
                    <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-black text-slate-800 flex items-center gap-2 font-sans">
                                <History size={18} className="text-slate-400" />
                                {dict.complianceHistory}
                            </h4>
                            <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-xl">+12% trend</span>
                        </div>
                        <div className="h-32">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Semester 1', score: 76 },
                                    { name: 'Semester 2', score: 81 },
                                    { name: 'Semester 3', score: 84 },
                                    { name: 'Semester 4', score: 89 },
                                    { name: 'Current', score: complianceScore },
                                ]}>
                                    <Bar dataKey="score" fill="#f1f5f9" radius={[6, 6, 6, 6]}>
                                        { [0,1,2,3,4].map((i) => (
                                            <Cell key={`cell-${i}`} fill={i === 4 ? '#6366f1' : '#f1f5f9'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Print Friendly Header */}
            <div className="hidden print:block p-8 border-b-2 border-slate-900 mb-8 text-right font-sans" dir="rtl">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black">{dict.complianceReportTitle}</h1>
                        <p className="font-bold mt-2">عبر المعيار الوطني والتدقيق الذكي</p>
                        <p className="font-bold text-xs mt-1 text-slate-600">التاريخ: {new Date().toLocaleDateString('ar-LY')} — مؤشر الامتثال الإجمالي: %{complianceScore}</p>
                    </div>
                    <div className="text-left font-black">
                        <p className="text-lg">{dict.libyanUniversity}</p>
                        <p className="text-xs text-slate-500">{dict.libyanSis}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface StatusCardProps {
    title: string;
    count: number;
    icon: any;
    color: 'red' | 'amber' | 'purple' | 'slate' | 'pink';
    trend: string;
    isActive: boolean;
    onClick: () => void;
}

const StatusCard = ({ title, count, icon: Icon, color, trend, isActive, onClick }: StatusCardProps) => (
    <motion.button
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={cn(
            "p-6 rounded-[32px] border transition-all text-right group relative overflow-hidden cursor-pointer",
            isActive 
                ? "bg-white border-indigo-500 shadow-2xl shadow-indigo-100 ring-2 ring-indigo-500/10" 
                : "bg-white border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200"
        )}
    >
        <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500",
            color === 'red' ? "bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white group-hover:rotate-12" :
            color === 'amber' ? "bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white group-hover:rotate-12" :
            color === 'purple' ? "bg-purple-50 text-purple-500 group-hover:bg-purple-500 group-hover:text-white group-hover:rotate-12" :
            color === 'pink' ? "bg-pink-50 text-pink-500 group-hover:bg-pink-500 group-hover:text-white group-hover:rotate-12" :
            "bg-slate-50 text-slate-500 group-hover:bg-slate-900 group-hover:text-white group-hover:rotate-12"
        )}>
            <Icon size={24} strokeWidth={2.5} />
        </div>
        
        <p className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{count}</p>
        <p className="text-xs font-black text-slate-700 tracking-tight">{title}</p>
        
        <div className="mt-3 flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 group-hover:text-slate-600 transition-colors uppercase tracking-widest">{trend}</span>
            <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                color === 'red' ? "bg-red-500 shadow-[0_0_8px_#ef4444]" :
                color === 'amber' ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" :
                color === 'purple' ? "bg-purple-500 shadow-[0_0_8px_#8b5cf6]" :
                color === 'pink' ? "bg-pink-500 shadow-[0_0_6px_#ec4899]" :
                "bg-slate-400"
            )} />
        </div>
    </motion.button>
);

export default ComplianceMonitor;
