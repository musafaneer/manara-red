import { getStudents, getCourses, getSystemSettings } from './storageService';
import { Student, Course, AttendanceRecord, AttendanceStatus, ProgramType } from '../types';

const STORAGE_KEY_ATTENDANCE = 'oracle_campus_attendance';

// Standard dates in the past for mock data
const MOCK_DATES = ['2026-05-10', '2026-05-15', '2026-05-20', '2026-05-25'];

/**
 * Helper to generate mock attendance records for students registered in active courses
 */
const generateMockAttendance = (): AttendanceRecord[] => {
  const students = getStudents();
  const courses = getCourses();
  const settings = getSystemSettings();
  const records: AttendanceRecord[] = [];

  // Let's find students who have enrollments in the current semester
  students.forEach((student) => {
    const currentEnrollments = student.enrollments?.filter(
      (e) => e.semester === settings.currentSemester && e.status === 'REGISTERED'
    ) || [];

    currentEnrollments.forEach((enrollment) => {
      const course = courses.find((c) => c.id === enrollment.courseId);
      if (!course) return;

      // Create attendance across past dates
      MOCK_DATES.forEach((date, dateIdx) => {
        let status: AttendanceStatus = 'PRESENT';
        let remarks = '';

        // Deterministic mock generation so different students get different attendance rates
        // Let's make some students have high absences to show the "barred" feature
        const studentSeed = student.id.charCodeAt(student.id.length - 1) || 0;
        
        if (studentSeed % 3 === 0) {
          // Absent 50% of the time (dates 1 and 3)
          if (dateIdx === 1 || dateIdx === 3) {
            status = 'ABSENT';
            remarks = 'No show, no excuse provided';
          }
        } else if (studentSeed % 4 === 0) {
          // Absent 25% (date 2 is absent, and maybe excused on date 0)
          if (dateIdx === 2) {
            status = 'ABSENT';
            remarks = 'Absent without notice';
          } else if (dateIdx === 0) {
            status = 'EXCUSED';
            remarks = 'Medical certificate submitted';
          }
        } else if (studentSeed % 5 === 0) {
          // High absences: 75% absent (date 0, 1, 2 are absent)
          if (dateIdx < 3) {
            status = 'ABSENT';
            remarks = 'Persistent absence';
          }
        } else {
          // 100% present or occasional excused
          if (dateIdx === 0 && studentSeed % 2 === 0) {
            status = 'EXCUSED';
            remarks = 'Approved personal leave';
          }
        }

        records.push({
          id: `${course.id}-${date}-${student.id}`,
          studentId: student.id,
          studentName: student.name,
          courseId: course.id,
          courseName: course.name,
          date,
          status,
          markedBy: 'Dr. Omar', // or generic faculty
          markedAt: new Date(date + 'T10:00:00Z').toISOString(),
          remarks,
        });
      });
    });
  });

  return records;
};

/**
 * Fetch all attendance records from localStorage
 */
export const getAttendanceRecords = (): AttendanceRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
    if (!data || data === 'undefined' || data === 'null') {
      const mockData = generateMockAttendance();
      localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(mockData));
      return mockData;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error fetching attendance records:', e);
    return [];
  }
};

/**
 * Save all attendance records to localStorage
 */
export const saveAttendanceRecords = (records: AttendanceRecord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving attendance records:', e);
  }
};

/**
 * Get active student enrollments for a course in the current semester
 */
export const getStudentsInCourse = (courseId: string): Student[] => {
  const students = getStudents();
  const settings = getSystemSettings();
  
  return students.filter((s) =>
    s.enrollments?.some(
      (e) =>
        e.courseId === courseId &&
        e.semester === settings.currentSemester &&
        e.status === 'REGISTERED'
    )
  );
};

/**
 * Get unique session dates for which attendance has been taken in this course
 */
