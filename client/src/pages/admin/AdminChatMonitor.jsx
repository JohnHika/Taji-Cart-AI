import React, { useEffect, useState } from 'react';
import { FaComment, FaEye, FaSearch, FaSpinner, FaUser } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Axios from '../../utils/Axios';

const AdminChatMonitor = () => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
  });

  useEffect(() => {
    fetchChatSessions();
  }, [showActiveOnly, pagination.offset, pagination.limit]);

  const fetchChatSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await Axios({
        url: `/api/chat/sessions`,
        method: 'GET',
        params: {
          limit: pagination.limit,
          offset: pagination.offset,
          active: showActiveOnly ? 'true' : null,
        },
      });

      if (response.data && response.data.success) {
        setSessions(response.data.data.sessions);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.total,
        }));
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      setError('Failed to load chat sessions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousPage = () => {
    if (pagination.offset - pagination.limit >= 0) {
      setPagination(prev => ({
        ...prev,
        offset: prev.offset - prev.limit,
      }));
    }
  };

  const handleNextPage = () => {
    if (pagination.offset + pagination.limit < pagination.total) {
      setPagination(prev => ({
        ...prev,
        offset: prev.offset + prev.limit,
      }));
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
    }).format(date);
  };

  const getLastMessage = (session) => {
    if (!session.messages || session.messages.length === 0) {
      return 'No messages';
    }

    const lastMsg = session.messages[session.messages.length - 1];
    return lastMsg.content.length > 50 
      ? `${lastMsg.content.substring(0, 50)}...` 
      : lastMsg.content;
  };

  // Filter sessions by search term
  const filteredSessions = searchTerm 
    ? sessions.filter(session => {
        // Search in user info (if available)
        const userMatch = session.user && session.user.name && 
          session.user.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Search in message content
        const messageMatch = session.messages && session.messages.some(msg => 
          msg.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return userMatch || messageMatch;
      })
    : sessions;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Chat Monitor</h1>
        <p className="text-brown-500 dark:text-white/55">
          Monitor and review customer conversations with the AI assistant
        </p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <button
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className={`mr-4 px-4 py-2 rounded-md ${
              showActiveOnly 
                ? 'bg-green-500 text-white' 
                : 'bg-brown-100 dark:bg-dm-card-2 text-charcoal dark:text-white'
            }`}
          >
            {showActiveOnly ? 'Active Chats' : 'All Chats'}
          </button>
          
          <button
            onClick={fetchChatSessions}
            className="px-4 py-2 bg-primary-200 dark:bg-primary-300 text-white rounded-md"
            disabled={isLoading}
          >
            {isLoading ? <FaSpinner className="animate-spin" /> : 'Refresh'}
          </button>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 border border-brown-100 dark:border-dm-border rounded-md bg-white dark:bg-dm-card"
          />
          <FaSearch className="absolute left-3 top-3 text-brown-400 dark:text-white/40" />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Sessions Table */}
      <div className="bg-white dark:bg-dm-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
            <thead className="bg-ivory dark:bg-dm-card-2">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  Last Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brown-100 dark:divide-dm-border">
              {isLoading && pagination.offset === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    <FaSpinner className="animate-spin mx-auto" size={24} />
                    <span className="mt-2 block">Loading chat sessions...</span>
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-brown-400 dark:text-white/40">
                    No chat sessions found.
                  </td>
                </tr>
              ) : (
                filteredSessions.map(session => (
                  <tr key={session._id} className="hover:bg-ivory dark:hover:bg-dm-card-2">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {session.user ? (
                          <FaUser className="mr-2 text-brown-400 dark:text-white/40" />
                        ) : (
                          <FaUser className="mr-2 text-brown-400 dark:text-white/40" />
                        )}
                        <div>
                          {session.user ? (
                            <div className="font-medium">{session.user.name}</div>
                          ) : (
                            <div className="text-brown-400 dark:text-white/40">Guest User</div>
                          )}
                          <div className="text-xs text-brown-400 dark:text-white/40">
                            {session.userIdentifier}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-charcoal dark:text-white">
                        {getLastMessage(session)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-brown-400 dark:text-white/40">
                        <FaComment className="mr-1" />
                        {session.messages ? session.messages.length : 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brown-400 dark:text-white/40">
                      {formatDate(session.lastActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        session.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-brown-50 text-charcoal dark:bg-dm-card-2 dark:text-white/55'
                      }`}>
                        {session.isActive ? 'Active' : 'Closed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/admin/chat/${session._id}`}
                        className="text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
                      >
                        <FaEye className="inline mr-1" /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-brown-100 dark:border-dm-border">
          <div className="text-sm text-brown-500 dark:text-white/55">
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousPage}
              disabled={pagination.offset === 0}
              className="px-3 py-1 border border-brown-100 dark:border-dm-border rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={pagination.offset + pagination.limit >= pagination.total}
              className="px-3 py-1 border border-brown-100 dark:border-dm-border rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChatMonitor;