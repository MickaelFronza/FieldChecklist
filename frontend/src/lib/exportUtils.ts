import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// campos que comecem com = + - @ (ou tab/CR) sao interpretados como formula
// pelo Excel/Sheets ao abrir o CSV ("Formula/CSV Injection") - prefixa com
// aspas simples pra neutralizar, igual a mitigacao recomendada pela OWASP
function neutralizeFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function csvEscape(value: string | number): string {
  const text = neutralizeFormula(String(value));
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const lines = [headers, ...rows].map((row) => row.map(csvEscape).join(';'));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename);
}

export function downloadPdfTable(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const doc = new jsPDF();
  doc.text(title, 14, 16);
  autoTable(doc, { head: [headers], body: rows, startY: 22 });
  doc.save(filename);
}
