import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getStudents, getCourses, getSystemSettings, saveStudent } from '../services/storageService';
import { getSchedule } from '../services/scheduleService';
import { saveAttendance, getAttendanceRecords } from '../services/facultyService';
import { Student, Course, AttendanceRecord, AttendanceStatus, UserRole, ProgramType } from '../types';
import { 
  Calendar, 
  UserCheck, 
  Check, 
  X, 
  AlertCircle, 
  Save, 
  Filter, 
  Info, 
  Printer, 
  QrCode, 
  ScanLine, 
  Clock, 
  AlertTriangle, 
  BookOpen, 
  Plus, 
  Building2,
  FileText,
  UserCheck2,
  UserX,
  FileSpreadsheet
} from 'lucide-react';
import { notifySuccess, notifyError } from '../services/notificationService';
import { getCurrentUser } from '../services/authService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import SecurePrintWrapper from './ui/SecurePrintWrapper';
import { QRCodeCanvas } from 'qrcode.react';
import Modal from './ui/Modal';
import { Language } from '../services/i18nService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AttendanceProps {
    language?: Language;
}

// Global bilingual dictionary for the Attendance Module
const dicts = {
  ar: {
    title: 'بوابة الغياب ومراقبة الحرمان',
    subtitle: 'نظام رصد الحضور والغياب الأكاديمي واحتساب نسب الحرمان من دخول الامتحانات (تجاوز الغياب 25%)',
    selectModule: 'المقرر الدراسي المراد رصده',
    dateRef: 'تاريخ المحاضرة / الجلسة',
    enrolledCount: 'إجمالي الطلاب المسجلين',
    saveBtn: 'حفظ ومزامنة سجل الحضور',
    printBtn: 'طباعة التقرير الرسمي المعتمد',
    qrBtn: 'رمز الحضور الذكي QR',
    present: 'حاضر',
    absent: 'غائب',
    excused: 'بعذر',
    status: 'الحالة',
    studentName: 'اسم الطالب',
    studentId: 'الرقم الدراسي',
    remarkPlaceholder: 'ملاحظة أو تفاصيل العذر التبريري...',
    barredBadge: 'محروم (تجاوز 25%)',
    eligibleBadge: 'مؤهل للامتحان',
    absentRate: 'نسبة الغياب الكلية',
    totalSessions: 'المحاضرات الكلية Key Sessions',
    statsSummary: 'لوحة أداء الحضور للمقرر الدراسي',
    barredAlertTitle: 'كشف بأسماء الطلاب المحرومين في هذا المقرر الدراسي',
    barredAlertDesc: 'الطلاب المدرجة أسماؤهم أدناه بلغت نسبة غيابهم عتبة الـ 25% أو تجاوزتها، مما يعرضهم للحرمان التلقائي من الامتحان النهائي بموجب اللوائح التنظيمية الأكاديمية.',
    autofillBtn: 'إنشاء عينة طلاب مسجلين تلقائياً (للتجربة)',
    noEnrolledTitle: 'لا يوجد طلاب مسجلون في هذا المقرر بعد',
    noEnrolledDesc: 'لم يتم العثور على أي طلاب مسجلين في هذا المقرر للفصل الحالي. انقر فوق الزر أدناه لتسجيل مجموعة طلاب وتوليد بيانات حضور سابقة لهم لتجربة ميزة الحرمان.',
    studentPanelTitle: 'تحليل الحضور الأكاديمي الشخصي',
    studentPanelSub: 'متابعة نشطة لمستويات الحضور الطلابي وقوانين الحرمان المعيارية',
    smartScannerTitle: 'بوابة الحضور الرقمية الذكية للطلاب',
    smartScannerSub: 'امسح الرمز الرقمي المفتوح للمحاضرة لتسجيل حضورك الفوري',
    noModuleSelected: 'الرجاء تحديد مقرر دراسي وتحديد التاريخ لبدء عملية رصد غياب الفصيل',
    remarks: 'الأعذار والملاحظات',
    absenceDetails: 'الغياب والتخلف',
    activeSessions: 'التسجيلات والرموز الرقمية المتاحة حالياً',
    classAvg: 'متوسط الحضور بالفصل',
    barredCount: 'عدد المحرومين حالياً',
    noBarredStudents: 'الحمد لله، لا يوجد طلاب محرومون في هذا المقرر حتى الآن.',
    simulatePresence: 'محاكاة تسجيل حضور طالب بالرمز',
    recalculateTitle: 'حساب مرن تفاعلي',
    recalculateDesc: 'نسب الحضور تعدل مباشرة في وضع المعاينة عند النقر لتسهيل الرقابة وحفظ السجلات.'
  },
  en: {
    title: 'Attendance Tracker & Debarment Monitor',
    subtitle: 'Institutional course attendance logging and automatic debarment calculation (absence > 25%)',
    selectModule: 'Select Academic Course',
    dateRef: 'Session Date Reference',
    enrolledCount: 'Total Enrolled Candidates',
    saveBtn: 'Synchronize & Save Registry',
    printBtn: 'Print Official Report',
    qrBtn: 'QR Attendance Session',
    present: 'Present',
    absent: 'Absent',
    excused: 'Excused',
    status: 'Status',
    studentName: 'Student Name',
    studentId: 'Student ID',
    remarkPlaceholder: 'Enter excuse details / medical notice...',
    barredBadge: 'DEBARRED (Absence > 25%)',
    eligibleBadge: 'Eligible for Exam',
    absentRate: 'Total Absent Rate',
    totalSessions: 'Total marked lectures',
    statsSummary: 'Course Attendance Dashboard',
    barredAlertTitle: 'Mandatory Exam Debarment List for this Course',
    barredAlertDesc: 'The following candidates have accumulated an absence rate exceeding the maximum allowed threshold of 25%. Under university laws, they are barred from taking final exams.',
    autofillBtn: 'Seed Mock Course Registrants & Data',
    noEnrolledTitle: 'No Students Registered',
    noEnrolledDesc: 'No academic enrollments were found for this course in the current semester. Click the button below to register a sample student cohort with complete historic attendance to evaluate the barred logic.',
    studentPanelTitle: 'Scholar Attendance & Participation Analytics',
    studentPanelSub: 'Live monitoring of academic lesson participation rate and debarment conditions',
    smartScannerTitle: 'Academic QR Check-in Terminal',
    smartScannerSub: 'Scan the broadcast token to log your lecture presence securely',
    noModuleSelected: 'Please select a course module and calendar date to load the attendance sheet',
    remarks: 'Excuse Remarks',
    absenceDetails: 'Absence Rate details',
    activeSessions: 'Active Broadcast Attendance Codes',
    classAvg: 'Class Average Attendance',
    barredCount: 'Debarred Candidates',
    noBarredStudents: 'Splendid! No students are currently barred from exams in this course.',
    simulatePresence: 'Simulate Scholar Attendance via QR Scan',
    recalculateTitle: 'Dynamic Calculation',
    recalculateDesc: 'Absence percentages are recalculated reactively on each hover/click in this preview to assist faculty.'
  }
};

