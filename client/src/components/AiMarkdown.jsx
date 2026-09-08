import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const heading = 'mb-2 text-sm font-bold text-charcoal dark:text-white';

const components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-charcoal dark:text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-6">{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-brown-100 px-1.5 py-0.5 font-mono text-[0.85em] text-plum-700 dark:bg-dm-card-2 dark:text-plum-200">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-plum-700 underline dark:text-plum-300">
      {children}
    </a>
  ),
  h1: ({ children }) => <p className={heading}>{children}</p>,
  h2: ({ children }) => <p className={heading}>{children}</p>,
  h3: ({ children }) => <p className={heading}>{children}</p>,
  hr: () => <hr className="my-3 border-brown-100 dark:border-dm-border" />,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-plum-200 pl-3 italic text-brown-600 last:mb-0 dark:border-plum-800 dark:text-white/60">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-brown-200 py-1.5 pr-3 font-bold text-charcoal dark:border-dm-border dark:text-white">{children}</th>,
  td: ({ children }) => <td className="border-b border-brown-100 py-1.5 pr-3 dark:border-dm-border">{children}</td>,
};

const AiMarkdown = ({ text, className = '' }) => (
  <div className={`text-sm leading-6 text-brown-700 dark:text-white/70 ${className}`}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {text}
    </ReactMarkdown>
  </div>
);

AiMarkdown.propTypes = {
  text: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default AiMarkdown;
