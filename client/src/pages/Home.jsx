import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaUsers, FaMagic, FaInstagram, FaBook, FaGift } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import CategoryBannerGrid from '../components/CategoryBannerGrid';
import CommunityCampaignProgress from '../components/CommunityCampaignProgress';
import HomeProductShelf from '../components/HomeProductShelf';
import PromoBanner from '../components/PromoBanner';
import UserActiveCampaigns from '../components/UserActiveCampaigns';
import Axios from '../utils/Axios';
import { valideURLConvert } from '../utils/valideURLConvert';

function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}

const emptyHomeCatalog = {
  bannerProducts: [],
  bestSellers: [],
  categoryBanners: [],
  subcategoryShelves: [],
};

const buildGroupedShelfLabel = (shelf) => {
  const styleCount = shelf?.productCount || shelf?.products?.length || 0;
  const lengthCount = shelf?.subcategories?.length || 0;
  const categoryName = shelf?.category?.name || 'Nawiri Hair';

  if (shelf?.isGrouped && lengthCount > 1) {
    return `${styleCount} styles across ${lengthCount} lengths in ${categoryName}`;
  }

  return `${styleCount} styles from ${categoryName}`;
};

const Home = () => {
  const navigate = useNavigate();
  const [featuredCampaign, setFeaturedCampaign] = useState(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [homeCatalog, setHomeCatalog] = useState(emptyHomeCatalog);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [communityRef, communityVisible] = useScrollReveal();

  useEffect(() => {
    fetchHomeCatalog();
    fetchFeaturedCampaign();
  }, []);

  const heroProducts = useMemo(() => {
    if (homeCatalog.bannerProducts.length > 0) {
      return homeCatalog.bannerProducts;
    }

    return homeCatalog.bestSellers;
  }, [homeCatalog.bannerProducts, homeCatalog.bestSellers]);

  const hasHomeContent =
    homeCatalog.categoryBanners.length > 0 ||
    homeCatalog.bestSellers.length > 0 ||
    homeCatalog.subcategoryShelves.length > 0;

  const fetchHomeCatalog = async () => {
    try {
      setLoadingCatalog(true);
      const response = await Axios({
        ...SummaryApi.getHomeCatalog,
        timeout: 10000,
      });

      if (response.data?.success) {
        setHomeCatalog({
          bannerProducts: response.data.data?.bannerProducts || [],
          bestSellers: response.data.data?.bestSellers || [],
          categoryBanners: response.data.data?.categoryBanners || [],
          subcategoryShelves: response.data.data?.subcategoryShelves || [],
        });
      } else {
        setHomeCatalog(emptyHomeCatalog);
      }
    } catch (error) {
      console.error('Home: failed to load catalog feed', error);
      setHomeCatalog(emptyHomeCatalog);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const fetchFeaturedCampaign = async () => {
    try {
      setLoadingCampaign(true);
      const response = await Axios({
        ...SummaryApi.getActiveCampaigns,
        timeout: 10000,
      });

      if (response.data?.success && response.data.data?.length > 0) {
        setFeaturedCampaign(response.data.data[0]);
      } else {
        setFeaturedCampaign(null);
      }
    } catch (error) {
      console.error('Error fetching featured campaign:', error);
      setFeaturedCampaign(null);
    } finally {
      setLoadingCampaign(false);
    }
  };

  const buildCategoryUrl = (category) => {
    if (!category?._id || !category?.name) {
      return '/collections';
    }

    return `/${valideURLConvert(category.name)}-${category._id}`;
  };

  const buildSubCategoryUrl = (shelf) => {
    if (!shelf?._id || !shelf?.name) {
      return '/collections';
    }

    if (!shelf.category?._id || !shelf.category?.name) {
      return '/collections';
    }

    return `/${valideURLConvert(shelf.category.name)}-${shelf.category._id}/${valideURLConvert(shelf.name)}-${shelf._id}`;
  };

  const buildShelfDestination = (shelf) => {
    if (shelf?.isGrouped && shelf?.category?._id && shelf?.subcategories?.length) {
      return {
        to: buildCategoryUrl(shelf.category),
        state: {
          categoryId: shelf.category._id,
          categoryName: shelf.category.name,
          subcategoryName: shelf.name,
          matchingSubcategories: shelf.subcategories.map((subCategory) => ({
            id: subCategory._id,
            name: subCategory.name,
          })),
        },
      };
    }

    return {
      to: buildSubCategoryUrl(shelf),
      state: {
        categoryId: shelf.category?._id,
        categoryName: shelf.category?.name,
        subcategoryId: shelf._id,
        subcategoryName: shelf.name,
      },
    };
  };

  const handleCategorySelect = (category) => {
    navigate(buildCategoryUrl(category), {
      state: {
        categoryId: category._id,
        categoryName: category.name,
        matchingSubcategories: (category.subcategories || []).map((subCategory) => ({
          id: subCategory._id,
          name: subCategory.name,
        })),
      },
    });
  };

  return (
    <section className="bg-ivory transition-colors dark:bg-dm-surface">
      {/* Quick Links Bar - New Feature Highlights */}
      <div className="bg-white dark:bg-dm-card border-b border-brown-200 dark:border-brown-800">
        <div className="container mx-auto px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              to="/hair-quiz"
              className="flex items-center gap-3 bg-gradient-to-r from-gold-100 to-gold-50 dark:from-gold-900/30 dark:to-gold-900/10 rounded-xl p-3 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center flex-shrink-0">
                <FaMagic className="text-charcoal" />
              </div>
              <div>
                <p className="font-semibold text-charcoal dark:text-white text-sm">Hair Quiz</p>
                <p className="text-xs text-brown-500">Find your perfect match</p>
              </div>
            </Link>

            <Link
              to="/shop-the-look"
              className="flex items-center gap-3 bg-gradient-to-r from-pink-100 to-pink-50 dark:from-pink-900/30 dark:to-pink-900/10 rounded-xl p-3 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                <FaInstagram className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-charcoal dark:text-white text-sm">Shop the Look</p>
                <p className="text-xs text-brown-500">Real customer styles</p>
              </div>
            </Link>

            <Link
              to="/hair-care-hub"
              className="flex items-center gap-3 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10 rounded-xl p-3 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <FaBook className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-charcoal dark:text-white text-sm">Care Hub</p>
                <p className="text-xs text-brown-500">Expert guides & tips</p>
              </div>
            </Link>

            <Link
              to="/collections#bundles"
              className="flex items-center gap-3 bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10 rounded-xl p-3 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                <FaGift className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-charcoal dark:text-white text-sm">Bundles</p>
                <p className="text-xs text-brown-500">Save up to 20%</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 pt-4 sm:px-4 sm:pt-6">
        {loadingCatalog ? (
          <div className="h-[280px] animate-pulse rounded-3xl bg-plum-100 dark:bg-plum-900/40 sm:h-[340px]" />
        ) : (
          <PromoBanner products={heroProducts} />
        )}
      </div>

      <div className="container mx-auto px-3 pt-6 sm:px-4 sm:pt-8">
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-300">
              Curated category banners
            </p>
            <h2 className="mt-2 text-2xl font-bold text-charcoal dark:text-white sm:text-3xl">
              Shop by collection first
            </h2>
            <p className="mt-2 text-sm text-brown-600 dark:text-white/60 sm:text-base">
              Start with the main hair families, then move into the exact shelf you want. This keeps the storefront cleaner on mobile, tablet, and desktop.
            </p>
          </div>

          <Link
            to="/collections"
            className="shrink-0 text-sm font-semibold text-gold-600 underline underline-offset-2 transition-colors hover:text-gold-500 dark:text-gold-300 dark:hover:text-gold-200"
          >
            Browse collections
          </Link>
        </div>

        {loadingCatalog ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`category-banner-skeleton-${index}`}
                className="min-h-[220px] animate-pulse rounded-3xl bg-gradient-to-br from-plum-100 to-gold-100 dark:from-plum-900/30 dark:to-gold-900/10"
              />
            ))}
          </div>
        ) : homeCatalog.categoryBanners.length > 0 ? (
          <CategoryBannerGrid items={homeCatalog.categoryBanners} onSelect={handleCategorySelect} />
        ) : (
          <div className="rounded-3xl border border-brown-200 bg-white/80 px-6 py-10 text-center shadow-sm dark:border-dm-border dark:bg-dm-card">
            <h3 className="text-lg font-semibold text-charcoal dark:text-white">Collections are coming together</h3>
            <p className="mt-2 text-sm text-brown-500 dark:text-white/55">
              Add categories and published products to turn this section into shoppable banner cards.
            </p>
          </div>
        )}
      </div>

      <div className="container mx-auto px-3 py-8 sm:px-4 sm:py-10">
        <HomeProductShelf
          title="Most selling now"
          subtitle="Best-performing products show up first, so customers and sellers reach the strongest movers faster."
          products={homeCatalog.bestSellers}
          loading={loadingCatalog}
          viewAllTo="/collections"
          viewAllLabel="Browse all"
        />

        {homeCatalog.subcategoryShelves.map((shelf) => {
          const shelfDestination = buildShelfDestination(shelf);

          return (
            <HomeProductShelf
              key={shelf.isGrouped ? `${shelf.category?._id}-${shelf.name}` : shelf._id}
              title={shelf.name}
              subtitle={buildGroupedShelfLabel(shelf)}
              products={shelf.products || []}
              loading={loadingCatalog}
              viewAllTo={shelfDestination.to}
              viewAllState={shelfDestination.state}
              viewAllLabel={shelf.isGrouped ? 'View collection' : 'View shelf'}
            />
          );
        })}

        {!loadingCatalog && !hasHomeContent && (
          <div className="rounded-3xl border border-dashed border-brown-300 bg-white/80 px-6 py-12 text-center dark:border-dm-border dark:bg-dm-card">
            <h3 className="text-lg font-semibold text-charcoal dark:text-white">No published products yet</h3>
            <p className="mt-2 text-sm text-brown-500 dark:text-white/55">
              Once products are published and stocked, this home view will automatically sort them into banners, best sellers, and subcategory shelves.
            </p>
          </div>
        )}
      </div>

      <div className="container mx-auto mb-8 mt-2 px-4 sm:mb-10">
        <div className="section-divider" />
      </div>

      <div
        ref={communityRef}
        className={`container mx-auto px-3 pb-8 transition-all duration-600 sm:px-4 sm:pb-10 ${
          communityVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div className="rounded-card border border-plum-200 bg-plum-100 p-5 dark:border-plum-800 dark:bg-plum-900/30 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-pill bg-plum-700 text-white">
              <FaUsers size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-charcoal dark:text-white">Community Challenges</h2>
              <p className="text-xs text-brown-400 dark:text-white/50">Join shoppers and unlock rewards together.</p>
            </div>
            <Link
              to="/campaigns"
              className="ml-auto flex-shrink-0 text-sm font-semibold text-gold-600 hover:underline dark:text-gold-300"
            >
              View All
            </Link>
          </div>

          <UserActiveCampaigns />

          {loadingCampaign ? (
            <div className="mt-3 h-24 rounded-card bg-shimmer" />
          ) : featuredCampaign ? (
            <CommunityCampaignProgress campaign={featuredCampaign} />
          ) : (
            <div className="py-4 text-center text-sm text-brown-400 dark:text-white/40">
              No active campaigns at the moment. Check back soon.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Home;
