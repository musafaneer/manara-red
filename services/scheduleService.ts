
import { ClassSession, DayOfWeek, ExamSession, Student, SeatingAssignment, Room } from '../types';
import { getStaff, getSystemSettings, saveSystemSettings, getRooms, getStudents } from './storageService';

const STORAGE_KEY_SCHEDULE = 'oracle_campus_schedule';
const STORAGE_KEY_EXAMS = 'oracle_campus_exams';

const getEnrollmentCount = (courseId: string): number => {
    const students = getStudents();
    const settings = getSystemSettings();
    return students.filter(s => 
        s.enrollments?.some(e => e.courseId === courseId && e.semester === settings.currentSemester)
    ).length;
};

export const autoSuggestExamSlot = (examId: string): { date: string, startTime: string, room: string } | null => {
    const exams = getExams();
    const exam = exams.find(e => e.id === examId);
    if (!exam) return null;

    const rooms = getRooms();
    const examHalls = rooms.filter(r => r.type === 'EXAM_HALL' && r.isAvailable);
    
    // Try next 14 days, standard slots
    const slots = ['09:00', '12:00', '15:00'];
    const startDate = new Date(exam.date);
    
    for (let i = 1; i <= 14; i++) {
        const checkDate = new Date(startDate);
        checkDate.setDate(checkDate.getDate() + i);
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayIndex = checkDate.getDay();
        if (dayIndex === 5) continue; // Skip Friday

        for (const slot of slots) {
            for (const room of examHalls) {
                const tempExam: ExamSession = { ...exam, date: dateStr, startTime: slot, room: room.name };
                const conflict = checkExamConflict(tempExam, room.capacity, exam.seatingPlan?.length || 0, examId);
                if (!conflict.hasConflict) {
                    return { date: dateStr, startTime: slot, room: room.name };
                }
            }
        }
    }
    return null;
};

export const getExams = (): ExamSession[] => {
  const data = localStorage.getItem(STORAGE_KEY_EXAMS);
  if (!data) {
    const mockExams: ExamSession[] = [
      {
          id: 'EXM-001',
          courseId: 'CS-301',
          courseName: 'الذكاء الاصطناعي',
          date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
          startTime: '09:00',
          durationMinutes: 120,
          room: 'قاعة 101',
          invigilators: ['STF-001']
      }
    ];
    localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(mockExams));
    return mockExams;
  }
  return JSON.parse(data);
};

export const saveExamSession = (exam: ExamSession): void => {
    const exams = getExams();
    const index = exams.findIndex(e => e.id === exam.id);
    if (index >= 0) {
        exams[index] = exam;
    } else {
        exams.push(exam);
    }
    localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(exams));
};

export const saveExam = saveExamSession;

export const deleteExam = (id: string): void => {
    const exams = getExams().filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(exams));
};

// --- Weekly Lectures ---

export const getSchedule = (): ClassSession[] => {
    const data = localStorage.getItem(STORAGE_KEY_SCHEDULE);
    return data ? JSON.parse(data) : [];
};

export const saveClassSession = (session: ClassSession): void => {
    const schedule = getSchedule();
    const index = schedule.findIndex(s => s.id === session.id);
    if (index >= 0) {
        schedule[index] = session;
    } else {
        schedule.push(session);
    }
    localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(schedule));
};

export const deleteClassSession = (id: string): void => {
    const schedule = getSchedule().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(schedule));
};

// --- Exam Schedule ---
// Handled above

// --- Conflict Detection Logic ---

export interface ConflictResult {
    hasConflict: boolean;
    message?: string;
    conflictingType?: 'ROOM' | 'INSTRUCTOR' | 'ROOM_UNAVAILABLE' | 'COURSE' | 'INVIGILATOR' | 'CAPACITY';
    conflictingSessionId?: string;
}

const toMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

