import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DisplayPriceInShillings } from './DisplayPriceInShillings';

const PLUM = [75, 30, 62];
const GOLD = [201, 148, 58];
const MUTED = [125, 78, 64];
const PAGE_HEIGHT_MM = 297;
const BOTTOM_MARGIN_MM = 20;

// Renders and downloads a weekly/monthly roll-up PDF, aggregated from
// already-closed daily EOD records (GET /api/pos/eod/range-summary).
// report: {
//   startDate, endDate, branch, daysClosed, daysInRange, missingDates,
//   totals: { totalSales, cashSales, equitySales, splitSales, textForwardedSales,
//     walkinSales, onlineSales, walkinCount, onlineCount, transactionCount, exchangeCount,
//     deliveryRevenue, productRevenue },
//   paymentTotalsByMethod: { cash, equity, split, text_forwarded },
//   dailyTrend: [{ date, total, walkinSales, onlineSales, transactionCount, deliveryRevenue, productRevenue }],
//   cashierBreakdown: [{ cashierName, saleCount, total }]
// }
export const downloadRangeReport = (report, { label = 'Report' } = {}) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 18;
  const right = pageWidth - 18;
  let y = 20;

  const drawHeader = () => {
    doc.setFillColor(...PLUM);
    doc.rect(0, 0, pageWidth, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(21);
    doc.text('NAWIRI HAIR', left, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(240, 214, 232);
    doc.text(report.branch || 'Main Store', left, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(`${label.toUpperCase()} REPORT`, right, 20, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${report.startDate} to ${report.endDate}`, right, 27, { align: 'right' });
  };

  const ensureSpace = (neededMm) => {
    if (y + neededMm > PAGE_HEIGHT_MM - BOTTOM_MARGIN_MM) {
      doc.addPage();
      y = 20;
    }
  };

  const drawSectionTitle = (title) => {
    ensureSpace(14);
    doc.setTextColor(...PLUM);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), left, y);
    y += 7;
  };

  drawHeader();

  y = 56;
  doc.setTextColor(...PLUM);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SUMMARY', left, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Days closed: ${report.daysClosed} of ${report.daysInRange}`, left, y + 7);
  doc.text(`Transactions: ${report.totals.transactionCount || 0}`, right, y + 7, { align: 'right' });
  y += 16;

  if ((report.missingDates || []).length > 0) {
    doc.setTextColor(180, 90, 30);
    doc.setFontSize(8);
    const missingText = `Not closed (excluded from totals): ${report.missingDates.join(', ')}`;
    const wrapped = doc.splitTextToSize(missingText, right - left);
    doc.text(wrapped, left, y);
    y += wrapped.length * 4 + 6;
  }

  // --- Daily trend ---
  if ((report.dailyTrend || []).length > 0) {
    drawSectionTitle('Daily trend');
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Walk-in', 'Online', 'Transactions', 'Total sales']],
      body: report.dailyTrend.map((d) => [
        d.date,
        DisplayPriceInShillings(d.walkinSales || 0),
        DisplayPriceInShillings(d.onlineSales || 0),
        String(d.transactionCount || 0),
        DisplayPriceInShillings(d.total || 0),
      ]),
      theme: 'striped',
      headStyles: { fillColor: PLUM, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [26, 15, 20] },
      alternateRowStyles: { fillColor: [250, 248, 245] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      margin: { left, right: 18 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 12;
  }

  // --- Cashier breakdown ---
  if ((report.cashierBreakdown || []).length > 0) {
    ensureSpace(20);
    drawSectionTitle('Sales by cashier');
    autoTable(doc, {
      startY: y,
      head: [['Cashier', 'Sales made', 'Total sold']],
      body: report.cashierBreakdown.map((row) => [
        row.cashierName || 'Unknown',
        String(row.saleCount || 0),
        DisplayPriceInShillings(row.total || 0),
      ]),
      theme: 'striped',
      headStyles: { fillColor: PLUM, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [26, 15, 20] },
      alternateRowStyles: { fillColor: [250, 248, 245] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left, right: 18 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 12;
  }

  // --- Conclusion: payment + source totals + grand total ---
  ensureSpace(80);
  drawSectionTitle('Period summary');

  const rows = [
    ['Cash received', report.totals.cashSales || 0],
    ['Equity sales', report.totals.equitySales || 0],
    ['Split sales', report.totals.splitSales || 0],
    ['Text Forwarded sales', report.totals.textForwardedSales || 0],
    ['Walk-in sales', report.totals.walkinSales || 0],
    ['Online sales', report.totals.onlineSales || 0],
  ];
  doc.setFontSize(9);
  rows.forEach(([rowLabel, value]) => {
    doc.setTextColor(...MUTED);
    doc.text(rowLabel, right - 65, y, { align: 'right' });
    doc.setTextColor(26, 15, 20);
    doc.text(DisplayPriceInShillings(value), right - 4, y, { align: 'right' });
    y += 7;
  });

  // Delivery is fulfilled by contracted riders, not the shop — broken out
  // separately from the payment-method rows above so it reads as "not shop
  // revenue" rather than just another payment channel.
  if ((report.totals.deliveryRevenue || 0) > 0) {
    y += 3;
    doc.setDrawColor(230, 220, 210);
    doc.line(right - 92, y, right, y);
    y += 7;
    [
      ['Product sales', report.totals.productRevenue || 0],
      ['Delivery charges (rider)', report.totals.deliveryRevenue || 0],
    ].forEach(([rowLabel, value]) => {
      doc.setTextColor(...MUTED);
      doc.text(rowLabel, right - 65, y, { align: 'right' });
      doc.setTextColor(26, 15, 20);
      doc.text(DisplayPriceInShillings(value), right - 4, y, { align: 'right' });
      y += 7;
    });
  }

  ensureSpace(30);
  doc.setFillColor(...PLUM);
  doc.roundedRect(right - 92, y, 92, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', right - 65, y + 9, { align: 'right' });
  doc.text(DisplayPriceInShillings(report.totals.totalSales || 0), right - 4, y + 9, { align: 'right' });
  y += 27;

  ensureSpace(15);
  doc.setDrawColor(...GOLD);
  doc.line(left, y, right, y);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Nawiri Hair — internal reconciliation record, rolled up from closed daily reports.', pageWidth / 2, y + 9, { align: 'center' });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${i} of ${pageCount}`, right, PAGE_HEIGHT_MM - 10, { align: 'right' });
  }

  doc.save(`nawiri-hair-${label.toLowerCase()}-${report.startDate}-to-${report.endDate}.pdf`);
};

export default downloadRangeReport;
