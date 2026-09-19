import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import ExcelJS from 'exceljs';

// Brand palette used consistently across every export format
const BRAND = {
  primary: '6B2D5C',      // plum-700
  primaryDark: '4A1F40',  // plum-900
  text: '2D2233',
  muted: '6B6070',
  border: 'E3D5DE',
  zebra: 'FAF5F8',
  success: '1E8E5A',
  warning: 'C77700',
  danger: 'C4344B',
};

const currency = (value) =>
  `Ksh ${Number(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: '2-digit' }) : '';

const stockStatus = (stock) => {
  const qty = Number(stock || 0);
  if (qty <= 0) return 'Out of stock';
  if (qty <= 5) return 'Low stock';
  return 'In stock';
};

/**
 * Normalizes raw product records into a flat, human-friendly row shape
 * shared by every export format so headers, variant fields, and values
 * stay consistent across Excel/PDF/Word/CSV/JSON.
 */
const buildExportRows = (products = []) =>
  products.map((product) => ({
    name: product.name || 'Untitled product',
    sku: product.sku || '',
    barcode: product.barcode || '',
    category: Array.isArray(product.category)
      ? product.category.map((cat) => cat?.name || '').filter(Boolean).join(', ')
      : (product.category || ''),
    color: product.variants?.color || '',
    length: product.variants?.length || '',
    density: product.variants?.density || '',
    lace: product.variants?.laceSpecification || '',
    unit: product.unit || 'piece',
    price: Number(product.price || 0),
    costPrice: Number(product.costPrice || 0),
    discount: Number(product.discount || 0),
    stock: Number(product.stock || 0),
    stockStatus: stockStatus(product.stock),
    published: product.publish ? 'Published' : 'Hidden',
    description: (product.description || '').replace(/\s+/g, ' ').trim(),
    createdAt: formatDate(product.createdAt),
    updatedAt: formatDate(product.updatedAt),
  }));

const COLUMN_DEFS = [
  { key: 'name', header: 'Product Name', width: 34 },
  { key: 'sku', header: 'SKU', width: 20 },
  { key: 'category', header: 'Category', width: 22 },
  { key: 'color', header: 'Color', width: 14 },
  { key: 'length', header: 'Length', width: 10 },
  { key: 'density', header: 'Density', width: 10 },
  { key: 'lace', header: 'Lace Spec', width: 16 },
  { key: 'unit', header: 'Unit', width: 10 },
  { key: 'price', header: 'Price', width: 14, type: 'currency' },
  { key: 'costPrice', header: 'Cost Price', width: 14, type: 'currency' },
  { key: 'discount', header: 'Discount %', width: 12, type: 'number' },
  { key: 'stock', header: 'Stock', width: 10, type: 'number' },
  { key: 'stockStatus', header: 'Status', width: 14 },
  { key: 'published', header: 'Visibility', width: 12 },
  { key: 'barcode', header: 'Barcode', width: 18 },
  { key: 'description', header: 'Description', width: 45 },
  { key: 'createdAt', header: 'Created', width: 14 },
  { key: 'updatedAt', header: 'Updated', width: 14 },
];

// ---------------------------------------------------------------------------
// Excel (.xlsx) — ExcelJS gives us real styling: fills, fonts, borders,
// frozen header, autofilter, number formats and conditional stock colors.
// ---------------------------------------------------------------------------
const exportToExcel = async (products, filename = 'products') => {
  const rows = buildExportRows(products);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Taji Cart AI';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Products', {
    views: [{ state: 'frozen', ySplit: 4 }],
    properties: { tabColor: { argb: `FF${BRAND.primary}` } },
  });

  const columnCount = COLUMN_DEFS.length;

  // Title band
  sheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'Taji Cart AI — Product Catalog Export';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: `FF${BRAND.primaryDark}` } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, columnCount);
  const subtitleCell = sheet.getCell('A2');
  subtitleCell.value = `Generated ${new Date().toLocaleString('en-KE')} • ${rows.length} product${rows.length === 1 ? '' : 's'}`;
  subtitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: `FF${BRAND.muted}` } };
  sheet.getRow(2).height = 18;

  sheet.getRow(3).height = 6; // spacer

  // Header row (row 4)
  const headerRowIndex = 4;
  const headerRow = sheet.getRow(headerRowIndex);
  COLUMN_DEFS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND.primary}` } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
      bottom: { style: 'thin', color: { argb: `FF${BRAND.primaryDark}` } },
    };
  });
  headerRow.height = 20;

  // Columns (widths only — headers already written manually above)
  sheet.columns = COLUMN_DEFS.map((col) => ({ key: col.key, width: col.width }));

  // Data rows
  rows.forEach((row, idx) => {
    const excelRow = sheet.addRow(row);
    const isZebra = idx % 2 === 1;

    excelRow.eachCell((cell, colNumber) => {
      const def = COLUMN_DEFS[colNumber - 1];
      cell.font = { name: 'Calibri', size: 10, color: { argb: `FF${BRAND.text}` } };
      cell.alignment = { vertical: 'middle', wrapText: def.key === 'description' };
      cell.border = { bottom: { style: 'hair', color: { argb: `FF${BRAND.border}` } } };
      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND.zebra}` } };
      }
      if (def.type === 'currency') {
        cell.numFmt = '"Ksh" #,##0.00';
        cell.alignment.horizontal = 'right';
      } else if (def.type === 'number') {
        cell.numFmt = '#,##0';
        cell.alignment.horizontal = 'right';
      }
    });

    // Color-code the status column
    const statusCell = excelRow.getCell('stockStatus');
    const colorMap = {
      'Out of stock': BRAND.danger,
      'Low stock': BRAND.warning,
      'In stock': BRAND.success,
    };
    const statusColor = colorMap[row.stockStatus] || BRAND.muted;
    statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: `FF${statusColor}` } };
  });

  // Auto-filter dropdown on the header row
  sheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: columnCount },
  };

  // Freeze panes explicitly (belt-and-braces alongside the view option above)
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowIndex }];

  // Summary footer
  const footerRowIndex = headerRowIndex + rows.length + 2;
  sheet.mergeCells(footerRowIndex, 1, footerRowIndex, columnCount);
  const footerCell = sheet.getCell(`A${footerRowIndex}`);
  const totalStock = rows.reduce((sum, r) => sum + r.stock, 0);
  const totalValue = rows.reduce((sum, r) => sum + r.price * r.stock, 0);
  footerCell.value = `Total units in stock: ${totalStock.toLocaleString()} · Estimated stock value: ${currency(totalValue)}`;
  footerCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: `FF${BRAND.muted}` } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

// ---------------------------------------------------------------------------
// CSV — clean human headers, properly quoted/escaped values.
// ---------------------------------------------------------------------------
const exportToCSV = (products, filename = 'products') => {
  const rows = buildExportRows(products);
  const headers = COLUMN_DEFS.map((c) => c.header);

  const escapeCell = (value) => {
    const str = value == null ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      COLUMN_DEFS.map((col) => {
        const raw = row[col.key];
        const formatted = col.type === 'currency' ? Number(raw || 0).toFixed(2) : raw;
        return escapeCell(formatted);
      }).join(',')
    ),
  ];

  // BOM so Excel opens UTF-8 CSVs without mangling special characters
  const blob = new Blob(['﻿', lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

// ---------------------------------------------------------------------------
// PDF — jspdf-autotable for a real, professionally paginated table.
// ---------------------------------------------------------------------------
const PDF_COLUMNS = ['name', 'barcode', 'sku', 'category', 'color', 'length', 'price', 'stock', 'stockStatus'];
const PDF_HEADERS = { name: 'Product', barcode: 'Barcode', sku: 'SKU', category: 'Category', color: 'Color', length: 'Length', price: 'Price', stock: 'Stock', stockStatus: 'Status' };

const exportToPDF = (products, filename = 'products') => {
  const rows = buildExportRows(products);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryRgb = [107, 45, 92];

  const drawHeader = () => {
    doc.setFillColor(...primaryRgb);
    doc.rect(0, 0, pageWidth, 54, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17);
    doc.setFont(undefined, 'bold');
    doc.text('Taji Cart AI — Product Catalog', 24, 26);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(
      `Generated ${new Date().toLocaleString('en-KE')} · ${rows.length} product${rows.length === 1 ? '' : 's'}`,
      24,
      42
    );
  };

  drawHeader();

  autoTable(doc, {
    startY: 68,
    head: [PDF_COLUMNS.map((key) => PDF_HEADERS[key])],
    body: rows.map((row) =>
      PDF_COLUMNS.map((key) => (key === 'price' ? currency(row[key]) : String(row[key] ?? '')))
    ),
    theme: 'striped',
    headStyles: {
      fillColor: primaryRgb,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8.5, textColor: [45, 34, 51] },
    alternateRowStyles: { fillColor: [250, 245, 248] },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 96 },
      2: { cellWidth: 96 },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    margin: { left: 24, right: 24, top: 68 },
    didParseCell: (data) => {
      if (data.section === 'body' && PDF_COLUMNS[data.column.index] === 'stockStatus') {
        const value = data.cell.raw;
        if (value === 'Out of stock') data.cell.styles.textColor = [196, 52, 75];
        else if (value === 'Low stock') data.cell.styles.textColor = [199, 119, 0];
        else if (value === 'In stock') data.cell.styles.textColor = [30, 142, 90];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawPage: () => {
      // Redraw the brand header band on every new page
      if (doc.internal.getCurrentPageInfo().pageNumber > 1) drawHeader();
    },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const height = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.setFont(undefined, 'normal');
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 70, height - 12);
    doc.text('Taji Cart AI', 24, height - 12);
  }

  doc.save(`${filename}.pdf`);
};

// ---------------------------------------------------------------------------
// Barcode labels — production-ready A4 sheet: 3 columns × 8 rows = 24 labels.
// Each label is a real CODE 128 barcode (the same symbology product.barcode
// values are already validated against — see isCode128BarcodeValue on the
// server) and prints its plain-text reference underneath for manual lookup
// if a scanner is unavailable. Purely 1D by design: the store scans with a
// dedicated barcode reader, which cannot decode QR at all — cut the sheet
// apart, or leave a visible gap between labels, before scanning a dense
// page to avoid one scan crossing into a neighbouring label.
// ---------------------------------------------------------------------------
const BARCODE_LABEL_COLUMNS = 3;
const BARCODE_LABEL_ROWS = 8;
const BARCODE_LABELS_PER_PAGE = BARCODE_LABEL_COLUMNS * BARCODE_LABEL_ROWS;

const trimLabelText = (value, maxLength = 46) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const barcodeLabelDetails = (product) => {
  const color = String(product?.variants?.color || '').trim();
  const length = String(product?.variants?.length || '').trim();
  const variant = [color && `Colour ${color}`, length].filter(Boolean).join(' · ');
  return variant || String(product?.unit || 'Hair product');
};

// Renders onto an offscreen canvas rather than an on-page one — this runs
// once per product in a loop that can cover the full catalog (564 labels
// and counting), so nothing here should touch the DOM tree.
const createBarcodeImage = (value) => {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, {
    format: 'CODE128',
    displayValue: false,
    margin: 8,
    height: 80,
    background: '#FFFFFF',
    lineColor: '#2D2233',
  });
  return canvas.toDataURL('image/png');
};

const exportToBarcodeLabelsPDF = async (products, filename = 'nawiri-hair-barcode-labels') => {
  const allProducts = Array.isArray(products) ? products : [];
  if (!allProducts.length) {
    throw new Error('There are no products to include in a barcode label sheet.');
  }

  const missingBarcodes = allProducts.filter((product) => !String(product?.barcode || '').trim());
  if (missingBarcodes.length) {
    throw new Error(`${missingBarcodes.length} product${missingBarcodes.length === 1 ? '' : 's'} still need a barcode. Generate barcodes before exporting labels.`);
  }

  const labelProducts = [...allProducts]
    .sort((left, right) => String(left.barcode).localeCompare(String(right.barcode), 'en', { numeric: true }));
  const doc = new jsPDF({ format: 'a4', orientation: 'portrait', unit: 'pt' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const marginY = 18;
  const columnGap = 8;
  const rowGap = 4;
  const labelWidth = (pageWidth - (marginX * 2) - (columnGap * (BARCODE_LABEL_COLUMNS - 1))) / BARCODE_LABEL_COLUMNS;
  const labelHeight = (pageHeight - marginY - 28 - (rowGap * (BARCODE_LABEL_ROWS - 1))) / BARCODE_LABEL_ROWS;

  for (let index = 0; index < labelProducts.length; index += 1) {
    if (index > 0 && index % BARCODE_LABELS_PER_PAGE === 0) {
      doc.addPage();
    }

    const product = labelProducts[index];
    const indexOnPage = index % BARCODE_LABELS_PER_PAGE;
    const column = indexOnPage % BARCODE_LABEL_COLUMNS;
    const row = Math.floor(indexOnPage / BARCODE_LABEL_COLUMNS);
    const x = marginX + (column * (labelWidth + columnGap));
    const y = marginY + (row * (labelHeight + rowGap));
    const barcode = String(product.barcode).trim();
    const barcodeImage = createBarcodeImage(barcode);

    doc.setDrawColor(227, 213, 222);
    doc.setLineWidth(0.65);
    doc.roundedRect(x, y, labelWidth, labelHeight, 4, 4, 'S');

    doc.setTextColor(45, 34, 51);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(trimLabelText(product.name).toUpperCase(), x + 8, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 96, 112);
    doc.setFontSize(6.8);
    doc.text(trimLabelText(barcodeLabelDetails(product), 52), x + 8, y + 22);

    // Full-width strip, not a square — a 1D barcode needs its horizontal
    // run to fill as much of the label as the layout allows for a reliable
    // scan; jsPDF stretches the source image uniformly to this box, which
    // only rescales the bar widths proportionally and doesn't affect
    // decodability.
    const barcodeImageWidth = labelWidth - 16;
    const barcodeImageHeight = 36;
    doc.addImage(barcodeImage, 'PNG', x + 8, y + 26, barcodeImageWidth, barcodeImageHeight);

    doc.setFont('courier', 'bold');
    doc.setTextColor(45, 34, 51);
    doc.setFontSize(7.3);
    doc.text(barcode, x + (labelWidth / 2), y + 73, { align: 'center' });

    // No brand name on the sticker itself — labels are handed to resellers,
    // so they stay unbranded (only the sheet footer, outside the label grid,
    // identifies the source).

    // Yield once per page so a full 564-label export keeps the admin page responsive.
    if ((index + 1) % BARCODE_LABELS_PER_PAGE === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(107, 96, 112);
    doc.text(`Nawiri Hair · Product barcode labels · Page ${page} of ${pageCount}`, marginX, pageHeight - 10);
  }

  doc.save(`${filename}.pdf`);
  return { count: labelProducts.length, pageCount };
};

// ---------------------------------------------------------------------------
// Word (.doc via HTML) — polished table with brand styling and status chips.
// ---------------------------------------------------------------------------
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const exportToWord = (products, filename = 'products') => {
  const rows = buildExportRows(products);
  const statusColor = { 'Out of stock': '#C4344B', 'Low stock': '#C77700', 'In stock': '#1E8E5A' };

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.name)}</strong><br/><span class="muted">${escapeHtml(row.sku)}</span></td>
          <td>${escapeHtml(row.category)}</td>
          <td>${escapeHtml([row.color, row.length].filter(Boolean).join(' · '))}</td>
          <td class="num">${escapeHtml(currency(row.price))}</td>
          <td class="num">${row.stock}</td>
          <td><span style="color:${statusColor[row.stockStatus] || '#6B6070'}; font-weight:bold;">${escapeHtml(row.stockStatus)}</span></td>
          <td>${escapeHtml(row.description)}</td>
        </tr>`
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Taji Cart AI — Product Catalog</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; color: #2D2233; margin: 32px; }
        .brand-bar { background: #6B2D5C; color: #fff; padding: 18px 24px; border-radius: 6px; margin-bottom: 4px; }
        .brand-bar h1 { margin: 0; font-size: 20px; }
        .meta { color: #6B6070; font-size: 12px; margin: 6px 0 20px; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #6B2D5C; color: #fff; padding: 10px; text-align: left; font-size: 12px; }
        td { border-bottom: 1px solid #E3D5DE; padding: 8px 10px; font-size: 12px; vertical-align: top; }
        tr:nth-child(even) td { background-color: #FAF5F8; }
        .muted { color: #6B6070; font-size: 10px; }
        .num { text-align: right; white-space: nowrap; }
        .footer { margin-top: 24px; font-size: 11px; color: #6B6070; }
      </style>
    </head>
    <body>
      <div class="brand-bar"><h1>Taji Cart AI — Product Catalog</h1></div>
      <div class="meta">Generated ${new Date().toLocaleString('en-KE')} &middot; ${rows.length} product${rows.length === 1 ? '' : 's'}</div>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Variant</th>
            <th class="num">Price</th>
            <th class="num">Stock</th>
            <th>Status</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <p class="footer">Generated by Taji Cart AI on ${new Date().toLocaleString('en-KE')}</p>
    </body>
    </html>
  `;

  const blob = new Blob(['﻿', htmlContent], { type: 'application/msword;charset=utf-8;' });
  saveAs(blob, `${filename}.doc`);
};

// ---------------------------------------------------------------------------
// JSON — same normalized, human-readable shape as the other formats.
// ---------------------------------------------------------------------------
const exportToJSON = (products, filename = 'products') => {
  const rows = buildExportRows(products);
  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'Taji Cart AI',
    count: rows.length,
    products: rows,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  saveAs(blob, `${filename}.json`);
};

export {
  buildExportRows,
  exportToExcel,
  exportToCSV,
  exportToPDF,
  exportToBarcodeLabelsPDF,
  exportToWord,
  exportToJSON
};
