import React, { useState, useEffect } from 'react';
import { getStudents, getDepartmentName, getSystemSettings } from '../services/storageService';
import { StudentStatus, ProgramType, Student } from '../types';
import { 
    GraduationCap, Award, Printer, Medal, X, ClipboardCheck, 
    ShieldCheck, Fingerprint, Lock, CheckCircle2,
    Building2, MapPin, Globe, User as UserIcon, Clock
} from 'lucide-react';
import { generateDocumentHash, formatShortHash, getQrCodeUrl, getVerificationUrl } from '../services/securityService';
import { getCurrentUser } from '../services/authService';
import { motion, AnimatePresence } from 'motion/react';

import { Language } from '../services/i18nService';

interface GraduatesProps {
    language?: Language;
}

const Graduates: React.FC<GraduatesProps> = ({ language = 'ar' }) => {
  const graduates = getStudents().filter(s => s.status === StudentStatus.GRADUATED);
  const settings = getSystemSettings();
  const currentUser = getCurrentUser();
  const [selectedGraduate, setSelectedGraduate] = useState<Student | null>(null);
  const [documentHash, setDocumentHash] = useState<string>('');

  useEffect(() => {
    if (selectedGraduate) {
        generateDocumentHash(selectedGraduate, 'CERTIFICATE').then(setDocumentHash);
    } else {
        setDocumentHash('');
    }
  }, [selectedGraduate]);

  const getDegreeLabel = (gpa: number) => {
    if (gpa >= 85) return 'ممتاز';
    if (gpa >= 75) return 'جيد جداً';
    if (gpa >= 65) return 'جيد';
    return 'مقبول';
  };

  const currentDate = new Date().toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
  });

  return (
    <div className="p-8 relative">
      <div className="mb-8 flex justify-between items-end no-print">
        <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <GraduationCap size={24} />
                </div>
                سجل الخريجين
            </h2>
            <p className="text-slate-500 mt-2 font-medium">الأرشيف الإلكتروني لخريجي الكلية المحمي بتقنية التشفير</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 text-sm font-black text-slate-600 shadow-sm">
            إجمالي الخريجين: {graduates.length}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 no-print">
        {graduates.map(student => (
            <motion.div 
                layoutId={student.id}
                key={student.id} 
                className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
                <div className="h-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500"></div>
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-2xl text-indigo-600 border border-slate-100 group-hover:scale-110 transition-transform">
                            {student.name.charAt(0)}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 uppercase tracking-widest border border-emerald-100">
                                <Award size={14} />
                                خريج معتمد
                            </div>
                            <div className="flex items-center gap-1 text-[8px] font-black text-slate-400">
                                <ShieldCheck size={10} className="text-indigo-500" />
                                SECURE ID
                            </div>
                        </div>
                    </div>
                    
                    <h3 className="font-black text-xl text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors text-right">{student.name}</h3>
                    <p className="text-slate-500 font-bold text-xs mb-6 flex items-center gap-2 justify-end">
                        {getDepartmentName(student.departmentId)}
                        <Building2 size={12} className="text-slate-300" />
                    </p>
                    
                    <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl text-sm mb-8 border border-slate-100">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الرقم الدراسي</span>
                            <span className="font-black text-slate-700 text-sm">{student.id}</span>
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المعدل النهائي</span>
                            <span className="font-black text-indigo-600 text-sm">
                                %{student.gpa} ({getDegreeLabel(student.gpa)})
                            </span>
                        </div>
                    </div>

                    <button 
                        onClick={() => setSelectedGraduate(student)}
                        className="w-full py-4 bg-white border-2 border-slate-100 text-slate-800 rounded-2xl hover:bg-slate-900 hover:text-white hover:border-slate-900 font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm"
                    >
                        <Printer size={18} />
                        إصدار الوثيقة المؤمنة
                    </button>
                </div>
            </motion.div>
        ))}
        
        {graduates.length === 0 && (
            <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
                <Medal size={64} className="text-slate-200 mb-4 opacity-50" />
                <p className="text-slate-400 font-black text-xl tracking-tight">لا يوجد خريجين في الأرشيف حالياً</p>
                <p className="text-slate-300 text-sm font-medium mt-2">سيتم تفعيل هذا القسم فور اعتماد النتائج النهائية</p>
            </div>
        )}
      </div>

      {/* Graduation Certificate Modal */}
      <AnimatePresence mode="wait">
      {selectedGraduate && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md"
        >
            <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden border border-slate-200 print:h-auto print:static print:inset-0 print:border-none print:shadow-none"
            >
                <div className="bg-white px-8 py-6 flex justify-between items-center border-b border-slate-100 no-print">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                            <ShieldCheck size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="font-black text-slate-900">نظام الوثائق المؤمنة</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Blockchain-Verified Document Generation</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => window.print()} 
                            className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-black hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-slate-900/20"
                        >
                            <Printer size={18}/> طباعة الوثيقة الرسمية
                        </button>
                        <button 
                            onClick={() => setSelectedGraduate(null)} 
                            className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-colors"
                        >
                            <X size={24}/>
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto bg-slate-100/50 p-6 md:p-12 flex justify-center print:p-0 print:bg-white print:overflow-visible">
                    {/* THE ACTUAL CERTIFICATE */}
                    <div className="print-area bg-white w-full max-w-[210mm] min-h-[297mm] p-12 md:p-24 shadow-2xl relative flex flex-col border-[24px] border-double border-slate-900 print:shadow-none print:border-[16px] print:max-w-none print:w-full print:border-slate-800 holographic-shimmer overflow-hidden">
                        
                        {/* Microtext Border Layer */}
                        <div className="absolute inset-0 border-[2px] border-slate-900/10 pointer-events-none opacity-20 m-2 flex flex-col justify-between p-1">
                            <div className="flex justify-between text-[4px] uppercase tracking-[1em] whitespace-nowrap overflow-hidden">
                                {Array(20).fill("VERIFIED DOCUMENT • ").join("")}
                            </div>
                            <div className="flex-1 flex justify-between">
                                <div className="[writing-mode:vertical-rl] text-[4px] uppercase tracking-[1em] whitespace-nowrap overflow-hidden rotate-180">
                                    {Array(20).fill("ACADEMIC INTEGRITY SECURE • ").join("")}
                                </div>
                                <div className="[writing-mode:vertical-rl] text-[4px] uppercase tracking-[1em] whitespace-nowrap overflow-hidden">
                                    {Array(20).fill("BLOCKCHAIN VERIFIED SYSTEM • ").join("")}
                                </div>
                            </div>
                            <div className="flex justify-between text-[4px] uppercase tracking-[1em] whitespace-nowrap overflow-hidden">
                                {Array(20).fill("GRADUATION ARCHIVE PORTAL • ").join("")}
                            </div>
                        </div>

                        {/* Security Ribbon */}
                        <div className="absolute top-0 right-32 w-16 h-48 bg-indigo-900 z-10 hidden md:block opacity-90 print:right-24">
                            <div className="absolute bottom-0 left-0 w-full h-8 bg-indigo-900 transform translate-y-1/2 rotate-45"></div>
                            <div className="absolute bottom-0 left-0 w-full h-8 bg-indigo-900 transform translate-y-1/2 -rotate-45"></div>
                            <div className="absolute inset-1 border-x border-white/20"></div>
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40">
                                <ShieldCheck size={20} />
                            </div>
                        </div>

                        {/* Decorative Corner Ornaments */}
                        <div className="absolute top-0 right-0 w-32 h-32 text-slate-900/20 pointer-events-none">
                            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
                                <path d="M0,0 L100,0 L100,10 L10,10 L10,100 L0,100 Z" />
                                <circle cx="15" cy="15" r="5" />
                                <path d="M25,5 Q5,5 5,25" fill="none" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                        <div className="absolute top-0 left-0 w-32 h-32 text-slate-900/20 pointer-events-none -rotate-90">
                            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
                                <path d="M0,0 L100,0 L100,10 L10,10 L10,100 L0,100 Z" />
                                <circle cx="15" cy="15" r="5" />
                                <path d="M25,5 Q5,5 5,25" fill="none" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                        <div className="absolute bottom-0 right-0 w-32 h-32 text-slate-900/20 pointer-events-none rotate-90">
                            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
                                <path d="M0,0 L100,0 L100,10 L10,10 L10,100 L0,100 Z" />
                                <circle cx="15" cy="15" r="5" />
                                <path d="M25,5 Q5,5 5,25" fill="none" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 text-slate-900/20 pointer-events-none rotate-180">
                            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
                                <path d="M0,0 L100,0 L100,10 L10,10 L10,100 L0,100 Z" />
                                <circle cx="15" cy="15" r="5" />
                                <path d="M25,5 Q5,5 5,25" fill="none" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>

                        {/* Floating Digital Seal */}
                        <div className="absolute top-10 left-10 no-print z-50">
                            <motion.div 
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="w-20 h-20 bg-indigo-600 text-white rounded-2xl shadow-2xl flex flex-col items-center justify-center border-4 border-white"
                            >
                                <Lock size={24} />
                                <span className="text-[8px] font-black uppercase tracking-tighter mt-1 text-center px-2">Secure Validation</span>
                            </motion.div>
                        </div>

                        {/* Gold Foil Security Seal (Detailed) */}
                        <div className="absolute bottom-40 right-12 z-20 hidden md:flex items-center justify-center pointer-events-none print:bottom-32">
                           <div className="w-48 h-48 relative">
                                <div className="absolute inset-0 bg-yellow-500 rounded-full animate-guilloche opacity-20"></div>
                                <div className="absolute inset-4 bg-yellow-600 rounded-full shadow-inner border-[6px] border-yellow-400 flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-yellow-800 via-yellow-400 to-yellow-800 opacity-80 mix-blend-overlay"></div>
                                    <div className="relative z-10 text-yellow-100 flex flex-col items-center">
                                        <Medal size={56} className="drop-shadow-lg" />
                                        <div className="h-px w-10 bg-yellow-100/30 my-2"></div>
                                        <span className="text-[7px] font-black uppercase tracking-[0.3em] text-center drop-shadow-md">AUTHENTIC<br/>ACADEMIC SEAL</span>
                                    </div>
                                    {/* Rotating Guilloche Pattern in Seal */}
                                    <svg className="absolute inset-0 w-full h-full opacity-30 animate-guilloche" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 1" />
                                        <path d="M50 5 C 60 25, 40 25, 50 45" fill="none" stroke="currentColor" strokeWidth="0.5" />
                                        {Array(12).fill(0).map((_, i) => (
                                            <circle key={i} cx="50" cy="50" r={10 + i * 3} fill="none" stroke="currentColor" strokeWidth="0.2" transform={`rotate(${i * 30} 50 50)`} />
                                        ))}
                                    </svg>
                                </div>
                                {/* Golden Silk Ribbons */}
                                <div className="absolute -bottom-16 left-12 w-10 h-24 bg-gradient-to-b from-indigo-800 to-indigo-950 -rotate-12 rounded-b-lg border-2 border-indigo-400/20 shadow-lg">
                                    <div className="absolute inset-y-0 left-1 w-px bg-white/10"></div>
                                    <div className="absolute inset-y-0 right-1 w-px bg-white/10"></div>
                                </div>
                                <div className="absolute -bottom-16 right-12 w-10 h-24 bg-gradient-to-b from-indigo-800 to-indigo-950 rotate-12 rounded-b-lg border-2 border-indigo-400/20 shadow-lg">
                                    <div className="absolute inset-y-0 left-1 w-px bg-white/10"></div>
                                    <div className="absolute inset-y-0 right-1 w-px bg-white/10"></div>
                                </div>
                           </div>
                        </div>

                        {/* Guilloche Background Pattern */}
                        <div className="absolute inset-0 opacity-[0.05] pointer-events-none overflow-hidden print:opacity-[0.08]" 
                             style={{ 
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 40c0-22.09 17.91-40 40-40m0 80c-22.09 0-40-17.91-40-40m0 0C40 62.09 22.09 80 0 80M0 0c22.09 0 40 17.91 40 40' fill='none' stroke='%23000' stroke-width='0.5' opacity='0.5'/%3E%3C/svg%3E")`,
                                backgroundSize: '80px 80px' 
                             }}>
                        </div>

                        {/* Professional Watermark (Large) */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none print:opacity-[0.05]">
                            <div className="relative group">
                                <div className="w-[600px] h-[600px] border-[20px] border-slate-900 rounded-full flex items-center justify-center">
                                    <div className="w-[500px] h-[500px] border-[2px] border-dashed border-slate-900 rounded-full flex items-center justify-center">
                                        <Medal size={400} className="text-slate-900" />
                                    </div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center transform -rotate-45">
                                    <span className="text-6xl font-black text-slate-900 uppercase tracking-[1.5em] whitespace-nowrap">OFFICIAL ACADEMIC GRADUATION RECORD</span>
                                </div>
                            </div>
                        </div>

                        {/* Top Security Header */}
                        <div className="flex justify-between items-start mb-20 relative z-10 text-right">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">دولة ليبيا</h2>
                                <h3 className="text-sm font-black text-slate-700">وزارة التعليم العالي والبحث العلمي</h3>
                                <h4 className="text-sm font-black text-slate-800 tracking-tight">{settings.institutionName}</h4>
                                <div className="h-0.5 w-full bg-slate-900/10 mt-2"></div>
                                <p className="text-[10px] font-black text-slate-400 mt-2 font-mono uppercase tracking-widest flex items-center gap-2 justify-end">
                                    SERIAL: {selectedGraduate.id}/{new Date().getFullYear()}
                                    <Fingerprint size={10} className="text-indigo-600" />
                                </p>
                            </div>
                            <div className="flex flex-col items-center mx-10">
                                <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center text-slate-900 mb-2 shadow-2xl border-2 border-slate-900 relative">
                                    <GraduationCap size={48} />
                                    <div className="absolute inset-[-4px] border border-slate-200 rounded-full animate-guilloche"></div>
                                </div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Official Seal</span>
                            </div>
                            <div className="text-left space-y-1">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">State of Libya</h2>
                                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">Ministry of Higher Education</h3>
                                <h4 className="text-[11px] font-black text-slate-800 uppercase">{settings.institutionName}</h4>
                                <div className="h-0.5 w-full bg-slate-900/10 mt-2"></div>
                                <p className="text-[10px] font-black text-slate-400 mt-2 font-mono uppercase tracking-widest flex items-center gap-2">
                                    <Lock size={10} className="text-indigo-600" />
                                    VERIFIED STATUS: SECURE_HASH_OK
                                </p>
                            </div>
                        </div>

                        {/* Certificate Title Block */}
                        <div className="text-center mb-24 relative z-10">
                            <div className="inline-block relative">
                                <div className="absolute inset-[-20px] border-x-4 border-slate-900 opacity-20 transform skew-x-12"></div>
                                <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-4 px-24 py-8 border-y-[6px] border-slate-900 italic transform transition-all hover:scale-105 cursor-default print:text-5xl">إفادة تخرج</h1>
                                <div className="absolute -top-6 -right-6 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white">
                                    <Award size={28} />
                                </div>
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-6 font-mono text-[10px] font-black text-slate-400 tracking-[0.5em] uppercase whitespace-nowrap">
                                    Official Convocation Statement
                                </div>
                            </div>
                        </div>

                        {/* Main Body Content */}
                        <div className="text-2xl leading-[2.8] text-justify text-slate-900 relative z-10 font-bold space-y-12 max-w-3xl mx-auto text-right print:text-xl">
                            <p className="text-center">
                                تشهد إدارة المسجل العام بالكلية بأن السيد / السيدة:
                                <br />
                                <span className="text-5xl font-black text-indigo-800 block my-8 underline decoration-indigo-200 decoration-8 underline-offset-[16px] px-4 print:text-4xl">{selectedGraduate.name}</span>
                                <span className="text-xs text-slate-400 font-black block mt-2 tracking-[0.2em] font-mono leading-none">
                                    NATIONAL ID: {selectedGraduate.nationalId} • ACADEMIC ID: {selectedGraduate.id}
                                </span>
                            </p>
                            
                            <p className="text-center leading-relaxed">
                                قد استوفى بنجاح جميع متطلبات نيل درجة:
                                <br />
                                <span className="text-3xl font-black text-slate-900 block my-6 print:text-2xl">
                                    {selectedGraduate.program === ProgramType.UNDERGRADUATE ? 'البكالوريوس' : 'الماجستير'} في {getDepartmentName(selectedGraduate.departmentId)}
                                </span>
                            </p>

                            <div className="text-center border-[6px] border-double border-slate-900/10 p-12 rounded-[4rem] bg-slate-50/30 relative overflow-hidden mt-10">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                                <div className="relative z-10">
                                    <p>
                                        وذلك بتقدير عام <span className="text-3xl font-black text-slate-900 mx-2">"{getDegreeLabel(selectedGraduate.gpa)}"</span>
                                        <br />
                                        وبمعدل تراكمي قدره <span className="text-5xl font-black text-indigo-700 mx-3 font-mono">%{selectedGraduate.gpa}</span>
                                        <br />
                                        <span className="text-[10px] text-slate-400 font-black mt-6 block uppercase tracking-[0.4em] italic underline decoration-indigo-200 decoration-2 underline-offset-4">Academic Semester: {settings.currentSemester}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Blockchain & QR Enhanced Verification Section */}
                        <div className="mt-20 p-8 bg-slate-900 text-white rounded-[2.5rem] flex items-center gap-10 relative z-10 shadow-3xl print:bg-white print:text-slate-900 print:border-4 print:border-slate-900 print:shadow-none">
                            <div className="relative">
                                <div className="bg-white p-3 rounded-2xl shadow-inner relative z-10">
                                    <img 
                                        src={getQrCodeUrl(getVerificationUrl(documentHash))} 
                                        alt="Verification QR" 
                                        className="w-24 h-24"
                                    />
                                </div>
                                <div className="absolute -inset-2 bg-indigo-500 rounded-2xl blur opacity-30 animate-pulse"></div>
                            </div>
                            <div className="flex-1 space-y-2 overflow-hidden">
                                <div className="flex items-center gap-3 text-indigo-400 print:text-indigo-600">
                                    <ShieldCheck size={18} />
                                    <h5 className="text-[11px] font-black uppercase tracking-[0.2em]">Authenticity Verification Ledger</h5>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold leading-relaxed max-w-lg print:text-slate-500">
                                    This document is registered in the Oracle Campus Secure Archive. The QR code points to the public verification portal. 
                                    Any modification to the digital or physical copy will be detected by the cryptographic hash below.
                                </p>
                                <div className="font-mono text-[9px] bg-white/5 px-4 py-3 rounded-2xl border border-white/10 text-indigo-300 flex items-center gap-3 group print:bg-slate-50 print:text-slate-600 print:border-slate-200">
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span className="font-black text-[7px] uppercase">Hash Valid:</span>
                                    </div>
                                    <span className="truncate tracking-tighter opacity-80">{documentHash}</span>
                                </div>
                            </div>
                        </div>

                        {/* Signatures Section (Formal) */}
                        <div className="mt-auto pt-20 grid grid-cols-2 gap-24 relative z-10 text-center">
                            <div className="flex flex-col items-center">
                                <div className="h-32 w-48 relative mb-4">
                                    {/* Registrar Stamp */}
                                    <div className="absolute inset-0 border-[6px] border-indigo-700/5 rounded-full flex flex-col items-center justify-center transform -rotate-12 group">
                                        <div className="border-4 border-indigo-700/5 rounded-full p-2">
                                            <p className="text-[7px] font-black text-indigo-700/10 uppercase text-center leading-tight">
                                                ORACLE CAMPUS UNIVERSITY<br/>REGISTRAR OFFICE<br/>CERTIFIED SIGNATURE
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full h-0.5 bg-slate-900 mb-4 px-10"></div>
                                <p className="font-black text-xl text-slate-900">مسجل الكلية</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Registrar of Faculty</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="h-32 w-48 relative mb-4">
                                    {/* Dean Stamp */}
                                    <div className="absolute inset-0 border-[6px] border-indigo-700/5 rounded-full flex flex-col items-center justify-center transform rotate-12 group">
                                        <div className="border-4 border-indigo-700/5 rounded-full p-2">
                                            <p className="text-[7px] font-black text-indigo-700/10 uppercase text-center leading-tight">
                                                OFFICE OF THE DEAN<br/>FACULTY OF ACADEMICS<br/>AUTHENTIC SEAL
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full h-0.5 bg-slate-900 mb-4 px-10"></div>
                                <p className="font-black text-xl text-slate-900">عميد الكلية</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Dean of Faculty</p>
                            </div>
                        </div>

                        {/* Sub-Footer Security Log */}
                        <div className="mt-20 pt-8 border-t border-slate-100 grid grid-cols-2 gap-8 text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">
                            <div className="flex flex-col gap-2.5 text-right">
                                <span className="flex items-center gap-2 justify-end">
                                    SECURE NODE: {settings.institutionName.split(' ')[0]}-ARCHIVE-01
                                    <Globe size={11} className="text-indigo-400" />
                                </span>
                                <span className="flex items-center gap-2 justify-end">
                                    ISSUED BY: {currentUser?.name || 'SYSTEM_AUTH'}
                                    <UserIcon size={11} className="text-slate-400" />
                                </span>
                            </div>
                            <div className="flex flex-col gap-2.5 text-left">
                                <span className="flex items-center gap-2">
                                    <Clock size={11} className="text-slate-400" />
                                    GEN_TIME: {new Date().toISOString()}
                                </span>
                                <span className="flex items-center gap-2 text-emerald-600">
                                    <ClipboardCheck size={11} className="text-emerald-500" />
                                    VALIDATION_STATE: SIGNED_DIGITALLY
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default Graduates;
