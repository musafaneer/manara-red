
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Search, Info, Plus, Trash2, Save, X, Edit2, BarChart2, Users, FileSpreadsheet, GraduationCap, LayoutGrid, Sparkles, Wand2, Loader2, ChevronLeft, Printer } from 'lucide-react';
import { getCourses, saveCourse, deleteCourse, getStudents, saveStudent, getSystemSettings, getDepartmentName } from '../services/storageService';
import { calculateWeightedGPA, evaluateAcademicStatus } from '../services/gradingService';
import { Course, Student, Permission, ProgramType } from '../types';
import { logAction } from '../services/auditService';
import { notifySuccess, notifyError, notifyInfo } from '../services/notificationService';
import { getCurrentUser, hasPermission } from '../services/authService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getSmartInsights } from '../services/geminiService';

import Modal from './ui/Modal';
import SecurePrintWrapper from './ui/SecurePrintWrapper';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { Language, getTranslation } from '../services/i18nService';

interface AcademicsProps {
  language?: Language;
}

const Academics: React.FC<AcademicsProps> = ({ language = 'ar' }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const currentUser = getCurrentUser();
  
  // Specific Permissions
  const canManageAcademics = hasPermission(currentUser, Permission.ACADEMICS_MANAGE);
  const canEditGrades = hasPermission(currentUser, Permission.GRADES_EDIT);
  
  // Modal State for Course Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // AI Assistant State
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedCourseForAI, setSelectedCourseForAI] = useState<Course | null>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Modal State for Batch Grading
  const [isBatchGradeOpen, setIsBatchGradeOpen] = useState(false);
  const [selectedCourseForGrading, setSelectedCourseForGrading] = useState<Course | null>(null);
  const [batchGrades, setBatchGrades] = useState<Record<string, number>>({});
  const [currentSemester, setCurrentSemester] = useState('');
  const [batchSearchTerm, setBatchSearchTerm] = useState('');
  const [batchFilterStatus, setBatchFilterStatus] = useState<'ALL' | 'UNGRADED' | 'FAILED'>('ALL');

  // Form State
  const [currentCourse, setCurrentCourse] = useState<Partial<Course>>({
    name: '',
    code: '',
    credits: 3,
    semester: 1,
    programType: ProgramType.UNDERGRADUATE
  });

  useEffect(() => {
    refreshData();
    const settings = getSystemSettings();
    setCurrentSemester(settings.currentSemester);
  }, []);

  const refreshData = () => {
    setCourses(getCourses());
    setStudents(getStudents());
  };

  const handleOpenAdd = () => {
      setIsEditMode(false);
      setCurrentCourse({ name: '', code: '', credits: 3, semester: 1, programType: ProgramType.UNDERGRADUATE });
      setIsModalOpen(true);
  };

  const handleOpenEdit = (course: Course) => {
      setIsEditMode(true);
      setCurrentCourse({ ...course });
      setIsModalOpen(true);
  };

  const handleOpenBatchGrading = (course: Course) => {
      setSelectedCourseForGrading(course);
      setBatchSearchTerm('');
      setBatchFilterStatus('ALL');
      
      const initialGrades: Record<string, number> = {};
      students.forEach(s => {
          const existingGrade = s.grades.find(g => g.courseId === course.id);
          if (existingGrade) {
              initialGrades[s.id] = existingGrade.score;
          }
      });
      setBatchGrades(initialGrades);
      setIsBatchGradeOpen(true);
  };

  const handleSaveBatchGrades = () => {
      if (!selectedCourseForGrading) return;

      if (!currentSemester) {
          notifyError(language === 'ar' ? 'يرجى تحديد الفصل الدراسي الحالي في الإعدادات أولاً.' : 'Please define the current semester in settings first.');
          return;
      }

      const invalidGrades = Object.values(batchGrades).filter(score => 
          score !== undefined && score !== null && (score < 0 || score > 100)
      );

      if (invalidGrades.length > 0) {
          notifyError(language === 'ar' ? 'يرجى التأكد من أن جميع الدرجات تقع في النطاق المسموح به (0-100).' : 'Please ensure all grades are within the allowed range (0-100).');
          return;
      }

      const settings = getSystemSettings();
      const gradingStage = settings.calendarStages?.find(s => s.key === 'GRADING');
      if (gradingStage && !gradingStage.isUnlocked) {
          notifyError(language === 'ar' ? 'عذراً، نظام رصد الدرجات مغلق حالياً بقرار من إدارة الجامعة.' : 'Sorry, the grading system is currently closed by university administration.');
          return;
      }

      let updatedCount = 0;
      
      students.forEach(student => {
          const newScore = batchGrades[student.id];
          
          if (newScore !== undefined && newScore !== null && !isNaN(newScore)) {
              const existingGradeIndex = student.grades.findIndex(g => g.courseId === selectedCourseForGrading.id);
              const existingGrade = student.grades[existingGradeIndex];

              if (existingGrade && existingGrade.score === newScore) return;

              let updatedGrades = [...student.grades];
              
              if (existingGradeIndex >= 0) {
                  updatedGrades[existingGradeIndex] = {
                      ...existingGrade,
                      score: newScore,
                      semester: currentSemester
                  };
              } else {
                  updatedGrades.push({
                      courseId: selectedCourseForGrading.id,
                      courseName: selectedCourseForGrading.name,
                      score: newScore,
                      semester: currentSemester
                  });
              }

              const newGpa = calculateWeightedGPA(updatedGrades, courses);
              const statusResult = evaluateAcademicStatus(newGpa, student.program, student.status, student.warningsCount);

              const updatedStudent = {
                  ...student,
                  grades: updatedGrades,
                  gpa: newGpa,
                  status: statusResult.status,
                  warningsCount: statusResult.warningsCount
              };
              
              saveStudent(updatedStudent);
              updatedCount++;
          }
      });

      if (updatedCount > 0) {
          logAction(
              language === 'ar' ? 'رصد درجات جماعي' : 'Batch Grading',
              language === 'ar' ? `تم تحديث درجات ${updatedCount} طالب في المقرر ${selectedCourseForGrading.name}` : `Updated grades for ${updatedCount} students in ${selectedCourseForGrading.name}`,
              'info'
          );
          notifySuccess(language === 'ar' ? `تم تحديث سجلات ${updatedCount} طالب بنجاح.` : `Updated ${updatedCount} student records successfully.`);
          refreshData();
      } else {
          notifyInfo(language === 'ar' ? "لم يتم إجراء أي تغييرات." : "No changes were made.");
      }
      setIsBatchGradeOpen(false);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCourse.name || !currentCourse.code) return;

    const course: Course = {
        id: currentCourse.id || currentCourse.code!, 
        code: currentCourse.code!,
        name: currentCourse.name!,
        credits: Number(currentCourse.credits),
        semester: Number(currentCourse.semester),
        programType: currentCourse.programType || ProgramType.UNDERGRADUATE
    };

    saveCourse(course);
    logAction(
        isEditMode ? (language === 'ar' ? 'تعديل مقرر' : 'Modify Course') : (language === 'ar' ? 'إضافة مقرر' : 'Add Course'),
        language === 'ar' ? `تم ${isEditMode ? 'تعديل' : 'إضافة'} المقرر ${course.name} (${course.code})` : `${isEditMode ? 'Modified' : 'Added'} course ${course.name} (${course.code})`,
        'info'
    );
    notifySuccess(isEditMode ? (language === 'ar' ? 'تم تعديل المقرر بنجاح' : 'Course modified successfully') : (language === 'ar' ? 'تم إضافة المقرر بنجاح' : 'Course added successfully'));
    refreshData();
    setIsModalOpen(false);
  };

  const handleDeleteCourse = (id: string) => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المقرر؟ سيؤثر هذا على السجلات التاريخية.' : 'Are you sure you want to delete this course? This will affect historical records.')) {
        const course = courses.find(c => c.id === id);
        deleteCourse(id);
        logAction(language === 'ar' ? 'حذف مقرر' : 'Delete Course', language === 'ar' ? `تم حذف المقرر ${course?.name} (${course?.code})` : `Deleted course ${course?.name} (${course?.code})`, 'danger');
        notifyInfo(language === 'ar' ? 'تم حذف المقرر' : 'Course deleted');
        refreshData();
    }
  };

  const handleOpenAIAssistant = (course: Course) => {
    setSelectedCourseForAI(course);
    setIsAIModalOpen(true);
    setAiResponse('');
  };

  const generateSyllabus = async () => {
    if (!selectedCourseForAI) return;
    setIsAiLoading(true);
    try {
        const prompt = language === 'ar' ? 
        `بناءً على اللائحة 501 لنظام الدراسات العليا والجامعية، قم بإنشاء مقترح لمفردات (Syllabus) للمقرر التالي:
        اسم المقرر: ${selectedCourseForAI.name}
        الرمز: ${selectedCourseForAI.code}
        عدد الوحدات: ${selectedCourseForAI.credits}
        المستوى: ${selectedCourseForAI.programType}
        
        يجب أن يتضمن المقترح:
        1. وصف المقرر
        2. الأهداف التعليمية
        3. توزيع الأسابيع الدراسية (14 أسبوع)
        4. توزيع الدرجات (أعمال فصل، امتحان نهائي) حسب اللائحة.
        5. المراجع المقترحة.
        أجب باللغة العربية بأسلوب أكاديمي رصين.` :
        `Based on Regulation 501 for Graduate and Undergraduate systems, generate a syllabus proposal for the following course:
        Course Name: ${selectedCourseForAI.name}
        Code: ${selectedCourseForAI.code}
        Credits: ${selectedCourseForAI.credits}
        Level: ${selectedCourseForAI.programType}
        
        The proposal must include:
        1. Course Description
        2. Learning Objectives
        3. Weekly Schedule (14 weeks)
        4. Grade Distribution (Coursework, Final Exam) according to regulations.
        5. Suggested References.
        Reply in English with a professional academic tone.`;

        const response = await getSmartInsights(prompt);
        setAiResponse(response);
    } catch (error) {
        notifyError(language === 'ar' ? 'فشل المحرك الذكي في توليد المقترح.' : 'AI failed to generate syllabus proposal.');
    } finally {
        setIsAiLoading(false);
    }
  };
  
  const filteredCourses = courses.filter(c => 
    c.name.includes(searchTerm) || c.code.includes(searchTerm)
  );

  const getCourseStats = (courseId: string) => {
      let count = 0;
      let totalScore = 0;
      let passCount = 0;

      students.forEach(student => {
          const grade = student.grades.find(g => g.courseId === courseId);
          if (grade) {
              count++;
              totalScore += grade.score;
              const passingScore = student.program === ProgramType.POSTGRADUATE ? 65 : 50; 
              if (grade.score >= passingScore) passCount++;
          }
      });

      return {
          count,
          avg: count > 0 ? (totalScore / count).toFixed(1) : '-',
          passRate: count > 0 ? Math.round((passCount / count) * 100) : 0
      };
  };

  return (
    <div className={cn("p-10 space-y-12", language === 'ar' ? "text-right" : "text-left")} dir={language === 'ar' ? "rtl" : "ltr"}>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-stone-900 rounded-[1.5rem] text-white shadow-2xl border border-stone-800">
                <BookOpen size={32} className="text-brand-500" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight uppercase">
                {language === 'ar' ? 'حوكمة المناهج' : 'Curriculum Governance'}
              </h2>
              <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">
                {language === 'ar' ? 'فهرس المقررات المؤسسي والمحاذاة مع السياسات' : 'Institutional Course Catalog & Policy Alignment'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center">
            <button 
                onClick={() => {
                  const printEvent = new CustomEvent('trigger-secure-print-academics');
                  window.dispatchEvent(printEvent);
                }}
                className="bg-white text-stone-600 px-8 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-sm hover:bg-stone-50 transition-all flex items-center gap-3 border border-stone-200"
            >
                <Printer size={20} />
                <span>{language === 'ar' ? 'طباعة' : 'Print'}</span>
            </button>
            {canManageAcademics && (
                <button 
                    onClick={handleOpenAdd}
                    className="bg-stone-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-stone-800"
                >
                    <Plus size={20} className="text-brand-500" />
                    <span>{language === 'ar' ? 'تهيئة مقرر جديد' : 'Initialize New Course'}</span>
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
            whileHover={{ y: -5 }}
            className="bg-stone-50 border border-stone-200 p-10 rounded-[3rem] shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-2.5 bg-stone-200 rounded-xl text-stone-900">
                <GraduationCap size={20} />
            </div>
            <h3 className="font-black text-stone-900 uppercase tracking-widest text-xs">
              {language === 'ar' ? 'معايير البكالوريوس' : 'Undergraduate Standards'}
            </h3>
          </div>
          <p className="text-sm text-stone-500 leading-relaxed font-medium">
            {language === 'ar' ? (
                <>تم تحديد عتبة النجاح الإلزامية للمقررات المعيارية لدرجة البكالوريوس عند <strong className="text-stone-900 text-lg">50%</strong>. يعتمد حساب المعدل التراكمي على الوحدات المعتمدة.</>
            ) : (
                <>The mandatory pass threshold for standardized undergraduate modules is established at <strong className="text-stone-900 text-lg">50%</strong>. GPA calculation is governed by verified unit achievement.</>
            )}
          </p>
          <div className="absolute -bottom-4 -right-4 opacity-5">
            <GraduationCap size={120} />
          </div>
        </motion.div>
        <motion.div 
            whileHover={{ y: -5 }}
            className="bg-stone-900 border border-stone-800 p-10 rounded-[3rem] shadow-xl relative overflow-hidden"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-2.5 bg-brand-500 rounded-xl text-white">
                <LayoutGrid size={20} />
            </div>
            <h3 className="font-black text-white uppercase tracking-widest text-xs">
              {language === 'ar' ? 'معايير الدراسات العليا' : 'Postgraduate Standards'}
            </h3>
          </div>
          <p className="text-sm text-stone-400 leading-relaxed font-medium">
            {language === 'ar' ? (
                <>يتطلب التميز الأكاديمي المتقدم عتبة نجاح لا تقل عن <strong className="text-brand-500 text-lg">65%</strong>. الأداء دون هذه العتبة يتطلب إعادة التسجيل الإلزامية في المقرر.</>
            ) : (
                <>Advanced academic excellence requires a minimum pass threshold of <strong className="text-brand-500 text-lg">65%</strong>. Sub-threshold performance necessitates mandatory curriculum re-enrollment.</>
            )}
          </p>
          <div className="absolute -bottom-4 -right-4 opacity-10">
            <LayoutGrid size={120} className="text-brand-500" />
          </div>
        </motion.div>
        <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white border border-stone-200 p-10 rounded-[3rem] shadow-sm flex flex-col justify-center items-center text-center group"
        >
            <span className="text-6xl font-black text-stone-900 mb-3 group-hover:scale-110 transition-transform tabular-nums">{courses.length}</span>
            <span className="text-stone-400 font-black text-[10px] uppercase tracking-[0.3em]">
              {language === 'ar' ? 'مقرر مؤسسي مسجل' : 'Institutional Modules Cataloged'}
            </span>
        </motion.div>
      </div>

      <SecurePrintWrapper
        documentId="academics-catalog"
        title={language === 'ar' ? 'فهرس المقررات المعتمد' : 'Approved Curriculum Catalog'}
        triggerId="trigger-secure-print-academics"
      >
        <div className="bg-white rounded-[3rem] shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-8 bg-stone-50 border-b border-stone-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="font-black text-stone-900 text-lg uppercase tracking-tight">
                {language === 'ar' ? 'فهرس المناهج' : 'Curriculum Inventory'}
              </h3>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1">
                {language === 'ar' ? 'مطابقة مقاييس الأداء وتكافؤ المخرجات' : 'Cross-referencing performance metrics & performance parity'}
              </p>
            </div>
            <div className="relative w-full md:w-96">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 text-stone-400", language === 'ar' ? "right-4" : "left-4")} size={18} />
              <input 
                type="text" 
                placeholder={language === 'ar' ? 'ابحث عن مقرر بالاسم أو الرمز...' : 'Search module by title or code...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                    "w-full py-4 rounded-2xl bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-700 placeholder:text-stone-300 placeholder:font-medium",
                    language === 'ar' ? "pr-12 pl-6" : "pl-12 pr-6"
                )}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
              <table className={cn("w-full", language === 'ar' ? "text-right" : "text-left")}>
                <thead className="bg-stone-50 text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-stone-100">
                  <tr>
                    <th className="px-10 py-6">{language === 'ar' ? 'هوية المقرر' : 'Module Identity'}</th>
                    <th className="px-10 py-6">{language === 'ar' ? 'الوحدات المعتمدة' : 'Credit Units'}</th>
                    <th className="px-10 py-6">{language === 'ar' ? 'الفصل الدراسي' : 'Semester'}</th>
                    <th className="px-10 py-6">{language === 'ar' ? 'عتبة النجاح' : 'Threshold'}</th>
                    <th className="px-10 py-6">{language === 'ar' ? 'التحليلات' : 'Analytics'}</th>
                    <th className="px-10 py-6">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  <AnimatePresence mode="popLayout">
                      {filteredCourses.map((course) => {
                        const isPostgrad = course.programType === ProgramType.POSTGRADUATE; 
                        const stats = getCourseStats(course.id);
                        
                        return (
                          <motion.tr 
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              key={course.id} 
                              className="hover:bg-stone-50 group transition-colors"
                          >
                            <td className="px-10 py-8">
                                <div className="font-black text-stone-900 uppercase tracking-tight">{course.name}</div>
                                <div className="text-[10px] text-stone-400 font-black tracking-widest mt-1.5">{course.code}</div>
                            </td>
                            <td className="px-10 py-8 text-stone-600 font-bold tabular-nums">{course.credits}</td>
                            <td className="px-10 py-8 text-stone-600 font-bold tabular-nums">{course.semester}</td>
                            <td className="px-10 py-8">
                              <span className={cn(
                                  "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                  isPostgrad ? 'bg-stone-900 text-white border border-stone-800' : 'bg-stone-100 text-stone-600 border border-stone-200'
                              )}>
                                  {isPostgrad ? '65%' : '50%'}
                              </span>
                            </td>
                            <td className="px-10 py-8">
                                <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest">
                                    <div className="flex items-center gap-2.5 text-stone-400" title={language === 'ar' ? 'عدد المسجلين' : 'Enrollment Count'}>
                                        <Users size={16} />
                                        <span className="text-stone-600 tabular-nums">{stats.count}</span>
                                    </div>
                                    {stats.count > 0 && (
                                      <div className="flex items-center gap-2.5 text-stone-400" title={language === 'ar' ? 'متوسط الدرجات' : 'Average Score'}>
                                          <BarChart2 size={16} />
                                          <span className="text-stone-600 tabular-nums">%{stats.avg}</span>
                                      </div>
                                    )}
                                </div>
                                {stats.count > 0 && (
                                    <div className="w-40 bg-stone-100 h-1.5 rounded-full mt-4 overflow-hidden border border-stone-200/50" title={language === 'ar' ? `نسبة النجاح: ${stats.passRate}%` : `Pass Rate: ${stats.passRate}%`}>
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${stats.passRate}%` }}
                                          className={cn(
                                              "h-full rounded-full transition-all",
                                              stats.passRate >= 75 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 
                                              stats.passRate >= 50 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 
                                              'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                                          )}
                                        />
                                    </div>
                                )}
                            </td>
                            <td className="px-10 py-8">
                                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                  {canEditGrades && (
                                      <button 
                                          onClick={() => handleOpenBatchGrading(course)}
                                          className="p-3 text-stone-600 hover:bg-stone-100 rounded-xl transition-all hover:scale-110 active:scale-95"
                                          title={language === 'ar' ? 'واجهة رصد الدرجات المؤسسية' : 'Institutional Grading Interface'}
                                      >
                                          <FileSpreadsheet size={18} />
                                      </button>
                                  )}
                                  {canManageAcademics && (
                                      <>
                                          <button 
                                              onClick={() => handleOpenAIAssistant(course)}
                                              className="p-3 text-brand-600 hover:bg-brand-50 rounded-xl transition-all hover:scale-110 active:scale-95"
                                              title={language === 'ar' ? 'مساعد تحسين المناهج بالذكاء الاصطناعي' : 'AI Curriculum Optimization Assistant'}
                                          >
                                              <Sparkles size={18} />
                                          </button>
                                          <button 
                                              onClick={() => handleOpenEdit(course)}
                                              className="p-3 text-stone-600 hover:bg-stone-100 rounded-xl transition-all hover:scale-110 active:scale-95"
                                              title={language === 'ar' ? 'تعديل المعايير' : 'Edit Parameters'}
                                          >
                                              <Edit2 size={18} />
                                          </button>
                                          <button 
                                              onClick={() => handleDeleteCourse(course.id)}
                                              className="p-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all hover:scale-110 active:scale-95"
                                              title={language === 'ar' ? 'إزالة السجل' : 'Flush Record'}
                                          >
                                              <Trash2 size={18} />
                                          </button>
                                      </>
                                  )}
                                </div>
                            </td>
                          </motion.tr>
                        )
                      })}
                  </AnimatePresence>
                   {filteredCourses.length === 0 && (
                      <tr>
                          <td colSpan={6} className="text-center py-24">
                              <BookOpen size={64} className="mx-auto mb-6 text-stone-100" />
                              <p className="font-black text-stone-300 text-xs uppercase tracking-[0.3em]">
                                {language === 'ar' ? 'لا يوجد مقررات مطابقة في الأرشيف' : 'No corresponding modules located in archives'}
                              </p>
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
          </div>
        </div>
      </SecurePrintWrapper>

      {/* Add/Edit Course Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? (language === 'ar' ? 'تعديل معايير المقرر' : 'Modify Module Parameters') : (language === 'ar' ? 'إضافة مقرر للمنهج' : 'Curriculum Integration')}
        description={language === 'ar' ? 'إدارة المقررات المؤسسية وعتبات الأداء الأكاديمي.' : 'Administer institutional modules and academic performance thresholds.'}
        icon={BookOpen}
        maxWidth="md"
        footer={
            <div className="flex justify-end gap-4 p-2">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-4 text-stone-400 font-black uppercase tracking-widest text-[10px] hover:bg-stone-50 rounded-2xl transition-all"
                >
                    {language === 'ar' ? 'إلغاء الإجراء' : 'Cancel Action'}
                </button>
                <button 
                    onClick={() => {
                        const form = document.getElementById('course-form') as HTMLFormElement;
                        if (form) form.requestSubmit();
                    }}
                    className="px-12 py-4 bg-stone-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-stone-800"
                >
                    <Save size={18} className="text-brand-500" /> {language === 'ar' ? 'تثبيت في السجل' : 'Commit Registry'}
                </button>
            </div>
        }
      >
        <form id="course-form" onSubmit={handleSaveCourse} className="space-y-8 p-2">
            <div className="space-y-3">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">
                  {language === 'ar' ? 'رمز تعريف المقرر' : 'Module Identification Code'}
                </label>
                <input 
                    required
                    type="text" 
                    disabled={isEditMode} 
                    className={cn(
                        "w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-800 placeholder:text-stone-300",
                        isEditMode && "opacity-50 cursor-not-allowed"
                    )}
                    value={currentCourse.code}
                    onChange={(e) => setCurrentCourse({...currentCourse, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., CS101"
                />
                {isEditMode && <p className="text-[10px] text-red-500 font-black uppercase tracking-tight mt-2">
                  {language === 'ar' ? 'يمنع تعديل الرمز للحفاظ على تكامل البيانات المرتبطة.' : 'Code immutability enforced due to relational integrity constraints.'}
                </p>}
            </div>
            <div className="space-y-3">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">
                  {language === 'ar' ? 'عنوان المقرر الدراسي' : 'Curriculum Module Title'}
                </label>
                <input 
                    required
                    type="text" 
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-800"
                    value={currentCourse.name}
                    onChange={(e) => setCurrentCourse({...currentCourse, name: e.target.value})}
                    placeholder={language === 'ar' ? 'مثال: مقدمة في علوم الحاسب' : 'e.g., Introduction to Computer Science'}
                />
            </div>
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">
                      {language === 'ar' ? 'مستوى البرنامج الأكاديمي' : 'Academic Program Level'}
                    </label>
                    <select 
                        className={cn(
                          "w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-800 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-no-repeat",
                          language === 'ar' ? "bg-[left_1.25rem_center]" : "bg-[right_1.25rem_center]"
                        )}
                        value={currentCourse.programType}
                        onChange={(e) => setCurrentCourse({...currentCourse, programType: e.target.value as ProgramType})}
                    >
                        <option value={ProgramType.UNDERGRADUATE}>
                          {language === 'ar' ? 'برنامج البكالوريوس المعياري' : 'Standard Undergraduate Program'}
                        </option>
                        <option value={ProgramType.POSTGRADUATE}>
                          {language === 'ar' ? 'برنامج الدراسات العليا المتقدم' : 'Advanced Postgraduate Program'}
                        </option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">
                          {language === 'ar' ? 'تخصيص الوحدات' : 'Credit Allocations'}
                        </label>
                        <input 
                            required
                            type="number" 
                            min="1"
                            max="10"
                            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-800 tabular-nums"
                            value={currentCourse.credits}
                            onChange={(e) => setCurrentCourse({...currentCourse, credits: parseInt(e.target.value)})}
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">
                          {language === 'ar' ? 'الفصل الدراسي' : 'Academic Semester'}
                        </label>
                        <input 
                            required
                            type="number" 
                            min="1"
                            max="12"
                            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-800 tabular-nums"
                            value={currentCourse.semester}
                            onChange={(e) => setCurrentCourse({...currentCourse, semester: parseInt(e.target.value)})}
                        />
                    </div>
                </div>
            </div>
        </form>
      </Modal>

      {/* AI Intelligence Modal */}
      <Modal
        isOpen={isAIModalOpen && !!selectedCourseForAI}
        onClose={() => setIsAIModalOpen(false)}
        title={language === 'ar' ? 'مهندس المناهج بالذكاء الاصطناعي' : 'AI Curriculum Architect'}
        description={language === 'ar' ? `توليد مواصفات أكاديمية عالمية لمقرر ${selectedCourseForAI?.name} بما يتوافق مع معايير جامعة أوراكل.` : `Generating global academic specification for ${selectedCourseForAI?.name} compliant with Oracle University standards.`}
        icon={Sparkles}
        maxWidth="4xl"
      >
        <div className="space-y-8 p-2">
            {!aiResponse ? (
                <div className="py-20 border-2 border-dashed border-stone-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center px-16 bg-stone-50/50 shadow-inner">
                    <div className="w-24 h-24 bg-stone-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl mb-8 border border-stone-800">
                        <Wand2 size={40} className="text-brand-500" />
                    </div>
                    <h4 className="text-2xl font-black text-stone-900 mb-3 uppercase tracking-tight">
                      {language === 'ar' ? 'توليف المناهج بالذكاء الاصطناعي' : 'Oracle AI Curriculum Synthesis'}
                    </h4>
                    <p className="text-stone-500 font-medium mb-10 max-w-md">
                      {language === 'ar' ? 'ستقوم بنيتنا العصبية بتحليل بارامترات المقرر لتوليد منهج شامل متوافق مع معايير التعليم العالمية.' : 'Our neural architecture will analyze module parameters to synthesize a comprehensive syllabus aligned with global educational benchmarks.'}
                    </p>
                    <button 
                        disabled={isAiLoading}
                        onClick={generateSyllabus}
                        className="px-12 py-5 bg-stone-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-4 hover:bg-black transition-all disabled:opacity-50 shadow-2xl border border-stone-800"
                    >
                        {isAiLoading ? <Loader2 className="animate-spin text-brand-500" /> : <Sparkles className="text-brand-500" />}
                        {isAiLoading ? (language === 'ar' ? 'جاري التوليف...' : 'Synthesizing Data...') : (language === 'ar' ? 'بدء التوليف بالذكاء الاصطناعي' : 'Initialize AI Synthesis')}
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className={cn(
                        "p-10 bg-stone-900 border border-stone-800 rounded-[3rem] shadow-2xl prose prose-invert max-w-none prose-p:text-stone-300 prose-headings:text-white prose-p:font-bold prose-headings:font-black whitespace-pre-wrap font-medium text-stone-100 leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar",
                        language === 'ar' ? "text-right" : "text-left"
                    )}>
                        {aiResponse}
                    </div>
                    <div className="flex gap-6">
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(aiResponse);
                                notifySuccess(language === 'ar' ? 'تم نسخ مقترح المنهج للحافظة' : 'Curriculum proposal synchronized to clipboard');
                            }}
                            className="flex-1 py-5 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-[2rem] font-black uppercase tracking-widest text-[10px] transition-all border border-stone-200"
                        >
                            {language === 'ar' ? 'نسخ للحافظة' : 'Sync to Clipboard'}
                        </button>
                        <button 
                            onClick={() => setAiResponse('')}
                            className="flex-1 py-5 bg-stone-900 hover:bg-black text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 border border-stone-800"
                        >
                            <Wand2 size={18} className="text-brand-500" /> {language === 'ar' ? 'إعادة تشغيل المحرك' : 'Re-Initialize Engine'}
                        </button>
                    </div>
                </div>
            )}
        </div>
      </Modal>

      {/* Batch Grade Entry Modal */}
      <Modal
        isOpen={isBatchGradeOpen && !!selectedCourseForGrading}
        onClose={() => setIsBatchGradeOpen(false)}
        title={language === 'ar' ? 'إجراء رصد الدرجات المؤسسي' : 'Institutional Grade Procurement'}
        description={`${selectedCourseForGrading?.name} (${selectedCourseForGrading?.code}) - ${language === 'ar' ? 'الدورة الأكاديمية النشطة' : 'Active Academic Cycle'}: ${currentSemester || (language === 'ar' ? '⚠️ دورة غير محددة (مطلوب إجراء في الإعدادات)' : '⚠️ UNDEFINED CYCLE (Action Required in Settings)')}`}
        icon={FileSpreadsheet}
        maxWidth="6xl"
        footer={
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 w-full p-2">
                <div className="flex items-center gap-3 text-[10px] text-stone-400 font-black uppercase tracking-widest max-w-lg">
                    <div className="p-2 bg-stone-100 text-stone-600 rounded-xl">
                        <Info size={16} />
                    </div>
                    {language === 'ar' ? 'يتم فرض إعادة حساب المعدل التراكمي وتقييم الحالة الأكاديمية تلقائياً عند التثبيت. عتبات الأداء: البكالوريوس (50%) | الدراسات العليا (65%).' : 'Automated GPA recalculation & Academic Status evaluation enforced upon commit. Performance thresholds: Standard (50%) | Postgraduate (65%).'}
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        type="button" 
                        onClick={() => setIsBatchGradeOpen(false)}
                        className="px-8 py-4 text-stone-400 font-black uppercase tracking-widest text-[10px] hover:bg-stone-50 rounded-2xl transition-all"
                    >
                        {language === 'ar' ? 'تجاهل التغييرات' : 'Discard Changes'}
                    </button>
                    <button 
                        onClick={handleSaveBatchGrades}
                        disabled={!currentSemester || Object.values(batchGrades).some(score => score !== undefined && score !== null && (Number(score) < 0 || Number(score) > 100))}
                        className="bg-black text-white px-12 py-5 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-stone-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <Save size={18} className="text-brand-500" /> {language === 'ar' ? 'اعتماد الدرجات' : 'Executive Commitment'}
                    </button>
                </div>
            </div>
        }
      >
        <div className="flex flex-col gap-6 h-full p-2">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-stone-100 p-6 rounded-[2rem] border border-stone-200">
                <div className="relative w-full md:w-96">
                    <Search className={cn("absolute top-1/2 -translate-y-1/2 text-stone-400", language === 'ar' ? "right-4" : "left-4")} size={16} />
                    <input 
                        type="text"
                        placeholder={language === 'ar' ? 'تصفية المرشحين بالاسم أو الرقم الجامعي...' : 'Filter candidates by name or ID...'}
                        value={batchSearchTerm}
                        onChange={(e) => setBatchSearchTerm(e.target.value)}
                        className={cn(
                            "w-full py-3 rounded-xl bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-700 text-xs placeholder:text-stone-300",
                            language === 'ar' ? "pr-12 pl-6" : "pl-12 pr-6"
                        )}
                    />
                </div>
                <div className="flex items-center gap-2 p-1 bg-white rounded-xl border border-stone-200">
                    {(['ALL', 'UNGRADED', 'FAILED'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setBatchFilterStatus(status)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                batchFilterStatus === status 
                                    ? "bg-stone-900 text-white shadow-lg" 
                                    : "text-stone-400 hover:bg-stone-50"
                            )}
                        >
                            {status === 'ALL' ? (language === 'ar' ? 'الكل' : 'ALL') : status === 'UNGRADED' ? (language === 'ar' ? 'غير مرصود' : 'UNGRADED') : (language === 'ar' ? 'راسب' : 'FAILED')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-white border border-stone-200 rounded-[2.5rem] shadow-sm max-h-[60vh] custom-scrollbar">
                <table className={cn("w-full", language === 'ar' ? "text-right" : "text-left")}>
                    <thead className="bg-stone-50 text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-stone-100 sticky top-0 z-10">
                        <tr>
                            <th className="px-10 py-6">{language === 'ar' ? 'هوية المرشح' : 'Candidate Identity'}</th>
                            <th className="px-10 py-6">{language === 'ar' ? 'الرقم الجامعي' : 'Index Code'}</th>
                            <th className="px-10 py-6">{language === 'ar' ? 'السجل الحالي' : 'Legacy Record'}</th>
                            <th className="px-10 py-6 w-56">{language === 'ar' ? 'المدخل الجديد' : 'New Input'}</th>
                            <th className="px-10 py-6 pr-12">{language === 'ar' ? 'حالة التحقق' : 'Validation Status'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                        {students
                            .filter(s => s.enrollments?.some(e => e.courseId === selectedCourseForGrading?.id))
                            .filter(s => {
                                const matchesSearch = s.name.toLowerCase().includes(batchSearchTerm.toLowerCase()) || s.id.includes(batchSearchTerm);
                                if (!matchesSearch) return false;

                                const currentGrade = s.grades.find(g => g.courseId === selectedCourseForGrading?.id);
                                const passingScore = s.program === ProgramType.POSTGRADUATE ? 65 : 50;

                                if (batchFilterStatus === 'UNGRADED') return !currentGrade;
                                if (batchFilterStatus === 'FAILED') return currentGrade && currentGrade.score < passingScore;
                                return true;
                            })
                            .map(student => {
                                const currentGrade = student.grades.find(g => g.courseId === selectedCourseForGrading?.id);
                                const newGrade = batchGrades[student.id];
                                const isDirty = newGrade !== undefined && (!currentGrade || currentGrade.score !== newGrade);
                                const passingScore = student.program === ProgramType.POSTGRADUATE ? 65 : 50;
                                
                                return (
                                    <tr key={student.id} className={cn("hover:bg-stone-50/50 transition-colors group", isDirty && "bg-brand-50/20")}>
                                        <td className="px-10 py-5">
                                            <div className="font-black text-stone-900 group-hover:text-brand-600 transition-colors leading-none">{student.name}</div>
                                            <div className="text-[9px] text-stone-400 font-bold uppercase tracking-widest mt-1.5">{getDepartmentName(student.departmentId)}</div>
                                        </td>
                                        <td className="px-10 py-5 font-black text-stone-400 text-[10px] tracking-widest uppercase tabular-nums">{student.id}</td>
                                        <td className="px-10 py-5">
                                            {currentGrade ? (
                                                <span className={cn(
                                                    "font-black text-[10px] tabular-nums px-3 py-1 rounded-lg border uppercase tracking-widest",
                                                    currentGrade.score >= passingScore ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'
                                                )}>
                                                    {language === 'ar' ? 'مسجل' : 'RECORDED'}: {currentGrade.score}%
                                                </span>
                                            ) : (
                                                <span className="text-stone-300 text-[9px] font-black uppercase tracking-[0.2em]">
                                                  {language === 'ar' ? 'غير_مهيأ' : 'NOT_INITIALIZED'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-10 py-5">
                                            <div className="relative group/input">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    max="100"
                                                    className={cn(
                                                        "w-full bg-stone-50 border border-stone-200 rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 transition-all font-black text-stone-900 text-center tabular-nums shadow-sm",
                                                        newGrade !== undefined && (newGrade < 0 || newGrade > 100) ? "border-red-500 ring-2 ring-red-500/20" : 
                                                        newGrade !== undefined && newGrade >= passingScore ? "focus:ring-emerald-500/20 focus:border-emerald-500" : 
                                                        newGrade !== undefined ? "focus:ring-rose-500/20 focus:border-rose-500" :
                                                        "focus:ring-brand-500/20 focus:border-brand-500"
                                                    )}
                                                    placeholder="0 - 100"
                                                    value={newGrade !== undefined ? newGrade : ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        setBatchGrades(prev => ({
                                                            ...prev,
                                                            [student.id]: isNaN(val) ? undefined : val
                                                        } as any));
                                                    }}
                                                />
                                                <div className={cn(
                                                  "absolute inset-y-0 flex items-center pointer-events-none opacity-0 group-focus-within/input:opacity-100 transition-opacity",
                                                  language === 'ar' ? "left-3" : "right-3"
                                                )}>
                                                    <Edit2 size={12} className="text-stone-300" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-5 pr-12">
                                            {newGrade !== undefined ? (
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-2.5 h-2.5 rounded-full animate-pulse",
                                                        newGrade >= passingScore ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                                                    )} />
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest",
                                                        (newGrade < 0 || newGrade > 100) ? "text-red-500" :
                                                        newGrade >= passingScore ? "text-emerald-600" : "text-rose-600"
                                                    )}>
                                                        {(newGrade < 0 || newGrade > 100) ? (language === 'ar' ? 'نطاق غير صالح' : 'Invalid Range') : 
                                                         newGrade >= passingScore ? (language === 'ar' ? 'نجاح معتمد' : 'Validated Pass') : (language === 'ar' ? 'دون العتبة' : 'Sub-Threshold')}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-stone-300 text-[10px] font-black uppercase tracking-widest italic">{language === 'ar' ? 'في انتظار البيانات' : 'Pending Data'}</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        {students.filter(s => s.enrollments?.some(e => e.courseId === selectedCourseForGrading?.id)).length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-32 text-center bg-stone-50/50">
                                    <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-stone-300">
                                        <Users size={32} />
                                    </div>
                                    <h4 className="font-black text-stone-900 uppercase tracking-tight text-lg mb-2">
                                      {language === 'ar' ? 'لم يتم تحديد مرشحين' : 'No Candidates Identified'}
                                    </h4>
                                    <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.3em]">
                                      {language === 'ar' ? `لم يتم العثور على تسجيلات نشطة في هذا المقرر للدورة ${currentSemester}.` : `No active enrollments synchronized for this sequence in ${currentSemester}.`}
                                    </p>
                                </td>
                            </tr>
                        )}
                        {students.filter(s => s.enrollments?.some(e => e.courseId === selectedCourseForGrading?.id)).length > 0 && 
                         students.filter(s => s.enrollments?.some(e => e.courseId === selectedCourseForGrading?.id)).filter(s => {
                            const matchesSearch = s.name.toLowerCase().includes(batchSearchTerm.toLowerCase()) || s.id.includes(batchSearchTerm);
                            if (!matchesSearch) return false;
                            const currentGrade = s.grades.find(g => g.courseId === selectedCourseForGrading?.id);
                            const passingScore = s.program === ProgramType.POSTGRADUATE ? 65 : 50;
                            if (batchFilterStatus === 'UNGRADED') return !currentGrade;
                            if (batchFilterStatus === 'FAILED') return currentGrade && currentGrade.score < passingScore;
                            return true;
                        }).length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-32 text-center bg-stone-50/50">
                                    <Search size={32} className="mx-auto mb-6 text-stone-200" />
                                    <h4 className="font-black text-stone-900 uppercase tracking-tight text-lg mb-2">
                                      {language === 'ar' ? 'البحث المطور لم يسفر عن نتائج' : 'Refined Search Yielded Null'}
                                    </h4>
                                    <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.3em]">
                                      {language === 'ar' ? 'قم بتعديل المرشحات للعثور على سجلات أكاديمية محددة.' : 'Adjust filters to locate specific academic records.'}
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </Modal>

    </div>
  );
};

export default Academics;
