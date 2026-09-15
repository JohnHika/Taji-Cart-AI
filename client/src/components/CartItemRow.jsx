/* eslint-disable react/prop-types */
import { FaMinus, FaPlus, FaTrash } from 'react-icons/fa';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';

// stock === null/undefined means untracked inventory — no badge shown for
// those, matching the product grid's own convention (SalesCounter.jsx).
const CartItemRow = ({ item, onIncrement, onDecrement, onRemove }) => {
  const hasStockInfo = item.stock != null;
  const isOutOfStock = hasStockInfo && item.stock <= 0;
  const isLowStock = hasStockInfo && item.stock > 0 && item.stock <= 5;
  // item.stock is the total available, not "left after this cart line" —
  // same number the +1 cap check (updateQty) already compares against, so
  // this badge and that toast never disagree.
  const atStockCap = hasStockInfo && item.quantity >= item.stock;

  return (
    <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 rounded-xl border border-brown-100 bg-plum-50/40 p-3 shadow-sm dark:border-dm-border dark:bg-dm-card-2">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white dark:bg-dm-border">
        {item.image?.[0] ? (
          <img
            src={item.image[0]}
            alt={item.name}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <span>🛍️</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{item.name}</p>
            <p className="text-xs text-brown-500 dark:text-white/50 flex flex-wrap items-center gap-1.5">
              {DisplayPriceInShillings(item.effectivePrice)} each
              {item.wholesaleApplied && (
                <span className="text-[10px] font-medium text-gold-700 dark:text-gold-300 bg-gold-100/70 dark:bg-gold-600/15 px-1.5 py-0.5 rounded">
                  Wholesale
                </span>
              )}
              {hasStockInfo && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    isOutOfStock
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                      : isLowStock
                        ? 'bg-gold-100/70 text-gold-700 dark:bg-gold-600/15 dark:text-gold-300'
                        : 'bg-brown-100 text-brown-600 dark:bg-dm-border dark:text-white/60'
                  }`}
                >
                  {isOutOfStock ? 'Out of stock' : `${item.stock} in stock`}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => onRemove(item._id)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
            aria-label={`Remove ${item.name} from basket`}
          >
            <FaTrash size={14} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm font-bold tabular-nums text-plum-700 dark:text-gold-300">
            {DisplayPriceInShillings(item.effectivePrice * item.quantity)}
          </p>
          <div className="flex items-center rounded-lg border border-brown-200 bg-white p-0.5 dark:border-dm-border dark:bg-dm-card">
            <button
              onClick={() => onDecrement(item._id)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-brown-700 transition-colors hover:bg-brown-100 dark:text-white/70 dark:hover:bg-dm-border"
              aria-label={`Decrease ${item.name} quantity`}
            >
              <FaMinus size={12} />
            </button>
            <span className="w-8 text-center text-sm font-bold tabular-nums" aria-label={`${item.quantity} ${item.name}`}>
              {item.quantity}
            </span>
            <button
              onClick={() => onIncrement(item._id)}
              disabled={atStockCap}
              title={atStockCap ? `Only ${item.stock} of ${item.name} in stock` : undefined}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors ${
                atStockCap ? 'cursor-not-allowed bg-brown-300 dark:bg-dm-border' : 'bg-gold-500 hover:bg-gold-600'
              }`}
              aria-label={`Increase ${item.name} quantity`}
            >
              <FaPlus size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItemRow;
