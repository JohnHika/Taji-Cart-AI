import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FaMagnifyingGlass } from 'react-icons/fa6';

// Global Cmd+K / Ctrl+K jump list across Store Intelligence's areas. Fuzzy
// match is intentionally simple (substring over label + keywords) -- this
// is a fixed list of ~10 destinations, not an open-ended search index.
const CommandPalette = ({ areas, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      const isCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isCombo) {
        event.preventDefault();
        setOpen((current) => !current);
      } else if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return areas;
    return areas.filter((area) => `${area.label} ${area.keywords || ''}`.toLowerCase().includes(term));
  }, [areas, query]);

  const choose = (area) => {
    if (!area) return;
    onSelect(area.id);
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, results.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
    if (event.key === 'Enter') { event.preventDefault(); choose(results[activeIndex]); }
  };

  if (!open) return null;

  return (
    <div className="si-palette-overlay" role="presentation" onClick={() => setOpen(false)}>
      <div className="si-palette" role="dialog" aria-label="Jump to" onClick={(event) => event.stopPropagation()}>
        <div className="si-row" style={{ padding: '0 1.1rem' }}>
          <FaMagnifyingGlass style={{ color: 'var(--si-text-faint)', flexShrink: 0 }} size={13} />
          <input
            ref={inputRef}
            className="si-palette__input"
            style={{ borderBottom: 'none', padding: '0.9rem 0' }}
            placeholder="Jump to an area…"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={onKeyDown}
          />
        </div>
        <div className="si-palette__list">
          {results.length === 0 && <p className="si-table-empty">No area matches "{query}".</p>}
          {results.map((area, index) => {
            const Icon = area.icon;
            return (
              <button
                key={area.id}
                type="button"
                className={`si-palette__item ${index === activeIndex ? 'si-palette__item--active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(area)}
              >
                {Icon && <Icon size={13} />}
                <span>{area.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

CommandPalette.propTypes = {
  areas: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    keywords: PropTypes.string,
    icon: PropTypes.elementType,
  })).isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default CommandPalette;
