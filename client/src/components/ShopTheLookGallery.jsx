import React, { useEffect, useState } from 'react';
import { FaHeart, FaShoppingBag, FaInstagram, FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';

// Mock gallery data - this would come from a backend endpoint
const MOCK_GALLERY_ITEMS = [
  {
    id: 'gallery-1',
    image: '/assets/hair-logo.png',
    customerName: 'Sarah K.',
    location: 'Nairobi',
    productWorn: {
      id: 'prod-1',
      name: 'Premium Body Wave 20"',
      price: 8500,
      slug: 'premium-body-wave-20',
    },
    likes: 234,
    rating: 5,
    caption: 'Absolutely love this hair! So natural and soft. #NawiriHair',
    verified: true,
  },
  {
    id: 'gallery-2',
    image: '/assets/hair-logo.png',
    customerName: 'Michelle O.',
    location: 'Mombasa',
    productWorn: {
      id: 'prod-2',
      name: 'Deep Curly Bundle Set',
      price: 12000,
      slug: 'deep-curly-bundle-set',
    },
    likes: 189,
    rating: 5,
    caption: 'Best investment ever! The curls are so bouncy 💕',
    verified: true,
  },
  {
    id: 'gallery-3',
    image: '/assets/hair-logo.png',
    customerName: 'Grace W.',
    location: 'Kisumu',
    productWorn: {
      id: 'prod-3',
      name: 'Silky Straight 24"',
      price: 15000,
      slug: 'silky-straight-24',
    },
    likes: 312,
    rating: 5,
    caption: 'Got so many compliments! Thank you Nawiri Hair 🙌',
    verified: true,
  },
  {
    id: 'gallery-4',
    image: '/assets/hair-logo.png',
    customerName: 'Anne M.',
    location: 'Nakuru',
    productWorn: {
      id: 'prod-4',
      name: 'Ombre Blonde Bundle',
      price: 18000,
      slug: 'ombre-blonde-bundle',
    },
    likes: 276,
    rating: 5,
    caption: 'The quality is unmatched! Worth every shilling',
    verified: true,
  },
  {
    id: 'gallery-5',
    image: '/assets/hair-logo.png',
    customerName: 'Linda A.',
    location: 'Eldoret',
    productWorn: {
      id: 'prod-5',
      name: 'Kinky Curly Full Set',
      price: 14500,
      slug: 'kinky-curly-full-set',
    },
    likes: 198,
    rating: 5,
    caption: 'Finally found hair that matches my texture perfectly! 🔥',
    verified: true,
  },
  {
    id: 'gallery-6',
    image: '/assets/hair-logo.png',
    customerName: 'Betty N.',
    location: 'Thika',
    productWorn: {
      id: 'prod-6',
      name: 'Body Wave 3-Pack Deal',
      price: 22000,
      slug: 'body-wave-3-pack',
    },
    likes: 421,
    rating: 5,
    caption: 'The 3-pack deal was perfect! Full head coverage 👏',
    verified: true,
  },
];

function ShopTheLookGallery() {
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchGalleryItems();
  }, []);

  const fetchGalleryItems = async () => {
    try {
      // In production, this would call an actual API endpoint
      // const response = await Axios(SummaryApi.getGalleryItems);
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate loading
      setGalleryItems(MOCK_GALLERY_ITEMS);
    } catch (error) {
      console.error('Failed to fetch gallery items:', error);
      setGalleryItems(MOCK_GALLERY_ITEMS);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = (itemId) => {
    setGalleryItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, likes: item.likes + 1 }
          : item
      )
    );
  };

  const filteredItems = filter === 'all'
    ? galleryItems
    : galleryItems.filter(item => item.productWorn.slug.includes(filter));

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-100 dark:bg-gold-900/30 animate-pulse">
            <FaInstagram className="text-2xl text-gold-600" />
          </div>
          <h2 className="text-3xl font-bold text-charcoal dark:text-white mt-4">
            Loading Gallery...
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-brown-100 dark:bg-dm-surface rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-100 dark:bg-gold-900/30 mb-4">
          <FaInstagram className="text-2xl text-gold-600" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-charcoal dark:text-white mb-3">
          Shop the Look
        </h2>
        <p className="text-brown-500 max-w-2xl mx-auto">
          Real customers, real results. See how Nawiri Hair transforms looks across Kenya.
          Click on any photo to shop the exact product.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <button
          onClick={() => setFilter('all')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-gold-500 text-charcoal'
              : 'bg-brown-100 dark:bg-brown-800 text-brown-600 dark:text-brown-300 hover:bg-gold-100'
          }`}
        >
          All Looks
        </button>
        <button
          onClick={() => setFilter('body-wave')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            filter === 'body-wave'
              ? 'bg-gold-500 text-charcoal'
              : 'bg-brown-100 dark:bg-brown-800 text-brown-600 dark:text-brown-300 hover:bg-gold-100'
          }`}
        >
          Body Wave
        </button>
        <button
          onClick={() => setFilter('curly')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            filter === 'curly'
              ? 'bg-gold-500 text-charcoal'
              : 'bg-brown-100 dark:bg-brown-800 text-brown-600 dark:text-brown-300 hover:bg-gold-100'
          }`}
        >
          Curly
        </button>
        <button
          onClick={() => setFilter('straight')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            filter === 'straight'
              ? 'bg-gold-500 text-charcoal'
              : 'bg-brown-100 dark:bg-brown-800 text-brown-600 dark:text-brown-300 hover:bg-gold-100'
          }`}
        >
          Straight
        </button>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group bg-white dark:bg-dm-card rounded-xl overflow-hidden shadow-lg border border-brown-100 dark:border-dm-border hover:shadow-xl transition-shadow"
          >
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-brown-50 dark:bg-dm-surface">
              <div className="w-full h-full flex items-center justify-center text-8xl">
                💇‍♀️
              </div>

              {/* Shop Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Link
                  to={`/product/${item.productWorn.id}`}
                  className="bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold px-6 py-3 rounded-full flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform"
                >
                  <FaShoppingBag />
                  Shop This Look
                </Link>
              </div>

              {/* Verified Badge */}
              {item.verified && (
                <div className="absolute top-3 left-3 bg-white/90 dark:bg-dm-card/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-charcoal dark:text-white flex items-center gap-1">
                  ✓ Verified Customer
                </div>
              )}

              {/* Quick Product Info */}
              <div className="absolute bottom-3 left-3 right-3 bg-white/95 dark:bg-dm-card/95 backdrop-blur rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="font-semibold text-charcoal dark:text-white text-sm truncate">
                  {item.productWorn.name}
                </p>
                <p className="text-gold-600 dark:text-gold-400 font-bold text-sm">
                  KSh {item.productWorn.price.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Info Section */}
            <div className="p-4">
              {/* Caption */}
              <p className="text-brown-600 dark:text-brown-300 text-sm mb-3 line-clamp-2">
                {item.caption}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-3">
                {[...Array(item.rating)].map((_, i) => (
                  <FaStar key={i} className="text-gold-500 text-sm" />
                ))}
              </div>

              {/* Customer Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center text-sm font-semibold text-gold-600">
                    {item.customerName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal dark:text-white">
                      {item.customerName}
                    </p>
                    <p className="text-xs text-brown-500">{item.location}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleLike(item.id)}
                  className="flex items-center gap-1 text-brown-500 hover:text-red-500 transition-colors"
                >
                  <FaHeart className="text-sm" />
                  <span className="text-sm">{item.likes}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="mt-12 text-center">
        <div className="bg-gradient-to-r from-gold-100 to-gold-50 dark:from-gold-900/20 dark:to-gold-900/10 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-charcoal dark:text-white mb-2">
            Want to Be Featured?
          </h3>
          <p className="text-brown-500 mb-4">
            Share your Nawiri Hair look on Instagram with #NawiriHairGlow for a chance to be featured
          </p>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-charcoal font-semibold px-8 py-3 rounded-full transition-all shadow-lg hover:shadow-xl"
          >
            <FaInstagram />
            Share Your Look
          </a>
        </div>
      </div>
    </div>
  );
}

export default ShopTheLookGallery;
