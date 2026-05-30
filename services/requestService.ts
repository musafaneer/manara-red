import { ServiceRequest, RequestStatus, RequestType, Transaction, StudentStatus } from '../types';
import { addTransaction } from './financeService';
import { getStudents, saveStudent } from './storageService';

const STORAGE_KEY_REQUESTS = 'oracle_campus_requests';

const REQUEST_FEES: Partial<Record<RequestType, number>> = {
    'TRANSCRIPT': 20,
    'ENROLLMENT_CERT': 10,
    'ID_CARD': 30,
    'SEMESTER_FREEZE': 50,
    'PARTIAL_WITHDRAWAL': 15,
    'TOTAL_WITHDRAWAL': 40
};

const MOCK_REQUESTS: ServiceRequest[] = [
    { 
        id: 'REQ-1001', 
        studentId: 'STU2023001', 
        studentName: 'محمد عبد الله الورفلي', 
        type: 'TRANSCRIPT', 
        status: 'PENDING', 
        submissionDate: '2024-10-01', 
        updatedDate: '2024-10-01',
        comments: 'أحتاج كشف درجات مختوم لتقديمه للعمل'
    },
    { 
        id: 'REQ-1002', 
        studentId: 'STU2022099', 
        studentName: 'سارة خالد المصراتي', 
        type: 'ENROLLMENT_CERT', 
        status: 'COMPLETED', 
        submissionDate: '2024-09-15', 
        updatedDate: '2024-09-16',
        adminResponse: 'تم إصدار الإفادة ويمكنك استلامها من المسجل'
    },
    { 
        id: 'REQ-1003', 
        studentId: 'STU2020150', 
        studentName: 'أحمد سالم المقرحي', 
        type: 'SEMESTER_FREEZE', 
        status: 'PROCESSING', 
        submissionDate: '2024-09-28', 
        updatedDate: '2024-09-30',
        comments: 'ظروف صحية'
    }
];

export const getRequests = (): ServiceRequest[] => {
    const data = localStorage.getItem(STORAGE_KEY_REQUESTS);
    if (!data) {
        localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(MOCK_REQUESTS));
        return MOCK_REQUESTS;
    }
    return JSON.parse(data);
};

export const addRequest = (request: ServiceRequest): void => {
    const requests = getRequests();
    requests.unshift(request); // Add to top
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));

    // Automated Financial Charge for the service
    const fee = REQUEST_FEES[request.type];
    if (fee && fee > 0) {
        const tx: Transaction = {
            id: `TX-REQ-${Date.now()}`,
            studentId: request.studentId,
            date: new Date().toISOString().split('T')[0],
            type: 'DEBIT',
            category: 'REGISTRATION', // Using generic registration category for service fees
            amount: fee,
            description: `رسوم خدمة: ${getRequestTypeLabel(request.type)}`,
            status: 'COMPLETED'
        };
        addTransaction(tx);
    }
};

export const updateRequestStatus = (id: string, status: RequestStatus, response?: string): void => {
    const requests = getRequests();
    const index = requests.findIndex(r => r.id === id);
    if (index !== -1) {
        requests[index].status = status;
        requests[index].updatedDate = new Date().toISOString().split('T')[0];
        if (response) requests[index].adminResponse = response;
        localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));

        // Apply student status modifications with physical side effects
        if (status === 'COMPLETED') {
            const req = requests[index];
            const students = getStudents();
            const studentIndex = students.findIndex(s => s.id === req.studentId);
            if (studentIndex !== -1) {
                const s = students[studentIndex];
                if (req.type === 'SEMESTER_FREEZE') {
                    s.status = StudentStatus.SUSPENDED;
                    s.comments = `${s.comments || ''}\n[${new Date().toISOString().split('T')[0]}] تم تفعيل قرار إيقاف القيد بناءً على الطلب المعتمد.`;
                } else if (req.type === 'TOTAL_WITHDRAWAL') {
                    s.status = StudentStatus.WITHDRAWN;
                    if (s.enrollments) {
                        s.enrollments = s.enrollments.map(e => ({
                            ...e,
                            status: 'WITHDRAWN' as const
                        }));
                    }
                    s.comments = `${s.comments || ''}\n[${new Date().toISOString().split('T')[0]}] تم تفعيل قرار الانسحاب الكلي وإسقاط كافة المقررات كمنسحب.`;
                } else if (req.type === 'PARTIAL_WITHDRAWAL' && req.courseId) {
                    if (s.enrollments) {
                        s.enrollments = s.enrollments.map(e => {
                            if (e.courseId === req.courseId) {
                                return { ...e, status: 'WITHDRAWN' as const };
                            }
                            return e;
                        });
                        s.comments = `${s.comments || ''}\n[${new Date().toISOString().split('T')[0]}] انسحاب جزئي معتمد من المقرر ${req.courseId}.`;
                    }
                    // Refund to e-wallet if there is refundAmount
                    if (req.refundAmount && req.refundAmount > 0) {
                        const tx: Transaction = {
                            id: `TX-REFUND-${Date.now()}`,
                            studentId: req.studentId,
                            date: new Date().toISOString().split('T')[0],
                            type: 'CREDIT',
                            category: 'WALLET_DEPOSIT',
                            amount: req.refundAmount,
                            description: `مسترد مالي مقابل انسحاب من مقرر ${req.courseId}`,
                            status: 'COMPLETED'
                        };
                        addTransaction(tx);
                    }
                }
                saveStudent(s);
            }
        }
    }
};

export const getRequestTypeLabel = (type: RequestType): string => {
    const map: Record<RequestType, string> = {
        'TRANSCRIPT': 'كشف درجات',
        'ENROLLMENT_CERT': 'إفادة قيد',
        'ID_CARD': 'بدل فاقد بطاقة',
        'SEMESTER_FREEZE': 'إيقاف قيد',
        'COMPLAINT': 'تظلم / شكوى',
        'PARTIAL_WITHDRAWAL': 'انسحاب جزئي من مقرر',
        'TOTAL_WITHDRAWAL': 'انسحاب كلي من المجمع والجامعة'
    };
    return map[type] || type;
};

export const getStatusColor = (status: RequestStatus): string => {
    const map: Record<RequestStatus, string> = {
        'PENDING': 'bg-yellow-100 text-yellow-700',
        'PROCESSING': 'bg-blue-100 text-blue-700',
        'COMPLETED': 'bg-green-100 text-green-700',
        'REJECTED': 'bg-red-100 text-red-700'
    };
    return map[status] || 'bg-gray-100';
};