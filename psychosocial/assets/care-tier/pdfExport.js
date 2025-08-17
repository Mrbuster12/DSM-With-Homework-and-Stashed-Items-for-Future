// pdfExport.js
import { jsPDF } from "jspdf";
export function exportDAPasPDF(text, filename="DAP_Note"){
  const doc = new jsPDF();
  const lines = doc.splitTextToSize(text, 180);
  lines.forEach((ln, i)=> doc.text(ln, 14, 18 + i*8));
  doc.save(filename + ".pdf");
}
