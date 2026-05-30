import { Instructor, AttendanceRecord, AttendanceStatus } from '../types';

const STORAGE_KEY_INSTRUCTORS = 'oracle_campus_instructors';
const STORAGE_KEY_ATTENDANCE = 'oracle_campus_attendance';

const MOCK_INSTRUCTORS: Instructor[] = [
    { id: 'INS001', name: 'د. علي التواتي', degree: 'PhD', departmentId: 'DEPT-03', email: 'ali.t@oraclecampus.edu', specialization: 'Machine Learning', courseIds: ['CS101', 'CS202'] },
    { id: 'INS002', name: 'د. فاطمة الزهراء', degree: 'PhD', departmentId: 'DEPT-02', email: 'fatima.z@oraclecampus.edu', specialization: 'Software Architecture', courseIds: ['CS101'] },
    { id: 'INS003', name: 'أ. خالد المسماري', degree: 'Master', departmentId: 'DEPT-04', email: 'khaled.m@oraclecampus.edu', specialization: 'Structural Eng', courseIds: ['BA101'] }
];

// --- Instructors ---

export const getInstructors = (): Instructor[] => {
    const data = localStorage.getItem(STORAGE_KEY_INSTRUCTORS);
    if (!data) {
        localStorage.setItem(STORAGE_KEY_INSTRUCTORS, JSON.stringify(MOCK_INSTRUCTORS));
        return MOCK_INSTRUCTORS;
    }
    return JSON.parse(data);
};

export const saveInstructor = (instructor: Instructor): void => {
    const list = getInstructors();
    const index = list.findIndex(i => i.id === instructor.id);
    if (index >= 0) {
        list[index] = instructor;
    } else {
        list.push(instructor);
    }
    localStorage.setItem(STORAGE_KEY_INSTRUCTORS, JSON.stringify(list));
};

export const deleteInstructor = (id: string): void => {
    const list = getInstructors().filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY_INSTRUCTORS, JSON.stringify(list));
};

// --- Attendance ---

export const getAttendanceRecords = (): AttendanceRecord[] => {
    const data = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
    return data ? JSON.parse(data) : [];
};

export const saveAttendance = (records: AttendanceRecord[]): void => {
    // This function merges new records with existing ones
    // If a record exists for same student, course, and date, it updates it
    let allRecords = getAttendanceRecords();
    
    records.forEach(newRec => {
        const index = allRecords.findIndex(r => 
            r.studentId === newRec.studentId && 
            r.courseId === newRec.courseId && 
            r.date === newRec.date
        );
        
        if (index >= 0) {
            allRecords[index] = newRec;
        } else {
            allRecords.push(newRec);
        }
    });

    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(allRecords));
};

export const getStudentAttendanceStats = (studentId: string, courseId?: string) => {
    const all = getAttendanceRecords();
    const studentRecords = all.filter(r => r.studentId === studentId && (courseId ? r.courseId === courseId : true));
    
    const total = studentRecords.length;
    const present = studentRecords.filter(r => r.status === 'PRESENT').length;
    const absent = studentRecords.filter(r => r.status === 'ABSENT').length;
    const excused = studentRecords.filter(r => r.status === 'EXCUSED').length;

    // Calculate absence percentage (Absent / Total Sessions) * 100
    // Note: Excused usually counts as absent but doesn't trigger bans, or reduces the denominator.
    // Regulation 501: Absence > 25% bars exam. Usually Excused is capped at 15% extra.
    // Simple calculation: (Absent / Total) * 100
    
    const absenceRate = total > 0 ? (absent / total) * 100 : 0;

    return { total, present, absent, excused, absenceRate: Math.round(absenceRate) };
};
