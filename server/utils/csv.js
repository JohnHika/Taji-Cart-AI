// Builds an RFC 4180-ish CSV string (with UTF-8 BOM prefix added by the
// caller when sending) from a header row and an array of row arrays.
const csvEscape = (value) => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const buildCsv = (headers, rows) => {
  return [headers, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\r\n');
};

export const sendCsv = (res, filename, headers, rows) => {
  const csv = buildCsv(headers, rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(`﻿${csv}`);
};
