import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getInstructors, saveInstructor, deleteInstructor } from '../services/facultyService';
import { getDepartments, getDepartmentName, getCourses } from '../services/storageService';
import { Instructor, Department, Course } from '../types';
import { 
    Users, Plus, Edit2, Trash2, Mail, Award, Search, X, 
    Save, Briefcase, GraduationCap, Book, Check, Filter,
    ChevronDown, User, AtSign, Microscope
} from 'lucide-react';
import { notifySuccess, notifyInfo } from '../services/notificationService';
import { cn } from '../lib/utils';

import Modal from './ui/Modal';

import { Language } from '../services/i18nService';

interface FacultyProps {
    language?: Language;
}

const Faculty: React.FC<FacultyProps> = ({ language = 'ar' }) => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentInstructor, setCurrentInstructor] = useState<Partial<Instructor>>({
      name: '', degree: 'PhD', departmentId: '', email: '', specialization: '', courseIds: []
  });

  useEffect(() => {
    setInstructors(getInstructors());
    setDepartments(getDepartments());
    setAvailableCourses(getCourses());
  }, []);

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentInstructor.departmentId) {
          notifyInfo('يرجى اختيار القسم');
          return;
      }
      const newInst: Instructor = {
          id: currentInstructor.id || `INS${Date.now()}`,
          name: currentInstructor.name!,
          degree: currentInstructor.degree as any,
          departmentId: currentInstructor.departmentId!,
          email: currentInstructor.email!,
          specialization: currentInstructor.specialization!,
          courseIds: currentInstructor.courseIds || []
      };
      saveInstructor(newInst);
      setInstructors(getInstructors());
      notifySuccess(isEditMode ? 'تم تحديث البيانات' : 'تم إضافة عضو هيئة التدريس');
      setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if (confirm('هل أنت متأكد من الحذف؟')) {
          deleteInstructor(id);
          setInstructors(getInstructors());
          notifyInfo('تم الحذف بنجاح');
      }
  };

  const filtered = instructors.filter(i => {
    const matchesSearch = 
        i.name.includes(searchTerm) || 
        getDepartmentName(i.departmentId).includes(searchTerm) ||
        i.specialization.includes(searchTerm);
    
    const matchesDept = deptFilter === 'ALL' || i.departmentId === deptFilter;
    
    return matchesSearch && matchesDept;
  });

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-2">
            <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-100 text-blue-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">الموارد البشرية</span>
                <span className="bg-emerald-100 text-emerald-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">الأكاديمي</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                أعضاء هيئة التدريس
                <div className="p-2 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                    <Briefcase size={20} />
                </div>
            </h2>
            <p className="text-slate-500 font-medium text-sm">إدارة الكفاءات الأكاديمية والمقررات الدراسية لكل عضو</p>
        </div>
        <button 
            onClick={() => {
                setIsEditMode(false);
                setCurrentInstructor({ name: '', degree: 'PhD', departmentId: '', email: '', specialization: '', courseIds: [] });
                setIsModalOpen(true);
            }}
            className="group bg-slate-900 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-slate-200 hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border-b-2 border-slate-950 hover:border-blue-800"
        >
          <div className="bg-white/20 p-2 rounded-xl group-hover:bg-white/30 transition-colors">
            <Plus size={24} />
          </div>
          <span className="text-lg">إضافة أكاديمي جديد</span>
        </button>
      </div>

      {/* Controls Section */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
            <input 
              type="text" 
              placeholder="البحث عن عضو هيئة تدريس..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-16 pl-8 py-5 rounded-3xl bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 transition-all font-black text-slate-800 placeholder:text-slate-300 shadow-inner"
            />
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-3xl border border-slate-100">
            <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-400">
                <Filter size={24} />
            </div>
            <select 
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-black text-slate-600 pr-8 pl-4 cursor-pointer"
            >
                <option value="ALL">جميع الأقسام العلمية</option>
                {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>
        </div>
      </div>
      
      {/* Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
          <AnimatePresence mode="popLayout">
            {filtered.map(inst => (
                <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={inst.id} 
                    className="bg-white border-2 border-slate-100 rounded-[4rem] p-10 hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] transition-all group relative hover:border-blue-500/20 overflow-hidden"
                >
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[4rem] -z-0 opacity-50 group-hover:bg-blue-50 transition-colors" />
                    
                    <div className="absolute top-8 left-8 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 flex gap-3 z-10">
                        <button onClick={() => {
                            setCurrentInstructor(inst);
                            setIsEditMode(true);
                            setIsModalOpen(true);
                        }} className="p-4 bg-white text-blue-600 rounded-2xl shadow-xl hover:bg-blue-600 hover:text-white transition-all active:scale-95"><Edit2 size={24}/></button>
                        <button onClick={() => handleDelete(inst.id)} className="p-4 bg-white text-rose-600 rounded-2xl shadow-xl hover:bg-rose-600 hover:text-white transition-all active:scale-95"><Trash2 size={24}/></button>
                    </div>
                    
                    <div className="relative z-10 space-y-8">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-tr from-slate-100 to-slate-200 border-4 border-white shadow-xl flex items-center justify-center font-black text-slate-400 text-3xl group-hover:scale-110 transition-transform tracking-tighter">
                                    {inst.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <div className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100">
                                    <GraduationCap size={16} className="text-blue-600" />
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="font-black text-slate-900 text-2xl tracking-tight leading-tight">{inst.name}</h3>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    <span className={cn(
                                        "text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest",
                                        inst.degree === 'PhD' ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                    )}>
                                        {inst.degree === 'PhD' ? 'دكتوراه' : inst.degree === 'Master' ? 'ماجستير' : 'بكالوريوس'}
                                    </span>
                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                                        ID: {inst.id}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2">
                            <InfoCard icon={<Microscope size={20}/>} label="التخصص" value={inst.specialization} />
                            <InfoCard icon={<User size={20}/>} label="القسم العلمي" value={getDepartmentName(inst.departmentId)} />
                            <InfoCard icon={<AtSign size={20}/>} label="البريد الإلكتروني" value={inst.email} isMono />
                        </div>

                        {inst.courseIds && inst.courseIds.length > 0 && (
                            <div className="pt-6 border-t border-slate-100 mt-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 justify-center">
                                    <Book size={14} /> المقررات المكلف بها
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {inst.courseIds.map(cid => {
                                        const c = availableCourses.find(course => course.id === cid);
                                        if (!c) return null;
                                        return (
                                            <span key={cid} className="bg-slate-50 text-slate-600 px-4 py-2 rounded-2xl text-[10px] font-black border border-slate-100 hover:bg-white hover:border-blue-200 transition-all cursor-default">
                                                {c.name}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-300 space-y-6">
                 <div className="p-10 bg-white rounded-[40px] shadow-sm border border-slate-100">
                    <Search size={64} strokeWidth={1} />
                 </div>
                 <p className="text-xl font-black">لا توجد نتائج تطابق بحثك</p>
                 <button 
                    onClick={() => { setSearchTerm(''); setDeptFilter('ALL'); }}
                    className="text-blue-600 font-black text-sm uppercase tracking-widest hover:underline"
                 >
                    إعادة ضبط الفلاتر
                 </button>
            </div>
          )}
      </div>

      {/* Modal Section */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? 'تعديل البيانات' : 'إضافة أكاديمي جديد'}
        description="Faculty Resource Management"
        icon={User}
        maxWidth="2xl"
        footer={
            <div className="flex flex-col md:flex-row justify-end gap-6">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-10 py-5 text-slate-400 font-black text-sm uppercase tracking-[0.2em] hover:text-slate-600 transition-all"
                >
                    إلغاء العملية
                </button>
                <button 
                    onClick={() => {
                        const form = document.getElementById('faculty-form') as HTMLFormElement;
                        if (form) form.requestSubmit();
                    }}
                    className="px-16 py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl shadow-slate-200 hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 border-b-4 border-slate-950 hover:border-blue-800 group"
                >
                    <Save size={24} className="group-hover:rotate-12 transition-transform" /> 
                    <span className="text-lg">حفظ البيانات</span>
                </button>
            </div>
        }
      >
        <form id="faculty-form" onSubmit={handleSave} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <FormInput 
                    label="الاسم الكامل" 
                    required 
                    value={currentInstructor.name} 
                    onChange={e => setCurrentInstructor({...currentInstructor, name: e.target.value})} 
                />
                
                <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <GraduationCap size={14} className="text-slate-300" /> الدرجة العلمية
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {['PhD', 'Master', 'Bachelor'].map(degree => (
                            <button
                                key={degree}
                                type="button"
                                onClick={() => setCurrentInstructor({...currentInstructor, degree: degree as any})}
                                className={cn(
                                    "py-4 rounded-2xl text-[10px] font-black uppercase transition-all border-2",
                                    currentInstructor.degree === degree 
                                        ? "bg-slate-900 border-slate-900 text-white shadow-xl" 
                                        : "bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200"
                                )}
                            >
                                {degree === 'PhD' ? 'دكتوراه' : degree === 'Master' ? 'ماجستير' : 'بكالوريوس'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Filter size={14} className="text-slate-300" /> القسم العلمي
                    </label>
                    <select 
                        required 
                        className="w-full bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-3xl px-6 py-5 text-sm font-black text-slate-800 transition-all appearance-none cursor-pointer shadow-inner bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_1.5rem_center] bg-no-repeat"
                        value={currentInstructor.departmentId} 
                        onChange={e => setCurrentInstructor({...currentInstructor, departmentId: e.target.value})} 
                    >
                        <option value="">اختر القسم...</option>
                        {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                </div>

                <FormInput 
                    label="التخصص الدقيق" 
                    required 
                    value={currentInstructor.specialization} 
                    onChange={e => setCurrentInstructor({...currentInstructor, specialization: e.target.value})} 
                />

                <div className="md:col-span-2">
                    <FormInput 
                        label="البريد الإلكتروني الجامعي" 
                        required 
                        type="email"
                        isMono
                        value={currentInstructor.email} 
                        onChange={e => setCurrentInstructor({...currentInstructor, email: e.target.value})} 
                    />
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Book size={14} className="text-slate-300" /> تعيين المقررات الدراسية
                    </label>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm">
                        {currentInstructor.courseIds?.length || 0} مقرر محدد
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 border-2 border-slate-100 rounded-[3rem] p-8 max-h-[300px] overflow-y-auto no-scrollbar shadow-inner">
                    {availableCourses.map(course => {
                        const isSelected = (currentInstructor.courseIds || []).includes(course.id);
                        return (
                            <button 
                                key={course.id}
                                type="button"
                                onClick={() => {
                                    const currentIds = currentInstructor.courseIds || [];
                                    if (isSelected) {
                                        setCurrentInstructor({
                                            ...currentInstructor,
                                            courseIds: currentIds.filter(id => id !== course.id)
                                        });
                                    } else {
                                        setCurrentInstructor({
                                            ...currentInstructor,
                                            courseIds: [...currentIds, course.id]
                                        });
                                    }
                                }}
                                className={cn(
                                    "flex items-center justify-between p-5 rounded-3xl border-2 transition-all group active:scale-95",
                                    isSelected 
                                        ? "bg-white border-blue-500 text-blue-600 shadow-xl shadow-blue-500/5 ring-4 ring-blue-50" 
                                        : "bg-white border-white text-slate-400 hover:border-slate-200"
                                )}
                            >
                                <div className="flex items-center gap-4 text-right">
                                    <div className={cn(
                                        "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                                        isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                                    )}>
                                        <Book size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black leading-tight">{course.name}</p>
                                        <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">{course.code}</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                    isSelected ? "bg-blue-600 border-blue-600 text-white scale-110 shadow-lg shadow-blue-500/20" : "border-slate-100"
                                )}>
                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </form>
      </Modal>
    </div>
  );
};

// Internal Components
const InfoCard = ({ icon, label, value, isMono = false }: { icon: React.ReactNode, label: string, value: string, isMono?: boolean }) => (
    <div className="flex items-center gap-5 p-5 bg-slate-50/50 rounded-3xl border border-transparent hover:border-slate-100 hover:bg-white transition-all group/card">
        <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 group-hover/card:text-blue-600 group-hover/card:shadow-md transition-all">
            {icon}
        </div>
        <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">{label}</span>
            <span className={cn(
                "text-xs font-black text-slate-700",
                isMono ? "font-mono tracking-tighter" : ""
            )}>
                {value}
            </span>
        </div>
    </div>
);

const FormInput = ({ label, isMono = false, ...props }: any) => (
    <div className="space-y-4">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>
        <input 
            {...props}
            className={cn(
                "w-full bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-3xl px-6 py-5 text-sm font-black text-slate-800 transition-all shadow-inner",
                isMono ? "font-mono" : ""
            )}
        />
    </div>
);

export default Faculty;
