
import { ComponentType } from 'react';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STUDENT = 'STUDENT',
  FACULTY = 'FACULTY',
  DEPT_HEAD = 'DEPT_HEAD',
  DEAN = 'DEAN',
  REGISTRATION_OFFICER = 'REGISTRATION_OFFICER',
  GRADUATE_OFFICER = 'GRADUATE_OFFICER',
  EXAMS_OFFICER = 'EXAMS_OFFICER',
  APPEALS_COMMITTEE = 'APPEALS_COMMITTEE',
  TA_ASSISTANT = 'TA_ASSISTANT',
  FINANCE_OFFICER = 'FINANCE_OFFICER',
  HR_OFFICER = 'HR_OFFICER',
  IT_ADMIN = 'IT_ADMIN',
  ACADEMIC_REGISTRAR = 'ACADEMIC_REGISTRAR',
  DATA_STEWARD = 'DATA_STEWARD',
  VISITOR_EXAMINER = 'VISITOR_EXAMINER',
  CUSTOM = 'CUSTOM'
}

export enum Permission {
  STUDENTS_VIEW = 'STUDENTS_VIEW',
  STUDENTS_EDIT = 'STUDENTS_EDIT',
  STUDENTS_DELETE = 'STUDENTS_DELETE',
  GRADES_VIEW = 'GRADES_VIEW',
  GRADES_EDIT = 'GRADES_EDIT',
  ACADEMICS_VIEW = 'ACADEMICS_VIEW',
  ACADEMICS_MANAGE = 'ACADEMICS_MANAGE',
  DEPT_MANAGE = 'DEPT_MANAGE',
  FINANCE_VIEW = 'FINANCE_VIEW',
  FINANCE_EDIT = 'FINANCE_EDIT',
  FACULTY_MANAGE = 'FACULTY_MANAGE',
  STAFF_MANAGE = 'STAFF_MANAGE',
  ATTENDANCE_MANAGE = 'ATTENDANCE_MANAGE',
  REQUESTS_MANAGE = 'REQUESTS_MANAGE',
  REPORTS_VIEW = 'REPORTS_VIEW',
  SETTINGS_MANAGE = 'SETTINGS_MANAGE',
  ROLES_MANAGE = 'ROLES_MANAGE',
  COMMUNICATIONS_MANAGE = 'COMMUNICATIONS_MANAGE',
  FACILITIES_MANAGE = 'FACILITIES_MANAGE',
  ORGANIZATION_MANAGE = 'ORGANIZATION_MANAGE',
  EXAMS_VIEW = 'EXAMS_VIEW',
  EXAMS_MANAGE = 'EXAMS_MANAGE',
  EXAMS_RESULTS_PUBLISH = 'EXAMS_RESULTS_PUBLISH',
  LECTURES_MANAGE = 'LECTURES_MANAGE',
  GRADUATE_MANAGE = 'GRADUATE_MANAGE',
  AUDIT_VIEW = 'AUDIT_VIEW',
  ACADEMICS_APPROVE = 'ACADEMICS_APPROVE',
  FINANCE_APPROVE = 'FINANCE_APPROVE',
  REGISTRATION_MANAGE = 'REGISTRATION_MANAGE',
  REGISTRATION_STUDENT = 'REGISTRATION_STUDENT',
  COURSE_MATERIAL_UPLOAD = 'COURSE_MATERIAL_UPLOAD',
  STUDENTS_EXPORT = 'STUDENTS_EXPORT',
  STUDENTS_IMPORT = 'STUDENTS_IMPORT',
  GRADES_APPROVE = 'GRADES_APPROVE',
  GRADES_EXPORT = 'GRADES_EXPORT',
  FINANCE_REPORTS = 'FINANCE_REPORTS',
  AUDIT_EXPORT = 'AUDIT_EXPORT',
  SYSTEM_LOGS_VIEW = 'SYSTEM_LOGS_VIEW',
  ENROLLMENT_OVERRIDE = 'ENROLLMENT_OVERRIDE',
  GRADE_CHANGE_APPROVE = 'GRADE_CHANGE_APPROVE',
  GPA_RECALCULATE = 'GPA_RECALCULATE',
  TRANSCRIPT_PRINT_OFFICIAL = 'TRANSCRIPT_PRINT_OFFICIAL',
}

export type StaffType = 'ACADEMIC' | 'ADMINISTRATIVE' | 'TECHNICAL' | 'SECURITY';

