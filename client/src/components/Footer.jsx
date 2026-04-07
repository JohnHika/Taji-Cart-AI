import React from 'react';
import { FaEnvelope, FaInstagram, FaPhoneAlt, FaWhatsapp } from 'react-icons/fa';
import { FaLocationDot } from 'react-icons/fa6';
import { FaTiktok } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { nawiriBrand } from '../config/brand';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gradient-to-br from-ivory via-white to-blush-50 transition-colors dark:border-gray-700 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gold-200 dark:bg-white">
                <img src={nawiriBrand.logo} alt={nawiriBrand.shortName} className="h-16 w-auto object-contain" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{nawiriBrand.shortName}</h3>
                <p className="text-xs uppercase tracking-[0.2em] text-gold-700 dark:text-gold-300">Kenya</p>
              </div>
            </Link>
            <p className="max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">
              {nawiriBrand.motto} Premium hair, polished service, and a customer experience that feels as refined as the styles we deliver.
            </p>
            <div className="grid gap-3 text-sm text-gray-700 dark:text-gray-300">
              <a href={`tel:${nawiriBrand.phoneDial}`} className="flex items-start gap-3 hover:text-plum-700 dark:hover:text-plum-200">
                <FaPhoneAlt className="mt-1 text-gold-600" />
                <span>{nawiriBrand.phoneDisplay}</span>
              </a>
              <a href={`mailto:${nawiriBrand.email}`} className="flex items-start gap-3 hover:text-plum-700 dark:hover:text-plum-200">
                <FaEnvelope className="mt-1 text-gold-600" />
                <span>{nawiriBrand.email}</span>
              </a>
              <div className="flex items-start gap-3">
                <FaLocationDot className="mt-1 text-gold-600" />
                <span>{nawiriBrand.location}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-2xl">
              <a
                href={nawiriBrand.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 transition-colors hover:text-green-700"
                aria-label="WhatsApp"
              >
                <FaWhatsapp />
              </a>
              <a
                href={nawiriBrand.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 transition-colors hover:text-pink-700"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>
              <a
                href={nawiriBrand.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 transition-colors hover:text-gray-700 dark:text-white"
                aria-label="TikTok"
              >
                <FaTiktok />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-gray-600 transition-colors hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400">Home</Link></li>
              <li><Link to="/" className="text-gray-600 transition-colors hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400">All Products</Link></li>
              <li><Link to="/dashboard/community-perks" className="text-gray-600 transition-colors hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400">Community Perks</Link></li>
              <li><Link to="/dashboard/active-campaigns" className="text-gray-600 transition-colors hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400">Active Campaigns</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Customer Care</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/dashboard/myorders" className="text-gray-600 transition-colors hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400">My Orders</Link></li>
              <li><Link to="/dashboard/address" className="text-gray-600 transition-colors hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400">Saved Addresses</Link></li>
              <li><a href={`mailto:${nawiriBrand.email}`} className="text-gray-600 transition-colors hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400">Email Support</a></li>
              <li><a href={nawiriBrand.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 transition-colors hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400">WhatsApp Support</a></li>
            </ul>
          </div>

          <div className="rounded-3xl border border-gold-200/80 bg-white/80 p-5 shadow-sm dark:border-gold-500/20 dark:bg-gray-900/60">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-700 dark:text-gold-300">Find Us</p>
            <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">{nawiriBrand.location}</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Instagram <span className="font-semibold">{nawiriBrand.instagramHandle}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              TikTok <span className="font-semibold">{nawiriBrand.tiktokHandle}</span>
            </p>
            <a
              href={nawiriBrand.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex rounded-full bg-plum-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-plum-600"
            >
              Visit Website
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
          <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {year} {nawiriBrand.companyName}. All rights reserved.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm sm:justify-end">
              <Link to="/" className="text-gray-600 transition-colors hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400">Privacy</Link>
              <Link to="/" className="text-gray-600 transition-colors hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
