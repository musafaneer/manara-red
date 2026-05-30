
import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { getStudents, deleteStudent, saveStudent, checkNationalIdExists, bulkSaveStudents, getDepartments, getDepartmentName, getStudentById } from '../services/storageService';
import { Student, StudentStatus, ProgramType, UserRole, Permission, Department, GraduateDegreeLevel, PostgraduatePathway, VerificationStatus } from '../types';
import { 
  Search, Filter, Eye, Trash2, Plus, AlertCircle, X, Save, 
  UserPlus, Edit2, SlidersHorizontal, Download, Upload, 
  Image as ImageIcon, FileSpreadsheet, Users, GraduationCap,
  TrendingUp, ShieldAlert, ChevronDown, MoreVertical, Info,
  PieChart as PieIcon, BarChart3, Activity, CheckCircle2,
  Clock, XCircle, CheckSquare, Square, Maximize2, Minimize2,
  Check, Ban, Printer
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Modal from './ui/Modal';
import FullScreenModal from './FullScreenModal';
import DossierContent from './DossierContent';
import SecurePrintWrapper from './ui/SecurePrintWrapper';
import { notifySuccess, notifyError, notifyInfo } from '../services/notificationService';
import { logAction } from '../services/auditService';
import { getCurrentUser, hasPermission } from '../services/authService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { Language } from '../services/i18nService';

interface StudentsListProps {
  language: Language;
}

const StudentsList: React.FC<StudentsListProps> = ({ language }) => {
  const isAr = language !== 'en';
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const currentUser = getCurrentUser();
  
  // Permissions
  const canEdit = hasPermission(currentUser, Permission.STUDENTS_EDIT);
  const canDelete = hasPermission(currentUser, Permission.STUDENTS_DELETE);
  const canImport = hasPermission(currentUser, Permission.STUDENTS_IMPORT);
  const canExport = hasPermission(currentUser, Permission.STUDENTS_EXPORT);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
      program: 'all',
      status: 'all',
      verification: 'all',
      departmentId: 'all',
      degreeLevel: 'all',
      minGpa: '',
      maxGpa: '',
      year: ''
  });

  // Add/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({
    program: ProgramType.UNDERGRADUATE,
    departmentId: '',
    name: '',
    nationalId: '',
    email: '',
    phone: '',
    enrollmentYear: new Date().getFullYear(),
  });
  const [nationalIdError, setNationalIdError] = useState('');

  // Bulk Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const refreshStudents = () => {
    setStudents(getStudents());
    setDepartments(getDepartments());
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
        setSelectedIds([]);
    } else {
        setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkAction = (action: 'verify' | 'delete' | 'suspend') => {
    if (selectedIds.length === 0) return;

    if (action === 'delete') {
      if (!window.confirm(language === 'ar' ? `هل أنت متأكد من حذف ${selectedIds.length} سجل؟ لا يمكن التراجع عن هذا الإجراء.` : `Are you sure you want to delete ${selectedIds.length} records? This action cannot be undone.`)) return;
      selectedIds.forEach(id => deleteStudent(id));
      notifySuccess(language === 'ar' ? `تم حذف ${selectedIds.length} سجل بنجاح` : `Successfully deleted ${selectedIds.length} records`);
    } else if (action === 'verify') {
      selectedIds.forEach(id => {
        const student = getStudentById(id);
        if (student) {
          saveStudent({ ...student, verificationStatus: VerificationStatus.VERIFIED });
        }
      });
      notifySuccess(language === 'ar' ? `تم التحقق من ${selectedIds.length} طالب بنجاح` : `Successfully verified ${selectedIds.length} students`);
    } else if (action === 'suspend') {
      selectedIds.forEach(id => {
        const student = getStudentById(id);
        if (student) {
          saveStudent({ ...student, status: StudentStatus.SUSPENDED });
        }
      });
      notifySuccess(language === 'ar' ? `تم إيقاف ${selectedIds.length} طالب بنجاح` : `Successfully suspended ${selectedIds.length} students`);
    }

    refreshStudents();
  };

  useEffect(() => {
    refreshStudents();
  }, []);

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
        student.name.includes(searchTerm) || 
        student.id.includes(searchTerm) || 
        student.nationalId.includes(searchTerm) ||
        (student.email && student.email.includes(searchTerm)) ||
        (student.phone && student.phone.includes(searchTerm));
    
    const matchesProgram = filters.program === 'all' || student.program === filters.program;
    const matchesStatus = filters.status === 'all' || student.status === filters.status;
    const matchesVerification = filters.verification === 'all' || student.verificationStatus === filters.verification;
    const matchesDept = filters.departmentId === 'all' || student.departmentId === filters.departmentId;
    const matchesDegree = filters.degreeLevel === 'all' || student.graduateLevel === filters.degreeLevel;
    const matchesYear = !filters.year || student.enrollmentYear.toString() === filters.year;
    
    const minG = filters.minGpa ? parseFloat(filters.minGpa) : 0;
    const maxG = filters.maxGpa ? parseFloat(filters.maxGpa) : 100;
    const matchesGpa = student.gpa >= minG && student.gpa <= maxG;

    const matchesRisk = filters.status !== 'risk' || (student.warningsCount > 0 || student.status === StudentStatus.WARNING);

    return matchesSearch && matchesProgram && (filters.status === 'risk' ? matchesRisk : matchesStatus) && matchesVerification && matchesDept && matchesDegree && matchesYear && matchesGpa;
  });

  const stats = {
      total: students.length,
      undergrad: students.filter(s => s.program === ProgramType.UNDERGRADUATE).length,
      postgrad: students.filter(s => s.program === ProgramType.POSTGRADUATE).length,
      atRisk: students.filter(s => s.warningsCount > 0 || s.status === StudentStatus.WARNING).length,
      graduated: students.filter(s => s.status === StudentStatus.GRADUATED).length,
      suspended: students.filter(s => s.status === StudentStatus.SUSPENDED).length,
      departmentStats: departments.map(d => ({
          name: d.name,
          count: students.filter(s => s.departmentId === d.id).length
      })).sort((a, b) => b.count - a.count).slice(0, 5),
      statusDistribution: [
          { name: language === 'ar' ? 'نشط' : 'Active', value: students.filter(s => s.status === StudentStatus.ACTIVE).length, color: '#C74634' },
          { name: language === 'ar' ? 'إنذار' : 'Warning', value: students.filter(s => s.status === StudentStatus.WARNING).length, color: '#f59e0b' },
          { name: language === 'ar' ? 'موقوف' : 'Suspended', value: students.filter(s => s.status === StudentStatus.SUSPENDED).length, color: '#78716c' },
          { name: language === 'ar' ? 'خريج' : 'Graduated', value: students.filter(s => s.status === StudentStatus.GRADUATED).length, color: '#0c0a09' },
      ].filter(d => d.value > 0),
      gpaDistribution: [
          { name: language === 'ar' ? 'امتياز (85-100)' : 'Distinction (85-100)', count: students.filter(s => s.gpa >= 85).length, color: '#10b981' },
          { name: language === 'ar' ? 'جيد جداً (75-84)' : 'Very Good (75-84)', count: students.filter(s => s.gpa >= 75 && s.gpa < 85).length, color: '#3b82f6' },
          { name: language === 'ar' ? 'جيد (65-74)' : 'Good (65-74)', count: students.filter(s => s.gpa >= 65 && s.gpa < 75).length, color: '#C74634' },
          { name: language === 'ar' ? 'مقبول (50-64)' : 'Pass (50-64)', count: students.filter(s => s.gpa >= 50 && s.gpa < 65).length, color: '#78716c' },
          { name: language === 'ar' ? 'ضعيف (<50)' : 'Fail (<50)', count: students.filter(s => s.gpa < 50).length, color: '#ef4444' },
      ].filter(d => d.count > 0)
  };

  const ExecutiveInsights = () => (
    <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-4 gap-0 border border-slate-200 rounded-[2.5rem] bg-white overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.03)]"
    >
        {/* GPA Performance Distribution */}
        <div className={cn("p-8 border-slate-100 flex flex-col bg-white", language === 'ar' ? "border-l" : "border-r")}>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center justify-between">
                <span>{language === 'ar' ? '01 توزيع الأداء' : '01 Performance / Curve'}</span>
                <TrendingUp size={14} className="text-emerald-500" />
            </h4>
            <div className="flex-1 space-y-6">
                {stats.gpaDistribution.map(item => (
                    <div key={item.name} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-tight">
                            <span>{item.name}</span>
                            <span className="font-mono">{item.count}</span>
                        </div>
                        <div className="h-1 bg-slate-50 relative overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.count / stats.total) * 100}%` }}
                                className="h-full relative"
                                style={{ backgroundColor: item.color }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Academic Standing Chart */}
        <div className={cn("p-8 border-slate-100 bg-white", language === 'ar' ? "border-l" : "border-r")}>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center justify-between">
                <span>{language === 'ar' ? '02 الحالة الأكاديمية' : '02 Standing / Audit'}</span>
                <ShieldAlert size={14} className="text-indigo-600" />
            </h4>
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={stats.statusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={85}
                            paddingAngle={5}
                            stroke="none"
                            dataKey="value"
                        >
                            {stats.statusDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Department Distribution */}
        <div className="p-8 lg:col-span-2 bg-[#0A0A0A] text-white relative">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-10 flex items-center justify-between relative z-10">
                <span>{language === 'ar' ? '03 كثافة الأقسام' : '03 Density / Dept'}</span>
                <BarChart3 size={14} className="text-indigo-500" />
            </h4>
            <div className="h-[200px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.departmentStats}>
                        <XAxis 
                            dataKey="name" 
                            stroke="#525252" 
                            fontSize={9} 
                            tickLine={false} 
                            axisLine={false}
                            tick={{fontWeight: 900, fill: '#404040'}}
                        />
                        <YAxis hide />
                        <Tooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                            contentStyle={{ backgroundColor: '#000', borderRadius: '4px', border: '1px solid #333', fontSize: '9px', fontWeight: 900, color: '#fff' }}
                        />
                        <Bar 
                            dataKey="count" 
                            fill="#6366f1" 
                            radius={[2, 2, 0, 0]} 
                            barSize={40}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </motion.div>
  );

  const handleDelete = (id: string) => {
    if (!canDelete) return;
    if (confirm(isAr ? 'هل أنت متأكد من حذف هذا الطالب؟' : 'Are you sure you want to delete this student?')) {
      deleteStudent(id);
      refreshStudents();
      logAction(isAr ? 'حذف طالب' : 'Delete Student', isAr ? `تم حذف الطالب رقم ${id}` : `Student record ${id} removed`, 'danger');
      notifyInfo(isAr ? 'تم حذف سجل الطالب' : 'Student record removed');
    }
  };

  const handleOpenAdd = () => {
      setIsEditMode(false);
      setNationalIdError('');
      setCurrentStudent({
        program: ProgramType.UNDERGRADUATE,
        departmentId: departments.length > 0 ? departments[0].id : '',
        name: '',
        nationalId: '',
        email: '',
        phone: '',
        enrollmentYear: new Date().getFullYear(),
        status: StudentStatus.ACTIVE
      });
      setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
      setIsEditMode(true);
      setNationalIdError('');
      setCurrentStudent({ ...student });
      setIsModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent.name || !currentStudent.nationalId || !currentStudent.departmentId) return;

    if (checkNationalIdExists(currentStudent.nationalId, currentStudent.id)) {
        setNationalIdError(isAr ? 'الرقم الوطني مسجل لطالب آخر بالفعل.' : 'National ID already registered for another student.');
        return;
    }

    // Unit 4 Admission Criteria Validation
    const score = currentStudent.admissionScore || 0;
    if (currentStudent.program === ProgramType.UNDERGRADUATE) {
        const isScience = currentStudent.admissionCertificateType?.includes('علمي');
        const minRequired = isScience ? 70 : 65;
        if (score < minRequired) {
            notifyError(isAr 
                ? `المعدل (${score}%) أقل من الحد الأدنى للقبول في المسار ${isScience ? 'العلمي' : 'الأدبي'} (${minRequired}%)` 
                : `Score (${score}%) is below minimum for ${isScience ? 'Scientific' : 'Literary'} track (${minRequired}%)`);
            return;
        }
    } else if (currentStudent.program === ProgramType.POSTGRADUATE) {
        if (score < 75) {
            notifyError(isAr 
                ? `المعدل (${score}%) أقل من الحد الأدنى للقبول في الدراسات العليا (75%)` 
                : `Score (${score}%) is below minimum for Postgraduate studies (75%)`);
            return;
        }
    }

    let studentToSave: Student;

    if (isEditMode && currentStudent.id) {
        const original = students.find(s => s.id === currentStudent.id);
        studentToSave = {
            ...original!, 
            name: currentStudent.name!,
            nationalId: currentStudent.nationalId!,
            departmentId: currentStudent.departmentId!,
            program: currentStudent.program as ProgramType,
            email: currentStudent.email,
            phone: currentStudent.phone,
            enrollmentYear: currentStudent.enrollmentYear || original!.enrollmentYear,
            advisorName: currentStudent.advisorName
        };
        logAction(isAr ? 'تعديل طالب' : 'Edit Student', isAr ? `تحديث بيانات الطالب ${studentToSave.name}` : `Updated record for ${studentToSave.name}`, 'info');
    } else {
        studentToSave = {
            id: `STU${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            name: currentStudent.name!,
            nationalId: currentStudent.nationalId!,
            program: currentStudent.program as ProgramType,
            departmentId: currentStudent.departmentId!,
            email: currentStudent.email,
            phone: currentStudent.phone,
            enrollmentYear: currentStudent.enrollmentYear || new Date().getFullYear(),
            status: StudentStatus.ACTIVE,
            gpa: 0,
            warningsCount: 0,
            grades: [],
            advisorName: currentStudent.program === ProgramType.POSTGRADUATE ? (isAr ? 'لم يعين' : 'NOT_ASSIGNED') : undefined
        };
        logAction(isAr ? 'إضافة طالب' : 'Add Student', isAr ? `تسجيل طالب جديد: ${studentToSave.name}` : `New student registered: ${studentToSave.name}`, 'info');
    }
    
    saveStudent(studentToSave);
    refreshStudents();
    setIsModalOpen(false);
    notifySuccess(isEditMode ? (isAr ? 'تم حفظ التعديلات' : 'Changes saved successfully') : (isAr ? 'تم تسجيل الطالب بنجاح' : 'Student registered successfully'));
  };

  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
        notifyError(isAr ? 'لا توجد بيانات للتصدير' : 'No data to export');
        return;
    }

    const headersAr = ['المعرف', 'الاسم', 'الرقم الوطني', 'القسم', 'البرنامج', 'المعدل', 'الحالة', 'سنة القيد'];
    const headersEn = ['ID', 'Name', 'National ID', 'Department', 'Program', 'GPA', 'Status', 'Enrollment Year'];
    const headers = isAr ? headersAr : headersEn;
    const csvContent = [
        headers.join(','),
        ...filteredStudents.map(s => 
            `${s.id},"${s.name}",${s.nationalId},"${getDepartmentName(s.departmentId)}",${s.program},${s.gpa},${s.status},${s.enrollmentYear}`
        )
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Students_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    notifySuccess(isAr ? 'تم تحميل ملف CSV' : 'CSV file downloaded');
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      Papa.parse(file, {
          skipEmptyLines: true,
          complete: (results) => {
              const rows = results.data as string[][];
              // Skip header if it exists (usually row 0)
              const dataRows = rows.slice(1);
              const newStudents: Student[] = [];
              const errors: string[] = [];
              const seenInBatch = new Set<string>();

              dataRows.forEach((cols, index) => {
                  const rowIndex = index + 2; // Header is +1, 0-index is +1
                  
                  if (cols.length < 3) {
                      errors.push(`السطر ${rowIndex}: بيانات غير مكتملة (يتطلب على الأقل الاسم، الرقم الوطني، والقسم).`);
                      return;
                  }

                  const [name, nationalId, deptName, programStr, yearStr, email, phone, gradLevelStr, pathwayStr, advisor, thesis] = cols.map(c => c?.trim() || '');

                  // Basic Validation
                  if (!name || name.length < 3) {
                      errors.push(`السطر ${rowIndex}: الاسم غير صالح أو قصير جداً.`);
                      return;
                  }

                  if (!nationalId || !/^\d{12}$/.test(nationalId)) {
                      errors.push(`السطر ${rowIndex}: الرقم الوطني "${nationalId}" غير صالح (يجب أن يكون 12 رقماً).`);
                      return;
                  }

                  if (seenInBatch.has(nationalId)) {
                      errors.push(`السطر ${rowIndex}: الرقم الوطني "${nationalId}" مكرر في هذا الملف.`);
                      return;
                  }

                  if (checkNationalIdExists(nationalId)) {
                      errors.push(`السطر ${rowIndex}: الرقم الوطني "${nationalId}" مسجل مسبقاً لطالب آخر.`);
                      return;
                  }

                  const dept = departments.find(d => d.name === deptName) || departments[0];
                  const program = programStr?.includes('عليا') ? ProgramType.POSTGRADUATE : ProgramType.UNDERGRADUATE;
                  const year = parseInt(yearStr) || new Date().getFullYear();

                  // Smart mapping for Graduate Level and Pathway
                  let graduateLevel: GraduateDegreeLevel | undefined;
                  if (program === ProgramType.POSTGRADUATE && gradLevelStr) {
                      const level = gradLevelStr.toLowerCase();
                      if (level.includes('ماجستير') || level.includes('master')) graduateLevel = GraduateDegreeLevel.MASTER;
                      else if (level.includes('دكتوراه') || level.includes('phd')) graduateLevel = GraduateDegreeLevel.PHD;
                      else if (level.includes('دكتور') || level.includes('postdoc')) graduateLevel = GraduateDegreeLevel.POSTDOC;
                      else graduateLevel = GraduateDegreeLevel.OTHER;
                  }

                  let pathway: PostgraduatePathway | undefined;
                  if (program === ProgramType.POSTGRADUATE && pathwayStr) {
                      const p = pathwayStr.toLowerCase();
                      if (p.includes('ورسالة') || p.includes('dissertation')) pathway = PostgraduatePathway.COURSES_DISSERTATION;
                      else if (p.includes('فقط') || p.includes('only')) pathway = PostgraduatePathway.COURSES_ONLY;
                      else if (p.includes('شامل') && p.includes('مقررات') && !p.includes('أطروحة')) pathway = PostgraduatePathway.COURSES_COMPREHENSIVE;
                      else if (p.includes('أطروحة') && p.includes('شامل') && p.includes('مقررات')) pathway = PostgraduatePathway.COMPREHENSIVE_THESIS_COURSES;
                      else if (p.includes('أطروحة') && p.includes('شامل') && !p.includes('مقررات')) pathway = PostgraduatePathway.COMPREHENSIVE_THESIS_NO_COURSES;
                      else if (p.includes('بحث') || p.includes('research')) pathway = PostgraduatePathway.POSTDOC_RESEARCH;
                      else pathway = PostgraduatePathway.CUSTOM;
                  }

                  seenInBatch.add(nationalId);
                  newStudents.push({
                      id: `STU${new Date().getFullYear()}${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
                      name,
                      nationalId,
                      departmentId: dept.id,
                      program,
                      graduateLevel,
                      pathway,
                      advisorName: advisor || undefined,
                      thesisTitle: thesis || undefined,
                      enrollmentYear: year,
                      email: email || undefined,
                      phone: phone || undefined,
                      status: StudentStatus.ACTIVE,
                      gpa: 0,
                      warningsCount: 0,
                      grades: [],
                      enrollments: [],
                      notifications: [],
                      documents: []
                  });
              });

              if (newStudents.length > 0) {
                  bulkSaveStudents(newStudents);
                  refreshStudents();
                  notifySuccess(`تم بنجاح استيراد ${newStudents.length} طالب.`);
                  logAction('استيراد جماعي', `تم بنجاح استيراد ${newStudents.length} طالب من ملف CSV`, 'warning');
              }

              if (errors.length > 0) {
                  console.warn("Import Errors:", errors);
                  const errorSum = errors.slice(0, 3).join('\n');
                  notifyError(`تم العثور على ${errors.length} خطأ:\n${errorSum}${errors.length > 3 ? '\n...' : ''}`);
              } else if (newStudents.length === 0) {
                  notifyInfo('لم يتم العثور على بيانات صالحة للاستيراد في الملف.');
              }
              
              setIsImportModalOpen(false);
          },
          error: (error) => {
              notifyError(`خطأ في قراءة الملف: ${error.message}`);
          }
      });
      e.target.value = '';
  };

  const getVerificationBadge = (status?: VerificationStatus) => {
    switch (status) {
        case VerificationStatus.VERIFIED:
            return <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-tighter"><CheckCircle2 size={10} /> {language === 'ar' ? 'تم التحقق' : 'Verified'}</div>;
        case VerificationStatus.PENDING:
            return <div className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-tighter"><Clock size={10} /> {language === 'ar' ? 'قيد الانتظار' : 'Pending'}</div>;
        case VerificationStatus.REJECTED:
            return <div className="flex items-center gap-1 text-[10px] font-black text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-100 uppercase tracking-tighter"><XCircle size={10} /> {language === 'ar' ? 'مرفوض' : 'Rejected'}</div>;
        default:
            return <div className="flex items-center gap-1 text-[10px] font-black text-stone-400 bg-stone-50 px-3 py-1 rounded-full border border-stone-100 uppercase tracking-tighter">{language === 'ar' ? 'غير محقق' : 'Unverified'}</div>;
    }
  };

  return (
    <div className="p-8 space-y-12">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div className="space-y-3">
          <h2 className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight">
            {isAr ? 'إدارة' : 'Student'} <span className="font-bold text-brand-600">{isAr ? 'الطلاب' : 'Administration'}</span>
          </h2>
          <p className="text-stone-400 font-medium text-sm">
            {isAr ? 'إدارة السجلات الأكاديمية والقبول ومقاييس الأداء المؤسسي.' : 'Manage academic records, admissions, and institutional performance metrics.'}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
            <button 
                onClick={() => {
                  const printEvent = new CustomEvent('trigger-secure-print-students-list');
                  window.dispatchEvent(printEvent);
                }}
                className="px-5 py-3 rounded-2xl bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm"
                title={isAr ? 'طباعة القائمة' : 'Print List'}
            >
                <Printer size={16} />
                <span>{isAr ? 'طباعة' : 'Print'}</span>
            </button>
            <button 
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={cn(
                    "px-5 py-3 rounded-2xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]",
                    showAnalytics ? "bg-stone-900 border-stone-900 text-white shadow-xl shadow-stone-200" : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                )}
            >
                <Activity size={16} />
                <span>{isAr ? 'رؤى تحليلية' : 'Analytics Insight'}</span>
            </button>
            <div className="w-px h-8 bg-stone-200 mx-4 hidden lg:block" />
            <button 
                onClick={() => setIsCompact(!isCompact)}
                className="p-3 border border-stone-200 rounded-2xl hover:bg-stone-50 text-stone-500 transition-all shadow-sm"
                title={isCompact ? (isAr ? 'عرض مكبر' : "Enlarged View") : (isAr ? 'عرض مصغر' : "Compact View")}
            >
                {isCompact ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
            </button>
            <div className="w-px h-8 bg-stone-200 mx-4 hidden lg:block" />
            <StatMini icon={Users} label={isAr ? 'إجمالي المقيدين' : "Total Enrollment"} value={stats.total} color="blue" />
            <StatMini icon={GraduationCap} label={isAr ? 'الدراسات العليا' : "Postgraduates"} value={stats.postgrad} color="purple" />
            <StatMini icon={ShieldAlert} label={isAr ? 'الإنذارات الأكاديمية' : "Academic Warnings"} value={stats.atRisk} color="rose" />
        </div>
      </div>

      {showAnalytics && <ExecutiveInsights />}
      
      {/* Batch Actions Toolbar */}
      <AnimatePresence>
          {selectedIds.length > 0 && (
              <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-stone-900 p-6 rounded-3xl flex items-center justify-between text-white shadow-2xl relative overflow-hidden"
              >
                  <div className="absolute top-0 right-0 w-64 h-full bg-brand-500/10 skew-x-[30deg] translate-x-32" />
                  <div className="flex items-center gap-6 relative z-10">
                      <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg">
                          {selectedIds.length}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                        {isAr ? 'سجلات مختارة للتعديل الجماعي' : 'Records Selected for Bulk Modification'}
                      </span>
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                      <button 
                        onClick={() => handleBulkAction('verify')}
                        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10"
                      >
                          <Check size={14} className="text-emerald-500" /> {isAr ? 'تحقق من المختار' : 'Verify Selection'}
                      </button>
                      <button 
                        onClick={() => handleBulkAction('suspend')}
                        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10"
                      >
                          <Ban size={14} className="text-amber-500" /> {isAr ? 'إيقاف الحالة' : 'Suspend Status'}
                      </button>
                      <div className="w-px h-6 bg-white/10 mx-2" />
                      <button 
                        onClick={() => handleBulkAction('delete')}
                        className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-600/20"
                      >
                          <Trash2 size={14} /> {isAr ? 'تطهير السجلات' : 'Purge Records'}
                      </button>
                      <button 
                        onClick={() => setSelectedIds([])}
                        className="p-2 hover:bg-white/10 rounded-xl transition-all text-stone-400"
                      >
                          <X size={20} />
                      </button>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-200">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-96 group">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-brand-600 transition-colors", isAr ? "right-4" : "left-4")} size={18} />
                <input
                    type="text"
                    placeholder={isAr ? "البحث بالاسم، الرقم الجامعي، أو الهوية..." : "Search by name, ID, or credential..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                        "w-full py-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-stone-400",
                        isAr ? "pr-12 pl-5" : "pl-12 pr-5"
                    )}
                />
            </div>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                    "p-3.5 rounded-2xl border transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest",
                    showFilters ? "bg-stone-900 border-stone-900 text-white shadow-xl shadow-stone-200" : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                )}
            >
                <SlidersHorizontal size={18} />
                <span>{isAr ? 'الفلاتر' : 'Filters'}</span>
            </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
            {canImport && (
                <button onClick={() => setIsImportModalOpen(true)} className="flex-1 md:flex-none px-6 py-3.5 bg-white border border-stone-200 text-stone-700 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-stone-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <Upload size={18} className="text-stone-400" />
                    <span>{isAr ? 'استيراد جماعي' : 'Bulk Import'}</span>
                </button>
            )}
            {canExport && (
                <button onClick={handleExportCSV} className="flex-1 md:flex-none px-6 py-3.5 bg-white border border-stone-200 text-stone-700 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-stone-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <Download size={18} className="text-stone-400" />
                    <span>{isAr ? 'تصدير البيانات' : 'Export Data'}</span>
                </button>
            )}
            {canEdit && (
                <>
                    <div className="w-px h-8 bg-stone-200 mx-2 hidden md:block" />
                    <button onClick={handleOpenAdd} className="flex-1 md:flex-none px-8 py-3.5 bg-brand-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-600/20 flex items-center justify-center gap-2">
                        <Plus size={20} />
                        <span>{isAr ? 'تسجيل طالب' : 'Register Student'}</span>
                    </button>
                </>
            )}
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
            >
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8 p-10 bg-stone-50 rounded-[3rem] border border-stone-200 relative">
                    <FilterSelect label={isAr ? 'البرنامج الأكاديمي' : "Academic Program"} value={filters.program} onChange={v => setFilters({...filters, program: v})}>
                        <option value="all">{isAr ? 'جميع البرامج' : 'All Programs'}</option>
                        <option value={ProgramType.UNDERGRADUATE}>{isAr ? 'بكالوريوس' : 'Undergraduate'}</option>
                        <option value={ProgramType.POSTGRADUATE}>{isAr ? 'دراسات عليا' : 'Postgraduate'}</option>
                    </FilterSelect>
                    <FilterSelect label={isAr ? 'حالة القيد' : "Enrollment Status"} value={filters.status} onChange={v => setFilters({...filters, status: v})}>
                        <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                        <option value="risk">{isAr ? '⚠ خطر أكاديمي / إنذارات' : '⚠ Academic Risk / Warnings'}</option>
                        <option value={StudentStatus.ACTIVE}>{isAr ? 'قيد نشط' : 'Active Enrollment'}</option>
                        <option value={StudentStatus.GRADUATED}>{isAr ? 'خريج / خريجون' : 'Graduated / Alumni'}</option>
                    </FilterSelect>
                    <FilterSelect label={isAr ? 'التحقق' : "Verification"} value={filters.verification} onChange={v => setFilters({...filters, verification: v})}>
                        <option value="all">{isAr ? 'جميع الحالات' : 'All States'}</option>
                        {Object.values(VerificationStatus).map(v => (
                            <option key={v} value={v}>{isAr ? (v === VerificationStatus.VERIFIED ? 'محقّق' : v === VerificationStatus.PENDING ? 'معلق' : 'مرفوض') : v}</option>
                        ))}
                    </FilterSelect>
                    <FilterSelect label={isAr ? 'القسم' : "Department"} value={filters.departmentId} onChange={v => setFilters({...filters, departmentId: v})}>
                        <option value="all">{isAr ? 'جميع الأقسام' : 'All Departments'}</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </FilterSelect>
                    {filters.program === ProgramType.POSTGRADUATE && (
                        <FilterSelect label={isAr ? 'مستوى الدرجة' : "Degree Level"} value={filters.degreeLevel} onChange={v => setFilters({...filters, degreeLevel: v})}>
                            <option value="all">{isAr ? 'جميع الدرجات' : 'All Degrees'}</option>
                            {Object.values(GraduateDegreeLevel).map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </FilterSelect>
                    )}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{isAr ? 'نطاق المعدل (%)' : 'GPA Range (%)'}</label>
                        <div className="flex gap-3">
                            <input type="number" placeholder={isAr ? "الأدنى" : "Min"} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-bold" value={filters.minGpa} onChange={e => setFilters({...filters, minGpa: e.target.value})} />
                            <input type="number" placeholder={isAr ? "الأقصى" : "Max"} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-bold" value={filters.maxGpa} onChange={e => setFilters({...filters, maxGpa: e.target.value})} />
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Students Table */}
      <SecurePrintWrapper 
        documentId="students-list"
        title={isAr ? 'قائمة الطلاب المعتمدة' : 'Official Students Registry'}
        triggerId="trigger-secure-print-students-list"
      >
        <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-200">
                <th className={cn("px-8 py-8 text-left w-16", isAr ? "border-l" : "border-r", "border-slate-100")}>
                   <button 
                       onClick={toggleSelectAll}
                       className="p-1 hover:bg-slate-100 rounded transition-all "
                   >
                       {selectedIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                           <CheckSquare size={18} className="text-indigo-600" />
                       ) : (
                           <Square size={18} className="text-slate-200" />
                       )}
                   </button>
                </th>
                <th className={cn("px-8 py-8 border-slate-100", isAr ? "border-l" : "border-r", isCompact && "py-6")}>
                  {isAr ? '01 الهوية / المرجع' : '01 Identity / Reference'}
                </th>
                <th className={cn("px-8 py-8 border-slate-100", isAr ? "border-l" : "border-r", isCompact && "py-6")}>
                  {isAr ? '02 الاعتماد / الحالة' : '02 Credential / Status'}
                </th>
                <th className={cn("px-8 py-8 border-slate-100", isAr ? "border-l" : "border-r", isCompact && "py-6")}>
                  {isAr ? '03 الأكاديمية / الأداء' : '03 Academic / Performance'}
                </th>
                <th className={cn("px-8 py-8 text-center", isCompact && "py-6")}>
                  {isAr ? '04 الإدارة' : '04 Manage'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence mode="popLayout">
                {filteredStudents.map((student) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={student.id} 
                    className={cn(
                        "hover:bg-indigo-50/10 transition-all group cursor-pointer",
                        selectedIds.includes(student.id) && "bg-indigo-50/30"
                    )}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <td className="px-8 py-6 text-left border-r border-slate-100" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => toggleSelect(student.id)}
                            className="p-1 hover:bg-white rounded transition-all"
                        >
                            {selectedIds.includes(student.id) ? (
                                <CheckSquare size={18} className="text-indigo-600" />
                            ) : (
                                <Square size={18} className="text-slate-200" />
                            )}
                        </button>
                    </td>
                    <td className={cn("px-8 py-6 border-r border-slate-100", isCompact && "py-4")}>
                      <div className="flex items-center gap-5">
                        <div className={cn(
                            "rounded-xl flex items-center justify-center font-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] border border-slate-100 transition-all",
                            isCompact ? "w-9 h-9 text-[10px]" : "w-12 h-12",
                            student.warningsCount >= 2 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-50 text-slate-500"
                        )}>
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <p className={cn("font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight", isCompact ? "text-[11px]" : "text-[13px]")}>{student.name}</p>
                             {student.warningsCount >= 2 && <AlertCircle size={isCompact ? 12 : 14} className="text-rose-600" />}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[9px] font-mono font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase">{student.id}</span>
                             <span className="text-[9px] font-mono text-slate-300">ID: {student.nationalId}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={cn("px-8 py-6 border-r border-slate-100", isCompact && "py-4")}>
                        <div className={cn("space-y-2", isCompact && "space-y-1")}>
                            {getVerificationBadge(student.verificationStatus)}
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest pl-1 opacity-60">Admission: {student.enrollmentYear}</p>
                        </div>
                    </td>
                    <td className={cn("px-8 py-6 border-r border-slate-100", isCompact && "py-4")}>
                        <div className={cn("flex flex-col items-start gap-2", isCompact && "gap-1")}>
                             <p className={cn("font-black text-slate-600 uppercase tracking-tight", isCompact ? "text-[10px]" : "text-[11px]")}>{getDepartmentName(student.departmentId)}</p>
                             <div className="flex items-center gap-3">
                                <span className={cn("text-[11px] font-black font-mono", student.gpa >= 85 ? "text-emerald-600" : student.gpa >= 65 ? "text-indigo-600" : "text-rose-600")}>{student.gpa.toFixed(1)}%</span>
                                <div className="w-24 h-1 bg-slate-50 relative overflow-hidden group-hover:bg-slate-100 transition-colors">
                                     <div 
                                        className={cn(
                                            "h-full transition-all duration-1000 ease-out",
                                            student.gpa >= 85 ? "bg-emerald-500" : student.gpa >= 65 ? "bg-indigo-500" : "bg-rose-500"
                                        )}
                                        style={{ width: `${student.gpa}%` }}
                                     />
                                </div>
                             </div>
                        </div>
                    </td>
                    <td className={cn("px-8 py-6", isCompact && "py-4")} onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => setSelectedStudent(student)} className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"><Eye size={18} /></button>
                        {canEdit && <button onClick={() => handleOpenEdit(student)} className="p-2.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Edit2 size={18} /></button>}
                        {canDelete && <button onClick={() => handleDelete(student.id)} className="p-2.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><Trash2 size={18} /></button>}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </SecurePrintWrapper>
      
      {/* Full-Screen Immersive Dossier View */}
      <FullScreenModal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        language={language}
        title={selectedStudent ? (isAr ? `ملف الطالب • ${selectedStudent.name}` : `Student Dossier • ${selectedStudent.name}`) : ''}
      >
        {selectedStudent && (
            <DossierContent 
                language={language} 
                student={selectedStudent} 
                isAdminView={true}
            />
        )}
      </FullScreenModal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Institutional Data Injection"
        description="Synchronize student records via standard CSV data ingestion"
        icon={FileSpreadsheet}
        maxWidth="lg"
      >
        <div className="space-y-8">
            <div className="bg-stone-50 border border-stone-200 rounded-[2rem] p-8 text-sm text-stone-600 leading-relaxed">
                <p className="font-black text-stone-900 mb-4 flex items-center gap-2 uppercase tracking-widest text-[10px]">
                    <Info size={16} className="text-brand-600"/>
                    Specification Requirements:
                </p>
                <ul className="space-y-3 font-medium text-stone-500">
                    <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-brand-500 rounded-full" /> File Encoding: CSV (UTF-8 Compliant)</li>
                    <li className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-brand-500 rounded-full" /> 
                        Schema Mapping: Name, NationalID, Department, Program, Year
                    </li>
                    <li className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-brand-500 rounded-full" /> 
                        Meta Data: Email, Phone, Graduate Level, Pathway, Advisor, Thesis
                    </li>
                </ul>
                <button 
                    onClick={() => {
                        const csv = "Name,NationalID,Department,Program,Year\nMohamed Ahmed,123456789012,Engineering,Undergraduate,2024\nSara Ali,987654321098,Medicine,Postgraduate,2023";
                        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = "Oracle_Campus_Import_Template.csv";
                        link.click();
                    }}
                    className="mt-8 w-full flex items-center justify-center gap-2 text-[10px] font-black text-stone-600 hover:text-brand-600 transition-all bg-white py-3 rounded-xl border border-stone-200 shadow-sm hover:shadow-md uppercase tracking-widest"
                >
                    <Download size={14} />
                    Download Procurement Template
                </button>
            </div>

            <div 
                className="border-2 border-dashed border-stone-200 rounded-[2.5rem] p-16 text-center hover:bg-stone-50 hover:border-brand-400 transition-all cursor-pointer group shadow-inner"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="w-20 h-20 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform group-hover:bg-brand-50">
                    <Upload size={32} className="text-stone-400 group-hover:text-brand-600 transition-colors" />
                </div>
                <p className="font-black text-stone-900 uppercase tracking-widest text-xs">Execute Data Ingestion</p>
                <p className="text-[10px] text-stone-400 mt-2 font-bold uppercase tracking-tight">Drop compliant .csv file here or click to browse institutional archives</p>
                <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleBulkImport} />
            </div>
        </div>
      </Modal>

      {/* Add/Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? 'Modify Student Dossier' : 'Academic Registration'}
        description="Verify all input data against official institutional documentation before commitment."
        icon={isEditMode ? Edit2 : UserPlus}
        maxWidth="3xl"
        footer={
            <div className="flex justify-end gap-4 p-2">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-4 text-stone-400 font-black uppercase tracking-widest text-[10px] hover:bg-stone-50 rounded-2xl transition-all"
                >
                    Cancel Action
                </button>
                <button 
                    onClick={(e: any) => {
                        const form = document.getElementById('student-form') as HTMLFormElement;
                        if (form) form.requestSubmit();
                    }}
                    className="px-12 py-4 bg-stone-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-stone-800"
                >
                    <Save size={18} className="text-brand-500" />
                    {isEditMode ? 'Commit Changes' : 'Initialize Enrollment'}
                </button>
            </div>
        }
      >
        <form id="student-form" onSubmit={handleSaveStudent} className="space-y-10 p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Legal Full Name</label>
                        <input 
                            required
                            type="text" 
                            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-800 placeholder:text-stone-300"
                            value={currentStudent.name}
                            onChange={(e) => setCurrentStudent({...currentStudent, name: e.target.value})}
                            placeholder="Enter full name as per identity documents..."
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">National Identification</label>
                        <input 
                            required
                            type="text" 
                            pattern="\d{12}"
                            className={cn(
                                "w-full bg-stone-50 border rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 transition-all font-bold text-stone-800 placeholder:text-stone-300",
                                nationalIdError ? "border-red-500 focus:ring-red-500/20" : "border-stone-200 focus:ring-brand-500/20"
                            )}
                            value={currentStudent.nationalId}
                            onChange={(e) => { setNationalIdError(''); setCurrentStudent({...currentStudent, nationalId: e.target.value}); }}
                            placeholder="12-digit numeric code..."
                        />
                        {nationalIdError && <p className="text-[10px] text-red-500 font-black uppercase tracking-tight">{nationalIdError}</p>}
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Institutional Email address</label>
                            <input 
                                type="email" 
                                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-800 placeholder:text-stone-300"
                                value={currentStudent.email || ''}
                                onChange={(e) => setCurrentStudent({...currentStudent, email: e.target.value})}
                                placeholder="name@campus.oracle.com"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Primary Contact Number</label>
                            <input 
                                type="tel" 
                                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-800 placeholder:text-stone-300"
                                value={currentStudent.phone || ''}
                                onChange={(e) => setCurrentStudent({...currentStudent, phone: e.target.value})}
                                placeholder="+1 (XXX) XXX-XXXX"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Academic Department</label>
                        <select 
                            required
                            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-800 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_1.25rem_center] bg-no-repeat"
                            value={currentStudent.departmentId}
                            onChange={(e) => setCurrentStudent({...currentStudent, departmentId: e.target.value})}
                        >
                            <option value="">Select Faculty Department...</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Academic Level</label>
                            <select 
                                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-800 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_1.25rem_center] bg-no-repeat"
                                value={currentStudent.program}
                                onChange={(e) => setCurrentStudent({...currentStudent, program: e.target.value as ProgramType})}
                            >
                                <option value={ProgramType.UNDERGRADUATE}>Undergraduate Program</option>
                                <option value={ProgramType.POSTGRADUATE}>Postgraduate Program</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Admission Score (%)</label>
                                <input 
                                    type="number"
                                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-800"
                                    value={currentStudent.admissionScore || ''}
                                    onChange={(e) => setCurrentStudent({...currentStudent, admissionScore: parseFloat(e.target.value)})}
                                    placeholder="e.g. 85.5"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Certificate Type</label>
                                <select 
                                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-800"
                                    value={currentStudent.admissionCertificateType || ''}
                                    onChange={(e) => setCurrentStudent({...currentStudent, admissionCertificateType: e.target.value})}
                                >
                                    <option value="">Select...</option>
                                    <option value="GSSC_SCIENCE">GSSC - Scientific (علمي)</option>
                                    <option value="GSSC_ARTS">GSSC - Literary (أدبي)</option>
                                    <option value="BACHELOR">Bachelor Degree (بكالوريوس)</option>
                                    <option value="MASTER">Master Degree (ماجستير)</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Enrollment Fiscal Year</label>
                            <input 
                                required
                                type="number"
                                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-stone-800"
                                value={currentStudent.enrollmentYear}
                                onChange={(e) => setCurrentStudent({...currentStudent, enrollmentYear: parseInt(e.target.value)})}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {currentStudent.program === ProgramType.POSTGRADUATE && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8 bg-stone-900 p-8 rounded-[2.5rem] border border-stone-800 shadow-xl"
                >
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] flex items-center gap-2">
                        <GraduationCap size={16} className="text-brand-500" />
                        Advanced Scholarship Parameters
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Degree Designation</label>
                            <select 
                                className="w-full bg-stone-800/50 border border-stone-700 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-bold text-white appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_1.25rem_center] bg-no-repeat"
                                value={currentStudent.graduateLevel || ''}
                                onChange={(e) => setCurrentStudent({...currentStudent, graduateLevel: e.target.value as GraduateDegreeLevel})}
                            >
                                <option value="">Select Degree Level...</option>
                                {Object.values(GraduateDegreeLevel).map(level => (
                                    <option key={level} value={level}>{level}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Academic Pathway Architecture</label>
                            <select 
                                className="w-full bg-stone-800/50 border border-stone-700 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-bold text-white appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_1.25rem_center] bg-no-repeat"
                                value={currentStudent.pathway || ''}
                                onChange={(e) => setCurrentStudent({...currentStudent, pathway: e.target.value as PostgraduatePathway})}
                            >
                                <option value="">Select Pathway Strategy...</option>
                                {Object.values(PostgraduatePathway).map(path => (
                                    <option key={path} value={path}>{path}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Lead Academic Advisor</label>
                            <input 
                                type="text"
                                className="w-full bg-stone-800/50 border border-stone-700 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-bold text-white placeholder:text-stone-600"
                                value={currentStudent.advisorName || ''}
                                onChange={(e) => setCurrentStudent({...currentStudent, advisorName: e.target.value})}
                                placeholder="Enter lead professor name..."
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Research Thesis Title</label>
                            <input 
                                type="text"
                                className="w-full bg-stone-800/50 border border-stone-700 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-bold text-white placeholder:text-stone-600"
                                value={currentStudent.thesisTitle || ''}
                                onChange={(e) => setCurrentStudent({...currentStudent, thesisTitle: e.target.value})}
                                placeholder="Enter approved research title..."
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </form>
      </Modal>
    </div>
  );
};

const StatMini = ({ icon: Icon, label, value, color }: any) => {
    const colors: any = {
        blue: "bg-white text-stone-900 border-stone-200",
        purple: "bg-white text-stone-900 border-stone-200",
        rose: "bg-brand-50 text-brand-600 border-brand-100 shadow-xl shadow-brand-600/5"
    };
    return (
        <div className={cn("px-6 py-4 rounded-[1.5rem] border flex items-center gap-5 min-w-[200px] transition-all hover:scale-105 active:scale-95 cursor-default group", colors[color])}>
            <div className="p-2.5 rounded-xl bg-stone-100 group-hover:bg-brand-50 transition-colors"><Icon size={20} className="group-hover:text-brand-600 transition-colors" /></div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{label}</p>
                <p className="text-2xl font-black tabular-nums">{value}</p>
            </div>
        </div>
    );
};

const FilterSelect = ({ label, value, onChange, children }: any) => (
    <div className="space-y-3">
        <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">{label}</label>
        <select 
            value={value} 
            onChange={e => onChange(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-3 text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat"
        >
            {children}
        </select>
    </div>
);

export default StudentsList;
