
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getStaff, saveStaffMember, deleteStaffMember,
  getBranches, getColleges, getDepartments,
  getAcademicPrograms, getSections,
  checkNationalIdExists
} from '../services/storageService';
import { StaffMember, StaffType, Branch, College, Department, AcademicProgram, Section, Permission } from '../types';
import { 
  Users, Plus, Edit2, Trash2, Mail, Phone, MapPin, 
  Briefcase, Search, X, Save, Shield, UserCircle, 
  GraduationCap, Building2, UserCheck, Filter, ShieldCheck, Printer
} from 'lucide-react';
import { notifySuccess, notifyInfo, notifyError } from '../services/notificationService';
import { getCurrentUser, hasPermission } from '../services/authService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import SecurePrintWrapper from './ui/SecurePrintWrapper';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import Modal from './ui/Modal';

import { Language } from '../services/i18nService';

interface StaffManagementProps {
    language: Language;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ language }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<AcademicProgram[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'joinDate' | 'type'>('name');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [currentStaff, setCurrentStaff] = useState<Partial<StaffMember>>({
    type: 'ACADEMIC',
    status: 'ACTIVE',
    joinDate: new Date().toISOString().split('T')[0]
  });

  const currentUser = getCurrentUser();
  const canManage = hasPermission(currentUser, Permission.STAFF_MANAGE);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = () => {
    setStaff(getStaff());
    setBranches(getBranches());
    setColleges(getColleges());
    setDepts(getDepartments());
    setPrograms(getAcademicPrograms());
    setSections(getSections());
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff.name || !currentStaff.nationalId || !currentStaff.branchId) {
      notifyError('يرجى ملء كافة الحقول الإجبارية');
      return;
    }

    if (checkNationalIdExists(currentStaff.nationalId, currentStaff.id)) {
        notifyError('الرقم الوطني مستخدم مسبقاً');
        return;
    }

    const member: StaffMember = {
      id: currentStaff.id || `STF-${Date.now()}`,
      name: currentStaff.name!,
      nationalId: currentStaff.nationalId!,
      type: currentStaff.type as StaffType,
      degree: currentStaff.degree as any,
      email: currentStaff.email || '',
      phone: currentStaff.phone || '',
      branchId: currentStaff.branchId!,
      collegeId: currentStaff.collegeId,
      deptId: currentStaff.deptId,
      sectionId: currentStaff.sectionId,
      position: currentStaff.position!,
      status: currentStaff.status as any || 'ACTIVE',
      joinDate: currentStaff.joinDate || new Date().toISOString().split('T')[0],
      specialization: currentStaff.specialization
    };

    saveStaffMember(member);
    refresh();
    notifySuccess(isEditMode ? 'تم تحديث بيانات الموظف' : 'تم إضافة الموظف بنجاح');
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!canManage) return;
    if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
      deleteStaffMember(id);
      refresh();
      notifyInfo('تم حذف الموظف');
    }
  };

  const filteredStaff = staff
    .filter(s => {
      const matchesSearch = s.name.includes(searchTerm) || s.position.includes(searchTerm);
      const matchesType = filterType === 'all' || s.type === filterType;
      const matchesDept = filterDept === 'all' || s.deptId === filterDept;
      const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
      return matchesSearch && matchesType && matchesDept && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
      if (sortBy === 'joinDate') return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
      if (sortBy === 'type') return a.type.localeCompare(b.type);
      return 0;
    });

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                <Users size={28} />
            </div>
            إدارة الكوادر البشرية
          </h2>
          <p className="text-slate-500 font-medium">إدارة أعضاء هيئة التدريس والموظفين الإداريين والفنيين</p>
        </div>
        <div className="flex gap-4 items-center">
            <button 
                onClick={() => {
                  const printEvent = new CustomEvent('trigger-secure-print-staff');
                  window.dispatchEvent(printEvent);
                }}
                className="bg-white text-slate-600 px-8 py-3.5 rounded-2xl font-black shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 border border-slate-200"
            >
                <Printer size={20} />
                <span>طباعة الكشف</span>
            </button>
            {canManage && (
              <button 
                onClick={() => {
                  setIsEditMode(false);
                  setCurrentStaff({ type: 'ACADEMIC', status: 'ACTIVE', joinDate: new Date().toISOString().split('T')[0] });
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus size={20} />
                <span>إضافة عضو جديد</span>
              </button>
            )}
        </div>
      </div>

      <SecurePrintWrapper
        documentId="staff-directory"
        title="دليل الكادر الأكاديمي والإداري"
        triggerId="trigger-secure-print-staff"
      >
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 space-y-4 no-print">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="بحث بالاسم أو المسمى الوظيفي..."
                  className="w-full pr-12 pl-4 py-3 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 bg-white p-1 rounded-2xl border border-slate-200">
                <button 
                  onClick={() => setSortBy('name')} 
                  className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all", sortBy === 'name' ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50")}
                >الاسم</button>
                <button 
                  onClick={() => setSortBy('joinDate')} 
                  className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all", sortBy === 'joinDate' ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50")}
                >التاريخ</button>
                <button 
                  onClick={() => setSortBy('type')} 
                  className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all", sortBy === 'type' ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50")}
                >النوع</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">نوع الكادر</label>
                <select 
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="all">كل الكوادر</option>
                  <option value="ACADEMIC">هيئة تدريس</option>
                  <option value="ADMINISTRATIVE">موظف إداري</option>
                  <option value="TECHNICAL">فني / معمل</option>
                  <option value="SECURITY">أمن وسلامة</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">القسم العلمي</label>
                <select 
                  value={filterDept}
                  onChange={e => setFilterDept(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="all">كل الأقسام</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">الحالة الوظيفية</label>
                <select 
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="all">الكل</option>
                  <option value="ACTIVE">على رأس العمل</option>
                  <option value="ON_LEAVE">إجازة</option>
                  <option value="RESIGNED">مستقيل / منتهي</option>
                </select>
              </div>

              <div className="flex items-end">
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                    setFilterDept('all');
                    setFilterStatus('all');
                  }}
                  className="w-full py-2 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                >إعادة ضبط</button>
              </div>
            </div>
          </div>

          <div className="p-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredStaff.map(member => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={member.id} 
                  className="bg-white border border-slate-200 rounded-[32px] overflow-hidden hover:shadow-2xl transition-all group relative hover:border-blue-200"
                >
                  <div className={cn("h-2", member.type === 'ACADEMIC' ? "bg-indigo-500" : "bg-teal-500")} />
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className={cn("p-4 rounded-2xl shadow-sm", member.type === 'ACADEMIC' ? "bg-indigo-50 text-indigo-600" : "bg-teal-50 text-teal-600")}>
                        {member.type === 'ACADEMIC' ? <GraduationCap size={28} /> : <Briefcase size={28} />}
                      </div>
                      {canManage && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                          <button onClick={() => { setCurrentStaff(member); setIsEditMode(true); setIsModalOpen(true); }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"><Edit2 size={18}/></button>
                          <button onClick={() => handleDelete(member.id)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"><Trash2 size={18}/></button>
                        </div>
                      )}
                    </div>

                    <h3 className="font-black text-xl text-slate-900 mb-1">{member.name}</h3>
                    <p className="text-sm font-black text-blue-600 mb-6">{member.position}</p>

                    <div className="space-y-3 text-sm text-slate-500">
                      <div className="flex items-center gap-3 font-medium"><MapPin size={16} className="text-slate-300"/> <span>{branches.find(b => b.id === member.branchId)?.name}</span></div>
                      <div className="flex items-center gap-3 font-medium"><Mail size={16} className="text-slate-300"/> <span className="font-mono text-xs">{member.email}</span></div>
                      <div className="flex items-center gap-3 font-medium"><Phone size={16} className="text-slate-300"/> <span className="font-mono text-xs">{member.phone}</span></div>
                    </div>

                    <div className="mt-8 flex justify-between items-center pt-6 border-t border-slate-50">
                      <span className={cn(
                          "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                          member.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {member.status === 'ACTIVE' ? 'على رأس العمل' : 'إجازة / غياب'}
                      </span>
                      <span className="text-[10px] text-slate-300 font-black font-mono">{member.id}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredStaff.length === 0 && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-32 text-center"
              >
                <Users size={64} className="mx-auto mb-6 text-slate-200" />
                <p className="font-black text-xl text-slate-400">لا يوجد سجلات حالياً</p>
                <p className="text-slate-300 font-medium mt-2">ابدأ بإضافة أعضاء هيئة التدريس أو الموظفين</p>
              </motion.div>
            )}
          </div>
        </div>
      </SecurePrintWrapper>

      {/* Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? 'تعديل بيانات الكادر' : 'إضافة عضو جديد'}
        description="إدارة الموارد البشرية والتبعية الإدارية"
        icon={Shield}
        maxWidth="2xl"
        footer={
            <div className="flex justify-end gap-4">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-8 py-3.5 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                >
                    إلغاء
                </button>
                <button 
                    onClick={() => {
                        const form = document.getElementById('staff-form') as HTMLFormElement;
                        if (form) form.requestSubmit();
                    }}
                    className="px-12 py-3.5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    <Save size={20} /> حفظ البيانات
                </button>
            </div>
        }
      >
        <form id="staff-form" onSubmit={handleSave} className="space-y-8 overflow-y-auto max-h-[75vh] no-scrollbar px-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormInput label="الاسم الكامل" name="name" value={currentStaff.name} onChange={(v: any) => setCurrentStaff({...currentStaff, name: v})} required />
                <FormInput label="الرقم الوطني" name="nationalId" value={currentStaff.nationalId} onChange={(v: any) => setCurrentStaff({...currentStaff, nationalId: v})} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <FormSelect label="نوع الكادر" value={currentStaff.type} onChange={(v: any) => setCurrentStaff({...currentStaff, type: v as any})}>
                    <option value="ACADEMIC">هيئة تدريس (محاضر)</option>
                    <option value="ADMINISTRATIVE">موظف إداري</option>
                    <option value="TECHNICAL">فني / معمل</option>
                    <option value="SECURITY">أمن وسلامة</option>
                </FormSelect>
                <FormInput label="المسمى الوظيفي" name="position" value={currentStaff.position} onChange={(v: any) => setCurrentStaff({...currentStaff, position: v})} required />
                <FormSelect label="الدرجة العلمية" value={currentStaff.degree} onChange={(v: any) => setCurrentStaff({...currentStaff, degree: v as any})}>
                    <option value="PhD">دكتوراه</option>
                    <option value="Master">ماجستير</option>
                    <option value="Bachelor">بكالوريوس</option>
                    <option value="Diploma">دبلوم</option>
                </FormSelect>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormInput label="البريد الإلكتروني" name="email" type="email" value={currentStaff.email} onChange={(v: any) => setCurrentStaff({...currentStaff, email: v})} />
                <FormInput label="رقم الهاتف" name="phone" value={currentStaff.phone} onChange={(v: any) => setCurrentStaff({...currentStaff, phone: v})} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormSelect label="الحالة الوظيفية" value={currentStaff.status} onChange={(v: any) => setCurrentStaff({...currentStaff, status: v as any})}>
                    <option value="ACTIVE">على رأس العمل</option>
                    <option value="ON_LEAVE">إجازة / غياب</option>
                    <option value="RESIGNED">مستقيل / منتهي الخدمة</option>
                </FormSelect>
                <FormInput label="تاريخ الالتحاق" type="date" value={currentStaff.joinDate} onChange={(v: any) => setCurrentStaff({...currentStaff, joinDate: v})} />
            </div>

            {currentStaff.type === 'ACADEMIC' && (
                <div className="grid grid-cols-1 gap-8 animate-in slide-in-from-top-2 duration-300">
                    <FormInput label="التخصص الدقيق" value={currentStaff.specialization} onChange={(v: any) => setCurrentStaff({...currentStaff, specialization: v})} placeholder="مثال: الذكاء الاصطناعي، الأمن السيبراني..." />
                </div>
            )}

            <div className="pt-8 border-t border-slate-100">
                <h4 className="text-[11px] font-black text-slate-400 mb-6 uppercase tracking-widest">التبعية الإدارية (الهيكل التنظيمي)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FormSelect 
                        label="الفرع" 
                        value={currentStaff.branchId} 
                        onChange={(v: any) => setCurrentStaff({
                            ...currentStaff, 
                            branchId: v,
                            collegeId: undefined,
                            deptId: undefined,
                            sectionId: undefined
                        })}
                    >
                        <option value="">اختر الفرع...</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </FormSelect>
                    <FormSelect 
                        label="الكلية" 
                        value={currentStaff.collegeId} 
                        onChange={(v: any) => setCurrentStaff({
                            ...currentStaff, 
                            collegeId: v,
                            deptId: undefined,
                            sectionId: undefined
                        })}
                    >
                        <option value="">(اختياري)</option>
                        {colleges.filter(c => !currentStaff.branchId || c.branchId === currentStaff.branchId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </FormSelect>
                    <FormSelect 
                        label="القسم" 
                        value={currentStaff.deptId} 
                        onChange={(v: any) => setCurrentStaff({
                            ...currentStaff, 
                            deptId: v,
                            sectionId: undefined
                        })}
                    >
                        <option value="">(اختياري)</option>
                        {depts.filter(d => !currentStaff.collegeId || d.collegeId === currentStaff.collegeId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </FormSelect>
                    <FormSelect 
                        label="الشعبة / التخصص" 
                        value={currentStaff.sectionId} 
                        onChange={(v: any) => setCurrentStaff({
                            ...currentStaff, 
                            sectionId: v
                        })}
                    >
                        <option value="">(اختياري)</option>
                        {sections.filter(s => {
                            if (!currentStaff.deptId) return false;
                            const prog = programs.find(p => p.id === s.programId);
                            return prog?.deptId === currentStaff.deptId;
                        }).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </FormSelect>
                </div>
            </div>
        </form>
      </Modal>
    </div>
  );
};

const FormInput = ({ label, name, value, onChange, type = "text", required = false, placeholder = "" }: any) => (
  <div className="space-y-2">
    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{label} {required && <span className="text-rose-500">*</span>}</label>
    <input 
      type={type} 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      required={required}
      placeholder={placeholder}
      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700" 
    />
  </div>
);

const FormSelect = ({ label, value, onChange, children }: any) => (
  <div className="space-y-2">
    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{label}</label>
    <select 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700 appearance-none"
    >
      {children}
    </select>
  </div>
);

export default StaffManagement;
