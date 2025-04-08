import React, { useEffect, useState } from 'react';
import { FaArrowLeft, FaFilter, FaRegStar, FaRobot, FaSearch, FaSpinner, FaStar, FaTimes, FaUser } from 'react-icons/fa';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Axios from '../../utils/Axios';

const ChatSessionView = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageFilter, setMessageFilter] = useState('all'); // 'all', 'user', 'assistant'
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Get filter parameters from URL query if they exist
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    const filterParam = params.get('filter');

    if (searchParam) setSearchTerm(searchParam);
    if (filterParam && ['all', 'user', 'assistant'].includes(filterParam)) {
      setMessageFilter(filterParam);
    }
  }, [location.search]);

  useEffect(() => {
    if (id) {
      fetchChatSession(id);
    }
  }, [id]);

  // Check if session is closed but doesn't have feedback yet
  useEffect(() => {
    if (session && !session.isActive && !session.feedback && !feedbackSubmitted) {
      setShowFeedbackForm(true);
    } else {
      setShowFeedbackForm(false);
    }
  }, [session, feedbackSubmitted]);

  const fetchChatSession = async (sessionId) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await Axios({
        url: `/api/chat/sessions/${sessionId}`,
        method: 'GET',
      });

      if (response.data && response.data.success) {
        setSession(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching chat session:', error);
      setError('Failed to load chat session. It may not exist or you may not have permission to view it.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!session || !session.isActive) return;

    try {
      const response = await Axios({
        url: `/api/chat/sessions/${id}/close`,
        method: 'PATCH',
      });

      if (response.data && response.data.success) {
        // Update the local state to reflect the change
        setSession((prev) => ({
          ...prev,
          isActive: false,
        }));

        // Show feedback form after closing
        setShowFeedbackForm(true);
      }
    } catch (error) {
      console.error('Error closing chat session:', error);
    }
  };

  const handleSubmitFeedback = async () => {
    if (rating === 0) return;

    try {
      setSubmittingFeedback(true);
      const response = await Axios({
        url: `/api/chat/sessions/${id}/feedback`,
        method: 'POST',
        data: {
          rating,
          feedback: feedbackText,
        },
      });

      if (response.data && response.data.success) {
        // Update the session with feedback
        setSession((prev) => ({
          ...prev,
          feedback: {
            rating,
            comment: feedbackText,
            createdAt: new Date().toISOString(),
          },
        }));

        setFeedbackSubmitted(true);
        setShowFeedbackForm(false);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  // Apply filters to messages
  const getFilteredMessages = () => {
    if (!session || !session.messages) return [];

    return session.messages.filter((message) => {
      // Apply role filter
      if (messageFilter !== 'all' && message.role !== messageFilter) {
        return false;
      }

      // Apply search term
      if (searchTerm && !message.content.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  };

  // Update URL with current filters
  const updateFilters = (newSearchTerm, newMessageFilter) => {
    const params = new URLSearchParams();

    if (newSearchTerm) params.set('search', newSearchTerm);
    if (newMessageFilter !== 'all') params.set('filter', newMessageFilter);

    navigate(`/admin/chats/${id}?${params.toString()}`, { replace: true });

    setSearchTerm(newSearchTerm);
    setMessageFilter(newMessageFilter);
  };

  // Render star rating component
  const renderStarRating = (currentRating, isInteractive = false) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={isInteractive ? () => setRating(star) : undefined}
            className={isInteractive ? 'cursor-pointer' : ''}
          >
            {star <= currentRating ? (
              <FaStar className="text-yellow-400" size={isInteractive ? 24 : 18} />
            ) : (
              <FaRegStar className="text-gray-400" size={isInteractive ? 24 : 18} />
            )}
          </span>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <FaSpinner className="animate-spin mx-auto text-primary-500" size={32} />
          <p className="mt-2 text-gray-600 dark:text-gray-300">Loading chat session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-md mb-4">
          <p>{error}</p>
        </div>
        <Link to="/admin/chats" className="inline-flex items-center text-primary-500 hover:text-primary-700">
          <FaArrowLeft className="mr-2" /> Back to Chat List
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 p-4 rounded-md mb-4">
          <p>No chat session found with ID: {id}</p>
        </div>
        <Link to="/admin/chats" className="inline-flex items-center text-primary-500 hover:text-primary-700">
          <FaArrowLeft className="mr-2" /> Back to Chat List
        </Link>
      </div>
    );
  }

  const filteredMessages = getFilteredMessages();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Feedback Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Rate Your Experience</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your feedback helps us improve our service. Please rate your experience with this chat session.
            </p>

            <div className="flex justify-center mb-6">{renderStarRating(rating, true)}</div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Comments (Optional)
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows="4"
                placeholder="Tell us more about your experience..."
              ></textarea>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowFeedbackForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Skip
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={rating === 0 || submittingFeedback}
                className={`px-4 py-2 rounded-md text-white ${
                  rating === 0 || submittingFeedback
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-500 hover:bg-primary-600'
                }`}
              >
                {submittingFeedback ? <FaSpinner className="animate-spin inline-block mr-2" /> : null}
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/admin/chats" className="inline-flex items-center text-primary-500 hover:text-primary-700 mb-2">
            <FaArrowLeft className="mr-2" /> Back to Chat List
          </Link>
          <h1 className="text-2xl font-bold">Chat Session Details</h1>
        </div>

        {session.isActive && (
          <button
            onClick={handleCloseSession}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md inline-flex items-center"
          >
            <FaTimes className="mr-2" /> Close Chat Session
          </button>
        )}
      </div>

      {/* Session Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">User</h3>
            <div className="mt-1 flex items-center">
              <FaUser className="mr-2 text-gray-500 dark:text-gray-400" />
              <span className="font-medium">{session.user ? session.user.name : 'Guest User'}</span>
            </div>
            {session.user && (
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{session.user.email}</div>
            )}
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">ID: {session.userIdentifier}</div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
            <div className="mt-1">
              <span
                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  session.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {session.isActive ? 'Active' : 'Closed'}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</h3>
            <div className="mt-1 text-sm">{formatDate(session.createdAt)}</div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Active</h3>
            <div className="mt-1 text-sm">{formatDate(session.lastActive)}</div>
          </div>
        </div>

        {/* Show feedback section if it exists */}
        {(session.feedback || feedbackSubmitted) && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">User Feedback</h3>
            <div className="flex items-center gap-2">
              {renderStarRating(session.feedback?.rating || rating)}
              <span className="text-sm text-gray-600 dark:text-gray-300">
                ({session.feedback?.rating || rating}/5)
              </span>
            </div>
            {(session.feedback?.comment || feedbackText) && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                "{session.feedback?.comment || feedbackText}"
              </div>
            )}
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Submitted: {session.feedback ? formatDate(session.feedback.createdAt) : formatDate(new Date().toISOString())}
            </div>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium">Conversation History</h2>
          <div className="flex items-center justify-between flex-wrap gap-4 mt-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredMessages.length} of {session.messages ? session.messages.length : 0} messages
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Message filter */}
              <div className="relative inline-flex">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaFilter className="text-gray-400" size={14} />
                </div>
                <select
                  value={messageFilter}
                  onChange={(e) => updateFilters(searchTerm, e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Messages</option>
                  <option value="user">User Messages</option>
                  <option value="assistant">Assistant Messages</option>
                </select>
              </div>

              {/* Search messages */}
              <div className="relative inline-flex">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" size={14} />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => updateFilters(e.target.value, messageFilter)}
                  placeholder="Search messages..."
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => updateFilters('', messageFilter)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900 h-[600px] overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {session.messages && session.messages.length > 0
                ? 'No messages match your filters.'
                : 'No messages in this conversation.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary-100 dark:bg-primary-300 text-gray-800 dark:text-white mr-2'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white ml-2'
                    }`}
                  >
                    <div className="flex items-start mb-1">
                      {message.role === 'assistant' && (
                        <FaRobot className="mr-2 mt-1 text-gray-600 dark:text-gray-300" size={14} />
                      )}
                      <div className="font-medium text-xs text-gray-600 dark:text-gray-300">
                        {message.role === 'user' ? 'User' : 'Assistant'}
                      </div>
                      {message.role === 'user' && (
                        <FaUser className="ml-2 mt-1 text-gray-600 dark:text-gray-300" size={14} />
                      )}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                      {formatDate(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSessionView;