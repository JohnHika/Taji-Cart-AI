import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { DisplayPriceInShillings } from './DisplayPriceInShillings';

const PLUM = [75, 30, 62];
const GOLD = [201, 148, 58];
const MUTED = [125, 78, 64];
const PAGE_HEIGHT_MM = 297;
const BOTTOM_MARGIN_MM = 20;
const LEFT_MARGIN = 18;

const toArgb = (rgb) => 'FF' + rgb.map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('');

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

// --- Shared PDF layout plumbing, used by both the Summary and Detailed reports ---

// yRef is a mutable ref (not a plain variable) so ensureSpace/drawSectionTitle
// can be shared helpers instead of being redefined inline in every report —
// both formats, and drawDaySummarySection below, all read/write the same ref.
const createLayout = (doc) => {
  const yRef = { v: 20 };
  const ensureSpace = (neededMm) => {
    if (yRef.v + neededMm > PAGE_HEIGHT_MM - BOTTOM_MARGIN_MM) {
      doc.addPage();
      yRef.v = 20;
    }
  };
  const drawSectionTitle = (left, title) => {
    ensureSpace(14);
    doc.setTextColor(...PLUM);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), left, yRef.v);
    yRef.v += 7;
  };
  return { yRef, ensureSpace, drawSectionTitle };
};

const drawHeader = (doc, { pageWidth, left, right, eod, subtitle }) => {
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
  doc.text(subtitle, right, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(eod.date || '', right, 27, { align: 'right' });
};

// Payment-method totals + grand total — the closing block every format ends
// on, extracted once so the Summary and Detailed PDFs don't duplicate it.
const drawDaySummarySection = (doc, layout, { left, right, pageWidth, summary }) => {
  const { yRef, ensureSpace, drawSectionTitle } = layout;
  ensureSpace(60);
  drawSectionTitle(left, 'Day summary');

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
    doc.text(label, right - 65, yRef.v, { align: 'right' });
    doc.setTextColor(26, 15, 20);
    doc.text(DisplayPriceInShillings(value), right - 4, yRef.v, { align: 'right' });
    yRef.v += 7;
  });

  // Delivery is fulfilled by contracted riders, not the shop — broken out
  // separately from the payment-method rows above so it reads as "not shop
  // revenue" rather than just another payment channel.
  if ((summary.deliveryRevenue || 0) > 0) {
    yRef.v += 3;
    doc.setDrawColor(230, 220, 210);
    doc.line(right - 92, yRef.v, right, yRef.v);
    yRef.v += 7;
    [
      ['Product sales', summary.productRevenue || 0],
      ['Delivery charges (rider)', summary.deliveryRevenue || 0],
    ].forEach(([label, value]) => {
      doc.setTextColor(...MUTED);
      doc.text(label, right - 65, yRef.v, { align: 'right' });
      doc.setTextColor(26, 15, 20);
      doc.text(DisplayPriceInShillings(value), right - 4, yRef.v, { align: 'right' });
      yRef.v += 7;
    });
  }

  // Delivery charges pass straight through to contracted riders — they're
  // never the shop's money, so the headline total excludes them even though
  // every payment-method row above (Cash received, Equity sales, etc.)
  // includes it. Falls back to totalSales only for a pre-productRevenue
  // record that somehow slipped past the backfill in GET /eod/:date.
  const shopTotal = summary.productRevenue != null ? summary.productRevenue : (summary.totalSales || 0);

  ensureSpace(30);
  doc.setFillColor(...PLUM);
  doc.roundedRect(right - 92, yRef.v, 92, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  // "SHOP TOTAL" is longer than the old "TOTAL" label, so its right edge
  // sits further right than before (right-55, not right-65) to keep the
  // amount from crowding it — still well clear of the amount's own anchor.
  doc.text('SHOP TOTAL', right - 55, yRef.v + 9, { align: 'right' });
  doc.text(DisplayPriceInShillings(shopTotal), right - 4, yRef.v + 9, { align: 'right' });
  yRef.v += 27;

  ensureSpace(15);
  doc.setDrawColor(...GOLD);
  doc.line(left, yRef.v, right, yRef.v);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Nawiri Hair — internal end-of-day reconciliation record.', pageWidth / 2, yRef.v + 9, { align: 'center' });
};

