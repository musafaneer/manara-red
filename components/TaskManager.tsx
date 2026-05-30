
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, Plus, Filter, Tag, Trash2, 
  AlertCircle, Calendar, ChevronDown, SortAsc, LayoutGrid, List as ListIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserTask, TaskCategory } from '../types';
import { 
  getTasks, 
  saveTask, 
  deleteTask, 
  addTask, 
  getCategoryLabel, 
  getCategoryColor 
} from '../services/taskService';
import { getCurrentUser } from '../services/authService';
import { cn } from '../lib/utils';
import { notifySuccess, notifyError } from '../services/notificationService';

import { Language } from '../services/i18nService';

interface TaskManagerProps {
    compact?: boolean;
    onTaskUpdate?: () => void;
    language?: Language;
}

const TaskManager: React.FC<TaskManagerProps> = ({ compact = false, onTaskUpdate, language = 'ar' }) => {
    const [tasks, setTasks] = useState<UserTask[]>([]);
    const [filter, setFilter] = useState<string>('ALL');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskCategory, setNewTaskCategory] = useState<string>('WORK');
    const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

    const currentUser = getCurrentUser();
    const userId = currentUser?.id || 'guest';

    useEffect(() => {
        setTasks(getTasks(userId));
    }, [userId]);

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) {
            notifyError('يرجى كتابة عنوان للمهمة');
            return;
        }

        const task = addTask(userId, newTaskTitle, newTaskCategory, newTaskPriority);
        setTasks(prev => [task, ...prev]);
        setNewTaskTitle('');
        setShowAddForm(false);
        notifySuccess('تمت إضافة المهمة بنجاح');
        onTaskUpdate?.();
    };

    const toggleTask = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const updatedTask = { ...task, completed: !task.completed };
            saveTask(updatedTask);
            setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
            onTaskUpdate?.();
        }
    };

    const handleDelete = (taskId: string) => {
        deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        onTaskUpdate?.();
    };

    const filteredTasks = tasks.filter(t => filter === 'ALL' || t.category === filter);

    const categories = [
        { id: 'ALL', label: 'الكل', color: 'slate' },
        { id: 'URGENT', label: 'عاجل', color: 'red' },
        { id: 'WORK', label: 'عمل', color: 'blue' },
        { id: 'PERSONAL', label: 'شخصي', color: 'green' },
        { id: 'ACADEMIC', label: 'أكاديمي', color: 'purple' },
        { id: 'ADMIN', label: 'إداري', color: 'orange' },
    ];

    const getCategoryStyles = (category: string) => {
        switch (category) {
            case 'URGENT': return 'bg-red-50 text-red-600 border-red-100';
            case 'WORK': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'PERSONAL': return 'bg-green-50 text-green-600 border-green-100';
            case 'ACADEMIC': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'ADMIN': return 'bg-orange-50 text-orange-600 border-orange-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    if (compact) {
        return (
            <div className="space-y-4" dir="rtl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                        {categories.slice(0, 4).map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFilter(cat.id)}
                                className={cn(
                                    "px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all whitespace-nowrap",
                                    filter === cat.id 
                                    ? 'bg-slate-800 text-white shadow-sm' 
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                )}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                <AnimatePresence>
                    {showAddForm && (
                        <motion.form 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onSubmit={handleAddTask}
                            className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 overflow-hidden"
                        >
                            <input 
                                autoFocus
                                type="text"
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                placeholder="ماذا تريد أن تفعل؟"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <div className="flex gap-2">
                                <select 
                                    value={newTaskCategory}
                                    onChange={e => setNewTaskCategory(e.target.value)}
                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
                                >
                                    {categories.filter(c => c.id !== 'ALL').map(c => (
                                        <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                </select>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black shadow-sm">إضافة</button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="space-y-2">
                    {filteredTasks.length > 0 ? filteredTasks.map(task => (
                        <div 
                            key={task.id} 
                            className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl group hover:border-blue-200 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => toggleTask(task.id)}
                                    className={cn(
                                        "transition-colors",
                                        task.completed ? "text-emerald-500" : "text-slate-300 hover:text-blue-400"
                                    )}
                                >
                                    {task.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </button>
                                <span className={cn(
                                    "text-xs font-bold transition-all",
                                    task.completed ? "text-slate-400 line-through" : "text-slate-700"
                                )}>
                                    {task.title}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-md text-[8px] font-black uppercase",
                                    getCategoryStyles(task.category)
                                )}>
                                    {getCategoryLabel(task.category)}
                                </span>
                                <button 
                                    onClick={() => handleDelete(task.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="py-8 text-center text-slate-300">
                            <span className="text-[10px] font-black uppercase tracking-widest">لا توجد مهام</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden" dir="rtl">
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <CheckCircle2 className="text-blue-600" />
                        مدير المهام والإنتاجية
                    </h3>
                    <p className="text-sm text-slate-400 font-medium">تنظيم مهامك اليومية والأكاديمية في مكان واحد</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFilter(cat.id)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-black transition-all",
                                    filter === cat.id 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-600'
                                )}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => setShowAddForm(true)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 transition-all"
                    >
                        <Plus size={16} />
                        مهمة جديدة
                    </button>
                </div>
            </div>

            <div className="p-8">
                <AnimatePresence>
                    {showAddForm && (
                        <motion.form 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            onSubmit={handleAddTask}
                            className="mb-8 p-8 bg-blue-50 rounded-3xl border border-blue-100 grid grid-cols-1 md:grid-cols-12 gap-6 items-end"
                        >
                            <div className="md:col-span-6 space-y-2">
                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">عنوان المهمة</label>
                                <input 
                                    autoFocus
                                    type="text"
                                    value={newTaskTitle}
                                    onChange={e => setNewTaskTitle(e.target.value)}
                                    placeholder="ما الذي تخطط للقيام به؟"
                                    className="w-full bg-white border border-blue-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                />
                            </div>
                            <div className="md:col-span-3 space-y-2">
                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">التصنيف</label>
                                <select 
                                    value={newTaskCategory}
                                    onChange={e => setNewTaskCategory(e.target.value)}
                                    className="w-full bg-white border border-blue-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none cursor-pointer"
                                >
                                    {categories.filter(c => c.id !== 'ALL').map(c => (
                                        <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-3 flex gap-2">
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-200">حفظ المهمة</button>
                                <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-4 bg-white text-slate-400 font-black text-sm rounded-2xl border border-blue-200">إلغاء</button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTasks.length > 0 ? filteredTasks.map(task => (
                        <motion.div 
                            layout
                            key={task.id}
                            className={cn(
                                "p-6 rounded-3xl border-2 transition-all group relative",
                                task.completed 
                                ? "bg-slate-50 border-slate-100 opacity-60" 
                                : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-100"
                            )}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                                    getCategoryStyles(task.category)
                                )}>
                                    <Tag size={12} />
                                    {getCategoryLabel(task.category)}
                                </div>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => toggleTask(task.id)}
                                        className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                            task.completed ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-300 hover:bg-blue-50 hover:text-blue-600"
                                        )}
                                    >
                                        <CheckCircle2 size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(task.id)}
                                        className="w-8 h-8 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h4 className={cn(
                                "text-lg font-black leading-tight mb-2",
                                task.completed ? "text-slate-400 line-through" : "text-slate-800"
                            )}>
                                {task.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-50">
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                                    task.priority === 'HIGH' ? "bg-rose-100 text-rose-600" :
                                    task.priority === 'MEDIUM' ? "bg-blue-100 text-blue-600" :
                                    "bg-slate-100 text-slate-400"
                                )}>
                                    أولوية {task.priority === 'HIGH' ? 'عالية' : task.priority === 'MEDIUM' ? 'متوسطة' : 'عادية'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold font-mono">
                                    {new Date(task.createdAt).toLocaleDateString('ar-LY')}
                                </span>
                            </div>
                        </motion.div>
                    )) : (
                        <div className="col-span-full py-20 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Calendar size={40} />
                            </div>
                            <h4 className="text-xl font-black text-slate-400 mb-2">لا توجد مهام حالياً</h4>
                            <p className="text-sm font-medium">ابدأ بإضافة أول مهمة للتركيز على أهدافك الأكاديمية</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskManager;