export const getCourseSessionDates = (courseId: string): string[] => {
  const records = getAttendanceRecords();
  const courseRecords = records.filter((r) => r.courseId === courseId);
  const dates = courseRecords.map((r) => r.date);
  return Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a)); // sorted descending by date
};

/**
 * Get attendance records for a specific course on a specific date
 */
export const getAttendanceByCourseAndDate = (
  courseId: string,
  date: string
): AttendanceRecord[] => {
  const records = getAttendanceRecords();
  return records.filter((r) => r.courseId === courseId && r.date === date);
};

/**
 * Save attendance records for a course and date
 */
export const saveAttendanceForCourseAndDate = (
  courseId: string,
  date: string,
  studentAttendances: { studentId: string; status: AttendanceStatus; remarks?: string }[],
  markedBy: string
): void => {
  const allRecords = getAttendanceRecords();
  const courses = getCourses();
  const students = getStudents();
  const course = courses.find((c) => c.id === courseId);
  const courseName = course ? course.name : courseId;

  // Filter out any existing records for this course and date
  let filteredRecords = allRecords.filter(
    (r) => !(r.courseId === courseId && r.date === date)
  );

  // Add the new / updated records
  const newRecords: AttendanceRecord[] = studentAttendances.map((sa) => {
    const student = students.find((s) => s.id === sa.studentId);
    return {
      id: `${courseId}-${date}-${sa.studentId}`,
      studentId: sa.studentId,
      studentName: student ? student.name : sa.studentId,
      courseId,
      courseName,
      date,
      status: sa.status,
      markedBy,
      markedAt: new Date().toISOString(),
      remarks: sa.remarks || '',
    };
  });

  filteredRecords.push(...newRecords);
  saveAttendanceRecords(filteredRecords);
};

/**
 * Delete an entire attendance session (date) for a course
 */
export const deleteAttendanceSession = (courseId: string, date: string): void => {
  const allRecords = getAttendanceRecords();
  const filtered = allRecords.filter(
    (r) => !(r.courseId === courseId && r.date === date)
  );
  saveAttendanceRecords(filtered);
};

/**
 * Calculate attendance statistics for a single student in a specific course
 */
export const getStudentAttendanceStats = (
  studentId: string,
  courseId: string
) => {
  const allRecords = getAttendanceRecords();
  const courseRecords = allRecords.filter(
    (r) => r.courseId === courseId && r.studentId === studentId
  );

  const total = courseRecords.length;
  const present = courseRecords.filter((r) => r.status === 'PRESENT').length;
  const absent = courseRecords.filter((r) => r.status === 'ABSENT').length;
  const excused = courseRecords.filter((r) => r.status === 'EXCUSED').length;

  const percentage = total > 0 ? (absent / total) * 100 : 0;
  
  // Barred threshold is > 25% of class sessions
  const isBarred = total > 0 && percentage > 25;

  return {
    total,
    present,
    absent,
    excused,
    percentage: Number(percentage.toFixed(1)),
    isBarred,
  };
};

/**
 * Get quick dashboard-wide stats for all courses to find any barred students
 */
export const getBarredStudentsReport = () => {
  const students = getStudents();
  const courses = getCourses();
  const allRecords = getAttendanceRecords();
  const barredList: {
    studentId: string;
    studentName: string;
    courseId: string;
    courseCode: string;
    courseName: string;
    absentCount: number;
    totalSessions: number;
    absentPercentage: number;
  }[] = [];

  students.forEach((student) => {
    const studentEnrollments = student.enrollments || [];
    studentEnrollments.forEach((enrollment) => {
      const course = courses.find((c) => c.id === enrollment.courseId);
      if (!course) return;

      const stats = getStudentAttendanceStats(student.id, course.id);
      if (stats.isBarred) {
        barredList.push({
          studentId: student.id,
          studentName: student.name,
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          absentCount: stats.absent,
          totalSessions: stats.total,
          absentPercentage: stats.percentage,
        });
      }
    });
  });

  return barredList;
};
