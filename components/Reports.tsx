import React, { useState, useEffect } from 'react';
import { getStudents, getCourses, getSystemSettings, getStaff } from '../services/storageService';
import { getTransactions } from '../services/financeService';
import { reportingService } from '../services/reportingService';
import { Student, Course, StudentStatus, ProgramType, StaffMember, Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { Printer, Trophy, AlertTriangle, TrendingUp, Download, Calendar, Filter, CheckCircle, Users, DollarSign, Wallet, Sparkles } from 'lucide-react';
import SecurePrintWrapper from './ui/SecurePrintWrapper';

import { Language } from '../services/i18nService';

interface ReportsProps {
    language?: Language;
}

const Reports: React.FC<ReportsProps> = ({ language = 'ar' }) => {
  // Helper to merge class names
  function cn(...inputs: (string | boolean | undefined)[]) {
    return inputs.filter(Boolean).join(' ');
  }

  const [activeTab, setActiveTab] = useState<'performance' | 'honor' | 'risk' | 'courses' | 'staff' | 'finance'>('performance');
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<any[]>([]);
  const settings = getSystemSettings();

  useEffect(() => {
    setStudents(getStudents());
    setCourses(getCourses());
    setStaff(getStaff());
    setTransactions(getTransactions());
    setRiskAnalysis(reportingService.getRiskAnalysis());
  }, []);

  const currentDate = new Date().toLocaleDateString('ar-LY');

  // --- Data Aggregation Helpers ---

  // 1. Honor List (GPA >= 85%)
  const honorStudents = students
    .filter(s => s.gpa >= 85 && s.status !== StudentStatus.WITHDRAWN && s.status !== StudentStatus.SUSPENDED)
    .sort((a, b) => b.gpa - a.gpa);

  // 2. At Risk (Warnings > 0)
  const atRiskStudents = students
    .filter(s => s.warningsCount > 0 || s.status === StudentStatus.WARNING)
    .sort((a, b) => b.warningsCount - a.warningsCount);

  // 3. Course Stats
  const courseStats = courses.map(course => {
    let enrolled = 0;
    let passed = 0;
    let totalScore = 0;
    
    students.forEach(s => {
      const grade = s.grades.find(g => g.courseId === course.id);
      if (grade) {
        enrolled++;
        totalScore += grade.score;
        const passing = s.program === ProgramType.POSTGRADUATE ? 65 : 50;
        if (grade.score >= passing) passed++;
      }
    });

    return {
      ...course,
      enrolled,
      passRate: enrolled > 0 ? Math.round((passed / enrolled) * 100) : 0,
      avgScore: enrolled > 0 ? Math.round(totalScore / enrolled) : 0
    };
  }).sort((a, b) => a.passRate - b.passRate); // Sort by lowest pass rate (most difficult courses first)

  // 4. GPA Distribution
  const gpaDistribution = [
    { name: 'Excellent (85-100)', count: students.filter(s => s.gpa >= 85).length, color: '#C74634' },
    { name: 'Very Good (75-84)', count: students.filter(s => s.gpa >= 75 && s.gpa < 85).length, color: '#DC2626' },
    { name: 'Good (65-74)', count: students.filter(s => s.gpa >= 65 && s.gpa < 75).length, color: '#EA580C' },
    { name: 'Acceptable (50-64)', count: students.filter(s => s.gpa >= 50 && s.gpa < 65).length, color: '#D97706' },
    { name: 'Poor (<50)', count: students.filter(s => s.gpa < 50).length, color: '#78716c' },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 font-sans" dir="ltr">
      <div className="flex justify-between items-end mb-8 no-print">
        <div>
          <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <TrendingUp className="text-brand-500" />
            Analytics & Reports
          </h2>
          <p className="text-stone-500 mt-2 font-medium">Strategic intelligence and institutional performance tracking</p>
        </div>
        <button 
          onClick={handlePrint}
          className="bg-stone-900 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
        >
          <Printer size={18} />
          <span className="font-bold text-sm uppercase tracking-wider">Export PDF / Print</span>
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-stone-200 overflow-hidden min-h-[800px] flex flex-col">
        {/* Report Header (Visible only in Print) */}
        <div className="hidden print-area mb-8 text-center border-b-2 border-stone-900 pb-6">
            <h1 className="text-3xl font-black mb-2 uppercase tracking-tighter">{settings.institutionName || 'Oracle Campus Management'}</h1>
            <h2 className="text-xl font-bold text-stone-600">Office of the Registrar - BI & Reports Division</h2>
            <div className="flex justify-between mt-6 text-xs font-bold text-stone-400 uppercase tracking-widest px-4">
                <span>Report: {
                    activeTab === 'performance' ? 'Institutional Performance' : 
                    activeTab === 'honor' ? 'Honor Roll Registry' : 
                    activeTab === 'risk' ? 'Risk Intervention Analysis' : 
                    activeTab === 'courses' ? 'Curriculum Performance' : 'Human Capital Statistics'
                }</span>
                <span>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
        </div>

        {/* Tabs (Hidden in Print) */}
        <div className="flex border-b border-stone-100 bg-stone-50/50 px-8 pt-6 gap-2 no-print overflow-x-auto">
          <button 
            onClick={() => setActiveTab('performance')}
            className={`pb-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap transition-all ${activeTab === 'performance' ? 'border-brand-500 text-brand-600' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('honor')}
            className={`pb-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'honor' ? 'border-brand-500 text-brand-600' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            <Trophy size={14} />
            Honor Roll
          </button>
          <button 
            onClick={() => setActiveTab('risk')}
            className={`pb-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'risk' ? 'border-red-500 text-red-600' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            <AlertTriangle size={14} />
            Risk Analysis
          </button>
          <button 
            onClick={() => setActiveTab('courses')}
            className={`pb-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap transition-all ${activeTab === 'courses' ? 'border-stone-800 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            Course Analytics
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            className={`pb-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'staff' ? 'border-stone-800 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            <Users size={14} />
            HR Insights
          </button>
          <button 
            onClick={() => setActiveTab('finance')}
            className={`pb-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'finance' ? 'border-brand-500 text-brand-600' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            <DollarSign size={14} />
            Fiscal Report
          </button>
        </div>

        <div className="p-8 print-area flex-1 bg-white">
          <SecurePrintWrapper
            documentType={
                activeTab === 'performance' ? (language === 'ar' ? 'تقرير الأداء المؤسسي' : 'Institutional Performance Report') : 
                activeTab === 'honor' ? (language === 'ar' ? 'سجل لوحة الشرف الأكاديمية' : 'Honor Roll Registry') : 
                activeTab === 'risk' ? (language === 'ar' ? 'تحليل مخاطر التعثر الأكاديمي' : 'Risk Intervention Analysis') : 
                activeTab === 'courses' ? (language === 'ar' ? 'تحليل أداء المناهج الدراسية' : 'Curriculum Performance Analysis') : 
                activeTab === 'staff' ? (language === 'ar' ? 'إحصائيات الكوادر البشرية' : 'Human Capital Statistics') :
                (language === 'ar' ? 'التقرير المالي المؤسسي' : 'Institutional Fiscal Report')
            }
            documentId={`REP-${activeTab.toUpperCase()}-${Date.now()}`}
            language={language}
          >
            <div className="py-6">
              {/* Report Header (Visible only in Print) - Now integrated in Wrapper but we can add specific context */}
              <div className="hidden print-area mb-8 pb-6 border-b border-stone-100">
                  <h2 className="text-xl font-bold text-stone-600">Office of the Registrar - BI & Reports Division</h2>
              </div>
          
              {/* 1. Performance Overview */}
          {activeTab === 'performance' && (
            <div className="space-y-12">
                <div className="grid grid-cols-3 gap-6 mb-8 text-center">
                    <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-2">Total Students</p>
                        <p className="text-3xl font-black text-stone-900">{students.length}</p>
                    </div>
                    <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-2">Success Rate</p>
                        <p className="text-3xl font-black text-brand-500">
                            {Math.round((students.filter(s => s.gpa >= 50).length / students.length) * 100) || 0}%
                        </p>
                    </div>
                    <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-2">Active Courses</p>
                        <p className="text-3xl font-black text-stone-900">{courses.length}</p>
                    </div>
                </div>

                <div className="h-96">
                    <h3 className="font-bold text-lg mb-8 text-stone-800 text-center uppercase tracking-tight">Grade Distribution Analysis</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={gpaDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 10, fontWeight: 700, fill: '#78716c'}} axisLine={false} />
                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                            <Bar dataKey="count" name="Students" radius={[0, 8, 8, 0]} barSize={32}>
                                {gpaDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="border-t border-stone-100 pt-8">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-stone-400 mb-6">AI-Powered Institutional Recommendations</h3>
                    <div className="space-y-4">
                        <div className="flex gap-4 p-4 bg-stone-50 rounded-xl border border-stone-100">
                            <Sparkles className="text-brand-500 shrink-0" size={18} />
                            <p className="text-sm font-medium text-stone-600">The proportion of students in the "Acceptable" category is high. Automated curriculum review is recommended for early intervention.</p>
                        </div>
                        <div className="flex gap-4 p-4 bg-stone-50 rounded-xl border border-stone-100">
                            <AlertTriangle className="text-red-500 shrink-0" size={18} />
                            <p className="text-sm font-medium text-stone-600"><span className="font-bold text-stone-900">{atRiskStudents.length} students</span> identified as high-risk. Urgent intervention required to prevent academic dismissal under University Regulation 501.</p>
                        </div>
                        <div className="flex gap-4 p-4 bg-stone-50 rounded-xl border border-stone-100">
                            <CheckCircle className="text-emerald-500 shrink-0" size={18} />
                            <p className="text-sm font-medium text-stone-600">Postgraduate programs show high stability with a success rate exceeding 90%. Scaling identified best practices is suggested.</p>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* 2. Honor List */}
          {activeTab === 'honor' && (
             <div className="space-y-8">
                 <div className="text-center mb-12 bg-stone-900 p-12 rounded-[2.5rem] text-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Trophy size={120} />
                     </div>
                     <div className="relative z-10">
                        <Trophy className="mx-auto text-brand-500 mb-6 h-16 w-16" />
                        <h2 className="text-4xl font-light mb-2">Institutional <span className="font-bold">Honor Roll</span></h2>
                        <p className="text-stone-400 font-bold uppercase tracking-[0.2em] text-xs">Academic Term: {settings.currentSemester}</p>
                        <p className="text-stone-500 mt-6 max-w-xl mx-auto text-sm leading-relaxed">Recognizing the exceptional academic achievements of students who have maintained a Cumulative GPA of 85% or higher.</p>
                     </div>
                 </div>

                 <div className="overflow-hidden rounded-3xl border border-stone-200">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-stone-50 text-stone-400 uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                <th className="p-6">Rank</th>
                                <th className="p-6">Name</th>
                                <th className="p-6">Student ID</th>
                                <th className="p-6">Department</th>
                                <th className="p-6 text-right">CGPA</th>
                                <th className="p-6">Standing</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {honorStudents.map((student, idx) => (
                                <tr key={student.id} className={idx < 3 ? 'bg-brand-50/10' : 'hover:bg-stone-50/50 transition-colors'}>
                                    <td className="p-6 font-black text-stone-900 w-24">
                                        <div className="flex items-center gap-2">
                                            #{idx + 1}
                                            {idx === 0 && <span className="text-lg">🥇</span>}
                                            {idx === 1 && <span className="text-lg">🥈</span>}
                                            {idx === 2 && <span className="text-lg">🥉</span>}
                                        </div>
                                    </td>
                                    <td className="p-6 font-bold text-stone-800">{student.name}</td>
                                    <td className="p-6 font-mono text-xs text-stone-400">{student.id}</td>
                                    <td className="p-6 text-sm text-stone-600 font-medium">{student.departmentId}</td>
                                    <td className="p-6 font-black text-brand-600 text-right">{student.gpa}%</td>
                                    <td className="p-6">
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-full border border-emerald-100">
                                            Excellent
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                 
                 {honorStudents.length === 0 && (
                     <div className="text-center p-24 bg-stone-50 rounded-[2.5rem] border border-dashed border-stone-200">
                        <Trophy className="mx-auto text-stone-200 mb-4" size={48} />
                         <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">No students currently meet the Honor Roll criteria</p>
                     </div>
                 )}
             </div>
          )}

          {/* 3. At Risk Report */}
          {activeTab === 'risk' && (
              <div className="space-y-12">
                <div className="flex items-start gap-6 bg-red-50 p-8 rounded-[2rem] border border-red-100">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0 text-red-600 shadow-xl shadow-red-100">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="font-black text-red-900 text-lg uppercase tracking-tight italic">Strategic Risk Audit</h3>
                        <p className="text-red-800 text-xs mt-2 leading-relaxed font-bold opacity-70">
                            Institutional assessment based on real-time student performance, financial stability, and human resource bandwidth. 
                            Compliance with Regulation 501 is monitored via neural audit layers.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {riskAnalysis.map((risk, idx) => (
                        <div key={idx} className={cn(
                            "p-8 rounded-[2.5rem] border transition-all hover:scale-[1.02] duration-500",
                            risk.level === 'CRITICAL' ? "bg-rose-50 border-rose-100 shadow-xl shadow-rose-100/20" :
                            risk.level === 'WARNING' ? "bg-amber-50 border-amber-100 shadow-xl shadow-amber-100/20" :
                            "bg-indigo-50 border-indigo-100 shadow-xl shadow-indigo-100/20"
                        )}>
                            <div className="flex justify-between items-start mb-6">
                                <span className={cn(
                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                    risk.level === 'CRITICAL' ? "bg-rose-600 text-white border-rose-700" :
                                    risk.level === 'WARNING' ? "bg-amber-600 text-white border-amber-700" :
                                    "bg-indigo-600 text-white border-indigo-700"
                                )}>
                                    {risk.level}
                                </span>
                                <div className="p-3 bg-white rounded-2xl shadow-sm">
                                    <AlertTriangle size={18} className={risk.level === 'CRITICAL' ? "text-rose-500" : "text-amber-500"} />
                                </div>
                            </div>
                            <h4 className="text-xl font-black text-slate-900 uppercase italic mb-3 tracking-tight">{risk.indicator}</h4>
                            <p className="text-xs text-slate-500 font-bold mb-6 leading-relaxed">Impact: <span className="text-slate-900">{risk.impact}</span></p>
                            <div className="p-6 bg-white rounded-3xl border border-stone-50 text-[11px] font-bold text-slate-600 italic leading-relaxed">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 opacity-50">Expert Recommendation</p>
                                {risk.recommendation}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-12 border-t border-stone-100">
                    <h3 className="font-black text-xs uppercase tracking-widest text-stone-400 mb-8 px-4 italic">Individual Student Probation Registry</h3>
                    <div className="overflow-hidden rounded-[3rem] border border-stone-100 shadow-sm bg-white">
                        <table className="w-full text-left border-collapse">
                        <thead className="bg-stone-50 text-stone-400 uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                <th className="p-6">Student</th>
                                <th className="p-6">Department</th>
                                <th className="p-6">Program</th>
                                <th className="p-6">Current GPA</th>
                                <th className="p-6">Warning Level</th>
                                <th className="p-6">Standing</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {atRiskStudents.map((student) => {
                                const isCritical = student.warningsCount >= 3;
                                return (
                                    <tr key={student.id} className="hover:bg-red-50/10 transition-colors">
                                        <td className="p-6">
                                            <p className="font-bold text-stone-800">{student.name}</p>
                                            <p className="text-[10px] text-stone-400 font-mono uppercase tracking-tighter mt-1">{student.id}</p>
                                        </td>
                                        <td className="p-6 text-sm text-stone-600 font-medium">{student.departmentId}</td>
                                        <td className="p-6 text-xs text-stone-500 font-bold uppercase tracking-widest">{student.program}</td>
                                        <td className="p-6 font-black text-red-600">{student.gpa}%</td>
                                        <td className="p-6">
                                            <div className="flex gap-1.5">
                                                {Array.from({length: 4}).map((_, i) => (
                                                    <div key={i} className={`w-3 h-1.5 rounded-full ${i < student.warningsCount ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-stone-200'}`}></div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            {isCritical ? (
                                                <span className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase rounded-full border border-red-700/50 shadow-lg shadow-red-200">
                                                    Dismissal Risk
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[9px] font-black uppercase rounded-full border border-amber-200">
                                                    Probation
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                  </div>
                </div>
                {atRiskStudents.length === 0 && (
                    <div className="text-center p-24 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 flex flex-col items-center">
                        <CheckCircle className="text-emerald-500 mb-4" size={48} />
                        <p className="text-emerald-900 font-black uppercase tracking-widest text-xs">Excellence Achieved: No students on probation</p>
                    </div>
                )}
              </div>
          )}

          {/* 4. Course Analysis */}
          {activeTab === 'courses' && (
              <div className="space-y-8">
                  <h3 className="font-bold text-lg text-stone-800 mb-8 uppercase tracking-tight">Curriculum Difficulty Matrix <span className="font-light text-stone-400 font-mono text-xs ml-4">by Pass Rate (%)</span></h3>
                  
                  <div className="h-80 mb-12">
                     <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={courseStats.slice(0, 15)}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                             <XAxis dataKey="code" tick={{fontSize: 10, fontWeight: 700, fill: '#78716c'}} axisLine={false} tickLine={false} interval={0} />
                             <YAxis unit="%" hide />
                             <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                             <Bar dataKey="passRate" name="Pass Rate" radius={[4, 4, 0, 0]} barSize={24}>
                                {courseStats.slice(0, 15).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.passRate < 50 ? '#C74634' : entry.passRate < 75 ? '#D97706' : '#10b981'} />
                                ))}
                             </Bar>
                         </BarChart>
                     </ResponsiveContainer>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-stone-200">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-stone-50 text-stone-400 uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                <th className="p-6">Code</th>
                                <th className="p-6">Course Title</th>
                                <th className="p-6">Enrollment</th>
                                <th className="p-6">Avg. GPA</th>
                                <th className="p-6 text-right">Pass Rate</th>
                                <th className="p-6">Metric</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {courseStats.map(course => (
                                <tr key={course.id} className="hover:bg-stone-50 transition-colors">
                                    <td className="p-6 font-mono font-bold text-stone-400">{course.code}</td>
                                    <td className="p-6 font-bold text-stone-800">{course.name}</td>
                                    <td className="p-6 font-medium text-stone-600">{course.enrolled}</td>
                                    <td className="p-6 font-black text-stone-900">{course.avgScore}%</td>
                                    <td className="p-6 font-black text-brand-600 text-right">{course.passRate}%</td>
                                    <td className="p-6">
                                        {course.passRate < 50 ? (
                                            <span className="px-2.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-black uppercase rounded-lg border border-red-100">High Difficulty</span>
                                        ) : course.passRate >= 85 ? (
                                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-lg border border-emerald-100">High Success</span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 bg-stone-100 text-stone-600 text-[10px] font-black uppercase rounded-lg">Target Standard</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
          )}

          {/* 5. Staff Statistics (HR Focus) */}
          {activeTab === 'staff' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-stone-50 border border-stone-100 p-8 rounded-3xl">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Total Workforce</p>
                    <p className="text-3xl font-black text-stone-900">{staff.length}</p>
                  </div>
                  <div className="bg-stone-50 border border-stone-100 p-8 rounded-3xl">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Academic Faculty</p>
                    <p className="text-3xl font-black text-stone-900">{staff.filter(s => s.type === 'ACADEMIC').length}</p>
                  </div>
                  <div className="bg-stone-50 border border-stone-100 p-8 rounded-3xl">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Administrative Staff</p>
                    <p className="text-3xl font-black text-stone-900">{staff.filter(s => s.type !== 'ACADEMIC').length}</p>
                  </div>
                  <div className="bg-stone-50 border border-stone-100 p-8 rounded-3xl">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Retention Rate</p>
                    <p className="text-3xl font-black text-emerald-600">98.5%</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="h-80">
                    <h3 className="font-black text-[10px] text-stone-400 uppercase tracking-widest mb-8 text-center">Academic Credential Distribution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'PhD', value: staff.filter(s => s.degree === 'PhD').length },
                            { name: 'Masters', value: staff.filter(s => s.degree === 'Master').length },
                            { name: 'Bachelors', value: staff.filter(s => s.degree === 'Bachelor').length },
                            { name: 'Diploma', value: staff.filter(s => s.degree === 'Diploma').length },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {['#0c0a09', '#C74634', '#78716c', '#d6d3d1'].map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-80">
                    <h3 className="font-black text-[10px] text-stone-400 uppercase tracking-widest mb-8 text-center">Employment Authorization Status</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Active', count: staff.filter(s => s.status === 'ACTIVE').length },
                        { name: 'On Leave', count: staff.filter(s => s.status === 'ON_LEAVE').length },
                        { name: 'Archived', count: staff.filter(s => s.status === 'RESIGNED').length },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700, fill: '#78716c'}} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
                        <Bar dataKey="count" fill="#C74634" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-stone-50 p-10 rounded-[2.5rem] border border-stone-100">
                  <h3 className="font-black text-[10px] text-stone-400 uppercase tracking-widest mb-8">Recent Personnel Onboarding</h3>
                  <div className="space-y-3">
                    {staff.sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()).slice(0, 5).map(member => (
                      <div key={member.id} className="flex justify-between items-center bg-white p-6 rounded-2xl border border-stone-100 group hover:border-brand-200 transition-colors">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 font-bold group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-stone-800">{member.name}</p>
                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">{member.position} • {member.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1">Joined Date</p>
                          <p className="font-mono text-xs text-stone-500">{member.joinDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

              {/* 6. Financial Report */}
              {activeTab === 'finance' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   {/* Advanced Financial DNA */}
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-1 bg-stone-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-125 transition-transform duration-700">
                        <DollarSign size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-8">
                            <DollarSign size={24}/>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 block mb-3">Total Collection</span>
                        <p className="text-4xl font-black mb-1">
                            USD {transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 mt-6">
                            <div className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg border border-emerald-500/20">
                                +12.5%
                            </div>
                            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">vs Last Month</span>
                        </div>
                    </div>
                  </div>

                  <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white border border-stone-200 p-10 rounded-[3rem] shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 bg-stone-50 text-stone-400 rounded-xl flex items-center justify-center mb-6"><Wallet size={20}/></div>
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Outstanding Receivables</span>
                            <p className="text-3xl font-black text-stone-900 mt-4 leading-none">
                                USD {transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                            </p>
                        </div>
                        <div className="mt-8 w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-brand-500 h-full w-[65%] shadow-[0_0_12px_rgba(199,70,52,0.3)] transition-all" />
                        </div>
                      </div>

                      <div className="bg-white border border-stone-200 p-10 rounded-[3rem] shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 bg-stone-50 text-stone-400 rounded-xl flex items-center justify-center mb-6"><TrendingUp size={20}/></div>
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Collection Efficiency</span>
                            <p className="text-3xl font-black text-stone-900 mt-4 leading-none">
                                {Math.round((transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0) / 
                                 transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0)) * 100) || 0}%
                            </p>
                        </div>
                        <div className="mt-8 w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full w-[88%] shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all" />
                        </div>
                      </div>

                      <div className="bg-white border border-stone-200 p-10 rounded-[3rem] shadow-sm flex flex-col justify-between bg-gradient-to-br from-stone-50 to-transparent">
                        <div>
                            <div className="w-10 h-10 bg-stone-50 text-stone-400 rounded-xl flex items-center justify-center mb-6"><Calendar size={20}/></div>
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Next Quarter Forecast</span>
                            <p className="text-3xl font-black text-stone-900 mt-4 leading-none">USD 1.25M</p>
                        </div>
                        <p className="text-[10px] text-brand-600 font-black uppercase mt-8 tracking-widest">Based on projected enrollment</p>
                      </div>
                  </div>
               </div>

               {/* Cashflow Forecasting Chart */}
               <div className="bg-white p-12 rounded-[3.5rem] border border-stone-200 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-16 relative z-10">
                    <div>
                        <h3 className="text-2xl font-light text-stone-900 tracking-tight mb-2">Institutional <span className="font-bold">Cashflow Forecast</span></h3>
                        <p className="text-stone-400 font-medium">Predictive modeling for operational liquidity over the next 6 months</p>
                    </div>
                    <div className="flex gap-8 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-brand-500" />
                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Actualized</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-stone-300" />
                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Oracle Forecast</span>
                        </div>
                    </div>
                  </div>
                  <div className="h-80 relative z-10 px-4">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={[
                             { name: 'Jan', actual: 450000, forecast: 450000 },
                             { name: 'Feb', actual: 480000, forecast: 480000 },
                             { name: 'Mar', actual: 520000, forecast: 550000 },
                             { name: 'Apr', actual: null, forecast: 620000 },
                             { name: 'May', actual: null, forecast: 580000 },
                             { name: 'Jun', actual: null, forecast: 750000 },
                         ]}>
                            <defs>
                                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#C74634" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#C74634" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#78716c'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#78716c'}} />
                            <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                            <Area type="monotone" dataKey="actual" stroke="#C74634" strokeWidth={4} fill="url(#colorCash)" />
                            <Area type="monotone" dataKey="forecast" stroke="#78716c" strokeWidth={2} strokeDasharray="8 8" fill="transparent" />
                         </AreaChart>
                      </ResponsiveContainer>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="h-80">
                     <h3 className="font-black text-[10px] text-stone-400 uppercase tracking-widest mb-10 text-center">Revenue Architecture by Category</h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Tuition Fees', value: transactions.filter(t => (t.category as string) === 'TUITION' && t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0) },
                                    { name: 'Registration', value: transactions.filter(t => (t.category as string) === 'REGISTRATION' && t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0) },
                                    { name: 'Miscellaneous', value: transactions.filter(t => !['TUITION', 'REGISTRATION'].includes(t.category as string) && t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0) },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={8}
                                dataKey="value"
                            >
                                {['#0c0a09', '#C74634', '#78716c'].map((color, index) => (
                                    <Cell key={`cell-${index}`} fill={color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
                            <Legend wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em'}} />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>

                  <div className="h-80">
                    <h3 className="font-black text-[10px] text-stone-400 uppercase tracking-widest mb-10 text-center">Live Fiscal Stream (Last 10 Events)</h3>
                    <div className="space-y-4 overflow-auto max-h-64 no-scrollbar pr-2">
                        {transactions.slice(-10).reverse().map(t => (
                            <div key={t.id} className="flex justify-between items-center bg-stone-50 p-4 rounded-2xl border border-stone-100 group hover:border-brand-100 transition-all">
                                <div>
                                    <p className="font-bold text-stone-800 text-sm group-hover:text-brand-600 transition-colors">{t.description}</p>
                                    <p className="text-[10px] text-stone-300 font-mono uppercase tracking-tighter mt-1">{t.date} • {t.category}</p>
                                </div>
                                <div className={cn("font-black text-sm", t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600')}>
                                    {t.type === 'CREDIT' ? '+' : '-'}{t.amount.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
               </div>
            </div>
          )}

            </div>
          </SecurePrintWrapper>
        </div>
      </div>
    </div>
  );
};

export default Reports;