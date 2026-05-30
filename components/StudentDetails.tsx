
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Student, StudentStatus, ProgramType, Course, Permission, VerificationStatus, Grade, UserRole, Transaction } from '../types';
import { 
  X, AlertTriangle, CheckCircle2, ShieldAlert, Book, Info, Plus, 
  Edit2, Medal, FileText, FileUp, Clock, Sparkles,
  BarChart3, Mail, Phone, MapPin, DollarSign,
  TrendingUp as TrendingUpIcon, Calendar, User, Zap, Download,
  CheckCheck, Fingerprint, ClipboardCheck, ShieldCheck, XCircle, GraduationCap, Wallet, BadgeCheck, ExternalLink, History as HistoryIcon,
  ChevronRight, ArrowLeft, Target, School, Printer, MessageSquare, Microscope, Share2, Activity
} from 'lucide-react';
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
    ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { getCourses, getSystemSettings, getDepartmentName, saveStudent, getDepartments, getAcademicPrograms } from '../services/storageService';
import { calculateStudentEligibility } from '../services/graduationService';
import { calculateWeightedGPA, evaluateAcademicStatus } from '../services/gradingService';
import { calculateWalletBalance, getTransactions, getStudentTransactions } from '../services/financeService'; 
import { getStudentAttendanceStats } from '../services/facultyService';
import { logAction } from '../services/auditService';
import { notifySuccess, notifyError } from '../services/notificationService';
import { getCurrentUser, hasPermission } from '../services/authService';
import { cn } from '../lib/utils';
import Modal from './ui/Modal';
import SecurePrintWrapper from './ui/SecurePrintWrapper';
import { createPortal } from 'react-dom';
import { getVerificationUrl, getQrCodeUrl } from '../services/securityService';

interface StudentDetailsProps {
  student: Student;
  onClose: () => void;
  onUpdate?: (student: Student) => void;
}

