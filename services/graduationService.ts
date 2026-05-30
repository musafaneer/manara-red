import { Student, Course, Grade, ProgramType, AcademicProgram, GraduateThesis, ResearchPublication, ThesisStatus } from '../types';
import { getAcademicPrograms, getCourses, getStudents } from './storageService';
import { getThesisByStudent, getPublicationsByStudent } from './graduateService';

export interface GraduationRequirement {
  programId: string;
  totalCreditsRequired: number;
  minGpaRequired: number;
  projectOrThesisRequired: boolean;
  minPublicationsRequired: number;
  mandatoryCourseCodes: string[]; // Specific course codes, e.g., ["CS499"]
}

export interface EligibilityChecklist {
  studentId: string;
  studentName: string;
  programName: string;
  programType: ProgramType;
  
  // Requirements & current state
  creditsEarned: number;
  creditsRequired: number;
  creditsStatus: boolean;

  gpa: number;
  minGpaRequired: number;
  gpaStatus: boolean;

  projectOrThesisRequired: boolean;
  projectOrThesisPassed: boolean;
  projectOrThesisCode?: string;
  projectOrThesisName?: string;
  projectOrThesisDetailsAr?: string;
  projectOrThesisDetailsEn?: string;

  publicationsCount: number;
  publicationsRequired: number;
  publicationsStatus: boolean;

  clearanceCompleted: boolean;
  clearanceDetails?: string;

  warningsCount: number;
  academicStandingStatus: boolean; // false if suspended/dismissed or warning threshold

  isEligible: boolean;
  eligibilityPercentage: number;
}

const STORAGE_KEY_GRAD_REQ = 'oracle_campus_grad_requirements';

// Seed default requirements matches for our standard programs
const DEFAULT_REQUIREMENTS: GraduationRequirement[] = [
  {
    programId: 'PRG-01', // Computer Science
    totalCreditsRequired: 18, // Configured to match available credits realistically
    minGpaRequired: 50.0,
    projectOrThesisRequired: true,
    minPublicationsRequired: 0,
    mandatoryCourseCodes: ['CS499']
  },
  {
    programId: 'PRG-02', // Software Engineering
    totalCreditsRequired: 18,
    minGpaRequired: 50.0,
    projectOrThesisRequired: true,
    minPublicationsRequired: 0,
    mandatoryCourseCodes: ['SE499', 'CS499']
  },
  {
    programId: 'PRG-03', // AI
    totalCreditsRequired: 18,
    minGpaRequired: 50.0,
    projectOrThesisRequired: true,
    minPublicationsRequired: 0,
    mandatoryCourseCodes: ['CS499']
  },
  {
    programId: 'PRG-04', // Data Science & AI Micro/MSc
    totalCreditsRequired: 12,
    minGpaRequired: 65.0,
    projectOrThesisRequired: true,
    minPublicationsRequired: 1,
    mandatoryCourseCodes: []
  },
  {
    programId: 'PRG-05', // Cybersecurity
    totalCreditsRequired: 18,
    minGpaRequired: 50.0,
    projectOrThesisRequired: true,
    minPublicationsRequired: 0,
    mandatoryCourseCodes: ['CS499']
  },
  {
    programId: 'PRG-06', // Accounting
    totalCreditsRequired: 18,
    minGpaRequired: 50.0,
    projectOrThesisRequired: true,
    minPublicationsRequired: 0,
    mandatoryCourseCodes: []
  },
  {
    programId: 'PRG-07', // International Accounting MSc
    totalCreditsRequired: 12,
    minGpaRequired: 65.0,
    projectOrThesisRequired: true,
    minPublicationsRequired: 1,
    mandatoryCourseCodes: []
  }
];

export const getGraduationRequirements = (): GraduationRequirement[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_GRAD_REQ);
    if (!data || data === 'undefined' || data === 'null') {
      localStorage.setItem(STORAGE_KEY_GRAD_REQ, JSON.stringify(DEFAULT_REQUIREMENTS));
      return DEFAULT_REQUIREMENTS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : DEFAULT_REQUIREMENTS;
  } catch (e) {
    console.error("Error loading graduation requirements:", e);
    return DEFAULT_REQUIREMENTS;
  }
};

