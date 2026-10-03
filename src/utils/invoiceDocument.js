import { jsPDF } from 'jspdf';

// ─────────────────────────────────────────────────────────────────────────────
// One invoice, one look.
//
// Offline bills (BillGenerator / OfflineBillsSheet), a customer's own order
// invoice (OrderInfoView) and the admin's order invoice (AdminDashboard) used to
// carry four slightly different layouts and four slightly different PDF
// exporters — two of which squashed or cut everything after page one. They all
// use the template below now, so a bill is the same document wherever it is
// opened, and the PDF is paginated properly.
// ─────────────────────────────────────────────────────────────────────────────

// A4 at 96 dpi is 794 px wide; the template adds its own inner padding.
const RENDER_WIDTH_PX = 794;
const PAGE = { widthMm: 210, heightMm: 297, marginMm: 6 };

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

// Order data and customer input end up in this markup, so every value is
// escaped before it is written.
const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const line = (label, value) => (value
  ? `<p style="margin: 3px 0; font-size: 13px;"><strong>${esc(label)}:</strong> ${esc(value)}</p>`
  : '');

/**
 * Renders the shared tax-invoice layout.
 * @param {object} invoice  { billNumber, date, time, orderId, status, paymentMethod,
 *                            customer: { name, phone, email, address, city, state, pincode },
 *                            items: [{ name, quantity, price, styles? }],
 *                            subtotal, discount, shipping, gstRate, gstAmount, grandTotal,
 *                            paidAmount, pendingAmount }
 * @param {object} company  companySettings from the admin tab
 */