const StudentDetails: React.FC<StudentDetailsProps> = ({ student, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'grades' | 'financials' | 'docs' | 'transcript' | 'research' | 'timeline' | 'notes' | 'graduation' | 'actions'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingGrade, setIsAddingGrade] = useState(false);
  const [editingGradeIndex, setEditingGradeIndex] = useState<number | null>(null);
  const [showAfada, setShowAfada] = useState(false);
  const [showPrintTranscript, setShowPrintTranscript] = useState(false);
  const [documentHash, setDocumentHash] = useState<string>('');

  const settings = getSystemSettings();
  const availableCourses = getCourses();
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (showAfada || showPrintTranscript) {
        import('../services/securityService').then(service => {
            service.generateDocumentHash(student, 'TRANSCRIPT').then(setDocumentHash);
        });
    }
  }, [showAfada, showPrintTranscript, student]);
  const walletBalance = calculateWalletBalance(student.id);
  const attendanceStats = getStudentAttendanceStats(student.id);

  const [editForm, setEditForm] = useState<Partial<Student>>({ ...student });
  const [newGradeForm, setNewGradeForm] = useState({
    courseId: '', score: 0, midtermScore: 0, finalScore: 0, semester: settings.currentSemester,
    isIncomplete: false, incompleteResolved: false, 
    incompleteReasonAr: 'غياب مبرر عن الامتحان الموحد', incompleteReasonEn: 'Excused Absence from Final Exam',
    incompleteDeadline: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0]
  });

  const canEdit = hasPermission(getCurrentUser(), Permission.STUDENTS_EDIT);
  const canEditGrades = hasPermission(getCurrentUser(), Permission.GRADES_EDIT);

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = { ...student, ...editForm } as Student;
    saveStudent(updated);
    logAction('STUDENT_EDIT', `تعديل بيانات الطالب: ${student.name}`, 'info', currentUser?.name);
    notifySuccess('تم تحديث البيانات');
    setIsEditing(false);
    onUpdate?.(updated);
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const course = availableCourses.find(c => c.id === newGradeForm.courseId);
    if (!course) return;
    
    const newGrade: Grade = { ...newGradeForm, courseName: course.name, courseCode: course.code, totalScore: newGradeForm.score };
    let updatedGrades;
    let oldScore = 0;
    const isEdit = editingGradeIndex !== null;
    
    if (isEdit) {
      oldScore = student.grades[editingGradeIndex!].score;
      updatedGrades = [...student.grades];
      updatedGrades[editingGradeIndex!] = newGrade;
    } else {
      updatedGrades = [...student.grades, newGrade];
    }
    
    const newGpa = calculateWeightedGPA(updatedGrades, availableCourses);
    const { status: newStatus, warningsCount: newWarnings } = evaluateAcademicStatus(newGpa, student.program, student.status, student.warningsCount);
    
    const updated: Student = { ...student, grades: updatedGrades, gpa: newGpa, status: newStatus, warningsCount: newWarnings };
    saveStudent(updated);
    
    // Audit Logging
    const actionDetails = newGrade.isIncomplete && !newGrade.incompleteResolved
      ? `رصد مقرر غير مكتمل (IC) للطالب ${student.name} في مادة ${course.name} لسبب: ${newGrade.incompleteReasonAr || ''} حتى تاريخ ${newGrade.incompleteDeadline || ''}`
      : isEdit
        ? `تعديل درجة الطالب ${student.name} في مادة ${course.name}: من ${oldScore} إلى ${newGrade.score}`
        : `إضافة درجة جديدة للطالب ${student.name} في مادة ${course.name}: بنتيجة ${newGrade.score}`;
    
    logAction('GRADE_CHANGE', actionDetails, 'info', currentUser?.name);
    
    notifySuccess(newGrade.isIncomplete && !newGrade.incompleteResolved 
      ? 'تم رصد المقرر كغير مكتمل (IC)' 
      : isEdit ? 'تم تحديث الدرجة' : 'تمت إضافة الدرجة'
    );
    setIsAddingGrade(false);
    setEditingGradeIndex(null);
    onUpdate?.(updated);
  };

  const departments = getDepartments();
  const programs = getAcademicPrograms();

  const handleUpdateStatus = (newStatus: VerificationStatus) => {
    const updated: Student = { ...student, verificationStatus: newStatus };
    saveStudent(updated);
    notifySuccess('تم تحديث حالة التدقيق');
    onUpdate?.(updated);
  };

  const passingScore = student.program === ProgramType.POSTGRADUATE ? (settings.regulation.passingScore + 15) : settings.regulation.passingScore; 
  const totalRequired = student.program === ProgramType.POSTGRADUATE ? 24 : 120;
  const completed = student.grades.filter(g => g.score >= passingScore).reduce((acc, g) => acc + (availableCourses.find(ac => ac.id === g.courseId)?.credits || 0), 0);
  const progressPercent = Math.min(Math.round((completed / totalRequired) * 100), 100);

  const radarData = [
    { subject: 'التقني', A: student.gpa },
    { subject: 'النظري', A: student.gpa + 5 },
    { subject: 'العملي', A: student.gpa - 5 },
    { subject: 'الإبداع', A: student.gpa },
    { subject: 'الالتزام', A: 90 }
  ];

  const getInsight = () => {
    if (student.gpa >= 85) return { title: "مسار النخبة الأكاديمية", text: "يظهر الطالب تميزاً استثنائياً. يُنصح بالبرامج البحثية.", color: "text-emerald-600 bg-emerald-50", icon: Sparkles };
    if (student.warningsCount > 0) return { title: "خطة التدخل الأكاديمي", text: "توجد تعثرات. يُنصح بمراجعة المرشد الأكاديمي فوراً.", color: "text-rose-600 bg-rose-50", icon: ShieldAlert };
    return { title: "النمو المتوازن", text: "أداء الطالب مستقر. التركيز على المشاريع العملية سيحسن النتائج.", color: "text-blue-600 bg-blue-50", icon: Info };
  };
  const insight = getInsight();

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      hideHeader
      maxWidth="6xl"
      className={cn((showAfada || showPrintTranscript) && "no-print print:hidden")}
    >
      <div className={cn("flex h-[85vh] -m-10 overflow-hidden bg-white", (showAfada || showPrintTranscript) && "no-print print:hidden")}>
        {/* Sidebar - Precision Control */}
        <div className="w-24 bg-slate-50 flex flex-col items-center py-10 gap-8 shrink-0 border-r border-slate-200/60">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] mb-4 relative overflow-hidden group">
            <GraduationCap size={28} className="relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          <div className="flex flex-col gap-8 flex-1">
            {[
              { id: 'info', icon: ShieldCheck, label: 'identity' },
              { id: 'grades', icon: Target, label: 'performance' },
              { id: 'transcript', icon: FileText, label: 'records' },
              { id: 'research', icon: Microscope, label: 'research' },
              { id: 'graduation', icon: BadgeCheck, label: 'eligibility' },
              { id: 'actions', icon: ShieldAlert, label: 'requests' },
              { id: 'timeline', icon: HistoryIcon, label: 'timeline' },
              { id: 'notes', icon: MessageSquare, label: 'mentors' },
              { id: 'financials', icon: Wallet, label: 'ledger' },
              { id: 'docs', icon: FileUp, label: 'vault' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex flex-col items-center gap-2 group transition-all relative px-2",
                  activeTab === tab.id ? "text-indigo-600" : "text-slate-400 hover:text-slate-800"
                )}
              >
                <div className={cn(
                  "p-3.5 rounded-2xl transition-all duration-500",
                  activeTab === tab.id ? "bg-indigo-50 hover:bg-indigo-100 shadow-sm text-indigo-600" : "group-hover:bg-slate-200/50"
                )}>
                  <tab.icon size={22} className={cn("transition-transform duration-500", activeTab === tab.id && "scale-110")} />
                </div>
                <span className="text-[7px] font-black uppercase tracking-[0.2em] leading-none opacity-50 group-hover:opacity-100 transition-opacity">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div layoutId="active-pill-details" className="absolute -left-1 w-1 h-6 bg-indigo-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          <button onClick={onClose} className="p-4 text-slate-400 hover:text-rose-600 transition-all hover:bg-rose-50 rounded-2xl border border-transparent hover:border-rose-100/50">
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* Main Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#fafafa]">
          {/* Elite Identity Header */}
          <div className="bg-white px-16 py-10 border-b border-stone-100 flex justify-between items-center shrink-0 relative overflow-hidden">
            {/* Background scanner track */}
            <div className="absolute left-0 top-0 w-2 h-full bg-slate-900 opacity-[0.02]" />
            
            <div className="flex items-center gap-10 relative z-10">
               <div className="relative group">
                   <div className="w-24 h-24 bg-stone-100 rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-stone-300 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] border border-stone-200 overflow-hidden">
                      <span className="group-hover:scale-110 transition-transform duration-700">{student.name.charAt(0)}</span>
                      {/* Biometric-style scan line */}
                      <div className="absolute inset-0 bg-indigo-500/10 h-1/2 -top-1/2 group-hover:top-full transition-all duration-[2000ms] ease-linear" />
                   </div>
               </div>
               
               <div>
                  <div className="flex items-center gap-3 mb-2">
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="text-4xl font-black text-stone-900 tracking-tight leading-none italic uppercase bg-slate-50 border-b-2 border-indigo-500 outline-none px-4 py-2 rounded-t-xl"
                      />
                    ) : (
                      <h2 className="text-4xl font-black text-stone-900 tracking-tight leading-none italic uppercase">{student.name}</h2>
                    )}
                    <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm">{student.program} / {student.graduateLevel || 'UG'}</div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-[11px] font-black text-stone-400 font-mono tracking-wider">
                    <span className="flex items-center gap-2 group cursor-pointer hover:text-indigo-600 transition-colors">
                      <Fingerprint size={16} className="text-stone-300 group-hover:text-indigo-400" /> 
                      REF: <span className="text-stone-600">{student.id}</span>
                    </span>
                    <div className="w-1 h-1 bg-stone-200 rounded-full" />
                    <span className="flex items-center gap-2">
                       <School size={16} className="text-stone-300" />
                       {getDepartmentName(student.departmentId)}
                    </span>
                    <div className="w-1 h-1 bg-stone-200 rounded-full" />
                    {canEdit && (
                        <button 
                            onClick={() => {
                                if (!isEditing) setEditForm({ ...student });
                                setIsEditing(!isEditing);
                            }}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1 rounded-full border transition-all",
                                isEditing ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                            )}
                        >
                            <Edit2 size={12} />
                            {isEditing ? 'إلغاء التعديل' : 'تعديل الملف'}
                        </button>
                    )}
                    {!isEditing && (
                        <span className="flex items-center gap-2 bg-stone-50 px-3 py-1 rounded-full border border-stone-100">
                             <ShieldCheck size={14} className="text-emerald-500" />
                             SYSTEM_VERIFIED_IDENTITY
                        </span>
                    )}
                  </div>
               </div>
            </div>
            
            <div className="flex items-center gap-12 relative z-10">
               <div className="text-right flex flex-col items-end">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2 opacity-60">Cumulative GPA Score</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-black text-slate-900 tracking-[-0.04em] font-mono leading-none">{student.gpa.toFixed(1)}</p>
                    <span className="text-xl font-black text-stone-300">%</span>
                  </div>
               </div>
               
               <div className="w-[1px] h-16 bg-stone-200 opacity-50" />
               
               <div className="text-right flex flex-col items-end">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2 opacity-60">Institutional Status</p>
                  <div className={cn(
                    "px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-[0.1em] border shadow-sm transition-all hover:scale-105 cursor-default",
                    student.status === StudentStatus.ACTIVE ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                  )}>
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full animate-pulse", student.status === StudentStatus.ACTIVE ? "bg-emerald-500" : "bg-amber-500")} />
                        {student.status}
                    </div>
                  </div>
               </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-16 bg-[#fafafa] no-scrollbar">
          {activeTab === 'info' && (
            <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Quick Stats Bento */}
              <div className="grid grid-cols-4 gap-6">
                <StatCard label="المعدل التراكمي" value={`%${student.gpa.toFixed(1)}`} icon={TrendingUpIcon} color="blue" />
                <StatCard label="الإنجاز الأكاديمي" value={`%${progressPercent}`} icon={Target} color="indigo" />
                <StatCard label="حالة القيد" value={student.status} icon={CheckCircle2} color="emerald" />
                <StatCard label="رصيد المحفظة" value={`${walletBalance.toLocaleString()}`} icon={Wallet} color="emerald" />
              </div>

              <div className="grid grid-cols-12 gap-10">
                <div className="col-span-8 space-y-10">
                  {/* Verification Section */}
                  <div className="bg-[#0c0c0c] rounded-[3.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                    <ShieldCheck size={180} className="absolute -right-12 -bottom-12 opacity-10" />
                    
                    <div className="relative z-10 space-y-8">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                              <Fingerprint className="text-indigo-400" size={24} />
                           </div>
                           <div>
                              <h3 className="text-2xl font-black tracking-tight italic uppercase">Dossier Validation</h3>
                              <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Authentication & Access Control</p>
                           </div>
                        </div>
                        <span className={cn(
                          "px-6 py-2 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border backdrop-blur-md",
                          student.verificationStatus === VerificationStatus.VERIFIED ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                          student.verificationStatus === VerificationStatus.REJECTED ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        )}>{student.verificationStatus || 'PENDING'}</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-6">
                        <StatusBtn label="APPROVE" icon={ShieldCheck} color="emerald" onClick={() => handleUpdateStatus(VerificationStatus.VERIFIED)} />
                        <StatusBtn label="HOLD" icon={Clock} color="amber" onClick={() => handleUpdateStatus(VerificationStatus.PENDING)} />
                        <StatusBtn label="RESTRICT" icon={XCircle} color="rose" onClick={() => handleUpdateStatus(VerificationStatus.REJECTED)} />
                      </div>
                    </div>
                  </div>

                  {/* AI Insight */}
                  <div className={cn("p-10 rounded-[3.5rem] border border-transparent shadow-xl relative overflow-hidden group", insight.color)}>
                    <div className="absolute -right-8 -top-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                        <insight.icon size={160} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-white/50 backdrop-blur-md rounded-2xl border border-white shadow-sm">
                              <insight.icon size={28} className="opacity-80" /> 
                           </div>
                           <h4 className="text-2xl font-black tracking-tight">{insight.title}</h4>
                        </div>
                        <p className="text-lg font-bold opacity-70 leading-relaxed max-w-2xl">{insight.text}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-10">
                        <button className="px-10 py-4 bg-white/80 hover:bg-white backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all active:scale-95">Executive Analysis</button>
                        <button 
                          onClick={() => setShowAfada(true)}
                          className="px-8 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-3"
                        >
                          <ShieldCheck size={16} className="text-emerald-400" />
                          Generate Secured Enrollment Certificate
                        </button>
                        <button 
                          onClick={() => setShowPrintTranscript(true)}
                          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-3"
                        >
                          <Printer size={16} className="text-indigo-200" />
                          Print Official Transcript
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-12 rounded-[4rem] border border-stone-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] space-y-12 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-stone-50 rounded-bl-[4rem] opacity-40" />
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-black text-stone-900 flex items-center gap-5 italic uppercase">
                        <div className="p-3.5 bg-stone-900 text-white rounded-[1.25rem] shadow-lg"><Info size={24} /></div> Core Entity Profile
                        </h3>
                        {isEditing && (
                            <button 
                                onClick={handleUpdateStudent}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all"
                            >
                                حفظ كافة التعديلات
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-16 gap-y-12">
                      <EditableField 
                        label="Identity Index / National ID" 
                        value={isEditing ? editForm.nationalId : student.nationalId} 
                        isEditing={isEditing}
                        onChange={(val: string) => setEditForm({...editForm, nationalId: val})}
                        mono 
                      />
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em]">Program Classification</p>
                        {isEditing ? (
                            <select 
                                value={editForm.program}
                                onChange={(e) => setEditForm({...editForm, program: e.target.value as ProgramType})}
                                className="w-full bg-slate-50 border-b-2 border-indigo-500 px-2 py-1 font-black text-lg outline-none rounded-t-lg"
                            >
                                {Object.values(ProgramType).map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-lg font-black opacity-80">{`${student.program} ${student.graduateLevel ? `- ${student.graduateLevel}` : ''}`}</p>
                        )}
                        <div className="w-8 h-1 bg-stone-100 rounded-full" />
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em]">Academic Department</p>
                        {isEditing ? (
                            <select 
                                value={editForm.departmentId}
                                onChange={(e) => setEditForm({...editForm, departmentId: e.target.value})}
                                className="w-full bg-slate-50 border-b-2 border-indigo-500 px-2 py-1 font-black text-lg outline-none rounded-t-lg"
                            >
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-lg font-black opacity-80">{getDepartmentName(student.departmentId)}</p>
                        )}
                        <div className="w-8 h-1 bg-stone-100 rounded-full" />
                      </div>

                      <DataField label="Academic Weight (GPA)" value={`${student.gpa.toFixed(2)}%`} bold />
                      <DataField label="Disciplinary Record" value={student.warningsCount === 0 ? "CLEAR" : `${student.warningsCount} WARNINGS ACTIVE`} color={student.warningsCount > 0 ? "text-rose-600" : "text-emerald-500"} bold />
                      <DataField label="Secure Communication Channel" value={student.email || 'PENDING_REGISTRATION'} mono />
                      <DataField label="Telecommunication Node" value={student.phone || 'UNREGISTERED'} mono />
                      <DataField label="Geographical Domicile" value="TRIPOLI, LIBYA - SYSTEM_DOMAIN" />
                      <EditableField 
                        label="Enrollment Reference / Year" 
                        value={isEditing ? editForm.enrollmentYear?.toString() : student.enrollmentYear.toString()} 
                        isEditing={isEditing}
                        type="number"
                        onChange={(val: string) => setEditForm({...editForm, enrollmentYear: parseInt(val)})}
                        mono 
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-4 space-y-10">
                  {/* Progress Circle Card */}
                  <div className="bg-white p-12 rounded-[4rem] flex flex-col items-center text-center border border-stone-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)]">
                    <div className="relative w-48 h-48 mb-10 group">
                      <div className="absolute inset-0 bg-indigo-500/5 rounded-full scale-110 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                      <svg className="w-full h-full -rotate-90 relative z-10">
                        <circle cx="96" cy="96" r="84" stroke="#f1f5f9" strokeWidth="14" fill="none" />
                        <circle 
                          cx="96" cy="96" r="84" stroke="#4f46e5" strokeWidth="14" fill="none" 
                          strokeDasharray={528} strokeDashoffset={528 - (528 * progressPercent) / 100} strokeLinecap="round"
                          className="transition-all duration-[1500ms] ease-in-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-black text-slate-900 font-mono tracking-tighter">%{progressPercent}</span>
                        <div className="w-8 h-1 bg-indigo-500/20 rounded-full mt-1" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Completion</span>
                      </div>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 italic uppercase">Academic Velocity</h4>
                    <p className="text-xs text-slate-400 font-black mt-3 leading-relaxed tracking-wide opacity-80 italic uppercase">
                        {completed} / {totalRequired} Units Verified
                    </p>
                  </div>

                  {/* Competency Radar */}
                  <div className="bg-white p-10 rounded-[3.5rem] border border-stone-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between items-center mb-10">
                        <h4 className="text-sm font-black text-stone-900 flex items-center gap-3 italic uppercase"><BarChart3 size={18} className="text-indigo-500" /> Competency Matrix</h4>
                        <Target size={16} className="text-stone-300" />
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                          <PolarGrid stroke="#f1f5f9" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b', fontFamily: 'Inter' }} />
                          <Radar dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.15} strokeWidth={3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'grades' && (
            <GradesTab 
              student={student} 
              availableCourses={availableCourses} 
              onAddGrade={() => {
                setNewGradeForm({ 
                  courseId: '', score: 0, midtermScore: 0, finalScore: 0, semester: settings.currentSemester,
                  isIncomplete: false, incompleteResolved: false,
                  incompleteReasonAr: 'غياب مبرر عن الامتحان الموحد', incompleteReasonEn: 'Excused Absence from Final Exam',
                  incompleteDeadline: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0]
                });
                setIsAddingGrade(true);
              }} 
              onEditGrade={(index: number) => {
                const grade = student.grades[index];
                setNewGradeForm({ 
                  courseId: grade.courseId, 
                  score: grade.score, 
                  midtermScore: grade.midtermScore || 0, 
                  finalScore: grade.finalScore || 0, 
                  semester: grade.semester,
                  isIncomplete: grade.isIncomplete || false,
                  incompleteResolved: grade.incompleteResolved || false,
                  incompleteReasonAr: grade.incompleteReasonAr || 'غياب مبرر عن الامتحان الموحد',
                  incompleteReasonEn: grade.incompleteReasonEn || 'Excused Absence from Final Exam',
                  incompleteDeadline: grade.incompleteDeadline || new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0]
                });
                setEditingGradeIndex(index);
              }}
              passingScore={passingScore} 
              canEdit={canEditGrades}
            />
          )}
          {activeTab === 'transcript' && <AcademicTranscript student={student} onPrint={() => setShowPrintTranscript(true)} />}
          {activeTab === 'financials' && <FinancialsTab student={student} walletBalance={walletBalance} />}
          {activeTab === 'docs' && <DocsTab />}
          {activeTab === 'research' && <ResearchTab student={student} />}
          {activeTab === 'timeline' && <TimelineTab student={student} />}
          {activeTab === 'notes' && <NotesTab student={student} />}
          {activeTab === 'graduation' && <GraduationTab student={student} onUpdate={onUpdate} />}
          {activeTab === 'actions' && <AcademicActionsTab student={student} onUpdate={onUpdate} />}
        </div>
      </div>
    </div>
      {showAfada && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 print:h-auto print:static print:border-none print:shadow-none">
                <div className="bg-white px-8 py-6 flex justify-between items-center border-b border-slate-100 no-print">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                            <ShieldCheck size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="font-black text-slate-900">إفادة قيد أكاديمية مؤمنة</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Blockchain Secured Enrollment Certificate</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => window.print()} 
                            className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-black hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-slate-900/20"
                        >
                            <Download size={18}/> طباعة الإفادة الرسمية
                        </button>
                        <button 
                            onClick={() => setShowAfada(false)} 
                            className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-colors"
                        >
                            <X size={24}/>
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto bg-slate-50 p-12 flex justify-center print:p-0 print:bg-white">
                    <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-24 shadow-2xl relative flex flex-col border-[20px] border-double border-slate-900 print:shadow-none print:border-[12px] print:w-full print:p-12">
                        {/* Security Patterns */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden print:opacity-[0.05]" 
                             style={{ backgroundImage: `radial-gradient(#000 1px, transparent 0)`, backgroundSize: '20px 20px' }}>
                        </div>
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none">
                             <GraduationCap size={400} className="text-slate-900" />
                        </div>

                        {/* Document Header */}
                        <div className="flex justify-between items-start mb-20 relative z-10 text-right">
                            <div className="space-y-1">
                                <h2 className="text-lg font-black text-slate-900">دولة ليبيا</h2>
                                <h3 className="text-sm font-bold text-slate-700">وزارة التعليم العالي والبحث العلمي</h3>
                                <h4 className="text-sm font-bold text-slate-700 tracking-tight">{settings.institutionName}</h4>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 font-mono">ENR_REF: {student.id}</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white mb-2 shadow-xl">
                                    <ShieldCheck size={40} />
                                </div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">SECURE DIGITAL RECORD</span>
                            </div>
                            <div className="text-left space-y-1">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Ministry of Higher Education</h2>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{settings.universityName}</h3>
                                <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 text-[9px] font-black text-blue-600">
                                    <Fingerprint size={12} /> VERIFIED IDENTITY
                                </div>
                            </div>
                        </div>

                        {/* Title Section */}
                        <div className="text-center mb-16 relative z-10">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter border-y-2 border-slate-900 py-6 mb-4">إفادة قيد دراسي</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono">STATUS CERTIFICATION & ENROLLMENT PROOF</p>
                        </div>

                        {/* Body Content */}
                        <div className="text-xl leading-[3] text-justify text-slate-900 relative z-10 font-bold space-y-12 max-w-2xl mx-auto text-right">
                             <p>
                                تشهد مسجلة الكلية بأن الطالب/ة: 
                                <br />
                                <span className="text-3xl font-black text-blue-700 block my-4 underline decoration-blue-100 underline-offset-8">{student.name}</span>
                             </p>
                             <p>
                                المقيد بقسم <span className="text-2xl font-black text-slate-900">{getDepartmentName(student.departmentId)}</span> برقم قيد <span className="font-mono text-2xl font-black">{student.id}</span>
                                <br />
                                هو طالب مقيد بالدراسة للعام الجامعي <span className="text-slate-900 font-black">{settings.currentSemester}</span> ببرنامج <span className="text-slate-900 font-black">{student.program}</span>.
                             </p>
                             <p>
                                و لا يزال الطالب مستمراً في دراسته حتى تاريخه، ولهذا أعطيت له هذه الإفادة لتقديمها إلى من يهمه الأمر دون أدنى مسؤولية على الكلية.
                             </p>
                        </div>

                        {/* Identity & Security Footer */}
                        <div className="mt-auto grid grid-cols-2 gap-12 pt-20 relative z-10">
                            <div className="bg-slate-900 p-8 rounded-3xl text-white flex items-center gap-6 shadow-2xl print:bg-white print:text-slate-900 print:border-2 print:border-slate-900 print:shadow-none">
                                <div className="bg-white p-2 rounded-xl shrink-0">
                                    <img 
                                        src={getQrCodeUrl(getVerificationUrl(documentHash))} 
                                        alt="Verify QR" 
                                        className="w-16 h-16"
                                    />
                                </div>
                                <div className="space-y-1 overflow-hidden">
                                    <p className="text-[9px] font-black uppercase text-blue-400 tracking-widest">Hash ID Selection</p>
                                    <p className="text-[8px] font-mono break-all text-white/40 print:text-slate-400">{documentHash}</p>
                                    <p className="text-[7px] font-bold text-slate-400 mt-2">نظام التحقق الرقمي الوطني الموحد</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-end text-center">
                                <div className="w-32 h-32 relative mb-4 opacity-10">
                                    <div className="absolute inset-0 border-4 border-dashed border-slate-900 rounded-full animate-spin-slow"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                         <BadgeCheck size={48} className="text-slate-900" />
                                    </div>
                                </div>
                                <div className="w-full border-t-2 border-slate-900 pt-3">
                                    <p className="font-black text-lg text-slate-900">المسجل العام</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Office of The Registrar</p>
                                </div>
                            </div>
                        </div>

                        {/* Audit Details */}
                        <div className="mt-16 border-t border-slate-100 pt-8 grid grid-cols-2 gap-8 text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
                             <div className="text-right">
                                Issued By: {currentUser?.name || 'SYSTEM_AUTH'}
                                <br />
                                Node: CAMPUS-LY-LX-01
                             </div>
                             <div className="text-left">
                                Issue Date: {new Date().toLocaleDateString('ar-LY')}
                                <br />
                                Time: {new Date().toLocaleTimeString('ar-LY')}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
      )}
      {showPrintTranscript && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 print:h-auto print:static print:border-none print:shadow-none print:overflow-visible">
                <div className="bg-white px-8 py-6 flex justify-between items-center border-b border-slate-100 no-print">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                            <FileText size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="font-black text-slate-900">كشف درجات رسمي ومؤمن</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Blockchain Secured Academic Transcript</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => window.print()} 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl text-sm font-black hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-indigo-600/20"
                        >
                            <Printer size={18}/> طباعة الكشف الرسمي / Print Transcript
                        </button>
                        <button 
                            onClick={() => setShowPrintTranscript(false)} 
                            className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-colors"
                        >
                            <X size={24}/>
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto bg-slate-50 p-12 flex justify-center print:p-0 print:bg-white print:overflow-visible">
                    <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-16 shadow-2xl relative flex flex-col border-[12px] border-double border-slate-900 print:shadow-none print:border-[8px] print:w-full print:p-8">
                        {/* Security Patterns */}
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none overflow-hidden print:opacity-[0.04]" 
                             style={{ backgroundImage: `radial-gradient(#000 1px, transparent 0)`, backgroundSize: '15px 15px' }}>
                        </div>
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                             <Fingerprint size={350} className="text-slate-900" />
                        </div>

                        <SecurePrintWrapper
                            documentType={student.program === ProgramType.POSTGRADUATE ? (settings.universityName + " - Transcript (Postgraduate)") : (settings.universityName + " - Official Academic Transcript")}
                            documentId={`TRANS-${student.id}-${documentHash.substring(0, 8)}`}
                            language="ar"
                        >
                            {/* Inner content designed impeccably for official transcript */}
                            <div className="space-y-8 relative z-10 text-right font-sans" dir="rtl">
                                 {/* Student Overview Grid */}
                                 <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 print:bg-white print:border-slate-300 print:p-4 print:gap-4">
                                     <div className="space-y-2">
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">اسم الطالب / Student Name</p>
                                         <p className="text-lg font-black text-slate-900">{student.name}</p>
                                     </div>
                                     <div className="space-y-2">
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">رقم القيد / Student ID</p>
                                         <p className="text-lg font-black font-mono text-slate-950 tracking-tight">{student.id}</p>
                                     </div>
                                     <div className="space-y-2">
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">البرنامج الدراسي / Program</p>
                                         <p className="text-md font-bold text-slate-800">{student.program} ({student.graduateLevel || 'UG'})</p>
                                     </div>
                                     <div className="space-y-2">
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">القسم الأكاديمي / Department</p>
                                         <p className="text-md font-bold text-slate-800">{getDepartmentName(student.departmentId)}</p>
                                     </div>
                                 </div>

                                 {/* Academic Stats summary row */}
                                 <div className="grid grid-cols-3 gap-4 border-y border-dashed border-slate-300 py-4 font-mono">
                                     <div className="text-center font-bold">
                                         <span className="block text-[8px] font-black text-slate-400 uppercase">Credit Progress</span>
                                         <span className="text-sm font-black text-indigo-600">{completed} / {totalRequired} Hrs</span>
                                     </div>
                                     <div className="text-center border-x border-slate-100 font-bold">
                                         <span className="block text-[8px] font-black text-slate-400 uppercase">Cumulative GPA</span>
                                         <span className="text-sm font-black text-indigo-600">%{student.gpa.toFixed(2)}</span>
                                     </div>
                                     <div className="text-center font-bold">
                                         <span className="block text-[8px] font-black text-slate-400 uppercase">Academic Standing</span>
                                         <span className="text-sm font-black text-indigo-600 text-ellipsis overflow-hidden">{student.status}</span>
                                     </div>
                                 </div>

                                 {/* Semester Blocks for Print */}
                                 <div className="space-y-8">
                                     {Object.entries(
                                         student.grades.reduce((acc, grade) => {
                                             if (!acc[grade.semester]) acc[grade.semester] = [];
                                             acc[grade.semester].push(grade);
                                             return acc;
                                         }, {} as Record<string, typeof student.grades>)
                                     ).sort().map(([semester, grades]) => {
                                         const semGpa = grades.reduce((sum, g) => sum + g.score, 0) / grades.length;
                                         return (
                                             <div key={semester} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm break-inside-avoid print:border-slate-300 print:shadow-none">
                                                 <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center print:bg-white print:border-slate-300">
                                                     <h4 className="font-extrabold text-sm text-slate-800">{semester}</h4>
                                                     <span className="text-[10px] font-bold text-slate-500 font-mono">GPA: %{semGpa.toFixed(1)}</span>
                                                 </div>
                                                 <table className="w-full text-right border-collapse text-xs">
                                                     <thead>
                                                         <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 border-b border-slate-200 print:bg-white print:border-slate-300">
                                                             <th className="px-4 py-2">كود المقرر / Code</th>
                                                             <th className="px-4 py-2">اسم المقرر الدراسي / Course Title</th>
                                                             <th className="px-4 py-2 text-center">الوحدات / Cr</th>
                                                             <th className="px-4 py-2 text-center">الدرجة / Score</th>
                                                             <th className="px-4 py-2 text-center">النتيجة / Result</th>
                                                         </tr>
                                                     </thead>
                                                     <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                                                         {grades.map(g => {
                                                             const cr = availableCourses.find(ac => ac.id === g.courseId || ac.code === g.courseCode)?.credits || 3;
                                                             return (
                                                                 <tr key={g.courseId} className="hover:bg-slate-50/50">
                                                                     <td className="px-4 py-2 font-mono text-slate-500 font-bold">{g.courseCode}</td>
                                                                     <td className="px-4 py-2 font-extrabold text-slate-800">{g.courseName}</td>
                                                                     <td className="px-4 py-2 text-center font-bold text-slate-600 font-mono">{cr}</td>
                                                                     <td className="px-4 py-2 text-center font-bold font-mono">%{g.score}</td>
                                                                     <td className="px-4 py-2 text-center">
                                                                         <span className={g.score >= passingScore ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                                                                             {g.score >= passingScore ? 'ناجح / Pass' : 'راسب / Fail'}
                                                                         </span>
                                                                     </td>
                                                                 </tr>
                                                             );
                                                         })}
                                                     </tbody>
                                                 </table>
                                             </div>
                                         );
                                     })}
                                 </div>

                                 {/* dry seal stamp and signatures block */}
                                 <div className="grid grid-cols-2 gap-10 pt-10 border-t border-dashed border-slate-200 break-inside-avoid">
                                     <div className="flex flex-col items-center text-center">
                                         <div className="w-24 h-24 mb-2 relative opacity-5 print:opacity-10">
                                             <div className="absolute inset-0 border-2 border-dashed border-slate-900 rounded-full animate-spin-slow"></div>
                                             <div className="absolute inset-0 flex items-center justify-center">
                                                  <BadgeCheck size={32} className="text-slate-900" />
                                             </div>
                                         </div>
                                         <div className="w-full border-t border-slate-900 pt-2">
                                             <p className="font-extrabold text-xs text-slate-900">عميد الكلية</p>
                                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Dean of the College</p>
                                         </div>
                                     </div>
                                     <div className="flex flex-col items-center text-center">
                                         <div className="w-24 h-24 mb-2 relative opacity-5 print:opacity-10">
                                             <div className="absolute inset-0 border-2 border-dashed border-slate-900 rounded-full animate-spin-slow"></div>
                                             <div className="absolute inset-0 flex items-center justify-center">
                                                  <ShieldCheck size={32} className="text-slate-900" />
                                             </div>
                                         </div>
                                         <div className="w-full border-t border-slate-900 pt-2">
                                             <p className="font-extrabold text-xs text-slate-900">المسجل العام</p>
                                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Office of Registrar</p>
                                         </div>
                                     </div>
                                 </div>
                            </div>
                        </SecurePrintWrapper>
                    </div>
                </div>
            </div>
        </div>,
        document.body
      )}
      {/* Grade Form Modal */}
      {(isAddingGrade || editingGradeIndex !== null) && (
        <Modal 
          isOpen={true} 
          onClose={() => { setIsAddingGrade(false); setEditingGradeIndex(null); }}
          title={editingGradeIndex !== null ? 'تعديل درجة' : 'إضافة درجة جديدة'}
        >
          <form onSubmit={handleSaveGrade} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 text-right">المادة</label>
                <select 
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none text-right"
                  value={newGradeForm.courseId}
                  onChange={(e) => setNewGradeForm({ ...newGradeForm, courseId: e.target.value })}
                  required
                  disabled={editingGradeIndex !== null}
                >
                  <option value="">اختر المادة</option>
                  {availableCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 text-right">الدرجة الكلية</label>
                <input 
                  type="number" 
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none text-right disabled:opacity-40"
                  value={newGradeForm.isIncomplete ? 0 : newGradeForm.score}
                  onChange={(e) => setNewGradeForm({ ...newGradeForm, score: Number(e.target.value) })}
                  min="0" max="100"
                  required={!newGradeForm.isIncomplete}
                  disabled={newGradeForm.isIncomplete}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 text-right">الفصل الدراسي</label>
                <input 
                  type="text" 
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none text-right"
                  value={newGradeForm.semester}
                  onChange={(e) => setNewGradeForm({ ...newGradeForm, semester: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-2 bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/55 space-y-4">
                <div className="flex items-center justify-between flex-row-reverse">
                  <span className="text-sm font-black text-slate-800">رصد المقرر كغير مكتمل (IC / Incomplete)</span>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    checked={newGradeForm.isIncomplete}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setNewGradeForm({ 
                        ...newGradeForm, 
                        isIncomplete: checked,
                        score: checked ? 0 : newGradeForm.score
                      });
                    }}
                  />
                </div>
                {newGradeForm.isIncomplete && (
                  <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="block text-[10px] font-black text-indigo-950 uppercase tracking-widest mb-1.5 text-right">سبب عدم الاكتمال وبدائل التسوية (وفق المادة 56 من قرار 501)</label>
                      <select 
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-right"
                        value={newGradeForm.incompleteReasonAr}
                        onChange={(e) => {
                          const val = e.target.value;
                          const enReason = val === 'غياب مبرر عن الامتحان الموحد' ? 'Excused Absence from Final Exam' : 'Incomplete Practical Project Requirements';
                          setNewGradeForm({ ...newGradeForm, incompleteReasonAr: val, incompleteReasonEn: enReason });
                        }}
                      >
                        <option value="غياب مبرر عن الامتحان الموحد">غياب مبرر عن الامتحان النهائي بتقرير طبي معتمد</option>
                        <option value="عدم استكمال بنود المشروع العملي">عدم استكمال بنود البحث التطبيقي أو المشروع الفصلي</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-indigo-950 uppercase tracking-widest mb-1.5 text-right">أقصى موعد لتسوية التقدير واستكمال الامتحان</label>
                      <input 
                        type="date" 
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none text-right"
                        value={newGradeForm.incompleteDeadline}
                        onChange={(e) => setNewGradeForm({ ...newGradeForm, incompleteDeadline: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl">حفظ الدرجة</button>
              <button 
                type="button" 
                onClick={() => { setIsAddingGrade(false); setEditingGradeIndex(null); }}
                className="px-8 py-4 bg-stone-100 text-stone-400 rounded-xl text-xs font-black uppercase tracking-widest"
              >إلغاء</button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
};

// Sub-components for better organization
const StatCard = ({ label, value, icon: Icon, color }: any) => {
  const themes: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-[0_4px_20px_rgba(59,130,246,0.05)]",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-[0_4px_20px_rgba(79,70,229,0.05)]",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-[0_4px_20px_rgba(16,185,129,0.05)]",
    amber: "bg-amber-50 text-amber-600 border-amber-100 shadow-[0_4px_20px_rgba(245,158,11,0.05)]"
  };
  return (
    <div className={cn("p-8 rounded-[2.5rem] border flex items-center gap-5 transition-all hover:scale-[1.02] bg-white group", themes[color])}>
      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-100 group-hover:rotate-6 transition-transform duration-500">
        <Icon size={24} className="opacity-80" />
      </div>
      <div>
        <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-2xl font-black truncate tracking-tighter text-slate-900">{value}</p>
      </div>
    </div>
  );
};

const StatusBtn = ({ label, icon: Icon, color, onClick }: any) => {
  const colors: any = {
    emerald: "hover:bg-emerald-600/10 text-emerald-400 border-emerald-500/0 hover:border-emerald-500/20",
    amber: "hover:bg-amber-600/10 text-amber-400 border-amber-500/0 hover:border-amber-500/20",
    rose: "hover:bg-rose-600/10 text-rose-400 border-rose-500/0 hover:border-rose-500/20"
  };
  return (
    <button onClick={onClick} className={cn("bg-white/5 p-6 rounded-[2rem] flex flex-col items-center gap-4 transition-all border group", colors[color])}>
      <Icon size={28} className="transition-transform duration-500 group-hover:scale-110" />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100">{label}</span>
    </button>
  );
};

const DataField = ({ label, value, mono, bold, color = "text-slate-900" }: any) => (
  <div className="space-y-3">
    <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em]">{label}</p>
    <p className={cn("text-lg transition-all", bold ? "font-black text-2xl tracking-tighter" : "font-black opacity-80", mono ? "font-mono tracking-wider" : "", color)}>{value}</p>
    <div className="w-8 h-1 bg-stone-100 rounded-full" />
  </div>
);

const EditableField = ({ label, value, isEditing, onChange, mono, type = "text" }: any) => (
    <div className="space-y-3">
      <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em]">{label}</p>
      {isEditing ? (
          <input 
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
                "w-full bg-slate-50 border-b-2 border-indigo-500 px-2 py-1 font-black text-lg outline-none rounded-t-lg",
                mono ? "font-mono tracking-wider" : ""
            )}
          />
      ) : (
          <p className={cn("text-lg font-black opacity-80", mono ? "font-mono tracking-wider" : "")}>{value}</p>
      )}
      <div className="w-8 h-1 bg-stone-100 rounded-full" />
    </div>
  );

// Tab Content components
const GradesTab = ({ student, availableCourses, onAddGrade, onEditGrade, passingScore, canEdit }: any) => (
  <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
    <div className="flex justify-between items-end bg-white p-12 rounded-[3.5rem] border border-stone-100 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-bl-[4rem] opacity-40" />
      <div className="relative z-10">
        <h3 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Academic Performance Ledger</h3>
        <p className="text-stone-400 mt-3 font-black text-xs uppercase tracking-widest leading-relaxed opacity-60">Complete audit trail of scholarly evaluations and achievements</p>
      </div>
      <button onClick={onAddGrade} className="bg-slate-900 text-white px-10 py-5 rounded-2.5xl text-xs font-black flex items-center gap-4 shadow-2xl hover:scale-105 transition-all relative z-10">
        <Plus size={20} className="text-indigo-400" /> NEW RECORDING
      </button>
    </div>

    <div className="bg-white rounded-[4rem] border border-stone-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] overflow-hidden">
      <table className="w-full text-right border-collapse">
        <thead className="bg-[#fafafa] text-[10px] font-black uppercase tracking-[0.25em] text-stone-400 border-b border-stone-100">
          <tr>
            <th className="px-12 py-8">Course Identification</th>
            <th className="px-12 py-8">Evaluation Period</th>
            <th className="px-12 py-8">Result Score</th>
            <th className="px-12 py-8 text-center">Status Index</th>
            {canEdit && <th className="px-12 py-8 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-50">
          {student.grades.map((g: any, i: number) => (
            <tr key={i} className="hover:bg-indigo-50/30 transition-all group">
              <td className="px-12 py-8">
                <div className="flex items-center gap-5">
                   <div className="p-3 bg-stone-100 rounded-xl text-stone-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                      <Book size={20} />
                   </div>
                   <div>
                      <p className="font-black text-slate-800 text-xl tracking-tight leading-none mb-1 uppercase">{g.courseName}</p>
                      <p className="text-[10px] font-black font-mono text-stone-400 tracking-widest">ID: {g.courseId}</p>
                   </div>
                </div>
              </td>
              <td className="px-12 py-8 text-stone-500 font-black text-xs uppercase tracking-widest">{g.semester}</td>
              <td className="px-12 py-8">
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-3xl font-black font-mono tracking-tighter", g.score >= passingScore ? "text-slate-900" : "text-rose-600")}>{g.score}</span>
                  <span className="text-[10px] font-black text-stone-300">%</span>
                </div>
              </td>
              <td className="px-12 py-8 text-center">
                <span className={cn(
                  "px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] border inline-flex items-center gap-2",
                  g.score >= passingScore ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", g.score >= passingScore ? "bg-emerald-500" : "bg-rose-500")} />
                  {g.score >= passingScore ? 'Qualified' : 'Deficient'}
                </span>
              </td>
              {canEdit && (
                <td className="px-12 py-8 text-center">
                  <button 
                    onClick={() => onEditGrade(i)}
                    className="p-2 hover:bg-stone-100 text-stone-600 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const FinancialsTab = ({ student, walletBalance }: any) => {
  const transactions = getTransactions().filter(t => t.studentId === student.id);
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-blue-600 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <Wallet size={120} className="absolute -left-10 -bottom-10 opacity-10" />
          <p className="text-xs font-black uppercase tracking-widest opacity-80">المحفظة الإلكترونية</p>
          <h4 className="text-5xl font-black mt-4">{walletBalance.toLocaleString()} <span className="text-sm opacity-60">LYD</span></h4>
        </div>
        <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <DollarSign size={120} className="absolute -left-10 -bottom-10 opacity-10" />
          <p className="text-xs font-black uppercase tracking-widest opacity-80">إجمالي المستحقات</p>
          <h4 className="text-5xl font-black mt-4">{(student.financialBalance || 0).toLocaleString()} <span className="text-sm opacity-60">LYD</span></h4>
        </div>
      </div>
      <div className="bg-white rounded-[4rem] border border-stone-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-10 border-b border-stone-50 flex justify-between items-center bg-[#fafafa]">
           <h3 className="text-2xl font-black text-slate-800 italic uppercase">Transaction History Audit</h3>
           <button className="text-indigo-600 font-black text-[10px] flex items-center gap-3 uppercase tracking-widest bg-white px-6 py-3 rounded-2xl border border-stone-100 shadow-sm hover:translate-y-[-2px] transition-all">
             <Download size={16} /> DOWNLOAD LEDGER
           </button>
        </div>
        <table className="w-full text-right border-collapse">
          <thead className="bg-white text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100">
            <tr>
              <th className="px-12 py-6">Timestamp Index</th>
              <th className="px-12 py-6">Event Description</th>
              <th className="px-12 py-6 text-left">Valuation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {transactions.map((t, i) => (
              <tr key={i} className="hover:bg-indigo-50/20 transition-all font-bold">
                <td className="px-12 py-6 text-[11px] text-stone-400 font-mono font-black">{t.date}</td>
                <td className="px-12 py-6 text-slate-800 font-black text-base italic uppercase">{t.description}</td>
                <td className={cn("px-12 py-6 text-left font-mono font-black text-lg", t.type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500')}>
                   {t.type === 'CREDIT' ? '+' : '-'}{t.amount.toLocaleString()} <span className="text-[10px] opacity-60">LYD</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DocsTab = () => (
  <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
    <div className="flex justify-between items-center bg-white p-12 rounded-[4rem] border border-stone-100 shadow-sm">
      <div>
        <h3 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Enterprise Vault</h3>
        <p className="text-stone-400 mt-2 font-black text-xs uppercase tracking-widest opacity-60">Secured archival system for digital credentials</p>
      </div>
      <button className="bg-slate-900 text-white px-10 py-5 rounded-2.5xl text-xs font-black flex items-center gap-4 hover:scale-105 transition-all shadow-xl shadow-slate-900/10">
        <Plus size={22} className="text-indigo-400" /> DEPOSIT DOCUMENT
      </button>
    </div>
    <div className="grid grid-cols-3 gap-10">
      {['National Identity Protocol', 'High School Matrix Certificate', 'Financial Liquidation Receipt', 'Academic Endorsement Alpha'].map((doc, i) => (
        <div key={i} className="bg-white p-10 rounded-[4rem] border border-stone-100 hover:shadow-[0_30px_60px_rgba(0,0,0,0.04)] transition-all group flex flex-col gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-stone-50 rounded-bl-[4rem] transition-transform duration-700 group-hover:scale-110" />
          <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center text-stone-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 relative z-10 shadow-sm group-hover:shadow-xl">
            <FileText size={40} />
          </div>
          <div className="relative z-10">
            <h4 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase italic group-hover:text-indigo-600 transition-colors">{doc}</h4>
            <div className="flex items-center gap-3 mt-4 opacity-40">
              <span className="text-[10px] font-black font-mono tracking-widest">PDF // 1.2 MB</span>
              <div className="w-1 h-1 bg-stone-900 rounded-full" />
              <span className="text-[10px] font-black font-mono tracking-widest">2024-05-12</span>
            </div>
          </div>
          <div className="relative z-10 flex gap-4">
             <button className="flex-1 py-4 bg-stone-900 text-white rounded-2.5xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                <Download size={14} /> DOWNLOAD
             </button>
             <button className="p-4 bg-stone-50 text-stone-400 rounded-2.5xl hover:bg-stone-100 transition-colors">
                <ExternalLink size={14} />
             </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AcademicTranscript: React.FC<{ student: Student; onPrint?: () => void }> = ({ student, onPrint }) => {
    const settings = getSystemSettings();
    const semesterGrades = student.grades.reduce((acc, grade) => {
        if (!acc[grade.semester]) acc[grade.semester] = [];
        acc[grade.semester].push(grade);
        return acc;
    }, {} as Record<string, typeof student.grades>);

    return (
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
            <SecurePrintWrapper
                documentType={student.program === ProgramType.POSTGRADUATE ? "Transcript of Records (Postgraduate)" : "Academic Transcript of Records"}
                documentId={`TRANS-${student.id}-${Date.now()}`}
                language="ar"
            >
                <div className="bg-white p-16 rounded-[4.5rem] border border-stone-200 shadow-[0_40px_80px_rgba(0,0,0,0.03)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900" />
                <div className="flex justify-between items-start mb-16">
                    <div className="flex items-center gap-10">
                        <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
                           <Fingerprint size={48} className="text-white/80" />
                        </div>
                        <div>
                           <h2 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase leading-none mb-3">{settings.universityName}</h2>
                           <div className="flex items-center gap-4">
                              <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em]">{settings.institutionName}</p>
                              <div className="w-1.5 h-1.5 bg-stone-200 rounded-full" />
                              <p className="text-[11px] font-black text-stone-400 uppercase tracking-[0.3em]">OFFICIAL_DOMAIN_NODE</p>
                           </div>
                        </div>
                    </div>
                    <div className="text-left space-y-4">
                       <div className="px-8 py-3 bg-slate-900 text-white rounded-2.5xl text-[11px] font-black uppercase tracking-[0.25em] shadow-xl">AUTHENTICATED PERFORMANCE RECORD</div>
                       <div className="text-[9px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-3 justify-end">
                          <ShieldCheck size={14} className="text-emerald-500" /> CRYPTOGRAPHICALLY_SIGNED
                       </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-4 gap-16 py-12 border-y border-stone-100">
                    <div>
                       <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.3em] mb-3">Identity Entity</p>
                       <p className="text-2xl font-black text-slate-900 italic uppercase">{student.name}</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.3em] mb-3">System Reference</p>
                       <p className="text-2xl font-black font-mono text-slate-900 tracking-tighter">{student.id}</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.3em] mb-3">Academic Domicile</p>
                       <p className="text-2xl font-black text-slate-900 italic uppercase">{getDepartmentName(student.departmentId)}</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.3em] mb-3">Cumulative Weight</p>
                       <div className="flex items-baseline gap-1">
                          <p className="text-5xl font-black text-indigo-600 font-mono tracking-tighter">%{student.gpa.toFixed(1)}</p>
                          <span className="text-xs font-black text-stone-300 tracking-widest uppercase">Rank_Elite</span>
                       </div>
                    </div>
                </div>
            </div>

            {Object.entries(semesterGrades).sort().map(([semester, grades]) => (
                <div key={semester} className="bg-white rounded-[4rem] border border-stone-200 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.01)] transition-all hover:shadow-lg">
                    <div className="bg-[#fafafa] px-12 py-10 border-b border-stone-100 flex justify-between items-center">
                       <h4 className="font-black text-2xl text-slate-800 italic uppercase tracking-tight">{semester} <span className="text-stone-300 ml-4 font-mono">//</span></h4>
                       <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Evaluation_Section</span>
                    </div>
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-white text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] border-b border-stone-100">
                          <tr>
                            <th className="px-12 py-6">Course Descriptor</th>
                            <th className="px-12 py-6">Authentication Code</th>
                            <th className="px-12 py-6">Weighted Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                            {grades.map(g => (
                                <tr key={g.courseId} className="hover:bg-indigo-50/20 group">
                                  <td className="px-12 py-8 text-xl font-black text-slate-800 italic uppercase group-hover:text-indigo-600 transition-colors">{g.courseName}</td>
                                  <td className="px-12 py-8 text-xs font-mono font-black text-stone-400 tracking-widest">{g.courseCode}</td>
                                  <td className="px-12 py-8">
                                     <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black font-mono tracking-tighter text-slate-900 group-hover:scale-110 transition-transform origin-right">%{g.score}</span>
                                        <div className={cn("w-2 h-2 rounded-full", g.score >= 50 ? "bg-emerald-500" : "bg-rose-500")} />
                                     </div>
                                  </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
            
            </SecurePrintWrapper>
            
            <div className="flex justify-center pt-16 no-print">
               <button 
                  onClick={onPrint || (() => window.print())} 
                  className="flex items-center gap-5 bg-slate-900 text-white px-16 py-7 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-[0_30px_60px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all group"
               >
                  <Printer size={24} className="text-indigo-400 group-hover:translate-y-1 transition-transform" /> 
                  Print Official Transcript
               </button>
            </div>
        </div>
    );
};

const ResearchTab = ({ student }: { student: Student }) => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="bg-white p-12 rounded-[4rem] border border-stone-100 shadow-sm flex justify-between items-center bg-gradient-to-br from-white to-stone-50">
            <div>
                <h3 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Research & Scholarly Plan</h3>
                <p className="text-stone-400 mt-2 font-black text-xs uppercase tracking-widest opacity-60">Architectural roadmap for postgraduate academic inquiry</p>
            </div>
            <Microscope size={64} className="text-stone-100" />
        </div>

        <div className="grid grid-cols-12 gap-10">
            <div className="col-span-8 space-y-10">
                <div className="bg-white p-12 rounded-[4rem] border border-stone-100 shadow-sm space-y-8">
                    <h4 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Target size={20} /></div> Current Research Milestone
                    </h4>
                    <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={100} /></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">Phase II: Empirical Validation</p>
                        <h5 className="text-2xl font-bold leading-tight mb-8">تحليل العوامل المؤثرة على جودة التعليم العالي في المؤسسات التقنية</h5>
                        <div className="flex items-center gap-10">
                           <div className="space-y-1">
                               <p className="text-[9px] font-black uppercase text-stone-500">Progress</p>
                               <p className="text-2xl font-black font-mono tracking-tighter">65%</p>
                           </div>
                           <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                               <motion.div initial={{ width: 0 }} animate={{ width: '65%' }} className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)] rounded-full" />
                           </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <DataField label="Primary Supervisor" value="Dr. Ahmed Al-Mansouri" />
                        <DataField label="Dissertation Track" value="Quantitative Systems Analysis" />
                        <DataField label="Submission Deadline" value="2025-12-15" color="text-amber-600" />
                    </div>
                </div>

                <div className="bg-white p-12 rounded-[4rem] border border-stone-100 shadow-sm space-y-8">
                    <h4 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-4">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Share2 size={20} /></div> Academic Publications
                    </h4>
                    <div className="space-y-6">
                        {[
                            { title: 'Intelligent Registry Systems: A Framework for Libyan Universities', journal: 'Journal of Academic Tech', date: '2024-02', status: 'Published' },
                            { title: 'Blockchain Security in Student Dossiers', journal: 'Global Education Review', date: '2024-06', status: 'Under Review' }
                        ].map((pub, idx) => (
                            <div key={idx} className="flex justify-between items-center p-6 bg-stone-50 rounded-3xl border border-stone-100 group hover:border-indigo-100 transition-all">
                                <div>
                                    <h6 className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors uppercase italic">{pub.title}</h6>
                                    <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase tracking-widest">{pub.journal} • {pub.date}</p>
                                </div>
                                <span className={cn(
                                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                    pub.status === 'Published' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                )}>{pub.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="col-span-4 space-y-10">
                <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white space-y-8">
                    <h4 className="text-sm font-black text-stone-400 uppercase tracking-widest">Research Timeline</h4>
                    <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
                        {[
                            { step: 'Topic Approval', date: '2023-09', done: true },
                            { step: 'Literature Review', date: '2024-01', done: true },
                            { step: 'Data Collection', date: '2024-05', done: false },
                            { step: 'Final Defense', date: '2025-06', done: false }
                        ].map((s, i) => (
                            <div key={i} className="flex items-center gap-6 relative z-10">
                                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black", s.done ? "bg-indigo-500 text-white" : "bg-white/10 text-white/30 border border-white/10")}>
                                    {s.done ? <CheckCircle2 size={12} /> : i + 1}
                                </div>
                                <div>
                                    <p className={cn("text-xs font-black uppercase tracking-widest", s.done ? "text-white" : "text-white/40")}>{s.step}</p>
                                    <p className="text-[9px] font-mono text-white/20">{s.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const TimelineTab = ({ student }: { student: Student }) => {
    const availableCourses = getCourses();
    const studentTransactions = getStudentTransactions(student.id);

    // Group grades by semester
    const gradesBySemester: Record<string, Grade[]> = {};
    student.grades.forEach(g => {
        if (!g.semester) return;
        if (!gradesBySemester[g.semester]) {
            gradesBySemester[g.semester] = [];
        }
        gradesBySemester[g.semester].push(g);
    });

    // Heuristics for sorting semesters
    const sortedSemesters = Object.keys(gradesBySemester).sort((a, b) => {
        const parseSem = (s: string) => {
            const parts = s.split(' ');
            const yearIndex = parts.findIndex(p => /^\d{4}$/.test(p));
            const year = yearIndex !== -1 ? parseInt(parts[yearIndex]) : 0;
            const isFall = s.includes('خريف') || s.toLowerCase().includes('fall');
            const sub = isFall ? 2 : 1;
            return year * 10 + sub;
        };
        return parseSem(a) - parseSem(b);
    });

    // Helper to calculate semester date (approximate)
    const getSemesterApproxDate = (semName: string) => {
        const parts = semName.split(' ');
        const yearIndex = parts.findIndex(p => /^\d{4}$/.test(p));
        const year = yearIndex !== -1 ? parts[yearIndex] : student.enrollmentYear;
        const isFall = semName.includes('خريف') || semName.toLowerCase().includes('fall');
        return isFall ? `${year}-09-15` : `${year}-02-15`;
    };

    // Calculate Semester GPA (SGPA) and cumulative tracking
    let cumulativeUnits = 0;
    let cumulativePoints = 0;

    const semDetails = sortedSemesters.map(semName => {
        const semGrades = gradesBySemester[semName];
        let totalScoreCredits = 0;
        let totalCredits = 0;

        semGrades.forEach(g => {
            const course = availableCourses.find(c => c.id === g.courseId);
            const credits = course?.credits || 3;
            totalScoreCredits += (g.score * credits);
            totalCredits += credits;
        });

        const sgpa = totalCredits > 0 ? (totalScoreCredits / totalCredits) : 0;

        cumulativeUnits += totalCredits;
        cumulativePoints += totalScoreCredits;
        const cgpa = cumulativeUnits > 0 ? (cumulativePoints / cumulativeUnits) : 0;

        return {
            semester: semName,
            sgpa: parseFloat(sgpa.toFixed(2)),
            cgpa: parseFloat(cgpa.toFixed(2)),
            grades: semGrades,
            totalCredits: totalCredits,
            approxDate: getSemesterApproxDate(semName)
        };
    });

    // Group transactions by semester based on closeness to date, or by description
    const getSemesterFromDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const y = d.getFullYear();
        const m = d.getMonth() + 1; // 1-12
        if (m >= 9 || m <= 1) {
            return `خريف ${m <= 1 ? y - 1 : y}`;
        } else {
            return `ربيع ${y}`;
        }
    };

    const txBySemester: Record<string, Transaction[]> = {};
    studentTransactions.forEach(t => {
        let semKey = '';
        // If keyword fits, map directly
        if (t.description.includes('خريف') || t.description.toLowerCase().includes('fall')) {
            const match = t.description.match(/\d{4}/);
            semKey = match ? `خريف ${match[0]}` : getSemesterFromDate(t.date);
        } else if (t.description.includes('ربيع') || t.description.toLowerCase().includes('spring')) {
            const match = t.description.match(/\d{4}/);
            semKey = match ? `ربيع ${match[0]}` : getSemesterFromDate(t.date);
        } else {
            semKey = getSemesterFromDate(t.date);
        }

        if (!txBySemester[semKey]) txBySemester[semKey] = [];
        txBySemester[semKey].push(t);
    });

    // Predictive Analytics Algorithms (Success Probabilities of Next Course Modules)
    const nextCourses = availableCourses.filter(c => {
        if (c.programType !== student.program) return false;
        const alreadyTaken = student.grades.some(g => g.courseId === c.id);
        return !alreadyTaken;
    }).slice(0, 3);

    const predictions = nextCourses.map(course => {
        let baseProb = 50 + (student.gpa * 12); // Undergrad 0.0 - 4.0 GPA scale or 50-100 scale
        if (student.gpa > 4.0) {
            // Out of 100 scale structure
            baseProb = student.gpa;
        } else {
            baseProb = Math.min(98, Math.max(45, baseProb));
        }

        let riskComment = 'جاهز للتسجيل بناءً على السجل التراكمي';
        let riskColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
        let badgeText = 'موصى به';

        // Check prerequisites
        if (course.prerequisites && course.prerequisites.length > 0) {
            const prereqId = course.prerequisites[0];
            const prereqGrade = student.grades.find(g => g.courseId === prereqId);
            if (prereqGrade) {
                // Adjust base prob based on prereq grade
                const prereqScorePercent = student.gpa > 4.0 ? prereqGrade.score : (prereqGrade.score / 4) * 100;
                if (prereqScorePercent < 70) {
                    baseProb -= 15;
                    riskComment = `متطلب (${prereqGrade.courseCode}) تم تجاوزه بدرجة متدنية (${prereqGrade.score}). ينصح بالمراجعة الطفيفة قبل البدء.`;
                    riskColor = 'text-amber-600 bg-amber-50 border-amber-100';
                    badgeText = 'تحدٍ محتمل';
                } else {
                    baseProb += 5;
                    riskComment = `متفوق في المتطلب الأساسي (${prereqGrade.courseCode}) بدرجة ${prereqGrade.score}. فرصة نجاح ممتازة.`;
                    riskColor = 'text-emerald-700 bg-emerald-50 border-emerald-250';
                    badgeText = 'امتياز متوقع';
                }
            } else {
                baseProb -= 20;
                riskComment = `لم يتم رصد درجة المتطلب المسبق (${prereqId}) في السجل النشط بعد.`;
                riskColor = 'text-rose-600 bg-rose-50 border-rose-100';
                badgeText = 'غير مستوفٍ';
            }
        } else {
            // General recommendation based on course standard severity
            if (course.credits >= 4) {
                baseProb -= 5;
                riskComment = 'مقرر عالي الساعات المعتمدة. يتطلب جهداً مستمراً في المهام والمختبرات.';
                riskColor = 'text-blue-600 bg-blue-50 border-blue-100';
                badgeText = 'متطلبات متوسطة';
            }
        }

        // Clamp success probability
        baseProb = Math.min(99, Math.round(baseProb));

        return {
            course,
            probability: baseProb,
            comment: riskComment,
            style: riskColor,
            badge: badgeText
        };
    });

    // GPA Trajectory Chart Data
    const chartData = semDetails.map(d => ({
        name: d.semester,
        gpa: d.cgpa,
        predicted: d.cgpa,
    }));

    // Project forward by 2 semesters if possible
    if (chartData.length > 0) {
        const lastVal = chartData[chartData.length - 1].gpa;
        const trend = chartData.length > 1 ? chartData[chartData.length - 1].gpa - chartData[0].gpa : 0;
        const next1 = Math.min(student.gpa > 4.0 ? 100 : 4.0, parseFloat((lastVal + (trend > 0 ? 0.05 : -0.02)).toFixed(2)));
        const next2 = Math.min(student.gpa > 4.0 ? 100 : 4.0, parseFloat((next1 + (trend > 0 ? 0.04 : -0.01)).toFixed(2)));
        
        chartData.push({
            name: 'فصل قادم (تنبؤ)',
            gpa: null as any,
            predicted: next1
        }, {
            name: 'فصل +2 (تنبؤ)',
            gpa: null as any,
            predicted: next2
        });
    } else {
        // Fallback for new students
        chartData.push(
            { name: 'القبول', gpa: student.gpa || 2.5, predicted: student.gpa || 2.5 },
            { name: 'فصل 1 (تنبؤ)', gpa: null as any, predicted: Math.min(4.0, (student.gpa || 2.5) + 0.3) },
            { name: 'فصل 2 (تنبؤ)', gpa: null as any, predicted: Math.min(4.0, (student.gpa || 2.5) + 0.4) }
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 text-right" dir="rtl">
            {/* Header */}
            <div className="p-12 bg-white rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center bg-gradient-to-br from-indigo-50/20 to-white gap-6">
                <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Activity className="text-blue-600" />
                        الخريطة الزمنية التفاعلية للرحلة الأكاديمية والمالية
                    </h3>
                    <p className="text-slate-400 mt-2 font-black text-xs uppercase tracking-widest opacity-80">
                        INTERACTIVE TIMELINE • INTEGRATED STATS • REGULATION 501 DIGITAL COHORTING
                    </p>
                </div>
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shrink-0">
                    <HistoryIcon size={32} />
                </div>
            </div>

            {/* Predictive Analytics Dashboard Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* GPA Projection Visualizer */}
                <div className="lg:col-span-7 bg-white p-10 rounded-[3.5rem] border border-slate-150 shadow-sm flex flex-col">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Sparkles size={18} className="text-indigo-500" />
                                مسار الأداء المتوقع والنمو التراكمي
                            </h4>
                            <p className="text-xs text-slate-400 font-bold">بناءً على خوارزميات التدقيق والنمذجة الرياضية للقرارات التاريخية للحسابات</p>
                        </div>
                        <span className="px-3 py-1 text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 font-extrabold rounded-full">تحديث ذكي</span>
                    </div>

                    <div className="flex-1 h-64 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                                <YAxis domain={[0, student.gpa > 4.0 ? 100 : 4.0]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', direction: 'rtl', textAlign: 'right' }} />
                                <Area type="monotone" name="المعدل التراكمي" dataKey="gpa" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorGpa)" />
                                <Area type="monotone" name="المعدل التراكمي المتوقع" dataKey="predicted" stroke="#6366f1" strokeDasharray="5 5" strokeWidth={3} fillOpacity={0.5} fill="url(#colorPred)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Predictions and Recommendations List */}
                <div className="lg:col-span-5 bg-slate-900 text-white p-10 rounded-[3.5rem] flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-lg font-black text-white flex items-center gap-2">
                                    <Target size={18} className="text-amber-400" />
                                    تحليل احتمالية النجاح للمقررات اللاحقة
                                </h4>
                                <p className="text-slate-400 text-xs mt-1 font-bold">بناءً على تتبع السجل وتجاوز متطلبات لائحة 501</p>
                            </div>
                        </div>

                        {predictions.length > 0 ? (
                            <div className="space-y-4">
                                {predictions.map((p, i) => (
                                    <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
                                        <div className="flex justify-between items-center mb-2">
                                            <div>
                                                <span className="text-[10px] text-indigo-300 font-extrabold block">{p.course.code}</span>
                                                <h5 className="text-sm font-black text-white">{p.course.name}</h5>
                                            </div>
                                            <div className="text-left">
                                                <span className="text-lg font-mono font-black text-amber-300">%{p.probability}</span>
                                                <span className="text-[8px] text-slate-400 block font-black">احتمال النجاح</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                            <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-black shrink-0", p.style)}>
                                                {p.badge}
                                            </span>
                                            <p className="text-[10px] text-slate-300 leading-normal font-bold">
                                                {p.comment}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-500">
                                <School size={48} className="mx-auto mb-3 opacity-20" />
                                <p className="text-xs font-black">لا توجد مقررات قادمة متبقية في الخطة الأكاديمية للطالب</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center text-xs">
                        <div className="font-bold text-slate-400 text-right">
                            الحالة التنبؤية: <span className="text-emerald-400 font-black">نمو مستقر ومطابق</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Integrated Joint Academic & Financial Timeline */}
            <div>
                <h4 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2 pr-2">
                    <Clock size={22} className="text-blue-600" />
                    المخطط المتكامل للأداء والمدفوعات فصليًا
                </h4>

                <div className="relative pr-8 before:absolute before:right-[23px] before:top-2 before:bottom-2 before:w-1 before:bg-slate-100 before:rounded-full text-right">
                    {/* Enrollment Card */}
                    <div className="mb-12 relative flex gap-6">
                        <div className="absolute right-3 top-1 w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-md flex items-center justify-center text-white z-10"></div>
                        <div className="mr-12 bg-slate-50 border border-slate-150 p-6 rounded-3xl w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <span className="text-[9px] font-black uppercase text-blue-600 tracking-wider bg-blue-50 px-2.5 py-1 rounded-md">التسجيل الأولي</span>
                                <h4 className="text-base font-black text-slate-800 mt-2 font-black">بداية مسيرة {student.name} بالجامعة</h4>
                                <p className="text-slate-500 text-xs mt-1">تاريخ دمج قيد الطالب بالبيانات الأكاديمية تحت الإشراف المباشر</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold font-mono text-slate-400 block">سنة القبول</span>
                                <span className="text-sm font-black text-slate-700 font-mono">{student.enrollmentYear}</span>
                            </div>
                        </div>
                    </div>

                    {/* Semesters Cards */}
                    {semDetails.length > 0 ? (
                        semDetails.map((sem) => {
                            const relatedTxs = txBySemester[sem.semester] || [];
                            const sgpaColor = sem.sgpa >= 3.0 ? 'text-emerald-700 border-emerald-100 bg-emerald-50/50' : 
                                              sem.sgpa >= 2.0 ? 'text-blue-700 border-blue-100 bg-blue-50/50' : 
                                              'text-red-700 border-red-105 bg-red-50/50';

                            return (
                                <div key={sem.semester} className="mb-12 relative flex gap-6 group">
                                    {/* Timeline dot */}
                                    <div className="absolute right-3 top-2 w-6 h-6 bg-white border-4 border-slate-200 rounded-full group-hover:border-blue-500 transition-colors z-10"></div>
                                    
                                    <div className="mr-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-150 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100/50 transition-all text-right">
                                        {/* Academic Column */}
                                        <div className="lg:col-span-8 space-y-4">
                                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                                <div>
                                                    <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">التحصيل الدراسي</span>
                                                    <h4 className="text-lg font-black text-slate-800 mt-1">{sem.semester}</h4>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <span className="text-[8px] font-bold text-slate-400 block font-black">ساعات الفصل</span>
                                                        <span className="text-xs font-black text-slate-700 font-mono">{sem.totalCredits} ساعة</span>
                                                    </div>
                                                    <div className={cn("px-4 py-1.5 rounded-2xl border text-center font-bold", sgpaColor)}>
                                                        <span className="text-[8px] block font-black leading-none mb-1">المعدل الفصلي</span>
                                                        <span className="text-sm font-mono font-black">{sem.sgpa}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Registered courses list */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                                {sem.grades.map((g, gIdx) => {
                                                    const isPass = student.program === ProgramType.POSTGRADUATE ? (g.score >= 2.6) : (g.score >= 2.0); // Simple threshold check
                                                    return (
                                                        <div key={gIdx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-right">
                                                            <div>
                                                                <span className="text-[8px] font-bold text-slate-400 block font-mono text-right">{g.courseId}</span>
                                                                <h5 className="text-xs font-black text-slate-700 truncate max-w-[150px]">{g.courseName}</h5>
                                                            </div>
                                                            <div className="text-left font-mono">
                                                                <span className={cn("text-xs font-black", isPass ? "text-slate-800" : "text-rose-600")}>
                                                                    {g.score}
                                                                </span>
                                                                <span className="text-[8px] text-slate-400 block font-bold">{isPass ? 'ناجح' : 'مسبق/متعثر'}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Financial Column */}
                                        <div className="lg:col-span-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col justify-between text-right">
                                            <div>
                                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200/50">
                                                    <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                                        <DollarSign size={14} className="text-blue-600" />
                                                        الحالة المالية للفصل
                                                    </h5>
                                                    <span className="text-[8px] font-black text-slate-400">{sem.semester}</span>
                                                </div>

                                                {relatedTxs.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {relatedTxs.map((tx, txIdx) => (
                                                            <div key={txIdx} className="flex justify-between items-start text-xs text-right">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="font-extrabold text-slate-700 truncate" title={tx.description}>{tx.description}</p>
                                                                    <p className="text-[8px] text-slate-400 font-mono mt-0.5">{tx.date}</p>
                                                                </div>
                                                                <span className={cn(
                                                                    "font-mono font-black shrink-0 mr-2",
                                                                    tx.type === 'DEBIT' ? "text-rose-600" : "text-emerald-600"
                                                                )}>
                                                                    {tx.type === 'DEBIT' ? '-' : '+'}{tx.amount} د.ل
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-6 text-slate-300">
                                                        <Wallet size={24} className="mx-auto mb-2 opacity-35" />
                                                        <p className="text-[9px] font-bold">لا توجد حركات مالية مرصودة لهذا الفصل</p>
                                                    </div>
                                                )}
                                            </div>

                                            {relatedTxs.length > 0 && (
                                                <div className="mt-4 pt-3 border-t border-slate-200/50 flex justify-between items-center text-[10px]">
                                                    <span className="font-extrabold text-slate-400">إجمالي الحركات</span>
                                                    <span className="font-mono font-black text-slate-800">
                                                        {relatedTxs.length} معاملة
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 text-slate-400 bg-white border border-dashed border-slate-200 rounded-[2rem] mr-12 text-right">
                            <GraduationCap size={48} className="mx-auto mb-3 opacity-25" />
                            <h5 className="font-black text-slate-600">سجل الفصول الدراسية فارغ</h5>
                            <p className="text-xs font-bold text-slate-400 mt-1">لم يتم رصد درجات للمقررات المسجلة لهذا الطالب بعد</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const NotesTab = ({ student }: { student: Student }) => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="bg-white p-12 rounded-[4rem] border border-stone-100 shadow-sm flex justify-between items-center bg-gradient-to-br from-indigo-50/50 to-white">
            <div>
                <h3 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Mentorship & Advisory Narrative</h3>
                <p className="text-stone-400 mt-2 font-black text-xs uppercase tracking-widest opacity-60">Qualitative assessment repository from institutional supervisors</p>
            </div>
            <MessageSquare size={64} className="text-stone-100" />
        </div>

        <div className="grid grid-cols-2 gap-10">
            <div className="space-y-8">
                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em] mb-10 pl-4">Supervisor Observations</h4>
                {[
                    { author: 'Dr. Karima Al-Toumi', role: 'Main Supervisor', date: '2024-01-10', note: 'الطالب يظهر مهارات تحليلية متقدمة، ولكن يحتاج للتركيز أكثر على الجانب النظري للمناهج.' },
                    { author: 'Dr. Karima Al-Toumi', role: 'Main Supervisor', date: '2023-11-20', note: 'التزام ممتاز بالحضور والمشاركة الفعالة في المختبرات العملية.' }
                ].map((note, i) => (
                    <div key={i} className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-2 h-full bg-slate-900 opacity-5" />
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400"><User size={20} /></div>
                                <div>
                                    <h6 className="font-black text-slate-800 text-sm">{note.author}</h6>
                                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{note.role}</p>
                                </div>
                            </div>
                            <span className="text-[8px] font-black font-mono text-stone-300">{note.date}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-600 leading-loose text-right">{note.note}</p>
                    </div>
                ))}
            </div>

            <div className="space-y-8">
                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em] mb-10 pl-4">Academic Advisor Logs</h4>
                {[
                    { author: 'Prof. Hassan Ben-Ali', role: 'Academic Advisor', date: '2023-12-15', note: 'تمت مناقشة خطة المسار الأكاديمي، الطالب مستعد للمرحلة القادمة بثقة.' }
                ].map((note, i) => (
                    <div key={i} className="bg-stone-900 p-10 rounded-[3rem] text-white shadow-2xl relative group overflow-hidden">
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white/40"><MessageSquare size={20} /></div>
                                <div>
                                    <h6 className="font-black text-white text-sm">{note.author}</h6>
                                    <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">{note.role}</p>
                                </div>
                            </div>
                            <span className="text-[8px] font-black font-mono text-white/20">{note.date}</span>
                        </div>
                        <p className="text-sm font-bold text-white/70 leading-loose text-right italic">{note.note}</p>
                    </div>
                ))}
                
                <div className="bg-white p-8 rounded-[3rem] border border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-300 py-16 gap-6">
                    <Plus size={32} />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Append Mentorship Note</p>
                </div>
            </div>
        </div>
    </div>
);

const GraduationTab = ({ student, onUpdate }: { student: Student, onUpdate?: (student: Student) => void }) => {
  const check = calculateStudentEligibility(student);
  const currentUser = getCurrentUser();
  const isAdmin = currentUser && [UserRole.SUPER_ADMIN, UserRole.REGISTRATION_OFFICER, UserRole.ACADEMIC_REGISTRAR, UserRole.DEPT_HEAD].includes(currentUser.effectiveRole || currentUser.role as any);

  const handleApproveGraduation = () => {
    const updated: Student = {
      ...student,
      status: StudentStatus.GRADUATED,
      clearance: {
        currentStage: 'COMPLETED',
        completedStages: ['LIBRARY', 'FINANCE', 'LABS', 'DEPARTMENT', 'REGISTRAR'],
        isFullyCleared: true,
        clearedAt: new Date().toISOString().split('T')[0]
      }
    };
    saveStudent(updated);
    
    // Log action with audit service
    logAction(
      'STUDENT_GRADUATION', 
      `قرار تخرج: تم مراجعة واعتماد تخرج الطالب ${student.name} (${student.id}) لاستيفائه كامل المتطلبات بمعدل ${student.gpa}%`,
      'info',
      currentUser?.name || 'Academic Registrar'
    );

    notifySuccess('تمت ترقية حالة الطالب إلى خريج معتمد وربط براءة الذمة بنجاح!');
    onUpdate?.(updated);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-5xl mx-auto p-1 text-right" dir="rtl">
      {/* Narrative Header */}
      <div className="bg-white p-12 rounded-[3.5rem] border border-stone-100 shadow-sm flex flex-col md:flex-row justify-between items-center bg-gradient-to-br from-indigo-55/40 to-white gap-6">
        <div>
          <h3 className="text-3xl font-black text-slate-950 tracking-tight">تدقيق استحقاق التخرج الآلي</h3>
          <p className="text-stone-400 mt-2 font-black text-xs uppercase tracking-widest opacity-80">
            AUDIT REPORT • REGULATION 501 COMPLIANCE ROADMAP
          </p>
        </div>
        <GraduationCap size={56} className="text-indigo-600 shrink-0" />
      </div>

      {/* Hero Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Progress Dial Gauge */}
        <div className="col-span-1 bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-6">جاهزية التخرج الكلية</p>
          <div className="relative w-36 h-36 flex items-center justify-center mb-4">
            {/* Background Circle */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="72" cy="72" r="62" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
              <circle 
                cx="72" 
                cy="72" 
                r="62" 
                stroke={student.status === StudentStatus.GRADUATED ? '#059669' : check.isEligible ? '#4f46e5' : '#f59e0b'} 
                strokeWidth="12" 
                fill="transparent" 
                strokeDasharray={2 * Math.PI * 62}
                strokeDashoffset={2 * Math.PI * 62 * (1 - (student.status === StudentStatus.GRADUATED ? 100 : check.eligibilityPercentage) / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black text-slate-900 leading-none">
                {student.status === StudentStatus.GRADUATED ? '100' : check.eligibilityPercentage}%
              </span>
              <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1">منجز</span>
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-500">{check.programName}</p>
        </div>

        {/* Big Alert Banner */}
        <div className="col-span-2 bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">موقف ملف تخرج الطالب</h4>
            
            {student.status === StudentStatus.GRADUATED ? (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800 flex items-start gap-4">
                <ShieldCheck size={28} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-extrabold text-sm text-emerald-950">تم التخرج بنجاح ومستوفي للقوانين</h5>
                  <p className="text-xs font-bold leading-relaxed mt-1 text-emerald-900">
                    تم إصدار ومظاهرة الملف الأكاديمي، وتتم مراجعة الشهادة في سجل الخريجين العام. الطالب خريج رسمي من الجامعة.
                  </p>
                </div>
              </div>
            ) : check.isEligible ? (
              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-800 flex items-start gap-4">
                <CheckCircle2 size={28} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-extrabold text-sm text-indigo-950">جدوى التخرج مكتملة - جاهز للاعتماد</h5>
                  <p className="text-xs font-bold leading-relaxed mt-1 text-indigo-900">
                    استوفى الطالب متطلبات الساعات الأكاديمية والمعدل التراكمي ونوقشت الأطروحة بنجاح. لا توجد أي التزامات مالية أو عوائق تمنع التخرج.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100/60 text-amber-805 flex items-start gap-4">
                <AlertTriangle size={28} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-extrabold text-sm text-amber-950">الملف غير مكتمل (شروط ناقصة)</h5>
                  <p className="text-xs font-bold leading-relaxed mt-1 text-amber-900">
                    الطالب لم يستوف كامل الشروط المطلوبة لبرنامجه بعد. يرجى مراجعة الجدول التفصيلي أدناه واستكمال الساعات أو المناقشة العلمية.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger for Admins to Graduate student */}
          {student.status !== StudentStatus.GRADUATED && isAdmin && (
            <div className="pt-6 border-t border-stone-100 flex justify-end gap-3 mt-4">
              <button 
                onClick={handleApproveGraduation}
                disabled={!check.isEligible}
                className={cn(
                  "px-8 py-3.5 rounded-2xl text-xs font-black uppercase text-white shadow-lg transition-transform hover:scale-102 flex items-center gap-3",
                  check.isEligible 
                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 cursor-pointer" 
                    : "bg-slate-300 shadow-none cursor-not-allowed opacity-60"
                )}
              >
                <CheckCheck size={16} />
                <span>اعتماد التخرج وإصدار الشهادة الأكاديمية</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Checkpoints Checklist */}
      <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm space-y-6">
        <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-4 border-b border-slate-100 pb-4">INDIVIDUAL METRIC CHECKPOINTS</h4>
        
        <div className="space-y-6">
          {/* 1. Credit Hours Metric */}
          <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-stone-50">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-2.5 rounded-xl border",
                check.creditsStatus ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
              )}>
                {check.creditsStatus ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              </div>
              <div>
                <h5 className="font-black text-sm text-slate-800">الساعات المعتمدة المنجزة</h5>
                <p className="text-xs font-medium text-stone-400">المطلوب: {check.creditsRequired} ساعة | المنجز حالياً: {check.creditsEarned} ساعة</p>
              </div>
            </div>
            <div className="text-left font-black text-sm text-slate-700">
              {check.creditsStatus ? (
                <span className="text-emerald-600">تجاوز الحد المطلوب ✓</span>
              ) : (
                <span className="text-rose-500">متبقي {check.creditsRequired - check.creditsEarned} ساعات</span>
              )}
            </div>
          </div>

          {/* 2. GPA Metric */}
          <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-stone-50">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-2.5 rounded-xl border",
                check.gpaStatus ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
              )}>
                {check.gpaStatus ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              </div>
              <div>
                <h5 className="font-black text-sm text-slate-800">المعدل التراكمي الضابط (CGPA)</h5>
                <p className="text-xs font-medium text-stone-400">الحد الأدنى لبرنامجه: {check.minGpaRequired}% | معدل الطالب الموزون: {check.gpa}%</p>
              </div>
            </div>
            <div className="text-left font-black text-sm text-slate-700">
              {check.gpaStatus ? (
                <span className="text-emerald-600">معدل مقبول للتخرج ✓</span>
              ) : (
                <span className="text-rose-500">إنذار أكاديمي / المعدل دون المعيار</span>
              )}
            </div>
          </div>

          {/* 3. Project or Thesis Metric */}
          {check.projectOrThesisRequired && (
            <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-stone-50">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2.5 rounded-xl border",
                  check.projectOrThesisPassed ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {check.projectOrThesisPassed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                </div>
                <div>
                  <h5 className="font-black text-sm text-slate-800">مشروع التخرج العملي / الأطروحة العلمية</h5>
                  <p className="text-xs font-medium text-stone-405 leading-relaxed truncate max-w-[400px]" title={check.projectOrThesisDetailsAr}>{check.projectOrThesisDetailsAr}</p>
                </div>
              </div>
              <div className="text-left font-black text-sm text-slate-705">
                {check.projectOrThesisPassed ? (
                  <span className="text-emerald-600">معتمد ومسجّل بالكامل ✓</span>
                ) : (
                  <span className="text-rose-500">بانتظار المناقشة النهائية والاعتماد</span>
                )}
              </div>
            </div>
          )}

          {/* 4. Publications Metric (Postgrad only) */}
          {student.program === ProgramType.POSTGRADUATE && check.publicationsRequired > 0 && (
            <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-stone-50">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2.5 rounded-xl border",
                  check.publicationsStatus ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {check.publicationsStatus ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                </div>
                <div>
                  <h5 className="font-black text-sm text-slate-800">الإنتاج والبحث العلمي المعتمد</h5>
                  <p className="text-xs font-medium text-stone-450">الأوراق المنشورة المطلوبة: {check.publicationsRequired} | المنشور فعلياً: {check.publicationsCount}</p>
                </div>
              </div>
              <div className="text-left font-black text-sm text-slate-700">
                {check.publicationsStatus ? (
                  <span className="text-emerald-600">المقالات البحثية كاملة ✓</span>
                ) : (
                  <span className="text-rose-500">ناقص ورقة علمية منشورة</span>
                )}
              </div>
            </div>
          )}

          {/* 5. Clearance Status Metric */}
          <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-stone-50">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-2.5 rounded-xl border",
                check.clearanceCompleted ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
              )}>
                {check.clearanceCompleted ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              </div>
              <div>
                <h5 className="font-black text-sm text-slate-800">براءة الذمة الشاملة (المالية، المكتبات، المعامل)</h5>
                <p className="text-xs font-medium text-stone-400">{check.clearanceDetails}</p>
              </div>
            </div>
            <div className="text-left font-black text-sm text-slate-700">
              {check.clearanceCompleted ? (
                <span className="text-emerald-600">براءة ذمة تامة ومستوفاة ✓</span>
              ) : (
                <span className="text-amber-500">قيد المراجعة الإدارية</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AcademicActionsTab = ({ student, onUpdate }: { student: Student; onUpdate?: (student: Student) => void }) => {
  const [subTab, setSubTab] = useState<'status' | 'withdraw' | 'incomplete'>('status');
  const [freezeReason, setFreezeReason] = useState('PERSONAL');
  const [selectedWithdrawCourseId, setSelectedWithdrawCourseId] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('LOAD');
  const [resolveScores, setResolveScores] = useState<Record<string, number>>({});
  
  const currentUser = getCurrentUser();
  const isAdminOrRegistrar = currentUser && [
    UserRole.SUPER_ADMIN, 
    UserRole.REGISTRATION_OFFICER, 
    UserRole.ACADEMIC_REGISTRAR, 
    UserRole.DEPT_HEAD
  ].includes(currentUser.effectiveRole || currentUser.role as any);

  const courses = getCourses();
  const settings = getSystemSettings();
  const currentSemester = settings.currentSemester || 'خريف 2024';

  // 1. RE-REGISTERING / ENROLLMENT RENEWAL
  const handleRenewEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrRegistrar) {
      notifyError('غير مصرح لك بإجراء هذه العملية');
      return;
    }

    const updated: Student = {
      ...student,
      status: StudentStatus.ACTIVE,
    };
    saveStudent(updated);

    logAction(
      'STUDENT_RENEWAL',
      `تجديد قيد الطالب: تم تجديد قيد الطالب ${student.name} (${student.id}) للترم الدراسي ${currentSemester} واعتبار حالته نشطاً بعد مراجعة الرسوم والذمة المالية`,
      'info',
      currentUser?.name || 'Academic Registrar'
    );

    notifySuccess('تم تجديد قيد الطالب بنجاح وتحويل حالته إلى (نشط)');
    onUpdate?.(updated);
  };

  // 2. ACADEMIC SUSPENSION / LEAVE OF ABSENCE
  const handleFreezeSemester = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrRegistrar) {
      notifyError('غير مصرح لك بإجراء هذه العملية');
      return;
    }

    const updated: Student = {
      ...student,
      status: StudentStatus.SUSPENDED,
    };
    saveStudent(updated);

    const reasonsMap: Record<string, string> = {
      PERSONAL: 'ظروف شخصية عائلية',
      MEDICAL: 'حالة طبية أو صحية طارئة',
      MILITARY: 'تأدية الخدمة الوطنية/العسكرية الإلزامية',
      FINANCIAL: 'عائق مالي أو عدم سداد الرسوم',
    };

    logAction(
      'STUDENT_FREEZE',
      `إيقاف قيد الطالب: تم تجميد وإيقاف قيد الطالب ${student.name} (${student.id}) بطلب رسمي للترم ${currentSemester}. السبب: ${reasonsMap[freezeReason] || freezeReason}`,
      'info',
      currentUser?.name || 'Academic Registrar'
    );

    notifySuccess('تم تجميد وإيقاف قيد الطالب بنجاح للترم الحالي!');
    onUpdate?.(updated);
  };

  // 3. COURSE WITHDRAWAL (PARTIAL)
  const handlePartialWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrRegistrar) {
      notifyError('غير مصرح لك بإجراء هذه العملية');
      return;
    }

    if (!selectedWithdrawCourseId) {
      notifyError('يرجى تحديد المقرّر المطلوب الانسحاب منه');
      return;
    }

    // Verify minimum credits rule under Regulation 501
    const targetCourse = student.grades.find(g => g.courseId === selectedWithdrawCourseId);
    if (!targetCourse) return;

    const currentActiveGrades = student.grades.filter(g => !g.isWithdrawn && g.semester === currentSemester);
    const activeCourseDefinitions = currentActiveGrades.map(g => courses.find(c => c.id === g.courseId)).filter(Boolean);
    const totalActiveCredits = activeCourseDefinitions.reduce((sum, c) => sum + (c?.credits || 3), 0);
    const targetCourseCredits = courses.find(c => c.id === selectedWithdrawCourseId)?.credits || 3;

    if (totalActiveCredits - targetCourseCredits < 9) {
      notifyError('لا يمكن إسقاط المقرر! الانسحاب الجزئي سيجعل العبء الدراسي يتدنى عن الحد الأدنى وهو 9 ساعات مضافة');
      return;
    }

    const updatedGrades = student.grades.map(g => {
      if (g.courseId === selectedWithdrawCourseId) {
        return {
          ...g,
          isWithdrawn: true,
          score: 0,
          midtermScore: 0,
          finalScore: 0,
          totalScore: 0,
          withdrawalDate: new Date().toISOString().split('T')[0]
        };
      }
      return g;
    });

    const newGpa = calculateWeightedGPA(updatedGrades, courses);

    const updated: Student = {
      ...student,
      grades: updatedGrades,
      gpa: newGpa,
    };
    saveStudent(updated);

    const courseName = targetCourse.courseName || selectedWithdrawCourseId;
    logAction(
      'PARTIAL_WITHDRAWAL',
      `انسحاب جزئي: تم إسقاط ولرصد "منسحب - W" للطالب ${student.name} في مقرر ${courseName} (${targetCourse.courseCode || ''})`,
      'info',
      currentUser?.name || 'Academic Registrar'
    );

    notifySuccess('تم إسقاط المقرر ورصد النتيجة (منسحب W) بنجاح!');
    setSelectedWithdrawCourseId('');
    onUpdate?.(updated);
  };

  // 4. SEMESTER WITHDRAWAL (TOTAL)
  const handleTotalWithdraw = () => {
    if (!isAdminOrRegistrar) {
      notifyError('غير مصرح لك بإجراء هذه العملية');
      return;
    }

    if (!window.confirm('هل أنت متأكد من تسجيل الانسحاب الكلي للطالب؟ سيؤدي ذلك لإسقاط جميع المقررات المسجلة حالياً برمز W وتحويل حالة الطالب الدائمة.')) {
      return;
    }

    const updatedGrades = student.grades.map(g => {
      if (g.semester === currentSemester) {
        return {
          ...g,
          isWithdrawn: true,
          score: 0,
          midtermScore: 0,
          finalScore: 0,
          totalScore: 0,
          withdrawalDate: new Date().toISOString().split('T')[0]
        };
      }
      return g;
    });

    const newGpa = calculateWeightedGPA(updatedGrades, courses);

    const updated: Student = {
      ...student,
      status: StudentStatus.WITHDRAWN,
      grades: updatedGrades,
      gpa: newGpa,
    };
    saveStudent(updated);

    logAction(
      'TOTAL_WITHDRAWAL',
      `انسحاب كلي: تم إنسحاب الطالب ${student.name} كلياً من الفصل ${currentSemester} ورصد تقدير W لكافة المواد المسجلة`,
      'info',
      currentUser?.name || 'Academic Registrar'
    );

    notifySuccess('تم الانسحاب الكلي للطالب ورصد التقديرات بنجاح!');
    onUpdate?.(updated);
  };

  // 5. RESOLVE INCOMPLETE "IC" GRADE
  const handleResolveIncomplete = (courseId: string) => {
    if (!isAdminOrRegistrar) {
      notifyError('غير مصرح لك بإجراء هذه العملية');
      return;
    }

    const score = resolveScores[courseId];
    if (score === undefined || score < 0 || score > 100) {
      notifyError('يرجى تحديد درجة صحيحة مجمعة بين 0 و 100% لتصفية المقرر');
      return;
    }

    const updatedGrades = student.grades.map(g => {
      if (g.courseId === courseId) {
        return {
          ...g,
          score: score,
          totalScore: score,
          midtermScore: g.midtermScore || 0,
          finalScore: score - (g.midtermScore || 0) < 0 ? 0 : score - (g.midtermScore || 0),
          isIncomplete: false,
          incompleteResolved: true,
        };
      }
      return g;
    });

    const newGpa = calculateWeightedGPA(updatedGrades, courses);

    const updated: Student = {
      ...student,
      grades: updatedGrades,
      gpa: newGpa,
    };
    saveStudent(updated);

    const targetGrade = student.grades.find(g => g.courseId === courseId);
    logAction(
      'RESOLVE_INCOMPLETE',
      `تصفية نتيجة غير مكتمل: تم تسوية ورصد الدرجة النهائية (${score}%) لمادة ${targetGrade?.courseName || courseId} للطالب ${student.name}`,
      'info',
      currentUser?.name || 'Academic Registrar'
    );

    notifySuccess('تم تسوية واعتماد النتيجة النهائية بدلاً من تقدير غير المكمل!');
    onUpdate?.(updated);
  };

  // Fetch current non-withdrawn courses for the current semester
  const activeSemesterGrades = student.grades.filter(g => g.semester === currentSemester && !g.isWithdrawn);
  
  // Fetch unresolved incomplete (IC) grades
  const incompleteGrades = student.grades.filter(g => g.isIncomplete && !g.incompleteResolved);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-5xl mx-auto p-1 text-right" dir="rtl">
      {/* Banner */}
      <div className="bg-white p-10 rounded-[3.5rem] border border-stone-100 shadow-sm flex flex-col md:flex-row justify-between items-center bg-gradient-to-br from-amber-50/20 to-white gap-6">
        <div>
          <h3 className="text-3xl font-black text-slate-950 tracking-tight">إدارة القيود والانسحابات الأكاديمية</h3>
          <p className="text-stone-400 mt-2 font-black text-xs uppercase tracking-widest opacity-80">
            لائحة 501 • تجميد القيد، تجديده، وإسقاط وتصفية المواد
          </p>
        </div>
        <div className="p-4 bg-amber-50 rounded-2xl text-amber-600">
          <ShieldAlert size={40} />
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex border-b border-stone-200 gap-8 pb-2">
        <button
          onClick={() => setSubTab('status')}
          className={cn(
            "pb-3 text-xs font-black transition-all relative border-b-2 uppercase tracking-wide",
            subTab === 'status' ? "text-indigo-600 border-indigo-600 font-black" : "text-stone-400 border-transparent hover:text-stone-800"
          )}
        >
          تجديد وإيقاف القيد
        </button>
        <button
          onClick={() => setSubTab('withdraw')}
          className={cn(
            "pb-3 text-xs font-black transition-all relative border-b-2 uppercase tracking-wide",
            subTab === 'withdraw' ? "text-indigo-600 border-indigo-600 font-black" : "text-stone-400 border-transparent hover:text-stone-800"
          )}
        >
          الانسحاب الجزئي والكلي
        </button>
        <button
          onClick={() => setSubTab('incomplete')}
          className={cn(
            "pb-3 text-xs font-black transition-all relative border-b-2 uppercase tracking-wide",
            subTab === 'incomplete' ? "text-indigo-600 border-indigo-600 font-black" : "text-stone-400 border-transparent hover:text-stone-800"
          )}
        >
          تصفية غير المكمل (IC)
          {incompleteGrades.length > 0 && (
            <span className="mr-2 px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] rounded-full font-black font-mono">
              {incompleteGrades.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab CONTENT: Status Management */}
      {subTab === 'status' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: State Indicator & Enrollment Renewal */}
          <div className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-4">حالة قيد الطالب الحالية</span>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-150 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-lg text-slate-900">{student.name}</h4>
                  <p className="text-xs font-medium text-slate-500 mt-1">الرقم الدراسي: {student.id}</p>
                </div>
                <span className={cn(
                  "px-4 py-2 rounded-full text-xs font-black border",
                  student.status === StudentStatus.ACTIVE && "bg-emerald-50 text-emerald-700 border-emerald-100",
                  student.status === StudentStatus.SUSPENDED && "bg-amber-50 text-amber-700 border-amber-100",
                  student.status === StudentStatus.WITHDRAWN && "bg-rose-50 text-rose-700 border-rose-100",
                  student.status === StudentStatus.WARNING && "bg-rose-50 text-rose-700 border-rose-100",
                  student.status === StudentStatus.GRADUATED && "bg-purple-50 text-purple-700 border-purple-100"
                )}>
                  {student.status}
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-100">
              <h5 className="font-black text-sm text-slate-800 mb-2">تجديد القيد وتنزيل المقررات</h5>
              <p className="text-xs text-stone-450 leading-relaxed mb-6">
                بموجب المادة 61، يُتاح للطالب تجديد قيده الأكاديمي وتفعيل حسابه بعد تبرئة ذمته المالية. سيتحول موقف الطالب فوراً إلى (نشط).
              </p>

              {student.status === StudentStatus.ACTIVE ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-bold flex items-center gap-3">
                  <CheckCircle2 size={16} />
                  <span>قيد الطالب نشط ومحدّد بالكامل للفصل الحالي {currentSemester}.</span>
                </div>
              ) : (
                <form onSubmit={handleRenewEnrollment}>
                  <button
                    type="submit"
                    className="w-full py-4 bg-indigo-650 hover:bg-slate-950 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-600/10 transition-colors flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <CheckCheck size={16} />
                    <span>تجديد قيد الطالب وتنشيط الملف</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Card 2: Freeze Semester (إيقاف القيد) */}
          <div className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-4">طلب إيقاف القيد الأكاديمي (Semester Freeze)</span>
              <p className="text-xs text-stone-450 leading-relaxed mb-6">
                تنص المادة 64 على جواز إيقاف قيد الطالب وتأجيل الفصل الدراسي بحد أقصى مسموح به (فصلين متتاليين أو 3 متقطعة). يُحفظ للطالب سجله مع إيقاف درجات الفصل.
              </p>
            </div>

            <form onSubmit={handleFreezeSemester} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">سبب إيقاف القيد</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                  value={freezeReason}
                  onChange={e => setFreezeReason(e.target.value)}
                >
                  <option value="PERSONAL">عذر شخصي / ظروف عائلية قاهرة</option>
                  <option value="MEDICAL">حالة صحية أو تقرير طبي مصدق من الكلية</option>
                  <option value="MILITARY">تأدية الواجب أو الخدمة العسكرية الإلزامية</option>
                  <option value="FINANCIAL">صعوبات مالية أو عجز عن دفع الرسوم</option>
                </select>
              </div>

              <div className="pt-4">
                {student.status === StudentStatus.SUSPENDED ? (
                  <div className="p-4 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl text-xs font-bold flex items-center gap-3">
                    <Info size={16} />
                    <span>قيد الطالب موقوف حالياً (مجمد الفصل).</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                  >
                    <span>تجميد وإيقاف القيد للفصل الحالي</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab CONTENT: Withdrawals */}
      {subTab === 'withdraw' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Box 1: Partial Course Withdrawal */}
          <div className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-4">الانسحاب الجزئي من مادة (Course Drop)</span>
              <p className="text-xs text-stone-450 leading-relaxed mb-6">
                المادة 68: إسقاط مقرر دراسي أو أكثر خلال الفترة المعلنة. يشترط ألا يقل العبء المتبقي بعد الإسقاط عن الحد الأدنى وهو (9 ساعات معتمدة) للتسجيل. تُسجل النتيجة كـ (W).
              </p>
            </div>

            {activeSemesterGrades.length === 0 ? (
              <div className="p-6 bg-slate-50 text-slate-400 text-center rounded-2xl text-xs font-medium border border-dashed border-slate-200">
                لا يوجد مواد مسجلة نشطة ومتاحة للانسحاب الجزئي للترم {currentSemester}.
              </div>
            ) : (
              <form onSubmit={handlePartialWithdraw} className="space-y-4 pt-4 border-t border-stone-100">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">حدد المادة لإسقاطها</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    value={selectedWithdrawCourseId}
                    onChange={e => setSelectedWithdrawCourseId(e.target.value)}
                  >
                    <option value="">-- اختر مادة من المسجلة --</option>
                    {activeSemesterGrades.map(g => (
                      <option key={g.courseId} value={g.courseId}>
                        {g.courseName} ({g.courseCode || g.courseId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">مبرر الانسحاب</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    value={withdrawReason}
                    onChange={e => setWithdrawReason(e.target.value)}
                  >
                    <option value="LOAD">تخفيف العبء الدراسي المضاف</option>
                    <option value="CONFLICT">تعارض في المواعيد أو ظروف عمل</option>
                    <option value="HEALTH">ظروف صحية أو طبية</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-4 bg-indigo-50 border border-indigo-200 hover:bg-slate-900 hover:text-white text-indigo-700 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    انسحاب مع رصد التقدير W للمصنّف
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Box 2: Total Semester Withdrawal */}
          <div className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-4">الانسحاب الكلي من الترم الدراسي</span>
              <p className="text-xs text-stone-450 leading-relaxed mb-6">
                يجوز للطالب التقدم بطلب إيقاف كلي للترم الحالي. سيؤدي هذا لتنزيل رتبة الطالب لـ (منسحب W) لجميع المواد، دون أن تؤثر هذه المواد على معدل درجاته التراكمي بموجب القانون.
              </p>
            </div>

            <div className="pt-6 border-t border-stone-100 space-y-4">
              <div className="p-4 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs font-bold">
                تنبيه: الانسحاب الكلي يؤدي إلى وسم الفصل الدراسي كاملاً كـ منسحب. يجب تقديمه قبل الأسبوع الحادي عشر من انطلاق الدراسة كحد أقصى.
              </div>

              {student.status === StudentStatus.WITHDRAWN ? (
                <div className="p-4 bg-stone-150 text-stone-500 rounded-xl text-xs font-bold text-center">
                  حالة الطالب الحالية (منسحب بالكامل).
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTotalWithdraw}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-rose-500/10"
                >
                  تأكيد الانسحاب الكلي للترم {currentSemester}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab CONTENT: IC Resolver */}
      {subTab === 'incomplete' && (
        <div className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h4 className="font-extrabold text-sm text-slate-900"> تسوية وتصفية تقديرات "غير المكتمل" (Incomplete Grade - IC) </h4>
            <p className="text-xs text-stone-400 leading-relaxed mt-1">
              المادة 72: يحق للطالب الغائب بعذر مقبول عن النهائي مع حصوله وتجاوزه 60% في أعمال السنة الحصول على (IC). تجرى له التصفية خلال أسبوعين من الترم التالي وإلا اعتبر راسباً تلقائياً.
            </p>
          </div>

          {incompleteGrades.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 border border-slate-150 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-xs font-black text-slate-500">لا يوجد مقررات معلقة موسومة بـ "غير مكتمل" (IC) لهذا الطالب.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {incompleteGrades.map((g, i) => (
                <div key={g.courseId} className="p-6 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-100 rounded-md">غير مكتمل IC</span>
                    <h5 className="font-black text-slate-800 text-sm mt-1.5">{g.courseName}</h5>
                    <p className="text-stone-400 font-mono text-[10px] mt-1">رمز المساق: {g.courseCode || g.courseId} • الفصل: {g.semester}</p>
                    <p className="text-xs text-stone-500 font-semibold mt-1">أعمال السنة المرصودة: {g.midtermScore || 0}% </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left select-none">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">الدرجة النهائية المجمّعة (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0-100"
                        className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                        value={resolveScores[g.courseId] ?? ''}
                        onChange={e => setResolveScores(prev => ({ ...prev, [g.courseId]: Number(e.target.value) }))}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResolveIncomplete(g.courseId)}
                      className="px-5 py-3.5 bg-indigo-600 hover:bg-slate-950 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>رصد تصفية المادة</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDetails;
