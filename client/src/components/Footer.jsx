import React, { useState } from 'react';
import { FaWhatsapp, FaFacebook, FaInstagram } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa6";
import { FiMail, FiArrowRight } from "react-icons/fi";
import { Link } from 'react-router-dom';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  const shopLinks = [
    { label: 'All Products', path: '/' },
    { label: 'Hair Extensions', path: '/' },
    { label: 'Wigs & Closures', path: '/' },
    { label: 'Hair Care', path: '/' },
    { label: 'Tools & Accessories', path: '/' },
    { label: 'Active Campaigns', path: '/campaigns' },
  ];

  const helpLinks = [
    { label: 'My Orders', path: '/dashboard/myorders' },
    { label: 'Track Order', path: '/dashboard/myorders' },
    { label: 'Loyalty Program', path: '/dashboard/loyalty-program' },
    { label: 'Contact Us', path: '/' },
    { label: 'Returns & Exchanges', path: '/' },
    { label: 'FAQs', path: '/' },
  ];

  return (
    <footer className="bg-plum-900 text-white mt-12">
      {/* Main Footer Grid */}
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Col 1: Brand */}
          <div>
            <h3 className="font-display text-2xl font-semibold text-gold-300 italic mb-2">
              Nawiri Hair
            </h3>
            <p className="text-white/60 text-sm leading-relaxed mb-5">
              Celebrating natural beauty and self-expression through premium hair products, curated for every style and texture.
            </p>
            <div className="flex items-center gap-4 text-xl">
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-gold-300 transition-colors"
                aria-label="WhatsApp"
              >
                <FaWhatsapp />
              </a>
              <a
                href="https://www.instagram.com/nawiri_hairke/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-gold-300 transition-colors"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>
              <a
                href="https://www.tiktok.com/discover/nawiri-hair-kenya"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-gold-300 transition-colors"
                aria-label="TikTok"
              >
                <FaTiktok />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-gold-300 transition-colors"
                aria-label="Facebook"
              >
                <FaFacebook />
              </a>
            </div>
          </div>

          {/* Col 2: Shop Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-blush-400 mb-4">Shop</h4>
            <ul className="space-y-2.5">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-white/60 hover:text-gold-300 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Help Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-blush-400 mb-4">Help</h4>
            <ul className="space-y-2.5">
              {helpLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-white/60 hover:text-gold-300 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-blush-400 mb-4">Stay in the Loop</h4>
            <p className="text-white/60 text-sm mb-4 leading-relaxed">
              Get exclusive deals, new arrivals, and hair care tips delivered to your inbox.
            </p>
            {subscribed ? (
              <div className="bg-plum-800 rounded-card p-4 text-center">
                <p className="text-gold-300 font-semibold text-sm">You're subscribed!</p>
                <p className="text-white/50 text-xs mt-1">Welcome to the Nawiri family ✨</p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-plum-800 border border-plum-600 rounded-pill px-3 py-2 focus-within:border-gold-400 transition-colors">
                  <FiMail className="text-white/40 flex-shrink-0" size={15} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-transparent text-white placeholder:text-white/30 text-sm flex-1 outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold text-sm py-2.5 rounded-pill transition-colors press"
                >
                  Subscribe <FiArrowRight size={15} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-plum-700">
        <div className="container mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/40 text-xs">
            © {new Date().getFullYear()} Nawiri Hair. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {/* Payment method labels */}
            <span className="text-xs text-white/40">We accept:</span>
            <span className="text-xs font-semibold bg-plum-800 text-gold-300 px-2 py-0.5 rounded">M-Pesa</span>
            <span className="text-xs font-semibold bg-plum-800 text-white/60 px-2 py-0.5 rounded">Visa</span>
            <span className="text-xs font-semibold bg-plum-800 text-white/60 px-2 py-0.5 rounded">Stripe</span>
            <span className="text-xs font-semibold bg-plum-800 text-white/60 px-2 py-0.5 rounded">PesaPal</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
