import React, { useState } from 'react';
import { FaFileExcel, FaFilePdf, FaFileWord, FaFileCsv, FaFileCode } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';

const ExportButton = ({ data, onExport }) => {
  const [isOpen, setIsOpen] = useState(false);

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
    if (onExport) {
      onExport(format);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-plum-600 text-white px-4 py-2 rounded-md hover:bg-plum-700 flex items-center gap-2 transition-colors shadow-sm hover:shadow-md"
      >
        <span className="text-lg">📥</span>
        <span className="font-medium">Export Data</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-dm-card rounded-md shadow-lg z-50 border border-plum-200 dark:border-dm-border">
          <div className="p-4 border-b border-plum-100 dark:border-dm-border">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-plum-800 dark:text-white">Export Options</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-plum-400 hover:text-plum-600 dark:text-white/55 dark:hover:text-white"
              >
                <IoClose size={20} />
              </button>
            </div>
            <p className="text-sm text-plum-600 dark:text-white/70">
              Choose your desired export format
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {exportOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleExport(option.format)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-plum-50 dark:hover:bg-dm-card-2 transition-colors"
              >
                <div className="text-xl">{option.icon}</div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-plum-800 dark:text-white">{option.name}</div>
                  <div className="text-xs text-plum-500 dark:text-white/60">{option.description}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-plum-100 dark:border-dm-border bg-plum-50 dark:bg-dm-card-2">
            <p className="text-xs text-plum-500 dark:text-white/60 text-center">
              Exporting {data.length} products with all available data
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;