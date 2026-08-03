const SITE_URL = 'https://nawirihairke.com';

const escapeXml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const slug = (text = '') => String(text).toLowerCase()
  .replace(/[&/\\#,+()$~%.'":*?<>{}]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .trim()
  .slice(0, 60);

const discountedPrice = (price, discount) => {
  const base = Number(price);
  const percentage = Math.min(100, Math.max(0, Number(discount) || 0));
  return base - Math.round((base * percentage) / 100);
};

const description = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const buildMerchantFeedXml = (products = []) => {
  const items = products.map((product) => {
    const price = discountedPrice(product.price, product.discount);
    const link = `${SITE_URL}/product/${slug(product.name)}-${product._id}`;
    return `<item>
      <g:id>${escapeXml(product.sku || product._id)}</g:id>
      <g:title>${escapeXml(product.name)}</g:title>
      <g:description>${escapeXml(description(product.description) || `Buy ${product.name} at Nawiri Hair.`)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(product.image?.[0])}</g:image_link>
      <g:availability>${Number(product.stock) > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:price>${price.toFixed(2)} KES</g:price>
      <g:condition>new</g:condition>
      <g:brand>Nawiri Hair</g:brand>
      <g:mpn>${escapeXml(product.sku || product._id)}</g:mpn>
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Nawiri Hair product feed</title>
    <link>${SITE_URL}</link>
    <description>Customer-ready Nawiri Hair products priced in Kenyan shillings.</description>
    ${items.join('\n')}
  </channel>
</rss>`;
};
