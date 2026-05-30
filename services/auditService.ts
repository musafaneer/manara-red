
import { AuditLog } from '../types';

const STORAGE_KEY_AUDIT = 'oracle_campus_audit_logs';

export const getAuditLogs = (): AuditLog[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_AUDIT);
    if (!data || data === 'undefined' || data === 'null') return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Error fetching audit logs:", e);
    return [];
  }
};

export const logAction = (action: string, details: string, type: 'info' | 'warning' | 'danger' = 'info', userName?: string) => {
  const logs = getAuditLogs();
  
  const newLog: AuditLog = {
    id: Date.now().toString(),
    action,
    details,
    timestamp: new Date().toISOString(),
    user: userName || 'النظام',
    type
  };

  // Keep only last 500 logs to prevent storage overflow
  const updatedLogs = [newLog, ...logs].slice(0, 500);
  
  localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(updatedLogs));
  return newLog;
};

export const clearAuditLogs = () => {
    localStorage.removeItem(STORAGE_KEY_AUDIT);
};
