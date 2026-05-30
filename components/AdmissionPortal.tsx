import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, ClipboardCheck, ArrowLeft, ArrowRight, User, 
  MapPin, BookOpen, Award, CheckCircle2, AlertTriangle, 
  Search, Printer, Download, Clock, Globe, Shield, 
  Sparkles, FileText, Check, Phone, Mail, Building, Landmark,
  ExternalLink, FileCheck, CheckCircle
} from 'lucide-react';
import { Student, ProgramType, StudentStatus, VerificationStatus, GraduateDegreeLevel, PostgraduatePathway } from '../types';
import { 
  getStudents, saveStudent, checkNationalIdExists, 
  getBranches, getColleges, getDepartments, getAcademicPrograms,
  getSystemSettings
} from '../services/storageService';
import { Language } from '../services/i18nService';

interface AdmissionPortalProps {
  onClose: () => void;
  language: Language;
}

export const AdmissionPortal: React.FC<AdmissionPortalProps> = ({ onClose, language: initialLanguage }) => {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [activeTab, setActiveTab] = useState<'apply' | 'track'>('apply');
  
  // Storage lists loaded on-the-fly
  const [branches, setBranches] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  
  // Apply Form State
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [programType, setProgramType] = useState<ProgramType>(ProgramType.UNDERGRADUATE);
  const [branchId, setBranchId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  
  const [admissionScore, setAdmissionScore] = useState<number | ''>('');
  const [certificateType, setCertificateType] = useState('GSSC_SCIENCE'); // GSSC_SCIENCE or GSSC_ARTS
  const [gradYear, setGradYear] = useState(new Date().getFullYear());
  
  // Postgraduate exclusive fields
  const [prevUniversity, setPrevUniversity] = useState('');
  const [gradLevel, setGradLevel] = useState<GraduateDegreeLevel>(GraduateDegreeLevel.MASTER);
  const [pathway, setPathway] = useState<PostgraduatePathway>(PostgraduatePathway.COURSES_DISSERTATION);
  const [thesisTitle, setThesisTitle] = useState('');

  // Search Application State
  const [searchNid, setSearchNid] = useState('');
  const [trackedStudent, setTrackedStudent] = useState<Student | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Dynamic feedback and alerts
  const [formError, setFormError] = useState('');
  const [formSuccessStudent, setFormSuccessStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load lists on init
  useEffect(() => {
    setBranches(getBranches());
    setColleges(getColleges());
    setDepartments(getDepartments());
    setPrograms(getAcademicPrograms());
  }, []);

  // Filter options dynamically
  const filteredColleges = colleges.filter(col => !branchId || col.branchId === branchId);
  const filteredDepartments = departments.filter(dept => !collegeId || dept.collegeId === collegeId);
  
  // Get active settings from storage
  const settings = getSystemSettings();
  const earlyCycleActive = settings.calendarStages?.find(stage => stage.isUnlocked && stage.key === 'REGISTRATION');

  // Interactive Live Compliance Diagnostician
  const [complianceResult, setComplianceResult] = useState<{
    passes: boolean;
    reasonAr: string;
    reasonEn: string;
    details: string[];
  }>({ passes: false, reasonAr: '', reasonEn: '', details: [] });

  useEffect(() => {
    const score = Number(admissionScore) || 0;
    const detailsList: string[] = [];
    let isCompliant = true;
    let descAr = '';
    let descEn = '';

    if (!admissionScore) {
      setComplianceResult({ 
        passes: false, 
        reasonAr: 'الرجاء إدخال معدل الشهادة لعرض التقييم الأكاديمي', 
        reasonEn: 'Please enter certificate grade to view evaluation', 
        details: [] 
      });
      return;
    }

    if (programType === ProgramType.UNDERGRADUATE) {
      if (certificateType === 'GSSC_SCIENCE') {
        const threshold = 70;
        if (score >= threshold) {
          descAr = 'مستوفي لمعايير القبول (المسار العلمي) وفق المادة 501';
          descEn = 'Undergraduate Scientific threshold satisfied (Reg 501)';
          detailsList.push(language === 'ar' ? 'معدل شهادة الثانوية العامة علمي ≥ 70%' : 'High school scientific score ≥ 70%');
        } else {
          isCompliant = false;
          descAr = `غير مستوفي للحد الأدنى للمسار العلمي (${threshold}%)`;
          descEn = `Below scientific track minimum (${threshold}%)`;
          detailsList.push(language === 'ar' ? `الدرجة المُدخلة (${score}%) أقل من الحد الأدنى للشهادة الثانوية العلمية 70%` : `Entered score (${score}%) is lower than scientific threshold 70%`);
        }
      } else {
        const threshold = 65;
        if (score >= threshold) {
          descAr = 'مستوفي لمعايير القبول (المسار الأدبي) وفق المادة 501';
          descEn = 'Undergraduate Literary threshold satisfied (Reg 501)';
          detailsList.push(language === 'ar' ? 'معدل شهادة الثانوية العامة أدبي ≥ 65%' : 'High school literary score ≥ 65%');
        } else {
          isCompliant = false;
          descAr = `غير مستوفي للحد الأدنى للمسار الأدبي (${threshold}%)`;
          descEn = `Below literary track minimum (${threshold}%)`;
          detailsList.push(language === 'ar' ? `الدرجة المُدخلة (${score}%) أقل من الحد الأدنى للشهادة الثانوية الأدبية 65%` : `Entered score (${score}%) is lower than literary threshold 65%`);
        }
      }
    } else {
      // Postgraduate
      const threshold = 75;
      if (score >= threshold) {
        descAr = 'مستوفي لمعايير القبول للدراسات العليا';
        descEn = 'Postgraduate academic threshold satisfied';
        detailsList.push(language === 'ar' ? 'معدل البكالوريوس الأكاديمي المعتمد للقبول ≥ 75%' : 'Bachelor average score ≥ 75% for graduate admission');
      } else {
        isCompliant = false;
        descAr = 'غير مستوفي للقبول بالدراسات العليا (الحد الأدنى 75%)';
        descEn = 'Below postgraduate standard threshold (75%)';
        detailsList.push(language === 'ar' ? `معدل البكالوريوس (${score}%) أقل من متطلبات مجلس الدراسات العليا بالجامعة` : `Bachelor grade (${score}%) does not meet postgraduate minimum requirements of 75%`);
      }
    }

    // National ID format check
    const nidStr = String(nationalId);
    if (nidStr.length > 0) {
      if (nidStr.length !== 12 || !/^\d+$/.test(nidStr)) {
        detailsList.push(language === 'ar' ? 'تنبيه: الرقم الوطني يجب أن يكون مكوناً من 12 خانة رقمية' : 'Warning: National ID must contain exactly 12 numeric digits');
      } else {
        detailsList.push(language === 'ar' ? 'تنسيق الرقم الوطني الليبي صحيح وصالح للتسجيل' : 'Libyan National ID format checked and validated');
      }
    }

    setComplianceResult({
      passes: isCompliant,
      reasonAr: descAr,
      reasonEn: descEn,
      details: detailsList
    });
  }, [admissionScore, certificateType, programType, nationalId, language]);

  // Submit Handler
  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Basic Validations
    if (!name.trim()) {
      setFormError(language === 'ar' ? 'يرجى إدخال الاسم الرباعي بالكامل' : 'Please input your full quad name.');
      return;
    }
    const nidStr = String(nationalId).trim();
    if (nidStr.length !== 12 || !/^\d+$/.test(nidStr)) {
      setFormError(language === 'ar' ? 'الرقم الوطني يجب أن يكون مكوناً من 12 خانة رقمية صحيحة' : 'National ID must be exactly 12 digits numeric.');
      return;
    }
    if (!phone.trim()) {
      setFormError(language === 'ar' ? 'يرجى إدخال رقم الهاتف الجوال للتواصل' : 'Mobile phone number is strictly required.');
      return;
    }
    if (!departmentId) {
      setFormError(language === 'ar' ? 'الرجاء اختيار القسم العلمي للتسجيل' : 'Please select academic department.');
      return;
    }
    if (!admissionScore || Number(admissionScore) < 0 || Number(admissionScore) > 100) {
      setFormError(language === 'ar' ? 'يرجى إدخال معدل شهادة صحيح بين 0 و 100' : 'Please specify a valid academic score % between 0 and 100.');
      return;
    }

    // Double check database duplicates
    if (checkNationalIdExists(nidStr)) {
      setFormError(language === 'ar' ? 'الرقم الوطني مسجل بالفعل في قاعدة بيانات الطلاب' : 'This National ID is already registered in the system.');
      return;
    }

    // Strict compliance block
    if (!complianceResult.passes) {
      setFormError(language === 'ar' ? 'عذراً، لا يمكن استكمال التسجيل لعدم استيفاء الشروط الأكاديمية لمعايير الوحدة 4.' : 'Registration blocked because candidate does not meet standard Unit 4 academic thresholds.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Find College & Branch info for building record
      const selectedDeptObj = departments.find(d => d.id === departmentId);
      const matchedCollegeId = selectedDeptObj?.collegeId || collegeId;
      const selectedCollegeObj = colleges.find(c => c.id === matchedCollegeId);
      const matchedBranchId = selectedCollegeObj?.branchId || branchId || 'BR-01';

      // Generate neat Student ID (STU + Year + 5 random digits)
      const yr = new Date().getFullYear();
      const randDigits = Math.floor(10000 + Math.random() * 90000);
      const generatedId = `STU${yr}${randDigits}`;

      const newStudent: Student = {
        id: generatedId,
        nationalId: nidStr,
        name: name.trim(),
        program: programType,
        branchId: matchedBranchId,
        collegeId: matchedCollegeId,
        departmentId: departmentId,
        enrollmentYear: yr,
        status: StudentStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED, // Compliant candidates get auto-admitted and verified
        gpa: 0,
        warningsCount: 0,
        admissionScore: Number(admissionScore),
        admissionCertificateType: certificateType,
        previousUniversity: programType === ProgramType.POSTGRADUATE ? prevUniversity : undefined,
        graduateLevel: programType === ProgramType.POSTGRADUATE ? gradLevel : undefined,
        pathway: programType === ProgramType.POSTGRADUATE ? pathway : undefined,
        thesisTitle: programType === ProgramType.POSTGRADUATE ? thesisTitle || 'No topic registered yet' : undefined,
        email: email.trim() || undefined,
        phone: phone.trim(),
        grades: [],
        financialBalance: 1500, // Initial registration balance setup
        comments: `Registered through Student Admission Portal on ${new Date().toISOString().split('T')[0]}. Digital signature verified.`
      };

      try {
        saveStudent(newStudent);
        setFormSuccessStudent(newStudent);
        setIsSubmitting(false);
      } catch (err) {
        setFormError(language === 'ar' ? 'حدث خطأ غير متوقع أثناء حفظ البيانات' : 'An error occurred while saving candidate records.');
        setIsSubmitting(false);
      }
    }, 1200);
  };

  // Track Application status by National ID
  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setTrackedStudent(null);
    setSearchAttempted(true);

    const checkNidClean = searchNid.trim();
    if (!checkNidClean) {
      setSearchError(language === 'ar' ? 'الرجاء كتابة الرقم الوطني للاستعلام' : 'Enter national ID to perform search.');
      return;
    }

    const allStudents = getStudents();
    const match = allStudents.find(s => s.nationalId === checkNidClean);
    if (match) {
      setTrackedStudent(match);
    } else {
      setSearchError(language === 'ar' ? 'لم يتم العثور على أي طلبات تسجيل مرتبطة بهذا الرقم الوطني الجاري الاستعلام عنه' : 'No records found matching this National ID in the SIS system.');
    }
  };

  // Dynamic values helper
  const translateValue = (id: string, dict: any[]) => {
    const found = dict.find(x => x.id === id);
    if (!found) return id;
    return found.name;
  };

  // Cryptographic representation hashes
  const generateSimulatedCryptoHash = (stu: Student) => {
    return `SHA256::WORKDAY_SECURE:${stu.nationalId}:${stu.id}:${stu.admissionScore}`;
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="absolute inset-0 bg-[#f4f6f9] text-[#1e293b] overflow-y-auto selection:bg-blue-100 selection:text-blue-900 z-[999]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Professional Header - Workday Navy Bar */}
      <header className="bg-[#082142] text-white py-4 px-6 sticky top-0 z-[50] shadow-md flex flex-wrap justify-between items-center gap-4 border-b border-[#005cb9]/20 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
            {/* Minimalist Workday Orange & Blue concept */}
            <span className="text-[#005cb9] font-black text-xl tracking-tighter">w</span>
            <span className="text-[#f05a28] font-black text-xl tracking-tighter">d</span>
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight leading-tight uppercase">
              {language === 'ar' ? 'بوابة قبول الطلاب | أوراكل كامبس' : 'Student Admissions | Oracle Campus'}
            </h1>
            <p className="text-[10px] text-slate-300 font-mono tracking-widest uppercase">
              {language === 'ar' ? 'مدعوم بنظام التقييم والامتثال الموحد (قرار 501)' : 'POWERED BY WORKDAY LEARNING ARCHITECTURE & REG 501'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Calendar Stage Stage Indicator */}
          <div className="hidden sm:flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-3 py-1 text-[11px] font-bold text-blue-300">
            <Clock size={12} />
            <span>
              {language === 'ar' ? 'فترة القبول الخريفي نشطة' : 'Fall Admission Window Active'}
            </span>
          </div>

          {/* Interface Language Switcher */}
          <button 
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="h-8 px-3 border border-slate-400/50 hover:border-slate-300 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-white flex items-center gap-2 transition-all active:scale-95"
            title="Switch Language"
          >
            <Globe size={13} />
            <span>{language === 'en' ? 'العربية' : 'English'}</span>
          </button>

          {/* Go Back button */}
          <button 
            onClick={onClose}
            className="h-8 px-3 rounded-lg text-xs font-bold bg-[#005cb9] hover:bg-[#004b99] transition-all flex items-center gap-1.5 shadow"
          >
            {language === 'ar' ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            <span>{language === 'ar' ? 'خروج' : 'Sign Out'}</span>
          </button>
        </div>
      </header>

      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-[#005cb9] to-[#004b99] text-white py-10 px-6 text-center select-none relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-yellow-400/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-2">
          <GraduationCap className="mx-auto text-amber-400 animate-bounce" size={44} />
          <h2 className="text-xl md:text-2xl font-bold font-sans tracking-tight">
            {language === 'ar' ? 'مرحباً بك في مستقبلك الأكاديمي الجديد' : 'Welcome to Your Academic Journey'}
          </h2>
          <p className="text-sm text-slate-100 max-w-2xl mx-auto font-medium">
            {language === 'ar' 
              ? 'بوابة التسجيل الذاتي الموحدة لجامعة أوراكل للعلوم والتقنية. يرجى توفير بيانات ثبوتية مطابقة للرقم الوطني لاستصدار المستندات الرسمية فوراً.' 
              : 'Oracle Campus integrated Student Information System. Your prospective submission will check and pre-approve against Libyan Board Guidelines (Unit 4 standards) seamlessly.'}
          </p>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-6xl mx-auto px-4 py-8 relative min-h-screen flex flex-col">
        
        {/* Success / Admitted printable slip */}
        {formSuccessStudent && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col justify-center items-center py-4"
          >
            <div className="max-w-3xl w-full bg-white text-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 print:p-0 print:border-none print:shadow-none">
              
              {/* Slip Header Logos */}
              <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-slate-300 pb-5 gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">
                    {language === 'ar' ? 'وزارة التعليم العالي والبحث العلمي' : 'Ministry of Higher Education'}
                  </h3>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">
                    {language === 'ar' ? 'جامعة أوراكل للعلوم والتقنية' : 'Oracle University of Science & Technology'}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">Tripoli, State of Libya | SIS Registrar Office</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 px-4 py-2 text-center rounded-xl md:self-center">
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider block">
                    {language === 'ar' ? 'حالة القيد والقبول' : 'Registration Order Status'}
                  </span>
                  <span className="text-sm font-extrabold text-[#005cb9] uppercase flex items-center justify-center gap-1 mt-0.5">
                    <CheckCircle size={15} />
                    {language === 'ar' ? 'تم الرفع والقبول' : 'ACCEPTED & CLEAR'}
                  </span>
                </div>
              </div>

              {/* Decorative Banner */}
              <div className="my-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-800">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 text-emerald-600">
                  <Award size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm">
                    {language === 'ar' ? 'مستند قيد وقبول جامعي معتمد (رقم قيد مؤقت)' : 'Official College Enrollment Slip issued'}
                  </h4>
                  <p className="text-xs text-emerald-700/80 leading-relaxed mt-0.5">
                    {language === 'ar' 
                      ? 'تم التحقق من معايير المادة 501 الليبية بنجاح وملاءمة المعدلات. تم تخصيص رقم قيد جامعي ابتدائي وحساب مالي للطالب.' 
                      : 'High school average checks satisfy all regulatory criteria. A tuition ledger record has been initialized.'}
                  </p>
                </div>
              </div>

              {/* Data Specifications Grid */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4 font-sans text-sm">
                <h5 className="font-black text-xs text-[#082142] uppercase tracking-wider pb-2 border-b border-slate-200">
                  {language === 'ar' ? 'بيانات قيد الطالب بالمنظومة' : 'Student Academic Registration Record'}
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      {language === 'ar' ? 'الاسم الرباعي للطالب' : 'Candidate Quadruple Name'}
                    </span>
                    <span className="font-extrabold text-slate-900 block mt-0.5">{formSuccessStudent.name}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      {language === 'ar' ? 'الرقم الوطني المعتمد' : 'Libyan National identity'}
                    </span>
                    <span className="font-mono font-bold text-slate-700 block mt-0.5">{formSuccessStudent.nationalId}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      {language === 'ar' ? 'رقم القيد الأكاديمي الصادر (SIS)' : 'Issued Student Enrolment ID'}
                    </span>
                    <span className="font-mono font-black text-blue-600 block mt-0.5">{formSuccessStudent.id}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      {language === 'ar' ? 'الكلية والقسم العلمي' : 'Allocated College & Major'}
                    </span>
                    <span className="font-bold text-slate-800 block mt-0.5">
                      {translateValue(formSuccessStudent.departmentId, departments)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      {language === 'ar' ? 'الفرع والمجمع الدراسي' : 'Campus Cluster Location'}
                    </span>
                    <span className="font-bold text-slate-800 block mt-0.5">
                      {translateValue(formSuccessStudent.branchId || '', branches)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      {language === 'ar' ? 'المعدل والمسار المسجل' : 'High School Score & Track'}
                    </span>
                    <span className="font-bold text-slate-700 block mt-0.5">
                      {formSuccessStudent.admissionScore}% ({formSuccessStudent.admissionCertificateType === 'GSSC_SCIENCE' ? (language === 'ar' ? 'علمي' : 'Scientific') : (language === 'ar' ? 'أدبي' : 'Literary')})
                    </span>
                  </div>
                </div>

                {/* Ledger fee rows */}
                <div className="border-t border-slate-200 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <Landmark size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">
                        {language === 'ar' ? 'الحساب المالي الابتدائي: 1500 د.ل (رسم التسجيل)' : 'Initial Enrollment Dues: 1,500 LYD'}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {language === 'ar' ? 'يتعين سداد الرسوم بخزينة الجامعة أو عبر الحوالات البنكية لتفعيل بطاقة الكلية.' : 'Pay your fees via partner municipal bank branch or campus cashier box.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cryptographic verification lines */}
              <div className="mt-8 border-t border-slate-200 pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.15em] block">
                    {language === 'ar' ? 'مفتاح تدقيق المعاملات الثنائي' : 'Registration Hash Validation Key'}
                  </span>
                  <div className="font-mono text-[10px] bg-slate-100 border border-slate-200 text-slate-600 py-1.5 px-3 rounded-lg select-all max-w-sm overflow-hidden text-ellipsis">
                    {generateSimulatedCryptoHash(formSuccessStudent)}
                  </div>
                </div>

                {/* Round Stamp graphics */}
                <div className="w-24 h-24 border-2 border-dashed border-blue-600/30 rounded-full flex items-center justify-center rotate-3 shrink-0 self-center">
                  <div className="text-center text-blue-600 select-none">
                    <p className="text-[7px] font-black uppercase leading-none tracking-widest">
                      ORACLE CAMPUS
                    </p>
                    <p className="text-[8px] font-bold tracking-widest uppercase mt-1">
                      REGISTERS
                    </p>
                    <p className="text-[9px] font-black bg-blue-100 px-1 py-0.5 rounded mt-1.5 rotate-6">
                      VERIFIED
                    </p>
                  </div>
                </div>
              </div>

              {/* Print buttons */}
              <div className="mt-8 flex flex-wrap gap-3 print:hidden">
                <button 
                  onClick={handlePrintCertificate}
                  className="flex-1 min-w-[180px] h-11 bg-[#005cb9] hover:bg-[#004b99] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                >
                  <Printer size={16} />
                  <span>{language === 'ar' ? 'طهو وطباعة المستند' : 'Print Official Slip'}</span>
                </button>
                <button 
                  onClick={() => {
                    setFormSuccessStudent(null);
                    setName('');
                    setNationalId('');
                    setPhone('');
                    setEmail('');
                    setAdmissionScore('');
                    setSearchNid('');
                  }}
                  className="px-6 h-11 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all active:scale-95"
                >
                  {language === 'ar' ? 'تقديم طلب آخر' : 'Submit Another'}
                </button>
              </div>

            </div>
          </motion.div>
        )}

        {/* Dynamic Navigation Form Steps Tabs */}
        {!formSuccessStudent && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">
            
            {/* Sidebar Content (Search Application + Guidance) */}
            <div className="lg:col-span-4 space-y-6 print:hidden">
              
              {/* Tracker search block */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Search size={16} />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-800">
                    {language === 'ar' ? 'الاستعلام الفوري برقمك الوطني' : 'Audit My Application Status'}
                  </h3>
                </div>
                
                <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium">
                  {language === 'ar' 
                    ? 'أدخل رقمك الوطني المكون من 12 خانة لمتابعة مسار تقديم الأوراق وإصدار بطاقات القيد.' 
                    : 'Input your 12-digit national identity number to audit your registration status.'}
                </p>

                <form onSubmit={handleTrackSubmit} className="space-y-3">
                  <input 
                    type="text" 
                    value={searchNid}
                    onChange={(e) => setSearchNid(e.target.value.replace(/\D/g, '').substring(0,12))}
                    placeholder={language === 'ar' ? 'الرقم الوطني المكون من 12 خانة' : '12-Digit Libyan National ID'}
                    className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] rounded-xl px-4 text-xs font-mono font-bold tracking-wider placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#005cb9] transition-all"
                  />
                  
                  <button 
                    type="submit"
                    className="w-full h-10 bg-[#005cb9] hover:bg-[#004b99] text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ClipboardCheck size={14} />
                    <span>{language === 'ar' ? 'التحقق والاستعلام' : 'Query SIS Registry'}</span>
                  </button>
                </form>

                {/* Tracker outputs */}
                <AnimatePresence mode="wait">
                  {searchAttempted && searchError && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 p-3 bg-red-50 border border-red-150 text-red-700 rounded-xl text-xs flex items-start gap-2.5 font-medium"
                    >
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <span>{searchError}</span>
                    </motion.div>
                  )}

                  {searchAttempted && trackedStudent && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 p-4 bg-emerald-50 border border-emerald-100 text-slate-800 rounded-2xl space-y-3 font-medium text-xs"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <div>
                          <p className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wider">
                            {language === 'ar' ? 'رقم القيد الصادر' : 'Student SIS ID'}
                          </p>
                          <span className="font-mono text-sm font-black text-[#005cb9] block mt-0.5">{trackedStudent.id}</span>
                        </div>
                        <span className="bg-emerald-100/70 border border-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">
                          {language === 'ar' ? 'مقبول مستوفي' : 'ACTIVE_REG'}
                        </span>
                      </div>

                      <div className="space-y-1.5 leading-relaxed text-slate-600">
                        <p className="font-black text-slate-800 text-[13px]">{trackedStudent.name}</p>
                        <p>
                          <strong>{language === 'ar' ? 'المرحلة:' : 'Level:'}</strong> {trackedStudent.program === ProgramType.UNDERGRADUATE ? (language === 'ar' ? 'بكالوريوس' : 'Undergraduate') : (language === 'ar' ? 'دراسات عليا' : 'Postgraduate')}
                        </p>
                        <p>
                          <strong>{language === 'ar' ? 'القسم الأكاديمي:' : 'Department:'}</strong> {translateValue(trackedStudent.departmentId, departments)}
                        </p>
                        <p>
                          <strong>{language === 'ar' ? 'المعدل والنسبة المئوية:' : 'Average Score:'}</strong> {trackedStudent.admissionScore}%
                        </p>
                      </div>

                      <button 
                        onClick={() => setFormSuccessStudent(trackedStudent)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold rounded-lg hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow"
                      >
                        <Printer size={12} />
                        <span>{language === 'ar' ? 'طباعة مستند القبول' : 'Print Acceptance Form'}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Workday style Guidance rules banner */}
              <div className="bg-slate-100 border border-slate-200 rounded-3xl p-6 text-xs">
                <div className="flex items-center gap-2 mb-3 text-[#082142] font-black uppercase">
                  <Shield size={16} />
                  <span>
                    {language === 'ar' ? 'كتيب معايير وضوابط القبول' : 'MOHE College Admission Guidelines'}
                  </span>
                </div>

                <div className="space-y-3 leading-relaxed text-slate-600">
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
                    <span className="font-extrabold text-[#005cb9] block mb-1">
                      {language === 'ar' ? 'شهادة ثانوية علمي (≥ 70.0%)' : 'High School Scientific Track (≥ 70%)'}
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {language === 'ar' 
                        ? 'يشترط قرار 501 حد أدنى علمي 70% للكليات الهندسية والتقنية وكليات العلوم الصرفة.'
                        : 'Minimum overall percentage for Engineering or Computer Sciences department as per Unit 4 directives.'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
                    <span className="font-extrabold text-[#f05a28] block mb-1">
                      {language === 'ar' ? 'شهادة ثانوية أدبي (≥ 65.0%)' : 'High School Literary Track (≥ 65%)'}
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {language === 'ar' 
                        ? 'يشترط قرار 501 حد أدنى أدبي 65% لأقسام العلوم القانونية والإدارية واللغات.'
                        : 'Minimum score requirement for registration into Humanities, Administration and Language paths.'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
                    <span className="font-extrabold text-teal-600 block mb-1">
                      {language === 'ar' ? 'الدراسات العليا والماستر (≥ 75.0%)' : 'Postgraduate Degree Streams (≥ 75%)'}
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {language === 'ar' 
                        ? 'يشترط قرار القبول للدراسات العليا الليبية وبكالوريوس بتقدير مساوي أو أكثر من جيد (75%).'
                        : 'Your prior Bachelor degree average GPA must satisfy the 75% standard for graduate eligibility.'}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Main Application Enrollment Form Container */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-8">
              
              <div className="border-b border-slate-100 pb-5 mb-6">
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <GraduationCap className="text-[#005cb9]" size={22} />
                  <span>
                    {language === 'ar' ? 'استمارة التسجيل الذاتي للقبول والجدولة' : 'Prospective Student Application Form'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {language === 'ar' 
                    ? 'الرجاء توفير البيانات بدقة. سيتحقق النظام المطور فورياً من الشروط الأكاديمية المطلوبة.' 
                    : 'Provide matching identity, certificate percentage metrics & files for automated audit dispatch.'}
                </p>
              </div>

              {/* Error messages */}
              {formError && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 text-orange-900 rounded-2xl text-xs flex items-start gap-3">
                  <AlertTriangle size={18} className="shrink-0 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-black">{language === 'ar' ? 'شروط وقوانين التسجيل الموحد' : 'Regulatory Quality Warning'}</p>
                    <p className="mt-1 font-medium">{formError}</p>
                  </div>
                </div>
              )}

              {/* Form elements */}
              <form onSubmit={handleApplySubmit} className="space-y-6">
                
                {/* 1. Identity Box */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#005cb9] text-white flex items-center justify-center font-bold text-[10px]">1</span>
                    <h4 className="text-xs font-black uppercase text-[#005cb9] tracking-wider">
                      {language === 'ar' ? 'تفاصيل الهوية والاتصال' : 'Personal Identity & Mobile Verification'}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'ar' ? 'الاسم الرباعي بالكامل (كما في جواز السفر)' : 'Full Legal Quadruple Name'}
                      </label>
                      <div className="relative">
                        <input 
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={language === 'ar' ? 'أحمد عبد الله عمر سالم' : 'e.g. Salim Ali Ahmed Salem'}
                          className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] focus:ring-1 focus:ring-[#005cb9] rounded-xl px-10 text-xs font-medium focus:outline-none transition-all placeholder:text-slate-400"
                        />
                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 mr-1.5" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'ar' ? 'الرقم الوطني المكون من 12 خانة رقمية' : '12-Digit Libyan National ID'}
                      </label>
                      <div className="relative">
                        <input 
                          type="text"
                          required
                          value={nationalId}
                          onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').substring(0,12))}
                          placeholder="e.g. 119958495034"
                          className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] focus:ring-1 focus:ring-[#005cb9] rounded-xl px-10 text-xs font-mono font-bold tracking-wider focus:outline-none transition-all placeholder:text-slate-400"
                        />
                        <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 mr-1.5" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'ar' ? 'رقم الهاتف الخلوي' : 'Phone Mobile Line'}
                      </label>
                      <div className="relative">
                        <input 
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +218 91 000 0000"
                          className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] focus:ring-1 focus:ring-[#005cb9] rounded-xl px-10 text-xs font-medium focus:outline-none transition-all placeholder:text-slate-400"
                        />
                        <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 mr-1.5" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'ar' ? 'عنوان البريد الإلكتروني (اختياري)' : 'Email Address (Optional)'}
                      </label>
                      <div className="relative">
                        <input 
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. prospective@example.com"
                          className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] focus:ring-1 focus:ring-[#005cb9] rounded-xl px-10 text-xs font-medium focus:outline-none transition-all placeholder:text-slate-400"
                        />
                        <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 mr-1.5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Selection of Academic targets */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#005cb9] text-white flex items-center justify-center font-bold text-[10px]">2</span>
                    <h4 className="text-xs font-black uppercase text-[#005cb9] tracking-wider">
                      {language === 'ar' ? 'الرغبات الأكاديمية والكلية المقترحة' : 'Academic Program Target & Location Allocation'}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'ar' ? 'المرحلة الدراسية' : 'Academic Level'}
                      </label>
                      <select 
                        value={programType}
                        onChange={(e) => setProgramType(e.target.value as ProgramType)}
                        className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] rounded-xl px-3 text-xs font-bold focus:outline-none text-slate-700"
                      >
                        <option value={ProgramType.UNDERGRADUATE}>{language === 'ar' ? 'البكالوريوس' : 'Undergraduate (BSC)'}</option>
                        <option value={ProgramType.POSTGRADUATE}>{language === 'ar' ? 'الدراسات العليا (ماستر)' : 'Postgraduate (MSC/PHD)'}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'ar' ? 'فرع الجامعة الرئيسي' : 'University Branch'}
                      </label>
                      <select 
                        value={branchId}
                        onChange={(e) => {
                          setBranchId(e.target.value);
                          setCollegeId('');
                          setDepartmentId('');
                        }}
                        className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] rounded-xl px-3 text-xs font-bold focus:outline-none text-slate-700"
                      >
                        <option value="">{language === 'ar' ? '-- اختر الفرع --' : '-- Branch --'}</option>
                        {branches.map(br => (
                          <option key={br.id} value={br.id}>{br.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'ar' ? 'الكلية' : 'Target College'}
                      </label>
                      <select 
                        value={collegeId}
                        onChange={(e) => {
                          setCollegeId(e.target.value);
                          setDepartmentId('');
                        }}
                        className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] rounded-xl px-3 text-xs font-bold focus:outline-none text-slate-700"
                      >
                        <option value="">{language === 'ar' ? '-- اختر الكلية --' : '-- College --'}</option>
                        {filteredColleges.map(col => (
                          <option key={col.id} value={col.id}>{col.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'ar' ? 'القسم والشعبة التخصصية' : 'Academic Specialization'}
                      </label>
                      <select 
                        required
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] rounded-xl px-3 text-xs font-bold focus:outline-none text-slate-700"
                      >
                        <option value="">{language === 'ar' ? '-- اختر التخصص --' : '-- Department --'}</option>
                        {filteredDepartments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Certificate and Scores specifications */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#005cb9] text-white flex items-center justify-center font-bold text-[10px]">3</span>
                    <h4 className="text-xs font-black uppercase text-[#005cb9] tracking-wider">
                      {language === 'ar' ? 'معدل المؤهل ونسبة النجاح' : 'Academic Score & High School Details'}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'ar' ? 'المعدل والنسبة المئوية الحاصل عليها (%)' : 'Graduation Average % Scale'}
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          required
                          value={admissionScore}
                          onChange={(e) => setAdmissionScore(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          placeholder="e.g. 84.50"
                          className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] focus:ring-1 focus:ring-[#005cb9] rounded-xl px-10 text-xs font-mono font-bold tracking-wider focus:outline-none transition-all"
                        />
                        <Award size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 mr-1.5" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'ar' ? 'تخصص الشهادة الثانوية' : 'Certificate Discipline Track'}
                      </label>
                      <select 
                        value={certificateType}
                        onChange={(e) => setCertificateType(e.target.value)}
                        className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] rounded-xl px-3 text-xs font-bold focus:outline-none text-slate-700"
                      >
                        {programType === ProgramType.UNDERGRADUATE ? (
                          <>
                            <option value="GSSC_SCIENCE">{language === 'ar' ? 'ثانوية عامة - علمي' : 'High School - Scientific (علمي)'}</option>
                            <option value="GSSC_ARTS">{language === 'ar' ? 'ثانوية عامة - أدبي' : 'High School - Literary (أدبي)'}</option>
                          </>
                        ) : (
                          <>
                            <option value="BSC_CS">{language === 'ar' ? 'بكالوريوس هندسة أو علوم حاسب' : 'Bachelor of Science / Computer Eng'}</option>
                            <option value="BA_ECONOMICS">{language === 'ar' ? 'بكالوريوس علوم مالية أو اقتصاد' : 'Bachelor of Economics / Admin'}</option>
                            <option value="OTHER_DEGREE">{language === 'ar' ? 'مؤهل جامعي كليات أخرى' : 'Other Bachelor equivalent'}</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'ar' ? 'سنة الحصول على الشهادة / المؤهل' : 'Award Graduation Year'}
                      </label>
                      <input 
                        type="number"
                        min="2010"
                        max="2026"
                        required
                        value={gradYear}
                        onChange={(e) => setGradYear(parseInt(e.target.value))}
                        className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] focus:ring-1 focus:ring-[#005cb9] rounded-xl px-4 text-xs font-mono font-bold focus:outline-none text-slate-700"
                      />
                    </div>
                  </div>

                  {/* 4. Postgrad variables */}
                  {programType === ProgramType.POSTGRADUATE && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2"
                    >
                      <div className="space-y-1 block md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          {language === 'ar' ? 'الجامعة السابقة المانحة للبكالوريوس' : 'Previous Awarding University'}
                        </label>
                        <input 
                          type="text"
                          required
                          value={prevUniversity}
                          onChange={(e) => setPrevUniversity(e.target.value)}
                          placeholder="e.g. University of Tripoli"
                          className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] focus:ring-1 focus:ring-[#005cb9] rounded-xl px-4 text-xs font-semibold focus:outline-none placeholder:text-slate-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          {language === 'ar' ? 'الدرجة العلمية المطلوبة' : 'Target Postgrad Degree'}
                        </label>
                        <select 
                          value={gradLevel}
                          onChange={(e) => setGradLevel(e.target.value as GraduateDegreeLevel)}
                          className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] rounded-xl px-3 text-xs font-bold focus:outline-none text-slate-700"
                        >
                          <option value={GraduateDegreeLevel.MASTER}>{language === 'ar' ? 'الماجستير (MA/MSc)' : 'Masters Degree'}</option>
                          <option value={GraduateDegreeLevel.PHD}>{language === 'ar' ? 'الدكتوراه (PhD)' : 'Doctorate / PhD'}</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          {language === 'ar' ? 'مسار الدراسة' : 'Study Path Style'}
                        </label>
                        <select 
                          value={pathway}
                          onChange={(e) => setPathway(e.target.value as PostgraduatePathway)}
                          className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] rounded-xl px-3 text-xs font-bold focus:outline-none text-slate-700"
                        >
                          <option value={PostgraduatePathway.COURSES_DISSERTATION}>{language === 'ar' ? 'مقررات ورسالة' : 'Courses + Thesis Research'}</option>
                          <option value={PostgraduatePathway.COURSES_ONLY}>{language === 'ar' ? 'مقررات فقط' : 'Courses Only / Executive'}</option>
                        </select>
                      </div>

                      <div className="space-y-1 md:col-span-4 block">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          {language === 'ar' ? 'مقترح عنوان رسالة البحث / الأطروحة العلمية' : 'Proposed Research/Thesis Dissertation Title'}
                        </label>
                        <input 
                          type="text"
                          required
                          value={thesisTitle}
                          onChange={(e) => setThesisTitle(e.target.value)}
                          placeholder="e.g. Big Data analytics framework inside distributed Libyan university nodes..."
                          className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#005cb9] focus:ring-1 focus:ring-[#005cb9] rounded-xl px-4 text-xs font-medium focus:outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Cognitive Compliance Assessment Box */}
                {admissionScore !== '' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-5 rounded-2xl border ${
                      complianceResult.passes 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-rose-55 text-rose-800 border-rose-200 bg-rose-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {complianceResult.passes ? (
                        <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle size={24} className="text-rose-600 shrink-0" />
                      )}
                      <div>
                        <h4 className="font-extrabold text-sm leading-tight text-slate-800">
                          {language === 'ar' ? 'التقييم والامتثال الأكاديمي المباشر للمنظومة' : 'SIS Automatic Live Compliance Evaluation'}
                        </h4>
                        <p className={`text-xs font-bold mt-1 ${complianceResult.passes ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {language === 'ar' ? complianceResult.reasonAr : complianceResult.reasonEn}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-2 text-[11px] border-t border-slate-200 pt-3 text-slate-600">
                      {complianceResult.details.map((detail, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Check size={12} className={complianceResult.passes ? 'text-emerald-600' : 'text-rose-600'} />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>

                    {complianceResult.passes && (
                      <p className="text-[10px] text-emerald-700 font-extrabold mt-3 bg-white px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5 w-fit">
                        <span>✓</span>
                        {language === 'ar' 
                          ? 'استيفاء نسبة قرار المجلس الرئاسي 501. تم تفعيل خيار الحفظ.'
                          : 'Admissions constraints verified. Click Submit to save student in the DB.'}
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Action buttons */}
                <div className="pt-5 border-t border-slate-100 flex gap-4">
                  <button 
                    type="submit"
                    disabled={isSubmitting || !complianceResult.passes}
                    className="flex-1 h-12 bg-[#005cb9] hover:bg-[#004b99] disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{language === 'ar' ? 'جاري التحقق وقيد الطالب...' : 'Verifying and saving record...'}</span>
                      </>
                    ) : (
                      <>
                        <ClipboardCheck size={18} />
                        <span>{language === 'ar' ? 'اعتماد وتسجيل الطالب' : 'Verify & Guarantee Enrollment'}</span>
                      </>
                    )}
                  </button>

                  <button 
                    type="button"
                    onClick={onClose}
                    className="px-6 h-12 border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-700 transition-all font-bold text-xs"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>

              </form>

            </div>

          </div>
        )}

        {/* Workday style footer info */}
        <footer className="mt-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-200 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
          <div>
            {language === 'ar' ? 'جامعة أوراكل للعلوم والتقنية - طرابلس' : 'Oracle Campus Higher Learning Node - Tripoli'}
          </div>
          <div>
            {language === 'ar' ? 'منظومة إدارة الطلاب الرقمية المتكاملة' : 'Workday student styled admissions client'}
          </div>
        </footer>

      </div>
    </div>
  );
};

export default AdmissionPortal;
