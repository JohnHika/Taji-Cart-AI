import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FaXmark } from 'react-icons/fa6';
import { GUIDE_CONTENT } from './guideContent';

// Persistent "how do I use this" reference, not a one-shot tour -- an admin
// forgets what a "stat" badge or a cumulative-share column means long after
// any first-run walkthrough would have faded, so this stays reachable at
// any time via the ? button and reopens pinned to whatever area they're on.
const GuideOverlay = ({ open, onClose, areas, activeArea, onJump }) => {
  const [section, setSection] = useState('getting-started');

  useEffect(() => {
    if (open) setSection(GUIDE_CONTENT[activeArea] ? activeArea : 'getting-started');
  }, [open, activeArea]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const content = GUIDE_CONTENT[section] || GUIDE_CONTENT['getting-started'];
  const navItems = [{ id: 'getting-started', label: 'Getting started' }, ...areas];

  return (
    <div className="si-guide-overlay" role="presentation" onClick={onClose}>
      <aside className="si-guide-panel" role="dialog" aria-modal="true" aria-label="Store guide" onClick={(event) => event.stopPropagation()}>
        <div className="si-guide-panel__header">
          <div>
            <p className="si-eyebrow">Store guide</p>
            <p className="si-title" style={{ fontSize: '1.0625rem' }}>How to run this workspace</p>
          </div>
          <button type="button" className="si-btn si-btn--ghost" onClick={onClose} aria-label="Close guide"><FaXmark size={13} /></button>
        </div>
        <div className="si-guide-panel__body">
          <nav className="si-guide-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`si-nav-item ${section === item.id ? 'si-nav-item--active' : ''}`}
                  onClick={() => setSection(item.id)}
                >
                  {Icon && <Icon size={13} />}
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="si-guide-content">
            <p className="si-eyebrow">{content.eyebrow}</p>
            <h2 className="si-title" style={{ fontSize: '1.25rem' }}>{content.title}</h2>
            <p className="si-stat__detail" style={{ marginTop: '0.35rem', fontSize: '0.875rem' }}>{content.tagline}</p>
            <div className="si-guide-sections">
              {content.sections.map((sec) => (
                <section key={sec.heading} className="si-guide-section">
                  <p className="si-guide-section__heading">{sec.heading}</p>
                  <ul className="si-guide-section__list">
                    {sec.body.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                </section>
              ))}
            </div>
            {section !== 'getting-started' && (
              <button
                type="button"
                className="si-btn si-btn--primary"
                style={{ marginTop: '1.35rem' }}
                onClick={() => { onJump(section); onClose(); }}
              >
                Go to {content.title}
              </button>
            )}
          </div>
        </div>
        <div className="si-guide-panel__footer">
          <p className="si-stat__detail">Reopen this anytime from the <span className="si-kbd">?</span> button in the top bar, or press ⌘K and search &quot;help&quot;.</p>
        </div>
      </aside>
    </div>
  );
};

GuideOverlay.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  areas: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.elementType,
  })).isRequired,
  activeArea: PropTypes.string,
  onJump: PropTypes.func.isRequired,
};

GuideOverlay.defaultProps = { activeArea: null };

export default GuideOverlay;
