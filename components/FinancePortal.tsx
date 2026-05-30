import React, { useState, useEffect } from 'react';
import { getTransactions, getStudentBalance, getStudentTransactions } from '../services/storageService';
import { moamalatPayment } from '../services/financeService';
import { Transaction, UserRole } from '../types';
import { Wallet, Receipt, TrendingUp, TrendingDown, Clock, Search, CreditCard, Landmark, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { notifySuccess } from '../services/notificationService';
import { Language } from '../services/i18nService';

interface FinancePortalProps {
    language: Language;
}

const FinancePortal: React.FC<FinancePortalProps> = ({ language }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    
    const [isMoamalatModalOpen, setIsMoamalatModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    
    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.role !== UserRole.STUDENT;

    const t = {
        title: language === 'ar' ? 'النظام المالي الدراسي' : 'Academic Financial System',
        subtitle: language === 'ar' ? 'إدارة الدفعات والرسوم الدراسية والمنح' : 'Manage student balances, ledger payments, and stipends',
        currentBalance: language === 'ar' ? 'الرصيد الحالي' : 'Current Balance',
        totalPaid: language === 'ar' ? 'إجمالي المسدد' : 'Total Paid Amount',
        totalCharges: language === 'ar' ? 'إجمالي الرسوم' : 'Total Applied Fees',
        availableMethods: language === 'ar' ? 'طرق الدفع المتاحة' : 'Accepted Payment Gateways',
        methodsDesc: language === 'ar' ? 'تطبيقات مصرفية، صكوك مصدقة، كاش' : 'Online banking, certified cheques, cash desk',
        onlinePaymentBtn: language === 'ar' ? 'دفع إلكتروني (معاملات)' : 'Electronic Payment (Moamalat)',
        specialDeptPaymentBtn: language === 'ar' ? 'دفع رسوم تخصص' : 'Enrollment Fees Payment',
        moamalatGateway: language === 'ar' ? 'بوابة دفع معاملات' : 'Moamalat Payment Gateway',
        directPaymentSystem: language === 'ar' ? 'نظام الدفع الإلكتروني المباشر' : 'Secure instant credit card settlement web interface',
        amountToPay: language === 'ar' ? 'المبلغ المراد دفعه (دينار ليبي)' : 'Desired Deposit Amount (LYD)',
        gatewayCommission: language === 'ar' ? 'عمولة المعاملة:' : 'Transactional Commission Fee:',
        cancelBtn: language === 'ar' ? 'إلغاء' : 'Cancel',
        confirmPaymentBtn: language === 'ar' ? 'تأكيد الدفع' : 'Verify & Authorize',
        ledgerHeader: language === 'ar' ? 'سجل الحركات المالية' : 'Academic Ledger Accounts',
        searchPlaceholder: language === 'ar' ? 'بحث برقم الحركة...' : 'Filter ledger entries...',
        allCategories: language === 'ar' ? 'كل الفئات' : 'All Ledger Items',
        tuitionCategory: language === 'ar' ? 'الرسوم الدراسية' : 'Tuition Fees',
        labCategory: language === 'ar' ? 'رسوم معامل' : 'Laboratory Fees',
        bankPaymentCategory: language === 'ar' ? 'تحويل مصرفي' : 'Bank Transfer',
        scholarshipCategory: language === 'ar' ? 'منحة دراسية' : 'Scholarship Grant',
        dateHeader: language === 'ar' ? 'تاريخ الحركة' : 'Ledger Date',
        descHeader: language === 'ar' ? 'الوصف والفئة' : 'Description & Category',
        refHeader: language === 'ar' ? 'المرجع' : 'Reference Number',
        amountHeader: language === 'ar' ? 'المبلغ' : 'Amount',
        statusHeader: language === 'ar' ? 'الحالة' : 'Status',
        lydSuffix: language === 'ar' ? 'د.ل' : 'LYD',
        noRecords: language === 'ar' ? 'لا توجد حركات مالية مسجلة' : 'No recorded transactions found in ledger database',
        completedStatus: language === 'ar' ? 'مكتمل' : 'Completed',
        pendingStatus: language === 'ar' ? 'قيد المعالجة' : 'Pending Review',
        failedStatus: language === 'ar' ? 'فاشل' : 'Unsuccessful',
        commitmentTitle: language === 'ar' ? 'التزام بالسداد' : 'Financial Compliance Decree',
        commitmentDesc: language === 'ar' ? 'يُرجى تسوية أي مبالغ مستحقة قبل فترات الامتحانات النهائية لضمان عدم حجب النتائج أو تأخير عملية إعادة التسجيل للفصل القادم.' : 'Outstanding dues must be fully cleared before final assessment periods under academic regulations to ensure scores publication.',
        reportTitle: language === 'ar' ? 'استخراج التقارير المالية' : 'Ledger Records Export',
        reportDesc: language === 'ar' ? 'يمكنك تحميل كشف الحساب المعتمد لغرض تقديمه لجهات العمل أو للحصول على المنح الخارجية من خلال أيقونة التحميل في أعلى اللوحة.' : 'Verified bank ledgers or balance certificates can be generated for external scholarships, employer sponsorship, or visa bureaus.',
    };

    const handleMoamalatPayment = async () => {
        if (!currentUser || paymentAmount <= 0) return;
        
        setIsMoamalatModalOpen(false);
        const result = await moamalatPayment(currentUser.id, paymentAmount, language === 'ar' ? 'دفع رسوم دراسية' : 'Academic Tuition Fee Payment');
        
        if (result.success) {
            notifySuccess(result.message);
            const studentTxs = getStudentTransactions(currentUser.id);
            const studentBalance = getStudentBalance(currentUser.id);
            setTransactions(studentTxs);
            setBalance(studentBalance);
        }
    };

    useEffect(() => {
        if (currentUser?.role === UserRole.STUDENT) {
            const studentTxs = getStudentTransactions(currentUser.id);
            const studentBalance = getStudentBalance(currentUser.id);
            setTransactions(studentTxs);
            setBalance(studentBalance);
        } else {
            setTransactions(getTransactions());
        }
    }, [currentUser]);

    const filteredTransactions = transactions.filter(tx => {
        const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             tx.referenceNo?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'ALL' || tx.category === filterCategory;
        return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const stats = {
        totalPaid: transactions.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.amount, 0),
        totalCharges: transactions.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.amount, 0),
        pendingExams: transactions.filter(t => t.status === 'PENDING').length
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex justify-between items-end bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.title}</h1>
                    <p className="text-slate-500 mt-1">{t.subtitle}</p>
                </div>
                {!isAdmin && (
                    <div className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t.currentBalance}</span>
                        <span className={cn(
                            "text-3xl font-black",
                            balance >= 0 ? "text-green-400" : "text-rose-400"
                        )}>
                            {balance.toLocaleString()} {t.lydSuffix}
                        </span>
                    </div>
                )}
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-green-50 rounded-2xl text-green-600">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.totalPaid}</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{stats.totalPaid.toLocaleString()} {t.lydSuffix}</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                            <TrendingDown size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.totalCharges}</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{stats.totalCharges.toLocaleString()} {t.lydSuffix}</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm col-span-2 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-50 rounded-3xl text-blue-600">
                            <CreditCard size={32} />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900">{t.availableMethods}</h4>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">{t.methodsDesc}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsMoamalatModalOpen(true)}
                            className="px-4 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
                        >
                            <CreditCard size={14} />
                            {t.onlinePaymentBtn}
                        </button>
                        <button className="px-4 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                            {t.specialDeptPaymentBtn}
                        </button>
                    </div>
                </div>
            </div>

            {/* Moamalat Payment Modal */}
            <AnimatePresence>
                {isMoamalatModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl border border-slate-100"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-600">
                                    <CreditCard size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 leading-tight">{t.moamalatGateway}</h3>
                                    <p className="text-xs font-bold text-slate-400">{t.directPaymentSystem}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">{t.amountToPay}</label>
                                    <input 
                                        type="number" 
                                        value={paymentAmount || ''}
                                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
                                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xl font-black focus:ring-2 focus:ring-indigo-500/20 text-center"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center justify-between">
                                    <span className="text-xs font-black text-emerald-700">{t.gatewayCommission}</span>
                                    <span className="text-sm font-black text-emerald-600">0.000 {t.lydSuffix}</span>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={() => setIsMoamalatModalOpen(false)}
                                        className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                                    >
                                        {t.cancelBtn}
                                    </button>
                                    <button 
                                        onClick={handleMoamalatPayment}
                                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95"
                                    >
                                        {t.confirmPaymentBtn}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Transactions View */}
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Receipt size={24} className="text-slate-400" />
                        <h2 className="font-black text-xl text-slate-900">{t.ledgerHeader}</h2>
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text"
                                placeholder={t.searchPlaceholder}
                                className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-600"
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                        >
                            <option value="ALL">{t.allCategories}</option>
                            <option value="TUITION">{t.tuitionCategory}</option>
                            <option value="LAB_FEE">{t.labCategory}</option>
                            <option value="PAYMENT_BANK">{t.bankPaymentCategory}</option>
                            <option value="SCHOLARSHIP">{t.scholarshipCategory}</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.dateHeader}</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.descHeader}</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.refHeader}</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.amountHeader}</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t.statusHeader}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <AnimatePresence>
                                {filteredTransactions.map(tx => (
                                    <motion.tr 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        key={tx.id}
                                        className="group hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900">
                                                    {new Date(tx.date).toLocaleDateString(language === 'ar' ? 'ar-LY' : 'en-US')}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {new Date(tx.date).toLocaleTimeString(language === 'ar' ? 'ar-LY' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-lg",
                                                    tx.type === 'CREDIT' ? "bg-green-100 text-green-600" : "bg-rose-100 text-rose-600"
                                                )}>
                                                    {tx.type === 'CREDIT' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800">{tx.description}</span>
                                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">{tx.category}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-xs font-mono font-bold text-slate-500">{tx.referenceNo || '---'}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={cn(
                                                "text-lg font-black",
                                                tx.type === 'CREDIT' ? "text-green-600" : "text-rose-600"
                                            )}>
                                                {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount.toLocaleString()} {t.lydSuffix}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                                tx.status === 'COMPLETED' ? "bg-green-50 text-green-600" : 
                                                tx.status === 'PENDING' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                                            )}>
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    tx.status === 'COMPLETED' ? "bg-green-500" : 
                                                    tx.status === 'PENDING' ? "bg-amber-500 animate-pulse" : "bg-rose-500"
                                                )} />
                                                {tx.status === 'COMPLETED' ? t.completedStatus : tx.status === 'PENDING' ? t.pendingStatus : t.failedStatus}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Receipt size={64} className="mx-auto mb-4 opacity-5" />
                                        <p className="text-sm font-black text-slate-300 uppercase tracking-widest">{t.noRecords}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Help/Notice Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 flex gap-4">
                    <Landmark size={24} className="text-blue-600 shrink-0" />
                    <div>
                        <h4 className="font-black text-blue-900 text-sm">{t.commitmentTitle}</h4>
                        <p className="text-xs font-bold text-blue-700/80 mt-1 leading-relaxed">
                            {t.commitmentDesc}
                        </p>
                    </div>
                </div>
                <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 flex gap-4">
                    <FileText size={24} className="text-amber-600 shrink-0" />
                    <div>
                        <h4 className="font-black text-amber-900 text-sm">{t.reportTitle}</h4>
                        <p className="text-xs font-bold text-amber-700/80 mt-1 leading-relaxed">
                            {t.reportDesc}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancePortal;
