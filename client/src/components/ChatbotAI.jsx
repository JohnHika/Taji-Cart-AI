import React, { useEffect, useRef, useState } from 'react';
import { FaCircle, FaCrown, FaDollarSign, FaExpand, FaMicrophone, FaPaperPlane, FaRobot, FaShoppingCart, FaSpinner, FaTimes, FaUser } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Axios from '../utils/Axios';
import LoadingSpinner from './LoadingSpinner';

const ChatbotAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Hello! I\'m your personal shopping assistant. How can I help you today? Feel free to tell me your budget, and I\'ll find the perfect products for you.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionMetadata, setSessionMetadata] = useState({ preferredCurrency: 'KES' });
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState(null);
  const MAX_CLIENT_RETRIES = 3;
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const user = useSelector(state => state.user);
  
  // Chat history state
  const [chatHistory, setChatHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [cart, setCart] = useState([]);
  const [isCheckoutRedirecting, setIsCheckoutRedirecting] = useState(false);
  const cartItems = useSelector(state => state.cart?.items || []);
  const dispatch = useDispatch();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const [suggestions, setSuggestions] = useState([
    "What gaming products do you recommend?",
    "I have a budget of KES 100,000",
    "Do you have RTX 4080 in stock?"
  ]);

  const formatMessageText = (text) => {
    if (!text) return '';
    
    // Check if it's a "no products found" message to highlight it
    const isNoProductsMessage = text.includes("couldn't find any") || 
                              text.includes("no products found") ||
                              text.includes("our product database is empty");
    
    if (isNoProductsMessage) {
      return (
        <div className="text-amber-600 dark:text-amber-400 font-medium">
          {text.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < text.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      );
    }
    
    // Special formatting for numbered lists to make them more prominent
    const formattedLines = text.split('\n').map((line, index) => {
      // Check if line starts with a number followed by period (like "1.")
      if (/^\d+\./.test(line)) {
        return (
          <React.Fragment key={index}>
            <span className="font-medium text-primary-500 dark:text-primary-300">{line}</span>
            {index < text.split('\n').length - 1 && <br />}
          </React.Fragment>
        );
      }
      
      // Check if line contains product pricing/stock info after a numbered item
      if (index > 0 && /^\s+\(KES|\s+\(\$/.test(line)) {
        return (
          <React.Fragment key={index}>
            <span className="text-sm text-gray-600 dark:text-gray-400">{line}</span>
            {index < text.split('\n').length - 1 && <br />}
          </React.Fragment>
        );
      }
      
      return (
        <React.Fragment key={index}>
          {line}
          {index < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      );
    });
    
    return formattedLines;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    // Dynamic suggestions based on conversation state
    if (sessionMetadata.needsCategorySelection && sessionMetadata.pendingBudget) {
      // User has shared budget but needs to select category - show category numbers as suggestions
      if (sessionMetadata.availableCategories && sessionMetadata.availableCategories.length > 0) {
        // Make the first three categories available as quick suggestions
        const categorySuggestions = sessionMetadata.availableCategories
          .slice(0, Math.min(3, sessionMetadata.availableCategories.length))
          .map((cat, idx) => `${idx + 1}`);
        
        setSuggestions(categorySuggestions);
      } else {
        setSuggestions(["1", "2", "3"]);
      }
    } else if (sessionMetadata.recentProductList && sessionMetadata.recentProductList.length > 0) {
      // If we have displayed products in a numbered list, show number selections as suggestions
      setSuggestions([
        "1",
        "2",
        "3"
      ]);
    } else if (sessionMetadata.preferredCurrency === 'USD') {
      if (sessionMetadata.budget) {
        setSuggestions([
          `Show me products under $${sessionMetadata.budget}`,
          "What's your best gaming keyboard?",
          "Add this to my cart"
        ]);
      } else {
        setSuggestions([
          "What gaming products do you recommend?",
          "I have a budget of $1000",
          "Do you have RTX 4080 in stock?"
        ]);
      }
    } else {
      if (sessionMetadata.budget) {
        setSuggestions([
          `Show me products under KES ${(sessionMetadata.budget).toLocaleString()}`,
          "What's your best gaming keyboard?",
          "Check stock"
        ]);
      } else {
        setSuggestions([
          "What gaming products do you recommend?",
          "I have a budget of KES 100,000",
          "Do you have RTX 4080 in stock?"
        ]);
      }
    }

    if (sessionMetadata.checkoutRequested && !isCheckoutRedirecting) {
      setIsCheckoutRedirecting(true);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'Redirecting you to checkout... This will just take a moment.' 
      }]);
      setTimeout(() => {
        window.location.href = '/checkout';
      }, 1500);
    }
  }, [sessionMetadata]);

  useEffect(() => {
    try {
      const userKey = user?._id ? `chatSessionId_${user._id}` : 'chatSessionId_guest';
      const savedSessionId = localStorage.getItem(userKey);
      if (savedSessionId) {
        setSessionId(savedSessionId);
        if (savedSessionId) {
          fetchChatHistory(savedSessionId);
        }
      }
    } catch (error) {
      console.error('Error loading chat session ID:', error);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [retryTimeout]);

  // Fetch user's chat history
  const fetchUserChatHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const userId = user?._id || 'guest';
      
      const response = await Axios({
        url: '/api/chat/user-history',
        method: 'GET',
        params: { userId }
      });
      
      if (response.data && response.data.success) {
        setChatHistory(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Load a specific chat session
  const loadChatSession = async (sessionId) => {
    try {
      setIsLoading(true);
      const response = await Axios({
        url: `/api/chat/sessions/${sessionId}`,
        method: 'GET',
      });
      
      if (response.data && response.data.success && response.data.data) {
        const session = response.data.data;
        
        if (session.metadata) {
          setSessionMetadata(session.metadata);
        }
        
        const formattedMessages = [
          { type: 'bot', text: 'Hello! I\'m your personal shopping assistant. How can I help you today? Feel free to tell me your budget, and I\'ll find the perfect products for you.' }
        ];
        
        if (session.messages && session.messages.length > 0) {
          session.messages.forEach(msg => {
            formattedMessages.push({
              type: msg.role === 'assistant' ? 'bot' : 'user',
              text: msg.content
            });
          });
          setMessages(formattedMessages);
        }
        
        setSessionId(sessionId);
        
        // Store session ID in localStorage for persistence
        const userKey = user?._id ? `chatSessionId_${user._id}` : 'chatSessionId_guest';
        localStorage.setItem(userKey, sessionId);
        
        // Close history panel
        setIsHistoryOpen(false);
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatHistory = async (sid) => {
    try {
      if (!sid) return;
      setIsLoading(true);
      const response = await Axios({
        url: `/api/chat/sessions/${sid}`,
        method: 'GET',
      });
      if (response.data && response.data.success && response.data.data) {
        const session = response.data.data;
        if (session.isActive) {
          if (session.metadata) {
            setSessionMetadata(session.metadata);
          }
          const formattedMessages = [
            { type: 'bot', text: 'Hello! I\'m your personal shopping assistant. How can I help you today? Feel free to tell me your budget, and I\'ll find the perfect products for you.' }
          ];
          if (session.messages && session.messages.length > 0) {
            session.messages.forEach(msg => {
              formattedMessages.push({
                type: msg.role === 'assistant' ? 'bot' : 'user',
                text: msg.content
              });
            });
            setMessages(formattedMessages);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching chat history, starting new session:', error);
      const userKey = user?._id ? `chatSessionId_${user._id}` : 'chatSessionId_guest';
      localStorage.removeItem(userKey);
      setSessionId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggleChat = () => {
    setIsOpen(!isOpen);
  };

  const simulateTyping = (text) => {
    setIsTyping(true);
    const typingTime = Math.min(1000 + text.length * 30, 3000);
    return new Promise(resolve => {
      setTimeout(() => {
        setIsTyping(false);
        resolve();
      }, typingTime);
    });
  };

  const handleRateLimitedResponse = (error) => {
    if (error.response?.data?.error === 'rate_limit' || 
        error.response?.status === 429) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      const backoffTime = Math.min(Math.pow(2, newRetryCount) * 1000, 30000);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: `I'm experiencing high demand right now. I'll try again in ${backoffTime/1000} seconds...` 
      }]);
      if (retryTimeout) clearTimeout(retryTimeout);
      if (newRetryCount <= MAX_CLIENT_RETRIES) {
        const timeout = setTimeout(() => {
          handleSendMessage(null, inputText, true);
        }, backoffTime);
        setRetryTimeout(timeout);
      } else {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: "Sorry, I'm still experiencing high traffic. Please try again later or contact customer support." 
        }]);
        setRetryCount(0);
      }
      return true;
    }
    return false;
  };

  const addToCartFromChat = async (productId) => {
    if (!productId) return;
    try {
      const response = await Axios({
        url: `/api/products/${productId}`,
        method: 'GET',
      });
      if (response.data && response.data.success) {
        const product = response.data.data;
        dispatch({
          type: 'ADD_TO_CART',
          payload: {
            id: product._id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
          }
        });
        setCart(prev => [...prev, product]);
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: `I've added ${product.name} to your cart. Would you like to checkout now or continue shopping?` 
        }]);
        setSessionMetadata(prev => ({
          ...prev,
          cartUpdated: true,
          checkoutPrompted: true
        }));
      }
    } catch (error) {
      console.error('Error adding product to cart:', error);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'I encountered an issue adding this item to your cart. Please try adding it directly from the product page.' 
      }]);
    }
  };

  const ProductStrip = ({ items }) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.slice(0, 3).map((p, i) => {
          const name = typeof p === 'string' ? `Product ${i+1}` : p.name;
          const id = typeof p === 'string' ? p : p?._id;
          const price = typeof p === 'string' ? null : p?.price;
          const image = typeof p === 'string' ? null : p?.image;
          return (
            <div key={id || i} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
              {image ? (
                <img src={image} alt={name} className="w-16 h-16 object-cover rounded" />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded" />
              )}
              <div className="flex-1">
                <div className="text-sm font-medium line-clamp-2">{name}</div>
                {price != null && <div className="text-xs text-gray-600">KES {Number(price).toLocaleString()}</div>}
              </div>
              {id && (
                <button onClick={() => addToCartFromChat(id)} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded">
                  Add
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleSendMessage = async (e, retryText = null, isRetry = false) => {
    if (e) e.preventDefault();
    const textToSend = retryText || inputText;
    if (!textToSend.trim()) return;
    if (!isRetry) {
      const userMessage = { type: 'user', text: textToSend };
      setMessages(prev => [...prev, userMessage]);
      setInputText('');
    }
    setIsLoading(true);
    
    // Check for numeric-only responses when categories or products are being shown
    const isNumericResponse = /^\d+$/.test(textToSend.trim());
    
    if (isNumericResponse && sessionMetadata.needsCategorySelection && sessionMetadata.pendingBudget) {
      // Add a temporary message to indicate the system is searching
      setIsTyping(true);
      
      // Find the category name for better feedback to user
      const numericChoice = parseInt(textToSend.trim());
      if (sessionMetadata.availableCategories && 
          numericChoice > 0 && 
          numericChoice <= sessionMetadata.availableCategories.length) {
        const selectedCategory = sessionMetadata.availableCategories[numericChoice - 1];
        
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: `Searching for ${selectedCategory} that match your budget of ${sessionMetadata.preferredCurrency === 'KES' ? 
            `KES ${sessionMetadata.pendingBudget.toLocaleString()}` : 
            `$${sessionMetadata.pendingBudget.toLocaleString()}`}...` 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'Searching for products that match your budget...' 
        }]);
      }
    }
    
    try {
      const addToCartPatterns = [
        /add (the )?(.*?) to (my )?cart/i,
        /buy (the )?(.*?)( now)?$/i,
        /purchase (the )?(.*?)$/i,
        /get (the )?(.*?)$/i,
        /add this to (my )?cart/i
      ];
      const isAddToCartRequest = addToCartPatterns.some(pattern => pattern.test(textToSend)) ||
                               (textToSend.toLowerCase().includes('cart') && sessionMetadata.lastProductViewed);
      const productIndexMatch = textToSend.match(/(first|second|third|1st|2nd|3rd|last) (one|option|product)/i);
      if (productIndexMatch && sessionMetadata.recentProductList) {
        let index = -1;
        const indexText = productIndexMatch[1].toLowerCase();
        if (indexText === 'first' || indexText === '1st') index = 0;
        else if (indexText === 'second' || indexText === '2nd') index = 1;
        else if (indexText === 'third' || indexText === '3rd' || indexText === 'last') index = 2;
        if (index >= 0 && index < sessionMetadata.recentProductList.length) {
          if (isAddToCartRequest) {
            const entry = sessionMetadata.recentProductList[index];
            const id = typeof entry === 'string' ? entry : entry?._id;
            if (id) await addToCartFromChat(id);
            setSessionMetadata(prev => ({
              ...prev,
              cartActionHandled: true
            }));
          }
        }
      }
      if (isAddToCartRequest && sessionMetadata.lastProductViewed && !sessionMetadata.cartActionHandled) {
        await addToCartFromChat(sessionMetadata.lastProductViewed);
        setSessionMetadata(prev => ({
          ...prev,
          cartActionHandled: true
        }));
      }

      if (textToSend.toLowerCase().includes('royal card') || 
          textToSend.toLowerCase().includes('loyalty') || 
          textToSend.toLowerCase().includes('points')) {
        
        // Tell user to check their profile for loyalty card details
        setMessages(prev => [
          ...prev,
          { type: 'bot', text: 'Your Royal Card is available in your profile page. You can view your membership tier, points balance, and benefits there. Would you like to know more about specific Royal Card benefits?' }
        ]);
        
        // Set suggestions related to loyalty program
        setSuggestions([
          'What are Royal Card benefits?',
          'How do I earn points?',
          'How to upgrade my tier?'
        ]);
        
        return;
      }

      const response = await Axios({
        url: '/api/chat/message',
        method: 'POST',
        data: {
          message: textToSend,
          userId: user?._id || 'guest',
          sessionId: sessionId
        }
      });
      if (response.data && response.data.sessionId) {
        const userKey = user?._id ? `chatSessionId_${user._id}` : 'chatSessionId_guest';
        setSessionId(response.data.sessionId);
        localStorage.setItem(userKey, response.data.sessionId);
      }
      if (response.data && response.data.metadata) {
        setSessionMetadata(response.data.metadata);
      }
      if (response.data && response.data.message) {
        await simulateTyping(response.data.message);
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: response.data.message 
        }]);
      }
      if (response.data && response.data.metadata && response.data.metadata.checkoutRequested) {
        setIsCheckoutRedirecting(true);
        setTimeout(() => {
          window.location.href = '/checkout';
        }, 1500);
      }
      if (sessionMetadata.cartActionHandled) {
        setSessionMetadata(prev => ({
          ...prev,
          cartActionHandled: false
        }));
      }
      setRetryCount(0);
    } catch (error) {
      if (!handleRateLimitedResponse(error)) {
        console.error('Error sending message to chatbot:', error);
        await simulateTyping('Sorry, I encountered an error. Please try again later.');
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'Sorry, I encountered an error. Please try again later.' 
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    setMessages([
      { type: 'bot', text: 'Hello! I\'m your personal shopping assistant. How can I help you today? Feel free to tell me your budget, and I\'ll find the perfect products for you.' }
    ]);
    if (sessionId) {
      try {
        await Axios({
          url: `/api/chat/sessions/${sessionId}/close`,
          method: 'PATCH',
        });
      } catch (error) {
        console.error('Error closing chat session:', error);
      }
      const userKey = user?._id ? `chatSessionId_${user._id}` : 'chatSessionId_guest';
      localStorage.removeItem(userKey);
      setSessionId(null);
    }
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      setRecordingTime(0);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=pcm')) {
        mimeType = 'audio/webm;codecs=pcm';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      }
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mediaRecorder.onstop = handleRecordingStop;
      mediaRecorder.start(250);
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access your microphone. Please check permissions and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const handleRecordingStop = () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    setAudioBlob(audioBlob);
    if (audioBlob.size > 0) {
      transcribeAudio(audioBlob);
    }
  };

  const transcribeAudio = async (blob) => {
    if (!blob) return;
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      const response = await Axios({
        url: '/api/chat/transcribe',
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (response.data && response.data.success) {
        setInputText(response.data.transcription);
        if (response.data.transcription && 
            response.data.transcription.length > 5 && 
            !response.data.transcription.includes("development placeholder")) {
          setTimeout(() => {
            handleSendMessage(null, response.data.transcription, false);
          }, 300);
        }
      } else {
        console.error("Transcription failed:", response.data?.message || "Unknown error");
        setInputText("How can you help me?");
      }
    } catch (error) {
      console.error("Error transcribing audio:", error);
      setInputText("What products do you recommend?");
    } finally {
      setIsTranscribing(false);
      setAudioBlob(null);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleMicButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputText(suggestion);
    handleSendMessage(null, suggestion);
  };

  // Helper function to format dates for chat history
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Helper function to truncate text for preview
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const handleNewChat = async () => {
    // Reset UI state
    setMessages([
      { type: 'bot', text: 'Hello! I\'m your personal shopping assistant. How can I help you today? Feel free to tell me your budget, and I\'ll find the perfect products for you.' }
    ]);
    setSessionMetadata({ preferredCurrency: 'KES' });
    setInputText('');
    
    // Close current session but don't delete it from backend
    if (sessionId) {
      try {
        await Axios({
          url: `/api/chat/sessions/${sessionId}/close`,
          method: 'PATCH',
        });
      } catch (error) {
        console.error('Error closing chat session:', error);
      }
    }
    
    // Clear session ID from localStorage to force a new session on next message
    const userKey = user?._id ? `chatSessionId_${user._id}` : 'chatSessionId_guest';
    localStorage.removeItem(userKey);
    setSessionId(null);
    
    // Make sure chat is open
    setIsOpen(true);
  };

  return (
    <div className="fixed bottom-20 sm:bottom-24 lg:bottom-5 right-4 z-50">
      {/* Launcher button */}
      <button
        onClick={handleToggleChat}
        className="bg-plum-700 hover:bg-plum-600 dark:bg-plum-800 dark:hover:bg-plum-700 text-white p-3 md:p-4 rounded-full shadow-hover flex items-center justify-center transition-all duration-300 w-12 h-12 md:w-14 md:h-14 press"
        aria-label="Chat with AI assistant"
      >
        {isOpen ? <FaTimes size={18} /> : <FaCrown size={18} />}
      </button>

      {isOpen && (
        <div className="absolute bottom-14 right-0 md:bottom-16 md:right-0 w-[92vw] max-w-[360px] md:w-96 mx-2 md:mx-0 bg-white dark:bg-dm-card rounded-card shadow-hover border border-brown-100 dark:border-dm-border overflow-hidden transition-all duration-300 max-h-[80vh] md:max-h-[600px] animate-scale-in">
          {/* Panel header */}
          <div className="bg-plum-700 dark:bg-plum-900 text-white px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FaCrown size={14} className="text-gold-300" />
              <h3 className="font-semibold text-sm">Hair Shopping Assistant</h3>
            </div>
            <div className="flex items-center">
              {/* Add New Chat button */}
              <button 
                onClick={handleNewChat}
                className="text-white hover:text-gray-200 mr-3"
                aria-label="Start new chat"
                title="Start new chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
              {/* Add Chat History button */}
              <button 
                onClick={() => {
                  fetchUserChatHistory();
                  setIsHistoryOpen(!isHistoryOpen);
                }}
                className="text-white hover:text-gray-200 mr-3"
                aria-label="View chat history"
                title="View chat history"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </button>
              {/* Add expand to full-page button */}
              <Link 
                to="/chat" 
                className="text-white hover:text-gray-200 mr-3"
                aria-label="Open full-page chat"
                title="Open full-page chat"
              >
                <FaExpand size={16} />
              </Link>
              <button 
                onClick={handleClearChat}
                className="text-white hover:text-gray-200 mr-3"
                aria-label="Clear chat history"
                title="Clear chat history"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={handleToggleChat}
                className="text-white hover:text-gray-200"
                aria-label="Close chat"
              >
                <FaTimes />
              </button>
            </div>
          </div>
          
          {/* Chat History Panel */}
          {isHistoryOpen && (
            <div className="absolute inset-0 z-10 bg-white dark:bg-dm-card overflow-hidden">
              <div className="bg-plum-700 dark:bg-plum-900 text-white px-4 py-3 flex justify-between items-center">
                <h3 className="font-medium text-sm md:text-base">Chat History</h3>
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-white hover:text-gray-200"
                  aria-label="Close history"
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="p-2 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
                {isHistoryLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <LoadingSpinner size="small" />
                  </div>
                ) : chatHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No previous chat history found.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chatHistory.map(session => (
                      <div 
                        key={session.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          session.isActive ? 
                            'border-primary-200 dark:border-primary-300' : 
                            'border-gray-200 dark:border-gray-700'
                        }`}
                        onClick={() => loadChatSession(session.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="font-medium text-sm">
                            {session.preferredCategory || formatDate(session.createdAt)}
                          </div>
                          <div className={`text-xs px-2 py-0.5 rounded-full ${
                            session.isActive ? 
                              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {session.isActive ? 'Active' : 'Closed'}
                          </div>
                        </div>
                        
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {session.messageCount} messages · Last active: {formatDate(session.lastActive)}
                        </div>
                        
                        {session.lastMessage && (
                          <div className="mt-2 text-sm truncate">
                            {session.lastMessage.role === 'user' ? 'You: ' : 'Bot: '}
                            {truncateText(session.lastMessage.content, 60)}
                          </div>
                        )}
                        
                        {session.budget && (
                          <div className="mt-1 text-xs bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-0.5 rounded inline-block">
                            Budget: {session.budget}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="px-3 py-2 bg-plum-50 dark:bg-plum-900/30 border-b border-plum-100 dark:border-plum-800 text-plum-700 dark:text-plum-200 text-xs md:text-sm flex flex-wrap md:flex-nowrap items-center justify-between gap-2">
            <div className="flex items-center">
              <FaDollarSign className="mr-1" />
              <span>
                {sessionMetadata.budget ? 
                  `Budget: ${sessionMetadata.preferredCurrency === 'USD' ? 
                    `$${sessionMetadata.budget}` : 
                    `KES ${sessionMetadata.budget.toLocaleString()}`}` : 
                  `Currency: ${sessionMetadata.preferredCurrency === 'USD' ? 'US Dollars' : 'Kenyan Shillings'}`}
              </span>
            </div>
            <button 
              onClick={() => {
                setSessionMetadata({
                  ...sessionMetadata, 
                  preferredCurrency: sessionMetadata.preferredCurrency === 'USD' ? 'KES' : 'USD'
                });
                setMessages(prev => [...prev, {
                  type: 'bot',
                  text: sessionMetadata.preferredCurrency === 'USD' ? 
                    "I'll switch to showing prices in Kenyan Shillings." : 
                    "I'll switch to showing prices in US Dollars."
                }]);
              }}
              className="text-xs underline hover:text-green-700 dark:hover:text-green-200"
            >
              Switch to {sessionMetadata.preferredCurrency === 'USD' ? 'KES' : 'USD'}
            </button>
            <div className="flex items-center">
              <FaShoppingCart className="mr-1" />
              <span className="text-xs">{cartItems.length || cart.length} items</span>
            </div>
          </div>
          <div className="h-60 md:h-80 overflow-y-auto p-3 bg-ivory dark:bg-dm-surface">
            {isLoading && messages.length <= 1 ? (
              <div className="flex justify-center items-center h-full">
                <LoadingSpinner size="medium" />
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-3 ${message.type === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <div
                    className={`inline-block px-3 py-2 rounded-card max-w-[85%] text-left ${
                      message.type === 'user'
                        ? 'bg-gold-100 dark:bg-gold-600/20 text-charcoal dark:text-white border border-gold-200 dark:border-gold-600/30'
                        : 'bg-blush-100 dark:bg-dm-card text-charcoal dark:text-white border border-blush-200 dark:border-dm-border'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.type === 'bot' && (
                        <FaCrown size={12} className="text-plum-500 dark:text-plum-300 flex-shrink-0 mt-1" />
                      )}
                      <div className="text-sm whitespace-pre-line">{formatMessageText(message.text)}</div>
                      {message.type === 'user' && (
                        <FaUser size={11} className="ml-1 text-gold-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isTyping && (
              <div className="mb-3 text-left">
                <div className="inline-block px-3 py-2 rounded-card bg-blush-100 dark:bg-dm-card border border-blush-200 dark:border-dm-border">
                  <div className="flex items-center gap-1.5">
                    <FaCrown size={12} className="text-plum-500" />
                    <div className="flex space-x-1">
                      <FaCircle size={5} className="text-plum-400 animate-pulse" />
                      <FaCircle size={5} className="text-plum-400 animate-pulse delay-150" />
                      <FaCircle size={5} className="text-plum-400 animate-pulse delay-300" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {isLoading && !isTyping && messages.length > 1 && (
              <div className="text-center py-2">
                <LoadingSpinner size="small" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {isCheckoutRedirecting && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg flex flex-col items-center">
                <LoadingSpinner size="medium" />
                <p className="mt-2 text-sm">Redirecting to checkout...</p>
              </div>
            </div>
          )}
          {sessionMetadata.lastProductViewed && (
            <div className="px-3 py-2 border-t border-brown-100 dark:border-dm-border flex justify-center gap-2">
              <button
                onClick={() => addToCartFromChat(sessionMetadata.lastProductViewed)}
                className="text-[10px] md:text-xs bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold px-3 py-1.5 rounded-pill flex items-center gap-1 press"
                disabled={isLoading || isTyping || isCheckoutRedirecting}
              >
                <FaShoppingCart size={10} /> Add to cart
              </button>
              <button
                onClick={() => handleSuggestionClick("Show me specs")}
                className="text-[10px] md:text-xs bg-plum-50 dark:bg-plum-900/30 hover:bg-plum-100 dark:hover:bg-plum-900/50 text-plum-700 dark:text-plum-200 px-2 py-1.5 rounded-pill"
                disabled={isLoading || isTyping}
              >
                Specs
              </button>
              <button
                onClick={() => handleSuggestionClick("Check stock")}
                className="text-[10px] md:text-xs bg-brown-50 dark:bg-dm-card hover:bg-brown-100 dark:hover:bg-dm-card-2 text-brown-500 dark:text-white/60 px-2 py-1.5 rounded-pill"
                disabled={isLoading || isTyping}
              >
                Check stock
              </button>
            </div>
          )}
          <div className="px-3 py-2 border-t border-brown-100 dark:border-dm-border flex flex-wrap gap-1.5">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-[10px] md:text-xs bg-plum-50 dark:bg-plum-900/20 hover:bg-plum-100 dark:hover:bg-plum-900/40 text-plum-700 dark:text-plum-200 border border-plum-100 dark:border-plum-800 px-2 py-1 rounded-pill transition-colors"
                disabled={isLoading || isTyping}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="p-2 md:p-3 border-t border-brown-100 dark:border-dm-border flex gap-1">
            <input
              type="text"
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about hair products..."
              className="flex-grow p-2 text-sm bg-blush-100 dark:bg-dm-card-2 border border-blush-200 dark:border-dm-border rounded-pill outline-none text-charcoal dark:text-white placeholder:text-brown-300 dark:placeholder:text-white/30 focus:border-plum-500 transition-colors px-3"
              disabled={isLoading || isTyping || isRecording || isTranscribing}
            />
            <button
              type="button"
              onClick={handleMicButtonClick}
              disabled={isTranscribing}
              className={`p-2 rounded-pill flex-shrink-0 transition-colors ${
                isRecording
                  ? 'bg-blush-400 text-white'
                  : 'bg-plum-50 dark:bg-dm-card text-plum-500 hover:bg-plum-100'
              }`}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-medium animate-pulse">{formatTime(recordingTime)}</span>
                  <FaMicrophone size={13} />
                </div>
              ) : isTranscribing ? (
                <FaSpinner size={13} className="animate-spin" />
              ) : (
                <FaMicrophone size={13} />
              )}
            </button>
            <button
              type="submit"
              className="bg-gold-500 hover:bg-gold-400 text-charcoal p-2 px-3 rounded-pill disabled:opacity-40 transition-colors press flex-shrink-0"
              disabled={isLoading || isTyping || !inputText.trim() || isRecording || isTranscribing}
            >
              <FaPaperPlane size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatbotAI;