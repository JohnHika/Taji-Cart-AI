import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FaArrowRight, FaCheck, FaRotateLeft, FaXmark } from 'react-icons/fa6';
import { INTERACTIVE_TOUR_STEPS } from './interactiveTour';

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const InteractiveTourOverlay = ({ open, stepIndex, onNext, onBack, onPause, onRestart }) => {
  const step = INTERACTIVE_TOUR_STEPS[stepIndex] || INTERACTIVE_TOUR_STEPS[0];
  const [targetRect, setTargetRect] = useState(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const completionRef = useRef('');

  const syncTarget = useCallback((shouldScroll = false) => {
    const target = document.querySelector(step.selector);
    if (!target) {
      setTargetRect(null);
      return false;
    }
    if (shouldScroll) target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    const rect = target.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    return true;
  }, [step.selector]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') onPause(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onPause, open]);

  useEffect(() => {
    if (!open) return undefined;
    completionRef.current = '';
    setTargetMissing(false);
    let attempts = 0;
    let timer;
    let firstMatch = true;

    const findTarget = () => {
      const found = syncTarget(firstMatch);
      firstMatch = false;
      if (found || attempts >= 30) {
        if (!found) setTargetMissing(true);
        return;
      }
      attempts += 1;
      timer = window.setTimeout(findTarget, 100);
    };
    findTarget();

    const updatePosition = () => syncTarget(false);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, step.id, syncTarget]);

  const completeAction = useCallback(() => {
    if (completionRef.current === step.id) return;
    completionRef.current = step.id;
    window.setTimeout(onNext, 260);
  }, [onNext, step.id]);

  useEffect(() => {
    if (!open || targetMissing || step.type === 'explanation') return undefined;
    const onClick = (event) => {
      if (step.type !== 'click' || !(event.target instanceof Element) || !event.target.closest(step.selector)) return;
      completeAction();
    };
    const onInput = (event) => {
      if (step.type !== 'task' || !(event.target instanceof Element) || !event.target.closest(step.selector)) return;
      if (String(event.target.value || '').trim()) completeAction();
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('change', onInput, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('change', onInput, true);
    };
  }, [completeAction, open, step.selector, step.type, targetMissing]);

  if (!open) return null;

  const cardWidth = Math.min(360, window.innerWidth - 32);
  const cardLeft = targetRect
    ? clamp(targetRect.left + (targetRect.width / 2) - (cardWidth / 2), 16, window.innerWidth - cardWidth - 16)
    : 16;
  const roomBelow = targetRect ? window.innerHeight - targetRect.bottom : 0;
  const cardTop = targetRect && roomBelow >= 300
    ? Math.min(targetRect.bottom + 18, window.innerHeight - 280)
    : (targetRect ? Math.max(16, targetRect.top - 300) : Math.max(16, (window.innerHeight / 2) - 190));
  const progress = `${stepIndex + 1} of ${INTERACTIVE_TOUR_STEPS.length}`;
  const isActionStep = step.type === 'click' || step.type === 'task';

  return (
    <div className="si-tour-overlay" role="presentation">
      {!targetRect && <div className="si-tour-full-scrim" aria-hidden="true" />}
      {targetRect && (
        <div
          className="si-tour-spotlight"
          aria-hidden="true"
          style={{ top: targetRect.top - 6, left: targetRect.left - 6, width: targetRect.width + 12, height: targetRect.height + 12 }}
        />
      )}
      <section
        className={`si-tour-card ${!targetRect ? 'si-tour-card--centered' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-label={`Interactive store tour, ${progress}`}
        style={{ width: cardWidth, left: cardLeft, top: cardTop }}
      >
        <div className="si-tour-card__topline">
          <span className="si-tour-card__progress">{progress}</span>
          <button type="button" className="si-tour-card__close" onClick={onPause} aria-label="Exit interactive tour"><FaXmark size={13} /></button>
        </div>
        <div className="si-tour-card__bar" aria-hidden="true"><span style={{ width: `${((stepIndex + 1) / INTERACTIVE_TOUR_STEPS.length) * 100}%` }} /></div>
        <p className="si-eyebrow">{step.eyebrow}</p>
        <h2 className="si-tour-card__title">{step.title}</h2>
        <p className="si-tour-card__body">{step.body}</p>
        {targetMissing ? (
          <div className="si-tour-card__notice">
            <FaCheck size={12} /> This step is not available in the current view, so you can continue safely.
          </div>
        ) : isActionStep ? (
          <div className="si-tour-card__action"><span className="si-tour-card__action-dot" />{step.action}</div>
        ) : null}
        <div className="si-tour-card__footer">
          <button type="button" className="si-btn si-btn--ghost" onClick={onBack} disabled={stepIndex === 0}>Back</button>
          <button type="button" className="si-tour-card__text-button" onClick={onRestart}><FaRotateLeft size={11} /> Restart</button>
          {isActionStep && !targetMissing ? (
            <button type="button" className="si-tour-card__text-button" onClick={onPause}>Exit tour</button>
          ) : (
            <button type="button" className="si-btn si-btn--primary" onClick={onNext}>{stepIndex === INTERACTIVE_TOUR_STEPS.length - 1 ? 'Finish' : (targetMissing ? 'Skip step' : 'Next')} <FaArrowRight size={11} /></button>
          )}
        </div>
      </section>
    </div>
  );
};

InteractiveTourOverlay.propTypes = {
  open: PropTypes.bool.isRequired,
  stepIndex: PropTypes.number.isRequired,
  onNext: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onPause: PropTypes.func.isRequired,
  onRestart: PropTypes.func.isRequired,
};

export default InteractiveTourOverlay;