export interface StaffMember {
  id: string;
  name: string;
  nationalId: string;
  type: StaffType;
  degree?: 'PhD' | 'Master' | 'Bachelor' | 'Diploma';
  email: string;
  phone: string;
  branchId: string;
  collegeId?: string;
  deptId?: string;
  sectionId?: string;
  position: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';
  joinDate: string;
  specialization?: string;
  academicLoad?: {
    teachingHours: number;
    researchHours: number;
    administrativeHours: number;
    officeHours: number;
    isCompliant: boolean;
  };
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  managerName?: string;
  contactNumber?: string;
  establishedDate?: string;
  status: 'ACTIVE' | 'INACTIVE';
  capacity?: number;
}

export interface College {
  id: string;
  branchId: string;
  name: string;
  deanName?: string;
  buildingId?: string; // المبنى الرئيسي للكلية
  councilMembers?: string[];
}

export interface Department {
  id: string;
  collegeId: string;
  name: string;
  headName?: string;
  headId?: string;
  buildingId?: string; // مبنى القسم
  roomNumber?: string; // المكتب الرئيسي للقسم
  councilMembers?: string[];
  vision?: string;
  mission?: string;
}

export interface Section {
  id: string;
  programId: string;
  name: string;
  description?: string;
}

export interface CouncilDecision {
  id: string;
  deptId: string;
  title: string;
  description: string;
  date: string;
  meetingNumber: string;
  status: 'PROPOSED' | 'APPROVED' | 'ARCHIVED';
}

export interface AcademicProgram {
  id: string;
  deptId: string;
  name: string; 
  type: ProgramType;
  durationSemesters: number;
  objectives?: string[];
  qualityMetrics?: {
    accreditationStatus: 'NATIONAL' | 'INTERNATIONAL' | 'PENDING' | 'NOT_ACCREDITED';
    nextReviewDate: string;
    targetGraduateRate: number;
    intendedLearningOutcomes: IntendedLearningOutcome[];
  };
}

export interface IntendedLearningOutcome {
  id: string;
  category: 'KNOWLEDGE' | 'SKILLS' | 'COMPETENCIES';
  description: string;
}

export interface CourseQualityAudit {
  semesterId: string;
  studentSatisfaction: number; // 1-5
  passRate: number; // 0-100
  avgGrade: number;
  instructorFeedback: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  deptId?: string;
  programType?: ProgramType;
  prerequisites?: string[];
  description?: string;
  syllabus?: string[];
  lecturerId?: string;
  category?: 'CORE' | 'ELECTIVE' | 'GENERAL';
  fee?: number;
  qualityStandards?: {
    ilos: string[]; // Reference to program ILO IDs
    assessmentMethods: string[];
    resourcesRequired: string[];
    benchmarkPassRate: number;
  };
  auditHistory?: CourseQualityAudit[];
}

export interface Building {
  id: string;
  name: string;
  code: string;
  floors: number;
  description?: string;
}

export type RoomType = 'LECTURE_HALL' | 'LAB' | 'SEMINAR_ROOM' | 'OFFICE' | 'EXAM_HALL';

export interface Room {
  id: string;
  buildingId: string;
  name: string;
  type: RoomType;
  capacity: number;
  hasProjector: boolean;
  hasAC: boolean;
  hasSmartBoard?: boolean;
  hasPC?: boolean;
  isAvailable: boolean;
}

export interface StudentNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'REMINDER' | 'ALERT' | 'INFO';
  channel: 'SMS' | 'EMAIL' | 'PORTAL';
}

export interface StudentDocument {
  id: string;
  name: string;
  type: 'ID_CARD' | 'CERTIFICATE' | 'PASSPORT' | 'OTHER';
  uploadDate: string;
  url: string;
}

export interface StudentEnrollment {
  courseId: string;
  courseName?: string;
  semester: string;
  status: 'REGISTERED' | 'DROPPED' | 'COMPLETED' | 'PENDING_APPROVAL' | 'WITHDRAWN';
  enrollmentDate: string;
  paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID';
}

export enum RoleCategory {
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  ACADEMIC = 'ACADEMIC',
  FINANCIAL = 'FINANCIAL',
  STUDENT = 'STUDENT',
  GRADUATE = 'GRADUATE',
  SUPPORT = 'SUPPORT'
}

export enum PermissionAction {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  MANAGE = 'MANAGE',
  APPROVE = 'APPROVE'
}

export enum PermissionScope {
  GLOBAL = 'GLOBAL',
  DEPARTMENT = 'DEPARTMENT',
  OWN = 'OWN'
}

