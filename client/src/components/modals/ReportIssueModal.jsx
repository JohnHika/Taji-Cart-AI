import React, { useState } from 'react';
import { FaExclamationCircle, FaExternalLinkAlt, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import SummaryApi from '../../common/SummaryApi';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';

const ReportIssueModal = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState(null);

  if (!isOpen) return null;

  const titleValid = title.trim().length >= 3;
  const descriptionValid = description.trim().length >= 10;
  const canSubmit = titleValid && descriptionValid && !submitting;

  const resetAndClose = () => {
    setTitle('');
    setDescription('');
    setTicket(null);
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const response = await Axios({
        ...SummaryApi.reportIssue,
        data: { title: title.trim(), description: description.trim() }
      });

      if (response.data.success) {
        setTicket(response.data.data);
        toast.success(`Ticket ${response.data.data.ticketRef} submitted`);
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dm-card rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={resetAndClose}
          className="absolute top-3 right-3 text-brown-400 hover:text-charcoal dark:text-white/40 dark:hover:text-charcoal"
          aria-label="Close"
          type="button"
        >
          <FaTimes size={20} />
        </button>

        {ticket ? (
          <>
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Ticket submitted</h2>
            <p className="mb-6 text-brown-500 dark:text-white/55">
              Ticket <strong>{ticket.ticketRef}</strong> was created. The Nawiri Hair team will follow up.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2 border border-brown-200 text-charcoal rounded-lg hover:bg-brown-50 dark:border-dm-border dark:text-white/55 dark:hover:bg-dm-card-2"
              >
                Close
              </button>
              <a
                href={ticket.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-white rounded-lg bg-plum-700 hover:bg-plum-600 inline-flex items-center gap-2"
              >
                View ticket <FaExternalLinkAlt size={12} />
              </a>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-xl font-semibold mb-4 dark:text-white flex items-center">
              <FaExclamationCircle className="mr-2 text-plum-600" />
              Report an issue
            </h2>

            <div className="mb-4">
              <label htmlFor="report-issue-title" className="block text-sm font-medium text-brown-600 dark:text-white/70 mb-1">
                Title
              </label>
              <input
                id="report-issue-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                placeholder="Short summary of the problem"
                disabled={submitting}
                className="w-full rounded-lg border border-brown-200 dark:border-dm-border dark:bg-dm-card-2 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-plum-500"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="report-issue-description" className="block text-sm font-medium text-brown-600 dark:text-white/70 mb-1">
                Description
              </label>
              <textarea
                id="report-issue-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={5000}
                rows={5}
                placeholder="Steps to reproduce, what you expected, what happened instead"
                disabled={submitting}
                className="w-full rounded-lg border border-brown-200 dark:border-dm-border dark:bg-dm-card-2 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-plum-500 resize-y"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetAndClose}
                disabled={submitting}
                className="px-4 py-2 border border-brown-200 text-charcoal rounded-lg hover:bg-brown-50 dark:border-dm-border dark:text-white/55 dark:hover:bg-dm-card-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-4 py-2 text-white rounded-lg bg-plum-700 hover:bg-plum-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Submit ticket'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportIssueModal;
