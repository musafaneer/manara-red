
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getStudents, getDepartments, getSystemSettings } from "./storageService";
import { getFinancialStats } from "./financeService";
import { getCurrentUser } from "./authService";
import { ProgramType } from "../types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const getSmartInsights = async (query: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const user = getCurrentUser();
    const students = getStudents();
    const stats = {
        total: students.length,
        avgGPA: (students.reduce((acc, s) => acc + s.gpa, 0) / (students.length || 1)).toFixed(2),
        atRisk: students.filter(s => s.warningsCount >= 2).length,
        undergrad: students.filter(s => s.program === ProgramType.UNDERGRADUATE).length,
        postgrad: students.filter(s => s.program === ProgramType.POSTGRADUATE).length,
    };
    
    const finance = getFinancialStats();
    const settings = getSystemSettings();

    const systemContext = `
        You are an AI assistant for "Oracle Campus", a high-end Student Information System for ${settings.universityName}.
        Current User Role: ${user?.role}
        
        System Data Overview:
        - Total Students: ${stats.total}
        - Average GPA: ${stats.avgGPA}%
        - Students at Academic Risk (2+ warnings): ${stats.atRisk}
        - Distribution: Undergrad (${stats.undergrad}), Postgrad (${stats.postgrad})
        - Total Collected Fees: $${finance.totalRevenue}
        - Total Outstanding: $${finance.totalOutstanding}
        
        The user is asking a question about this data. Provide a professional, concise, and helpful response in Arabic.
        If they ask for something you don't have enough data for (like specific student names in bulk), guide them on how to find it in the system.
    `;

    const result = await model.generateContent([systemContext, query]);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "عذراً، حدث خطأ أثناء معالجة طلبك الذكي. يرجى المحاولة لاحقاً.";
  }
};
