import React, { useState, useEffect } from 'react';
import { getStudents, getSystemSettings, saveSystemSettings } from '../services/storageService';
import { 
    getTransactions, 
    getStudentTransactions, 
    addTransaction, 
    calculateBalance, 
    getFinancialStats,
    calculateWalletBalance,
    depositToWallet,
    payWithWallet,
    getFinancialAlerts,
    generateStatement,
    FinancialAlert
} from '../services/financeService';
import { Student, Transaction, TransactionType, UserRole } from '../types';
import { logAction } from '../services/auditService';
import { notifySuccess, notifyError } from '../services/notificationService';
import { getCurrentUser } from '../services/authService';
import { DollarSign, CreditCard, TrendingUp, Search, Plus, FileText, ArrowUpRight, ArrowDownLeft, Wallet, Info, AlertCircle, Calendar, Printer, X, Zap, Globe, Settings, Save, CheckCircle2, QrCode, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import SecurePrintWrapper from './ui/SecurePrintWrapper';

import { cn } from '../lib/utils';

import { Language } from '../services/i18nService';

interface Props {
    language: Language;
}

const Financials: React.FC<Props> = ({ language }) => {
    const [activeTab, setActiveTab] = useState<'ledger' | 'settings'>('ledger');
    const [stats, setStats] = useState({ totalRevenue: 0, totalOutstanding: 0 });
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [studentBalance, setStudentBalance] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);
    const settings = getSystemSettings();
    const isPastPaymentDeadline = new Date() > new Date(settings.paymentDeadline);

    const [showDepositModal, setShowDepositModal] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');

    // Modal State
    const [showTxModal, setShowTxModal] = useState(false);
    const [txForm, setTxForm] = useState<{
        type: TransactionType;
        amount: string;
        category: string;
        description: string;
        referenceNo: string;
    }>({
        type: 'DEBIT',
        amount: '',
        category: 'TUITION',
        description: '',
        referenceNo: ''
    });

    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.role === UserRole.IT_ADMIN || currentUser?.role === UserRole.FINANCE_OFFICER;

    const [feeSettings, setFeeSettings] = useState(settings.finance);

    const handleSaveFeeSettings = (e: React.FormEvent) => {
        e.preventDefault();
        const currentSettings = getSystemSettings();
        saveSystemSettings({
            ...currentSettings,
            finance: feeSettings
        });
        notifySuccess(language === 'ar' ? 'تم تحديث سياسات الرسوم بنجاح' : 'Fee policies updated successfully');
        logAction(
            language === 'ar' ? 'تحديث الرسوم' : 'Update Fees', 
            language === 'ar' ? 'تم تعديل سياسات الرسوم الدراسية والخدمات' : 'Fees and services policies have been modified', 
            'warning'
        );
    };

    useEffect(() => {
        const allStudents = getStudents();
        setStudents(allStudents);
        setStats(getFinancialStats());

        if (currentUser?.role === UserRole.STUDENT) {
            const student = allStudents.find(s => s.id === currentUser.id);
            if (student) {
                setSelectedStudent(student);
            }
        }
    }, [currentUser]);

    const [showStatement, setShowStatement] = useState(false);
    const [showReceipt, setShowReceipt] = useState<Transaction | null>(null);
    const [financialAlerts, setFinancialAlerts] = useState<FinancialAlert[]>([]);
    const [isProcessingMoamalat, setIsProcessingMoamalat] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        if (status === 'success') {
            notifySuccess(language === 'ar' ? 'تمت عملية الدفع بنجاح! سيتم تحديث الرصيد قريباً.' : 'Payment successful! Balance will be updated soon.');
            // Update URL to remove status
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
        } else if (status === 'failed') {
            notifySuccess(language === 'ar' ? 'فشلت عملية الدفع، يرجى المحاولة مرة أخرى.' : 'Payment failed, please try again.');
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
        }
    }, [language]);

    const handleMoamalatPayment = async () => {
        if (!selectedStudent || studentBalance <= 0) return;
        
        setIsProcessingMoamalat(true);
        try {
            const response = await fetch('/api/moamalat/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: studentBalance.toFixed(2),
                    studentId: selectedStudent.id
                })
            });
            
            const data = await response.json();
            
            if (data.url) {
                // Create a hidden form and submit it to Moamalat
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = data.url;
                
                Object.entries(data.fields).forEach(([key, value]) => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = String(value);
                    form.appendChild(input);
                });
                
                document.body.appendChild(form);
                form.submit();
            } else {
                throw new Error('Failed to initiate payment');
            }
        } catch (error) {
            console.error('Moamalat Error:', error);
            notifyError(language === 'ar' ? 'فشلت عملية تهيئة الدفع. يرجى مراجعة الاتصال.' : 'Payment initiation failed. Please check connection.');
        } finally {
            setIsProcessingMoamalat(false);
        }
    };

    useEffect(() => {
        if (selectedStudent) {
            setTransactions(getStudentTransactions(selectedStudent.id));
            setStudentBalance(calculateBalance(selectedStudent.id));
            setWalletBalance(calculateWalletBalance(selectedStudent.id));
            setFinancialAlerts(getFinancialAlerts(selectedStudent.id));
        }
    }, [selectedStudent]);

    const handleDeposit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !depositAmount) return;

        depositToWallet(selectedStudent.id, parseFloat(depositAmount));
        setShowDepositModal(false);
        setDepositAmount('');
        
        // Refresh
        setTransactions(getStudentTransactions(selectedStudent.id));
        setStudentBalance(calculateBalance(selectedStudent.id));
        setWalletBalance(calculateWalletBalance(selectedStudent.id));
        notifySuccess(language === 'ar' ? 'تم شحن المحفظة بنجاح' : 'Wallet recharged successfully');
    };

    const handlePayFromWallet = (amount: number, description: string) => {
        if (!selectedStudent) return;
        
        const success = payWithWallet(selectedStudent.id, amount, description);
        if (success) {
            setTransactions(getStudentTransactions(selectedStudent.id));
            setStudentBalance(calculateBalance(selectedStudent.id));
            setWalletBalance(calculateWalletBalance(selectedStudent.id));
            notifySuccess(language === 'ar' ? 'تم السداد من المحفظة بنجاح' : 'Payment from wallet successful');
        } else {
            notifySuccess(language === 'ar' ? 'رصيد المحفظة غير كافٍ' : 'Insufficient wallet balance');
        }
    };

    const handleAddTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;

        const newTx: Transaction = {
            id: `TX-${Date.now()}`,
            studentId: selectedStudent.id,
            date: new Date().toISOString().split('T')[0],
            type: txForm.type,
            category: txForm.category as any,
            amount: parseFloat(txForm.amount),
            description: txForm.description,
            referenceNo: txForm.referenceNo || undefined,
            status: 'COMPLETED'
        };

        addTransaction(newTx);
        
        // Refresh local view
        setTransactions(prev => [newTx, ...prev]);
        const newBal = txForm.type === 'DEBIT' 
            ? studentBalance + newTx.amount 
            : studentBalance - newTx.amount;
        setStudentBalance(newBal);
        setStats(getFinancialStats()); // Refresh global stats

        logAction(
            language === 'ar' ? 'معاملة مالية' : 'Financial Transaction', 
            language === 'ar' 
                ? `تم إضافة ${txForm.type === 'DEBIT' ? 'مطالبة' : 'دفعة'} بقيمة ${newTx.amount} للطالب ${selectedStudent.name}`
                : `Added ${txForm.type === 'DEBIT' ? 'claim' : 'payment'} of ${newTx.amount} for student ${selectedStudent.name}`,
            'info'
        );
        notifySuccess(language === 'ar' ? 'تم تسجيل المعاملة بنجاح' : 'Transaction recorded successfully');
        setShowTxModal(false);
        setTxForm({ type: 'DEBIT', amount: '', category: 'TUITION', description: '', referenceNo: '' });
    };

    const filteredStudents = students.filter(s => 
        s.name.includes(searchTerm) || s.id.includes(searchTerm) || s.nationalId.includes(searchTerm)
    );

    return (
        <div className="p-8 h-screen flex flex-col">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Wallet className="text-blue-600" />
                        {language === 'ar' ? 'الإدارة المالية' : 'Financial Management'}
                    </h2>
                    <p className="text-slate-500 mt-1">
                        {language === 'ar' 
                            ? 'إدارة الرسوم الدراسية، المدفوعات، والذمم المالية للطلاب' 
                            : 'Management of tuition fees, payments, and student financial accounts'}
                    </p>
                </div>
                {isAdmin && (
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('ledger')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all",
                                activeTab === 'ledger' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <FileText size={18} />
                            {language === 'ar' ? 'السجل المالي' : 'Financial Ledger'}
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all",
                                activeTab === 'settings' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Settings size={18} />
                            {language === 'ar' ? 'سياسات الرسوم' : 'Fee Policies'}
                        </button>
                    </div>
                )}
            </div>

            {activeTab === 'ledger' ? (
                <>
            {/* Dashboard Cards */}
            {currentUser?.role !== UserRole.STUDENT && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-sm font-medium mb-1">
                                    {language === 'ar' ? 'إجمالي الإيرادات (المحصلة)' : 'Total Revenue (Collected)'}
                                </p>
                                <h3 className="text-2xl font-bold text-green-600">
                                    {stats.totalRevenue.toLocaleString()} {language === 'ar' ? 'د.ل' : 'LYD'}
                                </h3>
                            </div>
                            <div className="p-3 rounded-lg bg-green-50 text-green-600"><TrendingUp size={24}/></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-sm font-medium mb-1">
                                    {language === 'ar' ? 'الديون المستحقة' : 'Outstanding Debts'}
                                </p>
                                <h3 className="text-2xl font-bold text-red-600">
                                    {stats.totalOutstanding.toLocaleString()} {language === 'ar' ? 'د.ل' : 'LYD'}
                                </h3>
                            </div>
                            <div className="p-3 rounded-lg bg-red-50 text-red-600"><DollarSign size={24}/></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-sm font-medium mb-1">
                                    {language === 'ar' ? 'المعاملات الحديثة' : 'Recent Transactions'}
                                </p>
                                <h3 className="text-2xl font-bold text-blue-600">--</h3>
                            </div>
                            <div className="p-3 rounded-lg bg-blue-50 text-blue-600"><CreditCard size={24}/></div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex gap-6 flex-1 overflow-hidden">
                {/* Student Selection List */}
                {currentUser?.role !== UserRole.STUDENT && (
                    <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        <div className="p-4 border-b border-slate-200 bg-slate-50">
                            <div className="relative">
                                <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", language === 'ar' ? "right-3" : "left-3")} size={18} />
                                <input 
                                    type="text" 
                                    placeholder={language === 'ar' ? 'بحث عن طالب...' : 'Search for a student...'}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={cn(
                                        "w-full py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
                                        language === 'ar' ? "pr-10 pl-4 text-right" : "pl-10 pr-4 text-left"
                                    )}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {filteredStudents.map(student => (
                                <div 
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedStudent?.id === student.id ? 'bg-blue-50 border-blue-200' : ''}`}
                                >
                                    <div className={cn("flex justify-between items-start", language === 'ar' ? "flex-row" : "flex-row-reverse")}>
                                        <div className={language === 'ar' ? "text-right" : "text-left"}>
                                            <p className="font-bold text-slate-800">{student.name}</p>
                                            <p className="text-xs text-slate-500 font-mono">{student.id}</p>
                                        </div>
                                        <div className={language === 'ar' ? "text-left" : "text-right"}>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${student.program === 'دراسات عليا' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {student.program === 'دراسات عليا' ? (language === 'ar' ? 'ماجستير' : 'Master') : (language === 'ar' ? 'جامعي' : 'Undergraduate')}
                                    </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Ledger View */}
                <div className={`${currentUser?.role === UserRole.STUDENT ? 'w-full' : 'w-2/3'} bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col`}>
                    {selectedStudent ? (
                        <>
                            <div className={cn("p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center", language === 'en' && "flex-row-reverse")}>
                                <div className={language === 'ar' ? "text-right" : "text-left"}>
                                    <h3 className="font-bold text-lg text-slate-800">{selectedStudent.name}</h3>
                                    <p className="text-slate-500 text-sm">{selectedStudent.departmentId} - {selectedStudent.program}</p>
                                </div>
                                <div className={cn("flex gap-8", language === 'ar' ? "text-left" : "text-right")}>
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-black uppercase">{language === 'ar' ? 'رصيد المحفظة' : 'Wallet Balance'}</p>
                                        <p className="text-xl font-bold text-blue-600 font-mono">
                                            {walletBalance.toLocaleString()} {language === 'ar' ? 'د.ل' : 'LYD'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-black uppercase">{language === 'ar' ? 'إجمالي المستحقات' : 'Total Receivables'}</p>
                                        <p className={`text-xl font-bold font-mono ${studentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {studentBalance.toLocaleString()} {language === 'ar' ? 'د.ل' : 'LYD'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {currentUser?.role !== UserRole.STUDENT && (
                                <div className={cn("p-4 flex gap-3 border-b border-slate-200", language === 'ar' ? "flex-row" : "flex-row-reverse")}>
                                     <button 
                                         onClick={() => {
                                             setTxForm(prev => ({ ...prev, type: 'DEBIT', category: 'TUITION' }));
                                             setShowTxModal(true);
                                         }}
                                         className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                     >
                                         <FileText size={18} />
                                         {language === 'ar' ? 'إضافة رسوم (فاتورة)' : 'Add Fee (Invoice)'}
                                     </button>
                                     <button 
                                         onClick={() => {
                                             setTxForm(prev => ({ ...prev, type: 'CREDIT', category: 'PAYMENT_CASH' }));
                                             setShowTxModal(true);
                                         }}
                                         className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                     >
                                         <DollarSign size={18} />
                                         {language === 'ar' ? 'استلام دفعة' : 'Receive Payment'}
                                     </button>
                                 </div>
                            )}

                            {currentUser?.role === UserRole.STUDENT && (
                                <div className="space-y-4 p-4 border-b">
                                    {/* Financial Alerts */}
                                    {financialAlerts.length > 0 && (
                                        <div className="space-y-2">
                                            {financialAlerts.map(alert => (
                                                <div 
                                                    key={alert.id}
                                                    className={cn(
                                                        "p-3 rounded-xl flex items-center gap-3 border animate-in slide-in-from-right",
                                                        alert.type === 'CRITICAL' ? "bg-rose-50 border-rose-100 text-rose-800" :
                                                        alert.type === 'WARNING' ? "bg-amber-50 border-amber-100 text-amber-800" :
                                                        "bg-blue-50 border-blue-100 text-blue-800"
                                                    )}
                                                >
                                                    {alert.type === 'CRITICAL' ? <AlertCircle size={18} /> : 
                                                     alert.type === 'WARNING' ? <Zap size={18} /> : <Info size={18} />}
                                                    <p className="text-xs font-black">{alert.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div className={cn("bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-200 relative overflow-hidden group", language === 'ar' ? "text-right" : "text-left")}>
                                             <div className="relative z-10">
                                                 <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">
                                                     {language === 'ar' ? 'المحفظة الإلكترونية (e-Wallet)' : 'Electronic e-Wallet'}
                                                 </p>
                                                 <h4 className="text-3xl font-black mt-2">
                                                     {walletBalance.toLocaleString()} <span className="text-xs uppercase opacity-70">{language === 'ar' ? 'د.ل' : 'LYD'}</span>
                                                 </h4>
                                                 <div className="mt-6 flex gap-3">
                                                     <button 
                                                         onClick={() => setShowDepositModal(true)}
                                                         className="flex-1 bg-white text-blue-700 py-3 rounded-2xl text-xs font-black hover:bg-blue-50 transition-colors"
                                                     >
                                                         {language === 'ar' ? 'شحن الرصيد' : 'Top Up Balance'}
                                                     </button>
                                                 </div>
                                             </div>
                                             <Wallet size={120} className={cn("absolute -bottom-10 opacity-10 group-hover:scale-110 transition-transform", language === 'ar' ? "-left-10" : "-right-10")} />
                                         </div>

                                         <div className={cn("bg-white border-2 border-slate-100 p-6 rounded-[2rem] flex flex-col justify-between", language === 'ar' ? "text-right" : "text-left")}>
                                             <div>
                                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                     <QrCode size={12} className="text-blue-500" />
                                                     {language === 'ar' ? 'بيانات الإيداع المباشر (IBAN)' : 'Direct Deposit Details (IBAN)'}
                                                 </p>
                                                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between mb-4">
                                                     <div className="flex-1">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{settings.finance.bankName}</p>
                                                        <p className="text-sm font-black text-slate-800 font-mono tracking-tighter truncate">{settings.finance.iban}</p>
                                                        <p className="text-[9px] font-bold text-slate-500 mt-1">{settings.finance.accountName}</p>
                                                     </div>
                                                     <div className="bg-white p-2 rounded-xl border border-slate-200">
                                                        <QRCodeSVG 
                                                            value={`IBAN:${settings.finance.iban}\nStudent:${selectedStudent.id}\nName:${selectedStudent.name}`} 
                                                            size={50} 
                                                            level="H"
                                                            includeMargin={false}
                                                        />
                                                     </div>
                                                 </div>
                                                 <div className="flex gap-2">
                                                     <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(settings.finance.iban || '');
                                                            notifySuccess(language === 'ar' ? 'تم نسخ الآيبان' : 'IBAN Copied');
                                                        }}
                                                        className="flex-1 border border-slate-200 py-2 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                                     >
                                                         <Copy size={12} />
                                                         {language === 'ar' ? 'نسخ الآيبان' : 'Copy IBAN'}
                                                     </button>

                                                     <button 
                                                        disabled={studentBalance <= 0 || isProcessingMoamalat}
                                                        onClick={handleMoamalatPayment}
                                                        className={cn(
                                                            "flex-1 bg-slate-900 text-white py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50",
                                                            isProcessingMoamalat && "animate-pulse"
                                                        )}
                                                     >
                                                         <CreditCard size={12} />
                                                         {language === 'ar' ? 'سداد ببطاقة نمو/تداول' : 'Pay via Moamalat Card'}
                                                     </button>
                                                 </div>
                                             </div>
                                             
                                             <button 
                                                 onClick={() => setShowStatement(true)}
                                                 className="mt-4 w-full border-2 border-dashed border-slate-200 text-slate-400 py-3 rounded-2xl text-xs font-black hover:bg-slate-50 hover:text-slate-600 transition-all flex items-center justify-center gap-2"
                                             >
                                                 <FileText size={16} />
                                                 {language === 'ar' ? 'كشف حساب مالي (Statement)' : 'Financial Statement'}
                                             </button>
                                         </div>
                                     </div>
                                     
                                     {isPastPaymentDeadline && studentBalance > 0 && (
                                         <div className={cn("bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-800", language === 'en' && "flex-row-reverse")}>
                                             <AlertCircle size={20} />
                                             <div className={cn("flex-1", language === 'ar' ? "text-right" : "text-left")}>
                                                 <p className="text-sm font-black">
                                                     {language === 'ar' ? 'تنبيه: تم تجاوز الموعد النهائي للسداد' : 'Alert: Payment deadline has passed'}
                                                 </p>
                                                 <p className="text-[10px] opacity-70">
                                                     {language === 'ar' 
                                                        ? 'يرجى تسوية الرصيد المستحق لتجنب إيقاف القيد الأكاديمي.' 
                                                        : 'Please settle the outstanding balance to avoid academic suspension.'}
                                                 </p>
                                             </div>
                                         </div>
                                     )}
                                </div>
                            )}

                            <div className="flex-1 overflow-auto p-0">
                                <table className={cn("w-full", language === 'ar' ? "text-right" : "text-left")}>
                                    <thead className="bg-slate-50 text-slate-500 text-sm sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                                            <th className="px-6 py-3">{language === 'ar' ? 'النوع' : 'Type'}</th>
                                            <th className="px-6 py-3">{language === 'ar' ? 'البيان' : 'Description'}</th>
                                            <th className="px-6 py-3">{language === 'ar' ? 'مدين (عليه)' : 'Debit'}</th>
                                            <th className="px-6 py-3">{language === 'ar' ? 'دائن (له)' : 'Credit'}</th>
                                            <th className="px-6 py-3 no-print"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {transactions.map(tx => (
                                            <tr key={tx.id} className="hover:bg-slate-50 group">
                                                <td className="px-6 py-4 text-slate-600 font-mono text-sm">{tx.date}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${tx.type === 'DEBIT' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                        {language === 'ar' ? tx.category : tx.category.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-800 text-sm">
                                                    {tx.description}
                                                    {tx.referenceNo && <span className="block text-xs text-slate-400 font-mono mt-0.5">#{tx.referenceNo}</span>}
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-red-600">
                                                    {tx.type === 'DEBIT' ? tx.amount.toLocaleString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-green-600">
                                                    {tx.type === 'CREDIT' ? tx.amount.toLocaleString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-left no-print">
                                                    <button 
                                                        onClick={() => setShowReceipt(tx)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title={language === 'ar' ? 'طباعة إيصال' : 'Print Receipt'}
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {transactions.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">
                                        {language === 'ar' ? 'لا توجد معاملات مسجلة لهذا الطالب' : 'No recorded transactions for this student'}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <Wallet size={64} className="mb-4 opacity-20" />
                            <p>اختر طالباً من القائمة لعرض السجل المالي</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Financial Statement Modal */}
            {showStatement && selectedStudent && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className={cn("p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50", language === 'en' && "flex-row-reverse")}>
                            <div className={language === 'ar' ? "text-right" : "text-left"}>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tighter">
                                    {language === 'ar' ? 'كشف الحساب المالي الموحد' : 'Unified Financial Statement'}
                                </h3>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                                    {language === 'ar' ? 'نظام أوراكل كامبس التعليمي' : 'Oracle Campus Educational System'} • {new Date().toLocaleDateString(language === 'ar' ? 'ar-LY' : 'en-US')}
                                </p>
                            </div>
                            <div className={cn("flex gap-3", language === 'en' && "flex-row-reverse")}>
                                <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-slate-200 flex items-center gap-2 hover:bg-slate-800 transition-colors">
                                    <Printer size={16} /> {language === 'ar' ? 'طباعة' : 'Print'}
                                </button>
                                <button onClick={() => setShowStatement(false)} className="bg-white border border-slate-200 text-slate-400 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        
                        <div className={cn("flex-1 overflow-auto bg-white", language === 'ar' ? "text-right" : "text-left")} id="statement-content" dir={language === 'ar' ? "rtl" : "ltr"}>
                            <SecurePrintWrapper 
                                documentType={language === 'ar' ? 'كشف حساب مالي موحد' : 'Unified Financial Statement'}
                                documentId={`FIN-${selectedStudent.id}-${Date.now()}`}
                                language={language}
                            >
                                <div className="space-y-10 py-10 px-10">
                                    {/* Student Header */}
                                    <div className="grid grid-cols-2 gap-10 border-b border-slate-100 pb-10">
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'اسم الطالب' : 'Student Name'}</p>
                                                <p className="text-lg font-black text-slate-800">{selectedStudent.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'الرقم الدراسي' : 'Student ID'}</p>
                                                <p className="text-sm font-bold text-slate-600 font-mono">{selectedStudent.id}</p>
                                            </div>
                                        </div>
                                        <div className={cn("space-y-4", language === 'ar' ? "text-left" : "text-right")}>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'البرنامج الأكاديمي' : 'Academic Program'}</p>
                                                <p className="text-sm font-bold text-slate-800">{selectedStudent.program}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}</p>
                                                <p className="text-sm font-bold text-slate-600 font-mono">{new Date().toLocaleString(language === 'ar' ? 'ar-LY' : 'en-US')}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary Totals */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{language === 'ar' ? 'إجمالي الرسوم' : 'Total Fees'}</p>
                                            <p className="text-xl font-black text-slate-800 font-mono">{(transactions.filter(t => t.type === 'DEBIT').reduce((s,t)=>s+t.amount,0)).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{language === 'ar' ? 'إجمالي المدفوعات' : 'Total Payments'}</p>
                                            <p className="text-xl font-black text-emerald-600 font-mono">{(transactions.filter(t => t.type === 'CREDIT' && t.category !== 'WALLET_DEPOSIT').reduce((s,t)=>s+t.amount,0)).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{language === 'ar' ? 'رصيد المحفظة' : 'Wallet Balance'}</p>
                                            <p className="text-xl font-black text-blue-600 font-mono">{walletBalance.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-slate-900 p-6 rounded-3xl text-white">
                                            <p className="text-[9px] font-black opacity-60 uppercase mb-1">{language === 'ar' ? 'صافي الرصيد المستحق' : 'Net Balance Due'}</p>
                                            <p className="text-xl font-black font-mono">{studentBalance.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* Detailed List */}
                                    <div>
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{language === 'ar' ? 'تفاصيل الحركات المالية' : 'Financial Transaction Tracing'}</h4>
                                        <table className="w-full" dir={language === 'ar' ? "rtl" : "ltr"}>
                                            <thead className="bg-slate-50">
                                                <tr className="text-[10px] font-black text-slate-500 uppercase">
                                                    <th className={cn("px-6 py-4", language === 'ar' ? "text-right" : "text-left")}>{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                                                    <th className={cn("px-6 py-4", language === 'ar' ? "text-right" : "text-left")}>{language === 'ar' ? 'رقم المرجع' : 'Reference'}</th>
                                                    <th className={cn("px-6 py-4", language === 'ar' ? "text-right" : "text-left")}>{language === 'ar' ? 'نوع العملية' : 'Process Type'}</th>
                                                    <th className={cn("px-6 py-4", language === 'ar' ? "text-right" : "text-left")}>{language === 'ar' ? 'البيان' : 'Description'}</th>
                                                    <th className={cn("px-6 py-4", language === 'ar' ? "text-left" : "text-right")}>{language === 'ar' ? 'القيمة' : 'Amount'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {transactions.map(t => (
                                                    <tr key={t.id} className="text-xs border-b border-slate-50 last:border-0">
                                                        <td className="px-6 py-4 text-slate-500 font-mono">{t.date}</td>
                                                        <td className="px-6 py-4 text-slate-400 font-mono">{t.referenceNo || '---'}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={cn(
                                                                "px-2 py-1 rounded-md font-black text-[9px] uppercase",
                                                                t.type === 'DEBIT' ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                                            )}>
                                                                {language === 'ar' ? t.category : t.category.split('_').join(' ')}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-slate-700">{t.description}</td>
                                                        <td className={cn(
                                                            "px-6 py-4 font-black font-mono",
                                                            language === 'ar' ? "text-left" : "text-right",
                                                            t.type === 'DEBIT' ? "text-rose-600" : "text-emerald-600"
                                                        )}>
                                                            {t.type === 'DEBIT' ? '-' : '+'}{t.amount.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="space-y-10 py-10 px-10 border-t border-slate-100">
                                    {/* Terms and Secure Printing Footer moved inside wrapper */}
                                    <div className="grid grid-cols-2 gap-10">
                                        <div className="text-[9px] text-slate-400 space-y-2">
                                            <div className={cn("flex flex-col gap-1", language === 'ar' ? "text-right" : "text-left")}>
                                                <p className="font-bold text-slate-500">{language === 'ar' ? 'ملاحظات هامة:' : 'Important Notes:'}</p>
                                                <p>{language === 'ar' ? '• هذا الكشف صادر آلياً من المكتب المالي لنظام أوراكل كامبس التعليمي.' : '• This statement is auto-generated by Oracle Campus Financial Office.'}</p>
                                                <p>{language === 'ar' ? '• أي اعتراض على البيانات الواردة يجب أن يتم في غضون 7 أيام عمل من تاريخ الإصدار.' : '• Any disputes must be filed within 7 business days of the issue date.'}</p>
                                            </div>
                                            <div className={cn("pt-4 border-t border-slate-50 flex flex-col gap-2", language === 'ar' ? "text-right" : "text-left")}>
                                                <div className="flex items-center gap-2 text-indigo-400 font-black uppercase tracking-widest text-[8px]">
                                                    <Globe size={10} />
                                                    Secure Financial Node Verified
                                                </div>
                                                <div className="font-mono text-[8px] flex flex-col gap-1">
                                                    <span>ISSUED_BY: {currentUser?.name || 'SYSTEM_FINANCE'}</span>
                                                    <span>TIMESTAMP: {new Date().toLocaleString(language === 'ar' ? 'ar-LY' : 'en-US', { hour12: true })}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={language === 'ar' ? "text-left" : "text-right"}>
                                            <div className={cn("w-32 h-32 bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 group relative", language === 'ar' ? "ml-0 mr-auto" : "mr-0 ml-auto")}>
                                                <p className="text-[10px] text-slate-300 font-black uppercase rotate-[-45deg] group-hover:scale-110 transition-transform">
                                                    {language === 'ar' ? 'ختم المكتب المالي' : 'Financial Stamp'}
                                                </p>
                                                <div className="absolute inset-2 border border-slate-100 rounded-xl pointer-events-none"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SecurePrintWrapper>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {showReceipt && selectedStudent && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className={cn("p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50", language === 'en' && "flex-row-reverse")}>
                            <h3 className="font-black text-slate-800 italic uppercase">
                                {language === 'ar' ? 'معاينة الإيصال المالي' : 'Financial Receipt Preview'}
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black flex items-center gap-2">
                                    <Printer size={16} /> {language === 'ar' ? 'طباعة' : 'Print'}
                                </button>
                                <button onClick={() => setShowReceipt(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto bg-white p-0">
                            <SecurePrintWrapper
                                documentType={showReceipt.type === 'DEBIT' ? (language === 'ar' ? 'فاتورة مطالبة مالية' : 'Financial Invoice') : (language === 'ar' ? 'إيصال استلام مالي' : 'Payment Receipt')}
                                documentId={showReceipt.id}
                                language={language}
                            >
                                <div className="py-10 space-y-8">
                                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex justify-between items-start">
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'وصلنا من السيد / الطالب' : 'Received From'}</p>
                                                <p className="text-xl font-black text-slate-900">{selectedStudent.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'الرقم الدراسي' : 'Student ID'}</p>
                                                <p className="text-sm font-bold text-slate-600 font-mono">{selectedStudent.id}</p>
                                            </div>
                                        </div>
                                        <div className="text-left bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                             <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{language === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}</p>
                                             <p className="text-3xl font-black text-slate-900 font-mono">{showReceipt.amount.toLocaleString()} <span className="text-sm opacity-40">LYD</span></p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-10">
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'وذلك عن' : 'For / Description'}</p>
                                                <p className="text-sm font-bold text-slate-800 leading-relaxed">{showReceipt.description}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'طريقة العملية' : 'Payment Method'}</p>
                                                <p className="text-sm font-bold text-slate-600">{showReceipt.category.split('_').join(' ')}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4 text-left">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'تاريخ العملية' : 'Transaction Date'}</p>
                                                <p className="text-sm font-bold text-slate-800 font-mono">{showReceipt.date}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'حالة القبول' : 'Validation Status'}</p>
                                                <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase">
                                                    <CheckCircle2 size={14} /> {language === 'ar' ? 'عملية مؤكدة' : 'Confirmed Transaction'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-10 border-t border-dashed border-slate-200">
                                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Notice:</p>
                                            <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">
                                                {language === 'ar' 
                                                    ? 'يعتبر هذا الإيصال صحيحاً ومؤكداً من النظام المالي المركزي لجامعة أوراكل كامبس. في حال الدفع بصك، لا يعتبر الإيصال نهائياً إلا بعد تحصيل القيمة فعلياً من المصرف.'
                                                    : 'This receipt is considered valid and confirmed by the central financial system of Oracle Campus University. In case of cheque payments, the receipt is not final until the value is actually collected from the bank.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </SecurePrintWrapper>
                        </div>
                    </div>
                </div>
            )}

            {/* Deposit Modal */}
            {showDepositModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-blue-600 text-white p-4">
                            <h3 className={cn("text-lg font-bold", language === 'ar' ? "text-right" : "text-left")}>
                                {language === 'ar' ? 'إيداع رصيد في المحفظة' : 'Recharge e-Wallet Balance'}
                            </h3>
                        </div>
                        <form onSubmit={handleDeposit} className="p-6 space-y-4">
                            <div className={language === 'ar' ? "text-right" : "text-left"}>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {language === 'ar' ? 'المبلغ المراد إيداعه (د.ل)' : 'Amount to Deposit (LYD)'}
                                </label>
                                <input 
                                    required type="number" step="0.01" min="1"
                                    value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                                    className={cn(
                                        "w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 font-mono",
                                        language === 'ar' ? "text-right" : "text-left"
                                    )}
                                    placeholder="0.00"
                                />
                            </div>
                            <p className={cn("text-[10px] text-slate-500 italic", language === 'ar' ? "text-right" : "text-left")}>
                                {language === 'ar' 
                                    ? 'ملاحظة: سيتم إضافة هذا المبلغ إلى محفظتك الإلكترونية لتتمكن من استخدامها لاحقاً في دفع الرسوم الدراسية.'
                                    : 'Note: This amount will be added to your e-wallet to be used later for tuition payments.'}
                            </p>
                            <div className={cn("pt-2 flex gap-3", language === 'ar' ? "justify-start" : "justify-end")}>
                                <button type="button" onClick={() => setShowDepositModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-bold">
                                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-lg shadow-blue-100">
                                    {language === 'ar' ? 'تأكيد الإيداع' : 'Confirm Deposit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Transaction Modal */}
            {showTxModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-900 text-white p-4">
                            <h3 className={cn("text-lg font-bold", language === 'ar' ? "text-right" : "text-left")}>
                                {txForm.type === 'DEBIT' 
                                    ? (language === 'ar' ? 'إضافة مطالبة مالية' : 'Add Financial Claim') 
                                    : (language === 'ar' ? 'استلام دفعة مالية' : 'Receive Financial Payment')}
                            </h3>
                        </div>
                        <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                <button 
                                    type="button"
                                    onClick={() => setTxForm({...txForm, type: 'DEBIT'})}
                                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${txForm.type === 'DEBIT' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}
                                >
                                    <ArrowUpRight size={16} /> {language === 'ar' ? 'مطالبة (Debit)' : 'Debit'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setTxForm({...txForm, type: 'CREDIT'})}
                                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${txForm.type === 'CREDIT' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}
                                >
                                    <ArrowDownLeft size={16} /> {language === 'ar' ? 'دفعة (Credit)' : 'Credit'}
                                </button>
                            </div>
                            
                            <div className={language === 'ar' ? "text-right" : "text-left"}>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ar' ? 'المبلغ (د.ل)' : 'Amount (LYD)'}</label>
                                <input 
                                    required type="number" step="0.01" min="0"
                                    value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})}
                                    className={cn(
                                        "w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 font-mono",
                                        language === 'ar' ? "text-right" : "text-left"
                                    )}
                                />
                            </div>

                            <div className={language === 'ar' ? "text-right" : "text-left"}>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ar' ? 'التصنيف' : 'Category'}</label>
                                <select 
                                    value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                                >
                                    {txForm.type === 'DEBIT' ? (
                                        <>
                                            <option value="TUITION">{language === 'ar' ? 'رسوم دراسية' : 'Tuition Fees'}</option>
                                            <option value="LAB_FEE">{language === 'ar' ? 'رسوم معامل' : 'Lab Fees'}</option>
                                            <option value="REGISTRATION">{language === 'ar' ? 'تجديد قيد' : 'Registration Renewal'}</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="PAYMENT_CASH">{language === 'ar' ? 'دفع نقدي' : 'Cash Payment'}</option>
                                            <option value="PAYMENT_BANK">{language === 'ar' ? 'تحويل مصرفي' : 'Bank Transfer'}</option>
                                            <option value="SCHOLARSHIP">{language === 'ar' ? 'منحة دراسية' : 'Scholarship'}</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className={language === 'ar' ? "text-right" : "text-left"}>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ar' ? 'البيان / التفاصيل' : 'Statement / Details'}</label>
                                <input 
                                    required type="text"
                                    value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                                    placeholder={txForm.type === 'DEBIT' ? (language === 'ar' ? 'رسوم خريف 2024' : 'Autumn 2024 Fees') : (language === 'ar' ? 'إيصال رقم...' : 'Receipt number...')}
                                />
                            </div>

                            <div className={language === 'ar' ? "text-right" : "text-left"}>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ar' ? 'رقم المرجع (اختياري)' : 'Reference Number (Optional)'}</label>
                                <input 
                                    type="text"
                                    value={txForm.referenceNo} onChange={e => setTxForm({...txForm, referenceNo: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                                    placeholder={language === 'ar' ? 'رقم الصك، رقم الإيصال...' : 'Cheque number, receipt number...'}
                                />
                            </div>

                            <div className={cn("pt-2 flex gap-3", language === 'ar' ? "justify-start" : "justify-end")}>
                                <button type="button" onClick={() => setShowTxModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">
                                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    {language === 'ar' ? 'حفظ المعاملة' : 'Save Transaction'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
                </>
            ) : null}
            {/* Fee Settings Tab Content */}
            {activeTab === 'settings' && isAdmin && (
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto p-10 animate-in fade-in duration-500">
                    <div className="max-w-4xl mx-auto">
                        <div className={cn("mb-10", language === 'ar' ? "text-right" : "text-left")} dir={language === 'ar' ? "rtl" : "ltr"}>
                            <h3 className="text-2xl font-black text-slate-800 italic uppercase">
                                {language === 'ar' ? 'لوحة تهيئة الرسوم' : 'Fee Configuration Panel'}
                            </h3>
                            <p className="text-slate-500 text-sm font-bold mt-2 uppercase tracking-widest opacity-60">
                                {language === 'ar' 
                                    ? 'تعديل أسعار الوحدات الدراسية والرسوم الإدارية وفق سياسة الجامعة' 
                                    : 'Modify academic unit rates and administrative fees according to university policy'}
                            </p>
                        </div>

                        <form onSubmit={handleSaveFeeSettings} className="space-y-10" dir={language === 'ar' ? "rtl" : "ltr"}>
                            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8", language === 'ar' ? "text-right" : "text-left")}>
                                {/* Academic Unit Rates */}
                                <div className="space-y-6">
                                    <h4 className={cn("text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2", language === 'en' && "flex-row-reverse")}>
                                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                                        {language === 'ar' ? 'أسعار الوحدات الدراسية (الخطة)' : 'Academic Unit Rates'}
                                    </h4>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                                            {language === 'ar' ? 'سعر الوحدة - البكالوريوس (د.ل)' : 'Undergraduate rate (LYD)'}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                value={feeSettings.undergraduateRatePerCredit}
                                                onChange={e => setFeeSettings({...feeSettings, undergraduateRatePerCredit: parseFloat(e.target.value)})}
                                                className={cn("w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black italic text-sm focus:ring-4 focus:ring-blue-500/5 transition-all outline-none", language === 'ar' ? "text-right" : "text-left")}
                                            />
                                            <DollarSign className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300", language === 'ar' ? "left-4" : "right-4")} size={18} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                                            {language === 'ar' ? 'سعر الوحدة - الدراسات العليا (د.ل)' : 'Postgraduate rate (LYD)'}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                value={feeSettings.postgraduateRatePerCredit}
                                                onChange={e => setFeeSettings({...feeSettings, postgraduateRatePerCredit: parseFloat(e.target.value)})}
                                                className={cn("w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black italic text-sm focus:ring-4 focus:ring-blue-500/5 transition-all outline-none", language === 'ar' ? "text-right" : "text-left")}
                                            />
                                            <DollarSign className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300", language === 'ar' ? "left-4" : "right-4")} size={18} />
                                        </div>
                                    </div>
                                </div>

                                {/* Administrative & Services Fees */}
                                <div className="space-y-6">
                                    <h4 className={cn("text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2", language === 'en' && "flex-row-reverse")}>
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                                        {language === 'ar' ? 'الرسوم الإدارية والخدمات' : 'Administrative & Service Fees'}
                                    </h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                                                {language === 'ar' ? 'رسوم القيد السنوي' : 'Registration Fee'}
                                            </label>
                                            <input 
                                                type="number" 
                                                value={feeSettings.registrationFee}
                                                onChange={e => setFeeSettings({...feeSettings, registrationFee: parseFloat(e.target.value)})}
                                                className={cn("w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black italic text-sm outline-none", language === 'ar' ? "text-right" : "text-left")}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                                                {language === 'ar' ? 'غرامات التأخير' : 'Late Fees'}
                                            </label>
                                            <input 
                                                type="number" 
                                                value={feeSettings.lateFee}
                                                onChange={e => setFeeSettings({...feeSettings, lateFee: parseFloat(e.target.value)})}
                                                className={cn("w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black italic text-sm outline-none", language === 'ar' ? "text-right" : "text-left")}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                                                {language === 'ar' ? 'رسوم إصدار الإفادات' : 'Transcript Fees'}
                                            </label>
                                            <input 
                                                type="number" 
                                                value={feeSettings.transcriptFee}
                                                onChange={e => setFeeSettings({...feeSettings, transcriptFee: parseFloat(e.target.value)})}
                                                className={cn("w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black italic text-sm outline-none", language === 'ar' ? "text-right" : "text-left")}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                                                {language === 'ar' ? 'رسوم البطاقة الرقمية' : 'ID Card Fee'}
                                            </label>
                                            <input 
                                                type="number" 
                                                value={feeSettings.idCardFee}
                                                onChange={e => setFeeSettings({...feeSettings, idCardFee: parseFloat(e.target.value)})}
                                                className={cn("w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black italic text-sm outline-none", language === 'ar' ? "text-right" : "text-left")}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Banking Details */}
                                <div className="space-y-6 col-span-1 md:col-span-2 pt-6 border-t border-slate-100">
                                    <h4 className={cn("text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2", language === 'en' && "flex-row-reverse")}>
                                        <div className="w-2 h-2 bg-emerald-600 rounded-full" />
                                        {language === 'ar' ? 'بيانات الحساب المصرفي (للإيداع المباشر)' : 'Bank Account Details (Direct Deposit)'}
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                                                {language === 'ar' ? 'اسم المصرف' : 'Bank Name'}
                                            </label>
                                            <input 
                                                type="text" 
                                                value={feeSettings.bankName || ''}
                                                onChange={e => setFeeSettings({...feeSettings, bankName: e.target.value})}
                                                className={cn("w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none", language === 'ar' ? "text-right" : "text-left")}
                                                placeholder={language === 'ar' ? 'مصرف الوحدة...' : 'Unity Bank...'}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                                                {language === 'ar' ? 'اسم الحساب' : 'Account Name'}
                                            </label>
                                            <input 
                                                type="text" 
                                                value={feeSettings.accountName || ''}
                                                onChange={e => setFeeSettings({...feeSettings, accountName: e.target.value})}
                                                className={cn("w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none", language === 'ar' ? "text-right" : "text-left")}
                                                placeholder={language === 'ar' ? 'نظام أوراكل...' : 'Oracle System...'}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                                                {language === 'ar' ? 'رقم IBAN' : 'IBAN Number'}
                                            </label>
                                            <input 
                                                type="text" 
                                                value={feeSettings.iban || ''}
                                                onChange={e => setFeeSettings({...feeSettings, iban: e.target.value})}
                                                className={cn("w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-mono text-sm outline-none", language === 'ar' ? "text-right" : "text-left")}
                                                placeholder="LY89 0000..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 border-t border-slate-100">
                                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 mb-8 flex items-start gap-4">
                                    <AlertCircle className="text-amber-600 mt-1" size={24} />
                                    <div className={cn("space-y-2", language === 'ar' ? "text-right" : "text-left")}>
                                        <p className="text-sm font-black text-amber-900 uppercase">
                                            {language === 'ar' ? 'تأكيد السياسة المالية لإخلاء المسؤولية' : 'Financial Policy Disclaimer Confirmation'}
                                        </p>
                                        <p className="text-xs text-amber-700 leading-relaxed font-bold">
                                            {language === 'ar' 
                                                ? 'تعديل هذه القيم سيؤثر فوراً على جميع الفواتير والمطالبات المالية الجديدة التي يتم إنشاؤها آلياً في النظام. يرجى التأكد من مطابقة هذه القيم لللوائح المعتمدة من مجلس إدارة الجامعة.' 
                                                : 'Modifying these values will immediately affect all new invoices and financial claims automatically generated in the system. Please ensure these values match the approved regulations from the University Board.'}
                                        </p>
                                    </div>
                                </div>

                                <div className={cn("flex gap-4", language === 'ar' ? "justify-end" : "justify-start flex-row-reverse")}>
                                    <div className={cn("space-y-2 w-full max-w-xs", language === 'ar' ? "ml-0 mr-auto" : "mr-0 ml-auto")}>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                                            {language === 'ar' ? 'الحد الأقصى للمديونية (Debt Cap)' : 'Maximum Debt Cap (LYD)'}
                                        </label>
                                        <input 
                                            type="number" 
                                            value={feeSettings.maxDebtLimit}
                                            onChange={e => setFeeSettings({...feeSettings, maxDebtLimit: parseFloat(e.target.value)})}
                                            className="w-full p-4 bg-slate-900 text-white rounded-2xl font-black italic text-lg outline-none text-center"
                                        />
                                    </div>

                                    <button 
                                        type="submit"
                                        className="h-full px-12 bg-blue-600 text-white rounded-2xl font-black text-sm italic uppercase tracking-widest shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 self-end py-5"
                                    >
                                        <Save size={20} />
                                        {language === 'ar' ? 'تثبيت السياسات الجديدة' : 'Apply New Policies'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Financials;