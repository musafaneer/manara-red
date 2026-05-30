import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Globe, Clock, User, Fingerprint } from 'lucide-react';
import { getCurrentUser } from '../../services/authService';

interface SecurePrintWrapperProps {
    children: React.ReactNode;
    documentType?: string;
    title?: string;
    documentId: string;
    verificationUrl?: string;
    language?: 'ar' | 'en' | 'ar-ly';
    triggerId?: string;
}

const SecurePrintWrapper: React.FC<SecurePrintWrapperProps> = ({
    children,
    documentType,
    title,
    documentId,
    verificationUrl = 'https://oraclecampus.edu.ly/verify',
    language = 'ar',
    triggerId
}) => {
    const currentUser = getCurrentUser();
    const printDate = new Date().toLocaleDateString(language !== 'en' ? 'ar-LY' : 'en-US');
    const printTime = new Date().toLocaleTimeString(language !== 'en' ? 'ar-LY' : 'en-US', { hour12: true });

    React.useEffect(() => {
        if (!triggerId) return;
        
        const handlePrint = () => {
            window.print();
        };

        window.addEventListener(triggerId, handlePrint);
        return () => window.removeEventListener(triggerId, handlePrint);
    }, [triggerId]);

    const activeTitle = title || documentType || 'Document';

    return (
        <div className="bg-white min-h-screen relative p-10 md:p-16 print:p-0 print:m-0" dir={language !== 'en' ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-10">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
                        {language !== 'en' ? 'جامعة أوراكل كامبس' : 'ORACLE CAMPUS UNIVERSITY'}
                    </h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                        {language !== 'en' ? 'وزارة التعليم العالي والبحث العلمي' : 'Ministry of Higher Education'}
                    </p>
                    <div className="mt-4 flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-full text-[8px] font-black w-fit uppercase italic tracking-widest">
                        <ShieldCheck size={10} />
                        {language !== 'en' ? 'مستند مؤمن رقمياً' : 'Digitally Secured Document'}
                    </div>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white mb-2 shadow-xl">
                        <Globe size={40} />
                    </div>
                    <span className="text-[8px] font-black text-slate-400 tracking-[0.4em] uppercase">Academic Node 01</span>
                </div>

                <div className="text-left space-y-1">
                    <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                        {activeTitle}
                    </h2>
                    <p className="text-[9px] font-mono font-black text-slate-400 opacity-60">REF_ID: {documentId}</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 min-h-[600px]">
                {children}
            </div>

            {/* Footer / Metadata */}
            <div className="mt-16 border-t-2 border-slate-100 pt-10 grid grid-cols-1 md:grid-cols-3 gap-10 items-end">
                {/* QR Code Section */}
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                        <QRCodeSVG value={`${verificationUrl}/${documentId}`} size={80} level="H" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Verification Node</p>
                        <p className="text-[10px] font-bold text-slate-600 break-all max-w-[150px]">{verificationUrl}/{documentId}</p>
                    </div>
                </div>

                {/* Print Metadata */}
                <div className="flex flex-col gap-2 text-[9px] font-black text-slate-400 uppercase tracking-tighter italic">
                    <div className="flex items-center gap-3">
                        <User size={12} className="text-slate-900" />
                        <span>{language !== 'en' ? 'تمت الطباعة بواسطة:' : 'PRINTED BY:'} <span className="text-slate-900">{currentUser?.name || 'Authorized System User'}</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Clock size={12} className="text-slate-900" />
                        <span>{language !== 'en' ? 'التوقيت:' : 'TIME:'} <span className="text-slate-900">{printDate} - {printTime}</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Fingerprint size={12} className="text-slate-900" />
                        <span>HASH_SIG: <span className="font-mono opacity-50">{documentId.split('-')[0] || 'SIG88'}</span></span>
                    </div>
                </div>

                {/* Signature Placeholder */}
                <div className="flex flex-col items-center">
                    <div className="w-full h-16 border-b-2 border-slate-900 mb-2 relative">
                        {/* Mock Digital Signature Graphic */}
                        <svg className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-20" width="100" height="40" viewBox="0 0 100 40">
                             <path d="M10 30 Q 30 10, 50 30 T 90 30" fill="none" stroke="black" strokeWidth="2" />
                        </svg>
                    </div>
                    <p className="text-[10px] font-black text-slate-900 uppercase">
                        {language !== 'en' ? 'توقيع الجهة المصدرة' : 'AUTHORIZED SIGNATURE'}
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">OFFICIAL SEAL REQUIRED</p>
                </div>
            </div>

            {/* Background Security Elements */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none -z-10 bg-[radial-gradient(#000_1px,transparent_0)] bg-[length:24px_24px]"></div>
        </div>
    );
};

export default SecurePrintWrapper;
