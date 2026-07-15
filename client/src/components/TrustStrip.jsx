import { FaCreditCard, FaHeadset, FaTruck } from 'react-icons/fa6';

const trustItems = [
  {
    icon: FaTruck,
    label: 'Delivery across Kenya',
  },
  {
    icon: FaCreditCard,
    label: 'M-Pesa & card payments',
  },
  {
    icon: FaHeadset,
    label: 'WhatsApp support',
  },
];

const TrustStrip = () => {
  return (
    <div className="border-y border-brown-200 bg-white dark:border-dm-border dark:bg-dm-card">
      <div className="container mx-auto px-4 py-3 sm:px-6">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:gap-x-10 lg:gap-x-16">
          {trustItems.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm text-brown-600 dark:text-white/60">
              <item.icon className="text-gold-600 dark:text-gold-300" size={16} aria-hidden="true" />
              <span className="font-medium">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TrustStrip;
