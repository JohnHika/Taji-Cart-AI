import { FaWhatsapp } from 'react-icons/fa';
import { useWhatsAppOrder } from '../provider/WhatsAppOrderProvider';

const WhatsAppOrderButton = ({ product, showText = false, className = '' }) => {
  const { items, addItem: addWhatsAppOrderItem } = useWhatsAppOrder();

  const quantityInOrder = items.find((item) => item._id === product?._id)?.quantity || 0;

  const handleAddItem = (event) => {
    event.preventDefault();
    event.stopPropagation();
    addWhatsAppOrderItem(product);
  };

  return (
    <button
      type="button"
      onClick={handleAddItem}
      className={`relative inline-flex items-center justify-center gap-2 rounded-lg border border-green-600 bg-white font-semibold text-green-700 transition-colors hover:bg-green-50 dark:border-green-500 dark:bg-dm-card dark:text-green-300 dark:hover:bg-green-950/30 ${className}`}
      aria-label={`Buy ${product?.name || 'product'} via WhatsApp${quantityInOrder > 0 ? ` (${quantityInOrder} in order)` : ''}`}
      title="Buy via WhatsApp"
    >
      <FaWhatsapp size={showText ? 17 : 16} />
      {showText && <span>Buy via WhatsApp</span>}
      {quantityInOrder > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-green-600 px-0.5 text-[9px] font-bold text-white dark:border-dm-card">
          {quantityInOrder}
        </span>
      )}
    </button>
  );
};

export default WhatsAppOrderButton;
