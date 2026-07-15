import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FaUsers } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import CategoryBannerGrid from '../components/CategoryBannerGrid';
import CommunityCampaignProgress from '../components/CommunityCampaignProgress';
import HeroBanner from '../components/HeroBanner';
import HomeProductShelf from '../components/HomeProductShelf';
import PWAInstallBanner from '../components/PWAInstallBanner';
import TrustStrip from '../components/TrustStrip';
import UserActiveCampaigns from '../components/UserActiveCampaigns';
import Axios from '../utils/Axios';
import { valideURLConvert } from '../utils/valideURLConvert';

const emptyHomeCatalog = {
  bannerProducts: [],
  bestSellers: [],
  categoryBanners: [],
  subcategoryShelves: [],
};

const Home = () => {
  const navigate = useNavigate();
  const [featuredCampaign, setFeaturedCampaign] = useState(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [homeCatalog, setHomeCatalog] = useState(emptyHomeCatalog);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  useEffect(() => {
    fetchHomeCatalog();
    fetchFeaturedCampaign();
  }, []);

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
      <Helmet>
        <title>Nawiri Hair — Premium Hair Products in Kenya</title>
        <meta
          name="description"
          content="Shop wigs, extensions, weaves and natural hair products at Nawiri Hair. Wide selection, best prices, fast delivery across Kenya."
        />
        <link rel="canonical" href="https://nawirihairke.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Nawiri Hair — Premium Hair Products in Kenya" />
        <meta
          property="og:description"
          content="Shop wigs, extensions, weaves and natural hair products at Nawiri Hair. Wide selection, best prices, fast delivery across Kenya."
        />
        <meta property="og:image" content="https://nawirihairke.com/images/nawiri_logo.jpeg" />
        <meta property="og:url" content="https://nawirihairke.com/" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Store',
            name: 'Nawiri Hair',
            url: 'https://nawirihairke.com',
            logo: 'https://nawirihairke.com/images/nawiri_logo.jpeg',
            description: 'Premium hair products, wigs, extensions and accessories delivered across Kenya.',
            address: { '@type': 'PostalAddress', addressCountry: 'KE' },
            currenciesAccepted: 'KES',
            paymentAccepted: 'M-Pesa, Card',
          })}
        </script>
      </Helmet>

      <HeroBanner bestSellers={homeCatalog.bestSellers} bannerProducts={homeCatalog.bannerProducts} />

      <TrustStrip />

      <div className="container mx-auto px-3 pt-8 sm:px-4 sm:pt-10">
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-300">
              Shop by style
            </p>
            <h2 className="mt-2 text-2xl font-bold text-charcoal dark:text-white sm:text-3xl">
              Find your look
            </h2>
            <p className="mt-2 text-sm text-brown-600 dark:text-white/60 sm:text-base">
              Explore wigs, weaves, braids and extensions for every look.
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`category-banner-skeleton-${index}`}
                className="aspect-[4/5] animate-pulse rounded-lg bg-brown-100 dark:bg-dm-card"
              />
            ))}
          </div>
        ) : homeCatalog.categoryBanners.length > 0 ? (
          <CategoryBannerGrid items={homeCatalog.categoryBanners} onSelect={handleCategorySelect} />
        ) : (
          <div className="rounded-lg border border-dashed border-brown-300 bg-white/80 px-6 py-10 text-center dark:border-dm-border dark:bg-dm-card">
            <h3 className="text-lg font-semibold text-charcoal dark:text-white">New styles arriving soon</h3>
            <p className="mt-2 text-sm text-brown-500 dark:text-white/55">
              Check back shortly to shop our curated wigs, weaves, braids and extensions.
            </p>
          </div>
        )}
      </div>

      <div className="container mx-auto px-3 py-8 sm:px-4 sm:py-10">
        <HomeProductShelf
          title="Best sellers"
          subtitle="Customer favourites worth adding to your collection."
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
              subtitle=""
              products={shelf.products || []}
              loading={loadingCatalog}
              viewAllTo={shelfDestination.to}
              viewAllState={shelfDestination.state}
              viewAllLabel={shelf.isGrouped ? 'View collection' : 'View shelf'}
            />
          );
        })}

        {!loadingCatalog && !hasHomeContent && (
          <div className="rounded-lg border border-dashed border-brown-300 bg-white/80 px-6 py-12 text-center dark:border-dm-border dark:bg-dm-card">
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

      <div className="container mx-auto px-3 pb-8 sm:px-4 sm:pb-10">
        <div className="rounded-lg border border-brown-100 bg-white p-5 dark:border-dm-border dark:bg-dm-card sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-plum-700 text-white">
              <FaUsers size={16} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-charcoal dark:text-white">Community rewards</h2>
              <p className="text-xs text-brown-500 dark:text-white/50">Join shoppers and unlock rewards together.</p>
            </div>
            <Link
              to="/campaigns"
              className="ml-auto flex-shrink-0 text-sm font-semibold text-gold-600 hover:underline dark:text-gold-300"
            >
              View all
            </Link>
          </div>

          <UserActiveCampaigns />

          {loadingCampaign ? (
            <div className="mt-3 h-24 rounded-lg bg-shimmer" />
          ) : featuredCampaign ? (
            <CommunityCampaignProgress campaign={featuredCampaign} />
          ) : (
            <div className="py-4 text-center text-sm text-brown-400 dark:text-white/40">
              No active campaigns at the moment. Check back soon.
            </div>
          )}
        </div>
      </div>

      <PWAInstallBanner context="footer" />
    </section>
  );
};

export default Home;
