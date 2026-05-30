type NotificationType = 'success' | 'error' | 'info';

type Listener = (message: string, type: NotificationType) => void;

let listeners: Listener[] = [];

export const notify = (message: string, type: NotificationType = 'info') => {
  listeners.forEach(listener => listener(message, type));
};

export const subscribe = (listener: Listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

export const notifySuccess = (msg: string) => notify(msg, 'success');
export const notifyError = (msg: string) => notify(msg, 'error');
export const notifyInfo = (msg: string) => notify(msg, 'info');