export interface PermissionDefinition {
  id: Permission;
  label: string;
  action: PermissionAction;
  group: string;
  scope: PermissionScope;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  category: RoleCategory;
  isSystem?: boolean;
  legalBasis?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole | string;
  effectiveRole?: UserRole | string;
  avatar?: string;
  // ABAC Attributes
  student_id?: string;
  instructor_user_id?: string;
  department?: string;
  faculty?: string;
  unit?: string;
  committee_id?: string;
  assigned_area?: string;
  system_scope?: 'global' | 'local';
  data_domain?: string;
  assignment_id?: string;
  visibility_level?: number;
  financial_scope?: string;
}

// ABAC Types
export interface ABACResource {
  type: string;
  owner_student_id?: string;
  course_id?: string;
  course_instructor_id?: string;
  course_assistant_id?: string;
  department?: string;
  faculty?: string;
  program_level?: 'undergraduate' | 'graduate';
  financial_scope?: string;
  employee_department?: string;
  data_domain?: string;
  record_type?: string;
  visibility_level?: number;
  assignment_id?: string;
  status?: string;
  workflow_stage?: number;
}

export interface ABACContext {
  current_term?: {
    id: string;
    active: boolean;
    grade_entry_window: boolean;
    exams_status: 'setup' | 'running' | 'results_processing';
    assessment_window: boolean;
    exams_running: boolean;
  };
  request?: {
    type: string;
    origin?: string;
    assigned_to_committee_id?: string;
    status?: string;
    faculty?: string;
    department?: string;
  };
}

export enum ProgramType {
  UNDERGRADUATE = 'جامعي',
  POSTGRADUATE = 'دراسات عليا'
}

export enum GraduateDegreeLevel {
  MASTER = 'ماجستير (MA/MSc)',
  PHD = 'دكتوراه (PhD)',
  POSTDOC = 'ما بعد الدكتوراه (Postdoc)',
  OTHER = 'دراسات تخصصية أخرى'
}

export enum PostgraduatePathway {
  COURSES_DISSERTATION = 'مقررات ورسالة علمية',
  COURSES_ONLY = 'مقررات دراسية فقط',
  COURSES_COMPREHENSIVE = 'مقررات وامتحان شامل',
  COMPREHENSIVE_THESIS_COURSES = 'مقررات وامتحان شامل وأطروحة (لل PhD)',
  COMPREHENSIVE_THESIS_NO_COURSES = 'أطروحة وامتحان شامل بدون مقررات (لل PhD)',
  POSTDOC_RESEARCH = 'بحث ما بعد الدكتوراه',
  CUSTOM = 'نظام خاص / مستقبلي'
}

export enum StudentStatus {
  ACTIVE = 'نشط',
  WARNING = 'إنذار أكاديمي',
  SUSPENDED = 'موقوف',
  GRADUATED = 'خريج',
  WITHDRAWN = 'منسحب',
  DISMISSED = 'مفصول'
}

export enum VerificationStatus {
  UNVERIFIED = 'غير مدقق',
  PENDING = 'قيد التدقيق',
  VERIFIED = 'مدقق',
  REJECTED = 'مرفوض'
}


export interface PlanSemester {
  semesterNumber: number;
  courses: string[]; // List of Course IDs
}

export interface AcademicPlan {
  id: string;
  programId: string;
  version: string;
  isActive: boolean;
  semesters: PlanSemester[];
  totalCredits: number;
}

export interface Grade {
  courseId: string;
  courseCode?: string;
  courseName: string;
  score: number;
  midtermScore?: number;
  finalScore?: number;
  totalScore?: number;
  semester: string;
  resolutionId?: string; // مرجع محضر مجلس القسم في حال تعديل الدرجة
  isSecondRound?: boolean; // دور ثاني
  isIncomplete?: boolean; // هل التقدير غير مكتمل
  incompleteResolved?: boolean; // هل تم تسوية التقدير المكتمل
  incompleteDeadline?: string; // تاريخ انتهاء مهلة الاستكمال
  incompleteReasonAr?: string; // سبب عدم الاكتمال بالعربية
  incompleteReasonEn?: string; // سبب عدم الاكتمال بالإنجليزية
  isWithdrawn?: boolean; // هل تم الانسحاب من المقرّر
  withdrawalDate?: string; // تاريخ الانسحاب
}

export interface PostgraduateMilestone {
  id: string;
  type: 'PROPOSAL' | 'MID_TERM' | 'FINAL_DEFENSE' | 'COMPREHENSIVE_EXAM';
  date: string;
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'CONDITIONAL_PASS';
  score?: number;
  committee?: string[];
  comments?: string;
}