export const checkScheduleConflict = (newSession: ClassSession, excludeId?: string, allRooms?: Room[]): ConflictResult => {
    const schedule = getSchedule().filter(s => s.id !== excludeId);
    const exams = getExams();
    
    // Check if room itself is available in system settings
    if (allRooms && newSession.room) {
        const roomObj = allRooms.find(r => r.name === newSession.room);
        if (roomObj) {
            if (!roomObj.isAvailable) {
                return { 
                    hasConflict: true, 
                    conflictingType: 'ROOM_UNAVAILABLE',
                    message: `تنبيه: القاعة ${newSession.room} مغلقة حالياً للصيانة.` 
                };
            }
            
            // Capacity Warning
            const enrolledCount = getEnrollmentCount(newSession.courseId);
            if (enrolledCount > roomObj.capacity) {
                return {
                    hasConflict: true,
                    conflictingType: 'CAPACITY',
                    message: `تحذير: سعة القاعة (${roomObj.capacity}) أقل من عدد الطلاب المسجلين (${enrolledCount}).`
                };
            }
        }
    }

    const newStart = toMinutes(newSession.startTime);
    const newEnd = toMinutes(newSession.endTime);

    // 1. Check against other LECTURES
    for (const existing of schedule) {
        if (existing.day !== newSession.day) continue;
        const existStart = toMinutes(existing.startTime);
        const existEnd = toMinutes(existing.endTime);
        const isOverlapping = (newStart < existEnd) && (newEnd > existStart);

        if (isOverlapping) {
            if (existing.room === newSession.room) {
                return { 
                    hasConflict: true, 
                    conflictingType: 'ROOM',
                    conflictingSessionId: existing.id,
                    message: `تعارض قاعات (محاضرات): القاعة ${newSession.room} محجوزة لمقرر "${existing.courseName}".` 
                };
            }
            if (existing.instructorId === newSession.instructorId) {
                return { 
                    hasConflict: true, 
                    conflictingType: 'INSTRUCTOR',
                    conflictingSessionId: existing.id,
                    message: `تضارب في جدول المحاضرات: الدكتور لديه محاضرة أخرى (${existing.courseName}) في هذا الوقت.` 
                };
            }
        }
    }

    // 2. Check against EXAMS
    // This is more complex because exams have specific dates, whereas schedule is weekly.
    // However, if a lecture overlaps with ANY exam in that room/for that instructor, we should probably warn.
    for (const exam of exams) {
        const examDate = new Date(exam.date);
        const dayIndex = examDate.getDay();
        const jsDays: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as any;
        const examDay = jsDays[dayIndex];

        if (examDay !== newSession.day) continue;

        const examStart = toMinutes(exam.startTime);
        const examEnd = examStart + exam.durationMinutes;
        const isOverlapping = (newStart < examEnd) && (newEnd > examStart);

        if (isOverlapping) {
            if (exam.room === newSession.room) {
                return {
                    hasConflict: true,
                    conflictingType: 'ROOM',
                    message: `تحذير: القاعة (${newSession.room}) محجوزة لامتحان مقرر "${exam.courseName}" يوم ${exam.date}.`
                };
            }
            if (exam.invigilators.includes(newSession.instructorId)) {
                return {
                    hasConflict: true,
                    conflictingType: 'INSTRUCTOR',
                    message: `تحذير: الدكتور لديه مراقبة امتحان لمقرر "${exam.courseName}" يوم ${exam.date} في هذا الوقت.`
                };
            }
        }
    }

    return { hasConflict: false };
};

export const getAllConflicts = (allSessions: ClassSession[], allRooms: Room[]): Record<string, ConflictResult[]> => {
    const conflictMap: Record<string, ConflictResult[]> = {};

    allSessions.forEach(session => {
        const sessionConflicts: ConflictResult[] = [];
        
        // 1. Check Room Availability (Maintenance) & Capacity
        const roomObj = allRooms.find(r => r.name === session.room);
        if (roomObj) {
            if (!roomObj.isAvailable) {
                sessionConflicts.push({
                    hasConflict: true,
                    conflictingType: 'ROOM_UNAVAILABLE',
                    message: `القاعة ${session.room} خارج الخدمة حالياً.`
                });
            }

            const enrolledCount = getEnrollmentCount(session.courseId);
            if (enrolledCount > roomObj.capacity) {
                sessionConflicts.push({
                    hasConflict: true,
                    conflictingType: 'CAPACITY',
                    message: `عجز سعة: الطلاب (${enrolledCount}) > السعة (${roomObj.capacity})`
                });
            }
        }

        // 2. Check Overlaps
        allSessions.forEach(other => {
            if (session.id === other.id || session.day !== other.day) return;

            const start = toMinutes(session.startTime);
            const end = toMinutes(session.endTime);
            const otherStart = toMinutes(other.startTime);
            const otherEnd = toMinutes(other.endTime);
            const isOverlapping = (start < otherEnd) && (end > otherStart);

            if (isOverlapping) {
                if (session.room === other.room) {
                    sessionConflicts.push({
                        hasConflict: true,
                        conflictingType: 'ROOM',
                        conflictingSessionId: other.id,
                        message: `القاعة مشغولة بمقرر ${other.courseName}`
                    });
                }
                if (session.instructorId === other.instructorId) {
                    sessionConflicts.push({
                        hasConflict: true,
                        conflictingType: 'INSTRUCTOR',
                        conflictingSessionId: other.id,
                        message: `المدرس لديه محاضرة أخرى (${other.courseName})`
                    });
                }
            }
        });

        if (sessionConflicts.length > 0) {
            conflictMap[session.id] = sessionConflicts;
        }
    });

    return conflictMap;
};

