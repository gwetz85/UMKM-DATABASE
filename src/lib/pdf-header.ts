/**
 * Shared header helper for jsPDF documents without pulling in the heavy jsPDF / autoTable bundle.
 */
export const addTunasBangsaHeader = (doc: any, hasLogo = false) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const textOffset = hasLogo ? 28 : 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235); // Primary Blue
  doc.text('TUNAS BANGSA KEPULAUAN RIAU', margin + textOffset, 17);
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('PENGAJUAN BANTUAN UMKM TAHUN 2026', margin + textOffset, 23);
  
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 34, pageWidth - margin, 34);
  
  doc.setTextColor(0); // Reset text color
  return 38; // Return the next Y position
};
