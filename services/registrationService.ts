
import { 
    getStudents, getCourses, getSystemSettings, 
    saveStudent, getRooms 
} from './storageService';
import { getSchedule, checkStudentRegistrationConflict } from './scheduleService';
import { 
    Student, Course, StudentEnrollment, Room, 
    ClassSession, Transaction, ProgramType 
} from '../types';
import { addTransaction, calculateBalance } from './financeService';
import { logAction } from './auditService';

export interface RegistrationResult {
    success: boolean;
    message: string;
    student?: Student;
}

/**
 * Validates and completes a course registration for a student
 */
export const registerCourse = (studentId: string, courseId: string, performerName: string): RegistrationResult => {
    const students = getStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) return { success: false, message: 'الطالب غير موجود' };

    const settings = getSystemSettings();
    const isPastDeadline = new Date() > new Date(settings.registrationDeadline);
    if (isPastDeadline) {
        return { success: false, message: 'لا يمكن التسجيل، انتهى الموعد النهائي المحدد لتنزيل المواد' };
    }

    const alreadyRegistered = student.enrollments?.some(e => e.courseId === courseId && e.semester === settings.currentSemester);
    if (alreadyRegistered) {
        return { success: false, message: 'الطالب مسجل بالفعل في هذا المقرر لهذا الفصل' };
    }

    // Financial Block Check
    const currentBalance = calculateBalance(student.id);
    if (currentBalance > settings.finance.maxDebtLimit) {
        return { 
            success: false, 
            message: `لا يمكن التسجيل لوجود ديون مستحقة بقيمة (${currentBalance.toLocaleString()} د.ل). الحد الأقصى المسموح به هو ${settings.finance.maxDebtLimit.toLocaleString()} د.ل.` 
        };
    }

    // Credit limit check
    const courses = getCourses();
    const currentCourse = courses.find(c => c.id === courseId);
    if (!currentCourse) return { success: false, message: 'المقرر غير موجود' };

    // Prerequisite Check
    if (currentCourse.prerequisites && currentCourse.prerequisites.length > 0) {
        const passingScore = student.program === ProgramType.POSTGRADUATE 
            ? settings.regulation.minGpaGood // postgraduate requires higher pass
            : settings.regulation.passingScore;

        const missingPrereqs = currentCourse.prerequisites.filter(prereqId => {
            const hasPassedGrade = student.grades?.some(g => g.courseId === prereqId && g.score >= passingScore);
            const isCompletedEnrollment = student.enrollments?.some(e => e.courseId === prereqId && e.status === 'COMPLETED');
            return !hasPassedGrade && !isCompletedEnrollment;
        });

        if (missingPrereqs.length > 0) {
            const prereqDetails = missingPrereqs.map(id => courses.find(c => c.id === id)?.name || id).join(', ');
            return { 
                success: false, 
                message: `لا يمكن التسجيل لعدم استيفاء المتطلبات السابقة للمقرر: (${prereqDetails})` 
            };
        }
    }

    const enrolledCourses = student.enrollments
        ?.filter(e => e.semester === settings.currentSemester)
        .map(e => courses.find(c => c.id === e.courseId))
        .filter((c): c is Course => !!c) || [];
        
    const currentTotalCredits = enrolledCourses.reduce((sum, c) => sum + c.credits, 0);
    
    const maxCredits = student.program === ProgramType.POSTGRADUATE ? 9 : settings.regulation.maxCreditsPerSemester;
    const minCredits = student.program === ProgramType.POSTGRADUATE ? 6 : settings.regulation.minCreditsPerSemester;

    if ((currentTotalCredits + currentCourse.credits) > maxCredits) {
        return { 
            success: false, 
            message: `تجاوز الحد الأقصى للوحدات المسموح بها لهذه المرحلة الدراسية (${maxCredits} وحدة)` 
        };
    }

    // Schedule Conflict Check
    const enrolledCourseIds = enrolledCourses.map(c => c.id);
    const conflict = checkStudentRegistrationConflict(courseId, enrolledCourseIds);
    if (conflict.hasConflict) {
        return { success: false, message: conflict.message || 'تعارض في الجدول الأكاديمي' };
    }

    // Capacity Check
    const rooms = getRooms();
    const schedule = getSchedule();
    const session = schedule.find(s => s.courseId === courseId);
    
    if (session) {
        const room = rooms.find(r => r.name === session.room);
        if (room) {
            const enrolledCount = students.filter(s => 
                s.enrollments?.some(e => e.courseId === courseId && e.semester === settings.currentSemester)
            ).length;
            
            if (enrolledCount >= room.capacity) {
                return { 
                    success: false, 
                    message: `القاعة المحجوزة للمقرر (${room.name}) وصلت لسعتها القصوى (${room.capacity})` 
                };
            }
        }
    }

    // Process Registration
    const isStudent = performerName === student.name; // Simple check if student is the one performing
    const enrollmentStatus = isStudent ? 'PENDING_APPROVAL' : 'REGISTERED';

    const newEnrollment: StudentEnrollment = {
        courseId,
        semester: settings.currentSemester,
        status: enrollmentStatus as any,
        enrollmentDate: new Date().toISOString()
    };

    const updatedStudent: Student = {
        ...student,
        enrollments: [...(student.enrollments || []), newEnrollment]
    };

    // --- Automated Financial Charges ---
    
    // 1. Semester Registration Fee (Charged once per semester)
    const semesterEnrolledCount = student.enrollments?.filter(e => e.semester === settings.currentSemester).length || 0;
    if (semesterEnrolledCount === 0) {
        const registrationFeeTx: Transaction = {
            id: `TX-REG-${Date.now()}`,
            studentId: student.id,
            date: new Date().toISOString().split('T')[0],
            type: 'DEBIT',
            category: 'REGISTRATION',
            amount: settings.finance.registrationFee, 
            description: `رسوم تجديد القيد للفصل الدراسي: ${settings.currentSemester}`,
            status: 'COMPLETED'
        };
        addTransaction(registrationFeeTx);
    }

    // 2. Tuition Fee (Based on credits)
    const costPerCredit = student.program === ProgramType.POSTGRADUATE 
        ? settings.finance.postgraduateRatePerCredit 
        : settings.finance.undergraduateRatePerCredit;
    
    const chargeAmount = currentCourse.credits * costPerCredit;
    
    const tuitionTx: Transaction = {
        id: `TX-AUTO-${Date.now()}`,
        studentId: student.id,
        date: new Date().toISOString().split('T')[0],
        type: 'DEBIT',
        category: 'TUITION',
        amount: chargeAmount,
        description: `رسوم دراسية: ${currentCourse.name} (${currentCourse.credits} وحدات)`,
        status: 'COMPLETED'
    };

    addTransaction(tuitionTx);
    saveStudent(updatedStudent);
    
    logAction(
        'تسجيل مقرر', 
        `تم تسجيل ${courseId} للطالب ${student.name}`, 
        'info', 
        performerName
    );

    return { 
        success: true, 
        message: 'تم تسجيل المقرر بنجاح',
        student: updatedStudent
    };
};

