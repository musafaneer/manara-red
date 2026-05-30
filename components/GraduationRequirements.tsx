import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, BookOpen, Award, CheckCircle2, AlertTriangle, 
  HelpCircle, Settings, Edit2, Users, Save, X, Search, 
  Layers, CheckCheck, RefreshCw, Sparkles, ShieldCheck
} from 'lucide-react';
import { getAcademicPrograms, getStudents, getCourses, saveStudent } from '../services/storageService';
import { getGraduationRequirements, saveGraduationRequirement, calculateStudentEligibility, GraduationRequirement, EligibilityChecklist } from '../services/graduationService';
import { Student, ProgramType, AcademicProgram, StudentStatus, UserRole } from '../types';
import { getCurrentUser } from '../services/authService';
import { logAction } from '../services/auditService';
import { notifySuccess, notifyError } from '../services/notificationService';
import { cn } from '../lib/utils';
import StudentDetails from './StudentDetails';
import { Language } from '../services/i18nService';

interface GraduationRequirementsProps {
  language: Language;
}

const GraduationRequirements: React.FC<GraduationRequirementsProps> = ({ language }) => {
  const [activeTab, setActiveTab2] = useState<'rules' | 'tracker'>('rules');
  const [programs, setPrograms] = useState<AcademicProgram[]>([]);
  const [requirements, setRequirements] = useState<GraduationRequirement[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  
  // Search and filter inside tracker
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [eligibilityFilter, setEligibilityFilter] = useState('ALL'); // ALL, ELIGIBLE, INELIGIBLE

  // Editing state for rules
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<GraduationRequirement | null>(null);

  // Student drill-down inspection
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Load datasets
  const loadData = () => {
    setPrograms(getAcademicPrograms());
    setRequirements(getGraduationRequirements());
    setStudents(getStudents());
    setCourses(getCourses());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate stats for each program rule
  const getProgramStats = (programId: string, programType: ProgramType, deptId: string) => {
    const programStudents = students.filter(s => {
      // Best-effort match by department or program Type
      if (programType === ProgramType.POSTGRADUATE) {
        return s.program === ProgramType.POSTGRADUATE && s.departmentId === deptId;
      } else {
        return s.program === ProgramType.UNDERGRADUATE && s.departmentId === deptId;
      }
    });

    let eligibleCount = 0;
    programStudents.forEach(s => {
      const elCheck = calculateStudentEligibility(s);
      if (elCheck.isEligible) eligibleCount++;
    });

    return {
      totalEnrolled: programStudents.length,
      eligibleGraduates: eligibleCount,
      ineligibleCount: programStudents.length - eligibleCount
    };
  };

  // Handle Edit button click
  const handleStartEdit = (req: GraduationRequirement) => {
    setEditingReqId(req.programId);
    setEditForm({ ...req });
  };

  // Handle save of requirements rule
  const handleSaveRequirements = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    saveGraduationRequirement(editForm);
    
    // Log audit events
    const prog = programs.find(p => p.id === editForm.programId);
    const details = `تحديث معايير تخرج برنامج ${prog?.name || editForm.programId}: الساعات المطلوبة = ${editForm.totalCreditsRequired}، معدل التخرج = ${editForm.minGpaRequired}%`;
    logAction('GRADUATION_RULE_UPDATE', details, 'info', 'Academic officer');

    notifySuccess(language === 'ar' ? 'تم حفظ معايير التخرج الجديدة بنجاح' : 'Graduation standards updated successfully');
    setEditingReqId(null);
    setEditForm(null);
    loadData(); // Reload state
  };

  // Perform bulk action to graduate all eligible student records
  const handleBulkGraduate = () => {
    let graduateCount = 0;
    const updatedStudents = students.map(s => {
      if (s.status === StudentStatus.GRADUATED) return s;

      const eligibility = calculateStudentEligibility(s);
      if (eligibility.isEligible) {
        graduateCount++;
        // Promote student
        const updated: Student = {
          ...s,
          status: StudentStatus.GRADUATED,
          clearance: {
            currentStage: 'COMPLETED',
            completedStages: ['LIBRARY', 'FINANCE', 'LABS', 'DEPARTMENT', 'REGISTRAR'],
            isFullyCleared: true,
            clearedAt: new Date().toISOString().split('T')[0]
          }
        };
        saveStudent(updated);
        
        logAction('STUDENT_GRADUATION', `ترقية الطالب الآلي ${s.name} إلى خريج معتمد`, 'info', 'Auto System Trigger');
        return updated;
      }
      return s;
    });

    if (graduateCount > 0) {
      notifySuccess(language === 'ar' ? `تم اعتماد تخرج ${graduateCount} طالب بنجاح ونقلهم لسجل الخريجين` : `Successfully graduated ${graduateCount} eligible students!`);
      loadData();
    } else {
      notifyError(language === 'ar' ? 'لا يوجد طلاب غير مخرجين مستوفين حالياً للشروط بالكامل' : 'No pending eligible students met all required constraints.');
    }
  };

  // Filter students for tracker
  const eligibleStudentsList = students.map(s => {
    const check = calculateStudentEligibility(s);
    return { student: s, check };
  }).filter(({ student, check }) => {
    // Search filter
    const matchSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        student.nationalId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Program filter
    const matchProgram = programFilter === 'ALL' || student.departmentId === programFilter;

    // Eligibility filter
    const matchEligibility = eligibilityFilter === 'ALL' || 
                        (eligibilityFilter === 'ELIGIBLE' && check.isEligible) ||
                        (eligibilityFilter === 'INELIGIBLE' && !check.isEligible);
                        
    return matchSearch && matchProgram && matchEligibility;
  });

  const currentUser = getCurrentUser();
  const isStudent = currentUser && (currentUser.effectiveRole || currentUser.role) === UserRole.STUDENT;
  const currentStudent = isStudent ? students.find(s => s.id === (currentUser.student_id || currentUser.id)) : null;
  const studentCheck = currentStudent ? calculateStudentEligibility(currentStudent) : null;

  if (isStudent) {
    if (!currentStudent || !studentCheck) {
      return (
        <div className="p-8 text-center text-slate-500 font-bold" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          {language === 'ar' ? 'جاري تحميل ملف التخرج الشخصي للغرض الفوري...' : 'Loading personalized graduation portfolio...'}
        </div>
      );
    }

    return (
      <div className="p-8 space-y-8 max-w-5xl mx-auto text-slate-800" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {/* Header Banner */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-[0_4px_30px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-2 h-full bg-[#C74634]" />
          <div className="flex items-center gap-5">
            <div className="p-4 bg-red-50 text-[#C74634] rounded-2xl border border-red-100/50">
              <GraduationCap size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {language === 'ar' ? 'استعلام جاهزية التخرج الذاتي' : 'My Graduation Readiness Portfolio'}
              </h1>
              <p className="text-slate-500 font-medium text-xs mt-1">
                {language === 'ar' ? 'تدقيق آلي فوري واستحقاق الساعات والوحدات العلمية وفق اللائحة 501' : 'Instant automated auditing of credits & program requirements under Regulation 501'}
              </p>
            </div>
          </div>
          <button 
            onClick={loadData}
            className="p-3 bg-slate-50 border border-slate-200/85 rounded-xl text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center self-center"
            title={language === 'ar' ? 'تحديث السجل' : 'Refresh record'}
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Hero Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Progress Circular Gauge */}
          <div className="col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
              {language === 'ar' ? 'جاهزية التخرج الكلية' : 'Overall Graduation Readiness'}
            </p>
            <div className="relative w-36 h-36 flex items-center justify-center mb-4">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="62" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                <circle 
                  cx="72" 
                  cy="72" 
                  r="62" 
                  stroke={currentStudent.status === StudentStatus.GRADUATED ? '#059669' : studentCheck.isEligible ? '#4f46e5' : '#f59e0b'} 
                  strokeWidth="12" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 62}
                  strokeDashoffset={2 * Math.PI * 62 * (1 - (currentStudent.status === StudentStatus.GRADUATED ? 100 : studentCheck.eligibilityPercentage) / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black text-slate-900 leading-none">
                  {currentStudent.status === StudentStatus.GRADUATED ? '100' : studentCheck.eligibilityPercentage}%
                </span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  {language === 'ar' ? 'اكتمال' : 'Complete'}
                </span>
              </div>
            </div>
            <p className="text-xs font-black text-slate-705">{studentCheck.programName}</p>
            <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-wider">{currentStudent.id}</span>
          </div>

          {/* Status Details / Warnings Panel */}
          <div className="col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {language === 'ar' ? 'حالة التخرج الأكاديمي' : 'Academic Graduation Status'}
              </h4>
              
              {currentStudent.status === StudentStatus.GRADUATED ? (
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800 flex items-start gap-4">
                  <ShieldCheck size={28} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-extrabold text-sm text-emerald-955">
                      {language === 'ar' ? 'تهانينا! لقد تم اعتماد تخرجك رسمياً' : 'Congratulations! Your graduation is officially approved'}
                    </h5>
                    <p className="text-xs font-bold leading-relaxed mt-1 text-emerald-900">
                      {language === 'ar' ? 'تمت مراجعة كل السجلات والوثائق بنجاح. ملفك الأكاديمي معتمد دون نواقص.' : 'All requirements have been reviewed and approved. Your degree certificate has been generated.'}
                    </p>
                  </div>
                </div>
              ) : studentCheck.isEligible ? (
                <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-800 flex items-start gap-4">
                  <CheckCircle2 size={28} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-extrabold text-sm text-indigo-950">
                      {language === 'ar' ? 'مستحق للتخرج - بانتظار الاعتماد النهائي' : 'Graduation Ready - Awaiting Registrar Sign-off'}
                    </h5>
                    <p className="text-xs font-bold leading-relaxed mt-1 text-indigo-900">
                      {language === 'ar' ? 'لقد انتهيت من كود الساعات والمعدل ومناقشة الأطروحة/المشروع بنجاح! يتم الآن توجيه المعاملة إلكترونياً لاعتمادات المسجل العام.' : 'You have completed all credit requirements, GPA checks, and thesis milestones successfully. Your file is awaiting final administrative registration.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100/60 text-amber-805 flex items-start gap-4">
                  <AlertTriangle size={28} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-extrabold text-sm text-amber-955">
                      {language === 'ar' ? 'غير مكتمل (تبقت بعض المتطلبات)' : 'Incomplete Requirements (Pending Milestones)'}
                    </h5>
                    <p className="text-xs font-bold leading-relaxed mt-1 text-amber-900">
                      {language === 'ar' ? 'لم تكتمل جميع شروط التخرج بعد. يرجى الاطلاع على التفاصيل أدناه لإنهاء النواقص بالتعاون مع مرشدك الأكاديمي.' : 'You still have pending requirements before qualifying for graduation. Please examine the checkpoints list below.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
              <span>
                {language === 'ar' ? `إنذارات أكاديمية: ${studentCheck.warningsCount}` : `Academic Warnings: ${studentCheck.warningsCount}`}
              </span>
              <span>
                {language === 'ar' ? `المعدل العام للملف: ${currentStudent.gpa}%` : `Cumulative GPA: ${currentStudent.gpa}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Checkpoints Checklist */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm space-y-6">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-4 border-b border-slate-100">
            {language === 'ar' ? 'تفاصيل معايير المظاهرة والتدقيق' : 'Graduation Compliance Checkpoints'}
          </h4>
          
          <div className="space-y-6">
            {/* Credits Checkpoint */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-slate-50/50 rounded-2xl transition-colors border border-slate-100 gap-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl border",
                  studentCheck.creditsStatus ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {studentCheck.creditsStatus ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div>
                  <h5 className="font-black text-sm text-slate-800">
                    {language === 'ar' ? 'الساعات والوحدات المعتمدة المنجزة' : 'Academic Credits Completed'}
                  </h5>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">
                    {language === 'ar' 
                      ? `الحد الأدنى للبرنامج: ${studentCheck.creditsRequired} ساعة | منجز: ${studentCheck.creditsEarned} ساعة`
                      : `Required: ${studentCheck.creditsRequired} credits | Completed: ${studentCheck.creditsEarned} credits`
                    }
                  </p>
                </div>
              </div>
              <div className="text-left font-black text-xs">
                {studentCheck.creditsStatus ? (
                  <span className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                    {language === 'ar' ? 'مستوفي ✓' : 'Satisfied ✓'}
                  </span>
                ) : (
                  <span className="text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                    {language === 'ar' ? `متبقي ${studentCheck.creditsRequired - studentCheck.creditsEarned} ساعات` : `${studentCheck.creditsRequired - studentCheck.creditsEarned} credits remaining`}
                  </span>
                )}
              </div>
            </div>

            {/* GPA Checkpoint */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-slate-50/50 rounded-2xl transition-colors border border-slate-100 gap-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl border",
                  studentCheck.gpaStatus ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {studentCheck.gpaStatus ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div>
                  <h5 className="font-black text-sm text-slate-800">
                    {language === 'ar' ? 'معدل النجاح والتخرج الضابط (GPA)' : 'Cumulative GPA Threshold'}
                  </h5>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">
                    {language === 'ar'
                      ? `المستهدف للتخرج: ${studentCheck.minGpaRequired}% | معدلك التراكمي: ${studentCheck.gpa}%`
                      : `Min GPA required: ${studentCheck.minGpaRequired}% | Current GPA: ${studentCheck.gpa}%`
                    }
                  </p>
                </div>
              </div>
              <div className="text-left font-black text-xs">
                {studentCheck.gpaStatus ? (
                  <span className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                    {language === 'ar' ? 'معدل مقبول للتخرج ✓' : 'Sufficient GPA ✓'}
                  </span>
                ) : (
                  <span className="text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                    {language === 'ar' ? 'تحت طائلة الإنذار الأكاديمي' : 'Insufficient GPA'}
                  </span>
                )}
              </div>
            </div>

            {/* Project or Thesis Checkpoint */}
            {studentCheck.projectOrThesisRequired && (
              <div className="flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-slate-50/50 rounded-2xl transition-colors border border-slate-100 gap-4">
                <div className="flex items-center gap-4 border-slate-200">
                  <div className={cn(
                    "p-3 rounded-xl border",
                    studentCheck.projectOrThesisPassed ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                  )}>
                    {studentCheck.projectOrThesisPassed ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  </div>
                  <div>
                    <h5 className="font-black text-sm text-slate-800">
                      {language === 'ar' ? 'مشروع التخرج / المقترح العملي / الأطروحة العلمية' : 'Graduation Project / Thesis'}
                    </h5>
                    <p className="text-xs font-medium text-slate-400 mt-1 max-w-xl leading-relaxed">
                      {language === 'ar' ? studentCheck.projectOrThesisDetailsAr : studentCheck.projectOrThesisDetailsEn}
                    </p>
                  </div>
                </div>
                <div className="text-left font-black text-xs">
                  {studentCheck.projectOrThesisPassed ? (
                    <span className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                      {language === 'ar' ? 'ناجح ومستوفي ✓' : 'Accepted/Passed ✓'}
                    </span>
                  ) : (
                    <span className="text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                      {language === 'ar' ? 'غير مسجل أو لم تسند درجته بعد' : 'Unregistered or Incomplete'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Publications Checkpoint for Postgraduates */}
            {currentStudent.program === ProgramType.POSTGRADUATE && (
              <div className="flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-slate-50/50 rounded-2xl transition-colors border border-slate-100 gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-xl border",
                    studentCheck.publicationsStatus ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                  )}>
                    {studentCheck.publicationsStatus ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  </div>
                  <div>
                    <h5 className="font-black text-sm text-slate-800">
                      {language === 'ar' ? 'الإنتاج العلمي والنشر (الأبحاث)' : 'Scientific Publications / Papers'}
                    </h5>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">
                      {language === 'ar'
                        ? `المطلوب: ${studentCheck.publicationsRequired} أوراق علمية معتمدة | منجز: ${studentCheck.publicationsCount}`
                        : `Required: ${studentCheck.publicationsRequired} published paper(s) | Current count: ${studentCheck.publicationsCount}`
                      }
                    </p>
                  </div>
                </div>
                <div className="text-left font-black text-xs">
                  {studentCheck.publicationsStatus ? (
                    <span className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                      {language === 'ar' ? 'مستوفي ✓' : 'Satisfied ✓'}
                    </span>
                  ) : (
                    <span className="text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                      {language === 'ar' ? 'غير مسجل' : 'Missing Publication(s)'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Clearance road map */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-slate-50/50 rounded-2xl transition-colors border border-slate-100 gap-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl border",
                  studentCheck.clearanceCompleted ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {studentCheck.clearanceCompleted ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div>
                  <h5 className="font-black text-sm text-slate-800">
                    {language === 'ar' ? 'براءة الذمة الشاملة من دورة التخرج' : 'Institutional Graduation Clearance'}
                  </h5>
                  <p className="text-xs font-medium text-slate-400 mt-1 max-w-xl leading-relaxed">
                    {language === 'ar'
                      ? `الحالة: ${studentCheck.clearanceCompleted ? 'نظيفة ومستوفاة' : 'يرجى مراجعة الخزينة والمكتبة لإنهاء شروط براءة الذمة التلقائية'}`
                      : `Status: ${studentCheck.clearanceCompleted ? 'Cleared from all library/financial debts.' : 'You have active holds or financial/library obligations.'}`
                    }
                  </p>
                </div>
              </div>
              <div className="text-left font-black text-xs">
                {studentCheck.clearanceCompleted ? (
                  <span className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                    {language === 'ar' ? 'مستوفاة ✓' : 'Fully Cleared ✓'}
                  </span>
                ) : (
                  <span className="text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                    {language === 'ar' ? 'موقوف إدارياً' : 'Hold / Blocked'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Grades detail layout contributing to credit calculation */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="bg-slate-50/80 px-8 py-5 border-b border-stone-100 flex justify-between items-center">
             <h3 className="font-black text-slate-800 tracking-tight">
               {language === 'ar' ? 'المقررات الأكاديمية والنتائج التفصيلية' : 'Course Ledger & Grading Breakdown'}
             </h3>
             <span className="bg-indigo-100 text-indigo-800 text-[10px] font-mono px-2.5 py-1 rounded-full font-black uppercase tracking-wider font-bold">
               {currentStudent.grades.length} {language === 'ar' ? 'مقررات مسجلة' : 'courses total'}
             </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs font-semibold">
              <thead className="bg-[#fafafa] text-[10px] font-black text-slate-400 border-b border-stone-100 uppercase tracking-widest">
                <tr>
                  <th className="py-4 px-6">{language === 'ar' ? 'المقرر الدراسي' : 'Academic Course'}</th>
                  <th className="py-4 px-6 text-center">{language === 'ar' ? 'رمز المقرر' : 'Course Code'}</th>
                  <th className="py-4 px-6 text-center">{language === 'ar' ? 'الساعات المكتسبة' : 'Credit Hours'}</th>
                  <th className="py-4 px-6 text-center">{language === 'ar' ? 'الدرجة والنسبة' : 'Weighted Score'}</th>
                  <th className="py-4 px-6 text-center">{language === 'ar' ? 'الموقف من الاعتماد' : 'Inclusion / Validity'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentStudent.grades.map((grade, idx) => {
                  const passingScore = currentStudent.program === ProgramType.POSTGRADUATE ? 65 : 50;
                  const targetCourse = courses.find((c: any) => c.id === grade.courseId || c.code === grade.courseCode);
                  const courseCredits = targetCourse ? targetCourse.credits : 3;
                  const isPassed = grade.score >= passingScore && !grade.isWithdrawn && (!grade.isIncomplete || grade.incompleteResolved);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900">{grade.courseName}</td>
                      <td className="py-4 px-6 text-center font-mono font-bold text-slate-500">{grade.courseCode || '--'}</td>
                      <td className="py-4 px-6 text-center text-slate-700">{courseCredits} {language === 'ar' ? 'ساعات' : 'credits'}</td>
                      <td className="py-4 px-6 text-center font-black text-slate-800 font-mono text-sm">{grade.score}%</td>
                      <td className="py-4 px-6 text-center">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1",
                          grade.isWithdrawn 
                            ? "bg-rose-50 text-rose-700 border border-rose-100" 
                            : grade.isIncomplete && !grade.incompleteResolved 
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : isPassed 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                : "bg-rose-50 text-rose-700 border border-rose-100"
                        )}>
                          {grade.isWithdrawn 
                            ? (language === 'ar' ? 'منسحب' : 'WITHDRAWN') 
                            : grade.isIncomplete && !grade.incompleteResolved 
                              ? (language === 'ar' ? 'غير مكتمل' : 'INCOMPLETE')
                              : isPassed 
                                ? (language === 'ar' ? 'محتسب بالتخرج ✓' : 'EARNED ✓') 
                                : (language === 'ar' ? 'راسب / غير مستوفي' : 'FAILED')
                          }
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-slate-800" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-[0_4px_30px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-2 h-full bg-[#C74634]" />
        <div className="flex items-center gap-5">
          <div className="p-4 bg-red-50 text-[#C74634] rounded-2xl border border-red-100/50">
            <GraduationCap size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {language === 'ar' ? 'إدارة شروط ومعايير التخرج' : 'Graduation Requirements Manager'}
            </h1>
            <p className="text-slate-500 font-medium text-xs mt-1">
              {language === 'ar' ? 'تحديد شروط الوحدات ومشاريع التخرج والإنتاج العلمي للأقسام' : 'Define credit policies, GPAs, theses, and research parameters by program'}
            </p>
          </div>
        </div>

        {/* Global Stats or Bulk Operations */}
        <div className="flex gap-3">
          <button 
            onClick={loadData}
            className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center"
            title={language === 'ar' ? 'تحديث البيانات' : 'Sync data'}
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={handleBulkGraduate}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-3 transition-transform hover:scale-105 hover:bg-emerald-700 shadow-md"
          >
            <CheckCheck size={16} />
            <span>{language === 'ar' ? 'اعتماد التخرج الجماعي للمستوفين' : 'Bulk Approve Eligible Graduates'}</span>
          </button>
        </div>
      </div>

      {/* Navigation and tab layout */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab2('rules')}
          className={cn(
            "px-6 py-3 text-sm font-black transition-all flex items-center gap-3 relative mr-4",
            activeTab === 'rules' ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-400 hover:text-slate-800"
          )}
        >
          <Settings size={16} />
          <span>{language === 'ar' ? 'معايير البرامج الأكاديمية' : 'Program Directives'}</span>
        </button>
        <button
          onClick={() => setActiveTab2('tracker')}
          className={cn(
            "px-6 py-3 text-sm font-black transition-all flex items-center gap-3 relative",
            activeTab === 'tracker' ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-400 hover:text-slate-800"
          )}
        >
          <Award size={16} />
          <span>{language === 'ar' ? 'متتبع فوري للاستحقاق' : 'Real-Time Eligibility Auditor'}</span>
          <span className="bg-amber-100 text-amber-850 px-2 py-0.5 rounded-full text-[10px] font-black border border-amber-200">
            {students.filter(s => s.status !== StudentStatus.GRADUATED && calculateStudentEligibility(s).isEligible).length}
          </span>
        </button>
      </div>

      {/* Tab 1: Rules Configuration */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map(program => {
            const reqRule = requirements.find(r => r.programId === program.id) || {
              programId: program.id,
              totalCreditsRequired: program.type === ProgramType.POSTGRADUATE ? 12 : 18,
              minGpaRequired: program.type === ProgramType.POSTGRADUATE ? 65.0 : 50.0,
              projectOrThesisRequired: true,
              minPublicationsRequired: program.type === ProgramType.POSTGRADUATE ? 1 : 0,
              mandatoryCourseCodes: program.type === ProgramType.POSTGRADUATE ? [] : ['CS499']
            };

            const stats = getProgramStats(program.id, program.type, program.deptId);
            const isEditingItem = editingReqId === program.id;

            return (
              <motion.div 
                layout
                key={program.id}
                className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* Header branding */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border",
                    program.type === ProgramType.POSTGRADUATE 
                      ? "bg-purple-50 text-purple-700 border-purple-100" 
                      : "bg-blue-50 text-blue-700 border-blue-100"
                  )}>
                    {program.type === ProgramType.POSTGRADUATE 
                      ? (language === 'ar' ? 'دراسات عليا' : 'Postgraduate') 
                      : (language === 'ar' ? 'جامعي / بكالوريوس' : 'Undergraduate')}
                  </span>
                  <h3 className="font-black text-slate-900 mt-2 text-md leading-snug">
                    {program.name}
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-wider">{program.id}</p>
                </div>

                {isEditingItem ? (
                  <form onSubmit={handleSaveRequirements} className="p-6 space-y-4 flex-1">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {language === 'ar' ? 'الساعات المعتمدة المطلوبة' : 'Total Credits Required'}
                      </label>
                      <input 
                        type="number" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                        value={editForm?.totalCreditsRequired || 0}
                        onChange={e => setEditForm(prev => prev ? { ...prev, totalCreditsRequired: Number(e.target.value) } : null)}
                        min={1} required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {language === 'ar' ? 'الحد الأدنى للمعدل التراكمي' : 'Minimum Cumulative GPA %'}
                      </label>
                      <input 
                        type="number" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                        value={editForm?.minGpaRequired || 0}
                        onChange={e => setEditForm(prev => prev ? { ...prev, minGpaRequired: Number(e.target.value) } : null)}
                        min={0} max={100} required
                      />
                    </div>

                    {program.type === ProgramType.POSTGRADUATE && (
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          {language === 'ar' ? 'النشر البحثي المطلوب (الأوراق العلمية)' : 'Minimum Scientific Publications Required'}
                        </label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                          value={editForm?.minPublicationsRequired || 0}
                          onChange={e => setEditForm(prev => prev ? { ...prev, minPublicationsRequired: Number(e.target.value) } : null)}
                          min={0}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-bold text-slate-700">
                        {language === 'ar' ? 'مشروع تخرج / أطروحة إلزامية' : 'Thesis or Project Required'}
                      </span>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                        checked={editForm?.projectOrThesisRequired || false}
                        onChange={e => setEditForm(prev => prev ? { ...prev, projectOrThesisRequired: e.target.checked } : null)}
                      />
                    </div>

                    {editForm?.projectOrThesisRequired && (
                      <div className="pt-2 animate-in fade-in duration-300">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          {language === 'ar' ? 'أكواد المقررات المعتمدة للمشروع (مفصولة بفواصل)' : 'Mandatory Project Course Codes (comma separated)'}
                        </label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold font-mono"
                          placeholder="e.g. CS499, SE499"
                          value={editForm?.mandatoryCourseCodes?.join(', ') || ''}
                          onChange={e => {
                            const codes = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                            setEditForm(prev => prev ? { ...prev, mandatoryCourseCodes: codes } : null);
                          }}
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                      <button 
                        type="submit"
                        className="flex-1 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md"
                      >
                        <Save size={14} />
                        <span>{language === 'ar' ? 'حفظ' : 'Save'}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingReqId(null)}
                        className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200"
                      >
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                    {/* Constraints Summary */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400">{language === 'ar' ? 'الساعات المطلوبة' : 'Credits Required'}</span>
                        <span className="font-black text-slate-800">{reqRule.totalCreditsRequired} hrs</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400">{language === 'ar' ? 'الحد الأدنى للمعدل' : 'Min GPA Standard'}</span>
                        <span className="font-black text-rose-600">{reqRule.minGpaRequired}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400">{language === 'ar' ? 'المشروع / الأطروحة' : 'Project / Thesis'}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-black",
                          reqRule.projectOrThesisRequired ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-500"
                        )}>
                          {reqRule.projectOrThesisRequired ? (language === 'ar' ? 'إلزامي' : 'Mandatory') : (language === 'ar' ? 'غير مطلوب' : 'Optional')}
                        </span>
                      </div>
                      {reqRule.projectOrThesisRequired && reqRule.mandatoryCourseCodes && reqRule.mandatoryCourseCodes.length > 0 && (
                        <div className="flex justify-between items-center text-xs pl-2 bg-slate-50/50 p-2 rounded-lg">
                          <span className="font-semibold text-[10px] text-slate-400">{language === 'ar' ? 'الأكواد المعتمدة' : 'Approved Codes'}</span>
                          <span className="font-mono text-[10px] text-slate-600 font-bold">{reqRule.mandatoryCourseCodes.join(', ')}</span>
                        </div>
                      )}
                      {program.type === ProgramType.POSTGRADUATE && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">{language === 'ar' ? 'الأوراق العلمية المطلوبة' : 'Publications Required'}</span>
                          <span className="font-black text-purple-700">{reqRule.minPublicationsRequired} docs</span>
                        </div>
                      )}
                    </div>

                    {/* Funnel of Students */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 mt-4">
                      <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-400">
                        <span>{language === 'ar' ? 'الإحصاءات الحالية للطلاب' : 'Aggregates'}</span>
                        <Users size={12} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <p className="text-[10px] text-slate-400">{language === 'ar' ? 'إجمالي المقيدين' : 'Registered'}</p>
                          <p className="text-xl font-black text-slate-850">{stats.totalEnrolled}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-emerald-600">{language === 'ar' ? 'مؤهل للتخرج' : 'Eligible'}</p>
                          <p className="text-xl font-black text-emerald-600 flex items-center gap-1.5">
                            {stats.eligibleGraduates}
                            {stats.eligibleGraduates > 0 && <Sparkles size={14} className="text-amber-400 animate-pulse" />}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-4">
                      <button 
                        onClick={() => handleStartEdit(reqRule)}
                        className="w-full py-2.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all rounded-xl text-xs font-black flex items-center justify-center gap-2"
                      >
                        <Edit2 size={12} />
                        <span>{language === 'ar' ? 'تعديل المعايير الضابطة' : 'Configure Parameters'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Graduation Tracker Checklist */}
      {activeTab === 'tracker' && (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden p-6 space-y-6">
          {/* Auditing Fields & Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {/* Search inputs */}
            <div className="relative">
              <Search className="absolute right-3.5 top-3 text-slate-400" size={16} />
              <input 
                type="text" 
                className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder={language === 'ar' ? 'ابحث باسم الطالب، رقم القيد...' : 'Search Name or University ID...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Program selection */}
            <div>
              <select 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                value={programFilter}
                onChange={e => setProgramFilter(e.target.value)}
              >
                <option value="ALL">{language === 'ar' ? 'كل المقترحات / التخصصات' : 'All Departments'}</option>
                <option value="DEPT-01">Computer Science</option>
                <option value="DEPT-02">Software Engineering</option>
                <option value="DEPT-03">Artificial Intelligence</option>
                <option value="DEPT-08">Accounting</option>
              </select>
            </div>

            {/* Eligibility classification */}
            <div>
              <select 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                value={eligibilityFilter}
                onChange={e => setEligibilityFilter(e.target.value)}
              >
                <option value="ALL">{language === 'ar' ? 'حالة التخرج (الكل)' : 'Status (All)'}</option>
                <option value="ELIGIBLE">{language === 'ar' ? 'المستوفون فقط (جاهز للتخرج)' : 'Eligible Only'}</option>
                <option value="INELIGIBLE">{language === 'ar' ? 'غير المستوفين (نواقص)' : 'Ineligible'}</option>
              </select>
            </div>

            {/* Quick overview metric info */}
            <div className="flex items-center justify-end text-xs font-black text-slate-500 pr-2">
              <span>{language === 'ar' ? `المطابق للفلترة: ${eligibleStudentsList.length} سجل` : `Yield: ${eligibleStudentsList.length} students`}</span>
            </div>
          </div>

          {/* Table list of checklist evaluations */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" role="table">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-right text-[10px] font-black uppercase tracking-widest bg-slate-50/50">
                  <th className="py-4 px-6">{language === 'ar' ? 'الطالب ورقم القيد' : 'Student & ID'}</th>
                  <th className="py-4 px-6">{language === 'ar' ? 'البرنامج / التخصص' : 'Academic Program'}</th>
                  <th className="py-4 px-6 text-center">{language === 'ar' ? 'الساعات المعتمدة' : 'Credits Done'}</th>
                  <th className="py-4 px-6 text-center">{language === 'ar' ? 'المعدل التراكمي' : 'CGPA'}</th>
                  <th className="py-4 px-6 text-center">{language === 'ar' ? 'المشروع / الأطروحة' : 'Project/Thesis'}</th>
                  <th className="py-4 px-6 text-center">{language === 'ar' ? 'حالة الاستحقاق' : 'Eligibility Status'}</th>
                  <th className="py-4 px-6 text-center">{language === 'ar' ? 'الإجراءات الأكاديمية' : 'Audit Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 font-semibold text-xs">
                {eligibleStudentsList.length > 0 ? (
                  eligibleStudentsList.map(({ student, check }) => (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-black",
                            student.status === StudentStatus.GRADUATED 
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                              : check.isEligible 
                                ? "bg-amber-50 text-amber-600 border border-amber-100"
                                : "bg-slate-150 text-slate-500"
                          )}>
                            <span>{student.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{student.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5 leading-none">{student.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-slate-800 font-medium leading-none">{check.programName}</p>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{student.program}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <p className="font-extrabold text-slate-850">
                          {check.creditsEarned} / {check.creditsRequired}
                        </p>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded",
                          check.creditsStatus ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                        )}>
                          {check.creditsStatus ? (language === 'ar' ? 'مستوفي' : 'MET') : (language === 'ar' ? 'ناقص' : 'MISSING')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <p className="font-extrabold text-slate-850">{student.gpa}%</p>
                        <span className={cn(
                          "text-[9px] font-black uppercase",
                          check.gpaStatus ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {check.gpaStatus ? (language === 'ar' ? 'مستوفي' : 'GPA OK') : (language === 'ar' ? 'تنبيه' : 'PROBATION')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <p className="font-bold text-slate-800 truncate max-w-[120px]" title={check.projectOrThesisName || '-'}>
                          {check.projectOrThesisName ? check.projectOrThesisName : '-'}
                        </p>
                        <span className={cn(
                          "text-[9px] font-black px-1.5 py-0.5 rounded uppercase",
                          check.projectOrThesisPassed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        )}>
                          {check.projectOrThesisPassed ? (language === 'ar' ? 'تم المناقشة والقبول' : 'COMPLETED') : (language === 'ar' ? 'غير منجز' : 'PENDING')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center">
                          {student.status === StudentStatus.GRADUATED ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-[10px] font-black">
                              <ShieldCheck size={12} />
                              {language === 'ar' ? 'خريج معتمد' : 'GRADUATED'}
                            </span>
                          ) : check.isEligible ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-full text-[10px] font-black animate-pulse">
                              <CheckCircle2 size={12} className="text-[#C74634]" />
                              {language === 'ar' ? 'مستحق للتخرج' : 'GRADUATION READY'}
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full text-[10px] font-black">
                                <AlertTriangle size={10} />
                                {language === 'ar' ? 'غير مكتمل' : 'INCOMPLETE'}
                              </span>
                              <div className="w-20 bg-stone-100 rounded-full h-1 overflow-hidden mx-auto">
                                <div className="bg-amber-400 h-full" style={{ width: `${check.eligibilityPercentage}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setSelectedStudent(student)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 transition-all text-slate-700 font-bold rounded-lg text-[11px]"
                          >
                            {language === 'ar' ? 'كشف تفصيلي' : 'Audit Dossier'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      {language === 'ar' ? 'لا يوجد نتائج تطابق معايير وتصنيف البحث الحالية' : 'No students found matching filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Double check student inspector modal overlay */}
      {selectedStudent && (
        <StudentDetails 
          student={selectedStudent} 
          onClose={() => { setSelectedStudent(null); loadData(); }} 
          onUpdate={() => { loadData(); }}
        />
      )}
    </div>
  );
};

export default GraduationRequirements;
