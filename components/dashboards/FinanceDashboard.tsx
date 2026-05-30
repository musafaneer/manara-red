import React, { useEffect, useState } from 'react';
import { 
    TrendingUp, AlertCircle, CreditCard, Activity 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getFinancialStats, getTransactions } from '../../services/financeService';
import { Language } from '../../services/i18nService';
import StatCard from '../StatCard';

interface FinanceDashboardProps {
    language: Language;
}

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ language }) => {
    const [stats, setStats] = useState({ totalRevenue: 0, totalOutstanding: 0 });
    const [transactions, setTransactions] = useState(getTransactions().slice(0, 5));

    useEffect(() => {
        setStats(getFinancialStats());
        setTransactions(getTransactions().slice(0, 5));
    }, []);

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label={language === 'ar' ? 'إجمالي الإيرادات' : 'Gross Revenue'} value={`${stats.totalRevenue.toLocaleString()} ${language === 'ar' ? 'د.ل' : 'LYD'}`} icon={TrendingUp} color="emerald" trend="12%" trendUp={true} delay={0.1} />
                <StatCard label={language === 'ar' ? 'الديون المستحقة' : 'Outstanding Arrears'} value={`${stats.totalOutstanding.toLocaleString()} ${language === 'ar' ? 'د.ل' : 'LYD'}`} icon={AlertCircle} color="red" trend="5%" trendUp={false} delay={0.2} />
                <StatCard label={language === 'ar' ? 'المعاملات اليوم' : 'Daily Transactions'} value={transactions.length} icon={CreditCard} color="blue" delay={0.3} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <h3 className="font-black text-xl mb-8 text-slate-800 flex items-center gap-3">
                        <Activity size={20} className="text-emerald-500" /> {language === 'ar' ? 'اتجاه التحصيل المالي' : 'Collection Velocity Analysis'}
                    </h3>
                    <div className="h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[
                                { name: language === 'ar' ? 'يناير' : 'Jan', amount: stats.totalRevenue * 0.7 },
                                { name: language === 'ar' ? 'فبراير' : 'Feb', amount: stats.totalRevenue * 0.85 },
                                { name: language === 'ar' ? 'مارس' : 'Mar', amount: stats.totalRevenue * 0.9 },
                                { name: language === 'ar' ? 'أبريل' : 'Apr', amount: stats.totalRevenue },
                            ]}>
                                <defs>
                                    <linearGradient id="colorFinance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} reversed={language === 'ar'} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorFinance)" />
                            </AreaChart>
                         </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-emerald-600 p-10 rounded-[3rem] text-white flex flex-col justify-between shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                       <CreditCard size={120} />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.25em] mb-4">
                            {language === 'ar' ? 'كفاءة التحصيل' : 'Collection Efficiency'}
                        </h4>
                        <p className="text-5xl font-black italic tracking-tighter">94.2%</p>
                        <p className="text-emerald-50 text-xs mt-6 leading-relaxed font-medium">
                            {language === 'ar' ? 'معدل سداد الرسوم الفصلية مقارنة بالعام الماضي (88%).' : 'Quarterly fee settlement rate performance vs prior fiscal period (88%).'}
                        </p>
                    </div>
                    <div className="relative z-10 pt-10 border-t border-emerald-500/30 mt-10 space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-emerald-200 text-[10px] font-black uppercase tracking-widest">
                                {language === 'ar' ? 'الهدف الفصلي' : 'Fiscal Term Target'}
                            </span>
                            <span className="text-white text-sm font-black italic">1.2M {language === 'ar' ? 'د.ل' : 'LYD'}</span>
                        </div>
                        <div className="w-full bg-emerald-700/50 h-3 rounded-full overflow-hidden">
                            <div className="bg-white h-full w-[85%] rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                <h3 className="font-black text-xl mb-8 text-slate-800 flex items-center gap-3">
                    <CreditCard className="text-blue-500" />
                    {language === 'ar' ? 'آخر المعاملات المالية المصادقة' : 'Verified Financial Ledger'}
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-8 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">{language === 'ar' ? 'التاريخ' : 'Execution Date'}</th>
                                <th className="px-8 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">{language === 'ar' ? 'الطالب' : 'Identity'}</th>
                                <th className="px-8 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">{language === 'ar' ? 'النوع' : 'Category'}</th>
                                <th className={`px-8 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'القيمة' : 'Net Amount'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {transactions.map(t => (
                                <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6 text-[11px] font-black text-slate-400 italic font-mono">{new Date(t.date).toLocaleDateString(language === 'ar' ? 'ar-LY' : 'en-US')}</td>
                                    <td className="px-8 py-6 text-sm font-black text-slate-800 uppercase italic tracking-tighter">{t.studentId}</td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                                            t.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                        }`}>
                                            {t.category}
                                        </span>
                                    </td>
                                    <td className={`px-8 py-6 text-base font-black ${language === 'ar' ? 'text-left' : 'text-right'} ${
                                        t.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                                    } italic`}>
                                        {t.type === 'CREDIT' ? '+' : '-'}{t.amount.toLocaleString()} {language === 'ar' ? 'د.ل' : 'LYD'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinanceDashboard;
