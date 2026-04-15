import React, { useState, useEffect } from 'react';
import {
  FaFilter,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaStar,
  FaSlidersH,
} from 'react-icons/fa';

const TEXTURE_OPTIONS = [
  { id: 'straight', label: 'Straight', icon: '🧍', count: 45 },
  { id: 'body-wave', label: 'Body Wave', icon: '🌊', count: 62 },
  { id: 'deep-curry', label: 'Deep Curly', icon: '🌀', count: 38 },
  { id: 'kinky', label: 'Kinky/Coily', icon: '🔥', count: 29 },
  { id: 'loose-wave', label: 'Loose Wave', icon: '〰️', count: 24 },
];

const LENGTH_OPTIONS = [
  { id: 'short', label: 'Short (8-12")', range: [8, 12], count: 34 },
  { id: 'medium', label: 'Medium (14-18")', range: [14, 18], count: 56 },
  { id: 'long', label: 'Long (20-24")', range: [20, 24], count: 48 },
  { id: 'extra-long', label: 'Extra Long (26-30")', range: [26, 30], count: 22 },
];

const PRICE_RANGES = [
  { id: 'budget', label: 'Budget-Friendly', range: [0, 5000], count: 45 },
  { id: 'mid', label: 'Mid-Range', range: [5000, 15000], count: 78 },
  { id: 'premium', label: 'Premium', range: [15000, 30000], count: 42 },
  { id: 'luxury', label: 'Luxury', range: [30000, 100000], count: 18 },
];

const ORIGIN_OPTIONS = [
  { id: 'remy', label: 'Remy Human Hair', count: 156 },
  { id: 'virgin', label: 'Virgin Human Hair', count: 89 },
  { id: 'synthetic', label: 'Premium Synthetic', count: 34 },
];

const APPLICATION_OPTIONS = [
  { id: 'clip-in', label: 'Clip-In', count: 67 },
  { id: 'tape-in', label: 'Tape-In', count: 45 },
  { id: 'sew-in', label: 'Sew-In/Weave', count: 89 },
  { id: 'glueless', label: 'Glueless', count: 34 },
  { id: 'lace-front', label: 'Lace Front', count: 56 },
];

const RATING_OPTIONS = [
  { id: '4', label: '4 Stars & Up', minRating: 4, count: 142 },
  { id: '3', label: '3 Stars & Up', minRating: 3, count: 178 },
  { id: '2', label: '2 Stars & Up', minRating: 2, count: 189 },
];

