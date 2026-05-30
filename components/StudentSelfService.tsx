
import React from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, Calendar, CreditCard, User, FileText, 
  Search, MapPin, GraduationCap, Clock, Bell, 
  AlertCircle, ChevronRight, ExternalLink, Info, CheckCircle2,
  Wallet
} from 'lucide-react';
import { Student, Transaction, UserRole } from '../types';
import { getStudentById, getSystemSettings } from '../services/storageService';
import { calculateBalance, getTransactions, calculateWalletBalance, getFinancialAlerts, FinancialAlert } from '../services/financeService';
import { getStudentSchedule } from '../services/scheduleService';
import { cn } from '../lib/utils';
import TaskManager from './TaskManager';
import { Language } from '../services/i18nService';

interface StudentSelfServiceProps {
  studentId: string;
  setActiveTab: (tab: string) => void;
  language: Language;
}

const StudentSelfService: React.FC<StudentSelfServiceProps> = ({ studentId, setActiveTab, language }) => {
  const [viewMode, setViewMode] = React.useState<'classic' | 'fluid'>('fluid');
  const student = getStudentById(studentId);
  const settings = getSystemSettings();
  
  if (!student) return null;

  const balance = calculateBalance(studentId);
  const walletBalance = calculateWalletBalance(studentId);
  const financialAlerts = getFinancialAlerts(studentId);
  const enrolledCourseIds = student.enrollments?.filter(e => e.semester === settings.currentSemester).map(e => e.courseId) || [];
  const schedule = getStudentSchedule(studentId, enrolledCourseIds);

  if (viewMode === 'fluid') {
    return (
      <div className={cn("space-y-12", language === 'ar' ? 'text-right' : 'text-left')} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {language === 'ar' ? 'بوابة الخدمات الذاتية' : 'Self-Service Portal'}
              </h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                {language === 'ar' ? 'اختر خدمة للمتابعة' : 'Select a service to continue'}
              </p>
           </div>
           <button 
              onClick={() => setViewMode('classic')}
              className="bg-white border border-slate-200 px-6 py-2 rounded-2xl text-[10px] font-black text-slate-500 shadow-sm hover:shadow-md hover:border-indigo-200 hover:text-indigo-600 transition-all"
           >
             {language === 'ar' ? 'عرض السجل الكامل' : 'Full Record (Classic View)'}
           </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
           <FluidTile 
              icon={User} 
              label={language === 'ar' ? "الملف الشخصي" : "Profile"} 
              sub={language === 'ar' ? "بياناتي" : "My Data"} 
              color="bg-indigo-600" 
              onClick={() => setViewMode('classic')} 
           />
           <FluidTile 
              icon={BookOpen} 
              label={language === 'ar' ? "السجل الأكاديمي" : "Academic Records"}
              sub={language === 'ar' ? "الدرجات والنتائج" : "Academic Info"} 
              color="bg-emerald-600" 
              onClick={() => setActiveTab('academics')} 
           />
           <FluidTile 
              icon={Calendar} 
              label={language === 'ar' ? "إدارة الحصص" : "Manage Classes"}
              sub={language === 'ar' ? "الجداول والتسجيل" : "Registration"} 
              color="bg-indigo-700" 
              onClick={() => setActiveTab('schedule')} 
           />
           <FluidTile 
              icon={CreditCard} 
              label={language === 'ar' ? "الحساب المالي" : "Financial Account"}
              sub={language === 'ar' ? "المدفوعات والرسوم" : "Bursar & Finance"} 
              color="bg-rose-600" 
              onClick={() => setActiveTab('financials')} 
           />
           <FluidTile 
              icon={Wallet} 
              label={language === 'ar' ? "المحفظة" : "E-Wallet"}
              sub={language === 'ar' ? "الرصيد الإلكتروني" : "Direct Pay"} 
              color="bg-slate-900" 
              onClick={() => setActiveTab('wallet')} 
           />
           <FluidTile 
              icon={CheckCircle2} 
              label={language === 'ar' ? "المهام" : "Tasks"}
              sub={language === 'ar' ? "المطلوب مني" : "Action Items"} 
              color="bg-amber-500" 
              onClick={() => setActiveTab('communications')} 
           />
           <FluidTile 
              icon={FileText} 
              label={language === 'ar' ? "كشف الدرجات" : "Transcript"}
              sub={language === 'ar' ? "الكشف الرسمي" : "Official Copy"} 
              color="bg-purple-600" 
              onClick={() => setActiveTab('transcript')} 
           />
           <FluidTile 
              icon={ExternalLink} 
              label={language === 'ar' ? "الطلبات" : "Requests"}
              sub={language === 'ar' ? "خدمات الطلاب" : "Admin Requests"} 
              color="bg-slate-700" 
            />
            <FluidTile 
               icon={GraduationCap} 
               label={language === 'ar' ? "تدقيق التخرج" : "Graduation Audit"}
               sub={language === 'ar' ? "جاهزية التخرج" : "Readiness Check"} 
               color="bg-red-800" 
               onClick={() => setActiveTab('graduation_requirements')} 
            />
         </div>

        {/* Dynamic Context Bar */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-[0.03] rotate-12">
               <GraduationCap size={160} />
           </div>
           
           <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-100 uppercase">
                 {student.name.charAt(0)}
              </div>
              <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                 <p className="text-xl font-black text-slate-900 tracking-tight">{student.name}</p>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{student.program}</p>
              </div>
           </div>

           <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 relative z-10", language === 'ar' ? 'text-right' : 'text-left')}>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'المعدل' : 'CGPA'}</p>
                 <p className="text-lg font-black text-indigo-600">%{student.gpa}</p>
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'المحفظة' : 'Wallet'}</p>
                 <p className="text-lg font-black text-slate-900">{walletBalance} {language === 'ar' ? 'د.ل' : 'LYD'}</p>
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'المستحق' : 'Due'}</p>
                 <p className="text-lg font-black text-rose-600">{balance} {language === 'ar' ? 'د.ل' : 'LYD'}</p>
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'الوضع' : 'Status'}</p>
                 <p className="text-lg font-black text-emerald-600">{student.status}</p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col lg:flex-row gap-8 p-8 bg-slate-50 min-h-screen", language === 'ar' ? 'text-right' : 'text-left')} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Left Column: Main Content */}
      <div className="flex-1 space-y-6">
        <header className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div className={language === 'ar' ? 'text-right' : 'text-left'}>
            <h1 className="text-2xl font-bold text-slate-800">
               {language === 'ar' ? 'مركز خدمات الطالب (Student Center)' : 'Student Center'}
            </h1>
            <p className="text-slate-500 text-sm">{student.name} | {student.id}</p>
          </div>
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => setViewMode('fluid')}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
            >
              {language === 'ar' ? 'التبديل لعرض الأيقونات (Fluid UI)' : 'Switch to Fluid UI'}
            </button>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
                {settings.currentSemester} {settings.academicYear}
              </div>
              <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">
                {student.program}
              </div>
            </div>
          </div>
        </header>
        
        {/* Financial Alerts Sector */}
        {financialAlerts.length > 0 && (
           <div className="space-y-3">
              {financialAlerts.map(alert => (
                 <div 
                   key={alert.id}
                   className={cn(
                      "p-4 rounded-xl border flex items-center gap-4 animate-in slide-in-from-top-2 duration-500",
                      alert.type === 'CRITICAL' ? "bg-rose-50 border-rose-100 text-rose-900" :
                      alert.type === 'WARNING' ? "bg-amber-50 border-amber-100 text-amber-900" :
                      "bg-blue-50 border-blue-100 text-blue-900"
                   )}
                 >
                    <div className={cn(
                       "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                       alert.type === 'CRITICAL' ? "bg-rose-100 text-rose-600" :
                       alert.type === 'WARNING' ? "bg-amber-100 text-amber-600" :
                       "bg-blue-100 text-blue-600"
                    )}>
                       {alert.type === 'CRITICAL' ? <AlertCircle size={18} /> : <Info size={18} />}
                    </div>
                    <div className={cn(language === 'ar' ? 'text-right' : 'text-left', "flex-1")}>
                       <p className="text-xs font-black tracking-tight">{alert.message}</p>
                       <p className="text-[9px] opacity-50 font-bold uppercase mt-0.5">
                         {language === 'ar' ? 'تنبيه مالي عاجل' : 'Urgent Financial Alert'}
                       </p>
                    </div>
                    <button 
                        onClick={() => setActiveTab('financials')}
                        className="text-[10px] font-black text-blue-600 hover:underline"
                    >
                        {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                    </button>
                 </div>
              ))}
           </div>
        )}

        {/* Academics Section - PeopleSoft Style Folder/Bucket */}
        <section className="bg-white rounded-xl border-t-4 border-t-blue-800 border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-tight flex items-center gap-2">
              <BookOpen size={18} className="text-blue-800" /> {language === 'ar' ? 'الأكاديميات (Academics)' : 'Academics'}
            </h2>
            <div className="flex gap-4">
               <button onClick={() => setActiveTab('academics')} className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1">
                 {language === 'ar' ? 'سجل الدرجات' : 'Grade Record'} <ChevronRight size={14} className={cn(language === 'en' && 'rotate-180')} />
               </button>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <h3 className="text-xs font-bold text-slate-500 border-b border-slate-100 pb-2">
                 {language === 'ar' ? 'الجدول الدراسي للحالي' : 'Current Schedule'}
               </h3>
               <div className="space-y-2">
                  {schedule.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                       <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{item.courseName}</span>
                          <span className="text-[10px] text-slate-500">{item.day} | {item.startTime} - {item.endTime}</span>
                       </div>
                       <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold text-slate-600">{item.room}</span>
                    </div>
                  ))}
                  {schedule.length === 0 && <p className="text-xs text-slate-400 italic">{language === 'ar' ? 'لا يوجد جدول مسجل حالياً' : 'No schedule registered currently'}</p>}
                  <button onClick={() => setActiveTab('schedule')} className="w-full text-center py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg">
                    {language === 'ar' ? 'عرض الجدول الكامل ...' : 'View Full Schedule ...'}
                  </button>
               </div>
            </div>
            <div className="space-y-4">
               <h3 className="text-xs font-bold text-slate-500 border-b border-slate-100 pb-2">
                 {language === 'ar' ? 'درجات حديثة (Recent Grades)' : 'Recent Grades'}
               </h3>
               <div className="space-y-3">
                  {[
                    { course: language === 'ar' ? 'هندسة البرمجيات' : 'Software Engineering', score: '92', type: language === 'ar' ? 'منتصف' : 'Midterm' },
                    { course: language === 'ar' ? 'نظم المعلومات' : 'Information Systems', score: '88', type: language === 'ar' ? 'مشروع' : 'Project' },
                    { course: language === 'ar' ? 'قواعد البيانات' : 'Databases', score: '95', type: language === 'ar' ? 'اختبار 2' : 'Quiz 2' },
                  ].map((grade, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <div>
                          <p className="text-xs font-bold text-slate-800">{grade.course}</p>
                          <p className="text-[10px] text-slate-500">{grade.type}</p>
                       </div>
                       <span className="text-sm font-black text-blue-700">{grade.score}%</span>
                    </div>
                  ))}
                  <button onClick={() => setActiveTab('academics')} className="w-full text-center py-2 text-xs font-bold text-slate-400 hover:text-slate-600">
                    {language === 'ar' ? 'عرض كافة النتائج ...' : 'View All Results ...'}
                  </button>
               </div>
            </div>
          </div>
        </section>

        {/* Finances Section */}
        <section className="bg-white rounded-xl border-t-4 border-t-emerald-700 border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-tight flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-700" /> {language === 'ar' ? 'المالية (Finances)' : 'Finances'}
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 border-b border-slate-100 pb-2">
                {language === 'ar' ? 'حسابي (My Account)' : 'My Account'}
              </h3>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                 <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                    <p className="text-[10px] font-black text-emerald-800 uppercase">
                      {language === 'ar' ? 'الرصيد المستحق (Outstanding Balance)' : 'Outstanding Balance'}
                    </p>
                    <p className="text-2xl font-black text-emerald-900">{balance.toLocaleString()} {language === 'ar' ? 'د.ل' : 'LYD'}</p>
                 </div>
                 <button onClick={() => setActiveTab('financials')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-black shadow-lg shadow-emerald-200">
                   {language === 'ar' ? 'سداد الرسوم' : 'Pay Fees'}
                 </button>
              </div>
            </div>
            <div className="space-y-4">
               <h3 className="text-xs font-bold text-slate-500 border-b border-slate-100 pb-2">{language === 'ar' ? 'روابط أخرى' : 'Other Links'}</h3>
               <div className="grid grid-cols-1 gap-2">
                  <QuickLink icon={FileText} label={language === 'ar' ? "تاريخ المعاملات (Account Inquiry)" : "Account Inquiry"} onClick={() => setActiveTab('financials')} language={language} />
                  <QuickLink icon={CreditCard} label={language === 'ar' ? "طرق الدفع المفعلة" : "Activated Payment Methods"} onClick={() => setActiveTab('financials')} language={language} />
               </div>
            </div>
          </div>
        </section>

        {/* Personal Information */}
        <section className="bg-white rounded-xl border-t-4 border-t-slate-600 border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-tight flex items-center gap-2">
              <User size={18} className="text-slate-600" /> {language === 'ar' ? 'المعلومات الشخصية (Personal Information)' : 'Personal Information'}
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
             <InfoBucket label={language === 'ar' ? "بيانات الاتصال" : "Contact Info"} value={student.phone || '---'} sub={language === 'ar' ? "رقم الهاتف" : "Phone Number"} language={language} />
             <InfoBucket label={language === 'ar' ? "البريد الجامعي" : "University Email"} value={student.email || '---'} sub={student.id} language={language} />
             <InfoBucket label={language === 'ar' ? "العنوان الدائم" : "Permanent Address"} value={language === 'ar' ? "ليبيا - طرابلس" : "Libya - Tripoli"} sub={language === 'ar' ? "المنطقة التعليمية" : "Academic Zone"} language={language} />
          </div>
        </section>

        {/* Quick Links Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
           {[
             { icon: Search, label: language === 'ar' ? "البحث" : "Search", sub: "Search Classes", tab: "registration" },
             { icon: Calendar, label: language === 'ar' ? "التسجيل" : "Enrollment", sub: "Enrollment", tab: "registration" },
             { icon: GraduationCap, label: language === 'ar' ? "المخطط" : "Planner", sub: "Academic Planner", tab: "academics" },
             { icon: FileText, label: language === 'ar' ? "كشف الدرجات" : "Transcript", sub: "Transcript", tab: "transcript" },
             { icon: GraduationCap, label: language === 'ar' ? "تدقيق التخرج" : "Graduation Audit", sub: "Graduation Portfolio", tab: "graduation_requirements" },
           ].map((link, idx) => (
             <button 
                key={idx}
                onClick={() => setActiveTab(link.tab)}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all group"
             >
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                   <link.icon size={20} />
                </div>
                <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                   <p className="text-xs font-black text-slate-800">{link.label}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase">{link.sub}</p>
                </div>
             </button>
           ))}
        </div>
      </div>

      {/* Right Column: Sidebar (Holds, To Do, Dates) */}
      <div className="w-80 space-y-6">
        {/* Holds */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-rose-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
             <AlertCircle size={16} className="text-rose-600" />
             <h3 className="text-xs font-black text-rose-900 uppercase tracking-widest">{language === 'ar' ? 'إيقافات (Holds)' : 'Holds'}</h3>
          </div>
          <div className="p-4 space-y-3">
             {balance > 1000 ? (
               <div className={cn("p-3 bg-red-50 border border-red-100 rounded-lg", language === 'ar' ? 'text-right' : 'text-left')}>
                  <p className="text-xs font-bold text-red-800">{language === 'ar' ? 'إيقاف مالي (Financial Hold)' : 'Financial Hold'}</p>
                  <p className="text-[10px] text-red-600 mt-1">{language === 'ar' ? 'تجاوز سقف الديون المسموح به. يرجى مراجعة الخزينة.' : 'Debt ceiling exceeded. Please check with bursar.'}</p>
               </div>
             ) : student.warningsCount >= 2 ? (
               <div className={cn("p-3 bg-amber-50 border border-amber-100 rounded-lg", language === 'ar' ? 'text-right' : 'text-left')}>
                  <p className="text-xs font-bold text-amber-800">{language === 'ar' ? 'إنذار أكاديمي (Academic Warning)' : 'Academic Warning'}</p>
                  <p className="text-[10px] text-amber-600 mt-1">{language === 'ar' ? 'المعدل التراكمي منخفض. يرجى مراجعة المرشد.' : 'GPA is low. Please see advisor.'}</p>
               </div>
             ) : (
               <p className="text-xs text-slate-400 font-bold text-center py-4">{language === 'ar' ? 'لا توجد إيقافات حالياً' : 'No holds currently'}</p>
             )}
          </div>
        </div>

        {/* To Do List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
             <CheckCircle2 size={16} className="text-slate-600" />
             <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'ar' ? 'قائمة المهام (To Do List)' : 'To Do List'}</h3>
          </div>
          <div className="p-4">
             <TaskManager compact={true} language={language} />
          </div>
        </div>

        {/* Enrollment Dates */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
             <Calendar size={16} className="text-slate-600" />
             <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'ar' ? 'مواعيد التسجيل' : 'Enrollment Dates'}</h3>
          </div>
          <div className="p-4 space-y-4">
             <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'بدأ التسجيل (Starts)' : 'Enrollment Starts'}</p>
                <p className="text-xs font-bold text-slate-700">{language === 'ar' ? '10 مايو 2024' : 'May 10, 2024'}</p>
             </div>
             <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'نهاية التسجيل (Deadline)' : 'Enrollment Deadline'}</p>
                <p className="text-xs font-bold text-slate-700">{settings.registrationDeadline}</p>
             </div>
          </div>
        </div>

        {/* Advisor */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
             <Info size={16} className="text-slate-600" />
             <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'ar' ? 'المستشار الأكاديمي' : 'Academic Advisor'}</h3>
          </div>
          <div className="p-4 flex items-center gap-3">
             <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                <User size={20} />
             </div>
             <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                <p className="text-sm font-bold text-slate-800">{language === 'ar' ? 'د. مصطفى الشيباني' : 'Dr. Mustafa Al-Shaibani'}</p>
                <p className="text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'كلية تقنية المعلومات' : 'Faculty of IT'}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuickLink = ({ icon: Icon, label, onClick, language }: any) => (
  <button 
    onClick={onClick}
    className={cn("flex items-center gap-3 text-sm text-blue-700 hover:text-blue-900 transition-colors py-1 group", language === 'ar' ? 'flex-row-reverse' : 'flex-row')}
  >
    <div className="w-5 h-5 flex items-center justify-center">
      <Icon size={14} className="group-hover:scale-110 transition-transform" />
    </div>
    <span className="font-bold underline-offset-4 hover:underline">{label}</span>
  </button>
);

const FluidTile = ({ icon: Icon, label, sub, color, onClick, badge }: any) => (
  <motion.button
    whileHover={{ y: -5, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-4 group transition-all hover:shadow-xl hover:shadow-slate-200 relative overflow-hidden"
  >
    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-6", color)}>
       <Icon size={32} />
    </div>
    <div className="text-center">
       <p className="text-sm font-black text-slate-800">{label}</p>
       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub}</p>
    </div>
    {badge && (
      <div className="absolute top-4 right-4 bg-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
        {badge}
      </div>
    )}
  </motion.button>
);

const InfoBucket = ({ label, value, sub, language }: any) => (
  <div className={cn("p-4 bg-white border border-slate-100 rounded-xl", language === 'ar' ? 'text-right' : 'text-left')}>
    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</p>
    <p className="text-sm font-black text-slate-800">{value}</p>
    <p className="text-[10px] font-bold text-slate-400 mt-1">{sub}</p>
  </div>
);

const TodoItem = ({ label, status }: any) => (
  <div className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg transition-colors group cursor-pointer">
    <span className="text-xs font-bold text-slate-700 group-hover:text-blue-800">{label}</span>
    <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-blue-500">{status}</span>
  </div>
);

export default StudentSelfService;
