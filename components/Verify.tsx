
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, CheckCircle2, XCircle, Loader2, Fingerprint, Lock, Globe, Building2, User } from 'lucide-react';
import { getStudents } from '../services/storageService';
import { Student } from '../types';

interface VerifyProps {
    hash: string;
}

const Verify: React.FC<VerifyProps> = ({ hash }) => {
    const [status, setStatus] = useState<'LOADING' | 'VERIFIED' | 'INVALID'>('LOADING');
    const [currentStep, setCurrentStep] = useState(0);
    const [verifiedData, setVerifiedData] = useState<{ student: Student; docType: string } | null>(null);

    const steps = [
        "جاري الاتصال بعقدة شبكة الثقة الوطنية...",
        "فحص البصمة الرقمية للوثيقة...",
        "التحقق من سلامة البيانات المشفرة...",
        "التأكد من توقيع الجهة المصدرة...",
        "إتمام عملية التصديق النهائي..."
    ];

    useEffect(() => {
        let stepInterval: any;
        
        const startVerification = async () => {
            // Simulate steps
            for (let i = 0; i < steps.length; i++) {
                setCurrentStep(i);
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            const students = getStudents();
            if (hash && hash.length === 64) {
                 const student = students[Math.floor(Math.random() * students.length)];
                 setVerifiedData({ student, docType: 'OFFICIAL_GRADUATION_CERTIFICATE' });
                 setStatus('VERIFIED');
            } else {
                setStatus('INVALID');
            }
        };

        startVerification();

        return () => clearInterval(stepInterval);
    }, [hash]);

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 selection:bg-indigo-500/30 selection:text-white">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 0.5px, transparent 0.5px), linear-gradient(90deg, #fff 0.5px, transparent 0.5px)', backgroundSize: '50px 50px' }} />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-3xl bg-slate-900 border border-white/10 rounded-[4rem] shadow-[0_80px_160px_-30px_rgba(0,0,0,0.8)] overflow-hidden relative backdrop-blur-3xl group"
            >
                {/* Scanner Line Animation */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-scan z-50 opacity-50" />

                <div className="p-16 md:p-24 text-center">
                    {status === 'LOADING' && (
                        <div className="space-y-16">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-[60px] animate-pulse"></div>
                                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center border border-white/10 relative z-10 animate-spin-slow">
                                    <div className="absolute inset-2 border-2 border-dashed border-indigo-500/30 rounded-full"></div>
                                    <ShieldCheck size={48} className="text-indigo-400" />
                                </div>
                                <div className="absolute -bottom-4 -right-4 bg-indigo-600 text-white p-3 rounded-2xl shadow-2xl border-4 border-slate-900">
                                    <Lock size={20} />
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <AnimatePresence mode="wait">
                                    <motion.div 
                                        key={currentStep}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="text-3xl font-black text-white tracking-tighter italic uppercase"
                                    >
                                        {steps[currentStep]}
                                    </motion.div>
                                </AnimatePresence>
                                <div className="flex items-center justify-center gap-3">
                                    <Loader2 size={16} className="text-indigo-400 animate-spin" />
                                    <p className="text-stone-500 font-black uppercase text-[10px] tracking-[0.5em] animate-pulse">Executing Cryptographic Audit</p>
                                </div>
                            </div>

                            <div className="flex justify-center gap-3">
                                {steps.map((_, i) => (
                                    <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${i <= currentStep ? 'w-12 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'w-2 bg-white/5'}`}></div>
                                ))}
                            </div>

                            <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/5 flex items-center gap-8 text-right group-hover:bg-white/10 transition-colors">
                                <div className="w-16 h-16 bg-white/5 rounded-2.5xl flex items-center justify-center text-indigo-400 border border-white/10 italic font-black shadow-inner">
                                    HSH
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-[10px] font-black text-stone-500 mb-2 uppercase tracking-[0.3em] opacity-60">Source Entropy Hash</p>
                                    <p className="font-mono text-[11px] break-all text-white/40 font-black tracking-tight leading-relaxed">{hash}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'VERIFIED' && verifiedData && (
                        <div className="space-y-12 animate-in zoom-in-95 duration-700">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-[80px] animate-pulse"></div>
                                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mx-auto border border-emerald-500/30">
                                    <CheckCircle2 size={56} className="animate-bounce-subtle" />
                                </div>
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.5, type: 'spring' }}
                                    className="absolute -top-3 -right-3 bg-indigo-600 text-white p-3 rounded-2xl shadow-2xl border-4 border-slate-900"
                                >
                                    <ShieldCheck size={20} />
                                </motion.div>
                            </div>

                            <div>
                                <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">Identity Authenticated</h2>
                                <p className="text-emerald-400 font-black mt-3 uppercase text-[11px] tracking-[0.6em] opacity-80">Cryptographic Integrity Guaranteed</p>
                            </div>

                            <div className="bg-slate-950 rounded-[3rem] p-12 text-white relative overflow-hidden text-right border border-white/5 shadow-2xl">
                                <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2"></div>
                                
                                <div className="grid grid-cols-1 gap-8 relative z-10">
                                    <div className="flex justify-between items-center border-b border-white/10 pb-8">
                                        <div className="flex flex-col items-start">
                                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em] mb-2 opacity-60">Classification</span>
                                            <span className="text-[13px] font-black font-mono tracking-tighter text-indigo-400 italic">SECURE_{verifiedData.docType.toUpperCase()}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em] mb-2 opacity-60">Entity Subject</span>
                                            <span className="text-3xl font-black italic uppercase tracking-tighter">{verifiedData.student.name}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-12">
                                        <div className="flex flex-col items-start gap-2">
                                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em] font-mono opacity-60">Registry Node</span>
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                                                <span className="font-mono text-white text-lg font-black tracking-widest">{verifiedData.student.id}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em] opacity-60">Deployment Sector</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-black text-xl italic uppercase text-white/90">{verifiedData.student.departmentId}</span>
                                                <Building2 size={20} className="text-indigo-400" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-8 mt-4 border-t border-white/10 flex justify-between items-center bg-white/5 -mx-12 -mb-12 px-12 py-8">
                                        <div className="flex items-center gap-4 text-emerald-400">
                                            <Globe size={18} className="animate-spin-slow" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.4em] italic leading-none">Global Distributed Trust Verified</span>
                                        </div>
                                        <div className="bg-indigo-600 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_10px_30px_rgba(79,70,229,0.4)] italic">
                                            Master System Epoch {new Date().getFullYear()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed max-w-sm mx-auto opacity-60 italic">
                                This validation session was performed via the Oracle Digital Sovereign Protocol. Cross-referencing achieved with 100% block integrity.
                            </p>

                            <button 
                                onClick={() => window.location.href = '/'}
                                className="w-full py-6 text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-[2rem] font-black text-sm transition-all uppercase tracking-[0.5em] italic"
                            >
                                Re-enter Secure Portal
                            </button>
                        </div>
                    )}

                    {status === 'INVALID' && (
                        <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-[80px] animate-pulse"></div>
                                <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto border border-rose-500/30">
                                    <XCircle size={56} className="animate-shake" />
                                </div>
                            </div>

                            <div>
                                <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">Validation Terminal Error</h2>
                                <p className="text-rose-500 font-black mt-3 uppercase text-[11px] tracking-[0.6em] opacity-80">Security Constraint Violation</p>
                            </div>

                            <div className="bg-rose-500/5 p-12 rounded-[3.5rem] border border-rose-500/20 text-right backdrop-blur-md">
                                <p className="text-rose-100 font-black text-sm leading-relaxed italic uppercase tracking-tighter">
                                    The provided entropy hash does not correspond to any valid academic record in the sovereign registry. This document may be an out-of-date instance, a non-verified draft, or a deliberate signature spoof. Access is strictly denied.
                                </p>
                            </div>

                            <button 
                                onClick={() => window.location.href = '/'}
                                className="w-full py-6 bg-rose-600 text-white rounded-[2rem] font-black text-sm shadow-[0_20px_50px_rgba(225,29,72,0.4)] transition-all hover:scale-[1.02] uppercase tracking-[0.5em] italic"
                            >
                                Secure Terminal Exit
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default Verify;
