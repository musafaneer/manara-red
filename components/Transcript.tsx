import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Grade, ProgramType, UserRole, Course } from '../types';
import { getStudents, getSystemSettings, getCourses } from '../services/storageService';
import { getCurrentUser } from '../services/authService';
import { calculateWeightedGPA } from '../services/gradingService';
import { 
    Download, FileText, Medal, GraduationCap, 
    Calendar, BookOpen, Award, CheckCircle2,
    Search, User as UserIcon, Building, Info,
    ShieldCheck, QrCode, Lock, Fingerprint, Globe,
    ChevronDown, Printer, AlertTriangle, Clock
} from 'lucide-react';
import { generateDocumentHash, getQrCodeUrl, getVerificationUrl } from '../services/securityService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { Language } from '../services/i18nService';
import SecurePrintWrapper from './ui/SecurePrintWrapper';

interface TranscriptProps {
    language?: Language;
}

const Transcript: React.FC<TranscriptProps> = ({ language = 'ar' }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [documentHash, setDocumentHash] = useState<string>('');
    const [viewMode, setViewMode] = useState<'transcript' | 'certificate'>('transcript');
    const currentUser = getCurrentUser();
    const settings = getSystemSettings();

    useEffect(() => {
        const allStudents = getStudents();
        setStudents(allStudents);
        setCourses(getCourses());

        if (currentUser?.role === UserRole.STUDENT) {
            const student = allStudents.find(s => s.id === currentUser.id);
            if (student) setSelectedStudent(student);
        }
    }, [currentUser]);

    useEffect(() => {
        if (selectedStudent) {
            generateDocumentHash(selectedStudent, 'TRANSCRIPT').then(setDocumentHash);
        } else {
            setDocumentHash('');
        }
    }, [selectedStudent]);

    const filteredStudents = students.filter(s => 
        s.name.includes(searchTerm) || s.id.includes(searchTerm)
    );

    const getGpaLabel = (gpa: number) => {
        if (gpa >= 85) return 'ممتاز';
        if (gpa >= 75) return 'جيد جداً';
        if (gpa >= 65) return 'جيد';
        if (gpa >= 50) return 'مقبول';
        return 'ضعيف';
    };

    const getGpaColor = (gpa: number) => {
        if (gpa >= 85) return 'text-emerald-600 bg-emerald-50';
        if (gpa >= 75) return 'text-blue-600 bg-blue-50';
        if (gpa >= 65) return 'text-indigo-600 bg-indigo-50';
        if (gpa >= 50) return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
    };

    const getCourseCredits = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        return course ? course.credits : 3;
    };

    const groupedGrades = selectedStudent?.grades.reduce((acc, grade) => {
        if (!acc[grade.semester]) acc[grade.semester] = [];
        acc[grade.semester].push(grade);
        return acc;
    }, {} as Record<string, Grade[]>) || {};

    const semesters = Object.keys(groupedGrades).sort();
    const gpa = selectedStudent ? calculateWeightedGPA(selectedStudent.grades, courses) : 0;
    const currentDate = new Date().toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' });

    const stats = {
        totalCredits: selectedStudent?.grades.reduce((sum, g) => sum + getCourseCredits(g.courseId), 0) || 0,
        passedCredits: selectedStudent?.grades.filter(g => g.score >= settings.regulation.passingScore).reduce((sum, g) => sum + getCourseCredits(g.courseId), 0) || 0,
        coursesCompleted: selectedStudent?.grades.length || 0,
        successRate: selectedStudent?.grades.length ? Math.round((selectedStudent.grades.filter(g => g.score >= settings.regulation.passingScore).length / selectedStudent.grades.length) * 100) : 0
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-start no-print px-4">
                <div className="text-right">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4 justify-end italic uppercase">
                        Secure Academic Registry
                        <div className="p-4 bg-slate-900 rounded-[2rem] text-indigo-400 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-800">
                            <ShieldCheck size={32} />
                        </div>
                    </h2>
                    <p className="text-stone-400 font-bold mt-3 text-[10px] uppercase tracking-[0.3em] opacity-60">Verified Document Custodian / Blockchain Layer v4.2</p>
                </div>
                {selectedStudent && (
                    <div className="flex gap-4">
                        <div className="flex bg-slate-100 p-1 rounded-[2.5rem]">
                            <button 
                                onClick={() => setViewMode('transcript')}
                                className={cn(
                                    "px-6 py-3 rounded-[2rem] text-xs font-black uppercase italic tracking-tighter transition-all",
                                    viewMode === 'transcript' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Transcript
                            </button>
                            <button 
                                onClick={() => setViewMode('certificate')}
                                className={cn(
                                    "px-6 py-3 rounded-[2rem] text-xs font-black uppercase italic tracking-tighter transition-all",
                                    viewMode === 'certificate' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Certificate
                            </button>
                        </div>
                        <button 
                            onClick={() => window.print()}
                            className="bg-slate-900 text-white px-12 py-5 rounded-[2.5rem] font-black shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-4 italic uppercase tracking-tight group overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Printer size={22} className="relative z-10 text-indigo-400" />
                            <span className="relative z-10 flex flex-col items-start leading-none">
                                <span className="text-[14px]">
                                    {viewMode === 'transcript' ? 'Generate Master Transcript' : 'Generate Certificate'}
                                </span>
                                <span className="text-[8px] opacity-40 mt-1 uppercase tracking-widest font-mono">Official PDF/Print Stream</span>
                            </span>
                        </button>
                    </div>
                )}
            </div>

            <div className="flex gap-10 print:block">
                {currentUser?.role !== UserRole.STUDENT && (
                    <div className="w-96 shrink-0 space-y-8 no-print">
                        <div className="relative group">
                            <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                            <input 
                                type="text"
                                placeholder="Audit Student ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pr-16 pl-8 py-5 rounded-[2rem] bg-white border border-stone-100 focus:border-stone-200 focus:ring-4 focus:ring-indigo-500/5 outline-none font-black text-sm transition-all shadow-sm italic uppercase tracking-tight placeholder:text-stone-300"
                            />
                        </div>
                        <div className="bg-white rounded-[3.5rem] border border-stone-100 shadow-[0_20px_50px_rgba(0,0,0,0.03)] overflow-hidden h-[750px] flex flex-col relative">
                            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                            <div className="p-6 border-b border-stone-50 bg-stone-50/50 text-[10px] font-black uppercase text-stone-400 tracking-[0.25em] text-center relative z-10">
                                Authorized Student Repository
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative z-10">
                                {filteredStudents.map(s => (
                                    <button 
                                        key={s.id}
                                        onClick={() => setSelectedStudent(s)}
                                        className={cn(
                                            "w-full p-8 border-b border-stone-50 text-right transition-all group flex items-center justify-between flex-row-reverse",
                                            selectedStudent?.id === s.id ? "bg-slate-900 text-white shadow-2xl" : "hover:bg-stone-50/50"
                                        )}
                                    >
                                        <div className="text-right">
                                            <p className={cn("font-black text-lg italic uppercase tracking-tighter leading-none mb-2", selectedStudent?.id === s.id ? "text-white" : "text-slate-900")}>{s.name}</p>
                                            <div className="flex items-center gap-3 justify-end">
                                                <span className={cn("text-[10px] font-mono font-black tracking-widest uppercase opacity-60", selectedStudent?.id === s.id ? "text-indigo-400" : "text-stone-400")}>{s.id}</span>
                                                {selectedStudent?.id === s.id && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />}
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                                            selectedStudent?.id === s.id ? "bg-white/10 text-indigo-400 rotate-6" : "bg-stone-50 text-stone-300"
                                        )}>
                                            <UserIcon size={20} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 space-y-12 print:space-y-0">
                    {selectedStudent ? (
                        <div className="print-area">
                            <SecurePrintWrapper
                                documentType={viewMode === 'transcript' ? (language === 'ar' ? 'كشف درجات أكاديمي رسمي' : 'Official Academic Transcript') : (language === 'ar' ? 'شهادة تخرج جامعية' : 'Graduation Certificate')}
                                documentId={`${viewMode === 'transcript' ? 'TR-' : 'CERT-'}${selectedStudent.id}-${documentHash.substring(0, 8)}`}
                                language={language}
                            >
                                {viewMode === 'transcript' ? (
                                    <div className="space-y-12 relative overflow-hidden">
                                        {/* Simplified Student Profile for Transcript */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end border-b pb-8">
                                            <div className={cn("space-y-4", language === 'ar' ? 'text-right' : 'text-left')}>
                                                <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight uppercase leading-snug">{selectedStudent.name}</h3>
                                                <div className="flex flex-wrap gap-3">
                                                    <span className="text-[10px] bg-slate-100 px-3 py-1 rounded-lg font-black text-slate-600 uppercase tracking-widest">ID: {selectedStudent.id}</span>
                                                    <span className="text-[10px] bg-slate-100 px-3 py-1 rounded-lg font-black text-slate-600 uppercase tracking-widest">{selectedStudent.departmentId}</span>
                                                </div>
                                            </div>
                                            <div className={cn("flex flex-col items-center md:items-end", language === 'ar' ? 'md:items-start' : 'md:items-end')}>
                                                <div className="flex flex-col items-center md:items-end">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'المعدل التراكمي' : 'CUMULATIVE GPA'}</span>
                                                    <span className="text-2xl md:text-3xl font-extrabold text-indigo-600">%{gpa}</span>
                                                    <span className={cn("mt-2 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", getGpaColor(gpa))}>
                                                        {getGpaLabel(gpa)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Academic Status Summary Cards */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                                            {[
                                                { label: language === 'ar' ? 'الوحدات المنجزة' : 'Modules', val: stats.coursesCompleted, icon: BookOpen },
                                                { label: language === 'ar' ? 'الساعات المعتمدة' : 'Credits', val: `${stats.passedCredits} / ${stats.totalCredits}`, icon: Award },
                                                { label: language === 'ar' ? 'نسبة النجاح' : 'Success %', val: `%${stats.successRate}`, icon: CheckCircle2 },
                                                { label: language === 'ar' ? 'حالة القيد' : 'Status', val: selectedStudent.status, icon: ShieldCheck }
                                            ].map((stat, idx) => (
                                                <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center">
                                                    <stat.icon size={20} className="text-slate-400 mb-2" />
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</span>
                                                    <span className="text-sm font-black text-slate-900 uppercase italic">{stat.val}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Semesters Data */}
                                        <div className="space-y-12">
                                            {semesters.map(semester => {
                                                const semesterGrades = groupedGrades[semester];
                                                const semesterGpa = Math.round(semesterGrades.reduce((sum, g) => sum + g.score, 0) / semesterGrades.length);
                                                
                                                return (
                                                    <div key={semester} className="space-y-6 break-inside-avoid">
                                                        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                                                            <h4 className="text-lg font-black text-slate-900 italic uppercase">Semester: {semester}</h4>
                                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                GPA: <span className="text-indigo-600">%{semesterGpa}</span>
                                                            </div>
                                                        </div>

                                                        <div className="overflow-hidden border border-slate-100 rounded-2xl">
                                                            <table className="w-full text-[10px] border-collapse">
                                                                <thead>
                                                                    <tr className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                                                                        <th className="px-6 py-4 text-right">{language === 'ar' ? 'المقرر' : 'Module'}</th>
                                                                        <th className="px-6 py-4 text-center">{language === 'ar' ? 'وحدات' : 'CR'}</th>
                                                                        <th className="px-6 py-4 text-center">{language === 'ar' ? 'الدرجة' : 'Score'}</th>
                                                                        <th className="px-6 py-4 text-center">{language === 'ar' ? 'النتيجة' : 'Result'}</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {semesterGrades.map(grade => (
                                                                        <tr key={grade.courseId}>
                                                                            <td className="px-6 py-3">
                                                                                <div className="font-black text-slate-800 uppercase italic">{grade.courseName}</div>
                                                                                <div className="text-[8px] text-slate-400 font-mono tracking-widest">{grade.courseId}</div>
                                                                            </td>
                                                                            <td className="px-6 py-3 text-center font-bold text-slate-500">
                                                                                {getCourseCredits(grade.courseId)}
                                                                            </td>
                                                                            <td className="px-6 py-3 text-center border-x border-slate-50 font-black text-slate-900">
                                                                                %{grade.score}
                                                                            </td>
                                                                            <td className="px-6 py-3 text-center">
                                                                                {grade.score >= settings.regulation.passingScore ? (
                                                                                    <span className="text-emerald-600 font-black uppercase tracking-tighter italic">Passed</span>
                                                                                ) : (
                                                                                    <span className="text-rose-600 font-black uppercase tracking-tighter italic">Failed</span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Legend Section */}
                                        <div className="mt-12 p-8 bg-slate-50 rounded-3xl border border-slate-100 break-inside-avoid">
                                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                                {[
                                                    { label: 'Excellence', range: '%85+', color: 'text-emerald-600' },
                                                    { label: 'Superior', range: '%75-84', color: 'text-blue-600' },
                                                    { label: 'Competent', range: '%65-74', color: 'text-indigo-600' },
                                                    { label: 'Adequate', range: '%50-64', color: 'text-amber-600' },
                                                    { label: 'Deficient', range: '<%50', color: 'text-rose-600' }
                                                ].map((leg, i) => (
                                                    <div key={i} className="text-center">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">{leg.label}</p>
                                                        <p className={cn("text-xs font-black", leg.color)}>{leg.range}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-24 space-y-20 text-center relative overflow-hidden flex flex-col items-center">
                                         {/* Background Decorative Seals */}
                                         <div className="absolute top-0 opacity-[0.03] scale-150 rotate-12">
                                             <GraduationCap size={400} />
                                         </div>

                                         <div className="space-y-6 relative z-10">
                                            <h2 className="text-2xl font-black text-slate-400 uppercase tracking-[0.5em]">This is to certify that</h2>
                                            <h3 className="text-7xl font-black text-slate-900 italic tracking-tighter uppercase">{selectedStudent.name}</h3>
                                            <div className="w-24 h-1 bg-slate-900 mx-auto rounded-full"></div>
                                         </div>

                                         <div className="max-w-2xl text-center space-y-8 relative z-10">
                                             <p className="text-xl font-bold text-slate-600 leading-relaxed italic">
                                                 {language === 'ar' 
                                                    ? `قد أكمل متطلبات الحصول على درجة البكالوريوس في ${selectedStudent.departmentId} بتقدير عام (${getGpaLabel(gpa)}) وبمعدل تراكمي قدره %${gpa}`
                                                    : `Has successfully completed all academic requirements for the Bachelors Degree in ${selectedStudent.departmentId} with a general standing of (${getGpaLabel(gpa)}) and a Cumulative Grade Point Average of ${gpa}%`}
                                             </p>
                                             <p className="text-sm font-black text-slate-400 uppercase tracking-widest pt-10">
                                                 Awarded by the Academic Council on this day of {currentDate}
                                             </p>
                                         </div>

                                         <div className="flex justify-between w-full pt-20 px-20">
                                             <div className="flex flex-col items-center gap-4">
                                                 <div className="w-32 h-32 bg-slate-50 border-2 border-dashed border-stone-200 rounded-full flex items-center justify-center rotate-12">
                                                     <Medal size={48} className="text-stone-300" />
                                                 </div>
                                                 <span className="text-[10px] font-black uppercase text-slate-400">Registrar Seal</span>
                                             </div>
                                             <div className="flex flex-col items-center gap-4">
                                                 <div className="w-32 h-32 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-full flex items-center justify-center -rotate-12">
                                                     <ShieldCheck size={48} className="text-indigo-200" />
                                                 </div>
                                                 <span className="text-[10px] font-black uppercase text-slate-400">Dean Endorsement</span>
                                             </div>
                                         </div>
                                    </div>
                                )}
                            </SecurePrintWrapper>
                        </div>
                    ) : (
                        <div className="h-[800px] bg-white rounded-[5rem] border border-stone-100 flex flex-col items-center justify-center text-stone-400 relative overflow-hidden group shadow-[0_40px_80px_-20px_rgba(0,0,0,0.04)]">
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.06] transition-opacity duration-1000" 
                                 style={{ backgroundImage: 'radial-gradient(#000 1.5px, transparent 0)', backgroundSize: '40px 40px' }}>
                            </div>
                            <div className="w-32 h-32 bg-stone-50 rounded-[3rem] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-sm border border-stone-100">
                                <GraduationCap size={64} className="opacity-20 text-slate-900" />
                            </div>
                            <h3 className="text-3xl font-black italic tracking-tighter text-slate-900 uppercase">Academic Vault Sentinel</h3>
                            <p className="text-[10px] font-black mt-6 max-w-sm text-center font-mono text-stone-400 uppercase tracking-[0.4em] leading-relaxed opacity-60">
                                Secure Authorization Required: Please identify an active student entity from the cryptographically secured repository to generate a master academic transcript.
                            </p>
                            <div className="mt-14 flex gap-6">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping [animation-delay:200ms]" />
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping [animation-delay:400ms]" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const LogoWatermark = () => (
    <svg width="400" height="400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-900">
        <path d="M50 5L15 25V75L50 95L85 75V25L50 5Z" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
        <path d="M50 15L25 30V70L50 85L75 70V30L50 15Z" stroke="currentColor" strokeWidth="0.2" />
        <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1" />
        <text x="50" y="52" fontSize="3" fontWeight="bold" textAnchor="middle" fill="currentColor" fontFamily="monospace">VERIFIED</text>
    </svg>
);

export default Transcript;
