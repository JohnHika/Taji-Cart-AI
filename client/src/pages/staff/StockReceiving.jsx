import { useCallback, useEffect, useState } from 'react';
import { FaBoxes, FaCheckCircle, FaExclamationTriangle, FaSync } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Axios from '../../utils/Axios';
import hasStaffPermission from '../../utils/hasStaffPermission';
import { MAX_TRANSFER_QUANTITY, isValidStockTransferQuantity } from '../../utils/stockTransfer';

const shell = 'rounded-[26px] border border-white/80 bg-white/95 shadow-[0_22px_55px_-34px_rgba(52,13,48,0.48)] backdrop-blur dark:border-dm-border dark:bg-dm-card';
const inputClass = 'min-h-[44px] w-full rounded-xl border border-brown-200 bg-white px-3 text-sm font-bold text-charcoal outline-none transition focus:border-plum-500 dark:border-dm-border dark:bg-dm-card-2 dark:text-white';
const labelClass = 'text-[10px] font-black uppercase tracking-[0.16em] text-brown-400 dark:text-white/40';

const initialReceipt = (transfer) => ({
  lines: transfer.lines.map((line) => ({
    productId: String(line.product),
    receivedQuantity: line.receivedQuantity === null || line.receivedQuantity === undefined ? '' : String(line.receivedQuantity),
    receiptNote: line.receiptNote || '',
  })),
  receiptNote: transfer.receiptNote || '',
});

const quantityValue = (value) => isValidStockTransferQuantity(value, { allowZero: true }) ? Number(value) : null;

