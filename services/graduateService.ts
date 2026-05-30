
import { GraduateThesis, ResearchPublication, ThesisStatus } from '../types';

const THESES_KEY = 'oracle_campus_theses';
const PUBLICATIONS_KEY = 'oracle_campus_publications';
const SUPERVISORS_KEY = 'oracle_campus_supervisors';

const MOCK_THESES: GraduateThesis[] = [
  {
    id: 'TH-001',
    studentId: 'PG-001',
    studentName: 'أحمد علي حسن',
    title: 'تطبيقات الذكاء الاصطناعي في تحسين أداء الشبكات اللاسلكية',
    abstract: 'تهدف هذه الدراسة إلى استكشاف خوارزميات التعلم العميق لتقليل زمن التأخير في شبكات الجيل الخامس...',
    advisorId: 'F-001',
    advisorName: 'د. محمود سعيد',
    startDate: '2025-01-15',
    status: ThesisStatus.RESEARCH_IN_PROGRESS,
    progressPercentage: 45,
    milestones: [
      { id: 'M1', name: 'اعتماد المقترح البحثي', dueDate: '2025-02-15', completedDate: '2025-02-20', status: 'COMPLETED' },
      { id: 'M2', name: 'جمع البيانات الميدانية', dueDate: '2025-05-10', status: 'IN_PROGRESS' },
      { id: 'M3', name: 'تحليل النتائج الأولية', dueDate: '2025-08-01', status: 'PENDING' }
    ],
    funding: {
      source: 'Internal University Grant',
      amount: 15000,
      currency: 'SAR',
      status: 'ACTIVE'
    }
  },
  {
    id: 'TH-002',
    studentId: 'PG-002',
    studentName: 'ليلى إبراهيم محمد',
    title: 'تأثير السياسات المالية على النمو الاقتصادي في دول شمال أفريقيا',
    advisorId: 'F-002',
    advisorName: 'د. مريم عيسى',
    startDate: '2024-09-10',
    expectedDefenseDate: '2026-06-15',
    status: ThesisStatus.THESIS_WRITING,
    progressPercentage: 80,
    milestones: [
      { id: 'M1', name: 'المراجعة الأدبية', dueDate: '2024-12-01', completedDate: '2024-11-25', status: 'COMPLETED' },
      { id: 'M2', name: 'كتابة الفصول الثلاثة الأولى', dueDate: '2025-03-01', completedDate: '2025-03-10', status: 'COMPLETED' },
      { id: 'M3', name: 'تجهيز المسودة النهائية', dueDate: '2025-10-15', status: 'IN_PROGRESS' }
    ],
    funding: {
      source: 'Ministry of Education Fund',
      amount: 35000,
      currency: 'SAR',
      status: 'ACTIVE'
    }
  }
];

const MOCK_PUBS: ResearchPublication[] = [
  {
    id: 'PUB-001',
    studentId: 'PG-001',
    title: 'Deep Learning for 5G Latency Reduction',
    journalName: 'International Journal of Communications',
    publicationDate: '2026-03-01',
    status: 'PUBLISHED',
    url: 'https://example.com/pub1'
  }
];

const MOCK_SUPERVISORS = [
  { id: 'SUP-01', name: 'د. محمود سعيد', specialization: 'Artificial Intelligence', studentCount: 3, maxCapacity: 5, publications: 12 },
  { id: 'SUP-02', name: 'د. مريم عيسى', specialization: 'Cybersecurity', studentCount: 5, maxCapacity: 5, publications: 8 },
  { id: 'SUP-03', name: 'د. خالد العمري', specialization: 'Data Science', studentCount: 2, maxCapacity: 6, publications: 15 },
  { id: 'SUP-04', name: 'د. سارة المنصور', specialization: 'Network Security', studentCount: 4, maxCapacity: 5, publications: 6 },
];

export const getTheses = (): GraduateThesis[] => {
  const data = localStorage.getItem(THESES_KEY);
  if (!data) {
    localStorage.setItem(THESES_KEY, JSON.stringify(MOCK_THESES));
    return MOCK_THESES;
  }
  return JSON.parse(data);
};

export const saveThesis = (thesis: GraduateThesis): void => {
  const theses = getTheses();
  const index = theses.findIndex(t => t.id === thesis.id);
  if (index >= 0) {
    theses[index] = thesis;
  } else {
    theses.push(thesis);
  }
  localStorage.setItem(THESES_KEY, JSON.stringify(theses));
};

export const getPublications = (studentId?: string): ResearchPublication[] => {
  const data = localStorage.getItem(PUBLICATIONS_KEY);
  let pubs: ResearchPublication[] = [];
  if (!data) {
    localStorage.setItem(PUBLICATIONS_KEY, JSON.stringify(MOCK_PUBS));
    pubs = MOCK_PUBS;
  } else {
    pubs = JSON.parse(data);
  }
  return studentId ? pubs.filter(p => p.studentId === studentId) : pubs;
};

export const savePublication = (pub: ResearchPublication): void => {
  const pubs = getPublications();
  const index = pubs.findIndex(p => p.id === pub.id);
  if (index >= 0) {
    pubs[index] = pub;
  } else {
    pubs.push(pub);
  }
  localStorage.setItem(PUBLICATIONS_KEY, JSON.stringify(pubs));
};

export const getSupervisors = () => {
    const data = localStorage.getItem(SUPERVISORS_KEY);
    if (!data) {
        localStorage.setItem(SUPERVISORS_KEY, JSON.stringify(MOCK_SUPERVISORS));
        return MOCK_SUPERVISORS;
    }
    return JSON.parse(data);
};

export const getThesisByStudent = (studentId: string): GraduateThesis | undefined => {
  return getTheses().find(t => t.studentId === studentId);
};

export const getPublicationsByStudent = (studentId: string): ResearchPublication[] => {
  return getPublications(studentId);
};

export const getThesisStatusLabel = (status: ThesisStatus): string => {
  const labels: Record<ThesisStatus, string> = {
    [ThesisStatus.PROPOSAL_SUBMITTED]: 'مقترح مقدم',
    [ThesisStatus.PROPOSAL_APPROVED]: 'مقترح معتمد',
    [ThesisStatus.RESEARCH_IN_PROGRESS]: 'البحث قيد التنفيذ',
    [ThesisStatus.THESIS_WRITING]: 'كتابة الأطروحة',
    [ThesisStatus.PRE_DEFENSE]: 'بانتظار المناقشة',
    [ThesisStatus.DEFENDED_ACCEPTED]: 'تم القبول (دون تعديلات)',
    [ThesisStatus.DEFENDED_MINOR_REVISIONS]: 'قبول مع تعديلات طفيفة (شهران)',
    [ThesisStatus.DEFENDED_MAJOR_REVISIONS]: 'قبول مع تعديلات جوهرية (4 أشهر)',
    [ThesisStatus.DEFENDED_RESUBMIT]: 'إعادة المناقشة (6/12 شهراً)',
    [ThesisStatus.REJECTED]: 'رفض نهائي'
  };
  return labels[status] || status;
};

export const graduateService = {
  getTheses,
  saveThesis,
  getPublications,
  savePublication,
  getSupervisors,
  getThesisByStudent,
  getPublicationsByStudent,
  getThesisStatusLabel
};