export const checkExamConflict = (newExam: ExamSession, roomCapacity?: number, studentCount?: number, excludeId?: string): ConflictResult => {
    // 0. Capacity Check
    if (roomCapacity && studentCount && studentCount > roomCapacity) {
        return {
            hasConflict: true,
            conflictingType: 'CAPACITY',
            message: `عجز في السعة الاستيعابية: عدد الطلاب (${studentCount}) يتجاوز سعة القاعة (${roomCapacity}).`
        };
    }

    const exams = getExams().filter(e => e.id !== excludeId);
    const lectures = getSchedule();
    const newStart = toMinutes(newExam.startTime);
    const newEnd = newStart + newExam.durationMinutes;
    const newExamStudentIds = new Set(newExam.seatingPlan?.map(s => s.studentId) || []);

    // Get Day of Week for checking against regular schedule
    const examDate = new Date(newExam.date);
    const dayIndex = examDate.getDay();
    const jsDays: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as any;
    const examDay = jsDays[dayIndex];

    // 1. Check against other EXAMS
    const staff = getStaff();
    const invigilatorStatus = newExam.invigilators.map(id => {
        const member = staff.find(s => s.id === id);
        return { id, name: member?.name || id, status: member?.status };
    });

    // Check for "On Leave" status
    const onLeaveInvigilator = invigilatorStatus.find(s => s.status === 'ON_LEAVE');
    if (onLeaveInvigilator) {
        return {
            hasConflict: true,
            conflictingType: 'INVIGILATOR',
            message: `تعارض مراقبين: المراقب (${onLeaveInvigilator.name}) في إجازة حالياً ولا يمكن تكليفه.`
        };
    }

    // Check Daily Load (Max 2 exams per day per invigilator to prevent exhaustion)
    const MAX_DAILY_EXAMS = 3;
    for (const invId of newExam.invigilators) {
        const dailyExams = exams.filter(e => e.date === newExam.date && e.invigilators.includes(invId));
        if (dailyExams.length >= MAX_DAILY_EXAMS) {
            const member = staff.find(s => s.id === invId);
            return {
                hasConflict: true,
                conflictingType: 'INVIGILATOR',
                message: `تعارض مراقبين: العبء اليومي للمراقب (${member?.name || invId}) اكتمل (أقصى حد ${MAX_DAILY_EXAMS} امتحانات في اليوم).`
            };
        }
    }

    for (const existing of exams) {
        if (existing.date !== newExam.date) continue;

        const existStart = toMinutes(existing.startTime);
        const existEnd = existStart + existing.durationMinutes;
        
        // Use a 15-minute buffer for room and invigilator transitions
        const BUFFER = 15;
        const isOverlapping = (newStart < (existEnd + BUFFER)) && ((newEnd + BUFFER) > existStart);

        if (isOverlapping) {
            // Room Conflict
            if (existing.room === newExam.room) {
                return { 
                    hasConflict: true, 
                    conflictingType: 'ROOM',
                    message: `تعارض قاعات: القاعة (${newExam.room}) مشغولة أو في فترة تنظيف بعد امتحان مقرر "${existing.courseName}".` 
                };
            }

            // Invigilator Conflict
            const overlapInvigilators = newExam.invigilators.filter(id => existing.invigilators.includes(id));
            if (overlapInvigilators.length > 0) {
                return {
                    hasConflict: true,
                    conflictingType: 'INVIGILATOR',
                    message: `تعارض مراقبين: المسموح به هو 15 دقيقة استراحة بين المراقبات. المراقب لديه مهمة في امتحان مقرر "${existing.courseName}".`
                };
            }
        }

        // Exact overlap check for students and course duplication (no buffer needed here)
        const isExactOverlapping = (newStart < existEnd) && (newEnd > existStart);
        if (isExactOverlapping) {
            // Course Conflict
            if (existing.courseId === newExam.courseId) {
                 return { 
                    hasConflict: true, 
                    conflictingType: 'COURSE',
                    message: `يوجد امتحان مجدول لهذا المقرر ("${existing.courseName}") في هذا الوقت.` 
                };
            }

            // Student Conflict (Overlapping courses for the same student)
            if (newExamStudentIds.size > 0 && existing.seatingPlan) {
                const existingStudentIds = existing.seatingPlan.map(s => s.studentId);
                const overlappingStudents = existingStudentIds.filter(id => newExamStudentIds.has(id));
                if (overlappingStudents.length > 0) {
                    return {
                        hasConflict: true,
                        conflictingType: 'COURSE',
                        message: `تعارض طلاب: يوجد ${overlappingStudents.length} طالب لديهم امتحان مقرر "${existing.courseName}" في نفس هذا الوقت.`
                    };
                }
            }
        }
    }

    // 2. Check against regular LECTURES
    for (const lecture of lectures) {
        if (lecture.day !== examDay) continue;

        const lectureStart = toMinutes(lecture.startTime);
        const lectureEnd = toMinutes(lecture.endTime);
        const isOverlapping = (newStart < lectureEnd) && (newEnd > lectureStart);

        if (isOverlapping) {
            // Room occupied by lecture
            if (lecture.room === newExam.room) {
                return {
                    hasConflict: true,
                    conflictingType: 'ROOM',
                    message: `تعارض قاعات (محاضرات): القاعة (${newExam.room}) مشغولة بمحاضرة مقرر "${lecture.courseName}".`
                };
            }

            // Invigilator (Instructor) teaching a lecture
            const overlapInvigilators = newExam.invigilators.filter(id => id === lecture.instructorId);
            if (overlapInvigilators.length > 0) {
                return {
                    hasConflict: true,
                    conflictingType: 'INVIGILATOR',
                    message: `تعارض مراقبين (محاضرات): المراقب لديه محاضرة مقرر "${lecture.courseName}" في نفس هذا الوقت.`
                };
            }
        }
    }

    return { hasConflict: false };
};

