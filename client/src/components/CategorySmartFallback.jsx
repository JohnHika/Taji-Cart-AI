import React, { Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import CategoryFallbackErrorPage from './CategoryFallbackErrorPage';

const ProductListPage = lazy(() => import('../pages/ProductListPage'));

const CategorySmartFallback = () => {
  const location = useLocation();
  const path = location.pathname || '';

  // Match `/slug-:id` or `/slug-:id/subslug-:subId`
  const categoryOnly = /^\/[a-z0-9-]+-[a-f0-9]{5,}$/i.test(path);
  const withSubcategory = /^\/[a-z0-9-]+-[a-f0-9]{5,}\/[a-z0-9-]+-[a-f0-9]{5,}$/i.test(path);

  if (categoryOnly || withSubcategory) {
    return (
      <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>}>
        <ProductListPage />
      </Suspense>
    );
  }

  return <CategoryFallbackErrorPage />;
};

export default CategorySmartFallback;