export const buildInvoiceHTML = (invoice = {}, company = {}) => {
  const customer = invoice.customer || {};
  const items = invoice.items || [];

  const subtotal = invoice.subtotal ?? round2(items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0));
  const gstRate = Number(invoice.gstRate ?? 0);
  const gstAmount = invoice.gstAmount ?? round2(subtotal * (gstRate / 100));
  const discount = round2(invoice.discount ?? 0);
  const shipping = round2(invoice.shipping ?? 0);
  const grandTotal = invoice.grandTotal ?? round2(subtotal - discount + shipping + gstAmount);
  const paidAmount = round2(invoice.paidAmount ?? 0);
  const pendingAmount = round2(invoice.pendingAmount ?? 0);

  const addressLine = [
    customer.address,
    customer.city,
    customer.state,
    customer.pincode ? `- ${customer.pincode}` : '',
  ].filter(Boolean).join(', ');

  const styleLines = (item) => ((item.styles && item.styles.length) ? `
    <div style="margin-top: 6px; font-size: 11px; color: #555;">
      <strong>Styles:</strong>
      ${item.styles.map((s) => `<div style="margin-left: 10px; margin-top: 2px;">• ${esc(s.name)} (Qty: ${esc(s.quantity)}) = ${esc(money(s.total ?? (Number(s.price || 0) * Number(s.quantity || 0))))}</div>`).join('')}
    </div>` : '');

  const totalsRow = (label, value, extraStyle = '') => `
    <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; ${extraStyle}">
      <span>${esc(label)}</span><span>${esc(value)}</span>
    </div>`;

  return `
    <div style="font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; color: #222; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #1B4D3E, #3E7A63); padding: 25px; border-radius: 12px; margin-bottom: 25px; color: #fff; display: flex; align-items: center; gap: 18px;">
        ${company.logo ? `<img src="${esc(company.logo)}" alt="Logo" style="width: 72px; height: 72px; object-fit: contain; background: #fff; border-radius: 10px; padding: 5px;" />` : ''}
        <div>
          <h1 style="margin: 0; font-size: 26px; color: #fff;">${esc(company.companyName || 'Saran Jute Bags')}</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #E8FFF4;">${esc(`${company.addressLine1 || ''}${company.cityStatePin ? `, ${company.cityStatePin}` : ''}`)}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #E8FFF4;">Mobile: ${esc(company.phone || '—')} | Email: ${esc(company.email || '—')}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #E8FFF4;">Website: www.saranjutebags.in | www.saranjutebags.co.in</p>
          ${company.gstin ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #E8FFF4;">GSTIN: ${esc(company.gstin)}</p>` : ''}
          ${company.pan ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #E8FFF4;">PAN: ${esc(company.pan)}</p>` : ''}
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;" data-break>
        <div>
          <h3 style="margin: 0 0 8px 0;">Tax Invoice</h3>
          ${line('Bill No', invoice.billNumber)}
          ${line('Date', invoice.date)}
          ${line('Time', invoice.time)}
          ${line('Order ID', invoice.orderId)}
          ${line('Payment Method', invoice.paymentMethod)}
          ${line('Order Status', invoice.status)}
        </div>
        <div style="text-align: right;">
          <h3 style="margin: 0 0 8px 0;">Bill To:</h3>
          <p style="margin: 3px 0; font-size: 13px;"><strong>${esc(customer.name || '—')}</strong></p>
          ${line('Mobile', customer.phone)}
          ${line('Email', customer.email)}
          ${addressLine ? `<p style="margin: 3px 0; font-size: 13px;">${esc(addressLine)}</p>` : ''}
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #EEF4F1;">
            <th style="padding: 10px; text-align: left; border: 1.5px solid #333;">#</th>
            <th style="padding: 10px; text-align: left; border: 1.5px solid #333;">Item</th>
            <th style="padding: 10px; text-align: center; border: 1.5px solid #333;">Qty</th>
            <th style="padding: 10px; text-align: right; border: 1.5px solid #333;">Price</th>
            <th style="padding: 10px; text-align: right; border: 1.5px solid #333;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, idx) => `
            <tr data-break>
              <td style="padding: 10px; border: 1.5px solid #333; text-align: center;">${idx + 1}</td>
              <td style="padding: 10px; border: 1.5px solid #333;">${esc(item.name)}${styleLines(item)}</td>
              <td style="padding: 10px; border: 1.5px solid #333; text-align: center;">${esc(item.quantity)}</td>
              <td style="padding: 10px; border: 1.5px solid #333; text-align: right;">${esc(money(item.price))}</td>
              <td style="padding: 10px; border: 1.5px solid #333; text-align: right;">${esc(money(item.lineTotal ?? (Number(item.price || 0) * Number(item.quantity || 0))))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-left: auto; width: 280px; margin-bottom: 30px;" data-break>
        ${totalsRow('Subtotal:', money(subtotal))}
        ${discount > 0 ? totalsRow('Discount:', `- ${money(discount)}`) : ''}
        ${totalsRow('Shipping:', shipping === 0 ? 'Free' : money(shipping))}
        ${totalsRow(`GST (${gstRate}%):`, money(gstAmount))}
        ${totalsRow('Grand Total:', money(grandTotal), 'padding: 10px 0; font-size: 18px; font-weight: bold; border-top: 2px solid #3E7A63; margin-top: 6px;')}
        ${paidAmount > 0 ? totalsRow(pendingAmount > 0 ? 'Paid Amount:' : 'Amount Paid:', money(paidAmount), 'color: #1B4D3E;') : ''}
        ${pendingAmount > 0 ? totalsRow('Pending (Payable on Delivery):', money(pendingAmount), 'color: #B45309;') : ''}
      </div>

      <div style="margin-top: 50px; display: flex; justify-content: flex-start;" data-break>
        <div style="text-align: center;">
          <div style="width: 220px; border-top: 1px solid #333; margin-bottom: 6px;"></div>
          <p style="margin: 0; font-size: 13px; font-weight: bold; color: #222;">Authorized Signatory</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #666;">For ${esc(company.companyName || 'Saran Jute Bags')}</p>
        </div>
      </div>

      <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 25px; text-align: center; color: #666; font-size: 12px;" data-break>
        <p style="margin: 5px 0;">Thank you for your business!</p>
        <p style="margin: 5px 0;">This is computer generated bill.</p>
        ${company.email ? `<p style="margin: 5px 0;">Need help? Contact us at ${esc(company.email)}</p>` : ''}
      </div>
    </div>
  `;
};

/** Maps a saved offline bill to the shared invoice shape. */
export const billToInvoice = (bill = {}) => ({
  billNumber: bill.billNumber,
  date: bill.date,
  time: bill.time,
  customer: bill.customer || {},
  items: (bill.items || []).map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    lineTotal: round2(Number(item.price || 0) * Number(item.quantity || 0)),
  })),
  subtotal: bill.subtotal,
  gstRate: Number(bill.gstRate ?? 18),
  gstAmount: bill.gstAmount,
  grandTotal: bill.grandTotal,
});

/** Maps an online order (customer or admin copy) to the shared invoice shape. */
export const orderToInvoice = (order = {}, { invoicePrefix = 'INV', gstRate = 18 } = {}) => {
  const pricing = order.pricing || {
    subtotal: order.subtotal ?? order.total,
    discountAmount: order.discountAmount ?? 0,
    shipping: order.shippingCharge ?? 0,
    gstRate: order.gstRate ?? gstRate,
    gstAmount: order.gstAmount ?? 0,
    grandTotal: order.grandTotal ?? order.total,
  };

  // order.date is a toLocaleString() stamp: "3/10/2026, 4:15:23 PM".
  const stamp = order.date || '';
  const comma = stamp.lastIndexOf(',');
  const date = comma > 0 ? stamp.slice(0, comma) : stamp;
  const time = comma > 0 ? stamp.slice(comma + 1).trim() : (order.time || '');

  const shippingAddress = order.shippingAddress || order.address || {};

  return {
    billNumber: `${invoicePrefix}-${String(order.id || '').slice(-6)}`,
    date,
    time,
    orderId: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    customer: {
      name: shippingAddress.name || order.name || 'Customer',
      phone: shippingAddress.phone || order.phone || '',
      email: order.userEmail || order.email || shippingAddress.email || '',
      address: shippingAddress.addressLine1 || shippingAddress.address || '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      pincode: shippingAddress.pincode || '',
    },
    // Styled lines carry their quantity per style, and the unit total lives on
    // totalStyleQuantity — the admin copy used to print only item.quantity.
    items: (order.items || []).map((item) => {
      const quantity = Number(item.totalStyleQuantity || item.quantity || 0);
      return {
        name: item.name,
        quantity,
        price: Number(item.price || 0),
        lineTotal: round2(Number(item.price || 0) * quantity),
        styles: (item.selectedStyles || []).map((s) => ({
          name: s.name,
          quantity: s.quantity,
          total: s.total ?? (Number(s.price || 0) * Number(s.quantity || 0)),
        })),
      };
    }),
    subtotal: pricing.subtotal,
    discount: pricing.discountAmount,
    shipping: pricing.shipping,
    gstRate: Number(pricing.gstRate ?? gstRate),
    gstAmount: pricing.gstAmount,
    grandTotal: pricing.grandTotal,
    paidAmount: order.paidAmount,
    pendingAmount: order.pendingAmount,
  };
};

// ─── Output ──────────────────────────────────────────────────────────────────

const waitForImages = async (node) => {
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(images.map((img) => (img.decode
    ? img.decode().catch(() => undefined)
    : Promise.resolve())));
};

const mountOffscreen = (html) => {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;top:0;left:-99999px;z-index:-1;width:${RENDER_WIDTH_PX}px;background:#ffffff;`;
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
};

// html2canvas paints the element once, so a long invoice arrives as one very
// tall image. Slicing it into A4 pages (and never cutting between table rows)
// is what makes the download "correct" instead of clipped or shrunk.
const paginateCanvas = (canvas, node, pdf) => {
  const contentWidthMm = PAGE.widthMm - PAGE.marginMm * 2;
  const pxPerMm = canvas.width / contentWidthMm;
  const pageHeightPx = Math.floor((PAGE.heightMm - PAGE.marginMm * 2) * pxPerMm);
  const cssToCanvas = canvas.width / (node.offsetWidth || RENDER_WIDTH_PX);
  const nodeTop = node.getBoundingClientRect().top;

  const safeBreaks = Array.from(node.querySelectorAll('[data-break]'))
    .map((el) => Math.round((el.getBoundingClientRect().bottom - nodeTop) * cssToCanvas))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);

  let offset = 0;
  let added = false;
  while (offset < canvas.height) {
    const hardLimit = Math.min(offset + pageHeightPx, canvas.height);
    const preferred = safeBreaks.filter((v) => v > offset && v <= hardLimit).pop();
    const sliceEnd = hardLimit === canvas.height ? canvas.height : (preferred || hardLimit);
    const sliceHeight = Math.max(1, sliceEnd - offset);

    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceHeight;
    const ctx = slice.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    if (added) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', PAGE.marginMm, PAGE.marginMm, contentWidthMm, sliceHeight / pxPerMm, undefined, 'FAST');
    added = true;
    offset = sliceEnd;
  }
};

/** Renders the shared invoice and saves it as a paginated A4 PDF. */
export const exportInvoicePdf = async ({ html, filename }) => {
  const node = mountOffscreen(html);
  try {
    await waitForImages(node);
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    paginateCanvas(canvas, node, pdf);
    pdf.save(filename);
    return true;
  } finally {
    node.remove();
  }
};

/** Opens the same document in the browser print dialog. */
export const printInvoiceHtml = ({ html, title = 'Tax Invoice' }) => {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return false;
  printWindow.document.write(`
    <html>
      <head>
        <title>${esc(title)}</title>
        <style>
          body { margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: A4; margin: 8mm; }
          [data-break] { page-break-inside: avoid; break-inside: avoid; }
          table, th, td { border-color: #333 !important; }
        </style>
      </head>
      <body>${html}
      <script>window.onload = () => setTimeout(() => window.print(), 400);</script>
      </body>
    </html>
  `);
  printWindow.document.close();
  return true;
};
