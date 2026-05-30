import React from 'react';
import { AuthUser } from '../../types';
import { Language } from '../../services/i18nService';
import DossierContent from '../DossierContent';

interface StudentDashboardProps {
    language: Language;
    currentUser: AuthUser;
    setActiveTab?: (tab: string) => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ language, currentUser, setActiveTab }) => {
    return (
        <DossierContent 
            language={language} 
            student={currentUser} 
            setActiveTab={setActiveTab}
        />
    );
};

export default StudentDashboard;


