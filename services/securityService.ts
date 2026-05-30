
import { Student } from '../types';

/**
 * Generates a unique cryptographic hash for a student document.
 * In a real-world scenario, this hash would be stored on a blockchain/DLT.
 */
export async function generateDocumentHash(student: Student, documentType: 'TRANSCRIPT' | 'CERTIFICATE'): Promise<string> {
    const dataString = `${student.id}-${student.name}-${student.gpa}-${documentType}-${new Date().toISOString().split('T')[0]}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Returns a shortened version of the hash for UI display.
 */
export function formatShortHash(hash: string): string {
    if (!hash) return '';
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
}

/**
 * Returns a verification URL that could be used in a QR code.
 */
export function getVerificationUrl(hash: string): string {
    // In a real app, this would point to a public verification portal
    const baseUrl = window.location.origin;
    return `${baseUrl}/verify/${hash}`;
}

/**
 * Formats a QR code URL using a public API.
 */
export function getQrCodeUrl(content: string): string {
    const encodedContent = encodeURIComponent(content);
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedContent}`;
}
