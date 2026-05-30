
import { RoleCategory, PermissionScope } from '../types';
import { Shield, Globe, Building2, User } from 'lucide-react';
import React from 'react';

export const getRoleCategoryLabel = (category: RoleCategory): string => {
  const labels: Record<RoleCategory, string> = {
    [RoleCategory.ADMINISTRATIVE]: 'إداري',
    [RoleCategory.ACADEMIC]: 'أكاديمي',
    [RoleCategory.FINANCIAL]: 'مالي',
    [RoleCategory.STUDENT]: 'طالب',
    [RoleCategory.GRADUATE]: 'دراسات عليا',
    [RoleCategory.SUPPORT]: 'دعم فني'
  };
  return labels[category] || category;
};

export const getRoleCategoryColor = (category: RoleCategory): string => {
  const colors: Record<RoleCategory, string> = {
    [RoleCategory.ADMINISTRATIVE]: 'bg-slate-500 text-slate-500',
    [RoleCategory.ACADEMIC]: 'bg-blue-500 text-blue-500',
    [RoleCategory.FINANCIAL]: 'bg-emerald-500 text-emerald-500',
    [RoleCategory.STUDENT]: 'bg-indigo-500 text-indigo-500',
    [RoleCategory.GRADUATE]: 'bg-purple-500 text-purple-500',
    [RoleCategory.SUPPORT]: 'bg-orange-500 text-orange-500'
  };
  return colors[category] || 'bg-slate-500';
};

export const getScopeLabel = (scope?: PermissionScope): string => {
  if (!scope) return 'غير محدد';
  const labels: Record<PermissionScope, string> = {
    [PermissionScope.GLOBAL]: 'جامعي عام',
    [PermissionScope.DEPARTMENT]: 'داخل القسم',
    [PermissionScope.OWN]: 'خاص بالمستخدم'
  };
  return labels[scope];
};

export const getScopeIcon = (scope?: PermissionScope) => {
  switch (scope) {
    case PermissionScope.GLOBAL: return Globe;
    case PermissionScope.DEPARTMENT: return Building2;
    case PermissionScope.OWN: return User;
    default: return Shield;
  }
};
