
import { Student, StudentStatus, Course, Grade, UserRole, StaffMember } from '../types';
import { getStudents, saveStudent, getCourses, getSystemSettings, getStaff } from './storageService';
import { logAction } from './auditService';
import { notifySuccess, notifyError } from './notificationService';
import { calculateWeightedGPA } from './gradingService';

/**
 * AcademicService handles high-level academic business logic, 
 * ensuring data integrity and compliance with Regulation 501.
 */
export const academicService = {
  /**
   * Calculates the GPA for a student based on their grades.
   */
  calculateGPA: (grades: Grade[]): number => {
    return calculateWeightedGPA(grades, getCourses());
  },

  /**
   * Updates a student's status automatically based on their GPA and rules.
   */
  evaluateStudentStatus: (student: Student): StudentStatus => {
    const settings = getSystemSettings();
    const gpa = student.gpa;

    if (gpa < settings.regulation.minGpaWarning) {
      if (student.warningsCount >= 3) return StudentStatus.SUSPENDED;
      return StudentStatus.WARNING;
    }

    return StudentStatus.ACTIVE;
  },

  /**
   * Validates if a faculty member can take on more courses.
   * Regulation 501 limits: Professor (10 hours), Assoc. Prof (12 hours), etc.
   */
  canFacultyAcceptLoad: (staffId: string, additionalHours: number): { allowed: boolean; reason?: string } => {
    const staff = getStaff().find(s => s.id === staffId);
    if (!staff || staff.type !== 'ACADEMIC') return { allowed: false, reason: 'Not an academic staff member' };

    const courses = getCourses().filter(c => c.lecturerId === staffId);
    const currentLoad = courses.reduce((acc, curr) => acc + (curr.credits || 3), 0);
    
    // Limits based on position
    let limit = 12; // Default
    if (staff.position?.includes('Professor')) limit = 10;
    if (staff.position?.includes('Assistant')) limit = 16;

    if (currentLoad + additionalHours > limit) {
      return { 
        allowed: false, 
        reason: `Load limit exceeded (${currentLoad + additionalHours}/${limit} hours). Regulation 501 Cap reached.` 
      };
    }

    return { allowed: true };
  },

  /**
   * Submits a grade for a student and performs necessary side effects.
   */
  submitGrade: (studentId: string, courseId: string, score: number, semester: string, lecturerId: string) => {
    const student = getStudents().find(s => s.id === studentId);
    const course = getCourses().find(c => c.id === courseId);

    if (!student || !course) {
      notifyError('Student or Course not found');
      return;
    }

    const newGrade: Grade = {
      courseId,
      courseName: course.name,
      score,
      semester
    };

    const updatedGrades = [...student.grades.filter(g => g.courseId !== courseId), newGrade];
    const updatedGpa = academicService.calculateGPA(updatedGrades);
    
    const updatedStudent: Student = {
      ...student,
      grades: updatedGrades,
      gpa: updatedGpa,
      warningsCount: updatedGpa < getSystemSettings().regulation.minGpaWarning ? student.warningsCount + 1 : student.warningsCount
    };

    updatedStudent.status = academicService.evaluateStudentStatus(updatedStudent);

    saveStudent(updatedStudent);
    logAction(
      'GRADE_UPDATE',
      `Grade submitted for ${student.name} in ${course.name}: ${score}%`,
      'info'
    );
    notifySuccess(`Grade updated for ${student.name}`);
  },

  /**
   * Submits a grade change that has been approved by a council resolution (e.g. after appeals or errors).
   */
  submitCouncilApprovedGrade: (studentId: string, courseId: string, score: number, resolutionId: string) => {
    const student = getStudents().find(s => s.id === studentId);
    if (!student) return;

    const existingGrade = student.grades.find(g => g.courseId === courseId);
    if (!existingGrade) return;

    const updatedGrade: Grade = {
      ...existingGrade,
      score,
      resolutionId, // Requirement from Reg 501 for changes after final posting
      totalScore: score 
    };

    const updatedGrades = student.grades.map(g => g.courseId === courseId ? updatedGrade : g);
    const updatedGpa = academicService.calculateGPA(updatedGrades);

    const updatedStudent: Student = {
      ...student,
      grades: updatedGrades,
      gpa: updatedGpa
    };

    saveStudent(updatedStudent);
    logAction('COUNCIL_GRADE_CHANGE', `Grade modified by Resolution ${resolutionId} for ${student.name}`, 'warning');
    notifySuccess('Grade updated with council resolution reference');
  },

  /**
   * Updates the physical archive metadata for a student.
   */
  updateArchiveLocation: (studentId: string, archiveData: Partial<Student['dossierMetadata']>) => {
    const student = getStudentById(studentId);
    if (!student) return;

    const updatedStudent: Student = {
      ...student,
      dossierMetadata: {
        ...(student.dossierMetadata || { 
          archiveId: `ARC-${student.id}`, 
          originalDocumentsVerified: false, 
          missingDocuments: [] 
        }),
        ...archiveData
      }
    };

    saveStudent(updatedStudent);
    logAction('ARCHIVE_UPDATE', `Archive metadata updated for ${student.name}`, 'info');
  },

  /**
   * Identifies students eligible for Second Round based on failed courses.
   */
  getSecondRoundEligibility: (studentId: string): { eligible: boolean; courses: string[] } => {
    const student = getStudents().find(s => s.id === studentId);
    if (!student) return { eligible: false, courses: [] };

    const failedCourses = student.grades
      .filter(g => g.score < 50 && !g.isSecondRound)
      .map(g => g.courseName);

    return {
      eligible: failedCourses.length > 0 && failedCourses.length <= 4, // Typical limit in some faculties
      courses: failedCourses
    };
  },

  /**
   * Directs the student to the next stage of the clearance process.
   */
  advanceClearance: (studentId: string, currentStage: Student['clearance']['currentStage']) => {
    const student = getStudentById(studentId);
    if (!student) return;

    const stages: Student['clearance']['currentStage'][] = ['LIBRARY', 'FINANCE', 'LABS', 'DEPARTMENT', 'REGISTRAR', 'COMPLETED'];
    const currentIndex = stages.indexOf(currentStage);
    const nextStage = stages[currentIndex + 1] || 'COMPLETED';

    const updatedStudent: Student = {
      ...student,
      clearance: {
        currentStage: nextStage as any,
        completedStages: [...(student.clearance?.completedStages || []), currentStage],
        isFullyCleared: nextStage === 'COMPLETED',
        clearedAt: nextStage === 'COMPLETED' ? new Date().toISOString() : undefined
      }
    };

    saveStudent(updatedStudent);
    logAction('CLEARANCE_UPDATE', `Clearance advanced for ${student.name} from ${currentStage} to ${nextStage}`, 'info');
  },

  /**
   * Verifies a student dossier (Registrar operation).
   */
  verifyStudent: (studentId: string, verifierId: string) => {
    const student = getStudentById(studentId);
    if (!student) return;

    const updatedStudent: Student = {
      ...student,
      verificationStatus: 'VERIFIED' as any // Assuming VerificationStatus exists
    };

    saveStudent(updatedStudent);
    logAction('VERIFY_STUDENT', `Verified student dossier: ${student.id}`, 'info');
  }
};

function getStudentById(id: string): Student | undefined {
  return getStudents().find(s => s.id === id);
}