const StockReceiving = () => {
  const user = useSelector((state) => state.user);
  const allowed = hasStaffPermission(user, 'stock.receive');
  const [transfers, setTransfers] = useState([]);
  const [receipts, setReceipts] = useState({});
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState('');

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await Axios({ method: 'GET', url: '/api/stock-transfers/staff/transfers/pending', params: { limit: 50 } });
      const nextTransfers = response.data?.data || [];
      setTransfers(nextTransfers);
      setReceipts((current) => Object.fromEntries(nextTransfers.map((transfer) => [transfer._id, current[transfer._id] || initialReceipt(transfer)])));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load stock receiving queue.');
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => { load(); }, [load]);

  const updateReceiptLine = (transferId, productId, value) => {
    setReceipts((current) => ({
      ...current,
      [transferId]: {
        ...(current[transferId] || { lines: [], receiptNote: '' }),
        lines: (current[transferId]?.lines || []).map((line) => line.productId === productId ? { ...line, receivedQuantity: value } : line),
      },
    }));
  };

  const updateReceiptNote = (transferId, value) => {
    setReceipts((current) => ({
      ...current,
      [transferId]: { ...(current[transferId] || { lines: [] }), receiptNote: value },
    }));
  };

  const submitReceipt = async (transfer, finalize) => {
    const receipt = receipts[transfer._id] || initialReceipt(transfer);
    const lines = receipt.lines.map((line) => ({ ...line, receivedQuantity: quantityValue(line.receivedQuantity) }));
    if (lines.some((line) => line.receivedQuantity === null || !isValidStockTransferQuantity(line.receivedQuantity, { allowZero: true }))) {
      toast.error(`Enter a whole-number quantity between 0 and ${MAX_TRANSFER_QUANTITY.toLocaleString()} for every product.`);
      return;
    }
    const hasDifference = lines.some((line) => {
      const dispatched = transfer.lines.find((item) => String(item.product) === line.productId)?.dispatchedQuantity || 0;
      return line.receivedQuantity !== dispatched;
    });
    const hasReceiptNote = Boolean(String(receipt.receiptNote || '').trim() || lines.some((line) => String(line.receiptNote || '').trim()));
    const hasOverage = lines.some((line) => {
      const dispatched = transfer.lines.find((item) => String(item.product) === line.productId)?.dispatchedQuantity || 0;
      return line.receivedQuantity > dispatched;
    });
    if ((finalize || hasOverage) && hasDifference && !hasReceiptNote) {
      toast.error('Add a note explaining the difference before confirming.');
      return;
    }

    setActingId(transfer._id);
    try {
      const response = await Axios({
        method: 'POST',
        url: `/api/stock-transfers/staff/transfers/${transfer._id}/receive`,
        data: { lines, finalize, receiptNote: String(receipt.receiptNote || '').trim() },
      });
      const updated = response.data?.data;
      toast.success(updated?.status === 'disputed' ? 'Difference submitted for admin review.' : (finalize ? 'Stock receipt confirmed.' : 'Partial receipt saved.'));
      if (updated?.status === 'partially_received') {
        setTransfers((current) => current.map((item) => item._id === transfer._id ? updated : item));
        setReceipts((current) => ({ ...current, [transfer._id]: initialReceipt(updated) }));
      } else {
        setTransfers((current) => current.filter((item) => item._id !== transfer._id));
        setReceipts((current) => { const next = { ...current }; delete next[transfer._id]; return next; });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Stock receipt could not be recorded.');
    } finally {
      setActingId('');
    }
  };

  const totalsFor = (transfer) => {
    const receipt = receipts[transfer._id] || initialReceipt(transfer);
    return transfer.lines.reduce((totals, line) => {
      const entered = receipt.lines.find((item) => item.productId === String(line.product));
      const received = entered?.receivedQuantity === '' || entered?.receivedQuantity === undefined ? null : Number(entered.receivedQuantity);
      return {
        dispatched: totals.dispatched + Number(line.dispatchedQuantity || 0),
        received: totals.received + (Number.isFinite(received) ? received : 0),
        complete: totals.complete && isValidStockTransferQuantity(received, { allowZero: true }),
      };
    }, { dispatched: 0, received: 0, complete: true });
  };

  const openCount = transfers.length;
  const totalUnits = transfers.reduce((total, transfer) => total + totalsFor(transfer).dispatched, 0);

  if (!allowed) {
    return <main className="container mx-auto px-4 py-8"><section className={`${shell} p-6`}><p className={labelClass}>Stock receiving</p><h1 className="mt-2 text-2xl font-black text-charcoal dark:text-white">Permission required</h1><p className="mt-2 max-w-xl text-sm leading-6 text-brown-500 dark:text-white/55">An administrator must grant Stock receiving before this account can view or confirm store transfers.</p></section></main>;
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <section className="relative overflow-hidden rounded-[30px] bg-[#260c28] px-5 py-6 text-white shadow-[0_28px_60px_-32px_rgba(40,8,41,0.9)] sm:px-7">
        <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold-300">Stock receiving</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Count what arrived before it goes on sale.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Compare every delivery against the admin’s dispatch. Matching quantities go to shop stock; differences stay visible for review.</p></div>
          <div className="grid grid-cols-2 gap-2"><div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Open transfers</p><p className="mt-1 text-xl font-black">{openCount}</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Units expected</p><p className="mt-1 text-xl font-black">{totalUnits}</p></div></div>
        </div>
      </section>

      <div className="mt-5 flex justify-end"><button type="button" onClick={load} disabled={loading} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-brown-200 px-4 py-2 text-sm font-bold text-brown-700 transition hover:border-plum-400 hover:text-plum-700 disabled:opacity-50 dark:border-dm-border dark:text-white/70"><FaSync className={loading ? 'animate-spin' : ''} size={12} /> Refresh queue</button></div>

      <div className="mt-4 space-y-5">
        {loading && <section className={`${shell} p-6 text-sm text-brown-500`}>Loading transfers…</section>}
        {!loading && transfers.length === 0 && <section className={`${shell} p-8 text-center`}><FaCheckCircle className="mx-auto text-3xl text-emerald-500" /><h2 className="mt-3 text-lg font-black text-charcoal dark:text-white">Nothing waiting for confirmation</h2><p className="mt-1 text-sm text-brown-500">New admin releases will appear here for your branch.</p></section>}
        {!loading && transfers.map((transfer) => {
          const totals = totalsFor(transfer);
          const receipt = receipts[transfer._id] || initialReceipt(transfer);
          const difference = totals.received - totals.dispatched;
          const hasLineDifference = transfer.lines.some((line) => {
            const entered = receipt.lines.find((item) => item.productId === String(line.product));
            const received = entered?.receivedQuantity === '' || entered?.receivedQuantity === undefined ? null : quantityValue(entered.receivedQuantity);
            return received !== null && received !== line.dispatchedQuantity;
          });
          const busy = actingId === transfer._id;
          return <section key={transfer._id} className={`${shell} overflow-hidden`}>
            <div className="border-b border-brown-100 p-5 dark:border-dm-border"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black text-charcoal dark:text-white">{transfer.number}</h2><span className="rounded-full bg-gold-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-gold-800 dark:bg-gold-900/20 dark:text-gold-200">{transfer.status.replaceAll('_', ' ')}</span></div><p className="mt-1 text-xs text-brown-500">{transfer.destinationBranch} · released {new Date(transfer.releasedAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })} by {transfer.releasedBy?.name || 'Admin'}</p></div><div className="rounded-xl bg-ivory px-3 py-2 text-xs font-bold text-brown-700 dark:bg-dm-card-2 dark:text-white/70">{totals.received} / {totals.dispatched} units counted</div></div>{transfer.notes && <p className="mt-3 rounded-xl bg-ivory px-3 py-2 text-xs text-brown-600 dark:bg-dm-card-2 dark:text-white/60">Admin note: {transfer.notes}</p>}</div>
            <div className="space-y-4 p-5">
              <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-[10px] uppercase tracking-wide text-brown-400"><tr><th className="pb-2">Product</th><th className="pb-2 text-right">Dispatched</th><th className="pb-2 text-right">Received physically</th><th className="pb-2 text-right">Difference</th></tr></thead><tbody>{transfer.lines.map((line) => { const entered = receipt.lines.find((item) => item.productId === String(line.product)); const value = entered?.receivedQuantity ?? ''; const numeric = value === '' ? null : Number(value); const variance = numeric === null || !Number.isFinite(numeric) ? null : numeric - line.dispatchedQuantity; return <tr key={`${transfer._id}-${line.product}`} className="border-t border-brown-100 dark:border-dm-border"><td className="py-3 font-bold text-charcoal dark:text-white">{line.productName}<span className="ml-2 text-xs font-normal text-brown-400">{line.sku || ''}</span></td><td className="py-3 text-right font-black text-charcoal dark:text-white">{line.dispatchedQuantity}</td><td className="w-40 py-2"><input aria-label={`Received quantity for ${line.productName}`} type="number" min="0" max={MAX_TRANSFER_QUANTITY} step="1" value={value} onChange={(event) => updateReceiptLine(transfer._id, String(line.product), event.target.value)} className={inputClass} placeholder="Count" /></td><td className={`py-3 text-right font-black ${variance === 0 ? 'text-emerald-600' : (variance < 0 ? 'text-red-600' : (variance > 0 ? 'text-amber-600' : 'text-brown-400'))}`}>{variance === null ? '—' : `${variance > 0 ? '+' : ''}${variance}`}</td></tr>; })}</tbody></table></div>
              <div className="flex flex-col gap-3 rounded-2xl bg-ivory p-4 dark:bg-dm-card-2 sm:flex-row sm:items-center sm:justify-between"><div><p className={labelClass}>Receipt math</p><p className="mt-1 text-sm font-black text-charcoal dark:text-white">{totals.received} received − {totals.dispatched} dispatched = <span className={difference === 0 ? 'text-emerald-600' : 'text-red-600'}>{difference > 0 ? '+' : ''}{difference}</span></p><p className="mt-1 text-xs text-brown-500">{hasLineDifference ? 'A line-level difference will be reviewed.' : 'Everything matches.'}</p></div><FaBoxes className="hidden text-2xl text-plum-500 sm:block" /></div>
              <textarea aria-label={`Receipt note for ${transfer.number}`} value={receipt.receiptNote || ''} onChange={(event) => updateReceiptNote(transfer._id, event.target.value)} maxLength="500" rows="2" placeholder="Optional for a partial receipt; required when the final count differs" className="w-full rounded-xl border border-brown-200 bg-white p-3 text-sm outline-none focus:border-plum-500 dark:border-dm-border dark:bg-dm-card-2 dark:text-white" />
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy || !totals.complete} onClick={() => submitReceipt(transfer, false)} className="min-h-[44px] rounded-xl border border-plum-200 px-4 py-2.5 text-sm font-bold text-plum-700 transition hover:bg-plum-50 disabled:opacity-50 dark:text-plum-200">Save partial receipt</button><button type="button" disabled={busy || !totals.complete} onClick={() => submitReceipt(transfer, true)} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-plum-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-plum-800 disabled:opacity-50">{hasLineDifference ? <FaExclamationTriangle size={13} /> : <FaCheckCircle size={13} />}{busy ? 'Saving…' : (hasLineDifference ? 'Submit difference' : 'Confirm receipt')}</button></div>
            </div>
          </section>;
        })}
      </div>
    </main>
  );
};

export default StockReceiving;