export const findAvailableInvigilators = (date: string, startTime: string, durationMinutes: number, count: number): string[] => {
    const staff = getStaff().filter(s => s.type === 'ACADEMIC' && s.status === 'ACTIVE');
    const exams = getExams();
    const lectures = getSchedule();
    const start = toMinutes(startTime);
    const end = start + durationMinutes;

    const available = staff.filter(s => {
        // 1. Check current exams on same day/time
        const hasExamConflict = exams.some(e => {
            if (e.date !== date || !e.invigilators.includes(s.id)) return false;
            const eStart = toMinutes(e.startTime);
            const eEnd = eStart + e.durationMinutes;
            return (start < eEnd) && (end > eStart);
        });
        if (hasExamConflict) return false;

        // 2. Check daily load
        const dailyExams = exams.filter(e => e.date === date && e.invigilators.includes(s.id));
        if (dailyExams.length >= 3) return false;

        // 3. Check lectures (if any)
        const examDate = new Date(date);
        const dayIndex = examDate.getDay();
        const jsDays: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as any;
        const examDay = jsDays[dayIndex];

        const hasLectureConflict = lectures.some(l => {
            if (l.day !== examDay || l.instructorId !== s.id) return false;
            const lStart = toMinutes(l.startTime);
            const lEnd = toMinutes(l.endTime);
            return (start < lEnd) && (end > lStart);
        });
        
        return !hasLectureConflict;
    });

    // Shuffle and pick top X
    return available.sort(() => Math.random() - 0.5).slice(0, count).map(s => s.id);
};

/**
 * خوارزمية توزيع المقاعد: تقوم بترتيب الطلاب بناءً على الرقم الدراسي
 * وتعيين أرقام مقاعد متسلسلة.
 */
export const generateSeatingPlan = (students: Student[]): SeatingAssignment[] => {
    const sorted = [...students].sort((a, b) => a.id.localeCompare(b.id));
    return sorted.map((s, index) => ({
        studentId: s.id,
        studentName: s.name,
        seatNumber: index + 1
    }));
};

export const getDayLabel = (day: DayOfWeek): string => {
    const map: Record<DayOfWeek, string> = {
        'SATURDAY': 'السبت', 'SUNDAY': 'الأحد', 'MONDAY': 'الاثنين', 
        'TUESDAY': 'الثلاثاء', 'WEDNESDAY': 'الأربعاء', 'THURSDAY': 'الخميس'
    };
    return map[day];
};

export const getInstructorSchedule = (instructorId: string): ClassSession[] => {
    return getSchedule().filter(s => s.instructorId === instructorId);
};

export const getStudentSchedule = (studentId: string, enrolledCourseIds: string[]): ClassSession[] => {
    return getSchedule().filter(s => enrolledCourseIds.includes(s.courseId));
};

export const checkStudentRegistrationConflict = (newCourseId: string, enrolledCourseIds: string[]): ConflictResult => {
    const schedule = getSchedule();
    const newCourseSessions = schedule.filter(s => s.courseId === newCourseId);
    const existingSessions = schedule.filter(s => enrolledCourseIds.includes(s.courseId));

    for (const newSession of newCourseSessions) {
        const newStart = toMinutes(newSession.startTime);
        const newEnd = toMinutes(newSession.endTime);

        for (const existing of existingSessions) {
            if (existing.day !== newSession.day) continue;
            const existStart = toMinutes(existing.startTime);
            const existEnd = toMinutes(existing.endTime);
            const isOverlapping = (newStart < existEnd) && (newEnd > existStart);

            if (isOverlapping) {
                return {
                    hasConflict: true,
                    message: `تعارض في الجدول: موعد المقرر (${newSession.courseName}) يتعارض مع مقرر مسجل مسبقاً (${existing.courseName}) يوم ${getDayLabel(newSession.day)}.`
                };
            }
        }
    }

    return { hasConflict: false };
};