const stampPageNumbers = (doc, right) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${i} of ${pageCount}`, right, PAGE_HEIGHT_MM - 10, { align: 'right' });
  }
};

const saveName = (eod, suffix) =>
  `nawiri-hair-eod-${suffix ? `${suffix}-` : ''}${eod.date || 'report'}-${(eod.branch || 'branch').replace(/\s+/g, '-').toLowerCase()}`;

// ---------------------------------------------------------------------------
// Format 1: Summary report — the compact Z-report-style daily close: hourly
// timeline, per-cashier rollup, a condensed transaction table (capped item
// list), proof evidence in its own sections, day totals. Good for a quick
// read of the numbers without wading through every sale.
// ---------------------------------------------------------------------------
export const downloadEndOfDaySummaryReport = async (eod) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = LEFT_MARGIN;
  const right = pageWidth - LEFT_MARGIN;
  const summary = eod.summary || {};
  const transactions = summary.transactions || [];
  const layout = createLayout(doc);
  const { yRef, ensureSpace, drawSectionTitle } = layout;

  drawHeader(doc, { pageWidth, left, right, eod, subtitle: 'END OF DAY REPORT' });

  yRef.v = 56;
  doc.setTextColor(...PLUM);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SUMMARY', left, yRef.v);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Closed by: ${eod.closedByName || 'N/A'}`, left, yRef.v + 7);
  doc.text(`Transactions: ${summary.transactionCount || 0}`, right, yRef.v + 7, { align: 'right' });
  yRef.v += 20;

  // --- Hourly cash timeline ---
  drawSectionTitle(left, 'Hourly timeline');
  autoTable(doc, {
    startY: yRef.v,
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
  yRef.v = (doc.lastAutoTable?.finalY || yRef.v) + 12;

  // --- Cashier breakdown: who made what ---
  if ((summary.cashierBreakdown || []).length > 0) {
    ensureSpace(20);
    drawSectionTitle(left, 'Sales by cashier');
    autoTable(doc, {
      startY: yRef.v,
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
    yRef.v = (doc.lastAutoTable?.finalY || yRef.v) + 12;
  }

  // --- Per-transaction detail ---
  // Proof images/text are deliberately NOT rendered inline in this table —
  // a screenshot shrunk to fit a table row is too small to actually verify
  // anything. They get their own full-size sections below instead (Equity
  // confirmations as legible images, Text Forwarded as full message text);
  // this table just flags which sales have proof to look for there. For the
  // full itemized breakdown of every sale alongside its evidence, use the
  // Detailed report instead.
  if (transactions.length > 0) {
    ensureSpace(20);
    drawSectionTitle(left, 'Transaction detail');

    const proofByUrl = new Map();
    const allUrls = transactions.flatMap((t) => t.proofImageUrls || []);
    await Promise.all(
      [...new Set(allUrls)].map(async (url) => {
        proofByUrl.set(url, await fetchImageAsDataUrl(url));
      })
    );

    autoTable(doc, {
      startY: yRef.v,
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
    yRef.v = (doc.lastAutoTable?.finalY || yRef.v) + 12;

    const missingProofCount = transactions.filter(
      (t) => (t.proofImageUrls || []).length > 0 && !(t.proofImageUrls || []).some((u) => proofByUrl.get(u))
    ).length;
    if (missingProofCount > 0) {
      ensureSpace(8);
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(`${missingProofCount} proof image(s) could not be loaded for this report.`, left, yRef.v);
      yRef.v += 10;
    }

    // --- Equity payment confirmation photos, at a legible size. This is
    // also the ONLY surviving copy of these once Cloudinary auto-deletes the
    // source image ~3.5 days after this close (see EndOfDay.proofDeletionDueAt). ---
    const IMG_MAX_WIDTH_MM = 45;
    const IMG_MAX_HEIGHT_MM = 65;
    const equityEntries = transactions
      .filter((t) => (t.proofImageUrls || []).length > 0)
      .map((t) => ({ saleNumber: t.saleNumber, total: t.total, url: t.proofImageUrls[0] }));
    if (equityEntries.length > 0) {
      ensureSpace(14);
      drawSectionTitle(left, 'Equity payment confirmations');
      equityEntries.forEach(({ saleNumber, total, url }) => {
        const proof = proofByUrl.get(url);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        if (!proof) {
          ensureSpace(10);
          doc.setTextColor(...PLUM);
          doc.text(saleNumber, left, yRef.v);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...MUTED);
          doc.text(`(photo unavailable) · ${DisplayPriceInShillings(total)}`, left + 30, yRef.v);
          yRef.v += 10;
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
        doc.text(`${saleNumber} · ${DisplayPriceInShillings(total)}`, left, yRef.v);
        yRef.v += 4;
        try {
          doc.addImage(proof.dataUrl, 'JPEG', left, yRef.v, w, h);
        } catch {
          // Corrupt/unsupported image data — skip rather than break the report.
        }
        yRef.v += h + 8;
      });
    }

    // --- Text Forwarded confirmation messages, in full (can't thumbnail text) ---
    const forwardedEntries = transactions
      .filter((t) => (t.forwardedTexts || []).length > 0)
      .flatMap((t) => (t.forwardedTexts || []).map((text) => ({ saleNumber: t.saleNumber, text })));
    if (forwardedEntries.length > 0) {
      ensureSpace(14);
      drawSectionTitle(left, 'Text Forwarded confirmations');
      forwardedEntries.forEach(({ saleNumber, text }) => {
        const wrapped = doc.splitTextToSize(text, right - left - 4);
        ensureSpace(wrapped.length * 4 + 10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...PLUM);
        doc.text(saleNumber, left, yRef.v);
        yRef.v += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(26, 15, 20);
        doc.text(wrapped, left, yRef.v);
        yRef.v += wrapped.length * 4 + 6;
      });
    }
  }

  // --- Returns & exchanges requested this trading day ---
  const exchanges = summary.exchanges || [];
  if (exchanges.length > 0) {
    ensureSpace(20);
    drawSectionTitle(left, `Returns & exchanges (${exchanges.length})`);
    autoTable(doc, {
      startY: yRef.v,
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
    yRef.v = (doc.lastAutoTable?.finalY || yRef.v) + 12;
  }

  drawDaySummarySection(doc, layout, { left, right, pageWidth, summary });
  stampPageNumbers(doc, right);

  doc.save(`${saveName(eod, 'summary')}.pdf`);
};

// ---------------------------------------------------------------------------
// Format 2: Detailed report — one self-contained card per sale: full item
// list (never capped), payment method, and its proof photo/text drawn right
// there in the same card, not split into a separate section. A card never
// splits across a page break — the whole thing moves to the next page if it
// doesn't fit, even if that leaves the current page mostly blank. This is
// the "tracking and follow-up" format: prioritizes seeing every sale in full
// over fitting many sales per page.
// ---------------------------------------------------------------------------
const CARD_PADDING = 4;
const CARD_GAP = 5;
const CARD_ITEM_LINE_H = 4.6;
const CARD_HEADER_LINE_H = 6;
const CARD_LABEL_LINE_H = 4.5;
const CARD_TEXT_LINE_H = 4;
const PROOF_IMG_MAX_W = 50;
const PROOF_IMG_MAX_H = 60;

// Precomputes every measurement a card needs — item line wrapping, proof
// image dimensions, forwarded-text wrapping — once, so the height used to
// reserve space (ensureSpace) and the content actually drawn can never drift
// out of sync with each other.
const prepareCard = (doc, t, cardWidth, proofByUrl) => {
  const innerWidth = cardWidth - CARD_PADDING * 2;

  const items = t.items && t.items.length > 0 ? t.items : [{ name: 'No items recorded', quantity: '', total: null }];
  const itemRows = items.map((item) => {
    const label = item.quantity ? `${item.quantity}x ${item.name}` : item.name;
    const wrapped = doc.splitTextToSize(label, innerWidth - 32);
    return { wrapped, amount: item.total != null ? DisplayPriceInShillings(item.total) : '' };
  });
  const itemLineCount = itemRows.reduce((sum, row) => sum + row.wrapped.length, 0);

  const proofUrl = (t.proofImageUrls || [])[0];
  const proof = proofUrl ? proofByUrl.get(proofUrl) : null;
  let proofDims = null;
  if (proof) {
    const aspectRatio = proof.width / proof.height;
    let w = PROOF_IMG_MAX_W;
    let h = w / aspectRatio;
    if (h > PROOF_IMG_MAX_H) {
      h = PROOF_IMG_MAX_H;
      w = h * aspectRatio;
    }
    proofDims = { w, h };
  }

  const forwardedText = (t.forwardedTexts || [])[0];
  const wrappedText = forwardedText ? doc.splitTextToSize(forwardedText, innerWidth) : null;

  let height = CARD_PADDING * 2;
  height += CARD_HEADER_LINE_H;
  height += itemLineCount * CARD_ITEM_LINE_H;
  height += CARD_HEADER_LINE_H; // payment method line
  if (proofDims) height += CARD_LABEL_LINE_H + proofDims.h + 3;
  if (wrappedText) height += CARD_LABEL_LINE_H + wrappedText.length * CARD_TEXT_LINE_H + 2;

  return { itemRows, proof, proofDims, forwardedText, wrappedText, height };
};

const drawCard = (doc, t, prepared, x, y, cardWidth) => {
  const { itemRows, proof, proofDims, wrappedText, height } = prepared;
  const innerLeft = x + CARD_PADDING;
  const innerRight = x + cardWidth - CARD_PADDING;
  let cy = y + CARD_PADDING;

  doc.setFillColor(250, 248, 245);
  doc.setDrawColor(...MUTED);
  doc.roundedRect(x, y, cardWidth, height, 2, 2, 'FD');

  // Header: sale # (bold) · time · source · cashier — amount, right-aligned
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PLUM);
  doc.text(t.saleNumber, innerLeft, cy + 4);
  const saleNumWidth = doc.getTextWidth(t.saleNumber);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const sourceLabel = t.saleSource === 'online' ? 'Online' : 'Walk-in';
  doc.text(`${formatSaleTime(t.saleDate)} · ${sourceLabel} · ${t.cashierName || 'N/A'}`, innerLeft + saleNumWidth + 4, cy + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(26, 15, 20);
  doc.text(DisplayPriceInShillings(t.total || 0), innerRight, cy + 4, { align: 'right' });
  cy += CARD_HEADER_LINE_H;

  // Every item, in full
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  itemRows.forEach((row) => {
    doc.setTextColor(26, 15, 20);
    doc.text(row.wrapped, innerLeft, cy + 3.2);
    if (row.amount) {
      doc.setTextColor(...MUTED);
      doc.text(row.amount, innerRight, cy + 3.2, { align: 'right' });
    }
    cy += row.wrapped.length * CARD_ITEM_LINE_H;
  });

  // Payment method
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Payment: ${paymentMethodLabel(t.paymentMethod)}`, innerLeft, cy + 3.5);
  cy += CARD_HEADER_LINE_H;

  // Proof photo, drawn inline in this same card
  if (proof && proofDims) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...PLUM);
    doc.text('Equity confirmation:', innerLeft, cy + 3);
    cy += CARD_LABEL_LINE_H;
    try {
      doc.addImage(proof.dataUrl, 'JPEG', innerLeft, cy, proofDims.w, proofDims.h);
    } catch {
      // Corrupt/unsupported image data — skip rather than break the report.
    }
    cy += proofDims.h + 3;
  }

  // Forwarded confirmation text, drawn inline in this same card, in full
  if (wrappedText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...PLUM);
    doc.text('Text Forwarded confirmation:', innerLeft, cy + 3);
    cy += CARD_LABEL_LINE_H;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(26, 15, 20);
    doc.text(wrappedText, innerLeft, cy + 3);
  }
};

export const downloadEndOfDayDetailedReport = async (eod) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = LEFT_MARGIN;
  const right = pageWidth - LEFT_MARGIN;
  const cardWidth = right - left;
  const summary = eod.summary || {};
  const transactions = summary.transactions || [];
  const layout = createLayout(doc);
  const { yRef, ensureSpace } = layout;

  drawHeader(doc, { pageWidth, left, right, eod, subtitle: 'END OF DAY — DETAILED' });

  yRef.v = 56;
  doc.setTextColor(...PLUM);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EVERY SALE, IN FULL', left, yRef.v);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Closed by: ${eod.closedByName || 'N/A'}`, left, yRef.v + 7);
  doc.text(
    `${summary.transactionCount || 0} transaction${(summary.transactionCount || 0) === 1 ? '' : 's'}`,
    right,
    yRef.v + 7,
    { align: 'right' }
  );
  yRef.v += 18;

  if (transactions.length > 0) {
    // Pre-fetch every proof image up front so cards can be measured and
    // drawn synchronously below.
    const proofByUrl = new Map();
    const allUrls = transactions.flatMap((t) => t.proofImageUrls || []);
    await Promise.all(
      [...new Set(allUrls)].map(async (url) => {
        proofByUrl.set(url, await fetchImageAsDataUrl(url));
      })
    );

    transactions.forEach((t) => {
      const prepared = prepareCard(doc, t, cardWidth, proofByUrl);
      ensureSpace(prepared.height + CARD_GAP);
      drawCard(doc, t, prepared, left, yRef.v, cardWidth);
      yRef.v += prepared.height + CARD_GAP;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('No transactions recorded for this day.', left, yRef.v);
    yRef.v += 12;
  }

  drawDaySummarySection(doc, layout, { left, right, pageWidth, summary });
  stampPageNumbers(doc, right);

  doc.save(`${saveName(eod, 'detailed')}.pdf`);
};

// ---------------------------------------------------------------------------
// Format 3: Excel — one row per transaction for filtering/reconciliation
// outside a PDF, plus hourly and day-summary sheets. Styled with the same
// brand palette (derived from the PDF's own PLUM/GOLD/MUTED) used across
// this app's other exports (see client/src/utils/exportUtils.js).
// ---------------------------------------------------------------------------
export const downloadEndOfDayExcel = async (eod) => {
  const summary = eod.summary || {};
  const transactions = summary.transactions || [];
  const PLUM_ARGB = toArgb(PLUM);
  const MUTED_ARGB = toArgb(MUTED);
  const ZEBRA_ARGB = 'FFFAF8F5';
  const BORDER_ARGB = 'FFE6E0D5';
  const TEXT_ARGB = 'FF2D2233';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nawiri Hair';
  workbook.created = new Date();

  const headerCellStyle = (cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PLUM_ARGB } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  };

  // --- Transactions sheet ---
  const TX_COLUMNS = [
    { key: 'time', header: 'Time', width: 10 },
    { key: 'saleNumber', header: 'Sale #', width: 18 },
    { key: 'source', header: 'Source', width: 10 },
    { key: 'cashier', header: 'Cashier', width: 18 },
    { key: 'items', header: 'Items', width: 55 },
    { key: 'payment', header: 'Payment', width: 14 },
    { key: 'amount', header: 'Amount', width: 16 },
    { key: 'proof', header: 'Proof', width: 10 },
  ];
  const colCount = TX_COLUMNS.length;
  const txSheet = workbook.addWorksheet('Transactions', {
    views: [{ state: 'frozen', ySplit: 4 }],
    properties: { tabColor: { argb: PLUM_ARGB } },
  });

  txSheet.mergeCells(1, 1, 1, colCount);
  const titleCell = txSheet.getCell('A1');
  titleCell.value = `Nawiri Hair — End of Day (${eod.branch || 'Main Store'})`;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: PLUM_ARGB } };
  txSheet.getRow(1).height = 28;

  txSheet.mergeCells(2, 1, 2, colCount);
  const subtitleCell = txSheet.getCell('A2');
  subtitleCell.value = `${eod.date || ''} · Closed by ${eod.closedByName || 'N/A'} · ${transactions.length} transaction${transactions.length === 1 ? '' : 's'}`;
  subtitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: MUTED_ARGB } };
  txSheet.getRow(2).height = 18;
  txSheet.getRow(3).height = 6;

  const headerRowIndex = 4;
  const headerRow = txSheet.getRow(headerRowIndex);
  TX_COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    headerCellStyle(cell);
    cell.border = { bottom: { style: 'thin', color: { argb: PLUM_ARGB } } };
  });
  headerRow.height = 20;

  txSheet.columns = TX_COLUMNS.map((c) => ({ key: c.key, width: c.width }));

  transactions.forEach((t, idx) => {
    const itemsText = (t.items || []).map((item) => `${item.quantity}x ${item.name}`).join('; ');
    const row = txSheet.addRow({
      time: formatSaleTime(t.saleDate),
      saleNumber: t.saleNumber,
      source: t.saleSource === 'online' ? 'Online' : 'Walk-in',
      cashier: t.cashierName || 'N/A',
      items: itemsText,
      payment: paymentMethodLabel(t.paymentMethod),
      amount: t.total || 0,
      proof: (t.proofImageUrls || []).length > 0 ? 'Photo' : (t.forwardedTexts || []).length > 0 ? 'Text' : '',
    });
    const isZebra = idx % 2 === 1;
    row.eachCell((cell, colNumber) => {
      const def = TX_COLUMNS[colNumber - 1];
      cell.font = { name: 'Calibri', size: 10, color: { argb: TEXT_ARGB } };
      cell.alignment = { vertical: 'middle', wrapText: def.key === 'items' };
      cell.border = { bottom: { style: 'hair', color: { argb: BORDER_ARGB } } };
      if (isZebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_ARGB } };
      if (def.key === 'amount') {
        cell.numFmt = '"Ksh" #,##0.00';
        cell.alignment.horizontal = 'right';
      }
    });
  });

  txSheet.autoFilter = { from: { row: headerRowIndex, column: 1 }, to: { row: headerRowIndex, column: colCount } };
  txSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowIndex }];

  // --- Hourly Breakdown sheet ---
  const hourlySheet = workbook.addWorksheet('Hourly Breakdown', { properties: { tabColor: { argb: PLUM_ARGB } } });
  hourlySheet.columns = [
    { key: 'hour', header: 'Hour', width: 12 },
    { key: 'count', header: 'Transactions', width: 14 },
    { key: 'cash', header: 'Cash Received', width: 18 },
    { key: 'total', header: 'Total Sales', width: 18 },
  ];
  hourlySheet.getRow(1).eachCell((cell) => headerCellStyle(cell));
  (summary.hourlyBreakdown || []).forEach((row, idx) => {
    const r = hourlySheet.addRow({
      hour: formatHourLabel(row.hour),
      count: row.count || 0,
      cash: row.cashTotal || 0,
      total: row.total || 0,
    });
    if (idx % 2 === 1) {
      r.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_ARGB } };
      });
    }
    r.getCell('cash').numFmt = '"Ksh" #,##0.00';
    r.getCell('total').numFmt = '"Ksh" #,##0.00';
  });

  // --- Day Summary sheet ---
  const summarySheet = workbook.addWorksheet('Day Summary', { properties: { tabColor: { argb: PLUM_ARGB } } });
  summarySheet.columns = [
    { key: 'label', header: 'Metric', width: 28 },
    { key: 'value', header: 'Amount', width: 18 },
  ];
  summarySheet.getRow(1).eachCell((cell) => headerCellStyle(cell));
  // Delivery charges pass straight through to contracted riders — never the
  // shop's money — so SHOP TOTAL excludes them even though every
  // payment-method row above (Cash received, Equity sales, etc.) includes
  // it in its own total.
  const shopTotal = summary.productRevenue != null ? summary.productRevenue : (summary.totalSales || 0);
  const summaryRows = [
    ['Cash received', summary.cashSales || 0],
    ['Equity sales', summary.equitySales || 0],
    ['Split sales', summary.splitSales || 0],
    ['Text Forwarded sales', summary.textForwardedSales || 0],
    ['Walk-in sales', summary.walkinSales || 0],
    ['Online sales', summary.onlineSales || 0],
    ['Product sales', summary.productRevenue || 0],
    ['Delivery charges (rider)', summary.deliveryRevenue || 0],
    ['SHOP TOTAL', shopTotal],
  ];
  summaryRows.forEach(([label, value], idx) => {
    const r = summarySheet.addRow({ label, value });
    r.getCell('value').numFmt = '"Ksh" #,##0.00';
    if (label === 'SHOP TOTAL') {
      r.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 10, bold: true };
      });
    } else if (idx % 2 === 1) {
      r.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_ARGB } };
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${saveName(eod)}.xlsx`);
};

export default downloadEndOfDaySummaryReport;
