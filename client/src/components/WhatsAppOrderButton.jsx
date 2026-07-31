import { FaWhatsapp } from 'react-icons/fa';
import { useWhatsAppOrder } from '../provider/WhatsAppOrderProvider';

const WhatsAppOrderButton = ({ product, showText = false, className = '' }) => {
  const { addItem: addWhatsAppOrderItem } = useWhatsAppOrder();

  const handleAddItem = (event) => {
    event.preventDefault();
    event.stopPropagation();
    addWhatsAppOrderItem(product);
  };

  return (
    <button
      type="button"
      onClick={handleAddItem}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-green-600 bg-white font-semibold text-green-700 transition-colors hover:bg-green-50 dark:border-green-500 dark:bg-dm-card dark:text-green-300 dark:hover:bg-green-950/30 ${className}`}
      aria-label={`Buy ${product?.name || 'product'} via WhatsApp`}
      title="Buy via WhatsApp"
    >
      <FaWhatsapp size={showText ? 17 : 16} />
      {showText && <span>Buy via WhatsApp</span>}
    </button>
  );
};

export default WhatsAppOrderButton;
