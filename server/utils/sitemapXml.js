export const formatSitemapLastModified = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
};

export const buildSitemapUrl = (loc, changefreq, priority, updatedAt) => {
  const lastModified = formatSitemapLastModified(updatedAt);
  const lastmod = lastModified ? `<lastmod>${lastModified}</lastmod>` : '';

  return `<url><loc>${loc}</loc>${lastmod}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
};
