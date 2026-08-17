import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DisplayPriceInShillings } from './DisplayPriceInShillings';

const PLUM = [75, 30, 62];
const GOLD = [201, 148, 58];
const MUTED = [125, 78, 64];

const formatHourLabel = (hour) => {
  const h = Number(hour) % 24;
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
};

// Renders and downloads the End-of-Day PDF for a closed EndOfDay record.
// eod: { date, branch, closedByName, summary: { totalSales, cashSales, equitySales, splitSales, transactionCount, hourlyBreakdown } }
export const downloadEndOfDayReport = (eod) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 18;
  const right = pageWidth - 18;
  const summary = eod.summary || {};
  let y = 20;

  doc.setFillColor(...PLUM);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text('NAWIRI HAIR', left, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(240, 214, 232);
  doc.text(eod.branch || 'Main Store', left, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('END OF DAY REPORT', right, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(eod.date || '', right, y + 7, { align: 'right' });

  y = 56;
  doc.setTextColor(...PLUM);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SUMMARY', left, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Closed by: ${eod.closedByName || 'N/A'}`, left, y + 7);
  doc.text(`Transactions: ${summary.transactionCount || 0}`, right, y + 7, { align: 'right' });

  y += 20;

  autoTable(doc, {
    startY: y,
    head: [['Hour', 'Transactions', 'Cash sales', 'Total sales']],
    body: (summary.hourlyBreakdown || []).map((row) => [
      formatHourLabel(row.hour),
      String(row.count || 0),
      DisplayPriceInShillings(row.cashTotal || 0),
      DisplayPriceInShillings(row.total || 0),
    ]),
    theme: 'striped',
    headStyles: { fillColor: PLUM, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [26, 15, 20] },
    alternateRowStyles: { fillColor: [250, 248, 245] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { left, right: 18 },
  });

  y = (doc.lastAutoTable?.finalY || y) + 12;

  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  const rows = [
    ['Cash sales', summary.cashSales || 0],
    ['Equity sales', summary.equitySales || 0],
    ['Split sales', summary.splitSales || 0],
  ];
  doc.setFontSize(9);
  rows.forEach(([label, value]) => {
    doc.setTextColor(...MUTED);
    doc.text(label, right - 65, y, { align: 'right' });
    doc.setTextColor(26, 15, 20);
    doc.text(DisplayPriceInShillings(value), right - 4, y, { align: 'right' });
    y += 7;
  });

  doc.setFillColor(...PLUM);
  doc.roundedRect(right - 92, y, 92, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', right - 65, y + 9, { align: 'right' });
  doc.text(DisplayPriceInShillings(summary.totalSales || 0), right - 4, y + 9, { align: 'right' });
  y += 27;

  doc.setDrawColor(...GOLD);
  doc.line(left, y, right, y);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Nawiri Hair — internal end-of-day reconciliation record.', pageWidth / 2, y + 9, { align: 'center' });

  doc.save(`nawiri-hair-eod-${eod.date || 'report'}-${(eod.branch || 'branch').replace(/\s+/g, '-').toLowerCase()}.pdf`);
};

export default downloadEndOfDayReport;
