import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DisplayPriceInShillings } from './DisplayPriceInShillings';

const PLUM = [75, 30, 62];
const GOLD = [201, 148, 58];
const MUTED = [125, 78, 64];
const PAGE_HEIGHT_MM = 297;
const BOTTOM_MARGIN_MM = 20;

const formatHourLabel = (hour) => {
  const h = Number(hour) % 24;
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
};

const formatSaleTime = (isoDate) => {
  try {
    return new Date(isoDate).toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
};

const paymentMethodLabel = (method) => {
  if (method === 'equity') return 'Equity';
  if (method === 'split') return 'Split';
  if (method === 'cash') return 'Cash';
  if (method === 'text_forwarded') return 'Text Fwd';
  return method || 'N/A';
};

const exchangeStatusLabel = (status) => {
  if (status === 'requested') return 'Awaiting hair';
  if (status === 'hair_received') return 'Ready to complete';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return status || 'Unknown';
};

// Fetches a proof image and converts it to a JPEG data URL jsPDF can embed.
// Draws through a canvas so any source format (png/webp/jpg) normalizes to
// one jsPDF handles reliably. Returns null on any failure (missing image,
// CORS block, network error) — callers should render a "proof unavailable"
// note instead of failing the whole report over one bad image.
const fetchImageAsDataUrl = (url) =>
  new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: img.naturalWidth, height: img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

// Renders and downloads the End-of-Day PDF for a closed EndOfDay record.
// eod: {
//   date, branch, closedByName,
//   summary: {
//     totalSales, cashSales, equitySales, splitSales, textForwardedSales,
//     walkinSales, onlineSales, walkinCount, onlineCount, transactionCount,
//     deliveryRevenue, productRevenue,
//     hourlyBreakdown: [{ hour, total, cashTotal, count }],
//     cashierBreakdown: [{ cashierName, saleCount, total }],
//     transactions: [{ saleNumber, saleDate, saleSource, cashierName, itemsSummary, paymentMethod, total, deliveryCharge, proofImageUrls, forwardedTexts }],
//     exchangeCount, exchanges: [{ exchangeNumber, requestedAt, sourceNumber, customerName,
//       returnedItemSummary, replacementItemSummary, priceDifference, status, requestedByName }]
//   }
// }
export const downloadEndOfDayReport = async (eod) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 18;
  const right = pageWidth - 18;
  const summary = eod.summary || {};
  const transactions = summary.transactions || [];
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
    doc.text(eod.branch || 'Main Store', left, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('END OF DAY REPORT', right, 20, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(eod.date || '', right, 27, { align: 'right' });
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
  doc.text(`Closed by: ${eod.closedByName || 'N/A'}`, left, y + 7);
  doc.text(`Transactions: ${summary.transactionCount || 0}`, right, y + 7, { align: 'right' });
  y += 20;

  // --- Hourly cash timeline ---
  drawSectionTitle('Hourly timeline');
  autoTable(doc, {
    startY: y,
    head: [['Hour', 'Transactions', 'Cash received', 'Total sales']],
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
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left, right: 18 },
  });
  y = (doc.lastAutoTable?.finalY || y) + 12;

  // --- Cashier breakdown: who made what ---
  if ((summary.cashierBreakdown || []).length > 0) {
    ensureSpace(20);
    drawSectionTitle('Sales by cashier');
    autoTable(doc, {
      startY: y,
      head: [['Cashier', 'Sales made', 'Total sold']],
      body: (summary.cashierBreakdown || []).map((row) => [
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

  // --- Per-transaction detail ---
  // Proof images/text are deliberately NOT rendered inline in this table —
  // a screenshot shrunk to fit a table row is too small to actually verify
  // anything. They get their own full-size sections below instead (Equity
  // confirmations as legible images, Text Forwarded as full message text);
  // this table just flags which sales have proof to look for there.
  if (transactions.length > 0) {
    ensureSpace(20);
    drawSectionTitle('Transaction detail');

    // Pre-fetch every proof image up front (one row can carry more than one,
    // for a split sale) so the Equity confirmations section below can render
    // synchronously.
    const proofByUrl = new Map();
    const allUrls = transactions.flatMap((t) => t.proofImageUrls || []);
    await Promise.all(
      [...new Set(allUrls)].map(async (url) => {
        proofByUrl.set(url, await fetchImageAsDataUrl(url));
      })
    );

    autoTable(doc, {
      startY: y,
      head: [['Time', 'Sale #', 'Source', 'Cashier', 'Items', 'Payment', 'Amount', 'Verified']],
      body: transactions.map((t) => [
        formatSaleTime(t.saleDate),
        t.saleNumber,
        t.saleSource === 'online' ? 'Online' : 'Walk-in',
        t.cashierName || 'N/A',
        t.itemsSummary || '',
        paymentMethodLabel(t.paymentMethod),
        DisplayPriceInShillings(t.total || 0),
        (t.proofImageUrls || []).length > 0 ? 'Photo' : (t.forwardedTexts || []).length > 0 ? 'Text' : '',
      ]),
      theme: 'striped',
      headStyles: { fillColor: PLUM, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 7.5, textColor: [26, 15, 20], valign: 'middle' },
      alternateRowStyles: { fillColor: [250, 248, 245] },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 26 },
        2: { cellWidth: 16 },
        3: { cellWidth: 22 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 16 },
        6: { cellWidth: 22, halign: 'right' },
        7: { cellWidth: 16, halign: 'center' },
      },
      margin: { left, right: 18 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 12;

    const missingProofCount = transactions.filter(
      (t) => (t.proofImageUrls || []).length > 0 && !(t.proofImageUrls || []).some((u) => proofByUrl.get(u))
    ).length;
    if (missingProofCount > 0) {
      ensureSpace(8);
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(`${missingProofCount} proof image(s) could not be loaded for this report.`, left, y);
      y += 10;
    }

    // --- Equity payment confirmation photos, at a legible size. This is
    // also the ONLY surviving copy of these once Cloudinary auto-deletes the
    // source image ~3.5 days after this close (see EndOfDay.proofDeletionDueAt)
    // — so unlike the single-sale receipt PDF, shrinking or omitting these
    // isn't an option here; this report is the archival copy. ---
    const IMG_MAX_WIDTH_MM = 45;
    const IMG_MAX_HEIGHT_MM = 65;
    const equityEntries = transactions
      .filter((t) => (t.proofImageUrls || []).length > 0)
      .map((t) => ({ saleNumber: t.saleNumber, total: t.total, url: t.proofImageUrls[0] }));
    if (equityEntries.length > 0) {
      ensureSpace(14);
      drawSectionTitle('Equity payment confirmations');
      equityEntries.forEach(({ saleNumber, total, url }) => {
        const proof = proofByUrl.get(url);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        if (!proof) {
          ensureSpace(10);
          doc.setTextColor(...PLUM);
          doc.text(saleNumber, left, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...MUTED);
          doc.text(`(photo unavailable) · ${DisplayPriceInShillings(total)}`, left + 30, y);
          y += 10;
          return;
        }
        const aspectRatio = proof.width / proof.height;
        let w = IMG_MAX_WIDTH_MM;
        let h = w / aspectRatio;
        if (h > IMG_MAX_HEIGHT_MM) {
          h = IMG_MAX_HEIGHT_MM;
          w = h * aspectRatio;
        }
        ensureSpace(h + 12);
        doc.setTextColor(...PLUM);
        doc.text(`${saleNumber} · ${DisplayPriceInShillings(total)}`, left, y);
        y += 4;
        try {
          doc.addImage(proof.dataUrl, 'JPEG', left, y, w, h);
        } catch {
          // Corrupt/unsupported image data — skip rather than break the report.
        }
        y += h + 8;
      });
    }

    // --- Text Forwarded confirmation messages, in full (can't thumbnail text) ---
    const forwardedEntries = transactions
      .filter((t) => (t.forwardedTexts || []).length > 0)
      .flatMap((t) => (t.forwardedTexts || []).map((text) => ({ saleNumber: t.saleNumber, text })));
    if (forwardedEntries.length > 0) {
      ensureSpace(14);
      drawSectionTitle('Text Forwarded confirmations');
      forwardedEntries.forEach(({ saleNumber, text }) => {
        const wrapped = doc.splitTextToSize(text, right - left - 4);
        ensureSpace(wrapped.length * 4 + 10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...PLUM);
        doc.text(saleNumber, left, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(26, 15, 20);
        doc.text(wrapped, left, y);
        y += wrapped.length * 4 + 6;
      });
    }
  }

  // --- Returns & exchanges requested this trading day ---
  const exchanges = summary.exchanges || [];
  if (exchanges.length > 0) {
    ensureSpace(20);
    drawSectionTitle(`Returns & exchanges (${exchanges.length})`);
    autoTable(doc, {
      startY: y,
      head: [['Exchange #', 'Ref sale/order', 'Customer', 'Returned', 'Replacement', 'Owed', 'Status', 'By']],
      body: exchanges.map((ex) => [
        ex.exchangeNumber,
        ex.sourceNumber || '',
        ex.customerName || 'N/A',
        ex.returnedItemSummary || '',
        ex.replacementItemSummary || '',
        ex.priceDifference > 0 ? DisplayPriceInShillings(ex.priceDifference) : '—',
        exchangeStatusLabel(ex.status),
        ex.requestedByName || '',
      ]),
      theme: 'striped',
      headStyles: { fillColor: PLUM, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 7.5, textColor: [26, 15, 20] },
      alternateRowStyles: { fillColor: [250, 248, 245] },
      columnStyles: { 5: { halign: 'right' } },
      margin: { left, right: 18 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 12;
  }

  // --- Conclusion: payment totals + grand total ---
  ensureSpace(60);
  drawSectionTitle('Day summary');

  const rows = [
    ['Cash received', summary.cashSales || 0],
    ['Equity sales', summary.equitySales || 0],
    ['Split sales', summary.splitSales || 0],
    ['Text Forwarded sales', summary.textForwardedSales || 0],
    ['Walk-in sales', summary.walkinSales || 0],
    ['Online sales', summary.onlineSales || 0],
  ];
  doc.setFontSize(9);
  rows.forEach(([label, value]) => {
    doc.setTextColor(...MUTED);
    doc.text(label, right - 65, y, { align: 'right' });
    doc.setTextColor(26, 15, 20);
    doc.text(DisplayPriceInShillings(value), right - 4, y, { align: 'right' });
    y += 7;
  });

  // Delivery is fulfilled by contracted riders, not the shop — broken out
  // separately from the payment-method rows above so it reads as "not shop
  // revenue" rather than just another payment channel.
  if ((summary.deliveryRevenue || 0) > 0) {
    y += 3;
    doc.setDrawColor(230, 220, 210);
    doc.line(right - 92, y, right, y);
    y += 7;
    [
      ['Product sales', summary.productRevenue || 0],
      ['Delivery charges (rider)', summary.deliveryRevenue || 0],
    ].forEach(([label, value]) => {
      doc.setTextColor(...MUTED);
      doc.text(label, right - 65, y, { align: 'right' });
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
  doc.text(DisplayPriceInShillings(summary.totalSales || 0), right - 4, y + 9, { align: 'right' });
  y += 27;

  ensureSpace(15);
  doc.setDrawColor(...GOLD);
  doc.line(left, y, right, y);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Nawiri Hair — internal end-of-day reconciliation record.', pageWidth / 2, y + 9, { align: 'center' });

  // Number every page, now that total page count is known.
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${i} of ${pageCount}`, right, PAGE_HEIGHT_MM - 10, { align: 'right' });
  }

  doc.save(`nawiri-hair-eod-${eod.date || 'report'}-${(eod.branch || 'branch').replace(/\s+/g, '-').toLowerCase()}.pdf`);
};

export default downloadEndOfDayReport;
