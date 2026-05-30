import { Transaction, Student } from '../types';
import { getStudents, getSystemSettings } from './storageService';

const STORAGE_KEY_TRANSACTIONS = 'oracle_campus_transactions';

const MOCK_TRANSACTIONS: Transaction[] = [
    { id: 'TX001', studentId: 'STU2023001', date: '2026-09-01', type: 'DEBIT', category: 'REGISTRATION', amount: 50, description: 'رسوم تجديد القيد خريف 2024', status: 'COMPLETED' },
    { id: 'TX002', studentId: 'STU2023001', date: '2026-09-05', type: 'DEBIT', category: 'TUITION', amount: 450, description: 'رسوم دراسية (15 وحدة)', status: 'COMPLETED' },
    { id: 'TX003', studentId: 'STU2023001', date: '2026-09-10', type: 'CREDIT', category: 'PAYMENT_CASH', amount: 500, description: 'إيصال مالي رقم 5543', referenceNo: 'REC-5543', status: 'COMPLETED' },
    
    // Student Wallet Seed Data (STU2023001)
    { id: 'TXW001', studentId: 'STU2023001', date: '2026-05-15', type: 'CREDIT', category: 'WALLET_DEPOSIT', amount: 350, description: 'شحن رصيد المحفظة عبر كاش موبايل', referenceNo: 'SAD-30291', status: 'COMPLETED' },
    { id: 'TXW002', studentId: 'STU2023001', date: '2026-05-16', type: 'CREDIT', category: 'WALLET_PAYMENT', amount: 12, description: 'دفع رسوم من المحفظة: تذكرة طعام الغداء بالبوفيه', status: 'COMPLETED' },
    { id: 'TXW003', studentId: 'STU2023001', date: '2026-05-18', type: 'CREDIT', category: 'WALLET_PAYMENT', amount: 5.5, description: 'دفع رسوم من المحفظة: ميكرو كابتشينو وحلوى الكافتيريا', status: 'COMPLETED' },
    { id: 'TXW004', studentId: 'STU2023001', date: '2026-05-19', type: 'CREDIT', category: 'WALLET_PAYMENT', amount: 15, description: 'دفع رسوم من المحفظة: الاشتراك بالنادي الصحي اليومي', status: 'COMPLETED' },
    { id: 'TXW005', studentId: 'STU2023001', date: '2026-05-20', type: 'CREDIT', category: 'WALLET_PAYMENT', amount: 8.75, description: 'دفع رسوم من المحفظة: طباعة وتصوير مذكرة الهندسة التحليلية', status: 'COMPLETED' },
    { id: 'TXW006', studentId: 'STU2023001', date: '2026-05-21', type: 'CREDIT', category: 'WALLET_PAYMENT', amount: 3.25, description: 'دفع رسوم من المحفظة: بسكويت وقهوة باردة من جهاز الخدمة الذاتية', status: 'COMPLETED' },
    { id: 'TXW007', studentId: 'STU2023001', date: '2026-05-23', type: 'CREDIT', category: 'WALLET_DEPOSIT', amount: 180, description: 'شحن رصيد المحفظة عبر تحويل مباشر آيبان', referenceNo: 'IBAN-88301', status: 'COMPLETED' },
    { id: 'TXW008', studentId: 'STU2023001', date: '2026-05-24', type: 'CREDIT', category: 'WALLET_PAYMENT', amount: 45, description: 'حوالة مرسلة إلى الطالب: أحمد العريبي (STU2023002)', status: 'COMPLETED' },
    { id: 'TXW009', studentId: 'STU2023001', date: '2026-05-25', type: 'CREDIT', category: 'WALLET_PAYMENT', amount: 20, description: 'دفع رسوم من المحفظة: إيداع في حصالة الادخار', status: 'COMPLETED' },

    { id: 'TX004', studentId: 'STU2022099', date: '2026-09-01', type: 'DEBIT', category: 'REGISTRATION', amount: 100, description: 'رسوم قيد دراسات عليا', status: 'COMPLETED' },
    { id: 'TX005', studentId: 'STU2022099', date: '2026-09-02', type: 'DEBIT', category: 'TUITION', amount: 1500, description: 'رسوم الفصل الدراسي (ماجستير)', status: 'COMPLETED' },
    { id: 'TX006', studentId: 'STU2022099', date: '2026-09-15', type: 'CREDIT', category: 'PAYMENT_BANK', amount: 800, description: 'تحويل مصرفي - دفعة أولى', referenceNo: 'TRX-998811', status: 'COMPLETED' },
];

export const getTransactions = (): Transaction[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
        if (!data || data === 'undefined' || data === 'null') {
            localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(MOCK_TRANSACTIONS));
            return MOCK_TRANSACTIONS;
        }
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : MOCK_TRANSACTIONS;
    } catch (e) {
        console.error("Error fetching transactions:", e);
        return MOCK_TRANSACTIONS;
    }
};

