import React from 'react';
import { useLocation } from 'react-router-dom';
import CategoryFallbackErrorPage from './CategoryFallbackErrorPage';
import ProductListPage from '../pages/ProductListPage';

const CategorySmartFallback = () => {
  const location = useLocation();
  const path = location.pathname || '';

  // Match `/slug-:id` or `/slug-:id/subslug-:subId`
  const categoryOnly = /^\/[a-z0-9-]+-[a-f0-9]{5,}$/i.test(path);
  const withSubcategory = /^\/[a-z0-9-]+-[a-f0-9]{5,}\/[a-z0-9-]+-[a-f0-9]{5,}$/i.test(path);

  if (categoryOnly || withSubcategory) {
    console.log('CategorySmartFallback: Rendering ProductListPage for path', path);
    return <ProductListPage />;
  }

  return <CategoryFallbackErrorPage />;
};

export default CategorySmartFallback;
