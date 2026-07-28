import React, { useRef, useState } from 'react';
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaExternalLinkAlt,
  FaFileVideo,
  FaImage,
  FaPaperclip,
  FaTimes,
  FaTrash
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import SummaryApi from '../../common/SummaryApi';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
// The backend's ticketUrl points straight at Huly's own tracker UI, which
// requires a real Huly workspace login -- the admin submitting this form
// doesn't have one. The reporter portal is the no-login view built for
// exactly this: sign in with the same email used to submit the ticket.
const SUPPORT_PORTAL_URL = 'https://support.arche-axon.xyz/portal';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ReportIssueModal = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const titleValid = title.trim().length >= 3;
  const descriptionValid = description.trim().length >= 10;
  const canSubmit = titleValid && descriptionValid && !submitting;

  const resetAndClose = () => {
    setTitle('');
    setDescription('');
    clearAttachment();
    setTicket(null);
    onClose();
  };

  const clearAttachment = () => {
    setAttachment(null);
    setAttachmentError('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setAttachmentError('Please attach an image or short video (png, jpg, gif, webp, mp4, webm, mov).');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachmentError(`That file is too large. Max size is ${formatBytes(MAX_ATTACHMENT_BYTES)}.`);
      event.target.value = '';
      return;
    }

    setAttachmentError('');
    setAttachment(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const response = await Axios({
        ...SummaryApi.reportIssue,
        data: formData,
        // The shared Axios instance defaults Content-Type to application/json,
        // which otherwise wins over axios's own FormData auto-detection and
        // silently sends this as JSON with no attachment at all (confirmed via
        // HAR capture: postData.mimeType was application/json, ~117 bytes,
        // no multipart boundary). Setting it to undefined here lets axios
        // compute the real multipart/form-data boundary itself.
        headers: { 'Content-Type': undefined }
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dm-card rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/50 ring-1 ring-black/5 dark:ring-white/10 w-full max-w-lg relative overflow-hidden">
        {/* Accent header bar */}
        <div className="h-1.5 bg-gradient-to-r from-plum-600 via-plum-500 to-plum-700" />

        <button
          onClick={resetAndClose}
          className="absolute top-4 right-4 text-brown-400 hover:text-charcoal dark:text-white/40 dark:hover:text-white transition-colors rounded-full p-1.5 hover:bg-brown-50 dark:hover:bg-white/10"
          aria-label="Close"
          type="button"
        >
          <FaTimes size={16} />
        </button>

        {ticket ? (
          <div className="p-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-500/10">
              <FaCheckCircle className="text-green-500" size={28} />
            </div>
            <h2 className="text-xl font-semibold mb-2 dark:text-white">Ticket submitted</h2>
            <p className="mb-2 text-sm text-brown-500 dark:text-white/55">
              Ticket <span className="font-mono font-semibold text-plum-700 dark:text-plum-300">{ticket.ticketRef}</span> was created.
              The Nawiri Hair team will follow up.
            </p>
            <p className="mb-6 text-xs text-brown-400 dark:text-white/40">
              Track it anytime at the support portal &mdash; sign in with this account&apos;s email, no separate login needed.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2.5 border border-brown-200 text-charcoal rounded-xl hover:bg-brown-50 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2 transition-colors text-sm font-medium"
              >
                Close
              </button>
              <a
                href={SUPPORT_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 text-white rounded-xl bg-plum-700 hover:bg-plum-600 shadow-sm shadow-plum-700/30 inline-flex items-center gap-2 text-sm font-medium transition-colors"
              >
                Track ticket <FaExternalLinkAlt size={11} />
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-50 dark:bg-plum-500/10">
                <FaExclamationCircle className="text-plum-600 dark:text-plum-400" size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold dark:text-white leading-tight">Report an issue</h2>
                <p className="text-xs text-brown-400 dark:text-white/40">We&apos;ll route this straight to the team</p>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="report-issue-title" className="block text-sm font-medium text-brown-600 dark:text-white/70 mb-1.5">
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
                className="w-full rounded-xl border border-brown-200 dark:border-dm-border dark:bg-dm-card-2 dark:text-white px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-plum-500/40 focus:border-plum-400"
              />
              {title.length > 0 && !titleValid && (
                <p className="mt-1 text-xs text-plum-600 dark:text-plum-400">
                  At least 3 characters ({title.trim().length}/3)
                </p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="report-issue-description" className="block text-sm font-medium text-brown-600 dark:text-white/70 mb-1.5">
                Description
              </label>
              <textarea
                id="report-issue-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={5000}
                rows={4}
                placeholder="Steps to reproduce, what you expected, what happened instead"
                disabled={submitting}
                className="w-full rounded-xl border border-brown-200 dark:border-dm-border dark:bg-dm-card-2 dark:text-white px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-plum-500/40 focus:border-plum-400 resize-y"
              />
              {description.length > 0 && !descriptionValid && (
                <p className="mt-1 text-xs text-plum-600 dark:text-plum-400">
                  At least 10 characters ({description.trim().length}/10)
                </p>
              )}
            </div>

            <div className="mb-6">
              <span className="block text-sm font-medium text-brown-600 dark:text-white/70 mb-1.5">
                Attachment <span className="font-normal text-brown-400 dark:text-white/35">(optional)</span>
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                onChange={handleFileChange}
                disabled={submitting}
                className="hidden"
                id="report-issue-attachment"
              />

              {!attachment ? (
                <label
                  htmlFor="report-issue-attachment"
                  className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-brown-200 dark:border-dm-border px-3.5 py-4 text-sm text-brown-400 dark:text-white/40 cursor-pointer hover:border-plum-400 hover:text-plum-600 dark:hover:text-plum-400 hover:bg-plum-50/50 dark:hover:bg-plum-500/5 transition-colors"
                >
                  <FaPaperclip size={13} />
                  Attach a screenshot or short video
                </label>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-brown-200 dark:border-dm-border px-3.5 py-2.5 bg-brown-50/50 dark:bg-dm-card-2">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Attachment preview" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-plum-100 dark:bg-plum-500/15">
                      <FaFileVideo className="text-plum-600 dark:text-plum-400" size={16} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-charcoal dark:text-white">{attachment.name}</p>
                    <p className="text-xs text-brown-400 dark:text-white/40">{formatBytes(attachment.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearAttachment}
                    disabled={submitting}
                    className="shrink-0 text-brown-400 hover:text-red-500 dark:text-white/40 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    aria-label="Remove attachment"
                  >
                    <FaTrash size={13} />
                  </button>
                </div>
              )}

              {attachmentError && (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{attachmentError}</p>
              )}
              {!attachmentError && !attachment && (
                <p className="mt-1.5 text-xs text-brown-400 dark:text-white/35 flex items-center gap-1">
                  <FaImage size={10} /> Images or short videos, up to {formatBytes(MAX_ATTACHMENT_BYTES)}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-1 border-t border-brown-100 dark:border-dm-border/60 -mx-7 px-7 pt-4">
              <button
                type="button"
                onClick={resetAndClose}
                disabled={submitting}
                className="px-4 py-2.5 border border-brown-200 text-charcoal rounded-xl hover:bg-brown-50 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-4 py-2.5 text-white rounded-xl bg-plum-700 hover:bg-plum-500 hover:shadow-md hover:shadow-plum-600/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm shadow-sm shadow-plum-700/30 text-sm font-medium transition-all"
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
