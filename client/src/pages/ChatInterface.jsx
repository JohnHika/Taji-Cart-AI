import React, { useEffect, useRef, useState } from 'react';
import { FaArrowLeft, FaCircle, FaDollarSign, FaMicrophone, FaPaperPlane, FaRobot, FaShoppingCart, FaSpinner, FaUser } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import Axios from '../utils/Axios';

const ChatInterface = () => {
  const [activeSession, setActiveSession] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionMetadata, setSessionMetadata] = useState({ preferredCurrency: 'KES' });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState(null);
  const MAX_CLIENT_RETRIES = 3;

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef(null);
  const recordingTimerRef = useRef(null);
  
  const user = useSelector(state => state.user);
  const cartItems = useSelector(state => state.cart?.items || []);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [suggestions, setSuggestions] = useState([
    "What gaming products do you recommend?",
    "I have a budget of KES 100,000",
    "Do you have RTX 4080 in stock?"
  ]);

  // Format messages with proper styling
  const formatMessageText = (text) => {
    if (!text) return '';
    
    // Check if it's a "no products found" message to highlight it
    const isNoProductsMessage = text.includes("couldn't find any") || 
                              text.includes("no products found") ||
                              text.includes("our product database is empty");
    
    if (isNoProductsMessage) {
      return (
        <div className="text-amber-600 dark:text-amber-400 font-medium">
          {text.split('\\n').map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < text.split('\\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      );
    }
    
    // Special formatting for numbered lists to make them more prominent
    const formattedLines = text.split('\\n').map((line, index) => {
      // Check if line starts with a number followed by period (like "1.")
      if (/^\d+\./.test(line)) {
        return (
          <React.Fragment key={index}>
            <span className="font-medium text-primary-500 dark:text-primary-300">{line}</span>
            {index < text.split('\\n').length - 1 && <br />}
          </React.Fragment>
        );
      }
      
      // Check if line contains product pricing/stock info after a numbered item
      if (index > 0 && /^\s+\(KES|\s+\(\$/.test(line)) {
        return (
          <React.Fragment key={index}>
            <span className="text-sm text-gray-600 dark:text-gray-400">{line}</span>
            {index < text.split('\\n').length - 1 && <br />}
          </React.Fragment>
        );
      }
      
      return (
        <React.Fragment key={index}>
          {line}
          {index < text.split('\\n').length - 1 && <br />}
        </React.Fragment>
      );
    });
    
    return formattedLines;
  };

  // Fetch recent chat sessions
  const fetchRecentSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const userKey = user?._id ? `chatSessionId_${user._id}` : 'chatSessionId_guest';
      const currentSessionId = localStorage.getItem(userKey);
      
      // For now, we'll mock the recent sessions data
      // In a real implementation, you'd fetch this from your API
      const mockSessions = [
        {
          id: currentSessionId || 'new-chat',
          title: 'New Chat',
          lastMessage: 'Start a new conversation',
          timestamp: new Date(),
          isActive: true
        }
      ];
      
      // If there's an active session, get its history
      if (currentSessionId) {
        try {
          const response = await Axios({
            url: `/api/chat/sessions/${currentSessionId}`,
            method: 'GET',
          });
          
          if (response.data && response.data.success && response.data.data) {
            const session = response.data.data;
            
            if (session.isActive) {
              // Set as first message
              mockSessions[0] = {
                id: session._id,
                title: getSessionTitle(session),
                lastMessage: getLastMessagePreview(session),
                timestamp: new Date(session.lastActive),
                isActive: true
              };
              
              // If this is the active session, set its messages
              if (!activeSession || activeSession.id === session._id) {
                setActiveSession(mockSessions[0]);
                
                // Format messages for display
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
                
                if (session.metadata) {
                  setSessionMetadata(session.metadata);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching session details:', error);
        }
      } else {
        // For new chats (no sessionId), set active session to "New Chat"
        setActiveSession(mockSessions[0]);
        setMessages([
          { type: 'bot', text: 'Hello! I\'m your personal shopping assistant. How can I help you today? Feel free to tell me your budget, and I\'ll find the perfect products for you.' }
        ]);
      }
      
      setRecentSessions(mockSessions);
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
      toast.error('Failed to load recent conversations');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Helper to generate a session title from its content
  const getSessionTitle = (session) => {
    if (!session.messages || session.messages.length === 0) {
      return 'New Conversation';
    }
    
    // Find first user message
    const firstUserMessage = session.messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      // Truncate message to create a title
      const title = firstUserMessage.content.substring(0, 30);
      return title.length < firstUserMessage.content.length ? `${title}...` : title;
    }
    
    return 'Shopping Assistant';
  };

  // Helper to get the last message preview
  const getLastMessagePreview = (session) => {
    if (!session.messages || session.messages.length === 0) {
      return 'No messages yet';
    }
    
    const lastMessage = session.messages[session.messages.length - 1];
    const preview = lastMessage.content.substring(0, 40);
    return preview.length < lastMessage.content.length ? `${preview}...` : preview;
  };

  useEffect(() => {
    // Fetch recent sessions when component mounts
    fetchRecentSessions();
    
    // Clean up any resources when component unmounts
    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Focus input when active session changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeSession]);

  // Update suggestions based on conversation context
  useEffect(() => {
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

    if (sessionMetadata.checkoutRequested) {
      navigate('/checkout');
    }
  }, [sessionMetadata, navigate]);

  // Scroll to the bottom of the messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Simulate typing delay for more natural conversation flow
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

  // Handle rate limited responses with exponential backoff
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

  // Add a product to the cart from chat
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

  // Handle sending a message
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
            await addToCartFromChat(sessionMetadata.recentProductList[index]);
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

      // Special handling for Royal Card/loyalty questions
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
        
        setIsLoading(false);
        return;
      }

      // Send the message to the server
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
        navigate('/checkout');
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

  // Start a new chat session
  const handleStartNewChat = async () => {
    try {
      // Clear session ID from local storage
      const userKey = user?._id ? `chatSessionId_${user._id}` : 'chatSessionId_guest';
      localStorage.removeItem(userKey);
      
      // Reset states
      setSessionId(null);
      setSessionMetadata({ preferredCurrency: 'KES' });
      setMessages([
        { type: 'bot', text: 'Hello! I\'m your personal shopping assistant. How can I help you today? Feel free to tell me your budget, and I\'ll find the perfect products for you.' }
      ]);
      
      // Update active session
      setActiveSession({
        id: 'new-chat',
        title: 'New Chat',
        lastMessage: 'Start a new conversation',
        timestamp: new Date(),
        isActive: true
      });
      
      // Close mobile sidebar if open
      setIsMobileSidebarOpen(false);
      
    } catch (error) {
      console.error('Error starting new chat:', error);
      toast.error('Failed to start a new chat');
    }
  };

  // Select a chat session
  const handleSelectSession = async (session) => {
    try {
      setActiveSession(session);
      
      if (session.id === 'new-chat') {
        await handleStartNewChat();
        return;
      }
      
      setSessionId(session.id);
      
      // Store session ID
      const userKey = user?._id ? `chatSessionId_${user._id}` : 'chatSessionId_guest';
      localStorage.setItem(userKey, session.id);
      
      // Fetch session details
      const response = await Axios({
        url: `/api/chat/sessions/${session.id}`,
        method: 'GET',
      });
      
      if (response.data && response.data.success && response.data.data) {
        const sessionData = response.data.data;
        
        // Format messages for display
        const formattedMessages = [
          { type: 'bot', text: 'Hello! I\'m your personal shopping assistant. How can I help you today? Feel free to tell me your budget, and I\'ll find the perfect products for you.' }
        ];
        
        if (sessionData.messages && sessionData.messages.length > 0) {
          sessionData.messages.forEach(msg => {
            formattedMessages.push({
              type: msg.role === 'assistant' ? 'bot' : 'user',
              text: msg.content
            });
          });
          
          setMessages(formattedMessages);
        }
        
        if (sessionData.metadata) {
          setSessionMetadata(sessionData.metadata);
        }
      }
      
      // Close mobile sidebar if open
      setIsMobileSidebarOpen(false);
      
    } catch (error) {
      console.error('Error selecting session:', error);
      toast.error('Failed to load conversation');
    }
  };

  // Format recording time (mm:ss)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Handle recording start/stop
  const handleMicButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Start audio recording
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
      toast.error("Could not access your microphone. Please check permissions and try again.");
    }
  };

  // Stop audio recording
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

  // Handle recording stop
  const handleRecordingStop = () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    setAudioBlob(audioBlob);
    
    if (audioBlob.size > 0) {
      transcribeAudio(audioBlob);
    }
  };

  // Transcribe audio to text
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

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setInputText(suggestion);
    handleSendMessage(null, suggestion);
  };

  // Render the ChatGPT-style interface
  return (
    <div className="w-full h-screen flex bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Mobile menu button */}
      <div className="md:hidden absolute top-4 left-4 z-50">
        <button 
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 rounded-md bg-white dark:bg-gray-800 shadow-md text-gray-800 dark:text-gray-200"
        >
          {isMobileSidebarOpen ? <FaArrowLeft /> : <FaRobot />}
        </button>
      </div>
      
      {/* Sidebar - Chat history */}
      <div 
        className={`${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 w-full md:w-80 h-full bg-gray-200 dark:bg-gray-800 transition-transform duration-300 ease-in-out flex flex-col`}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-gray-300 dark:border-gray-700">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 dark:text-gray-200">
            <FaRobot className="mr-2" /> Shopping Assistant
          </h2>
        </div>
        
        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleStartNewChat}
            className="w-full py-2 px-4 bg-primary-200 hover:bg-primary-300 dark:bg-primary-300 dark:hover:bg-primary-400 text-white rounded-md flex items-center justify-center"
          >
            <FaPlus className="mr-2" /> New Chat
          </button>
        </div>
        
        {/* Recent chat sessions */}
        <div className="flex-grow overflow-y-auto">
          {isLoadingSessions ? (
            <div className="flex flex-col items-center justify-center h-32">
              <LoadingSpinner size="medium" />
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">Loading conversations...</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {recentSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className={`w-full p-3 rounded-md text-left flex flex-col hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors ${
                    activeSession?.id === session.id 
                      ? 'bg-gray-300 dark:bg-gray-700' 
                      : 'bg-gray-100 dark:bg-gray-900'
                  }`}
                >
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    {session.title}
                  </div>
                  <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                    {session.lastMessage}
                  </div>
                </button>
              ))}
              
              {recentSessions.length === 0 && (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  <p>No recent conversations</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* User info */}
        <div className="p-3 border-t border-gray-300 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-300 rounded-full flex items-center justify-center text-white">
                <FaUser />
              </div>
              <div className="ml-2 text-gray-800 dark:text-gray-200">
                {user?._id ? (user.name || 'User') : 'Guest'}
              </div>
            </div>
            <div>
              <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                <FaHome />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main chat container */}
      <div className="flex-grow flex flex-col h-full max-h-screen">
        {/* Chat header */}
        <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h1 className="text-lg font-medium text-gray-800 dark:text-gray-200">
            {activeSession?.title || 'Shopping Assistant'}
          </h1>
          
          <div className="flex items-center">
            {/* Currency toggle */}
            <div className="mr-4 flex items-center bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100 text-xs rounded-lg px-3 py-1">
              <FaDollarSign className="mr-1" />
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
                className="text-xs hover:underline"
              >
                {sessionMetadata.preferredCurrency === 'USD' ? 'USD' : 'KES'}
              </button>
            </div>
            
            {/* Cart button */}
            <Link
              to="/checkout"
              className="flex items-center bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-xs rounded-lg px-3 py-1"
            >
              <FaShoppingCart className="mr-1" />
              <span>{cartItems.length || 0} items</span>
            </Link>
          </div>
        </div>
        
        {/* Chat messages */}
        <div className="flex-grow overflow-y-auto p-4 bg-white dark:bg-gray-900">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`mb-6 flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-3/4 md:max-w-2/3 rounded-lg px-4 py-3 ${
                  message.type === 'user' 
                    ? 'bg-primary-100 dark:bg-primary-300 text-gray-800 dark:text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white'
                }`}
              >
                <div className="flex items-start">
                  {message.type === 'bot' && (
                    <div className="mt-1 mr-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <FaRobot className="text-gray-600 dark:text-gray-300" size={16} />
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="font-medium mb-1">
                      {message.type === 'bot' ? 'Shopping Assistant' : 'You'}
                    </div>
                    <div className="text-sm whitespace-pre-line">
                      {formatMessageText(message.text)}
                    </div>
                  </div>
                  {message.type === 'user' && (
                    <div className="mt-1 ml-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-300 flex items-center justify-center">
                        <FaUser className="text-white" size={16} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="mb-6 flex justify-start">
              <div className="max-w-3/4 rounded-lg px-4 py-3 bg-gray-100 dark:bg-gray-800">
                <div className="flex items-start">
                  <div className="mt-1 mr-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <FaRobot className="text-gray-600 dark:text-gray-300" size={16} />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium mb-1">Shopping Assistant</div>
                    <div className="flex space-x-2">
                      <div className="typing-dot animate-bounce">
                        <FaCircle size={8} className="text-gray-600 dark:text-gray-300" />
                      </div>
                      <div className="typing-dot animate-bounce delay-150">
                        <FaCircle size={8} className="text-gray-600 dark:text-gray-300" />
                      </div>
                      <div className="typing-dot animate-bounce delay-300">
                        <FaCircle size={8} className="text-gray-600 dark:text-gray-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading indicator */}
          {isLoading && !isTyping && messages.length > 1 && (
            <div className="text-center py-4">
              <LoadingSpinner size="small" />
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Product actions */}
        {sessionMetadata.lastProductViewed && (
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-center gap-2">
            <button
              onClick={() => {
                addToCartFromChat(sessionMetadata.lastProductViewed);
              }}
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-full flex items-center"
              disabled={isLoading || isTyping}
            >
              <FaShoppingCart className="mr-1" size={10} /> Add to cart
            </button>
            <button
              onClick={() => handleSuggestionClick("Show me specs")}
              className="text-xs bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-800 dark:text-blue-100 px-3 py-1 rounded-full"
              disabled={isLoading || isTyping}
            >
              Specs
            </button>
            <button
              onClick={() => handleSuggestionClick("Check stock")}
              className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full"
              disabled={isLoading || isTyping}
            >
              Check stock
            </button>
          </div>
        )}
        
        {/* Suggestions */}
        <div className="bg-white dark:bg-gray-800 p-2 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full"
              disabled={isLoading || isTyping}
            >
              {suggestion}
            </button>
          ))}
        </div>
        
        {/* Input area */}
        <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <input
              type="text"
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={sessionMetadata.budget ? 
                `Ask about products under ${sessionMetadata.preferredCurrency === 'USD' ? 
                  `$${sessionMetadata.budget}` : 
                  `KES ${sessionMetadata.budget.toLocaleString()}`}...` : 
                "Ask about products, deals, prices..."}
              className="flex-grow py-2 px-3 bg-transparent outline-none text-gray-800 dark:text-white"
              disabled={isLoading || isTyping || isRecording || isTranscribing}
            />
            
            {/* Mic button */}
            <button
              type="button"
              onClick={handleMicButtonClick}
              disabled={isTranscribing}
              className={`p-2 mx-1 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'} text-gray-700 dark:text-gray-200`}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              title={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <div className="flex items-center">
                  <span className="mr-1 text-xs font-medium text-white animate-pulse">{formatTime(recordingTime)}</span>
                  <FaMicrophone className="text-white" />
                </div>
              ) : isTranscribing ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaMicrophone />
              )}
            </button>
            
            {/* Send button */}
            <button
              type="submit"
              className="bg-primary-200 dark:bg-primary-300 hover:bg-primary-300 dark:hover:bg-primary-400 text-white p-2 rounded-full disabled:opacity-50"
              disabled={isLoading || isTyping || !inputText.trim() || isRecording || isTranscribing}
            >
              <FaPaperPlane />
            </button>
          </div>
          
          {/* Disclaimer */}
          <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
            Shopping assistant is powered by our AI. It may produce inaccurate information.
          </div>
        </form>
      </div>
    </div>
  );
};

// Missing FaPlus icon import
const FaPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

// Missing FaHome icon import
const FaHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

export default ChatInterface;