/**
 * Removes a course registration for a student
 */
export const dropCourse = (studentId: string, courseId: string, performerName: string): RegistrationResult => {
    const students = getStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) return { success: false, message: 'الطالب غير موجود' };

    const settings = getSystemSettings();
    const isPastDeadline = new Date() > new Date(settings.registrationDeadline);
    if (isPastDeadline) {
        return { success: false, message: 'فترة حذف وإضافة المواد قد انتهت' };
    }

    const updatedEnrollments = student.enrollments?.filter(e => 
        !(e.courseId === courseId && e.semester === settings.currentSemester)
    );
    
    if (updatedEnrollments?.length === student.enrollments?.length) {
        return { success: false, message: 'الطالب غير مسجل في هذا المقرر في الفصل الحالي' };
    }

    const updatedStudent: Student = {
        ...student,
        enrollments: updatedEnrollments || []
    };

    saveStudent(updatedStudent);
    
    logAction(
        'حذف تسجيل', 
        `تم حذف تسجيل ${courseId} للطالب ${student.name}`, 
        'warning', 
        performerName
    );

    return { 
        success: true, 
        message: 'تم حذف التسجيل بنجاح',
        student: updatedStudent
    };
};

/**
 * Approves a pending course registration
 */
export const approveRegistration = (studentId: string, courseId: string, semester: string, performerName: string): RegistrationResult => {
    const students = getStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) return { success: false, message: 'الطالب غير موجود' };

    const enrollmentIndex = student.enrollments?.findIndex(e => 
        e.courseId === courseId && e.semester === semester
    );

    if (enrollmentIndex === undefined || enrollmentIndex === -1) {
        return { success: false, message: 'التسجيل غير موجود' };
    }

    const updatedEnrollments = [...(student.enrollments || [])];
    updatedEnrollments[enrollmentIndex] = {
        ...updatedEnrollments[enrollmentIndex],
        status: 'REGISTERED'
    };

    const updatedStudent: Student = {
        ...student,
        enrollments: updatedEnrollments
    };

    saveStudent(updatedStudent);
    
    logAction(
        'اعتماد تسجيل', 
        `تم اعتماد تسجيل ${courseId} للطالب ${student.name}`, 
        'info', 
        performerName
    );

    return { 
        success: true, 
        message: 'تم اعتماد التسجيل بنجاح',
        student: updatedStudent
    };
};

export const getEnrolledCount = (courseId: string, semester: string): number => {
    return getStudents().filter(s => 
        s.enrollments?.some(e => e.courseId === courseId && e.semester === semester)
    ).length;
};
