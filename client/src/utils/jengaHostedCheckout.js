// Jenga PGW's hosted checkout form must be a real browser form submission
// (not fetch/XHR). It navigates to Jenga, which displays Nawiri Hair's active
// payment methods; the M-Pesa approval is handled there, not in this app.
export const submitJengaHostedCheckout = (checkoutUrl, fields) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = checkoutUrl;

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value ?? '';
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};
