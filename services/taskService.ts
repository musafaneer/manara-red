
import { UserTask, TaskCategory } from '../types';

const TASKS_KEY = 'oracle_campus_tasks';

export const getTasks = (userId: string): UserTask[] => {
    const stored = localStorage.getItem(TASKS_KEY);
    if (!stored) {
        // Default tasks for simulation
        const defaults: UserTask[] = [
            { 
                id: '1', 
                userId, 
                title: 'تحديث الملف الشخصي', 
                category: 'PERSONAL', 
                dueDate: new Date().toISOString(), 
                completed: false, 
                priority: 'MEDIUM',
                createdAt: new Date().toISOString()
            },
            { 
                id: '2', 
                userId, 
                title: 'استيفاء مستندات القبول', 
                category: 'WORK', 
                dueDate: new Date().toISOString(), 
                completed: false, 
                priority: 'HIGH',
                createdAt: new Date().toISOString()
            },
            { 
                id: '3', 
                userId, 
                title: 'مراجعة جدول المحاضرات', 
                category: 'ACADEMIC', 
                dueDate: new Date().toISOString(), 
                completed: true, 
                priority: 'LOW',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem(TASKS_KEY, JSON.stringify(defaults));
        return defaults.filter(t => t.userId === userId);
    }
    const tasks: UserTask[] = JSON.parse(stored);
    return tasks.filter(t => t.userId === userId);
};

export const saveTask = (task: UserTask): void => {
    const stored = localStorage.getItem(TASKS_KEY);
    const tasks: UserTask[] = stored ? JSON.parse(stored) : [];
    
    const index = tasks.findIndex(t => t.id === task.id);
    if (index > -1) {
        tasks[index] = task;
    } else {
        tasks.push(task);
    }
    
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
};

export const deleteTask = (taskId: string): void => {
    const stored = localStorage.getItem(TASKS_KEY);
    if (!stored) return;
    
    const tasks: UserTask[] = JSON.parse(stored);
    const filtered = tasks.filter(t => t.id !== taskId);
    localStorage.setItem(TASKS_KEY, JSON.stringify(filtered));
};

export const addTask = (userId: string, title: string, category: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'): UserTask => {
    const newTask: UserTask = {
        id: `TASK-${Date.now()}`,
        userId,
        title,
        category,
        dueDate: new Date().toISOString(),
        completed: false,
        priority,
        createdAt: new Date().toISOString()
    };
    saveTask(newTask);
    return newTask;
};

export const getCategoryLabel = (category: string): string => {
    switch (category) {
        case 'URGENT': return 'عاجل';
        case 'WORK': return 'عمل';
        case 'PERSONAL': return 'شخصي';
        case 'ACADEMIC': return 'أكاديمي';
        case 'ADMIN': return 'إداري';
        default: return category;
    }
};

export const getCategoryColor = (category: string): string => {
    switch (category) {
        case 'URGENT': return 'red';
        case 'WORK': return 'blue';
        case 'PERSONAL': return 'green';
        case 'ACADEMIC': return 'purple';
        case 'ADMIN': return 'orange';
        default: return 'slate';
    }
};