function FilterSection({ title, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-brown-200 dark:border-brown-800 pb-4 mb-4 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2"
      >
        <span className="font-semibold text-charcoal dark:text-white">{title}</span>
        {isOpen ? (
          <FaChevronUp className="text-brown-400" />
        ) : (
          <FaChevronDown className="text-brown-400" />
        )}
      </button>

      {isOpen && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

function EnhancedProductFilters({ onFilterChange, initialFilters = {} }) {
  const [filters, setFilters] = useState({
    texture: initialFilters.texture || [],
    length: initialFilters.length || [],
    priceRange: initialFilters.priceRange || null,
    origin: initialFilters.origin || [],
    application: initialFilters.application || [],
    rating: initialFilters.rating || null,
    inStock: initialFilters.inStock || false,
  });

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const handleToggleFilter = (category, value) => {
    setFilters(prev => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];

      const newFilters = { ...prev, [category]: updated };
      onFilterChange?.(newFilters);
      return newFilters;
    });
  };

  const handleSingleSelect = (category, value) => {
    setFilters(prev => {
      const updated = prev[category] === value ? null : value;
      const newFilters = { ...prev, [category]: updated };
      onFilterChange?.(newFilters);
      return newFilters;
    });
  };

  const handleClearAll = () => {
    const clearedFilters = {
      texture: [],
      length: [],
      priceRange: null,
      origin: [],
      application: [],
      rating: null,
      inStock: false,
    };
    setFilters(clearedFilters);
    onFilterChange?.(clearedFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    count += filters.texture.length;
    count += filters.length.length;
    count += filters.origin.length;
    count += filters.application.length;
    if (filters.priceRange) count++;
    if (filters.rating) count++;
    if (filters.inStock) count++;
    return count;
  };

  const FilterContent = () => (
    <div className="space-y-2">
      {/* Texture Filter */}
      <FilterSection title="Texture">
        <div className="space-y-2">
          {TEXTURE_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={filters.texture.includes(option.id)}
                  onChange={() => handleToggleFilter('texture', option.id)}
                  className="w-4 h-4 rounded border-brown-300 text-gold-500 focus:ring-gold-500"
                />
                <span className="text-brown-600 dark:text-brown-300 group-hover:text-charcoal dark:group-hover:text-white transition-colors">
                  {option.icon} {option.label}
                </span>
              </div>
              <span className="text-xs text-brown-400 bg-brown-100 dark:bg-brown-800 px-2 py-1 rounded-full">
                {option.count}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Length Filter */}
      <FilterSection title="Length">
        <div className="space-y-2">
          {LENGTH_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={filters.length.includes(option.id)}
                  onChange={() => handleToggleFilter('length', option.id)}
                  className="w-4 h-4 rounded border-brown-300 text-gold-500 focus:ring-gold-500"
                />
                <span className="text-brown-600 dark:text-brown-300 group-hover:text-charcoal dark:group-hover:text-white transition-colors">
                  {option.label}
                </span>
              </div>
              <span className="text-xs text-brown-400 bg-brown-100 dark:bg-brown-800 px-2 py-1 rounded-full">
                {option.count}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Price Range Filter */}
      <FilterSection title="Price Range">
        <div className="space-y-2">
          {PRICE_RANGES.map((option) => (
            <label
              key={option.id}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="priceRange"
                  checked={filters.priceRange === option.id}
                  onChange={() => handleSingleSelect('priceRange', option.id)}
                  className="w-4 h-4 border-brown-300 text-gold-500 focus:ring-gold-500"
                />
                <span className="text-brown-600 dark:text-brown-300 group-hover:text-charcoal dark:group-hover:text-white transition-colors">
                  {option.label}
                </span>
              </div>
              <span className="text-xs text-brown-400 bg-brown-100 dark:bg-brown-800 px-2 py-1 rounded-full">
                {option.count}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Origin Filter */}
      <FilterSection title="Hair Origin">
        <div className="space-y-2">
          {ORIGIN_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={filters.origin.includes(option.id)}
                  onChange={() => handleToggleFilter('origin', option.id)}
                  className="w-4 h-4 rounded border-brown-300 text-gold-500 focus:ring-gold-500"
                />
                <span className="text-brown-600 dark:text-brown-300 group-hover:text-charcoal dark:group-hover:text-white transition-colors">
                  {option.label}
                </span>
              </div>
              <span className="text-xs text-brown-400 bg-brown-100 dark:bg-brown-800 px-2 py-1 rounded-full">
                {option.count}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Application Method Filter */}
      <FilterSection title="Application Method">
        <div className="space-y-2">
          {APPLICATION_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={filters.application.includes(option.id)}
                  onChange={() => handleToggleFilter('application', option.id)}
                  className="w-4 h-4 rounded border-brown-300 text-gold-500 focus:ring-gold-500"
                />
                <span className="text-brown-600 dark:text-brown-300 group-hover:text-charcoal dark:group-hover:text-white transition-colors">
                  {option.label}
                </span>
              </div>
              <span className="text-xs text-brown-400 bg-brown-100 dark:bg-brown-800 px-2 py-1 rounded-full">
                {option.count}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Rating Filter */}
      <FilterSection title="Customer Rating">
        <div className="space-y-2">
          {RATING_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="rating"
                  checked={filters.rating === option.id}
                  onChange={() => handleSingleSelect('rating', option.id)}
                  className="w-4 h-4 border-brown-300 text-gold-500 focus:ring-gold-500"
                />
                <div className="flex items-center">
                  <span className="text-brown-600 dark:text-brown-300 group-hover:text-charcoal dark:group-hover:text-white transition-colors">
                    {option.label}
                  </span>
                </div>
              </div>
              <span className="text-xs text-brown-400 bg-brown-100 dark:bg-brown-800 px-2 py-1 rounded-full">
                {option.count}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* In Stock Filter */}
      <FilterSection title="Availability">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={() =>
              setFilters(prev => {
                const updated = { ...prev, inStock: !prev.inStock };
                onFilterChange?.(updated);
                return updated;
              })
            }
            className="w-4 h-4 rounded border-brown-300 text-gold-500 focus:ring-gold-500"
          />
          <span className="text-brown-600 dark:text-brown-300 group-hover:text-charcoal dark:group-hover:text-white transition-colors">
            In Stock Only
          </span>
        </label>
      </FilterSection>
    </div>
  );

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full flex items-center justify-between bg-white dark:bg-dm-card border border-brown-200 dark:border-brown-800 rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <FaSlidersH className="text-brown-500" />
            <span className="font-semibold text-charcoal dark:text-white">
              Filters
            </span>
            {getActiveFilterCount() > 0 && (
              <span className="bg-gold-500 text-charcoal text-xs font-bold px-2 py-1 rounded-full">
                {getActiveFilterCount()}
              </span>
            )}
          </div>
          <FaChevronDown
            className={`text-brown-400 transition-transform ${
              showMobileFilters ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Filter Panel */}
      <div
        className={`${
          showMobileFilters ? 'block' : 'hidden lg:block'
        } bg-white dark:bg-dm-card rounded-xl border border-brown-200 dark:border-brown-800 p-6`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FaFilter className="text-gold-500" />
            <h2 className="text-lg font-bold text-charcoal dark:text-white">
              Filters
            </h2>
            {getActiveFilterCount() > 0 && (
              <span className="bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 text-xs font-bold px-2 py-1 rounded-full">
                {getActiveFilterCount()} active
              </span>
            )}
          </div>

          {getActiveFilterCount() > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 text-sm text-brown-500 hover:text-red-500 transition-colors"
            >
              <FaTimes />
              Clear All
            </button>
          )}
        </div>

        {/* Active Filters Tags */}
        {getActiveFilterCount() > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-brown-200 dark:border-brown-800">
            {filters.texture.map((id) => (
              <span
                key={id}
                className="bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 text-xs px-3 py-1 rounded-full flex items-center gap-2"
              >
                {TEXTURE_OPTIONS.find((o) => o.id === id)?.label}
                <button
                  onClick={() => handleToggleFilter('texture', id)}
                  className="hover:text-red-500"
                >
                  <FaTimes className="text-xs" />
                </button>
              </span>
            ))}
            {filters.length.map((id) => (
              <span
                key={id}
                className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-3 py-1 rounded-full flex items-center gap-2"
              >
                {LENGTH_OPTIONS.find((o) => o.id === id)?.label}
                <button
                  onClick={() => handleToggleFilter('length', id)}
                  className="hover:text-red-500"
                >
                  <FaTimes className="text-xs" />
                </button>
              </span>
            ))}
            {filters.priceRange && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs px-3 py-1 rounded-full flex items-center gap-2">
                {PRICE_RANGES.find((o) => o.id === filters.priceRange)?.label}
                <button
                  onClick={() => handleSingleSelect('priceRange', null)}
                  className="hover:text-red-500"
                >
                  <FaTimes className="text-xs" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Filter Sections */}
        <FilterContent />
      </div>
    </>
  );
}

export default EnhancedProductFilters;
