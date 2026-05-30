
import { SystemNotification, NotificationType, UserRole } from '../types';
import { getSystemSettings } from './storageService';

export interface BroadcastLog {
  id: string;
  title: string;
  message: string;
  targetCohort: string;
  recipientCount: number;
  timestamp: string;
  sender: string;
}

const STORAGE_KEY_BROADCASTS = 'oracle_campus_broadcast_history';
const STORAGE_KEY_NOTIFICATIONS = 'oracle_campus_notifications';

const DEFAULT_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    title: 'موعد نهائي للتسجيل',
    message: 'يقترب الموعد النهائي لتسجيل مواد خريف 2024. يرجى التأكد من تسوية الرسوم الدراسية.',
    type: NotificationType.DEADLINE,
    date: new Date().toISOString(),
    isRead: false,
    targetRole: UserRole.STUDENT
  },
  {
    id: 'notif-2',
    title: 'تحديث في لائحة الدراسة',
    message: 'تم إضافة تعديلات جديدة على المادة 501 المتعلقة بنظام الإنذارات الأكاديمية.',
    type: NotificationType.ACADEMIC,
    date: new Date(Date.now() - 86400000).toISOString(),
    isRead: true,
    targetRole: UserRole.IT_ADMIN
  },
  {
    id: 'notif-3',
    title: 'تنبيه نظام',
    message: 'سيتم إجراء صيانة دورية للخوادم يوم الجمعة القادم من الساعة 2 صباحاً إلى 4 صباحاً.',
    type: NotificationType.SYSTEM,
    date: new Date(Date.now() - 172800000).toISOString(),
    isRead: false
  }
];

export const getBroadcastHistory = (): BroadcastLog[] => {
  const data = localStorage.getItem(STORAGE_KEY_BROADCASTS);
  return data ? JSON.parse(data) : [];
};

export const logBroadcast = (broadcast: BroadcastLog) => {
  const history = getBroadcastHistory();
  const updated = [broadcast, ...history].slice(0, 50);
  localStorage.setItem(STORAGE_KEY_BROADCASTS, JSON.stringify(updated));
};

export const getNotifications = (targetRole?: UserRole, studentId?: string): SystemNotification[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    let rawNotifications: SystemNotification[] = [];
    
    if (!data || data === 'undefined' || data === 'null') {
      rawNotifications = DEFAULT_NOTIFICATIONS;
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
    } else {
      const parsed = JSON.parse(data);
      rawNotifications = Array.isArray(parsed) ? parsed : DEFAULT_NOTIFICATIONS;
    }

    const notifications = rawNotifications;
    // Add dynamic deadline notifications
  const settings = getSystemSettings();
  const now = new Date();
  const regDeadline = new Date(settings.registrationDeadline);
  const payDeadline = new Date(settings.paymentDeadline);
  const diffDays = (date: Date) => Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const regDiff = diffDays(regDeadline);
  const payDiff = diffDays(payDeadline);

  const dynamicNotifs: SystemNotification[] = [];

  if (regDiff > 0 && regDiff <= 7) {
    dynamicNotifs.push({
      id: 'dynamic-reg',
      title: 'اقتراب موعد انتهاء التسجيل',
      message: `باقي ${regDiff} أيام فقط على انتهاء فترة تنزيل المواد للفصل ${settings.currentSemester}.`,
      type: NotificationType.DEADLINE,
      date: new Date().toISOString(),
      isRead: false,
      targetRole: UserRole.STUDENT
    });
  }

  if (payDiff > 0 && payDiff <= 7) {
    dynamicNotifs.push({
      id: 'dynamic-pay',
      title: 'موعد سداد الرسوم',
      message: `نود تذكيركم بأن آخر موعد لسداد الرسوم الدراسية هو بعد ${payDiff} أيام.`,
      type: NotificationType.FINANCE,
      date: new Date().toISOString(),
      isRead: false,
      targetRole: UserRole.STUDENT
    });
  }

  const allNotifs = [...dynamicNotifs, ...notifications];

  if (!data) {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
  }

  // Filter based on target
  return allNotifs.filter(n => {
    const roleMatch = !n.targetRole || n.targetRole === targetRole;
    const studentMatch = !n.targetStudentId || n.targetStudentId === studentId;
    });
  } catch (e) {
    console.error("Error fetching notifications:", e);
    return DEFAULT_NOTIFICATIONS;
  }
};

export const markNotificationRead = (notificationId: string) => {
  const data = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
  if (!data) return;
  const notifications: SystemNotification[] = JSON.parse(data);
  const updated = notifications.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
  localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
};

export const clearAllNotifications = (): void => {
  localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify([]));
};

export const addSystemNotification = (notification: Omit<SystemNotification, 'id' | 'isRead' | 'date'>) => {
  const data = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
  const notifications: SystemNotification[] = data ? JSON.parse(data) : [];
  const newNotification: SystemNotification = {
    ...notification,
    id: Math.random().toString(36).substr(2, 9),
    isRead: false,
    date: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify([newNotification, ...notifications]));
};

export const getCohortLabel = (type: string): string => {
  const map: Record<string, string> = {
    'UNPAID': 'الطلاب المدينون',
    'UNREGISTERED': 'غير المسجلين فصلياً',
    'CRITICAL': 'المتعثرون (إنذارين فأكثر)',
    'EXCELLENT': 'المتميزون (لوحة الشرف)',
    'ALL': 'كافة الطلاب النشطين'
  };
  return map[type] || type;
};
