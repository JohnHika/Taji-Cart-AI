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
        <p className="text-gray-600 dark:text-gray-300">
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
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
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
            className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Sessions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading && pagination.offset === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    <FaSpinner className="animate-spin mx-auto" size={24} />
                    <span className="mt-2 block">Loading chat sessions...</span>
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No chat sessions found.
                  </td>
                </tr>
              ) : (
                filteredSessions.map(session => (
                  <tr key={session._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {session.user ? (
                          <FaUser className="mr-2 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <FaUser className="mr-2 text-gray-400 dark:text-gray-500" />
                        )}
                        <div>
                          {session.user ? (
                            <div className="font-medium">{session.user.name}</div>
                          ) : (
                            <div className="text-gray-500 dark:text-gray-400">Guest User</div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {session.userIdentifier}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-200">
                        {getLastMessage(session)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <FaComment className="mr-1" />
                        {session.messages ? session.messages.length : 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(session.lastActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        session.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
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
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousPage}
              disabled={pagination.offset === 0}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={pagination.offset + pagination.limit >= pagination.total}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50"
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