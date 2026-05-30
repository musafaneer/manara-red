import React, { useState, useEffect } from 'react';
import { getRequests, updateRequestStatus, getRequestTypeLabel, getStatusColor, addRequest } from '../services/requestService';
import { getStudents, getCourses, getSystemSettings } from '../services/storageService';
import { ServiceRequest, RequestStatus, RequestType, UserRole } from '../types';
import { notifySuccess, notifyError } from '../services/notificationService';
import { logAction } from '../services/auditService';
import { 
  FileQuestion, CheckCircle, XCircle, Clock, Filter, Plus, User, Save, Search,
  AlertTriangle, CreditCard, HelpCircle, ArrowLeftRight, CheckSquare, RefreshCw, AlertCircle, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import Modal from './ui/Modal';
import { cn } from '../lib/utils';
import { Language } from '../services/i18nService';

interface ServiceRequestsProps {
    language?: Language;
    currentUser?: any;
}

const ServiceRequests: React.FC<ServiceRequestsProps> = ({ language = 'ar', currentUser }) => {
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [students, setStudents] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>({});
    const [studentSearch, setStudentSearch] = useState('');
    
    // User role check
    const isStudent = (currentUser?.effectiveRole || currentUser?.role) === UserRole.STUDENT;
    const studentIdOfUser = currentUser?.student_id || '';
    
    // Create Request Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // Form fields
    const [requestType, setRequestType] = useState<RequestType>('TRANSCRIPT');
    const [comments, setComments] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    
    // Specific fields for Partial Withdrawal
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [advisorPledge, setAdvisorPledge] = useState(false);
    
    // Specific fields for Total Withdrawal
    const [withdrawalReason, setWithdrawalReason] = useState('PERSONAL');
    const [clearanceLibrary, setClearanceLibrary] = useState(false);
    const [clearanceFinance, setClearanceFinance] = useState(false);
    const [clearanceHousing, setClearanceHousing] = useState(false);
    const [checkoutPledge, setCheckoutPledge] = useState(false);

    // Specific fields for Semester Freeze
    const [freezePledge, setFreezePledge] = useState(false);

    // Administrative responses
    const [adminResponseMap, setAdminResponseMap] = useState<Record<string, string>>({});

    useEffect(() => {
        setRequests(getRequests());
        setStudents(getStudents());
        setCourses(getCourses());
        setSettings(getSystemSettings());
    }, []);

    // Get current student detail if user is.
    const currentStudentObj = isStudent 
        ? students.find(s => s.id === studentIdOfUser)
        : students.find(s => s.id === selectedStudentId);

    // Filtered lists
    const activeStudentRequests = requests.filter(r => {
        if (isStudent) {
            return r.studentId === studentIdOfUser;
        }
        return true;
    });

    const filteredRequests = activeStudentRequests.filter(r => {
        if (filterStatus === 'ALL') return true;
        return r.status === filterStatus;
    });

    const filteredStudentsSearch = students.filter(s => 
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
        s.id.toLowerCase().includes(studentSearch.toLowerCase())
    ).slice(0, 5);

    // Stats calculations
    const stats = {
        pending: activeStudentRequests.filter(r => r.status === 'PENDING').length,
        processing: activeStudentRequests.filter(r => r.status === 'PROCESSING').length,
        completed: activeStudentRequests.filter(r => r.status === 'COMPLETED').length,
        rejected: activeStudentRequests.filter(r => r.status === 'REJECTED').length,
    };

    // Calculate course details for currently enrolled courses of currentStudent
    const currentSemesterEnrolledCourses = React.useMemo(() => {
        if (!currentStudentObj) return [];
        const enrolls = currentStudentObj.enrollments || [];
        // Filter registered courses in the current semester
        const activeEnrolls = enrolls.filter((e: any) => 
            e.semester === settings.currentSemester && 
            e.status === 'REGISTERED'
        );

        return activeEnrolls.map((env: any) => {
            const courseObj = courses.find(c => c.id === env.courseId);
            return {
                id: env.courseId,
                code: courseObj?.code || env.courseId,
                name: courseObj?.name || 'مقرر مجهول',
                credits: courseObj?.credits || 3
            };
        });
    }, [currentStudentObj, courses, settings]);

    const totalEnrolledCredits = currentSemesterEnrolledCourses.reduce((sum, c) => sum + c.credits, 0);
    const selectedCourseToWithdraw = currentSemesterEnrolledCourses.find(c => c.id === selectedCourseId);
    const selectedCourseCredits = selectedCourseToWithdraw ? selectedCourseToWithdraw.credits : 0;
    const remainingCreditsAfterWithdrawal = totalEnrolledCredits - selectedCourseCredits;

    const isBelowMinimumLoad = selectedCourseId ? remainingCreditsAfterWithdrawal < 9 : false;
    const calculatedRefundAmount = selectedCourseCredits * 75; // 75 LYD refund per credit hour as premium policy

    const handleStatusUpdateLocal = (id: string, newStatus: RequestStatus) => {
        const adminComment = adminResponseMap[id] || '';
        let response = adminComment;
        
        if (!response) {
            if (newStatus === 'COMPLETED') response = 'تم فحص واعتماد طلبكم بنجاح ومراجعة السجل وتعديل حالتكم الدراسية رسمياً.';
            if (newStatus === 'REJECTED') response = 'نعتذر منكم، تم رفض طلبكم لعدم استيفاء الشروط والضوابط المنصوص عليها.';
        }
        
        updateRequestStatus(id, newStatus, response);
        
        // Refresh local UI states
        setRequests(getRequests());
        setStudents(getStudents());
        
        logAction('تحديث طلب', `تم تغيير حالة طلب الرقم ${id} إلى ${newStatus}`, 'info', currentUser?.name || 'الجرءات الأكاديمية');
        notifySuccess(`تم تحديث حالة الطلب بنجاح وتوثيق أثره الأكاديمي`);
    };

    const handleCreateRequest = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalStudentId = isStudent ? studentIdOfUser : selectedStudentId;
        const studentObj = students.find(s => s.id === finalStudentId);
        
        if (!studentObj) {
            notifyError('يرجى تحديد الطالب أولاً');
            return;
        }

        // Handle validations based on request types
        if (requestType === 'PARTIAL_WITHDRAWAL') {
            if (!selectedCourseId) {
                notifyError('يرجى اختيار المقرر المراد الانسحاب منه');
                return;
            }
            if (isBelowMinimumLoad && !advisorPledge) {
                notifyError('يرجى تأكيد التعهد بالتنسيق والمسؤولية عن خفض العبء الدراسي المتبقي عن 9 ساعات معتمدة');
                return;
            }
        }

        if (requestType === 'TOTAL_WITHDRAWAL') {
            if (!clearanceLibrary || !clearanceFinance || !clearanceHousing) {
                notifyError('يرجى استيفاء جميع شروط خلو الطرف وإجراءات براءة الذمة للمتابعة');
                return;
            }
            if (!checkoutPledge) {
                notifyError('يرجى تأكيد إقرار مسؤولية الانسحاب الكلي والموافقة عليه');
                return;
            }
        }

        if (requestType === 'SEMESTER_FREEZE' && !freezePledge) {
            notifyError('يرجى تأكيد تعهد الانتظام بالفصل القادم للمتابعة');
            return;
        }

        // Build detailed comments summarizing structured operations
        let finalComments = comments;
        if (requestType === 'PARTIAL_WITHDRAWAL') {
            finalComments = `طلب انسحاب جزئي من المقرر: ${selectedCourseToWithdraw?.code} - ${selectedCourseToWithdraw?.name} (${selectedCourseCredits} ساعات). ` +
                            `العبء الدراسي المتبقي بعد الانسحاب: ${remainingCreditsAfterWithdrawal} ساعات. ` +
                            `ملاحظة الطالب: ${comments || 'لا توجد ملاحظات إضافية'}`;
        } else if (requestType === 'TOTAL_WITHDRAWAL') {
            const reasonsMap: Record<string, string> = {
                'PERSONAL': 'ظروف شخصية / عائلية',
                'HEALTH': 'ظروف صحية قاهرة',
                'TRANSFER': 'انتقال لجامعة أخرى',
                'TRAVEL': 'السفر خارج البلاد'
            };
            finalComments = `طلب انسحاب كلي من المجمع الدراسي للفصل الحالي. سبب الانسحاب: ${reasonsMap[withdrawalReason]}. ` +
                            `تم الحصول على براءة ذمة من: المكتبة والنظام المالي وحرم السكن. ` +
                            `ملاحظة الطالب: ${comments || 'لا توجد ملاحظات إضافية'}`;
        } else if (requestType === 'SEMESTER_FREEZE') {
            finalComments = `طلب إيقاف القيد وتجميد الدراسة للفصل الدراسي الحالي. ` +
                            `أتعهد بالانتظام بالدراسة بدءاً من الفصل الدراسي القادم. ` +
                            `ملاحظة الطالب: ${comments || 'لا توجد ملاحظات إضافية'}`;
        }

        const req: ServiceRequest = {
            id: `REQ-${Date.now()}`,
            studentId: studentObj.id,
            studentName: studentObj.name,
            type: requestType,
            status: 'PENDING',
            submissionDate: new Date().toISOString().split('T')[0],
            updatedDate: new Date().toISOString().split('T')[0],
            comments: finalComments,
            courseId: requestType === 'PARTIAL_WITHDRAWAL' ? selectedCourseId : undefined,
            refundAmount: requestType === 'PARTIAL_WITHDRAWAL' ? calculatedRefundAmount : undefined
        };

        addRequest(req);
        
        // Refresh & reset states
        setRequests(getRequests());
        setStudents(getStudents());
        setShowCreateModal(false);
        
        // Reset form variables
        setComments('');
        setSelectedStudentId('');
        setSelectedCourseId('');
        setAdvisorPledge(false);
        setCheckoutPledge(false);
        setClearanceLibrary(false);
        setClearanceFinance(false);
        setClearanceHousing(false);
        setFreezePledge(false);
        
        notifySuccess('تم تقديم طلبك الأكاديمي وبدء دورة الاعتمادات والتدقيق بنجاح');
        logAction('تقديم طلب', `تم تقديم طلب ${getRequestTypeLabel(requestType)} للطالب ${studentObj.name}`, 'info', studentObj.name);
    };

    return (
        <div className="p-8">
            {/* Header section with double-styled titles */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className={cn(language === 'ar' ? 'text-right' : 'text-left')}>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <FileQuestion className="text-[#C74634]" size={28} />
                        {language === 'ar' ? 'الطلبات والخدمات الإدارية والأكاديمية' : 'Service & Academic Requests'}
                    </h2>
                    <p className="text-slate-500 font-bold mt-1 text-xs">
                        {language === 'ar' 
                            ? 'معالجة ودراسة طلبات الانسحاب الجزئي والكلي، وإيقاف القيود، وشهادات إثبات القيد الرسمية' 
                            : 'Process requests for partial withdrawal, total withdrawal, term freezing, transcript releases'}
                    </p>
                </div>
                <button 
                    onClick={() => {
                        setShowCreateModal(true);
                        // Pre-set request type to normal TRANSCRIPT or partial if they prefer
                        setRequestType('TRANSCRIPT');
                    }}
                    className="bg-[#C74634] hover:bg-[#a63525] text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black shadow-lg shadow-red-700/10 active:scale-95 transition-all text-xs"
                >
                    <Plus size={16} />
                    {language === 'ar' ? 'إنشاء طلب أكاديمي / إداري' : 'Create Academic Request'}
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600">
                        <Clock size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'قيد الانتظار' : 'Pending Auditing'}</p>
                        <p className="text-xl font-black text-slate-800">{stats.pending}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                        <RefreshCw size={20} className="animate-spin-slow" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'جاري الدراسة والتدقيق' : 'In Progress'}</p>
                        <p className="text-xl font-black text-slate-800">{stats.processing}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'تم الاعتماد والتفعيل' : 'Approved & Processed'}</p>
                        <p className="text-xl font-black text-slate-800">{stats.completed}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                        <XCircle size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">{language === 'ar' ? 'طلبات غير مُعتمدة' : 'Rejected Requests'}</p>
                        <p className="text-xl font-black text-slate-800">{stats.rejected}</p>
                    </div>
                </div>
            </div>

            {/* Dynamic policy tips for students */}
            {isStudent && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/60 rounded-3xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-4 items-start text-right">
                        <div className="p-3 bg-blue-600/10 text-blue-800 rounded-2xl shrink-0">
                            <AlertCircle size={22} className="text-blue-700" />
                        </div>
                        <div>
                            <h4 className="font-black text-blue-900 text-sm">مستند إرشادات الانسحاب وإيقاف القيد</h4>
                            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                نرحب بك في منصة المعاملات الذاتية. يمكنك طلب الانسحاب من مادة (يبقى عبئك ≥ 9 ساعات)، تجميد الفصل (إيقاف قيد مؤقت)، أو الانسحاب النهائي من الجامعة. 
                                تخضع هذه الخدمات لمطابقة السياسات واللوائح والتحقق المالي واللوجستي التلقائي.
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0 text-center md:text-left">
                        <button 
                            onClick={() => {
                                setRequestType('PARTIAL_WITHDRAWAL');
                                setShowCreateModal(true);
                            }}
                            className="bg-white border border-blue-200 hover:border-blue-300 text-blue-800 text-xs font-black px-5 py-3 rounded-2xl shadow-sm transition-all active:scale-95"
                        >
                            انسحاب جزئي سريع
                        </button>
                    </div>
                </div>
            )}

            {/* Requests Management Table with Custom Filters */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="p-5 border-b border-slate-200/60 bg-slate-100/30 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-slate-400" />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'تصفية الحالة' : 'Filter requests'}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => setFilterStatus('ALL')} className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all", filterStatus === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100')}>الكل</button>
                        <button onClick={() => setFilterStatus('PENDING')} className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all", filterStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 'text-slate-500 hover:bg-slate-100')}>قيد الانتظار</button>
                        <button onClick={() => setFilterStatus('PROCESSING')} className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all", filterStatus === 'PROCESSING' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'text-slate-500 hover:bg-slate-100')}>جاري العمل</button>
                        <button onClick={() => setFilterStatus('COMPLETED')} className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all", filterStatus === 'COMPLETED' ? 'bg-green-100 text-green-800 border border-green-200' : 'text-slate-500 hover:bg-slate-100')}>مكتمل ومعتمد</button>
                        <button onClick={() => setFilterStatus('REJECTED')} className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all", filterStatus === 'REJECTED' ? 'bg-red-100 text-red-800 border border-red-200' : 'text-slate-500 hover:bg-slate-100')}>غير مقبول</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-xs font-black uppercase">
                                <th className="px-6 py-4 text-center">{language === 'ar' ? 'رقم الطلب' : 'Request ID'}</th>
                                <th className="px-6 py-4">{language === 'ar' ? 'الطالب' : 'Student'}</th>
                                <th className="px-6 py-4">{language === 'ar' ? 'نوع المعاملة الأكاديمية' : 'Transaction Type'}</th>
                                <th className="px-6 py-4">{language === 'ar' ? 'تاريخ التقديم' : 'Submission Date'}</th>
                                <th className="px-6 py-4 text-center">{language === 'ar' ? 'الحالة الأكاديمية' : 'Status'}</th>
                                <th className="px-6 py-4">{language === 'ar' ? 'الموجز وتحديثات الإدارة' : 'Resolution and Notes'}</th>
                                {!isStudent && <th className="px-6 py-4 text-center">{language === 'ar' ? 'التحكم الإداري' : 'Actions'}</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRequests.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-400 font-bold text-center">{req.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-black text-slate-800 text-sm leading-tight">{req.studentName}</div>
                                        <div className="text-[10px] text-slate-400 font-bold font-mono tracking-tighter mt-1">{req.studentId}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border",
                                            req.type === 'PARTIAL_WITHDRAWAL' ? 'bg-orange-50 text-orange-700 border-orange-200/50' :
                                            req.type === 'TOTAL_WITHDRAWAL' ? 'bg-rose-50 text-rose-700 border-rose-200/50 font-black' :
                                            req.type === 'SEMESTER_FREEZE' ? 'bg-purple-50 text-purple-700 border-purple-200/50' :
                                            'bg-slate-50 text-slate-700 border-slate-200'
                                        )}>
                                            {getRequestTypeLabel(req.type)}
                                        </span>
                                        {req.refundAmount && req.refundAmount > 0 ? (
                                            <span className="block text-[10px] text-emerald-600 font-black mt-1">
                                                (سيسترد مالي: +{req.refundAmount} د.ل)
                                            </span>
                                        ) : null}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-600 whitespace-nowrap">{req.submissionDate}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${getStatusColor(req.status)}`}>
                                            {req.status === 'PENDING' && (language === 'ar' ? 'انتظار الموافقة' : 'Pending')}
                                            {req.status === 'PROCESSING' && (language === 'ar' ? 'جاري المعالجة' : 'Under Review')}
                                            {req.status === 'COMPLETED' && (language === 'ar' ? 'مكتمل ومعتمد' : 'Approved')}
                                            {req.status === 'REJECTED' && (language === 'ar' ? 'تم الرفض' : 'Declined')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-sm">
                                        <div className="text-xs text-slate-600 leading-relaxed font-semibold">
                                            <span className="font-bold text-slate-400">{language === 'ar' ? 'التفاصيل: ' : 'Detail: '}</span> 
                                            {req.comments}
                                        </div>
                                        {req.adminResponse && (
                                            <div className="mt-2 text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-blue-800 leading-relaxed font-bold">
                                                <span className="font-extrabold text-[#C74634] block mb-0.5">{language === 'ar' ? 'ملاحظة المسجل الأكاديمي:' : 'Registrar Response:'}</span>
                                                {req.adminResponse}
                                            </div>
                                        )}
                                        
                                        {/* Inline admin comment writing state */}
                                        {!isStudent && req.status !== 'COMPLETED' && req.status !== 'REJECTED' && (
                                            <div className="mt-3 flex gap-2">
                                                <input 
                                                    type="text"
                                                    placeholder="ملاحظات قرار الاعتماد أو الرفض الأكاديمي..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:bg-white outline-none"
                                                    value={adminResponseMap[req.id] || ''}
                                                    onChange={e => setAdminResponseMap({
                                                        ...adminResponseMap,
                                                        [req.id]: e.target.value
                                                    })}
                                                />
                                            </div>
                                        )}
                                    </td>
                                    
                                    {/* Action Actions for Administrators */}
                                    {!isStudent && (
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1.5 justify-center">
                                                {req.status === 'PENDING' && (
                                                    <button 
                                                        onClick={() => handleStatusUpdateLocal(req.id, 'PROCESSING')}
                                                        className="px-3 py-1.5 text-xs font-black bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 rounded-xl flex items-center gap-1 transition-all"
                                                        title="تأشير جاري العمل"
                                                    >
                                                        <Clock size={12} />
                                                        دراسة الملف
                                                    </button>
                                                )}
                                                {req.status === 'PROCESSING' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleStatusUpdateLocal(req.id, 'COMPLETED')}
                                                            className="px-3 py-1.5 text-xs font-black bg-green-50 text-green-700 hover:bg-green-100 border border-green-200/60 rounded-xl flex items-center gap-1 transition-all"
                                                            title="اعتماد وتوثيق بالتنظيم"
                                                        >
                                                            <CheckCircle size={12} />
                                                            اعتماد إلكتروني
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStatusUpdateLocal(req.id, 'REJECTED')}
                                                            className="px-3 py-1.5 text-xs font-black bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60 rounded-xl flex items-center gap-1 transition-all"
                                                            title="رفض"
                                                        >
                                                            <XCircle size={12} />
                                                            رفض
                                                        </button>
                                                    </>
                                                )}
                                                {(req.status === 'COMPLETED' || req.status === 'REJECTED') && (
                                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">مغلق ومؤرشف</span>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredRequests.length === 0 && (
                    <div className="text-center py-16 text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
                        <FileText size={40} className="text-slate-300 stroke-1" />
                        <p>{language === 'ar' ? 'لا توجد طلبات جارية أو سابقة في هذا التصنيف حالياً' : 'No requests in this category'}</p>
                    </div>
                )}
            </div>

            {/* Create Request Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title={language === 'ar' ? "إنشاء معاملة أكاديمية أو خدمية" : "New Academic Transaction"}
                description="Oracle Enterprise Integrated Workflow Release 2026"
                icon={FileQuestion}
                maxWidth="2xl"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <button 
                            type="button" 
                            onClick={() => setShowCreateModal(false)} 
                            className="px-6 py-3 text-slate-500 font-extrabold hover:bg-slate-100 rounded-2xl transition-all text-xs"
                        >
                            {language === 'ar' ? 'إلغاء الأمر' : 'Discard'}
                        </button>
                        <button 
                            form="create-workday-request"
                            type="submit" 
                            className="px-7 py-3 bg-[#C74634] text-white rounded-2xl font-black hover:bg-[#a63525] shadow-lg shadow-red-500/10 transition-all flex items-center gap-2 text-xs"
                        >
                            <Save size={16} /> 
                            {language === 'ar' ? 'تقديم المعاملة رسمياً' : 'Submit Transaction'}
                        </button>
                    </div>
                }
            >
                <form id="create-workday-request" onSubmit={handleCreateRequest} className="space-y-6 text-right">
                    {/* Student Identification Section */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">
                            {language === 'ar' ? 'مقدم الطلب / المعني بالمعاملة' : 'Concerned Student'}
                        </label>
                        
                        {isStudent ? (
                            /* Student Pre-loaded Profile Card */
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#C74634] text-white rounded-xl flex items-center justify-center font-black text-lg">
                                        {currentStudentObj?.name?.[0] || 'س'}
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-slate-800 leading-tight">{currentStudentObj?.name}</div>
                                        <div className="text-xs text-slate-500 font-mono mt-1">{currentStudentObj?.id}</div>
                                        <div className="text-[10px] text-emerald-600 font-black mt-0.5">
                                            {language === 'ar' ? 'حالة الطالب: نشط ومسجل رسمي' : 'Status: Active'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Admin Search & Auto-Select Dropdown */
                            !currentStudentObj ? (
                                <div className="relative group">
                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
                                    <input 
                                        type="text"
                                        placeholder="ابحث عن اسم الطالب أو الرقم الجامعي للمطابقة الأكاديمية..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-12 pl-5 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-[#C74634] transition-all outline-none"
                                        value={studentSearch}
                                        onChange={e => setStudentSearch(e.target.value)}
                                    />
                                    {studentSearch.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                                            {filteredStudentsSearch.length > 0 ? (
                                                filteredStudentsSearch.map(s => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedStudentId(s.id);
                                                            setStudentSearch('');
                                                        }}
                                                        className="w-full text-right px-5 py-3 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                                                    >
                                                        <div>
                                                            <div className="font-bold text-slate-800 group-hover:text-red-600 transition-colors">{s.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono tracking-tighter">{s.id}</div>
                                                        </div>
                                                        <Plus size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110" />
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-5 py-4 text-xs text-slate-400 italic text-center">لا توجد نتائج تطابق بحثك</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-2xl p-4 animate-in zoom-in-95 duration-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                            <User size={24} />
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-blue-900 leading-tight">{currentStudentObj.name}</div>
                                            <div className="text-xs text-blue-600 font-mono mt-0.5">{currentStudentObj.id}</div>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedStudentId('')}
                                        className="text-blue-400 hover:text-red-500 hover:bg-white p-2 rounded-xl transition-all"
                                    >
                                        <XCircle size={20} />
                                    </button>
                                </div>
                            )
                        )}
                    </div>

                    {/* Request Category Selection */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">نوع المعاملة الأكاديمية</label>
                        <select 
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black focus:bg-white focus:border-[#C74634] transition-all outline-none"
                            value={requestType}
                            onChange={e => {
                                setRequestType(e.target.value as RequestType);
                                setSelectedCourseId(''); // Reset dynamic dependent courses
                            }}
                        >
                            <option value="TRANSCRIPT">كشف درجات رسمي ومختوم (Transcript Release)</option>
                            <option value="ENROLLMENT_CERT">إفادة قيد رسمية للعام الجامعي (Enrollment Verification)</option>
                            <option value="ID_CARD">بدل فاقد بطاقة جامعية ذكية (Replacement ID Card)</option>
                            <option value="PARTIAL_WITHDRAWAL">طلب انسحاب جزئي من مقرر (Course-level Withdrawal)</option>
                            <option value="SEMESTER_FREEZE">طلب إيقاف القيد للترم الحالي (Term Registration Freezing)</option>
                            <option value="TOTAL_WITHDRAWAL">طلب انسحاب كلي وإسقاط القيد (Final University Checkout)</option>
                            <option value="COMPLAINT">تظلم / مراجعة رصد درجة مقرر مقرر (Academic Complaint)</option>
                        </select>
                    </div>

                    {/* DYNAMIC SECTION 1: PARTIAL WITHDRAWAL (انسحاب جزئي) */}
                    {requestType === 'PARTIAL_WITHDRAWAL' && (
                        <div className="bg-orange-50/50 border border-orange-100 rounded-3xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex gap-3 text-right">
                                <AlertTriangle className="text-orange-600 shrink-0" size={20} />
                                <div>
                                    <h4 className="font-black text-orange-900 text-xs">ضوابط طلب الانسحاب الجزئي من مادة</h4>
                                    <p className="text-[10px] text-orange-700 leading-relaxed mt-1">
                                        يحق للطالب تقديم طلب انسحاب من مقرر دراسي نشط وفق شروط اللائحة الأكاديمية بالكلية. 
                                        يشترط ألا يقل العبء الدراسي المتبقي عن (9) ساعات معتمدة للطلاب المنتظمين للمحافظة على حالة القيد. 
                                        سيتم رصد تقدير انسحاب مؤقت (W) في النسخة غير الرسمية، وعند الاعتماد يتم توثيقه.
                                    </p>
                                </div>
                            </div>

                            {/* Enrolled Courses Select Dropdown */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 block px-1">اختر المقرر الدراسي المراد إسقاطه كمنسحب:</label>
                                {currentSemesterEnrolledCourses.length > 0 ? (
                                    <select
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-orange-500"
                                        value={selectedCourseId}
                                        onChange={e => setSelectedCourseId(e.target.value)}
                                    >
                                        <option value="">-- اختر مادة من المسجلة في هذا الفصل --</option>
                                        {currentSemesterEnrolledCourses.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.code} - {c.name} ({c.credits} ساعات معتمدة)
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl text-center">
                                        تنبيه: لم يتم العثور على أي مقررات نشطة مسجلة لهذا الطالب في الفصل الحالي ({settings.currentSemester})
                                    </div>
                                )}
                            </div>

                            {/* Credits live calculations */}
                            {selectedCourseId && (
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                                        <p className="text-[9px] text-slate-400 font-bold block">مجموع الساعات الأصلي</p>
                                        <p className="text-sm font-black text-slate-700 mt-1">{totalEnrolledCredits} ساعة</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                                        <p className="text-[9px] text-slate-400 font-bold block">ساعات مادة الانسحاب</p>
                                        <p className="text-sm font-black text-orange-600 mt-1">-{selectedCourseCredits} ساعة</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                                        <p className="text-[9px] text-slate-400 font-bold block">الساعات المتبقية</p>
                                        <p className={cn("text-sm font-black mt-1", isBelowMinimumLoad ? "text-red-600" : "text-emerald-600")}>
                                            {remainingCreditsAfterWithdrawal} ساعة
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Below Min Load warning and Advisor Pledge of commitment */}
                            {selectedCourseId && isBelowMinimumLoad && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl space-y-2">
                                    <p className="text-[10px] text-red-800 font-black leading-relaxed">
                                        ⚠️ تنبيه أقصى: العبء المتبقي لديك ({remainingCreditsAfterWithdrawal} ساعة) سيصبح أقل من الحد الأدنى المقدر باللائحة العامة بالجامعة (9 ساعات). 
                                        الانسحاب سيترتب عليه مراجعة عمادة القبول ومستشارك لتقييم الموقف التعليمي.
                                    </p>
                                    <label className="flex items-start gap-2.5 cursor-pointer selection:bg-transparent pt-1">
                                        <input 
                                            type="checkbox" 
                                            className="mt-1 accent-red-600 scale-105" 
                                            checked={advisorPledge}
                                            onChange={e => setAdvisorPledge(e.target.checked)}
                                        />
                                        <span className="text-[10px] text-red-800 font-bold">
                                            أتعهد بمسؤوليتي الأكاديمية الكاملة، وأدرك أنني قد أحتاج لاعتماد يدوي استثنائي من المرشد الأكاديمي أو العميد.
                                        </span>
                                    </label>
                                </div>
                            )}

                            {selectedCourseId && (
                                <div className="bg-emerald-50 border border-emerald-100/60 p-3 rounded-xl flex items-center justify-between text-xs">
                                    <span className="font-extrabold text-emerald-900">المسترد المالي التقديري (Electronic Refund E-Wallet):</span>
                                    <span className="font-black text-emerald-700">+{calculatedRefundAmount} د.ل (75%)</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* DYNAMIC SECTION 2: TOTAL WITHDRAWAL (انسحاب كلي) */}
                    {requestType === 'TOTAL_WITHDRAWAL' && (
                        <div className="bg-red-50 border border-red-100 rounded-3xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex gap-2 text-right">
                                <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h4 className="font-black text-red-900 text-xs">تحذير أكاديمي رسمي: بخصوص طلب الانسحاب الكلي</h4>
                                    <p className="text-[10px] text-red-700 leading-relaxed mt-1 font-semibold">
                                        تقديم معاملة "خروج وانسحاب كلي" يعني إلغاء تسجيل الجدول بكامله للفصل الحالي وإخلاء براءة ذمتكم من المنشأة والجامعة نهائياً. 
                                        سيتحول القيد إلى منسحب (WITHDRAWN) وترصد مواد الفصل بالرمز W. 
                                        للاستعادة في المستقبل، يتطلب ذلك معاملة تفعيل قيد جديدة مصحوبة برسوم تجديد واسترداد رقم جامعي.
                                    </p>
                                </div>
                            </div>

                            {/* Dropdown for reasons */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 block px-1">سبب طلب الخروج والانسحاب الكلي:</label>
                                <select 
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold"
                                    value={withdrawalReason}
                                    onChange={e => setWithdrawalReason(e.target.value)}
                                >
                                    <option value="PERSONAL">ظروف شخصية / عائلية قاهرة</option>
                                    <option value="HEALTH">أسباب صحية تمنع مواصلة التعليم</option>
                                    <option value="TRANSFER">الانتقال إلى جامعة أخرى لظروف جغرافية</option>
                                    <option value="TRAVEL">الهجرة أو السفر الدائم أو العمل في الخارج</option>
                                </select>
                            </div>

                            {/* Digital Clearance checklist */}
                            <div className="space-y-2 bg-white/60 p-3.5 rounded-2xl border border-red-100/50">
                                <span className="text-[10px] font-black text-red-900 block mb-2">إفادات براءة الذمة وخيارات خلو الطرف الرقمية (Clearance Details)</span>
                                
                                <label className="flex items-center gap-3 cursor-pointer py-1 text-xs">
                                    <input 
                                        type="checkbox" 
                                        className="accent-red-600"
                                        checked={clearanceLibrary}
                                        onChange={e => setClearanceLibrary(e.target.checked)}
                                    />
                                    <span className="font-bold text-slate-700">براءة ذمة من المكتبة المركزية (تم تسليم كافة المستندات والكتب)</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer py-1 text-xs">
                                    <input 
                                        type="checkbox" 
                                        className="accent-red-600"
                                        checked={clearanceFinance}
                                        onChange={e => setClearanceFinance(e.target.checked)}
                                    />
                                    <span className="font-bold text-slate-700">تسوية مالية شاملة مع الخزينة (تسليم الحساب وإرجاع العبوات المادية)</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer py-1 text-xs">
                                    <input 
                                        type="checkbox" 
                                        className="accent-red-600"
                                        checked={clearanceHousing}
                                        onChange={e => setClearanceHousing(e.target.checked)}
                                    />
                                    <span className="font-bold text-slate-700">إخلاء حرم السكن الطلابي والمراكز اللوجستية والمخبرية الفنية</span>
                                </label>
                            </div>

                            <label className="flex items-start gap-2.5 cursor-pointer pt-2">
                                <input 
                                    type="checkbox" 
                                    className="mt-1 accent-red-600"
                                    checked={checkoutPledge}
                                    onChange={e => setCheckoutPledge(e.target.checked)}
                                />
                                <span className="text-[10px] text-red-900 font-extrabold leading-relaxed">
                                    أقر بأن جميع البيانات صحيحة، وأتحمل كلياً الأثر الأكاديمي المترتب على طلب انسحابي الكلي من الجامعة للفصل الحالي.
                                </span>
                            </label>
                        </div>
                    )}

                    {/* DYNAMIC SECTION 3: SEMESTER FREEZE (إيقاف قيد) */}
                    {requestType === 'SEMESTER_FREEZE' && (
                        <div className="bg-purple-50 border border-purple-100 rounded-3xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex gap-2 text-right">
                                <AlertCircle className="text-purple-600 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h4 className="font-black text-purple-900 text-xs">ضوابط طلب إيقاف القيد وتجميد الدراسة (Semester Freeze)</h4>
                                    <p className="text-[10px] text-purple-700 leading-relaxed mt-1">
                                        يحق للطالب تجميد القيد للفصل الدراسي الحالي بناءً على اللائحة الداخلية للجامعة (قرار 501) لأسباب إدارية أو صحية أو لوجستية مقبولة. 
                                        الحد الأقصى للإيقاف المتتالي هو (2) فصلين دراسيين، ولا يحسب فصل الإيقاف ضمن المدة الزمنية القصوى المسموحة للتخرج بالكلية. 
                                        يتطلب إيقاف القيد دفع رسوم المعاملة الرمزية (50 د.ل) التي تخصم آلياً من حسابك.
                                    </p>
                                </div>
                            </div>

                            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                                <input 
                                    type="checkbox" 
                                    className="mt-1 accent-purple-600"
                                    checked={freezePledge}
                                    onChange={e => setFreezePledge(e.target.checked)}
                                />
                                <span className="text-[10px] text-purple-900 font-extrabold leading-relaxed">
                                    أتعهد بالإيقاف المؤقت للفصل الحالي فقط، وألتزم بالعودة الدراسية وانتظامي الكلي بدءاً من الفصل الدراسي القادم.
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Free comments text block */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">ملاحظات إضافية / مبررات الطلب</label>
                        <textarea 
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold focus:bg-white focus:border-[#C74634] outline-none transition-all resize-none"
                            rows={3}
                            value={comments}
                            onChange={e => setComments(e.target.value)}
                            placeholder="يرجى كتابة أي أسباب أو تفاصيل إضافية لمراجعتها من قبل المشرف الأكاديمي..."
                        />
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ServiceRequests;
