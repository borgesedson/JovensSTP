import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

/**
 * Helper to convert image URL to base64 for jsPDF
 */
const getImageDataUrl = async (url) => {
    if (!url) return null;

    // Add cache-buster to URL
    const busterUrl = url.includes('?')
        ? `${url}&cb=${Date.now()}`
        : `${url}?cb=${Date.now()}`;

    try {
        const response = await fetch(busterUrl, {
            mode: 'cors',
            credentials: 'omit'
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn('📸 Profile photo fetch failed:', e.message);
        return new Promise((resolve, reject) => {
            const img = new Image();
            // Setup crossOrigin BEFORE src
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = () => reject(new Error('Image fallback load failed'));
            img.src = busterUrl;
        });
    }
};

/**
 * Generates a professional PDF resume for a user with JovensSTP branding and QR Code
 * @param {Object} userData - The user data from Firestore/Auth
 */
export const generateResume = async (userData) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // --- Configuration & Colors ---
    const colors = {
        primary: '#16a34a',      // JovensSTP Green
        sidebar: '#f8fafc',      // Light Slate (Sidebar BG)
        text: {
            dark: '#0f172a',     // Slate-900 (Main text)
            medium: '#475569',   // Slate-600 (Subtitles)
            light: '#94a3b8'     // Slate-400 (Metadata)
        },
        accent: '#059669'        // Emerald-600
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const sidebarWidth = 65;
    const margin = 12;
    const mainContentX = sidebarWidth + margin + 4;
    const mainWidth = pageWidth - sidebarWidth - (margin * 2) - 10;
    const lineHeight = 6.8;

    // --- Sidebar Background ---
    doc.setFillColor(colors.sidebar);
    doc.rect(0, 0, sidebarWidth, pageHeight, 'F');

    // --- Sidebar Content ---
    let sidebarY = 22;

    // Profile Image / Placeholder Circle
    const photoRadius = 18;
    const photoCenterX = sidebarWidth / 2;
    const photoCenterY = sidebarY + photoRadius;

    // Always draw border
    doc.setDrawColor(colors.primary);
    doc.setLineWidth(0.8);
    doc.circle(photoCenterX, photoCenterY, photoRadius, 'S');

    if (userData?.photoURL) {
        try {
            const imageData = await getImageDataUrl(userData.photoURL);

            // Mask/Clip for circular image
            doc.saveGraphicsState();
            doc.circle(photoCenterX, photoCenterY, photoRadius - 0.5, 'F');
            doc.clip();

            const size = photoRadius * 2;
            doc.addImage(imageData, 'JPEG', photoCenterX - photoRadius, photoCenterY - photoRadius, size, size, undefined, 'FAST');
            doc.restoreGraphicsState();
        } catch (err) {
            console.error('PDF Photo load error:', err);
            doc.setFontSize(22);
            doc.setTextColor(colors.primary);
            doc.setFont('helvetica', 'bold');
            const initials = (userData?.displayName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2);
            doc.text(initials, photoCenterX, photoCenterY + 4, { align: 'center' });
        }
    } else {
        // Fallback Initials
        doc.setFontSize(22);
        doc.setTextColor(colors.primary);
        doc.setFont('helvetica', 'bold');
        const initials = (userData?.displayName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2);
        doc.text(initials, photoCenterX, photoCenterY + 4, { align: 'center' });
    }

    sidebarY += (photoRadius * 2) + 18;

    // Contact Info Section
    doc.setFontSize(11);
    doc.setTextColor(colors.text.dark);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTATO', margin, sidebarY);
    sidebarY += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.text.medium);

    const contactItems = [
        { label: '📍', value: userData?.location || 'São Tomé, STP' },
        { label: '📧', value: userData?.email || 'N/A' },
        { label: '📱', value: userData?.phone || 'N/A' }
    ];

    contactItems.forEach(item => {
        const splitVal = doc.splitTextToSize(item.value, sidebarWidth - (margin * 2));
        doc.text(splitVal, margin, sidebarY);
        sidebarY += (splitVal.length * 5) + 4;
    });

    sidebarY += 12;

    // Skills Section
    const skills = Array.isArray(userData?.skills)
        ? userData.skills
        : (typeof userData?.skills === 'string' ? userData.skills.split(',').map(s => s.trim()) : []);

    if (skills.filter(Boolean).length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(colors.text.dark);
        doc.setFont('helvetica', 'bold');
        doc.text('COMPETÊNCIAS', margin, sidebarY);
        sidebarY += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.text.medium);

        skills.forEach(skill => {
            if (skill) {
                doc.text(`• ${skill}`, margin, sidebarY);
                sidebarY += 7;
            }
        });
    }

    // QR Code for JovensSTP Profile
    try {
        const profileUrl = `https://jovensstp.com/profile/${userData?.uid || 'guest'}`;
        const qrDataUrl = await QRCode.toDataURL(profileUrl, { margin: 1, scale: 4, color: { dark: '#000000', light: '#f8fafc' } });

        const qrSize = 35;
        const qrX = (sidebarWidth - qrSize) / 2;
        const qrY = pageHeight - qrSize - 35;

        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

        doc.setFontSize(7.5);
        doc.setTextColor(colors.text.medium);
        doc.setFont('helvetica', 'bold');
        doc.text('ESCANEIE PERFIL', sidebarWidth / 2, qrY + qrSize + 6, { align: 'center' });
        doc.text('JOVENSSTP', sidebarWidth / 2, qrY + qrSize + 10, { align: 'center' });
    } catch (err) {
        console.error('QR Code error:', err);
    }

    // --- Main Content ---
    let mainY = 24;

    // Name
    doc.setFontSize(28);
    doc.setTextColor(colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(userData?.displayName?.toUpperCase() || 'USUÁRIO JOVENSSTP', mainContentX, mainY);
    mainY += 14;

    // Headline
    doc.setFontSize(16);
    doc.setTextColor(colors.text.medium);
    doc.setFont('helvetica', 'normal');
    doc.text(userData?.headline || 'Profissional em JovensSTP', mainContentX, mainY);
    mainY += 22;

    // Summary Section
    if (userData?.bio) {
        // Pagination check for Bio
        if (mainY > pageHeight - 50) {
            doc.addPage();
            mainY = 25;
        }

        doc.setFontSize(13);
        doc.setTextColor(colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMO PROFISSIONAL', mainContentX, mainY);
        mainY += 7;

        doc.setDrawColor(colors.primary);
        doc.setLineWidth(0.5);
        doc.line(mainContentX, mainY, mainContentX + 40, mainY);
        mainY += 10;

        doc.setFontSize(11);
        doc.setTextColor(colors.text.dark);
        doc.setFont('helvetica', 'normal');
        const splitBio = doc.splitTextToSize(userData.bio, mainWidth);
        doc.text(splitBio, mainContentX, mainY, { lineHeightFactor: 1.5 });
        mainY += (splitBio.length * lineHeight) + 14;
    }

    // Experience Section
    if (Array.isArray(userData?.experience) && userData.experience.length > 0) {
        if (mainY > pageHeight - 30) { doc.addPage(); mainY = 25; }
        doc.setFontSize(13);
        doc.setTextColor(colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.text('EXPERIÊNCIA PROFISSIONAL', mainContentX, mainY);
        mainY += 7;

        doc.setDrawColor(colors.primary);
        doc.line(mainContentX, mainY, mainContentX + 40, mainY);
        mainY += 12;

        userData.experience.forEach((ex) => {
            if (mainY > pageHeight - 40) {
                doc.addPage();
                mainY = 25;
            }

            // ROLE
            doc.setFontSize(12);
            doc.setTextColor(colors.text.dark);
            doc.setFont('helvetica', 'bold');
            const splitRole = doc.splitTextToSize(ex.role, mainWidth);
            doc.text(splitRole, mainContentX, mainY);
            mainY += (splitRole.length * 6);

            // COMPANY (Differentiated, below role to prevent overlap)
            doc.setFontSize(11);
            doc.setTextColor(colors.primary);
            doc.setFont('helvetica', 'normal');
            doc.text(ex.company, mainContentX, mainY);
            mainY += 6;

            // DATES
            doc.setFontSize(10);
            doc.setTextColor(colors.text.light);
            doc.setFont('helvetica', 'italic');
            const dateStr = `${ex.startYear || ''} - ${ex.endYear || 'Presente'}`;
            doc.text(dateStr, mainContentX, mainY);
            mainY += 8;

            // DESCRIPTION
            if (ex.description) {
                doc.setFontSize(11);
                doc.setTextColor(colors.text.medium);
                doc.setFont('helvetica', 'normal');
                const splitDesc = doc.splitTextToSize(ex.description, mainWidth);
                doc.text(splitDesc, mainContentX, mainY, { lineHeightFactor: 1.4 });
                mainY += (splitDesc.length * 6.5);
            }
            mainY += 12;
        });
    }

    // Education Section
    if (Array.isArray(userData?.education) && userData.education.length > 0) {
        if (mainY > pageHeight - 30) { doc.addPage(); mainY = 25; }
        doc.setFontSize(13);
        doc.setTextColor(colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.text('EDUCAÇÃO', mainContentX, mainY);
        mainY += 7;

        doc.setDrawColor(colors.primary);
        doc.line(mainContentX, mainY, mainContentX + 40, mainY);
        mainY += 12;

        userData.education.forEach((ed) => {
            if (mainY > pageHeight - 30) {
                doc.addPage();
                mainY = 25;
            }

            // DEGREE
            doc.setFontSize(12);
            doc.setTextColor(colors.text.dark);
            doc.setFont('helvetica', 'bold');
            const splitDegree = doc.splitTextToSize(ed.degree, mainWidth);
            doc.text(splitDegree, mainContentX, mainY);
            mainY += (splitDegree.length * 6);

            // INSTITUTION
            doc.setFontSize(11);
            doc.setTextColor(colors.text.medium);
            doc.setFont('helvetica', 'normal');
            doc.text(ed.institution, mainContentX, mainY);
            mainY += 6;

            // DATES
            doc.setFontSize(10);
            doc.setTextColor(colors.text.light);
            doc.setFont('helvetica', 'italic');
            const dateStr = `${ed.startYear || ''} - ${ed.endYear || 'Presente'}`;
            doc.text(dateStr, mainContentX, mainY);
            mainY += 14;
        });
    }

    // --- Elegant Footer Branding ---
    const footerY = pageHeight - 12;
    doc.setFontSize(9);
    doc.setTextColor(colors.text.light);
    doc.setFont('helvetica', 'bold');
    doc.text('Jovens', (sidebarWidth / 2) - 4, footerY, { align: 'center' });
    doc.setTextColor(colors.primary);
    doc.text('STP', (sidebarWidth / 2) + 6, footerY, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(colors.text.light);
    doc.setFont('helvetica', 'italic');
    doc.text('Gerado automaticamente via JovensSTP.', pageWidth / 2 + (sidebarWidth / 2), footerY, { align: 'center' });

    // Download the PDF
    const name = userData?.displayName || 'Usuario';
    const fileName = `CV_JovensSTP_${name.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
};
