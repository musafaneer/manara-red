import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
    Activity, TrendingUp, ShieldCheck, Zap, 
    ArrowUpRight, Target, BrainCircuit, BarChart3
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { getInstitutionalHealth, getEnrollmentForecast, getPredictiveRiskData } from '../../services/strategicService';
import { Language } from '../../services/i18nService';
import StatCard from '../StatCard';
import { cn } from '../../lib/utils';

interface StrategicDashboardProps {
    language: Language;
}

const HealthScore = ({ label, score, color, language }: { label: string; score: number; color: string; language: Language }) => (
    <div className="flex flex-col items-center group cursor-help p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 hover:bg-white transition-all shadow-sm">
        <div className="relative w-24 h-24 flex items-center justify-center p-2 bg-white rounded-full shadow-lg border border-slate-100">
            <svg className="w-full h-full transform -rotate-90">
                <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-100"
                />
                <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                    className={cn("transition-all duration-1000", color)}
                />
            </svg>
            <span className="absolute text-xl font-black text-slate-800">{score}%</span>
        </div>
        <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
    </div>
);

const StrategicDashboard: React.FC<StrategicDashboardProps> = ({ language }) => {
    const [health, setHealth] = useState(getInstitutionalHealth());
    const [forecast, setForecast] = useState(getEnrollmentForecast());
    const [risk, setRisk] = useState(getPredictiveRiskData());

    useEffect(() => {
        // Refresh analysis on mount
        setHealth(getInstitutionalHealth());
        setForecast(getEnrollmentForecast());
        setRisk(getPredictiveRiskData());
    }, []);

    return (
        <div className="space-y-12">
            {/* Executive Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label={language === 'ar' ? 'مؤشر كفاءة النظام' : 'System Efficiency Index'} value="98.2%" icon={Activity} color="indigo" delay={0.1} />
                <StatCard label={language === 'ar' ? 'النمو الاستراتيجي' : 'Strategic Growth'} value="+14% YoY" icon={TrendingUp} color="emerald" delay={0.2} />
                <StatCard label={language === 'ar' ? 'معدل الحوكمة والامتثال' : 'Governance & Compliance'} value="100%" icon={ShieldCheck} color="blue" delay={0.3} />
                <StatCard label={language === 'ar' ? 'قوة الاستجابة الأكاديمية' : 'Academic Agility'} value="High" icon={Zap} color="purple" delay={0.4} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Institutional Health Metrics */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="xl:col-span-8 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm"
                >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4 italic uppercase">
                                <Activity className="text-indigo-600" />
                                {language === 'ar' ? 'مؤشرات الصحة المؤسسية' : 'Institutional Pulse Matrix'}
                            </h3>
                            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Global Aggregate Metrics Analysis</p>
                        </div>
                        <div className="flex items-center gap-2 bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100">
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Real-time Node Status</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        <HealthScore label={language === 'ar' ? 'الأداء الأكاديمي' : 'Academic Performance'} score={health.academicHealth} color="text-indigo-500" language={language} />
                        <HealthScore label={language === 'ar' ? 'الاستدامة المالية' : 'Fiscal Sustainability'} score={health.financialStability} color="text-emerald-500" language={language} />
                        <HealthScore label={language === 'ar' ? 'كفاءة الموارد' : 'Operational Efficiency'} score={health.operationalEfficiency} color="text-blue-500" language={language} />
                        <HealthScore label={language === 'ar' ? 'درجة الامتثال' : 'Compliance Rating'} score={health.complianceScore} color="text-purple-500" language={language} />
                    </div>

                    <div className="mt-12 h-64 border-t border-slate-50 pt-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={forecast}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} reversed={language === 'ar'} />
                                <YAxis hide />
                                <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)'}} />
                                <Area type="monotone" dataKey="forecast" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorTrend)" />
                            </AreaChart>
                        </ResponsiveContainer>
                        <p className="text-[9px] font-black text-slate-400 text-center uppercase tracking-[0.4em] mt-4">Growth Projection Model (Next 4 Epochs)</p>
                    </div>
                </motion.div>

                {/* Risk Radar & Predictive Analysis */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="xl:col-span-4 space-y-8"
                >
                    <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                            <BrainCircuit size={120} />
                        </div>
                        <h3 className="text-xl font-black mb-8 flex items-center gap-3 relative z-10 italic uppercase">
                            <Target className="text-indigo-400" />
                            {language === 'ar' ? 'رادار المخاطر الاستراتيجية' : 'Strategic Risk Radar'}
                        </h3>
                        <div className="space-y-8 relative z-10">
                            {risk.map((item, idx) => (
                                <div key={idx} className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <span>{item.primaryFactor}</span>
                                        <span className={cn(
                                            item.riskScore > 50 ? 'text-rose-400' : 'text-emerald-400'
                                        )}>{item.riskScore > 50 ? 'High' : 'Moderate'}</span>
                                    </div>
                                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.riskScore}%` }}
                                            transition={{ delay: 0.5 + (idx * 0.1), duration: 1 }}
                                            className={cn(
                                                "h-full rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)]",
                                                item.riskScore > 50 ? 'bg-rose-500' : 'bg-emerald-500'
                                            )}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-12 bg-indigo-600 hover:bg-indigo-700 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-black/20 group-hover:bg-indigo-500 active:scale-95 italic">
                            {language === 'ar' ? 'تصدير التقرير الاستراتيجي' : 'Generate Full Risk Audit'}
                        </button>
                    </div>

                    <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                         <h3 className="text-xl font-black mb-10 text-slate-800 flex items-center gap-3 italic uppercase">
                            <BarChart3 className="text-indigo-600" />
                            {language === 'ar' ? 'توزع الأهداف السنوية' : 'Fiscal Term Objectives'}
                        </h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'A', val: 80 },
                                    { name: 'B', val: 65 },
                                    { name: 'C', val: 90 },
                                    { name: 'D', val: 40 },
                                ]}>
                                    <Bar dataKey="val" radius={[8, 8, 8, 8]}>
                                        {[80, 65, 90, 40].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 2 ? '#6366f1' : '#f1f5f9'} />
                                        ))}
                                    </Bar>
                                    <Tooltip />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-8 flex justify-between items-center bg-slate-50 p-6 rounded-3xl">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Target Progress</p>
                                <p className="text-2xl font-black text-slate-900 italic">82.5%</p>
                            </div>
                            <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                                <ArrowUpRight size={24} />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default StrategicDashboard;
