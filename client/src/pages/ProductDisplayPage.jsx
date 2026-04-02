import React, { useEffect, useRef, useState } from 'react'
import { FaAngleLeft, FaAngleRight, FaStar, FaShieldAlt, FaTruck, FaTags } from "react-icons/fa"
import { FiShoppingBag, FiHeart } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import image2 from '../assets/Best_Prices_Offers.png'
import image1 from '../assets/minute_delivery.png'
import image3 from '../assets/Wide_Assortment.png'
import SummaryApi from '../common/SummaryApi'
import AddToCartButton from '../components/AddToCartButton'
import StarRating from '../components/StarRating'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings'
import { pricewithDiscount } from '../utils/PriceWithDiscount'

const TABS = ['Description', 'Details', 'Reviews'];

const StockBadge = ({ stock }) => {
  if (stock === 0) return (
    <span className="inline-flex items-center gap-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold px-3 py-1.5 rounded-pill">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Out of Stock
    </span>
  );
  if (stock < 5) return (
    <span className="inline-flex items-center gap-1.5 bg-gold-100 dark:bg-gold-600/20 text-gold-600 dark:text-gold-300 text-xs font-semibold px-3 py-1.5 rounded-pill">
      <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" /> Only {stock} left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold px-3 py-1.5 rounded-pill">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> In Stock
    </span>
  );
};

const ProductDisplayPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const productParam = params.productId || '';
  const productId = productParam.split('-').pop();

  const [data, setData] = useState({ name: "", image: [] });
  const [image, setImage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Description');
  const imageContainer = useRef();

  const user = useSelector(state => state.user);
  const userIsAdmin = user?.role === 'admin';
  const isLoggedIn = !!user?._id;

  const [ratingData, setRatingData] = useState([]);
  const [userRating, setUserRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingUsers, setRatingUsers] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  const handleRate = async (star) => {
    if (!isLoggedIn) { toast.info("Please login to rate this product"); return; }
    try {
      setRatingSubmitting(true);
      const response = await Axios({
        ...SummaryApi.rateProduct,
        data: { productId, rating: star, userId: user._id }
      });
      if (response.data.success) {
        toast.success("Thank you for your rating!");
        setUserRating(star);
        fetchProductDetails();
      } else {
        toast.error(response.data.message || "Failed to submit rating");
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error("Rating service temporarily unavailable.");
      } else {
        AxiosToastError(error);
      }
    } finally {
      setRatingSubmitting(false);
    }
  };

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!productId) { setError('Product ID not found in URL'); return; }
      const response = await Axios({ ...SummaryApi.getProductDetails, data: { productId } });
      const { data: responseData } = response;
      if (responseData.success) {
        setData(responseData.data);
        const ratings = responseData.data.ratings || [];
        setRatingData(ratings);
        setRatingCount(ratings.length);
        if (ratings.length > 0) {
          setAverageRating(ratings.reduce((s, i) => s + (i.rating || 0), 0) / ratings.length);
        }
        if (responseData.data.ratingUsers) setRatingUsers(responseData.data.ratingUsers);
        if (isLoggedIn && responseData.data.userRating) setUserRating(responseData.data.userRating);
      } else {
        setError(responseData.message || 'Failed to load product');
      }
    } catch (error) {
      AxiosToastError(error);
      setError('An error occurred while loading the product.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) fetchProductDetails();
    else setError('Invalid product URL');
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-ivory dark:bg-dm-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-plum-700 border-t-transparent animate-spin" />
          <p className="text-sm text-brown-400 font-display italic">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-5 bg-ivory dark:bg-dm-surface">
        <div className="max-w-sm w-full bg-white dark:bg-dm-card rounded-card shadow-card p-7 text-center">
          <div className="w-14 h-14 rounded-full bg-blush-100 dark:bg-blush-500/20 flex items-center justify-center mx-auto mb-4">
            <FaShieldAlt size={24} className="text-blush-500" />
          </div>
          <h1 className="text-xl font-semibold text-charcoal dark:text-white mb-2">Product Not Found</h1>
          <p className="text-sm text-brown-400 mb-5">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-plum-700 hover:bg-plum-600 text-white font-semibold px-6 py-2.5 rounded-pill text-sm transition-colors press"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (!data.image || data.image.length === 0) {
    data.image = ['https://via.placeholder.com/400?text=No+Image'];
  }

  const discountedPrice = pricewithDiscount(data.price, data.discount);
  const hasDiscount = data.discount > 0;

  return (
    <div className="bg-ivory dark:bg-dm-surface min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-6 sm:py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-brown-400 dark:text-white/40 mb-5">
          <Link to="/" className="hover:text-plum-700 transition-colors">Home</Link>
          <span>/</span>
          {data.category?.[0]?.name && (
            <>
              <span className="hover:text-plum-700 transition-colors cursor-pointer">
                {data.category[0].name}
              </span>
              <span>/</span>
            </>
          )}
          <span className="text-charcoal dark:text-white/70 line-clamp-1">{data.name}</span>
        </nav>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">

          {/* ── Left: Image Gallery ──────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            {/* Main image */}
            <div className="relative bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border shadow-card overflow-hidden">
              <div className="aspect-square">
                <img
                  src={data.image[image]}
                  alt={data.name}
                  className="w-full h-full object-contain p-4 transition-opacity duration-300"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/400?text=No+Image'; }}
                />
              </div>
              {hasDiscount && (
                <div className="absolute top-3 left-3 bg-gold-500 text-charcoal text-xs font-bold font-price px-2.5 py-1 rounded-pill shadow-sm">
                  {data.discount}% OFF
                </div>
              )}
            </div>

            {/* Dots (mobile) */}
            {data.image.length > 1 && (
              <div className="flex items-center justify-center gap-2 sm:hidden">
                {data.image.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImage(i)}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${i === image ? 'bg-plum-700 w-3' : 'bg-brown-200 dark:bg-dm-border'}`}
                  />
                ))}
              </div>
            )}

            {/* Thumbnail strip (desktop) */}
            {data.image.length > 1 && (
              <div className="relative hidden sm:flex items-center gap-2">
                <button
                  onClick={() => imageContainer.current?.scrollBy({ left: -100, behavior: 'smooth' })}
                  className="flex-shrink-0 w-7 h-7 bg-white dark:bg-dm-card border border-brown-100 dark:border-dm-border rounded-full flex items-center justify-center shadow-sm hover:shadow-card text-plum-700 dark:text-plum-200 transition-all"
                >
                  <FaAngleLeft size={12} />
                </button>
                <div ref={imageContainer} className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth flex-1">
                  {data.image.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImage(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all duration-200 ${i === image ? 'border-plum-700 shadow-plum' : 'border-brown-100 dark:border-dm-border hover:border-plum-300'}`}
                    >
                      <img src={img} alt={`thumb ${i + 1}`} className="w-full h-full object-contain" onError={(e) => { e.target.src = 'https://via.placeholder.com/100'; }} />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => imageContainer.current?.scrollBy({ left: 100, behavior: 'smooth' })}
                  className="flex-shrink-0 w-7 h-7 bg-white dark:bg-dm-card border border-brown-100 dark:border-dm-border rounded-full flex items-center justify-center shadow-sm hover:shadow-card text-plum-700 dark:text-plum-200 transition-all"
                >
                  <FaAngleRight size={12} />
                </button>
              </div>
            )}
          </div>

          {/* ── Right: Product Info ──────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Category chip */}
            {data.category?.[0]?.name && (
              <span className="text-xs w-fit bg-plum-100 dark:bg-plum-900/40 text-plum-700 dark:text-plum-200 px-3 py-1 rounded-pill font-medium">
                {data.category[0].name}
              </span>
            )}

            {/* Product name */}
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-charcoal dark:text-white leading-snug">
              {data.name}
            </h1>

            {/* Unit */}
            {data.unit && (
              <p className="text-sm text-brown-400 dark:text-white/50">
                {typeof data.unit === 'string' ? data.unit : data.unit[0]?.name || ''}
              </p>
            )}

            {/* Rating summary */}
            {ratingCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <FaStar key={s} size={14} className={s <= Math.round(averageRating) ? 'text-gold-500' : 'text-brown-200 dark:text-dm-border'} />
                  ))}
                </div>
                <span className="text-sm font-semibold text-charcoal dark:text-white">{averageRating.toFixed(1)}</span>
                <span className="text-xs text-brown-400 dark:text-white/40">({ratingCount} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold font-price text-gold-600 dark:text-gold-300">
                {DisplayPriceInShillings(discountedPrice)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-brown-300 dark:text-white/30 line-through font-price">
                  {DisplayPriceInShillings(data.price)}
                </span>
              )}
            </div>

            {/* Stock */}
            <StockBadge stock={data.stock} />

            {/* Admin inventory alert */}
            {data.stock < 5 && data.stock > 0 && userIsAdmin && (
              <div className="bg-gold-100 dark:bg-gold-600/10 border border-gold-300 dark:border-gold-600/30 rounded-card p-3 text-xs text-gold-700 dark:text-gold-300">
                <strong>Inventory Alert:</strong> Only {data.stock} units remaining. Consider restocking.
              </div>
            )}

            {/* Add to cart / OOS */}
            <div className="flex flex-col sm:flex-row gap-3 mt-1">
              {data.stock > 0 ? (
                <>
                  <div className="flex-1">
                    <AddToCartButton data={data} />
                  </div>
                  <button className="flex items-center justify-center gap-2 border border-plum-200 dark:border-plum-700 text-plum-700 dark:text-plum-200 hover:bg-plum-50 dark:hover:bg-plum-900/30 rounded-pill py-2.5 px-5 text-sm font-semibold transition-colors flex-shrink-0">
                    <FiHeart size={16} /> Wishlist
                  </button>
                </>
              ) : (
                <div className="w-full text-center py-3 bg-brown-100 dark:bg-dm-card-2 text-brown-400 dark:text-white/30 rounded-pill text-sm font-semibold">
                  Out of Stock
                </div>
              )}
            </div>

            {/* Why shop strip */}
            <div className="grid grid-cols-3 gap-2 bg-plum-100 dark:bg-plum-900/20 rounded-card p-3 mt-1">
              {[
                { icon: FaTruck, label: 'Fast Delivery' },
                { icon: FaTags, label: 'Best Price' },
                { icon: FaShieldAlt, label: 'Authentic' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 text-center">
                  <Icon size={16} className="text-plum-700 dark:text-plum-300" />
                  <span className="text-xs text-charcoal dark:text-white/70 font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* Tabs: Description / Details / Reviews */}
            <div className="mt-2">
              <div className="flex border-b border-brown-100 dark:border-dm-border">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                      activeTab === tab
                        ? 'text-plum-700 dark:text-plum-200 border-b-2 border-plum-700 dark:border-plum-400 -mb-px'
                        : 'text-brown-400 dark:text-white/40 hover:text-plum-500 dark:hover:text-plum-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="py-4 text-sm text-charcoal dark:text-white/80 leading-relaxed">
                {activeTab === 'Description' && (
                  <p>{data.description || 'No description available for this product.'}</p>
                )}
                {activeTab === 'Details' && (
                  data?.more_details && Object.keys(data.more_details).length > 0 ? (
                    <dl className="divide-y divide-brown-100 dark:divide-dm-border">
                      {Object.entries(data.more_details).map(([key, value]) => (
                        <div key={key} className="flex py-2 gap-4">
                          <dt className="w-1/3 text-brown-400 dark:text-white/40 font-medium">{key}</dt>
                          <dd className="flex-1 text-charcoal dark:text-white/80">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-brown-400 dark:text-white/40">No additional details available.</p>
                  )
                )}
                {activeTab === 'Reviews' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-charcoal dark:text-white">Rate this Product</h4>
                      {ratingCount > 0 && (
                        <span className="text-xs text-brown-400 dark:text-white/40">
                          {ratingCount} {ratingCount === 1 ? 'review' : 'reviews'}
                        </span>
                      )}
                    </div>
                    {ratingSubmitting ? (
                      <div className="flex justify-center py-3">
                        <div className="w-6 h-6 rounded-full border-2 border-plum-700 border-t-transparent animate-spin" />
                      </div>
                    ) : (
                      <StarRating ratingData={ratingData} onRate={handleRate} userRating={userRating} />
                    )}
                    {!isLoggedIn && (
                      <p className="text-xs text-brown-400 dark:text-white/40 mt-2">
                        Please <Link to="/login" className="text-plum-700 dark:text-plum-200 underline">login</Link> to rate this product.
                      </p>
                    )}
                    {ratingUsers.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {ratingUsers.slice(0, 5).map((u, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs">
                            <div className="w-6 h-6 rounded-full bg-plum-100 dark:bg-plum-900/40 text-plum-700 dark:text-plum-200 flex items-center justify-center font-semibold text-xs">
                              {(u.name || 'A')[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-charcoal dark:text-white/80">{u.name || 'Anonymous'}</span>
                            <div className="flex items-center gap-0.5 ml-auto">
                              {[1,2,3,4,5].map(s => (
                                <FaStar key={s} size={10} className={s <= u.rating ? 'text-gold-500' : 'text-brown-200'} />
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Why Shop Section ─────────────────────────────────────── */}
        <div className="mt-12 mb-6">
          <h2 className="text-lg font-semibold text-charcoal dark:text-white mb-5 text-center">
            Why shop from <span className="font-display italic text-plum-700 dark:text-plum-200">Nawiri Hair</span>?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { img: image1, title: 'Superfast Delivery', desc: 'Get your order delivered to your doorstep at the earliest from stores near you.' },
              { img: image2, title: 'Best Prices & Offers', desc: 'Best price destination with offers directly from the manufacturers.' },
              { img: image3, title: 'Wide Assortment', desc: 'Choose from hundreds of hair products across textures, styles, and care needs.' },
            ].map(({ img, title, desc }) => (
              <div key={title} className="bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border shadow-card p-5 flex flex-col items-center text-center">
                <img src={img} alt={title} className="w-14 h-14 object-contain mb-3" />
                <h3 className="font-semibold text-sm text-charcoal dark:text-white mb-1">{title}</h3>
                <p className="text-xs text-brown-400 dark:text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductDisplayPage;