const Attendance: React.FC<AttendanceProps> = ({ language = 'ar' }) => {
  const t = language === 'ar' ? dicts.ar : dicts.en;
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Faculty State
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceRemarksState, setAttendanceRemarksState] = useState<Record<string, string>>({});
  
  // Modals
  const [showQRModal, setShowQRModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [qrContent, setQrContent] = useState('');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const currentUser = getCurrentUser();
  const isStudent = currentUser?.role === UserRole.STUDENT;

  // Initialize and load courses/students
  useEffect(() => {
    // Read from route hash if applicable
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const cid = params.get('courseId');
    const date = params.get('date');
    if (cid) setSelectedCourseId(cid);
    if (date) setSelectedDate(date);
  }, []);

  useEffect(() => {
    let allCourses = getCourses();
    const allStudents = getStudents();

    if (currentUser?.role === UserRole.FACULTY) {
      // Filter courses taught by this faculty member
      const sessions = getSchedule();
      const myCourseIds = sessions
        .filter(s => s.instructorId === currentUser.id || s.instructorName === currentUser.name)
        .map(s => s.courseId);
        
      if (myCourseIds.length > 0) {
        allCourses = allCourses.filter(c => myCourseIds.includes(c.id));
      }
    }

    setCourses(allCourses);
    setStudents(allStudents);
  }, [currentUser, refreshTrigger]);

  // Load existing attendances whenever selections change
  useEffect(() => {
    if (selectedCourseId && selectedDate) {
      const records = getAttendanceRecords();
      // Filter for this course and date
      const currentRecords = records.filter(r => r.courseId === selectedCourseId && r.date === selectedDate);
      
      const statusState: Record<string, AttendanceStatus> = {};
      const remarksState: Record<string, string> = {};
      
      // Get all enrolled students for this course
      const currentSemester = getSystemSettings().currentSemester;
      const enrolled = students.filter(s => 
        s.enrollments?.some(e => e.courseId === selectedCourseId && e.semester === currentSemester)
      );

      enrolled.forEach(s => {
        const existing = currentRecords.find(r => r.studentId === s.id);
        statusState[s.id] = existing ? existing.status : 'PRESENT';
        remarksState[s.id] = existing && existing.remarks ? existing.remarks : '';
      });

      setAttendanceState(statusState);
      setAttendanceRemarksState(remarksState);
    }
  }, [selectedCourseId, selectedDate, students]);

  // Real-time student attendance recalculation helper
  const calculateStudentRatios = (studentId: string) => {
    const allRecords = getAttendanceRecords();
    
    // Find past records for this student and course, ignoring the selected date
    const pastRecords = allRecords.filter(r => 
      r.studentId === studentId && 
      r.courseId === selectedCourseId && 
      r.date !== selectedDate
    );

    // Get current status from the local slate state
    const currentStatus = attendanceState[studentId] || 'PRESENT';
    
    // Virtual full list (Past + currently selected status)
    const virtualStatuses = [...pastRecords.map(r => r.status), currentStatus];
    
    const totalCount = virtualStatuses.length;
    const absentCount = virtualStatuses.filter(st => st === 'ABSENT').length;
    const presentCount = virtualStatuses.filter(st => st === 'PRESENT').length;
    const excusedCount = virtualStatuses.filter(st => st === 'EXCUSED').length;

    const rate = totalCount > 0 ? (absentCount / totalCount) * 100 : 0;
    const isBarred = totalCount > 0 && rate > 25;

    return {
      total: totalCount,
      present: presentCount,
      absent: absentCount,
      excused: excusedCount,
      absentRate: Number(rate.toFixed(1)),
      isBarred
    };
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleRemarkChange = (studentId: string, text: string) => {
    setAttendanceRemarksState(prev => ({
      ...prev,
      [studentId]: text
    }));
  };

  const handleSave = () => {
    if (!selectedCourseId) return;

    const matchedCourse = courses.find(c => c.id === selectedCourseId);
    
    const recordsToSave: AttendanceRecord[] = Object.entries(attendanceState).map(([studentId, status]) => {
      const studentObj = students.find(s => s.id === studentId);
      return {
        id: `${selectedCourseId}-${studentId}-${selectedDate}`,
        courseId: selectedCourseId,
        courseName: matchedCourse?.name || selectedCourseId,
        studentId,
        studentName: studentObj ? studentObj.name : studentId,
        date: selectedDate,
        status: status as AttendanceStatus,
        remarks: attendanceRemarksState[studentId] || '',
        markedBy: currentUser?.name || 'Faculty Member',
        markedAt: new Date().toISOString()
      };
    });

    saveAttendance(recordsToSave);
    setRefreshTrigger(prev => prev + 1);
    notifySuccess(language === 'ar' ? 'تمت مزامنة وحفظ سجل حضور المحاضرة بنجاح!' : 'Attendance records synchronized and persisted successfully!');
  };

  const handlePrint = () => {
    window.print();
  };

  // Seed mock enrollments for testing
  const handleAutofillDemoEnrollments = () => {
    if (!selectedCourseId) return;
    const activeSemester = getSystemSettings().currentSemester;
    const allStudents = getStudents();
    
    // Let's recruit 4-5 students from this department or overall
    const CS_STUDENTS_FILTER = allStudents.slice(0, 5);
    
    CS_STUDENTS_FILTER.forEach(student => {
      const enrollments = student.enrollments || [];
      const alreadyHas = enrollments.some(e => e.courseId === selectedCourseId && e.semester === activeSemester);
      
      if (!alreadyHas) {
        const newEnrollment = {
          courseId: selectedCourseId,
          courseName: courses.find(c => c.id === selectedCourseId)?.name || 'Course',
          semester: activeSemester,
          status: 'REGISTERED' as const,
          enrollmentDate: new Date().toISOString().split('T')[0]
        };
        student.enrollments = [...enrollments, newEnrollment];
        saveStudent(student);
      }
    });

    // Let's also preseed some past attendance sessions to show off the barred warning thresholds
    const records = getAttendanceRecords();
    const mockSessionDates = ['2026-05-05', '2026-05-12', '2026-05-19'];
    
    mockSessionDates.forEach((pastDate) => {
      CS_STUDENTS_FILTER.forEach((student, idx) => {
        // We make one student (STU-NEW-001 or index 0) have severe absences
        let pastStatus: AttendanceStatus = 'PRESENT';
        let pastRemarks = '';
        
        if (idx === 0) {
          pastStatus = 'ABSENT';
          pastRemarks = 'Unexcused personal delay';
        } else if (idx === 1 && pastDate === '2026-05-12') {
          pastStatus = 'EXCUSED';
          pastRemarks = 'Submitted official medical certificate';
        } else if (idx === 2 && pastDate === '2026-05-19') {
          pastStatus = 'ABSENT';
          pastRemarks = 'No show';
        }

        const id = `${selectedCourseId}-${student.id}-${pastDate}`;
        const existingIdx = records.findIndex(r => r.id === id);
        
        const newRec: AttendanceRecord = {
          id,
          studentId: student.id,
          studentName: student.name,
          courseId: selectedCourseId,
          courseName: courses.find(c => c.id === selectedCourseId)?.name || 'Course',
          date: pastDate,
          status: pastStatus,
          markedBy: 'Dr. Ali',
          markedAt: new Date(pastDate + 'T11:00:00Z').toISOString(),
          remarks: pastRemarks
        };

        if (existingIdx >= 0) {
          records[existingIdx] = newRec;
        } else {
          records.push(newRec);
        }
      });
    });

    saveAttendance(records);
    setRefreshTrigger(prev => prev + 1);
    notifySuccess(language === 'ar' ? 'تم تسجيل وتوليد حضور الطلاب النموذجي للمقرر!' : 'Sample student cohort enrolled with history generated successfully!');
  };

  const generateAttendanceQR = () => {
    if (!selectedCourseId) {
        notifyError(language === 'ar' ? 'الرجاء اختيار المقرر أولاً' : 'Please select a academic course first');
        return;
    }
    const currentCourse = courses.find(c => c.id === selectedCourseId);
    const contentObj = {
        courseId: selectedCourseId,
        courseName: currentCourse?.name || '',
        courseCode: currentCourse?.code || '',
        date: selectedDate,
        instructorId: currentUser?.id || 'INS001',
        instructorName: currentUser?.name || 'Instructor',
        timestamp: Date.now(),
        expiresAt: Date.now() + 15 * 60 * 1050
    };
    const content = JSON.stringify(contentObj);
    
    const activeSessionsStr = localStorage.getItem('oracle_campus_active_qr_sessions');
    let sessions = activeSessionsStr ? JSON.parse(activeSessionsStr) : [];
    sessions = sessions.filter((s: any) => s.courseId !== selectedCourseId);
    sessions.push(contentObj);
    localStorage.setItem('oracle_campus_active_qr_sessions', JSON.stringify(sessions));

    setQrContent(content);
    setShowQRModal(true);
    notifySuccess(language === 'ar' ? 'تم تنشيط وبث تذكرة تسجيل الحضور الذكية!' : 'Attendance token active and scanning enabled!');
  };

  const handleQRCheckIn = (courseId: string, date: string, timestamp?: number) => {
    const student = students.find(s => s.id === currentUser?.id);
    const isEnrolled = student?.enrollments?.some(e => e.courseId === courseId);
    
    if (!isEnrolled) {
        notifyError(language === 'ar' ? 'أنت غير مسجل بصفة رسمية في هذا المقرر!' : 'Security Alert: You are not enrolled in this module!');
        return;
    }

    if (timestamp) {
        const diff = Date.now() - timestamp;
        const fifteenMinutes = 15 * 60 * 1000;
        if (diff > fifteenMinutes) {
            notifyError(language === 'ar' ? 'انتهت صلاحية رمز بث الحضور الحالي!' : 'Token has expired! Ask instructor to spin up a new code.');
            return;
        }
    }

    const matchedCourse = courses.find(c => c.id === courseId);
    const newRecord: AttendanceRecord = {
        id: `${courseId}-${currentUser?.id}-${date}`,
        courseId,
        courseName: matchedCourse?.name || courseId,
        studentId: currentUser?.id || '',
        studentName: currentUser?.name || '',
        date,
        status: 'PRESENT',
        markedBy: 'Smart QR Terminal',
        markedAt: new Date().toISOString(),
        remarks: 'Recorded via Student Smart QR Scanner'
    };

    saveAttendance([newRecord]);
    setRefreshTrigger(prev => prev + 1);
    
    notifySuccess(language === 'ar' 
        ? 'تم تسجيل حضورك بنجاح للرمز الرقمي المحمي!' 
        : 'Smart QR Attendance registered successfully!'
    );
    setShowScannerModal(false);
  };

  const handleSimulateScan = () => {
    if (qrContent) {
      try {
        const parsed = JSON.parse(qrContent);
        handleQRCheckIn(parsed.courseId, parsed.date, parsed.timestamp);
      } catch (e) {
        const student = students.find(s => s.id === currentUser?.id);
        const enrolledIds = student?.enrollments?.map(e => e.courseId) || [];
        if (enrolledIds.length > 0) {
          handleQRCheckIn(enrolledIds[0], new Date().toISOString().split('T')[0], Date.now());
        }
      }
    } else {
      const student = students.find(s => s.id === currentUser?.id);
      const enrolledIds = student?.enrollments?.map(e => e.courseId) || [];
      if (enrolledIds.length > 0) {
        handleQRCheckIn(enrolledIds[0], new Date().toISOString().split('T')[0], Date.now());
      } else {
        notifyError(language === 'ar' ? 'لا توجد مقررات مسجلة لديك للمحاكاة!' : 'No enrolled courses found for simulation!');
      }
    }
  };

  // Poll scan sessions
  useEffect(() => {
    if (showScannerModal) {
      const loadSessions = () => {
        const activeSessionsStr = localStorage.getItem('oracle_campus_active_qr_sessions');
        let sessions = activeSessionsStr ? JSON.parse(activeSessionsStr) : [];
        sessions = sessions.filter((s: any) => s.timestamp + 15 * 60 * 1000 > Date.now());
        setActiveSessions(sessions);
      };
      loadSessions();
      const interval = setInterval(loadSessions, 3000);
      return () => clearInterval(interval);
    }
  }, [showScannerModal]);

  // Poll Checked-in count
  useEffect(() => {
    if (showQRModal && selectedCourseId && selectedDate) {
      const getCount = () => {
        const records = getAttendanceRecords();
        const currentRecords = records.filter(r => r.courseId === selectedCourseId && r.date === selectedDate && r.status === 'PRESENT');
        setCheckedInCount(currentRecords.length);
      };
      getCount();
      const interval = setInterval(getCount, 2000);
      return () => clearInterval(interval);
    }
  }, [showQRModal, selectedCourseId, selectedDate]);

  // Filter students enrolled in the currently selected course
  const currentSemester = getSystemSettings().currentSemester;
  const enrolledStudents = students.filter(s => 
    s.enrollments?.some(e => e.courseId === selectedCourseId && e.semester === currentSemester)
  );

  // Compute stats for Faculty View summaries
  const totalEnrolledCount = enrolledStudents.length;
  const presentCount = Object.values(attendanceState).filter(s => s === 'PRESENT').length;
  const absentCount = Object.values(attendanceState).filter(s => s === 'ABSENT').length;
  const excusedCount = Object.values(attendanceState).filter(s => s === 'EXCUSED').length;

  const barredStudentsList = enrolledStudents.map(student => ({
    student,
    stats: calculateStudentRatios(student.id)
  })).filter(item => item.stats.isBarred);

  const barredStudentsCount = barredStudentsList.length;

  // Render for Student View
  if (isStudent) {
    const student = students.find(s => s.id === currentUser?.id);
    const allRecords = getAttendanceRecords().filter(r => r.studentId === currentUser?.id);
    
    const attendanceByCourse = courses.filter(c => student?.enrollments?.some(e => e.courseId === c.id)).map(course => {
        const courseRecords = allRecords.filter(r => r.courseId === course.id);
        const present = courseRecords.filter(r => r.status === 'PRESENT').length;
        const absent = courseRecords.filter(r => r.status === 'ABSENT').length;
        const excused = courseRecords.filter(r => r.status === 'EXCUSED').length;
        const total = courseRecords.length;
        
        // Absent / total session count
        const absentRate = total > 0 ? (absent / total) * 100 : 0;
        const isBarred = total > 0 && absentRate > 25;
        const safePercentage = 100 - absentRate;
        
        return {
            ...course,
            present,
            absent,
            excused,
            total,
            absentRate: Number(absentRate.toFixed(1)),
            safePercentage,
            isBarred
        };
    });

    return (
        <div className="p-6 md:p-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-stone-900 rounded-2xl text-white shadow-xl border border-stone-800">
                        <UserCheck size={28} className="text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight">
                            {t.studentPanelTitle}
                        </h2>
                        <p className="text-stone-400 font-black uppercase tracking-widest text-[10px] mt-1">{t.studentPanelSub}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 no-print">
                    <button 
                        onClick={handlePrint}
                        className="px-5 py-2.5 bg-stone-900 text-white rounded-xl flex items-center gap-2 hover:bg-black transition-all shadow-md text-[10px] font-black uppercase tracking-widest"
                    >
                        <Printer size={16} />
                        {t.printBtn}
                    </button>
                    <button 
                        onClick={() => setShowScannerModal(true)}
                        className="px-5 py-2.5 bg-brand-600 text-white rounded-xl flex items-center gap-2 hover:bg-brand-700 transition-all shadow-md text-[10px] font-black uppercase tracking-widest"
                    >
                        <ScanLine size={16} />
                        {t.simulatePresence}
                    </button>
                </div>
            </div>

            <SecurePrintWrapper
                documentType={t.studentPanelTitle}
                documentId={`ATT-${currentUser?.id}-${Date.now()}`}
                language={language}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {attendanceByCourse.map(course => (
                    <div key={course.id} className="bg-white rounded-[2rem] shadow-sm border border-stone-200 p-6 space-y-6 group hover:shadow-lg transition-all relative overflow-hidden">
                        {course.isBarred && (
                          <div className="absolute top-0 right-0 left-0 h-1.5 bg-red-600 animate-pulse" />
                        )}

                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-stone-900 group-hover:text-brand-600 transition-colors">{course.name}</h3>
                                <p className="text-[10px] text-stone-400 font-mono mt-1">{course.code}</p>
                            </div>
                            <div className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-extrabold tracking-tight uppercase border",
                                course.isBarred 
                                  ? "bg-red-50 text-red-600 border-red-100" 
                                  : course.absentRate > 15 
                                    ? "bg-amber-50 text-amber-600 border-amber-100" 
                                    : "bg-emerald-50 text-emerald-600 border-emerald-100"
                            )}>
                                {language === 'ar' ? 'نسبة الغياب' : 'Absent'}: {course.absentRate}%
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black text-stone-400 uppercase tracking-widest">
                                <span>{language === 'ar' ? 'نسبة حضور المحاضرات' : 'Lesson Attendance'}</span>
                                <span className={cn(course.isBarred ? "text-red-600 font-bold" : "text-stone-400")}>
                                  25% {language === 'ar' ? 'حد الغياب الأقصى' : 'Max Absence limit'}
                                </span>
                            </div>
                            <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/50">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${course.safePercentage}%` }}
                                    className={cn(
                                        "h-full rounded-full transition-all",
                                        course.isBarred ? "bg-red-600 shadow-md" : "bg-emerald-500 shadow-sm"
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">{language === 'ar' ? 'حضور' : 'Present'}</p>
                                <p className="text-base font-black text-stone-950 tabular-nums">{course.present}</p>
                            </div>
                            <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">{language === 'ar' ? 'غياب' : 'Absent'}</p>
                                <p className={cn("text-base font-black tabular-nums", course.absent > 0 ? "text-red-600" : "text-stone-900")}>{course.absent}</p>
                            </div>
                            <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">{language === 'ar' ? 'بعذر' : 'Excused'}</p>
                                <p className="text-base font-black text-stone-900 tabular-nums">{course.excused}</p>
                            </div>
                        </div>

                        {course.isBarred ? (
                            <div className="bg-red-55 px-4 py-3 rounded-xl border border-red-200 flex items-start gap-2.5 bg-red-50/50">
                                <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={16} />
                                <p className="text-[10px] text-red-900 font-bold leading-relaxed">
                                    {language === 'ar' 
                                      ? 'محروم: لقد تجاوزت الحد الأقصى للغياب المسموح به (25٪). يرجى مراجعة إدارة القسم فوراً.'
                                      : 'BARRED FROM EXAM: You have exceeded the allowable absence ceiling (25%). Direct administrative consultation required.'}
                                </p>
                            </div>
                        ) : course.absentRate > 15 ? (
                            <div className="bg-amber-50 px-4 py-3 rounded-xl border border-amber-100 flex items-start gap-2.5">
                                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                                <p className="text-[10px] text-amber-900 font-bold leading-relaxed">
                                    {language === 'ar'
                                      ? 'تحذير: لقد اقتربت من حاجز الحرمان وغيابك يقارب 20%، يرجى الالتزام بالحضور.'
                                      : 'WARNING: Your absence rate is approaching the debarment threshold. Standard lecture attendance advised.'}
                                </p>
                            </div>
                        ) : null}
                    </div>
                ))}
                {attendanceByCourse.length === 0 && (
                    <div className="col-span-full text-center py-20 bg-stone-50 border-2 border-dashed border-stone-200 rounded-[3rem] text-stone-300">
                        <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">
                           {language === 'ar' ? 'لا توجد مقررات فعالة مسجلة حالياً' : 'No active curricular registrations found'}
                        </p>
                    </div>
                )}
            </div>
          </SecurePrintWrapper>
        </div>
    );
  }

  // Render for Faculty/Admin View
  return (
    <div className="p-6 md:p-10 space-y-8">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-stone-900 rounded-2xl text-white shadow-xl border border-stone-800">
                  <UserCheck size={28} className="text-brand-500" />
              </div>
              <div>
                  <h2 className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight">
                      {t.title}
                  </h2>
                  <p className="text-stone-400 font-black uppercase tracking-widest text-[10px] mt-1">{t.subtitle}</p>
              </div>
          </div>
        </div>
        <div className="flex gap-3 no-print w-full md:w-auto">
            <button 
                onClick={handlePrint}
                className="px-5 py-2.5 bg-stone-900 text-white rounded-xl flex items-center gap-2 hover:bg-black transition-all shadow-md text-[10px] font-black uppercase tracking-widest w-full md:w-auto justify-center"
            >
                <Printer size={16} />
                {t.printBtn}
            </button>
        </div>
      </div>

      {/* Control Panel: Selectors */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-stone-200 p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">{t.selectModule}</label>
                  <select 
                    className="w-full bg-stone-50 border border-stone-250 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%20%272%27%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                  >
                      <option value="">{language === 'ar' ? '-- الرجاء اختيار المقرر برفق --' : '-- Please select a course --'}</option>
                      {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                  </select>
              </div>
              
              <div className="space-y-3">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">{t.dateRef}</label>
                  <input 
                    type="date" 
                    className="w-full bg-stone-50 border border-stone-250 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
              </div>

              <div className="flex items-end">
                 <div className="bg-stone-50 border border-stone-100 rounded-2rem p-4 w-full flex items-center justify-between group hover:bg-stone-100/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white text-stone-900 rounded-xl flex items-center justify-center shadow-sm border border-stone-200">
                            <Info size={18} className="text-brand-500" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-wider">{language === 'ar' ? 'غرفة الدرس الحالية' : 'CHAMBER PRESENCE'}</p>
                            <p className="text-lg font-black text-stone-900 tabular-nums">
                                {presentCount}<span className="text-stone-300 text-xs mx-1">/</span><span className="text-stone-400">{totalEnrolledCount}</span>
                            </p>
                        </div>
                    </div>
                    
                    {selectedCourseId && (
                        <button 
                            type="button"
                            onClick={generateAttendanceQR}
                            className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all shadow flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                        >
                            <QrCode size={16} />
                            <span>{t.qrBtn}</span>
                        </button>
                    )}
                 </div>
              </div>
          </div>
      </div>

      {/* Reactive calculations and summary banner */}
      {selectedCourseId && totalEnrolledCount > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-4">
                 <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                     <BookOpen size={20} />
                 </div>
                 <div>
                     <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-tight">{t.enrolledCount}</p>
                     <p className="text-xl font-bold text-stone-900 tabular-nums">{totalEnrolledCount}</p>
                 </div>
             </div>
             <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-4">
                 <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                     <UserCheck2 size={20} />
                 </div>
                 <div>
                     <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-tight">{t.present}</p>
                     <p className="text-xl font-bold text-stone-900 tabular-nums">{presentCount}</p>
                 </div>
             </div>
             <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-4">
                 <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                     <UserX size={20} />
                 </div>
                 <div>
                     <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-tight">{t.absent} / {t.excused}</p>
                     <p className="text-xl font-bold text-stone-900 tabular-nums">{absentCount} + {excusedCount}</p>
                 </div>
             </div>
             <div className="bg-red-50/50 rounded-2xl border border-red-200/50 p-5 flex items-center gap-4 relative overflow-hidden">
                 <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                     <AlertTriangle size={20} />
                 </div>
                 <div>
                     <p className="text-[10px] text-red-700 font-extrabold uppercase tracking-tight">{t.barredCount}</p>
                     <p className="text-xl font-black text-red-600 tabular-nums">{barredStudentsCount}</p>
                 </div>
             </div>
         </div>
      )}

      {/* Main Work Area */}
      <AnimatePresence mode="wait">
          {selectedCourseId ? (
              totalEnrolledCount === 0 ? (
                  /* Handle empty course enrollment with Autofill support */
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16 px-8 bg-amber-50/50 border-2 border-dashed border-amber-200 rounded-[2.5rem] max-w-4xl mx-auto space-y-6"
                  >
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow border border-amber-100 mx-auto">
                        <AlertTriangle size={32} className="text-amber-500 animate-pulse"/>
                      </div>
                      <div className="space-y-2">
                        <p className="text-base font-bold text-amber-900">{t.noEnrolledTitle}</p>
                        <p className="text-sm text-amber-700 leading-relaxed max-w-xl mx-auto">
                           {t.noEnrolledDesc}
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={handleAutofillDemoEnrollments}
                        className="bg-stone-900 text-white px-8 py-3.5 rounded-xl font-extrabold text-[10px] uppercase tracking-widest shadow hover:bg-black hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-3 border border-stone-800"
                      >
                         <Plus size={16} className="text-amber-400" />
                         {t.autofillBtn}
                      </button>
                  </motion.div>
              ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-6"
                  >
                      {/* Barred Students Warning List Box */}
                      {barredStudentsCount > 0 && (
                        <div className="bg-red-50 border-l-4 border-red-600 rounded-2xl p-6 space-y-4">
                           <div className="flex gap-3">
                              <AlertTriangle className="text-red-600 shrink-0 mt-1" size={24} />
                              <div>
                                 <h4 className="text-sm font-extrabold text-red-900 uppercase tracking-tight">{t.barredAlertTitle}</h4>
                                 <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{t.barredAlertDesc}</p>
                              </div>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {barredStudentsList.map(({ student, stats }) => (
                                <div key={student.id} className="bg-white rounded-xl p-4 border border-red-200 shadow-sm flex justify-between items-center">
                                   <div>
                                      <p className="text-xs font-black text-stone-900">{student.name}</p>
                                      <p className="text-[10px] font-mono text-stone-400 mt-0.5">{student.id}</p>
                                   </div>
                                   <div className="text-right">
                                      <span className="text-[10px] font-bold text-red-600 bg-red-105 px-2 py-0.5 rounded-full uppercase tracking-tight border border-red-100 bg-red-50">
                                        {stats.absentRate}% {language === 'ar' ? 'غياب' : 'Absence'}
                                      </span>
                                      <p className="text-[9px] text-stone-400 mt-1">
                                        {stats.absent} / {stats.total} {language === 'ar' ? 'محاضرات غياب' : 'absences'}
                                      </p>
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      )}

                      {/* Info on recalculation tooltips */}
                      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-stone-600">
                          <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                              <span className="font-extrabold text-[#111]">{t.recalculateTitle}</span>: {t.recalculateDesc}
                          </div>
                      </div>

                      {/* Main Table Structure */}
                      <div className="bg-white rounded-[2rem] shadow-sm border border-stone-200 overflow-hidden">
                          <SecurePrintWrapper
                            documentType={language === 'ar' ? 'سجل حضور المقررات والتجريد الأكاديمي' : 'Registrar Course Attendance & Debarment Records'}
                            documentId={`REG-${selectedCourseId}-${selectedDate}`}
                            language={language}
                          >
                          <div className="p-6 md:p-8 border-b border-stone-100 bg-stone-50 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-stone-200">
                                    <Calendar size={18} className="text-stone-450"/>
                                  </div>
                                  <div>
                                    <span className="font-black text-stone-900 uppercase text-xs tracking-wide">Candidate Roster List</span>
                                    <p className="text-[10px] text-stone-400 font-bold tracking-widest mt-0.5">Session: {selectedDate}</p>
                                  </div>
                              </div>
                              <button 
                                type="button"
                                onClick={handleSave}
                                className="bg-stone-900 text-white px-8 py-3.5 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-stone-800"
                              >
                                  <Save size={16} className="text-brand-500" />
                                  {t.saveBtn}
                              </button>
                          </div>
                          
                          <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                  <thead className="bg-stone-50 text-stone-400 text-[9px] font-black uppercase tracking-wider border-b border-stone-100">
                                      <tr>
                                          <th className="px-6 py-4">{t.studentName}</th>
                                          <th className="px-6 py-4">{t.studentId}</th>
                                          <th className="px-6 py-4 text-center">{language === 'ar' ? 'الغياب التراكمي بالفصل' : 'Cumulative Absence'}</th>
                                          <th className="px-6 py-4 text-center">{language === 'ar' ? 'حالة الامتحان الأكاديمي' : 'Exam Eligibility'}</th>
                                          <th className="px-6 py-4 text-center">{t.present}</th>
                                          <th className="px-6 py-4 text-center">{t.absent}</th>
                                          <th className="px-6 py-4 text-center">{t.excused}</th>
                                          <th className="px-6 py-4">{t.remarks}</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-100">
                                      {enrolledStudents.map(student => {
                                          const stats = calculateStudentRatios(student.id);
                                          const currentStatus = attendanceState[student.id] || 'PRESENT';
                                          
                                          return (
                                              <tr key={student.id} className="hover:bg-stone-50/20 transition-colors group">
                                                  <td className="px-6 py-4">
                                                      <div className="font-bold text-stone-900 group-hover:text-brand-600 transition-colors">{student.name}</div>
                                                      <div className="text-[9px] text-stone-400 uppercase tracking-wider mt-0.5">
                                                        {student.program === ProgramType.POSTGRADUATE ? 'Research Fellow' : 'Matriculated Undergraduate'}
                                                      </div>
                                                  </td>
                                                  <td className="px-6 py-4 font-mono text-[10px] text-stone-400">{student.id}</td>
                                                  
                                                  {/* History Counter */}
                                                  <td className="px-6 py-4 text-center">
                                                      <span className="font-extrabold text-stone-800 tabular-nums text-xs">
                                                        {stats.absent} / {stats.total} {language === 'ar' ? 'غياب' : 'Absent'}
                                                      </span>
                                                      <div className="text-[9px] text-stone-400 font-bold mt-0.5">
                                                        ({stats.absentRate}%)
                                                      </div>
                                                  </td>

                                                  {/* Debarment Status checks */}
                                                  <td className="px-6 py-4 text-center">
                                                      <span className={cn(
                                                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                          stats.isBarred 
                                                            ? "bg-red-50 text-red-600 border-red-100 animate-pulse" 
                                                            : stats.absentRate > 15
                                                              ? "bg-amber-50 text-amber-700 border-amber-100"
                                                              : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                      )}>
                                                          {stats.isBarred ? t.barredBadge : t.eligibleBadge}
                                                      </span>
                                                  </td>
                                                  
                                                  {/* Presence controls */}
                                                  <td className="px-6 py-4 text-center">
                                                      <button 
                                                        type="button"
                                                        onClick={() => handleStatusChange(student.id, 'PRESENT')}
                                                        className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all mx-auto border",
                                                            currentStatus === 'PRESENT' 
                                                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20' 
                                                            : 'bg-stone-50 text-stone-300 hover:bg-stone-100 border-stone-200'
                                                        )}
                                                      >
                                                          <Check size={16} strokeWidth={3} />
                                                      </button>
                                                  </td>
                                                  <td className="px-6 py-4 text-center">
                                                      <button 
                                                        type="button"
                                                        onClick={() => handleStatusChange(student.id, 'ABSENT')}
                                                        className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all mx-auto border",
                                                            currentStatus === 'ABSENT' 
                                                            ? 'bg-red-600 text-white border-red-700 shadow-sm shadow-red-600/20' 
                                                            : 'bg-stone-50 text-stone-300 hover:bg-stone-100 border-stone-200'
                                                        )}
                                                      >
                                                          <X size={16} strokeWidth={3} />
                                                      </button>
                                                  </td>
                                                  <td className="px-6 py-4 text-center">
                                                      <button 
                                                        type="button"
                                                        onClick={() => handleStatusChange(student.id, 'EXCUSED')}
                                                        className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all mx-auto border",
                                                            currentStatus === 'EXCUSED' 
                                                            ? 'bg-amber-505 bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20' 
                                                            : 'bg-stone-50 text-stone-300 hover:bg-stone-100 border-stone-200'
                                                        )}
                                                      >
                                                          <AlertCircle size={16} strokeWidth={3} />
                                                      </button>
                                                  </td>

                                                  {/* Notes Input */}
                                                  <td className="px-6 py-4">
                                                      <input 
                                                        type="text"
                                                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 text-stone-800 font-bold"
                                                        placeholder={t.remarkPlaceholder}
                                                        value={attendanceRemarksState[student.id] || ''}
                                                        onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                                                      />
                                                  </td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                        </SecurePrintWrapper>
                      </div>
                  </motion.div>
              )
          ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-32 bg-stone-50 border-2 border-dashed border-stone-200 rounded-[3rem] text-stone-300"
              >
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-100 mx-auto mb-6">
                    <Filter size={36} className="opacity-15 text-stone-500"/>
                  </div>
                  <p className="text-base font-bold text-stone-500">{language === 'ar' ? 'بانتظار تحديد تفاصيل المقرر' : 'Module Selection Required'}</p>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-2">
                     {t.noModuleSelected}
                  </p>
              </motion.div>
          )}
      </AnimatePresence>

      {/* QR Code Modal Popup */}
      <Modal 
          isOpen={showQRModal} 
          onClose={() => setShowQRModal(false)}
          title={language === 'ar' ? 'البث الذكي لرقم الحضور والغياب للمحاضرة' : 'Smart Attendance Broadcaster Token'}
          maxWidth="sm"
      >
          <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center">
              <div className="p-4 bg-white border border-stone-200 rounded-2xl relative shadow">
                  <QRCodeCanvas 
                      value={qrContent} 
                      size={200} 
                      level="H"
                      includeMargin={true}
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[8px] font-black animate-pulse">
                      <span className="w-1 h-1 bg-white rounded-full"></span>
                      <span>{language === 'ar' ? 'نشط الآن' : 'LIVE'}</span>
                  </div>
              </div>
              
              <div className="space-y-1">
                  <p className="text-sm font-bold text-stone-900">
                      {courses.find(c => c.id === selectedCourseId)?.name}
                  </p>
                  <p className="text-[9.5px] text-stone-450 font-mono">
                      SESSION ID: {selectedCourseId} • {selectedDate}
                  </p>
              </div>

              {/* Check-ins counter */}
              <div className="w-full bg-stone-50 rounded-xl p-4 flex items-center justify-between border border-stone-150">
                  <div className="text-left">
                      <p className="text-[8.5px] font-bold text-stone-400 uppercase tracking-wide">{language === 'ar' ? 'تم تسجيل حضورهم' : 'CHECK-INS COMPLETED'}</p>
                      <p className="text-lg font-bold text-stone-900">{checkedInCount} {language === 'ar' ? 'طالب' : 'students'}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[9px] text-emerald-600 font-bold uppercase">{language === 'ar' ? 'مزامنة نشطة' : 'SYNCING LIVE'}</span>
                  </div>
              </div>

              <div className="text-xs text-stone-500 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 text-left">
                  <p className="font-extrabold text-[10px] text-stone-700 shrink-0 mb-1 leading-snug">
                     {language === 'ar' ? 'كيف يستعمل الطلاب هذا؟' : 'Directions for Scholars'}
                  </p>
                  <p className="text-[10px] leading-relaxed text-stone-500">
                     {language === 'ar' 
                       ? 'يجب على الطلاب فتح البوابة من حسابهم والنقر على "مسح حضور المحاضرة" لمسح هذا الرمز الذكي من شاشتك وتسجيل حضورهم الفوري.'
                       : 'Students should navigate to the Attendance page under their account and click "Scan Attendance QR" to match and verify this token.'}
                  </p>
              </div>
          </div>
      </Modal>

      {/* Student QR Check-in Terminal Simulator Modal */}
      <Modal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          title={t.smartScannerTitle}
          maxWidth="md"
      >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-h-[80vh] overflow-y-auto">
              {/* Scan interface */}
              <div className="space-y-4">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <ScanLine size={16} className="text-amber-500 animate-pulse" />
                      {t.smartScannerSub}
                  </h3>
                  
                  {/* Mock Camera scan box */}
                  <div className="aspect-video bg-black rounded-xl border-2 border-stone-800 flex flex-col items-center justify-center relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none animate-pulse" />
                      <div className="w-16 h-16 border-2 border-emerald-500 rounded-lg flex items-center justify-center relative">
                          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400 -translate-x-1 -translate-y-1" />
                          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400 translate-x-1 -translate-y-1" />
                          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400 -translate-x-1 translate-y-1" />
                          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400 translate-x-1 translate-y-1" />
                          
                          <QrCode size={32} className="text-emerald-500" />
                      </div>
                      
                      <div className="absolute bottom-3 text-center w-full px-2">
                          <p className="text-[10px] text-stone-400 font-bold">
                             {language === 'ar' ? 'بانتظار تغذية تغطية البث الأكاديمي...' : 'Awaiting campus QR focus...'}
                          </p>
                      </div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleSimulateScan}
                    className="w-full py-3 bg-brand-600 text-white rounded-xl shadow font-extrabold text-xs uppercase tracking-wider hover:bg-brand-700 transition"
                  >
                      {language === 'ar' ? 'محاكاة مسح الكاميرا للرمز' : 'Simulate Camera Scanning'}
                  </button>
              </div>

              {/* Active list details */}
              <div className="space-y-4">
                  <h3 className="text-sm font-bold text-stone-900">{t.activeSessions}</h3>
                  <div className="space-y-3">
                      {activeSessions.length > 0 ? (
                          activeSessions.map((sess, idx) => (
                              <div key={idx} className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex justify-between items-center">
                                  <div>
                                      <p className="text-xs font-bold text-stone-900">{sess.courseName}</p>
                                      <p className="text-[9.5px] text-stone-400 font-mono mt-0.5">LECTURER: {sess.instructorName}</p>
                                  </div>
                                  <button
                                      type="button"
                                      onClick={() => handleQRCheckIn(sess.courseId, sess.date, sess.timestamp)}
                                      className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[9px] font-bold uppercase transition hover:bg-emerald-100"
                                  >
                                      {language === 'ar' ? 'محاكاة تسجيل الدخول' : 'Check In'}
                                  </button>
                              </div>
                          ))
                      ) : (
                          <div className="text-center py-12 bg-stone-50/50 rounded-xl border border-dashed border-stone-200 text-stone-400 space-y-2">
                              <Clock size={24} className="mx-auto text-stone-300" />
                              <p className="text-[10px] font-bold uppercase tracking-wider">
                                {language === 'ar' ? 'لا توجد جلسات رصد حضور نشطة حالياً' : 'No active attendance broadcasts found'}
                              </p>
                              <p className="text-[9px] text-stone-400 leading-relaxed max-w-xs mx-auto">
                                 {language === 'ar' 
                                   ? 'يجب على الأستاذ في حسابه الدخول لمساق والنقر على "رمز الحضور الذكي QR" لبدء بث المحاضرة.'
                                   : 'In faculty account, select a course and click generate QR to open a live lecture check-in window.'}
                              </p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default Attendance;
