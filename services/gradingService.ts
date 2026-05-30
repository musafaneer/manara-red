import { Grade, StudentStatus, ProgramType, Course } from '../types';

/**
 * Calculates the weighted GPA based on grades and course credits.
 * Formula: Sum(Score * Credits) / Sum(Credits)
 */
export const calculateWeightedGPA = (grades: Grade[], courses: Course[]): number => {
  let totalWeightedScore = 0;
  let totalCredits = 0;

  grades.forEach(grade => {
    // Skip withdrawn courses or unresolved incomplete courses from GPA calculations under University Regulations
    if (grade.isWithdrawn) {
      return;
    }

    // Skip unresolved incomplete courses from GPA calculations under University Regulations (Incomplete status/IC)
    if (grade.isIncomplete && !grade.incompleteResolved) {
      return;
    }

    const course = courses.find(c => c.id === grade.courseId);
    // Default to 3 credits if course definition is missing (edge case safety)
    const credits = course ? course.credits : 3;
    
    totalWeightedScore += grade.score * credits;
    totalCredits += credits;
  });

  if (totalCredits === 0) return 0;
  return Number((totalWeightedScore / totalCredits).toFixed(2));
};

/**
 * Evaluates the student's academic status based on Libyan Regulation 501.
 * 
 * Rules:
 * - Undergraduate Passing GPA: 50%
 * - Postgraduate Passing GPA: 65%
 * - If GPA < Passing -> WARNING
 * - If GPA >= Passing and was WARNING -> ACTIVE
 * - If Warnings >= 3 -> Technically SUSPENDED (Logic handled here returns updated count, UI/User decides suspension)
 */
export interface StatusResult {
  status: StudentStatus;
  warningsCount: number;
}

export const evaluateAcademicStatus = (
  currentGpa: number,
  program: ProgramType,
  currentStatus: StudentStatus,
  currentWarnings: number
): StatusResult => {
  const passingScore = program === ProgramType.POSTGRADUATE ? 65 : 50;
  
  let newStatus = currentStatus;
  let newWarnings = currentWarnings;

  // Check for academic warning condition
  if (currentGpa < passingScore) {
    // Only increment warning if not already in a terminal state (like Suspended/Graduated/Withdrawn)
    if (currentStatus === StudentStatus.ACTIVE || currentStatus === StudentStatus.WARNING) {
       // If they were already Active, move to Warning and increment
       // If they were already Warning, just increment
       // Note: In a real semester system, warnings are incremented once per semester. 
       // For this simulation, we assume every grade update might trigger a status check.
       // To avoid double counting on same semester edits, a more complex history is needed.
       // Here we implement a simple state transition:
       
       if (currentStatus === StudentStatus.ACTIVE) {
           newStatus = StudentStatus.WARNING;
           newWarnings = 1;
       } else if (currentStatus === StudentStatus.WARNING) {
           // We don't auto-increment here to prevent infinite loop on edits.
           // We assume the user manages the count or we stick to current count unless logic dictates otherwise.
           // For simplicity in this demo: we ensure they are in WARNING state.
           newStatus = StudentStatus.WARNING;
       }
    }
  } else {
    // Recovery Logic
    if (currentStatus === StudentStatus.WARNING) {
      newStatus = StudentStatus.ACTIVE;
      // Regulation 501 doesn't explicitly say warnings are cleared, but usually status returns to active.
      // We keep the warning count history or reset? Usually reset in simple systems, or keep history.
      // Let's reset count to 0 for a "Fresh Start" visual feel, or keep it. Let's reset.
      newWarnings = 0; 
    }
  }

  return { status: newStatus, warningsCount: newWarnings };
};