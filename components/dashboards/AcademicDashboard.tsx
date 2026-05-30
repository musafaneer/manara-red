import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
    Users, ShieldAlert, GraduationCap, TrendingUp, Activity, 
    History as HistoryIcon, Scale, PieChart as PieChartIcon, CheckCircle2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { getStudents, getDepartmentName } from '../../services/storageService';
import { getAuditLogs } from '../../services/auditService';
import { StudentStatus, ProgramType, AuditLog, UserRole } from '../../types';
import { Language } from '../../services/i18nService';
import StatCard from '../StatCard';
import { cn } from '../../lib/utils';

interface AcademicDashboardProps {
    language: Language;
}

const AcademicDashboard: React.FC<AcademicDashboardProps> = ({ language }) => {
  const [students, setStudents] = useState(getStudents());
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);

  useEffect(() => {
    setStudents(getStudents());
    setRecentActivity(getAuditLogs().slice(0, 5)); 
  }, []);

  const totalStudents = students.length;
  const warnings = students.filter(s => s.warningsCount > 0 || s.status === StudentStatus.WARNING).length;
  const postgrads = students.filter(s => s.program === ProgramType.POSTGRADUATE).length;
  const avgGpa = totalStudents > 0 
    ? (students.reduce((acc, curr) => acc + curr.gpa, 0) / totalStudents).toFixed(1)
    : '0';

  const newApplicants = students.filter(s => s.enrollmentYear === 2024);
  const eligibleApplicants = newApplicants.filter(s => {
      const score = s.admissionScore || 0;
      if (s.program === ProgramType.UNDERGRADUATE) {
          const isScience = s.admissionCertificateType?.includes('SCIENCE');
          return score >= (isScience ? 70 : 65);
      }
      return score >= 75;
  });
  const admissionPassRate = newApplicants.length > 0 
    ? Math.round((eligibleApplicants.length / newApplicants.length) * 100)
    : 0;

  const deptCounts: Record<string, number> = {};
  students.forEach(s => {
      if (s.departmentId) {
          const deptName = getDepartmentName(s.departmentId);
          deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
      }
  });
  
  const deptData = Object.entries(deptCounts).map(([name, count]) => ({ name, count }));
  const criticalCases = students.filter(s => s.warningsCount >= 3 && s.status !== StudentStatus.SUSPENDED && s.status !== StudentStatus.GRADUATED);

  return (
    <div className="space-y-12">
      {/* High-Fidelity Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        {[
            { label: language === 'ar' ? 'إجمالي الطلاب' : 'Total Population', value: totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50/50' },
            { label: language === 'ar' ? 'إنذارات اللائحة' : 'Reg. Violations', value: warnings, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50/50' },
            { label: language === 'ar' ? 'الدراسات العليا' : 'Postgraduates', value: postgrads, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50/50' },
            { label: language === 'ar' ? 'متوسط المعدل' : 'Avg. Performance', value: `${avgGpa}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
            { label: language === 'ar' ? 'قبول الوحدة 4' : 'Unit 4 Admission', value: `${admissionPassRate}%`, icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50/50' }
        ].map((stat, i) => (
            <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn("p-10 rounded-[3rem] border border-stone-100 flex flex-col items-center justify-center text-center relative overflow-hidden group bg-white shadow-sm")}
            >
                <div className={cn("absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-125 transition-transform duration-700", stat.color)}>
                    <stat.icon size={80} />
                </div>
                <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-black/5", stat.bg, stat.color)}>
                    <stat.icon size={32} />
                </div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">{stat.label}</p>
                <p className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase">{stat.value}</p>
            </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Performance Matrix - Technical Dark Style */}
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="xl:col-span-8 bg-white rounded-[4rem] p-12 shadow-sm border border-slate-100 relative overflow-hidden group"
        >
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(#6366f1 0.5px, transparent 0.5px), linear-gradient(90deg, #6366f1 0.5px, transparent 0.5px)', backgroundSize: '40px 40px' }}>
            </div>
            
            <div className="flex justify-between items-center mb-12 relative z-10">
                <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-4 text-slate-800">
                        <Activity className="text-indigo-600" />
                        {language === 'ar' ? 'تحليل الأداء المؤسسي' : 'Institutional Performance Matrix'}
                    </h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Departmental Flux Evaluation</p>
                </div>
                <div className="px-6 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700">Live Telemetry</span>
                </div>
            </div>

            <div className="h-80 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={deptData}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} reversed={language === 'ar'} />
                        <YAxis hide />
                        <Tooltip 
                            contentStyle={{borderRadius: '24px', backgroundColor: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)'}} 
                            itemStyle={{color: '#0f172a', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase'}}
                        />
                        <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={5} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>

        {/* Audit Ledger - High Contrast */}
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="xl:col-span-4 bg-white rounded-[4rem] border border-stone-100 p-12 shadow-sm flex flex-col"
        >
            <h3 className="text-xl font-black mb-10 text-slate-900 flex items-center gap-4 italic uppercase">
                <HistoryIcon className="text-indigo-600" />
                {language === 'ar' ? 'سجل العمليات الأخير' : 'Security Audit Ledger'}
            </h3>
            
            <div className="space-y-10 flex-1">
                {recentActivity.map((log, idx) => (
                    <div key={log.id} className="flex gap-6 group cursor-crosshair">
                        <div className="flex flex-col items-center">
                            <div className={cn(
                                "w-3 h-3 rounded-full shrink-0 group-hover:scale-150 transition-all duration-300",
                                log.type === 'danger' ? 'bg-rose-500 shadow-xl shadow-rose-200' : 'bg-indigo-500 shadow-xl shadow-indigo-200'
                            )}></div>
                            <div className="w-px h-full bg-stone-100 mt-2"></div>
                        </div>
                        <div className="space-y-1 pb-6">
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none group-hover:text-indigo-600 transition-colors italic">{log.action}</p>
                            <p className="text-[9px] text-stone-400 font-black uppercase tracking-widest mt-1">
                                {new Date(log.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-LY' : 'en-US')}
                            </p>
                            <p className="text-xs text-stone-500 font-medium leading-relaxed mt-3 line-clamp-2">{log.details}</p>
                        </div>
                    </div>
                ))}
            </div>

            <button className="mt-10 w-full py-5 bg-stone-900 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95 italic">
                {language === 'ar' ? 'فتح السجل الكامل' : 'Authorize Full History'}
            </button>
        </motion.div>
      </div>

      {/* Compliance Shield Section */}
      <div className="bg-emerald-500 p-16 rounded-[4.5rem] text-white flex flex-col md:flex-row items-center gap-16 relative overflow-hidden shadow-2xl shadow-emerald-200">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform">
              <ShieldAlert size={200} />
          </div>
          <div className="bg-white p-8 rounded-[3.5rem] shadow-inner shrink-0 rotate-3">
              <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center text-white">
                  <Scale size={48} />
              </div>
          </div>
          <div className="flex-1 space-y-6">
              <h4 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                  {language === 'ar' ? 'الامتثال للائحة الاسترشادية 501' : 'Regulation 501 Compliance Protocol'}
              </h4>
              <p className="text-emerald-50 text-sm leading-relaxed font-bold uppercase tracking-tight opacity-80">
                  {language === 'ar' 
                      ? `تم اكتشاف ${criticalCases.length} حالة تتجاوز الحد التنظيمي. النظام يوصي باتخاذ إجراء فوري حسب المادة رقم 46.`
                      : `Autonomous detection active: ${criticalCases.length} subjects found at threshold violation. System recommends immediate Article 46 enforcement.`}
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                  <button className="bg-white text-emerald-600 px-10 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/40 active:scale-95 transition-all">
                      {language === 'ar' ? 'تجميد القيود فورياً' : 'Freeze Academic Status'}
                  </button>
                  <button className="bg-emerald-600 text-white border-2 border-white/20 px-10 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95">
                      {language === 'ar' ? 'مراجعة الحالات' : 'Human-Led Review'}
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default AcademicDashboard;
