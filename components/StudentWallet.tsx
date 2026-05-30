import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, RefreshCw, Send, QrCode, CreditCard, 
  ArrowUpRight, ArrowDownLeft, Landmark, PiggyBank, 
  FileText, Coins, CheckCircle2, AlertCircle, Copy, 
  Search, ShieldCheck, Printer, Check, Info, Library,
  Sparkles, Heart, HelpCircle, Coffee
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Student, Transaction } from '../types';
import { getStudents, getStudentById, getSystemSettings } from '../services/storageService';
import { 
  calculateWalletBalance, 
  depositToWallet, 
  payWithWallet, 
  getStudentTransactions, 
  addTransaction 
} from '../services/financeService';
import { getCurrentUser } from '../services/authService';
import { notifySuccess, notifyError } from '../services/notificationService';
import { cn } from '../lib/utils';
import { Language } from '../services/i18nService';

interface StudentWalletProps {
  language: Language;
  onBalanceChange?: () => void;
}

const StudentWallet: React.FC<StudentWalletProps> = ({ language, onBalanceChange }) => {
  const settings = getSystemSettings();
  const currentUser = getCurrentUser();
  const isStudent = currentUser?.role === 'STUDENT';
  
  // Default to first student if not logged in as student (for admin demoing)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (isStudent && currentUser?.id) {
      return currentUser.id;
    }
    const allStus = getStudents();
    return allStus[0]?.id || '';
  });

  const student = getStudentById(selectedStudentId);

  // Core wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState<'topup' | 'transfer' | 'quickpay' | 'saving' | 'refund' | 'analytics'>('analytics');
  const [roundupEnabled, setRoundupEnabled] = useState(true);
  const [dailySpendingLimit, setDailySpendingLimit] = useState(150);
  
  // Recharge form state
  const [rechargeAmount, setRechargeAmount] = useState('50');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'SADAD' | 'TADAWUL' | 'MOSAFIR'>('CARD');
  const [rechargeLoading, setRechargeLoading] = useState(false);

  // Transfer form state
  const [recipientId, setRecipientId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [recipientValid, setRecipientValid] = useState<boolean | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);

  // Savings goal state
  const [savingsGoals, setSavingsGoals] = useState<{ id: string, nameAr: string, nameEn: string, target: number, saved: number }[]>(() => {
    const saved = localStorage.getItem(`savings_goals_${selectedStudentId}`);
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', nameAr: 'رسوم الكتب والمذكرات الدراسية', nameEn: 'Learning Textbooks & Materials', target: 120, saved: 40 },
      { id: '2', nameAr: 'الاشتراك السنوي بمرافق الرياضة', nameEn: 'Campus Gym Annual Pass', target: 300, saved: 150 },
    ];
  });
  const [newGoalNameAr, setNewGoalNameAr] = useState('');
  const [newGoalNameEn, setNewGoalNameEn] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [saveAmount, setSaveAmount] = useState<Record<string, string>>({});

  // Refund request state
  const [refundBank, setRefundBank] = useState('MODULE_COMMERCE');
  const [refundIban, setRefundIban] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('GRADUATION');

  // Receipt Modal state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Load balances and transactions
  const loadWalletData = () => {
    if (selectedStudentId) {
      setWalletBalance(calculateWalletBalance(selectedStudentId));
      const txs = getStudentTransactions(selectedStudentId).filter(
        t => t.category === 'WALLET_DEPOSIT' || t.category === 'WALLET_PAYMENT' || t.description.includes('المحفظة')
      );
      setTransactions(txs);
      onBalanceChange?.();
    }
  };

  useEffect(() => {
    loadWalletData();
  }, [selectedStudentId]);

  // Group transactions for analytics
  const getAnalyticsData = () => {
    let cafe = 0;
    let acad = 0;
    let sports = 0;
    let transfer = 0;
    let saved = 0;

    transactions.forEach(tx => {
      const descLower = tx.description.toLowerCase();
      const isExpense = tx.category === 'WALLET_PAYMENT' || tx.description.includes('دفع') || tx.description.includes('حوالة') || tx.description.includes('إيداع');
      
      if (isExpense && tx.category !== 'WALLET_DEPOSIT') {
        if (descLower.includes('كافتيريا') || descLower.includes('طعام') || descLower.includes('بوفيه') || descLower.includes('قهوة') || descLower.includes('بسكويت') || descLower.includes('كابتشينو') || descLower.includes('حلويات') || descLower.includes('cafe') || descLower.includes('dine') || descLower.includes('buffet') || descLower.includes('meal') || descLower.includes('coffee') || descLower.includes('cappuccino')) {
          cafe += tx.amount;
        } else if (descLower.includes('طباعة') || descLower.includes('تصوير') || descLower.includes('مذكرة') || descLower.includes('كتب') || descLower.includes('مكتبة') || descLower.includes('شراء') || descLower.includes('print') || descLower.includes('book') || descLower.includes('library') || descLower.includes('locker')) {
          acad += tx.amount;
        } else if (descLower.includes('نادي') || descLower.includes('صحي') || descLower.includes('رياضة') || descLower.includes('gym') || descLower.includes('sport') || descLower.includes('fitness') || descLower.includes('wellness') || descLower.includes('heart')) {
          sports += tx.amount;
        } else if (descLower.includes('حوالة') || descLower.includes('مرسلة') || descLower.includes('transfer') || descLower.includes('peer') || descLower.includes('sent to')) {
          transfer += tx.amount;
        } else if (descLower.includes('ادخار') || descLower.includes('حصالة') || descLower.includes('roundup') || descLower.includes('faka') || descLower.includes('saving')) {
          saved += tx.amount;
        } else {
          acad += tx.amount;
        }
      }
    });

    const totalSpent = Number((cafe + acad + sports + transfer + saved).toFixed(2));
    const sampleSize = transactions.filter(t => t.category === 'WALLET_PAYMENT' || t.description.includes('دفع')).length || 1;
    const avgTxSize = Number((totalSpent / sampleSize).toFixed(2));

    const categoriesList = [
      { id: 'cafe', value: cafe, labelAr: 'المقصف والأغذية', labelEn: 'Cafeteria & Snacks' },
      { id: 'acad', value: acad, labelAr: 'المستلزمات الدراسية', labelEn: 'Textbooks & Printing' },
      { id: 'sports', value: sports, labelAr: 'الأنشطة والرياضة', labelEn: 'Recreation & Gym' },
      { id: 'transfer', value: transfer, labelAr: 'حوالات الزملاء (P2P)', labelEn: 'Peer Transfers' },
      { id: 'saved', value: saved, labelAr: 'الادخار والتوفير الذكي', labelEn: 'Smart Savings' }
    ];
    
    const topCategoryItem = categoriesList.reduce((max, c) => c.value > max.value ? c : max, categoriesList[0]);
    const topCategoryLabel = language === 'ar' ? topCategoryItem.labelAr : topCategoryItem.labelEn;

    const chartData = [
      { name: language === 'ar' ? 'المقصف والوجبات' : 'Cafeteria', value: Number(cafe.toFixed(2)), color: '#f59e0b' },
      { name: language === 'ar' ? 'المستلزمات والكتب' : 'Textbooks', value: Number(acad.toFixed(2)), color: '#3b82f6' },
      { name: language === 'ar' ? 'الرياضة والصحة' : 'Recreation', value: Number(sports.toFixed(2)), color: '#10b981' },
      { name: language === 'ar' ? 'حوّالات الزملاء' : 'Transfers', value: Number(transfer.toFixed(2)), color: '#ef4444' },
      { name: language === 'ar' ? 'فائض الفكة' : 'Spare-change', value: Number(saved.toFixed(2)), color: '#8b5cf6' }
    ].filter(item => item.value > 0);

    const fallbackChartData = [
      { name: language === 'ar' ? 'المقصف والوجبات' : 'Cafeteria', value: 45, color: '#f59e0b' },
      { name: language === 'ar' ? 'المستلزمات والكتب' : 'Textbooks', value: 30, color: '#3b82f6' },
      { name: language === 'ar' ? 'الرياضة والصحة' : 'Recreation', value: 15, color: '#10b981' },
      { name: language === 'ar' ? 'حوّالات الزملاء' : 'Transfers', value: 20, color: '#ef4444' }
    ];

    return {
      cafe,
      acad,
      sports,
      transfer,
      saved,
      totalSpent,
      avgTxSize,
      topCategoryLabel,
      chartData: chartData.length > 0 ? chartData : fallbackChartData
    };
  };

  const analytics = getAnalyticsData();

  // Recipient check hook
  useEffect(() => {
    if (recipientId.trim().toUpperCase() === selectedStudentId.toUpperCase()) {
      setRecipientValid(false);
      setRecipientName(language === 'ar' ? 'لا يمكن التحويل لنفس الحساب' : 'Cannot transfer to yourself');
      return;
    }

    if (recipientId.length >= 3) {
      const allStus = getStudents();
      const match = allStus.find(s => s.id.toUpperCase() === recipientId.trim().toUpperCase());
      if (match) {
        setRecipientValid(true);
        setRecipientName(match.name);
      } else {
        setRecipientValid(false);
        setRecipientName(language === 'ar' ? 'الطالب غير موجود' : 'Student not found');
      }
    } else {
      setRecipientValid(null);
      setRecipientName('');
    }
  }, [recipientId, selectedStudentId]);

  if (!student) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertCircle className="mx-auto mb-2 text-rose-500" size={40} />
        {language === 'ar' ? 'يرجى تسجيل الدخول أو إدخال كود طالب صالح لمعاينة المحفظة.' : 'Please login or select a valid student to preview e-wallet.'}
      </div>
    );
  }

  // Handle Recharge (Top Up)
  const handleRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(rechargeAmount);
    if (isNaN(amt) || amt <= 0) {
      notifyError(language === 'ar' ? 'يرجى إدخال قيمة صحيحة' : 'Please enter a valid amount');
      return;
    }

    setRechargeLoading(true);
    setTimeout(() => {
      depositToWallet(selectedStudentId, amt, `GATEWAY_REF_${Date.now().toString().slice(-6)}`);
      
      // Update local transaction custom details
      const allTxs = getStudentTransactions(selectedStudentId);
      const latest = allTxs[0];
      if (latest) {
        latest.description = language === 'ar' 
          ? `شحن المحفظة عبر منصة ${paymentMethod === 'CARD' ? 'البطاقات الدولية' : paymentMethod}`
          : `Wallet Recharge via ${paymentMethod} Gateway`;
        localStorage.setItem('oracle_campus_transactions', JSON.stringify(allTxs));
      }

      setRechargeLoading(false);
      notifySuccess(language === 'ar' ? `تم شحن المحفظة بقيمة ${amt} د.ل بنجاح!` : `E-Wallet top up of ${amt} LYD was successful!`);
      loadWalletData();
    }, 1200);
  };

  // Handle Peer-to-Peer Transfer
  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientValid) {
      notifyError(language === 'ar' ? 'المستلم غير صالح' : 'Invalid recipient');
      return;
    }

    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      notifyError(language === 'ar' ? 'يرجى كتابة مبلغ تحويل صالح' : 'Please enter a valid transfer amount');
      return;
    }

    if (amt > walletBalance) {
      notifyError(language === 'ar' ? 'عذراً! رصيد المحفظة الخاص بك غير كافٍ لإجراء هذه الحوالة' : 'Insufficient wallet balance for this transfer');
      return;
    }

    setTransferLoading(true);
    setTimeout(() => {
      // 1. Debit the sender
      const debitTx: Transaction = {
        id: `TX-W-OUT-${Date.now()}`,
        studentId: selectedStudentId,
        date: new Date().toISOString().split('T')[0],
        type: 'CREDIT',
        category: 'WALLET_PAYMENT',
        amount: amt,
        description: language === 'ar' 
          ? `حوالة مرسلة إلى الطالب: ${recipientName} (${recipientId})`
          : `Peer transfer sent to: ${recipientName} (${recipientId})`,
        referenceNo: `P2P-S-${Date.now().toString().slice(-4)}`,
        status: 'COMPLETED'
      };

      // 2. Credit the recipient
      const creditTx: Transaction = {
        id: `TX-W-IN-${Date.now() + 1}`,
        studentId: recipientId.trim().toUpperCase(),
        date: new Date().toISOString().split('T')[0],
        type: 'CREDIT',
        category: 'WALLET_DEPOSIT',
        amount: amt,
        description: language === 'ar' 
          ? `حوالة واردة من زميلك: ${student.name} (${student.id})`
          : `Peer transfer received from: ${student.name} (${student.id})`,
        referenceNo: `P2P-R-${Date.now().toString().slice(-4)}`,
        status: 'COMPLETED'
      };

      const existingTxs = JSON.parse(localStorage.getItem('oracle_campus_transactions') || '[]');
      existingTxs.push(debitTx, creditTx);
      localStorage.setItem('oracle_campus_transactions', JSON.stringify(existingTxs));

      setTransferLoading(false);
      setTransferAmount('');
      setRecipientId('');
      setTransferNotes('');
      setRecipientValid(null);
      notifySuccess(language === 'ar' ? 'تمت عملية التحويل الفوري بنجاح!' : 'Instant transfer completed successfully!');
      loadWalletData();
    }, 1500);
  };

  // Quick pay simulation
  const handleQuickPay = (categoryNameAr: string, categoryNameEn: string, score: number) => {
    if (score > walletBalance) {
      notifyError(language === 'ar' ? 'رصيد المحفظة غير كافٍ. يرجى شحن الرصيد أولاً.' : 'Insufficient wallet balance. Please top up.');
      return;
    }

    // Daily limit check
    const spentToday = transactions
      .filter(t => t.date === new Date().toISOString().split('T')[0] && (t.category === 'WALLET_PAYMENT' || t.description.includes('دفع')))
      .reduce((sum, t) => sum + t.amount, 0);

    if (spentToday + score > dailySpendingLimit) {
      notifyError(
        language === 'ar' 
          ? `عذراً! تم تجاوز الحد اليومي المقدر بـ ${dailySpendingLimit} د.ل. المصاريف اليومية الحالية: ${spentToday} د.ل.`
          : `Failed! Daily budget cap of ${dailySpendingLimit} LYD reached. Current daily spending: ${spentToday} LYD.`
      );
      return;
    }

    // Determine roundup contribution
    let roundupAmount = 0;
    if (roundupEnabled) {
      const nextMultipleOf5 = Math.ceil(score / 5) * 5;
      if (nextMultipleOf5 > score) {
        roundupAmount = Number((nextMultipleOf5 - score).toFixed(2));
      }
    }

    const itemLabel = language === 'ar' ? categoryNameAr : categoryNameEn;
    const success = payWithWallet(selectedStudentId, score, itemLabel);
    
    if (success) {
      if (roundupAmount > 0 && savingsGoals.length > 0) {
        const firstGoal = savingsGoals[0];
        // Automatically save round up
        const savedSuccess = payWithWallet(
          selectedStudentId, 
          roundupAmount, 
          language === 'ar' 
            ? `الادخار التلقائي لفائض الفكة من عملية [${itemLabel}] إلى حصالة: ${firstGoal.nameAr}`
            : `Spare-change auto-roundup from [${itemLabel}] to vault: ${firstGoal.nameEn}`
        );
        
        if (savedSuccess) {
          const updatedGoals = savingsGoals.map((g, i) => {
            if (i === 0) {
              return { ...g, saved: Number((g.saved + roundupAmount).toFixed(2)) };
            }
            return g;
          });
          setSavingsGoals(updatedGoals);
          localStorage.setItem(`savings_goals_${selectedStudentId}`, JSON.stringify(updatedGoals));
          
          notifySuccess(
            language === 'ar'
              ? `تم الدفع بـ ${score} د.ل بنجاح! تم تقريب العملية وتوفير ${roundupAmount} د.ل لحصالة [${firstGoal.nameAr}].`
              : `Paid ${score} LYD! Rounded up and transferred ${roundupAmount} LYD automatically to wallet vault: "${firstGoal.nameEn}".`
          );
        } else {
          notifySuccess(language === 'ar' ? `تم سداد ${score} د.ل بنجاح!` : `Paid ${score} LYD successfully!`);
        }
      } else {
        notifySuccess(language === 'ar' ? `تم سداد ${score} د.ل بنجاح!` : `Paid ${score} LYD successfully!`);
      }
      loadWalletData();
    } else {
      notifyError(language === 'ar' ? 'فشل الدفع' : 'Payment failed');
    }
  };

  // Manage Savings Vault
  const handleAddSavingsGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(newGoalTarget);
    if (!newGoalNameAr || isNaN(target) || target <= 0) {
      notifyError(language === 'ar' ? 'يرجى ملء تفاصيل الهدف بطريقة صحيحة' : 'Please fill savings goal details properly');
      return;
    }

    const newGoal = {
      id: Date.now().toString(),
      nameAr: newGoalNameAr,
      nameEn: newGoalNameEn || newGoalNameAr,
      target,
      saved: 0
    };

    const updated = [...savingsGoals, newGoal];
    setSavingsGoals(updated);
    localStorage.setItem(`savings_goals_${selectedStudentId}`, JSON.stringify(updated));
    setNewGoalNameAr('');
    setNewGoalNameEn('');
    setNewGoalTarget('');
    notifySuccess(language === 'ar' ? 'تم إنشاء حصالة ادخار جديدة!' : 'New Savings Vault created!');
  };

  const handleDepositToGoal = (goalId: string) => {
    const amtStr = saveAmount[goalId];
    const amt = parseFloat(amtStr);
    if (isNaN(amt) || amt <= 0) {
      notifyError(language === 'ar' ? 'يرجى كتابة رقم صحيح' : 'Provide a valid number');
      return;
    }

    if (amt > walletBalance) {
      notifyError(language === 'ar' ? 'الرصيد في المحفظة غير كافٍ' : 'Insufficient wallet balance');
      return;
    }

    // Deduct from wallet & save to goal
    const paid = payWithWallet(selectedStudentId, amt, language === 'ar' ? 'إيداع في حصالة الادخار' : 'Deposit to savings vault');
    if (paid) {
      const updated = savingsGoals.map(g => {
        if (g.id === goalId) {
          const newSaved = Math.min(g.target, g.saved + amt);
          return { ...g, saved: newSaved };
        }
        return g;
      });
      setSavingsGoals(updated);
      localStorage.setItem(`savings_goals_${selectedStudentId}`, JSON.stringify(updated));
      setSaveAmount(prev => ({ ...prev, [goalId]: '' }));
      notifySuccess(language === 'ar' ? 'تم تحويل المبلغ للحصالة المغلقة!' : 'Transferred to the locked savings vault!');
      loadWalletData();
    }
  };

  // Handle Cash-Out Refund Request
  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0 || amt > walletBalance) {
      notifyError(language === 'ar' ? 'مبلغ سحب غير مكتمل أو يتجاوز رصيد المحفظة المتاح' : 'Invalid refund amount or exceeds available balance');
      return;
    }

    if (!refundIban || refundIban.length < 15) {
      notifyError(language === 'ar' ? 'يرجى كتابة رقم حساب آيبان حقيقي ومطابق للبنوك الليبية' : 'Please provide a valid Libyan IBAN card number');
      return;
    }

    // Process refund simulation
    const refunded = payWithWallet(selectedStudentId, amt, language === 'ar' ? `طلب استرداد نقدي لـ IBAN ${refundIban.slice(-4)}` : `Cash-out refund request to IBAN ${refundIban.slice(-4)}`);
    if (refunded) {
      notifySuccess(language === 'ar' ? 'تم تسجيل وتوثيق طلب الاسترداد لقطاع الحسابات المركزية بنجاح!' : 'Refund request logged and routed to central treasury!');
      setRefundAmount('');
      setRefundIban('');
      loadWalletData();
    }
  };

  // Receipt Print simulation
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500 text-right" dir="rtl">
      
      {/* Banner */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-150 shadow-sm flex flex-col lg:flex-row justify-between items-center bg-gradient-to-br from-indigo-50/10 to-white gap-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 p-8 transform rotate-12 opacity-[0.03] scale-150">
          <Wallet size={350} />
        </div>
        <div className="space-y-2 relative z-10 text-center lg:text-right">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Sparkles size={12} />
            {language === 'ar' ? 'رصيد الفواتير والإيداع اللحظي' : 'Instant Pre-Paid Payments & Invoicing'}
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-950 tracking-tight">
            {language === 'ar' ? 'المحفظة الرقمية الذكية للطلاب' : 'Student Digital Smart Wallet'}
          </h1>
          <p className="text-stone-400 text-xs font-bold leading-relaxed max-w-2xl">
            {language === 'ar' 
              ? 'بموجب المادة 68 للتحصيل الرقمي المتكامل داخل الحرم وجامعة أوراكل؛ تمكّن المحفظة الطلاب من شحن الرصيد وسداد كافّة الرسوم وتحويل المبالغ فورياً.'
              : 'Under regulation rules, the university smart e-Wallet provides students high-security payments, instant class fee checkouts, peer pocket money transfers, and cash-outs.'}
          </p>
        </div>

        {/* Demo Switcher for Admins */}
        {!isStudent && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 relative z-10 w-full lg:w-auto">
            <span className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'استعراض محفظة الطالب:' : 'Inspect Student Wallet:'}</span>
            <select 
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="bg-white border border-slate-350 rounded-xl px-4 py-2 text-xs font-bold outline-none cursor-pointer"
            >
              {getStudents().map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        
        {/* RIGHT COLUMN (Lg: 5): The Holographic Virtual Wallet Card */}
        <div className="lg:col-span-5 space-y-8">
          
          <div className="flex flex-col items-center">
            {/* 3D Flappable Credit Card Container */}
            <div 
              onClick={() => setCardFlipped(!cardFlipped)}
              className="cursor-pointer group relative w-full h-[260px] max-w-[420px] transition-transform duration-700 [transform-style:preserve-3d] [perspective:1000px] select-none"
              style={{ transform: cardFlipped ? 'rotateY(180deg)' : 'none' }}
            >
              
              {/* CARD FRONT */}
              <div className="absolute inset-0 w-full h-full rounded-[2rem] bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 p-8 text-white flex flex-col justify-between shadow-[0_15px_40px_rgba(99,102,241,0.15)] [backface-visibility:hidden]">
                {/* Gloss Glassmorphism Glow Overlay */}
                <div className="absolute inset-0 rounded-[2rem] bg-white/[0.03] bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]"></div>
                
                {/* Top Section */}
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black tracking-widest text-indigo-400 opacity-90 uppercase">ORACLE CAMPUS DIGITAL WALLET</p>
                    <p className="text-[9px] font-semibold text-slate-400">{language === 'ar' ? 'البطاقة الذكية سداد للطلاب' : 'Student smart-pay token'}</p>
                  </div>
                  <div className="w-10 h-8 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-md">
                    <Coins className="text-indigo-400" size={20} />
                  </div>
                </div>

                {/* Intelligent Chip & Wireless Tap Icons */}
                <div className="flex items-center gap-4 relative z-10 mt-6 select-none leading-none">
                  {/* Chip SVG */}
                  <svg className="w-12 h-9 text-amber-400/90" viewBox="0 0 48 36" fill="currentColor">
                    <rect x="2" y="2" width="44" height="32" rx="6" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <rect x="8" y="8" width="10" height="20" rx="2"/>
                    <rect x="30" y="8" width="10" height="20" rx="2"/>
                    <line x1="18" y1="14" x2="30" y2="14" stroke="currentColor" strokeWidth="2"/>
                    <line x1="18" y1="22" x2="30" y2="22" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {/* Wifi contactless beacon logo */}
                  <svg className="w-6 h-6 text-indigo-200/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 8a10 10 0 0 1 14 0" />
                    <path d="M8 11a6 6 0 0 1 8 0" />
                    <path d="M11 14a2 2 0 0 1 2 0" />
                  </svg>
                </div>

                {/* Card Number & Balance */}
                <div className="space-y-1.5 relative z-10">
                  <p className="text-2xl font-mono tracking-[0.2em] font-medium text-slate-100 drop-shadow-sm">
                    4488 9510 {selectedStudentId.replace(/\D/g, '').slice(0,4) || '2026'} {selectedStudentId.replace(/\D/g, '').slice(-4) || '9301'}
                  </p>
                  <p className="text-[10px] text-slate-400 hover:underline">{language === 'ar' ? 'اضغط لقلب البطاقة وعرض بيانات الأمان' : 'Tap to flip card and view back safety data'}</p>
                </div>

                {/* Footer Section */}
                <div className="flex justify-between items-end relative z-10 border-t border-white/10 pt-4">
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-slate-500">{language === 'ar' ? 'حامل البطاقة' : 'CARDHOLDER'}</p>
                    <p className="text-xs font-bold text-slate-200">{student.name}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] uppercase tracking-wider text-slate-500">{language === 'ar' ? 'الرصيد المتاح' : 'AVAIL BALANCE'}</p>
                    <p className="text-lg font-black font-mono text-emerald-400 leading-none">
                      {walletBalance.toLocaleString()} <span className="text-[10px]">{language === 'ar' ? 'د.ل' : 'LYD'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD BACK */}
              <div className="absolute inset-0 w-full h-full rounded-[2rem] bg-gradient-to-bl from-slate-900 via-slate-950 to-indigo-900 p-8 text-white flex flex-col justify-between shadow-[0_15px_40px_rgba(4,4,15,0.3)] [transform:rotateY(180deg)] [backface-visibility:hidden]">
                {/* Magnetic Strip */}
                <div className="absolute left-0 right-0 top-8 h-12 bg-slate-950"></div>
                
                {/* Security Signature Strip */}
                <div className="mt-14 flex items-center gap-4">
                  <div className="flex-1 h-9 bg-slate-200/95 text-slate-700 italic font-serif px-4 flex items-center justify-end font-bold select-none text-xs rounded-lg select-all">
                    ORACLE STUDENT SERVICE TOKEN
                  </div>
                  {/* CVV */}
                  <div className="bg-white text-slate-900 px-3 py-1 text-sm font-mono font-black italic rounded-md select-none border">
                    954
                  </div>
                </div>

                {/* Important disclosures */}
                <p className="text-[8px] text-slate-400 leading-normal text-right px-1 mt-4">
                  {language === 'ar'
                    ? 'بطاقة دفع مسبقة مخصصة للاستخدام الجامعي فقط. تطبق عليها لوائح الشؤون المالية والادخار بوزارة التعليم ورئاسة أوركال كامبس.'
                    : 'Authorized pre-paid card issued for official university expenses. Subject to internal audit rules and standard campus banking policies.'}
                </p>

                {/* Small footer branding */}
                <div className="flex justify-between items-center border-t border-white/5 pt-2 text-[9px] text-indigo-400 font-black">
                  <span>LYB - SIS SECURITY APPARATUS</span>
                  <ShieldCheck size={14} />
                </div>
              </div>

            </div>
          </div>

          {/* Wallet Summary Panel */}
          <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-700 shrink-0 select-none">
                <QrCode size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-950">{language === 'ar' ? 'كود الدفع المباشر' : 'Direct Quick QR-Pay'}</h4>
                <p className="text-xs text-stone-400 mt-1">{language === 'ar' ? 'افتح شاشة الكشك للمسح السريع' : 'Hold near checkout cashier terminal'}</p>
              </div>
            </div>
            
            {/* Pop Trigger Button */}
            <button 
              onClick={() => {
                const dummyId = `QR_PAY_STU:${selectedStudentId}`;
                setSelectedTx({
                  id: 'QR-CODE-VIRTUAL',
                  studentId: selectedStudentId,
                  date: new Date().toISOString().split('T')[0],
                  amount: walletBalance,
                  type: 'CREDIT',
                  category: 'WALLET_DEPOSIT',
                  description: language === 'ar' ? 'رمز المسح الضوئي للمحفظة' : 'E-Wallet Quick QR Checkout',
                  referenceNo: dummyId,
                  status: 'COMPLETED'
                });
              }}
              className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-black hover:bg-slate-900 transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'عرض الكود' : 'Show Code'}
            </button>
          </div>

          {/* Central IBAN Information Card */}
          <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-[2rem] space-y-4">
            <span className="text-[10px] font-black text-indigo-650 uppercase tracking-widest block">{language === 'ar' ? 'الحساب المصرفي المباشر للتحويل' : 'Direct Bank Deposit Details'}</span>
            <p className="text-xs text-stone-450 leading-relaxed">
              {language === 'ar' 
                ? 'يمكنك تغذية محفظتك مباشرة عبر التحويل المصرفي لرقم الآيبان المربوط بملفك الأكاديمي:'
                : 'Send funds directly via standard Libyan mobile bank apps using this specific academic IBAN link:'}
            </p>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-[9px] font-black text-slate-400 uppercase">{settings.finance.bankName || 'مصرف الجمهورية'}</p>
                <p className="text-sm font-black text-slate-800 font-mono tracking-tighter truncate selection:bg-indigo-100">{settings.finance.iban}</p>
                <p className="text-[9px] font-bold text-slate-500 mt-0.5">{language === 'ar' ? 'الحساب باسم: جامعة أوراكل - شؤون الطلاب' : 'Name: Oracle Campus University Dept'}</p>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(settings.finance.iban || '');
                  notifySuccess(language === 'ar' ? 'تم نسخ رمز الآيبان بنجاح!' : 'IBAN code copied successfully!');
                }}
                className="p-3 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors shrink-0"
                title={language === 'ar' ? 'نسخ الآيبان' : 'Copy IBAN'}
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

        </div>

        {/* LEFT COLUMN (Lg: 7): Dynamic E-Wallet Actions Dashboard */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Main Navigation Sub-Tabs */}
          <div className="flex border-b border-slate-250 gap-6 overflow-x-auto pb-1 text-right">
            {[
              { id: 'analytics', icon: Coins, labelAr: 'التحليلات والميزانية', labelEn: 'Micro Analytics' },
              { id: 'topup', icon: RefreshCw, labelAr: 'شحن رصيد المحفظة', labelEn: 'Quick Top Up' },
              { id: 'transfer', icon: Send, labelAr: 'تحويل فوري (P2P)', labelEn: 'Instant Transfer' },
              { id: 'quickpay', icon: CreditCard, labelAr: 'سداد الخدمات', labelEn: 'On-Campus Pay' },
              { id: 'saving', icon: PiggyBank, labelAr: 'حصَّالات الادخار', labelEn: 'Savings Vault' },
              { id: 'refund', icon: Landmark, labelAr: 'استرداد نقدي (Cashout)', labelEn: 'Direct Cashout' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "pb-3 text-xs font-black transition-all border-b-2 shrink-0 flex items-center gap-2",
                  activeTab === tab.id 
                    ? "text-indigo-600 border-indigo-600 font-black" 
                    : "text-slate-400 border-transparent hover:text-slate-700 hover:border-slate-300"
                )}
              >
                <tab.icon size={15} />
                <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
              </button>
            ))}
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-150 shadow-sm min-h-[350px] flex flex-col justify-between">
            <div>
              
              {/* TAB CONTENT: Analytics & Controls */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Sparkles className="text-purple-600 animate-pulse" size={18} />
                      <h3 className="text-xl font-extrabold text-slate-900">
                        {language === 'ar' ? 'تحليل المصاريف والتحكم بالميزانية' : 'Micro Spending Analytics & Budgeting'}
                      </h3>
                    </div>
                    <p className="text-xs text-stone-400">
                      {language === 'ar' 
                        ? 'تتبع عمليات الدفع الصغيرة داخل الحرم الجامعي، وحافظ على أهدافك المالية من خلال وضع حد يومي وتفعيل الادخار التلقائي لفائض الفكة.'
                        : 'Track micro-transactions across campus and set strict daily spending boundaries with automatic loose change savings.'}
                    </p>
                  </div>

                  {/* Operational Settings Dashboard Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Roundup Toggle Card */}
                    <div className={cn(
                      "p-5 rounded-3xl border transition-all relative overflow-hidden",
                      roundupEnabled 
                        ? "bg-purple-50/60 border-purple-100 shadow-sm" 
                        : "bg-slate-50 border-slate-100"
                    )}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-6 -mt-6 transform rotate-45" />
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "p-2 rounded-xl",
                            roundupEnabled ? "bg-purple-100 text-purple-700" : "bg-slate-200 text-slate-600"
                          )}>
                            <PiggyBank size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {language === 'ar' ? 'حصَّالة فائض الفكة' : 'Loose Change Roundup'}
                            </h4>
                            <p className="text-[10px] text-stone-400">
                              {language === 'ar' ? 'تقريب فوري لأقرب 5 د.ل' : 'Automatic roundups to nearest 5.00 LYD'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => setRoundupEnabled(!roundupEnabled)}
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                            roundupEnabled ? "bg-purple-600" : "bg-slate-300"
                          )}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                              language === 'ar'
                                ? (roundupEnabled ? "translate-x-0" : "-translate-x-5")
                                : (roundupEnabled ? "translate-x-5" : "translate-x-0")
                            )}
                          />
                        </button>
                      </div>
                      
                      <p className="text-xs text-slate-600 leading-relaxed text-right mt-3">
                        {language === 'ar' 
                          ? `عند كل سداد، نُقرب التذكرة لأقرب 5 د.ل ونرحّل الفرق مباشرة لحصالة [${savingsGoals[0]?.nameAr || 'حصالتك الرئيسية'}].`
                          : `Rounds every campus coffee or snack transaction and routes the difference automatically into: "${savingsGoals[0]?.nameEn || 'Your Goal'}"`}
                      </p>
                    </div>

                    {/* Daily Budget Controller Card */}
                    <div className="p-5 rounded-3xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-2 mb-2 justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-orange-100 text-orange-700">
                            <Coins size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {language === 'ar' ? 'الحد المالي اليومي' : 'Daily Wallet Budget Cap'}
                            </h4>
                            <p className="text-[10px] text-stone-400">
                              {language === 'ar' ? 'تقييد مصاريف اليوم لضبط السلوك' : 'Voluntary safe spending caps'}
                            </p>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-white rounded-xl border border-slate-100 shadow-xs">
                          <span className="text-xs font-black text-indigo-600 font-mono">
                            {dailySpendingLimit} {language === 'ar' ? 'د.ل' : 'LYD'}
                          </span>
                        </div>
                      </div>

                      {/* Slider Input */}
                      <div className="mt-4 space-y-2">
                        <input
                          type="range"
                          min="10"
                          max="500"
                          step="10"
                          value={dailySpendingLimit}
                          onChange={(e) => setDailySpendingLimit(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 font-mono">
                          <span>10 LYD</span>
                          <span>250 LYD</span>
                          <span>500 LYD</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Micro Spending Analytics Multi-grid counters */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-right">
                      <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase block">{language === 'ar' ? 'المصاريف الصغيرة' : 'Total Spent'}</span>
                      <span className="text-lg font-black text-rose-600 font-mono block mt-1">{analytics.totalSpent} <span className="text-xs">{language === 'ar' ? 'د.ل' : 'LYD'}</span></span>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-right">
                      <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase block">{language === 'ar' ? 'معدل حجم المعاملة' : 'Avg Micro-Tx'}</span>
                      <span className="text-lg font-black text-slate-700 font-mono block mt-1">{analytics.avgTxSize} <span className="text-xs">{language === 'ar' ? 'د.ل' : 'LYD'}</span></span>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-right overflow-hidden text-ellipsis whitespace-nowrap">
                      <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase block">{language === 'ar' ? 'الأكثر استهلاكاً' : 'Top Category'}</span>
                      <span className="text-sm font-black text-amber-600 block mt-1">{analytics.topCategoryLabel}</span>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-right">
                      <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase block">{language === 'ar' ? 'فائض الفكة المُوفر' : 'Loose Change Yield'}</span>
                      <span className="text-lg font-black text-purple-600 font-mono block mt-1">{analytics.saved || '12.5'} <span className="text-xs">{language === 'ar' ? 'د.ل' : 'LYD'}</span></span>
                    </div>
                  </div>

                  {/* Responsive Chart Representation */}
                  <div className="p-6 border border-slate-150 rounded-[2.5rem] bg-slate-50/30">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest text-right mb-4">
                      {language === 'ar' ? 'توزع المصاريف الميكروية في الكلية' : 'Category Allocation of Micro Payments'}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-8">
                        <div className="w-full h-60 flex items-center justify-center font-bold" dir="ltr">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                              <Tooltip 
                                cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }} 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} 
                              />
                              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={32}>
                                {analytics.chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="md:col-span-4 space-y-2 text-right">
                        {analytics.chartData.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50/80 transition-colors">
                            <span className="text-xs font-black text-slate-700 font-mono">
                              {item.value} {language === 'ar' ? 'د.ل' : 'LYD'}
                            </span>
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs font-bold text-slate-600">{item.name}</span>
                              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: item.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: Top Up */}
              {activeTab === 'topup' && (
                <form onSubmit={handleRecharge} className="space-y-6">
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-extrabold text-slate-900">{language === 'ar' ? 'شحن رصيد المحفظة التلقائي' : 'Instant Pre-Paid Top Up'}</h3>
                    <p className="text-xs text-stone-400">{language === 'ar' ? 'اختر قيمة الشحن أو اكتب مبلغا يدويا، الدفع يتم عبر بوابات آمنة.' : 'Fund your e-wallet instantly via card or local Libyan telecom wallets.'}</p>
                  </div>

                  {/* Quick Select Buttons */}
                  <div className="grid grid-cols-4 gap-3">
                    {['10', '50', '100', '250'].map(val => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setRechargeAmount(val)}
                        className={cn(
                          "py-3 rounded-2xl text-sm font-black font-mono border transition-all cursor-pointer",
                          rechargeAmount === val 
                            ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                        )}
                      >
                        {val} {language === 'ar' ? 'د.ل' : 'LYD'}
                      </button>
                    ))}
                  </div>

                  {/* Manual input */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'القيمة المطلوبة بالدينار الليبي' : 'Enter Custom Recharge Amount (LYD)'}</label>
                    <div className="relative">
                      <input 
                        type="number"
                        min="1"
                        max="5000"
                        required
                        value={rechargeAmount}
                        onChange={e => setRechargeAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black font-mono outline-none"
                        placeholder="0.00"
                      />
                      <span className="absolute left-5 top-4 text-xs font-black text-slate-400 select-none">{language === 'ar' ? 'دينار' : 'LYD'}</span>
                    </div>
                  </div>

                  {/* Payment gateway selection */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'منصة الدفع الإلكتروني' : 'Select Local Integrated Gateway'}</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: 'CARD', label: language === 'ar' ? 'البطاقات المصرفية (تداول/نمو)' : 'Libyan Debit Card Network', desc: 'Moamalat National Switch' },
                        { id: 'SADAD', label: 'سداد (Sadad Mobile Pay)', desc: 'Al-Madar Al-Jadeed Telecom' },
                      ].map(gateway => (
                        <div
                          key={gateway.id}
                          onClick={() => setPaymentMethod(gateway.id as any)}
                          className={cn(
                            "p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all",
                            paymentMethod === gateway.id 
                              ? "border-indigo-650 bg-indigo-50/20" 
                              : "border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          <div>
                            <p className="text-xs font-black text-slate-800">{gateway.label}</p>
                            <p className="text-[9px] text-slate-400 mt-1">{gateway.desc}</p>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                            paymentMethod === gateway.id ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"
                          )}>
                            {paymentMethod === gateway.id && <Check size={12} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={rechargeLoading}
                      className="w-full py-4 bg-indigo-650 hover:bg-slate-950 text-white rounded-2xl text-xs font-black transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {rechargeLoading ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} />
                          <span>{language === 'ar' ? 'جاري الاتصال بمصرف التحصيل الآمن ...' : 'Reaching secure central bank host...'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>{language === 'ar' ? `تأكيد شحن المحفظة بـ ${rechargeAmount} د.ل` : `Confirm funding receipt of ${rechargeAmount} LYD`}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB CONTENT: P2P Transfer */}
              {activeTab === 'transfer' && (
                <form onSubmit={handleTransfer} className="space-y-6">
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-extrabold text-slate-900">{language === 'ar' ? 'التحويل المالي الفوري والآمن (Peer-to-Peer)' : 'Instant Peer-to-Peer Transfer'}</h3>
                    <p className="text-xs text-stone-400">{language === 'ar' ? 'حوّل رصيداً لزملائك الطلاب فورياً للمشاركة في الكتب أو فريضة أخرى، دون رسوم تحصيل.' : 'Instantly send pockets or book funds directly to any other student enrolled.'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recipient ID input */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'رقم القيد الدراسي للمستلم' : 'Recipient Student Enrollment ID'}</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={recipientId}
                          onChange={e => setRecipientId(e.target.value.toUpperCase())}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-mono font-bold outline-none uppercase"
                          placeholder="STU2024001"
                        />
                        <div className="absolute left-4 top-3.5 text-slate-400">
                          <Search size={18} />
                        </div>
                      </div>
                      
                      {/* Name output / match feedback */}
                      {recipientName && (
                        <div className={cn(
                          "p-3 rounded-xl text-[11px] font-bold flex items-center gap-2 border whitespace-nowrap overflow-hidden text-ellipsis",
                          recipientValid ? "bg-emerald-50 border-emerald-150 text-emerald-800" : "bg-rose-50 border-rose-150 text-rose-800"
                        )}>
                          {recipientValid ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
                          <span>{recipientName}</span>
                        </div>
                      )}
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المبلغ المراد إرساله (د.ل)' : 'Transfer Amount (LYD)'}</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          required
                          value={transferAmount}
                          onChange={e => setTransferAmount(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black font-mono outline-none"
                          placeholder="0.00"
                        />
                        <span className="absolute left-5 top-4 text-xs font-black text-slate-400 select-none">{language === 'ar' ? 'دينار' : 'LYD'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Optional notes */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'بيان أو سبب التحويل (اختياري)' : 'Optional Note for Recipient Statement'}</label>
                    <input
                      type="text"
                      value={transferNotes}
                      onChange={e => setTransferNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none"
                      placeholder={language === 'ar' ? 'سداد رسوم كتب، مشاركة طعام، إلخ ...' : 'e.g. Shared class materials, taxi fares, books...'}
                    />
                  </div>

                  {/* Submission */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={transferLoading || !recipientValid}
                      className="w-full py-4 bg-indigo-650 hover:bg-slate-950 text-white rounded-2xl text-xs font-black transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {transferLoading ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} />
                          <span>{language === 'ar' ? 'جاري التحقق والمصادقة على الحوالة ...' : 'Validating and authorizing peer transfer...'}</span>
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          <span>{language === 'ar' ? 'إرسال الحوالة الفورية' : 'Send Instant P2P Funds'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB CONTENT: Campus QuickPay simulation */}
              {activeTab === 'quickpay' && (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-extrabold text-slate-900">{language === 'ar' ? 'سداد فوري للخدمات داخل الحرم الجامعي' : 'On-Campus Instant Quick-Pay'}</h3>
                    <p className="text-xs text-stone-400">{language === 'ar' ? 'محاكاة لشبكة سداد اللحظية التي يمكن القيام بها عبر نقاط المسح في الكلية والخدمات المساندة.' : 'Simulated terminal cashout checkout points inside the college walls.'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { icon: Coffee, nameAr: 'تذكرة طعام الغداء بالبوفيه', nameEn: 'Dining Buffet Meal Ticket', score: 12, dept: 'Cafeteria Point' },
                      { icon: Library, nameAr: 'تجديد عضوية المكتبة المركزية', nameEn: 'Central Library Renewal Fee', score: 5, dept: 'Library Desk' },
                      { icon: Heart, nameAr: 'الاشتراك بالنادي الصحي اليومي', nameEn: 'Sports & Wellness Daily Gym Pass', score: 15, dept: 'Campus Recreation' },
                      { icon: Landmark, nameAr: 'رسوم حجز خزانة دراسية سنوية', nameEn: 'Locker Rental Reservation Fee', score: 20, dept: 'Registrar Office' }
                    ].map((srv, idx) => (
                      <div key={idx} className="p-4 rounded-2xl border border-slate-150 flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
                            <srv.icon size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 leading-tight">{language === 'ar' ? srv.nameAr : srv.nameEn}</p>
                            <p className="text-[9px] text-slate-400 mt-1">{srv.dept}</p>
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <p className="text-sm font-black text-slate-800 font-mono">{srv.score.toFixed(2)} {language === 'ar' ? 'د.ل' : 'LYD'}</p>
                          <button
                            onClick={() => handleQuickPay(srv.nameAr, srv.nameEn, srv.score)}
                            className="mt-1.5 px-3 py-1 bg-slate-950 text-white rounded-lg text-[9px] font-black hover:bg-slate-900 transition-colors cursor-pointer block w-full text-center"
                          >
                            {language === 'ar' ? 'دفع الآن' : 'Pay Now'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: Savings Goal */}
              {activeTab === 'saving' && (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-extrabold text-slate-900">{language === 'ar' ? 'حصَّالات الادخار المغلقة للطلاب' : 'Student Micro-Savings Vaults'}</h3>
                    <p className="text-xs text-stone-400">{language === 'ar' ? 'ادخر جزءاً من رصيدك في حصالات مستقلة ومقفلة مخصصة لشراء الكتب الكورس القادم ورسم المقررات.' : 'Reserve and freeze savings for future textbook allocations or course components.'}</p>
                  </div>

                  {/* Existing Savings Goals */}
                  <div className="space-y-4">
                    {savingsGoals.map(goal => {
                      const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100));
                      return (
                        <div key={goal.id} className="p-5 rounded-2xl border border-slate-150 bg-slate-50/50 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center shrink-0">
                                <PiggyBank size={18} />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-xs text-slate-900">{language === 'ar' ? goal.nameAr : goal.nameEn}</h4>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {language === 'ar' ? `المتبقي: ${goal.target - goal.saved} دينار` : `Target Rem: ${goal.target - goal.saved} LYD`}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-left font-mono text-[10px] text-stone-400">
                              <span className="font-black text-xs text-slate-800">{goal.saved}</span> / {goal.target} {language === 'ar' ? 'د.ل' : 'LYD'}
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1.5">
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-purple-650 h-full rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase">
                              <span>{pct}%</span>
                              <span>{language === 'ar' ? 'ادخار مقيد' : 'Locked Vaulted'}</span>
                            </div>
                          </div>

                          {/* Quick Transfer to goal input */}
                          <div className="flex gap-2 justify-end pt-1">
                            <input 
                              type="number"
                              placeholder="0.00"
                              value={saveAmount[goal.id] || ''}
                              onChange={e => setSaveAmount(prev => ({ ...prev, [goal.id]: e.target.value }))}
                              className="w-24 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-black font-mono outline-none text-center"
                            />
                            <button
                              onClick={() => handleDepositToGoal(goal.id)}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black cursor-pointer transition-colors"
                            >
                              {language === 'ar' ? 'تحويل للحصَّالة' : 'Transfer to Vault'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add New Goal */}
                  <form onSubmit={handleAddSavingsGoal} className="pt-4 border-t border-dashed border-slate-200 space-y-4">
                    <span className="text-[10px] font-black text-purple-650 uppercase tracking-widest block">{language === 'ar' ? 'إنشاء حصَّالة تجميع جديدة' : 'Setup New Savings Goal'}</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          required
                          value={newGoalNameAr}
                          onChange={e => setNewGoalNameAr(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3.5 text-xs font-bold outline-none"
                          placeholder={language === 'ar' ? 'اسم الحصالة باللغة العربية (مثلاً: حاسوب الفصل القادم)' : 'e.g. Next Semester Engineering Calculator'}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          min="1"
                          required
                          value={newGoalTarget}
                          onChange={e => setNewGoalTarget(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3.5 text-xs font-bold font-mono outline-none"
                          placeholder={language === 'ar' ? 'الهدف المالي (د.ل)' : 'Target Cap (LYD)'}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3.5 bg-purple-600 text-white hover:bg-slate-900 rounded-2xl text-xs font-black cursor-pointer transition-colors"
                    >
                      {language === 'ar' ? '+ اعتماد حصَّالة ادخار جديدة' : '+ Lock-in New Goal'}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB CONTENT: Refund Request */}
              {activeTab === 'refund' && (
                <form onSubmit={handleRefundSubmit} className="space-y-6">
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-extrabold text-slate-900">{language === 'ar' ? 'طلب استرداد الرصيد المالي المتبقي' : 'Bursar Cashout Refund Ticket'}</h3>
                    <p className="text-xs text-stone-400">{language === 'ar' ? 'بموجب تنظيمات براءة الذمة للطلاب والخريجين؛ يحق لك طلب إعادة توجيه رصيد محفظتك المتبقي بالكامل لحسابك المصرفي.' : 'Request standard treasury payout of any unused wallet credits directly to your Libyan bank.'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{language === 'ar' ? 'المبلغ المطلوب سحبه (د.ل)' : 'Withdrawal Amount (LYD)'}</label>
                      <input
                        type="number"
                        min="10"
                        max={walletBalance}
                        required
                        value={refundAmount}
                        onChange={e => setRefundAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black font-mono outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{language === 'ar' ? 'المصرف التجاري للاستلام' : 'Destination Libyan Bank'}</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none cursor-pointer"
                        value={refundBank}
                        onChange={e => setRefundBank(e.target.value)}
                      >
                        <option value="MODULE_COMMERCE">مصرف الوحدة (Al-Wahda Bank)</option>
                        <option value="REPUBLIC">مصرف الجمهورية (Al-Jumhouria Bank)</option>
                        <option value="SAHARA">مصرف الصحاري (Sahara Bank)</option>
                        <option value="COMMERCIAL_ARAB">المصرف التجاري الوطني (NCB)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{language === 'ar' ? 'رقم حساب آيبان للاستلام (IBAN)' : 'Your Complete Bank IBAN Code'}</label>
                    <input
                      type="text"
                      required
                      value={refundIban}
                      onChange={e => setRefundIban(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-mono font-black outline-none"
                      placeholder="LY84 0110 0000 0001 2345 6789"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{language === 'ar' ? 'مسوغ أو سبب طلب الاسترداد' : 'Reason for Official Payout'}</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none cursor-pointer"
                      value={refundReason}
                      onChange={e => setRefundReason(e.target.value)}
                    >
                      <option value="GRADUATION">طلب براءة ذمة سحب خريج نهائي (Graduation Payout)</option>
                      <option value="OVERPAYMENT">إيداع زائد بالخطأ (Overpayment Error Refund)</option>
                      <option value="SUSPENSION">إيقاف الفصل الدراسي أو تجميد القيد (Suspension Payout)</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={walletBalance < 10}
                      className="w-full py-4 bg-indigo-50 hover:bg-slate-900 border border-indigo-200 hover:text-white text-indigo-700 rounded-2xl text-xs font-black cursor-pointer transition-colors flex items-center justify-center gap-2"
                    >
                      <Landmark size={16} />
                      <span>{language === 'ar' ? 'تقديم طلب الاسترداد المالي رسمياً' : 'Submit Refund Ticket to Financial Dept'}</span>
                    </button>
                    {walletBalance < 10 && (
                      <p className="text-[10px] text-rose-500 mt-2 font-bold select-none text-center">
                        {language === 'ar' ? '* الحد الأدنى للسحوبات الخارجية هو 10 دينار ليبي.' : '* Minimum payout request is 10 LYD.'}
                      </p>
                    )}
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* RECENT WALLET TRANSACTION FEED */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-150 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-stone-100 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-950">{language === 'ar' ? 'سجل العمليات الأخير للمحفظة' : 'E-Wallet Activity Logs'}</h3>
            <p className="text-xs text-stone-400 mt-1">{language === 'ar' ? 'كافة حركات الإيداع، الحوالات الفورية، الدفع للمقصف والمقصد الأكاديمي.' : 'Historical details of top ups, peer transfers, and dining checkouts.'}</p>
          </div>
          <span className="text-[10px] font-black bg-slate-50 border border-slate-150 rounded-xl px-4 py-2 font-mono text-slate-600">
            {transactions.length} {language === 'ar' ? 'عملية' : 'Transactions'}
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic text-xs">
            {language === 'ar' ? 'لا يوجد حركات مسجلة بالمحفظة للتيرم الحالي.' : 'No active wallet transfers or payments logged.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {transactions.map((tx) => {
              const isDeposit = tx.category === 'WALLET_DEPOSIT';
              const isP2POut = tx.description.includes('إلى الطالب') || tx.description.includes('sent to');
              const isP2PIn = tx.description.includes('من زميلك') || tx.description.includes('received from');
              const isDebit = tx.type === 'DEBIT' || isP2POut || tx.category === 'WALLET_PAYMENT';
              
              return (
                <div key={tx.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      isDeposit || isP2PIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {isDeposit || isP2PIn ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 leading-tight">{tx.description}</p>
                      <p className="text-[10px] text-stone-400 mt-1 font-mono">{tx.date} • {tx.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-left select-none">
                    <span className={cn(
                      "text-sm font-black font-mono",
                      isDeposit || isP2PIn ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {isDeposit || isP2PIn ? '+' : '-'}{tx.amount.toLocaleString()} {language === 'ar' ? 'د.ل' : 'LYD'}
                    </span>

                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="p-2 border border-slate-200 hover:border-indigo-650 rounded-xl text-stone-500 hover:text-indigo-600 transition-colors cursor-pointer"
                      title={language === 'ar' ? 'عرض الفاتورة' : 'View Receipt'}
                    >
                      <FileText size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RECEIPT / QR DIALOG POPUP */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:absolute print:inset-0 print:bg-white">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-250 border border-slate-100"
            >
              
              {/* Receipt Header */}
              <div className="bg-slate-950 text-white p-6 text-center space-y-2 relative">
                <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center text-white mx-auto select-none">
                  {selectedTx.id === 'QR-CODE-VIRTUAL' ? <QrCode size={24} /> : <FileText size={24} />}
                </div>
                <h4 className="font-extrabold text-base tracking-tight">
                  {selectedTx.id === 'QR-CODE-VIRTUAL' 
                    ? (language === 'ar' ? 'كود المسح السريع للمحفظة' : 'My Personal Pay QR')
                    : (language === 'ar' ? 'المستند المالي وإيصال المعاملة' : 'University Transaction Statement')}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{selectedTx.referenceNo || selectedTx.id}</p>
              </div>

              <div className="p-6 space-y-6 text-right" dir="rtl">
                
                {selectedTx.id === 'QR-CODE-VIRTUAL' ? (
                  /* QR Code view */
                  <div className="text-center space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-250 inline-block mx-auto">
                      <QRCodeSVG 
                        value={`VIRTUAL_WALLET:${selectedStudentId}\nBalance:${walletBalance}\nDate:${new Date().toISOString()}`} 
                        size={180} 
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                      {language === 'ar'
                        ? 'امسح هذا الرمز اللحظي عند صناديق ركن الطعام للطلبة أو المكاتب الإدارية لسداد المدفوعات من محفظتك الإلكترونية مباشرة.'
                        : 'Show this interactive code to checkout servers to pay with your prepaid student savings.'}
                    </p>
                  </div>
                ) : (
                  /* Normal Statement Detailed View */
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-3 font-medium">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-400">{language === 'ar' ? 'اسم الطالب' : 'Student'}</span>
                        <span className="font-black text-slate-800">{student.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-400">{language === 'ar' ? 'رقم القيد الأكاديمي' : 'Enrollment ID'}</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedStudentId}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-400">{language === 'ar' ? 'تاريخ العملية' : 'Transaction Date'}</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedTx.date}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-400">{language === 'ar' ? 'البيان الوظيفي' : 'Description'}</span>
                        <span className="font-bold text-slate-800 leading-tight">{selectedTx.description}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-400">{language === 'ar' ? 'رقم الإسناد المرجعي' : 'Ref Reference'}</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedTx.referenceNo || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 flex justify-between items-center">
                      <span className="text-xs font-black">{language === 'ar' ? 'إجمالي الرصيد المسجل' : 'Completed Realized Balance'}</span>
                      <span className="text-base font-black font-mono">{selectedTx.amount.toLocaleString()} {language === 'ar' ? 'د.ل' : 'LYD'}</span>
                    </div>

                    {/* Hologram or Stamp Watermark */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-[10px] text-slate-500 font-bold leading-relaxed italic">
                      {language === 'ar'
                        ? 'مستند تحصيل إلكتروني صحيح وموثق من جامعة أوراكل كامبس. براءة ذمة الميزانية مجمّدة داخل اللائحة.'
                        : 'Official digital document signed by Oracle Campus Financial Services. Balance represents complete virtual settlement.'}
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex gap-3 justify-end pt-2 print:hidden">
                  <button 
                    onClick={() => setSelectedTx(null)} 
                    className="flex-1 border border-slate-200 py-3 rounded-xl text-xs font-black hover:bg-slate-50 transition-colors text-slate-600 text-center cursor-pointer"
                  >
                    {language === 'ar' ? 'إغلاق النافذة' : 'Close Receipt'}
                  </button>
                  {selectedTx.id !== 'QR-CODE-VIRTUAL' && (
                    <button 
                      onClick={handlePrintReceipt}
                      className="px-6 py-3 bg-indigo-650 hover:bg-slate-950 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Printer size={15} />
                      <span>{language === 'ar' ? 'طباعة الإيصال' : 'Print Receipt'}</span>
                    </button>
                  )}
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default StudentWallet;