export const saveGraduationRequirement = (req: GraduationRequirement): void => {
  const reqs = getGraduationRequirements();
  const index = reqs.findIndex(r => r.programId === req.programId);
  if (index >= 0) {
    reqs[index] = req;
  } else {
    reqs.push(req);
  }
  localStorage.setItem(STORAGE_KEY_GRAD_REQ, JSON.stringify(reqs));
};

export const calculateStudentEligibility = (student: Student): EligibilityChecklist => {
  const allPrograms = getAcademicPrograms();
  const allCourses = getCourses();
  
  // Retrieve target program
  const program = allPrograms.find(p => p.type === student.program || p.deptId === student.departmentId);
  const programName = program ? program.name : `${student.program} - ${student.departmentId}`;
  const programId = program ? program.id : 'PRG-01';

  // Get specific requirements
  const requirements = getGraduationRequirements();
  const req = requirements.find(r => r.programId === programId) || {
    programId,
    totalCreditsRequired: student.program === ProgramType.POSTGRADUATE ? 12 : 18,
    minGpaRequired: student.program === ProgramType.POSTGRADUATE ? 65.0 : 50.0,
    projectOrThesisRequired: true,
    minPublicationsRequired: student.program === ProgramType.POSTGRADUATE ? 1 : 0,
    mandatoryCourseCodes: student.program === ProgramType.POSTGRADUATE ? [] : ['CS499']
  };

  // 1. Calculate Completed Credits (considering passing thresholds under Reg 501)
  const passingScore = student.program === ProgramType.POSTGRADUATE ? 65 : 50;
  let creditsEarned = 0;
  
  student.grades.forEach(g => {
    // Skip withdrawn courses or unresolved incomplete courses
    if (g.isWithdrawn) return;
    if (g.isIncomplete && !g.incompleteResolved) return;
    
    if (g.score >= passingScore) {
      const course = allCourses.find(c => c.id === g.courseId || c.code === g.courseCode);
      creditsEarned += course ? course.credits : 3;
    }
  });

  const creditsStatus = creditsEarned >= req.totalCreditsRequired;

  // 2. Calculate GPA Status
  const gpa = student.gpa;
  const gpaStatus = gpa >= req.minGpaRequired;

  // 3. Project or Thesis check
  let projectOrThesisPassed = false;
  let projectOrThesisDetailsAr = 'لا متطلبات إضافية';
  let projectOrThesisDetailsEn = 'No special thesis requirements';
  let projectOrThesisCode = '';
  let projectOrThesisName = '';

  if (req.projectOrThesisRequired) {
    if (student.program === ProgramType.POSTGRADUATE) {
      // Postgraduate: Check Thesis Status in Graduate Thesis Registry
      const thesis = getThesisByStudent(student.id);
      if (thesis) {
        projectOrThesisName = thesis.title;
        projectOrThesisCode = thesis.id;
        const acceptedStatuses = [
          ThesisStatus.DEFENDED_ACCEPTED,
          ThesisStatus.DEFENDED_MINOR_REVISIONS
        ];
        projectOrThesisPassed = acceptedStatuses.includes(thesis.status);
        
        projectOrThesisDetailsAr = `الأطروحة: "${thesis.title}" - الحالة: ${
          thesis.status === ThesisStatus.DEFENDED_ACCEPTED 
            ? 'مقبولة دون تعديلات' 
            : thesis.status === ThesisStatus.DEFENDED_MINOR_REVISIONS 
              ? 'مقبولة بتعديلات طفيفة' 
              : 'قيد التنفيذ / المراجعة'
        }`;
        projectOrThesisDetailsEn = `Thesis: "${thesis.title}" - Status: ${thesis.status}`;
      } else {
        projectOrThesisDetailsAr = 'الأطروحة الدراسية: لم تسجل بعد أو لم تدرج بالمقترح';
        projectOrThesisDetailsEn = 'Graduate Thesis: Not registered or proposed yet';
        projectOrThesisPassed = false;
      }
    } else {
      // Undergraduate: Check if they passed any mandatory graduation course code (e.g. CS499)
      const projectGrade = student.grades.find(g => 
        (g.courseCode && req.mandatoryCourseCodes.includes(g.courseCode)) ||
        req.mandatoryCourseCodes.some(code => g.courseName.toLowerCase().includes('graduation') || g.courseName.toLowerCase().includes('project'))
      );

      if (projectGrade) {
        projectOrThesisCode = projectGrade.courseCode || 'CS499';
        projectOrThesisName = projectGrade.courseName;
        projectOrThesisPassed = projectGrade.score >= passingScore;
        projectOrThesisDetailsAr = `مشروع التخرج (${projectOrThesisCode}): ${projectGrade.courseName} - الدرجة: ${projectGrade.score}% (${projectOrThesisPassed ? 'مستوفي' : 'رسب'})`;
        projectOrThesisDetailsEn = `Graduation Project (${projectOrThesisCode}): Passed with ${projectGrade.score}%`;
      } else {
        projectOrThesisDetailsAr = `مقرر مشروع التخرج العملي (${req.mandatoryCourseCodes.join(', ') || 'CS499'}): غير مسجل أو لم تسند درجته بعد`;
        projectOrThesisDetailsEn = `Undergraduate Graduation Project: Requirements not registered or completed`;
        projectOrThesisPassed = false;
      }
    }
  } else {
    projectOrThesisPassed = true;
  }

  // 4. Publications check
  const studentPublications = getPublicationsByStudent(student.id);
  const publicationsCount = studentPublications.length;
  const publicationsStatus = publicationsCount >= req.minPublicationsRequired;

  // 5. Clean Institutional Balance (Check student clearance object/financial account)
  const clearanceCompleted = student.clearance ? student.clearance.isFullyCleared : true;
  
  // Determine warning status - 3 or more warnings count means academic dismissal/warning blocks graduation rules
  const warningsCount = student.warningsCount || 0;
  const academicStandingStatus = warningsCount < 3;

  // Calculate Overall Eligibility
  const isEligible = creditsStatus && gpaStatus && projectOrThesisPassed && publicationsStatus && clearanceCompleted && academicStandingStatus;

  // Calculate percentage progress toward graduation
  let criteriaMet = 0;
  let totalCriteria = 5;

  if (creditsStatus) criteriaMet++;
  if (gpaStatus) criteriaMet++;
  if (projectOrThesisPassed) criteriaMet++;
  if (publicationsStatus) criteriaMet++;
  if (clearanceCompleted && academicStandingStatus) criteriaMet++;

  const eligibilityPercentage = Math.round((criteriaMet / totalCriteria) * 100);

  return {
    studentId: student.id,
    studentName: student.name,
    programName,
    programType: student.program,
    creditsEarned,
    creditsRequired: req.totalCreditsRequired,
    creditsStatus,
    gpa,
    minGpaRequired: req.minGpaRequired,
    gpaStatus,
    projectOrThesisRequired: req.projectOrThesisRequired,
    projectOrThesisPassed,
    projectOrThesisCode,
    projectOrThesisName,
    projectOrThesisDetailsAr,
    projectOrThesisDetailsEn,
    publicationsCount,
    publicationsRequired: req.minPublicationsRequired,
    publicationsStatus,
    clearanceCompleted,
    clearanceDetails: student.clearance 
      ? `المرحلة الحالية: ${student.clearance.currentStage}` 
      : 'براءة ذمة مستوفاة',
    warningsCount,
    academicStandingStatus,
    isEligible,
    eligibilityPercentage
  };
};

export const graduationService = {
  getGraduationRequirements,
  saveGraduationRequirement,
  calculateStudentEligibility
};
