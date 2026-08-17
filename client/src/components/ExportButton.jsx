import React, { useEffect, useRef, useState } from 'react';
import { FaFileExcel, FaFilePdf, FaFileWord, FaFileCsv, FaFileCode, FaSpinner } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';

const ExportButton = ({ data, onExport, exporting = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingFormat, setPendingFormat] = useState(null);
  const hasData = Array.isArray(data) && data.length > 0;
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!exporting) setPendingFormat(null);
  }, [exporting]);

  const exportOptions = [
    {
      name: 'Excel',
      icon: <FaFileExcel className="text-green-600" />,
      format: 'excel',
      description: 'Microsoft Excel format (.xlsx)'
    },
    {
      name: 'PDF',
      icon: <FaFilePdf className="text-red-600" />,
      format: 'pdf',
      description: 'Portable Document Format (.pdf)'
    },
    {
      name: 'Word',
      icon: <FaFileWord className="text-blue-600" />,
      format: 'word',
      description: 'Microsoft Word format (.doc)'
    },
    {
      name: 'CSV',
      icon: <FaFileCsv className="text-yellow-600" />,
      format: 'csv',
      description: 'Comma Separated Values (.csv)'
    },
    {
      name: 'JSON',
      icon: <FaFileCode className="text-purple-600" />,
      format: 'json',
      description: 'JavaScript Object Notation (.json)'
    }
  ];

  const handleExport = (format) => {
    if (!hasData || exporting) return;
    setPendingFormat(format);
    if (onExport) {
      onExport(format);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={!hasData || exporting}
        className="bg-plum-600 text-white px-4 py-2 rounded-md hover:bg-plum-700 flex items-center gap-2 transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-plum-600 disabled:hover:shadow-sm"
      >
        {exporting ? (
          <FaSpinner className="animate-spin text-base" />
        ) : (
          <span className="text-lg leading-none">📥</span>
        )}
        <span className="font-medium">{exporting ? 'Exporting…' : 'Export Data'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-dm-card rounded-lg shadow-xl z-50 border border-plum-200 dark:border-dm-border overflow-hidden animate-[fadeIn_0.12s_ease-out]">
          <div className="p-4 border-b border-plum-100 dark:border-dm-border bg-gradient-to-r from-plum-50 to-white dark:from-dm-card-2 dark:to-dm-card">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-semibold text-plum-800 dark:text-white">Export Options</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-plum-400 hover:text-plum-600 dark:text-white/55 dark:hover:text-white transition-colors"
                aria-label="Close export menu"
              >
                <IoClose size={20} />
              </button>
            </div>
            <p className="text-sm text-plum-600 dark:text-white/70">
              Choose a format to download your catalog
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-plum-50 dark:divide-dm-border/50">
            {exportOptions.map((option) => {
              const isPending = pendingFormat === option.format && exporting;
              return (
                <button
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  disabled={exporting}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-plum-50 dark:hover:bg-dm-card-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="text-xl w-6 flex justify-center shrink-0">
                    {isPending ? <FaSpinner className="animate-spin text-plum-500" /> : option.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-plum-800 dark:text-white">{option.name}</div>
                    <div className="text-xs text-plum-500 dark:text-white/60">{option.description}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-plum-100 dark:border-dm-border bg-plum-50 dark:bg-dm-card-2">
            <p className="text-xs text-plum-500 dark:text-white/60 text-center">
              {hasData
                ? `${data.length} product${data.length === 1 ? '' : 's'} ready to export`
                : 'No products to export yet'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;