export interface Student {
  id: string;
  nationalId: string;
  name: string;
  program: ProgramType;
  graduateLevel?: GraduateDegreeLevel;
  pathway?: PostgraduatePathway;
  branchId?: string;
  collegeId?: string;
  departmentId: string; // المعرف المعياري للقسم
  enrollmentYear: number;
  status: StudentStatus;
  verificationStatus?: VerificationStatus;
  gpa: number;
  cgpa?: number;
  creditsEarned?: number;
  admissionScore?: number;
  admissionCertificateType?: string;
  previousUniversity?: string;
  grades: Grade[];
  warningsCount: number;
  email?: string;
  phone?: string;
  thesisTitle?: string;
  advisorName?: string;
  comments?: string;
  financialBalance?: number;
  documents?: StudentDocument[];
  enrollments?: StudentEnrollment[];
  notifications?: StudentNotification[];
  postgraduateDetails?: {
    supervisorId?: string;
    coSupervisorId?: string;
    proposalDate?: string;
    comprehensiveExamStatus?: 'NOT_REQUIRED' | 'PENDING' | 'PASSED' | 'FAILED';
    comprehensiveExamDate?: string;
    milestones?: PostgraduateMilestone[];
    defenseCommittee?: {
        chair: string;
        internalExaminer: string;
        externalExaminer: string;
        supervisorObserver: string;
    };
    durationMonths?: number;
    extensionMonths?: number;
  };
  dossierMetadata?: {
    archiveId: string; // رقم الملف الورقي في الأرشيف
    boxNumber?: string; // رقم الصندوق
    originalDocumentsVerified: boolean;
    missingDocuments: string[];
    lastAuditDate?: string;
    auditedBy?: string;
  };
  verificationHash?: string; // رمز فريد للتحقق من صحة البيانات
  clearance?: {
    currentStage: 'LIBRARY' | 'FINANCE' | 'LABS' | 'DEPARTMENT' | 'REGISTRAR' | 'COMPLETED';
    completedStages: string[];
    isFullyCleared: boolean;
    clearedAt?: string;
  };
}

export interface SeatingAssignment {
  studentId: string;
  studentName: string;
  seatNumber: number;
}

export interface ExamSession {
  id: string;
  courseId: string;
  courseName: string;
  sessionName?: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  room: string;
  invigilators: string[];
  seatingPlan?: SeatingAssignment[];
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  user: string;
  type: 'info' | 'warning' | 'danger';
}

export interface GradeAuditLog extends AuditLog {
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  oldScore: number | null;
  newScore: number;
}

export interface UniversityRegulation {
  minGpaGood: number;
  minGpaExcellent: number;
  minGpaWarning: number;
  maxCreditsPerSemester: number;
  minCreditsPerSemester: number;
  passingScore: number;
  attendanceWarningThreshold: number; // percentage
}

export interface FinanceSettings {
  undergraduateRatePerCredit: number;
  postgraduateRatePerCredit: number;
  registrationFee: number;
  lateFee: number;
  transcriptFee: number;
  idCardFee: number;
  maxDebtLimit: number;
  iban?: string;
  bankName?: string;
  accountName?: string;
}

export enum CalendarStageKey {
  REGISTRATION = 'REGISTRATION',
  ADD_DROP = 'ADD_DROP',
  LECTURES = 'LECTURES',
  MIDTERMS = 'MIDTERMS',
  FINALS = 'FINALS',
  GRADING = 'GRADING',
  SEMESTER_BREAK = 'SEMESTER_BREAK'
}

export interface AcademicCalendarStage {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  key: CalendarStageKey;
  isUnlocked: boolean;
}

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  ACADEMIC = 'ACADEMIC',
  FINANCE = 'FINANCE',
  DEADLINE = 'DEADLINE'
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  date: string;
  isRead: boolean;
  targetRole?: UserRole;
  targetStudentId?: string;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  screenReaderOptimized: boolean;
}

export interface SuperAdminSettings {
  maintenanceMode: boolean;
  enableSelfRegistration: boolean;
  enableAiInsights: boolean;
  allowGradeOverride: boolean;
  enableGraduation501Validation: boolean;
  sessionTimeoutMinutes: number;
  securityLevel: 'STANDARD' | 'ELEVATED' | 'PARANOID';
  logRetentionDays: number;
}

export interface SystemSettings {
  universityName: string;
  institutionName: string;
  currentSemester: string;
  academicYear: string;
  registrationDeadline: string;
  paymentDeadline: string;
  regulation: UniversityRegulation;
  finance: FinanceSettings;
  calendarStages: AcademicCalendarStage[];
  accessibility?: AccessibilitySettings;
  rooms?: Room[];
  superadmin?: SuperAdminSettings;
}