export const getStudentTransactions = (studentId: string): Transaction[] => {
    const all = getTransactions();
    return all.filter(t => t.studentId === studentId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const addTransaction = (transaction: Transaction): void => {
    const all = getTransactions();
    all.push(transaction);
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(all));
};

export const calculateBalance = (studentId: string): number => {
    const txs = getStudentTransactions(studentId);
    let balance = 0;
    
    txs.forEach(t => {
        if (t.type === 'DEBIT') {
            balance += t.amount; // Student owes money
        } else {
            balance -= t.amount; // Student paid money
        }
    });
    
    return balance;
};

export const calculateWalletBalance = (studentId: string): number => {
    const txs = getStudentTransactions(studentId);
    let wallet = 0;
    txs.forEach(t => {
        if (t.category === 'WALLET_DEPOSIT') wallet += t.amount;
        if (t.category === 'WALLET_PAYMENT') wallet -= t.amount;
    });
    return wallet;
};

export const depositToWallet = (studentId: string, amount: number, reference?: string): void => {
    const transaction: Transaction = {
        id: `TX-W-${Date.now()}`,
        studentId,
        date: new Date().toISOString().split('T')[0],
        type: 'CREDIT',
        category: 'WALLET_DEPOSIT',
        amount,
        description: 'إيداع في المحفظة الإلكترونية',
        referenceNo: reference,
        status: 'COMPLETED'
    };
    addTransaction(transaction);
};

export const payWithWallet = (studentId: string, amount: number, description: string): boolean => {
    const currentWallet = calculateWalletBalance(studentId);
    if (currentWallet < amount) return false;

    const transaction: Transaction = {
        id: `TX-WP-${Date.now()}`,
        studentId,
        date: new Date().toISOString().split('T')[0],
        type: 'CREDIT',
        category: 'WALLET_PAYMENT',
        amount,
        description: `دفع رسوم من المحفظة: ${description}`,
        status: 'COMPLETED'
    };
    addTransaction(transaction);
    return true;
};

export interface FinancialAlert {
    id: string;
    type: 'WARNING' | 'INFO' | 'SUCCESS' | 'CRITICAL';
    message: string;
    date: string;
}

export const getFinancialAlerts = (studentId: string): FinancialAlert[] => {
    const alerts: FinancialAlert[] = [];
    const balance = calculateBalance(studentId);
    const wallet = calculateWalletBalance(studentId);
    const settings = getSystemSettings();
    const today = new Date();
    const deadline = new Date(settings.paymentDeadline);
    
    if (balance > 0) {
        const daysToDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysToDeadline < 0) {
            alerts.push({
                id: 'A1',
                type: 'CRITICAL',
                message: `لديك متأخرات مالية مستحقة بقيمة ${balance.toLocaleString()} د.ل. الموعد النهائي قد انقضى.`,
                date: new Date().toISOString()
            });
        } else if (daysToDeadline <= 7) {
            alerts.push({
                id: 'A2',
                type: 'WARNING',
                message: `يرجى سداد ${balance.toLocaleString()} د.ل قبل الموعد النهائي في ${settings.paymentDeadline} (${daysToDeadline} أيام متبقية).`,
                date: new Date().toISOString()
            });
        }
    }

    if (wallet < 100 && balance > 0) {
        alerts.push({
            id: 'A3',
            type: 'INFO',
            message: 'رصيد محفظتك منخفض. يرجى الشحن لتتمكن من سداد الرسوم بسهولة.',
            date: new Date().toISOString()
        });
    }

    return alerts;
};

export const generateStatement = (studentId: string) => {
    const transactions = getStudentTransactions(studentId);
    const balance = calculateBalance(studentId);
    const wallet = calculateWalletBalance(studentId);
    
    const openingBalance = 0; // Simplified
    const totalPayments = transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0);
    const totalCharges = transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0);
    
    return {
        studentId,
        generatedAt: new Date().toISOString(),
        period: 'الفصل الحالي',
        transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        summary: {
            totalCharges,
            totalPayments,
            currentBalance: balance,
            walletBalance: wallet
        }
    };
};
export const moamalatPayment = async (studentId: string, amount: number, description: string): Promise<{ success: boolean, transactionId?: string, message: string }> => {
    // Mocking a call to Moamalat Gateway
    console.log(`Initiating Moamalat payment for student ${studentId}: ${amount} LYD`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const success = Math.random() > 0.1; // 90% success rate for simulation
    
    if (success) {
        const txId = `MOA-${Date.now()}`;
        const transaction: Transaction = {
            id: txId,
            studentId,
            date: new Date().toISOString().split('T')[0],
            type: 'CREDIT',
            category: 'MOAMALAT_PAYMENT',
            amount,
            description: `دفع عبر معاملات: ${description}`,
            referenceNo: txId,
            status: 'COMPLETED'
        };
        addTransaction(transaction);
        return { success: true, transactionId: txId, message: 'تمت عملية الدفع بنجاح عبر بوابة معاملات' };
    } else {
        return { success: false, message: 'فشلت عملية الدفع. يرجى التأكد من بيانات البطاقة أو المحاولة لاحقاً.' };
    }
};

export const getFinancialStats = () => {
    const txs = getTransactions();
    let totalRevenue = 0;
    let totalOutstanding = 0;
    
    const students = getStudents();
    students.forEach(s => {
        const bal = calculateBalance(s.id);
        if (bal > 0) totalOutstanding += bal;
    });

    txs.forEach(t => {
        if (t.type === 'CREDIT' && t.category !== 'WALLET_PAYMENT') totalRevenue += t.amount;
    });

    return { totalRevenue, totalOutstanding };
};