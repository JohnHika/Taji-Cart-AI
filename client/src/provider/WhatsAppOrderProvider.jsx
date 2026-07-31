import { createContext, useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { pricewithDiscount } from '../utils/PriceWithDiscount';

const WhatsAppOrderContext = createContext(null);

export const WhatsAppOrderProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = (product) => {
    const price = pricewithDiscount(product?.price, product?.discount);

    if (!product?._id || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      toast.error('This product cannot be added to a WhatsApp order yet.');
      return;
    }

    setItems((previousItems) => {
      const existingItem = previousItems.find((item) => item._id === product._id);
      if (existingItem) {
        return previousItems.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...previousItems,
        {
          _id: product._id,
          name: product.name,
          sku: product.sku || product.barcode || '',
          image: Array.isArray(product.image) ? product.image[0] : product.image,
          price: Number(price),
          quantity: 1,
        },
      ];
    });
    toast.success(`${product.name} added to your WhatsApp order.`);
  };

  const updateItemQuantity = (productId, delta) => {
    setItems((previousItems) =>
      previousItems
        .map((item) =>
          item._id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId) => {
    setItems((previousItems) => previousItems.filter((item) => item._id !== productId));
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <WhatsAppOrderContext.Provider
      value={{
        items,
        itemCount,
        isOpen,
        addItem,
        updateItemQuantity,
        removeItem,
        clearItems: () => setItems([]),
        setIsOpen,
      }}
    >
      {children}
    </WhatsAppOrderContext.Provider>
  );
};

export const useWhatsAppOrder = () => {
  const context = useContext(WhatsAppOrderContext);
  if (!context) {
    throw new Error('useWhatsAppOrder must be used inside WhatsAppOrderProvider.');
  }
  return context;
};