export type TransactionType = 'DEBIT' | 'CREDIT';

export interface Transaction {
  id: string;
  studentId: string;
  date: string;
  type: TransactionType;
  category: 'TUITION' | 'LAB_FEE' | 'REGISTRATION' | 'PAYMENT_CASH' | 'PAYMENT_BANK' | 'SCHOLARSHIP' | 'WALLET_DEPOSIT' | 'WALLET_PAYMENT' | 'LIBRARY_FINE' | 'TRANSCRIPT_FEE' | 'MOAMALAT_PAYMENT';
  amount: number;
  description: string;
  referenceNo?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface RegistrationWindow {
  id: string;
  semester: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  minCredits: number;
  maxCredits: number;
}

export type RequestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
export type RequestType = 'TRANSCRIPT' | 'ENROLLMENT_CERT' | 'ID_CARD' | 'SEMESTER_FREEZE' | 'COMPLAINT' | 'PARTIAL_WITHDRAWAL' | 'TOTAL_WITHDRAWAL';

export interface ServiceRequest {
  id: string;
  studentId: string;
  studentName: string;
  type: RequestType;
  status: RequestStatus;
  submissionDate: string;
  updatedDate: string;
  comments?: string;
  adminResponse?: string;
  courseId?: string;
  refundAmount?: number;
}

export interface Instructor {
  id: string;
  name: string;
  degree: 'PhD' | 'Master' | 'Bachelor';
  departmentId: string;
  email: string;
  specialization: string;
  courseIds: string[];
}

export interface Exam {
  id: string;
  courseId: string;
  type: 'MIDTERM' | 'FINAL' | 'QUIZ';
  date: string;
  location: string;
  maxScore: number;
}

export interface StudentGrade {
  id: string;
  studentId: string;
  courseId: string;
  semesterId: string;
  score: number;
  grade: string; // A, B, C...
  points: number; // For GPA calculation
}

export interface AcademicEvent {
  id: string;
  title: string;
  date: string;
  type: 'HOLIDAY' | 'EXAM' | 'REGISTRATION' | 'OTHER';
  description?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED';

export interface AttendanceRecord {
  id: string;
  courseId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  studentName?: string;
  courseName?: string;
  markedBy?: string;
  markedAt?: string;
  remarks?: string;
}

export type DayOfWeek = 'SATURDAY' | 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY';

export interface ClassSession {
  id: string;
  courseId: string;
  courseName: string;
  instructorId: string;
  instructorName: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string;
}

export type TaskCategory = 'URGENT' | 'WORK' | 'PERSONAL' | 'ACADEMIC' | 'ADMIN';

export interface UserTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: TaskCategory | string;
  dueDate: string;
  completed: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
}

export enum ThesisStatus {
  PROPOSAL_SUBMITTED = 'PROPOSAL_SUBMITTED',
  PROPOSAL_APPROVED = 'PROPOSAL_APPROVED',
  RESEARCH_IN_PROGRESS = 'RESEARCH_IN_PROGRESS',
  THESIS_WRITING = 'THESIS_WRITING',
  PRE_DEFENSE = 'PRE_DEFENSE',
  DEFENDED_ACCEPTED = 'DEFENDED_ACCEPTED',
  DEFENDED_MINOR_REVISIONS = 'DEFENDED_MINOR_REVISIONS',
  DEFENDED_MAJOR_REVISIONS = 'DEFENDED_MAJOR_REVISIONS',
  DEFENDED_RESUBMIT = 'DEFENDED_RESUBMIT',
  REJECTED = 'REJECTED'
}

export interface ResearchMilestone {
  id: string;
  name: string;
  dueDate: string;
  completedDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  notes?: string;
}

export interface GraduateThesis {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  abstract?: string;
  advisorId: string;
  advisorName: string;
  coAdvisorId?: string;
  coAdvisorName?: string;
  startDate: string;
  expectedDefenseDate?: string;
  status: ThesisStatus;
  progressPercentage: number;
  milestones?: ResearchMilestone[];
  funding?: {
    source: string;
    amount: number;
    currency: string;
    status: 'ACTIVE' | 'PENDING' | 'EXHAUSTED';
  };
}

export interface ResearchPublication {
  id: string;
  studentId: string;
  title: string;
  journalName: string;
  publicationDate: string;
  url?: string;
  status: 'PUBLISHED' | 'ACCEPTED' | 'SUBMITTED';
}


