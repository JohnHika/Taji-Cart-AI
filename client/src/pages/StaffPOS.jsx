import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { 
  FaBarcode, 
  FaCalculator, 
  FaMoneyBillAlt, 
  FaCreditCard, 
  FaEdit, 
  FaMinus, 
  FaMobile, 
  FaPlus, 
  FaPrint, 
  FaSearch, 
  FaShoppingCart, 
  FaTimes, 
  FaUser, 
  FaUserPlus,
  FaTrash,
  FaTag,
  FaPercent,
  FaSave,
  FaListUl,
  FaQuestionCircle,
  FaQrcode
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import LoadingSpinner from '../components/LoadingSpinner';
import { nawiriBrand } from '../config/brand';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import isStaff from '../utils/isStaff';

const SALES_COUNTER_TITLE = 'Branch Sales Counter';
const SALES_RECORDS_LABEL = 'Sales Records';
const BARCODE_SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf'];
const QR_SCAN_FORMATS = ['qr_code'];
const PRODUCT_SCAN_FORMATS = [...BARCODE_SCAN_FORMATS, ...QR_SCAN_FORMATS];

const StaffPOS = () => {
  const user = useSelector(state => state.user);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const loyaltyScannerVideoRef = useRef(null);
  const productScannerVideoRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const scannerIntervalRef = useRef(null);
  const scannerBusyRef = useRef(false);
  const hasStoredSession = Boolean(
    sessionStorage.getItem('accesstoken') ||
    sessionStorage.getItem('refreshToken') ||
    localStorage.getItem('accesstoken') ||
    localStorage.getItem('refreshToken') ||
    localStorage.getItem('token')
  );
  const canAccessSalesCounter = isStaff(user);

  // Core POS state
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [barcode, setBarcode] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [applyTax, setApplyTax] = useState(false);
  const [showProductScanner, setShowProductScanner] = useState(false);
  const [productScannerError, setProductScannerError] = useState('');
  const [productScannerStatus, setProductScannerStatus] = useState('');
  const [loyaltyScannerStatus, setLoyaltyScannerStatus] = useState('');
  const [cameraDetectionAvailable, setCameraDetectionAvailable] = useState(false);
  const TAX_RATE = 0.16; // 16%
  
  // Customer state
  const [customer, setCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [loyaltyCardNumber, setLoyaltyCardNumber] = useState('');
  const [scanningCard, setScanningCard] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScannerError, setQrScannerError] = useState('');
  const [scanMode, setScanMode] = useState('barcode'); // 'barcode' or 'qr' - barcode is default
  const [scannedCustomer, setScannedCustomer] = useState(null); // Store customer from scanning
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountMode, setDiscountMode] = useState('percent');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [splitPayments, setSplitPayments] = useState([
    { method: 'cash', amount: '', phone: '', mpesaStatus: 'idle', mpesaCheckoutId: '', mpesaRequesting: false }
  ]);
  
  // Receipt state
  const [currentSale, setCurrentSale] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  
  // Parked/Held sales (local)
  const [parkedSales, setParkedSales] = useState(() => {
    try {
      const raw = localStorage.getItem('pos_parkedSales');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [showParkedDrawer, setShowParkedDrawer] = useState(false);
  const [parkedSearch, setParkedSearch] = useState('');
  const [expandedParked, setExpandedParked] = useState({});

  // Loading states
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);

  // Wait for session hydration before deciding access, and allow admins to use the counter.
  useEffect(() => {
    if (!user?._id) {
      if (!hasStoredSession) {
        toast.error('Please log in to continue.');
        navigate('/login');
      }
      return;
    }

    if (!canAccessSalesCounter) {
      toast.error('Access denied. Staff privileges required.');
      navigate('/dashboard/profile');
    }
  }, [user?._id, hasStoredSession, canAccessSalesCounter, navigate]);

  // Load initial data
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const detectBarcodeSupport = async () => {
      if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
        if (isMounted) {
          setCameraDetectionAvailable(false);
        }
        return;
      }

      try {
        if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
          const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
          if (isMounted) {
            setCameraDetectionAvailable(
              supportedFormats.some((format) => [...BARCODE_SCAN_FORMATS, ...QR_SCAN_FORMATS].includes(format))
            );
          }
          return;
        }

        if (isMounted) {
          setCameraDetectionAvailable(true);
        }
      } catch {
        if (isMounted) {
          setCameraDetectionAvailable(true);
        }
      }
    };

    detectBarcodeSupport();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load customers when modal opens
  useEffect(() => {
    if (showCustomerModal && allCustomers.length === 0) {
      loadAllCustomers();
    }
  }, [showCustomerModal]);

  // Initialize scanner when activated
  useEffect(() => {
    if (showQRScanner) {
      initializeScanner();
    }
  }, [showQRScanner]);

  useEffect(() => {
    return () => {
      stopActiveScanner();
    };
  }, []);

  // Auto-apply loyalty discount when customer is selected and cart has items
  useEffect(() => {
    if (customer?.loyaltyCard && cart.length > 0) {
      const loyaltyDiscountRate = getCustomerDiscount();
      if (loyaltyDiscountRate > 0 && discount !== loyaltyDiscountRate) {
        setDiscount(loyaltyDiscountRate);
        setDiscountMode('percent');
        console.log(`Auto-applied ${loyaltyDiscountRate}% loyalty discount for ${customer.loyaltyCard.tier} member`);
      }
    }
  }, [customer, cart.length]); // Re-run when customer or cart items change

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      const response = await Axios({
        ...SummaryApi.getProduct,
      });
      
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setProductsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await Axios({
        ...SummaryApi.getCategory,
      });
      
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return products.filter(product => {
      const matchesSearch = !s || product.name?.toLowerCase().includes(s) ||
        product.description?.toLowerCase().includes(s) ||
        product.brand?.toLowerCase().includes(s) ||
        product.sku?.toLowerCase().includes(s) ||
        product.barcode?.toLowerCase().includes(s) ||
        product.qrCode?.toLowerCase().includes(s);
      // Normalize category IDs from various shapes
      const catIds = (() => {
        const ids = [];
        const c = product.category;
        if (Array.isArray(c)) {
          for (const it of c) {
            if (!it) continue;
            if (typeof it === 'string') ids.push(it);
            else if (typeof it === 'object') ids.push(it._id || it.id);
          }
        } else if (c) {
          if (typeof c === 'string') ids.push(c);
          else if (typeof c === 'object') ids.push(c._id || c.id);
        }
        if (product.categoryId) ids.push(product.categoryId);
        if (product.category?._id) ids.push(product.category._id);
        return ids.filter(Boolean);
      })();
      const matchesCategory = selectedCategory === 'all' || catIds.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const getProductScanLabel = (product) => {
    if (product.barcode) return { label: 'Barcode', value: product.barcode };
    if (product.qrCode) return { label: 'QR', value: product.qrCode };
    if (product.sku) return { label: 'SKU', value: product.sku };
    return null;
  };

  // Add product to cart
  const addToCart = (product) => {
    const existingItem = cart.find(item => item._id === product._id);

    if ((existingItem?.quantity || 0) >= Number(product.stock || 0)) {
      toast.error(`${product.name} has no more stock available for this sale`);
      return;
    }
    
    if (existingItem) {
      setCart(cart.map(item => 
        item._id === product._id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    
    toast.success(`${product.name} added to cart`);
  };

  // Update quantity in cart
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const matchingItem = cart.find(item => item._id === productId);
    if (matchingItem && newQuantity > Number(matchingItem.stock || 0)) {
      toast.error(`Only ${matchingItem.stock} unit(s) of ${matchingItem.name} are available`);
      return;
    }
    
    setCart(cart.map(item => 
      item._id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  // Remove from cart
  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item._id !== productId));
  };

  // Calculate totals
  const calculateTotals = () => {
    const lineTotals = cart.map(item => {
      const lineSub = item.price * item.quantity;
      const lineDiscountPct = item.discountPct ? Math.min(100, Math.max(0, item.discountPct)) : 0;
      const lineDiscount = lineSub * (lineDiscountPct / 100);
      return { lineSub, lineDiscount };
    });
    const subtotal = lineTotals.reduce((s, l) => s + l.lineSub, 0);
    const perLineDiscount = lineTotals.reduce((s, l) => s + l.lineDiscount, 0);
    const orderDiscount = discountMode === 'percent'
      ? subtotal * (discount / 100)
      : Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
    const loyaltyDiscount = customer?.loyaltyCard ? getCustomerDiscount() : 0;
    const loyaltyAmount = subtotal * (loyaltyDiscount / 100);
    const preTaxTotal = Math.max(0, subtotal - (perLineDiscount + orderDiscount + loyaltyAmount));
    const tax = applyTax ? preTaxTotal * TAX_RATE : 0;
    const total = preTaxTotal + tax;
    
    return {
      subtotal,
      discountAmount: perLineDiscount + orderDiscount + loyaltyAmount,
      tax,
      total: Math.max(0, total),
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
    };
  };

  const getCustomerDiscount = () => {
    if (!customer?.loyaltyCard) return 0;
    
    // Use the enhanced discount rate logic
    return getDiscountRate(customer.loyaltyCard);
  };

  // Search customers
  const searchCustomers = async (query) => {
    if (!query.trim()) {
      // If empty search, show all customers
      setCustomerSearchResults(allCustomers);
      return;
    }
    
    try {
      // If we have customers locally, filter them first for immediate response
      if (allCustomers.length > 0) {
        const localFiltered = allCustomers.filter(customer => 
          customer.name.toLowerCase().includes(query.toLowerCase()) ||
          customer.email.toLowerCase().includes(query.toLowerCase()) ||
          (customer.mobile && customer.mobile.includes(query))
        );
        setCustomerSearchResults(localFiltered);
      }
      
      // Also try server search for more comprehensive results
      const response = await Axios({
        url: `/api/user/search?q=${encodeURIComponent(query)}&role=user`,
        method: 'GET'
      });
      
      if (response.data.success) {
        setCustomerSearchResults(response.data.data);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      // Fallback to local filtering if API fails
      if (allCustomers.length > 0) {
        const filtered = allCustomers.filter(customer => 
          customer.name.toLowerCase().includes(query.toLowerCase()) ||
          customer.email.toLowerCase().includes(query.toLowerCase()) ||
          (customer.mobile && customer.mobile.includes(query))
        );
        setCustomerSearchResults(filtered);
      }
    }
  };

  // Load all customers on component mount and when modal opens
  const loadAllCustomers = async () => {
    try {
      setLoadingCustomers(true);
      console.log('Loading customers via search endpoint...');
      
      // Use the search endpoint with an empty query to get all customers
      const response = await Axios({
        url: '/api/user/search?q=&role=user',
        method: 'GET'
      });
      
      console.log('Search response:', response);
      
      if (response.data.success) {
        setAllCustomers(response.data.data);
        setCustomerSearchResults(response.data.data); // Show all initially
        console.log('Loaded customers via search:', response.data.data.length);
        toast.success(`Loaded ${response.data.data.length} customers`);
      } else {
        console.error('Search failed:', response.data);
        toast.error(`Failed to load customers: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Provide more specific error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.statusText || 
                          error.message || 
                          'Network error';
      toast.error(`Failed to load customers: ${errorMessage}`);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Scan loyalty card
  const scanLoyaltyCard = async () => {
    if (!loyaltyCardNumber.trim()) {
      toast.error('Please enter a loyalty card number');
      return;
    }
    
    try {
      setScanningCard(true);
      const response = await Axios({
        url: '/api/user/scan-loyalty-card',
        method: 'POST',
        data: { cardNumber: loyaltyCardNumber.trim() }
      });
      
      if (response.data.success) {
        const { customer: scannedCustomer, loyaltyCard, message } = response.data.data;
        
        // Set customer and store detailed scan info
        setCustomer(scannedCustomer);
        setScannedCustomer({
          ...scannedCustomer,
          loyaltyCard: loyaltyCard,
          scanMethod: scanMode
        });
        
        // Close modals and clear input
        setShowCustomerModal(false);
        setShowQRScanner(false);
        setLoyaltyCardNumber('');
        
        // Auto-apply loyalty discount if customer has one and cart has items
        if (loyaltyCard && cart.length > 0) {
          const customerDiscount = getDiscountRate(loyaltyCard);
          if (customerDiscount > 0) {
            setDiscount(customerDiscount);
            setDiscountMode('percent');
            toast.success(`${message} | ${customerDiscount}% loyalty discount applied!`);
          } else {
            toast.success(message);
          }
        } else {
          toast.success(message);
        }
        
        // Display customer info
        console.log('Scanned Customer:', {
          name: scannedCustomer.name,
          email: scannedCustomer.email,
          tier: loyaltyCard?.tier,
          points: loyaltyCard?.pointsEarned,
          discountRate: loyaltyCard?.discountRate
        });
      }
    } catch (error) {
      console.error('Error scanning loyalty card:', error);
      if (error.response?.status === 404) {
        toast.error('Loyalty card not found. Please check the card number.');
      } else {
        toast.error('Error scanning loyalty card');
      }
    } finally {
      setScanningCard(false);
    }
  };

  // Helper function to get discount rate based on loyalty card
  const getDiscountRate = (loyaltyCard) => {
    if (!loyaltyCard) return 0;
    
    // Use the card's discount rate if available, otherwise use tier-based rates
    if (loyaltyCard.discountRate) return loyaltyCard.discountRate;
    
    // Fallback tier-based discount rates
    const tierDiscounts = {
      'Bronze': 2,
      'Silver': 5,
      'Gold': 8,
      'Platinum': 12
    };
    
    return tierDiscounts[loyaltyCard.tier] || 0;
  };

  const stopActiveScanner = () => {
    if (scannerIntervalRef.current) {
      window.clearInterval(scannerIntervalRef.current);
      scannerIntervalRef.current = null;
    }

    scannerBusyRef.current = false;

    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    }

    [loyaltyScannerVideoRef.current, productScannerVideoRef.current].forEach((video) => {
      if (video) {
        video.pause?.();
        video.srcObject = null;
      }
    });
  };

  const resolveScannerFormats = async (mode) => {
    const requestedFormats =
      mode === 'qr'
        ? QR_SCAN_FORMATS
        : mode === 'product'
          ? PRODUCT_SCAN_FORMATS
          : BARCODE_SCAN_FORMATS;

    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
      return null;
    }

    if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
      const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
      const matchingFormats = requestedFormats.filter((format) => supportedFormats.includes(format));
      return matchingFormats.length > 0 ? matchingFormats : null;
    }

    return requestedFormats;
  };

  const startCameraScanner = async ({
    videoRef,
    mode,
    onDetected,
    setError,
    setStatus,
    subjectLabel
  }) => {
    stopActiveScanner();
    setError('');
    setStatus('Preparing camera...');

    const videoElement = videoRef.current;
    if (!videoElement) {
      setError('Camera preview could not be created. Please reopen the scanner.');
      setStatus('');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support camera access. You can still type or paste the barcode, QR code, or SKU.');
      setStatus('');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      scannerStreamRef.current = stream;
      videoElement.srcObject = stream;
      await videoElement.play();

      const detectorFormats = await resolveScannerFormats(mode);
      if (!detectorFormats) {
        setStatus('Camera is ready. Automatic detection is not available in this browser, so use manual entry if needed.');
        return;
      }

      const detector = new window.BarcodeDetector({ formats: detectorFormats });
      const readableLabel =
        mode === 'qr'
          ? 'QR code'
          : mode === 'product'
            ? 'barcode or QR code'
            : 'barcode';
      setStatus(`Camera is ready. Point it at the ${subjectLabel} ${readableLabel} and hold steady.`);

      scannerIntervalRef.current = window.setInterval(async () => {
        if (scannerBusyRef.current || !videoRef.current || videoRef.current.readyState < 2) {
          return;
        }

        scannerBusyRef.current = true;

        try {
          const detectedCodes = await detector.detect(videoRef.current);
          const detectedValue = detectedCodes.find((entry) => entry.rawValue?.trim())?.rawValue?.trim();

          if (detectedValue) {
            stopActiveScanner();
            onDetected(detectedValue);
          }
        } catch (detectionError) {
          console.error('Scanner detection error:', detectionError);
        } finally {
          scannerBusyRef.current = false;
        }
      }, 350);
    } catch (error) {
      console.error('Camera access error:', error);

      if (error?.name === 'NotAllowedError') {
        setError('Camera permission was denied. Allow camera access in your browser or use manual code entry.');
      } else if (error?.name === 'NotFoundError') {
        setError('No camera was found on this device. You can still type or paste the barcode, QR code, or SKU.');
      } else {
        setError('Could not start the camera scanner. Please try again or use manual entry.');
      }

      setStatus('');
      stopActiveScanner();
    }
  };

  // Initialize Scanner (QR/Barcode)
  const initializeScanner = async () => {
    await startCameraScanner({
      videoRef: loyaltyScannerVideoRef,
      mode: scanMode,
      onDetected: handleCodeDetected,
      setError: setQrScannerError,
      setStatus: setLoyaltyScannerStatus,
      subjectLabel: 'loyalty card'
    });
  };

  const initializeScannerLegacy = async () => {
    try {
      setQrScannerError('');
      const video = document.getElementById('scanner-video');
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera if available
      });
      
      video.srcObject = stream;
      
      // Scanner active notification
      video.addEventListener('loadedmetadata', () => {
        const scanType = scanMode === 'barcode' ? 'barcode' : 'QR code';
        toast(`${scanType.charAt(0).toUpperCase() + scanType.slice(1)} scanner active! Point camera at loyalty card ${scanType}`, {
          icon: scanMode === 'barcode' ? 'ðŸ“Š' : 'ðŸ“¸',
          duration: 3000,
        });
      });
      
    } catch (error) {
      console.error('Camera access error:', error);
      setQrScannerError('Camera access denied. Please allow camera permissions and try again.');
      toast.error('Could not access camera');
    }
  };

  // Handle code detection (QR or Barcode)
  const handleCodeDetected = (codeData) => {
    try {
      // Set the detected code as loyalty card number
      setLoyaltyCardNumber(codeData);
      setShowQRScanner(false);
      setLoyaltyScannerStatus('');
      stopActiveScanner();
      
      // Automatically scan the card
      setTimeout(() => scanLoyaltyCard(), 100); // Small delay to ensure state is updated
    } catch (error) {
      console.error('Code processing error:', error);
      toast.error(`Invalid ${scanMode} format`);
    }
  };

  const handleProductCodeDetected = async (codeData) => {
    try {
      setBarcode(codeData);
      setShowProductScanner(false);
      setProductScannerStatus('');
      stopActiveScanner();
      await addByBarcode(codeData);
    } catch (error) {
      console.error('Product code processing error:', error);
      toast.error('Unable to use that scanned product code');
    }
  };

  const openProductScanner = async () => {
    setShowProductScanner(true);
    setProductScannerError('');
    setProductScannerStatus('');
    setTimeout(() => {
      startCameraScanner({
        videoRef: productScannerVideoRef,
        mode: 'product',
        onDetected: handleProductCodeDetected,
        setError: setProductScannerError,
        setStatus: setProductScannerStatus,
        subjectLabel: 'product'
      });
    }, 100);
  };

  const findProductLocally = (code) => {
    const normalizedCode = code.trim().toLowerCase();
    if (!normalizedCode) return null;

    return products.find(product =>
      product.barcode?.toLowerCase() === normalizedCode ||
      product.qrCode?.toLowerCase() === normalizedCode ||
      product.sku?.toLowerCase() === normalizedCode ||
      String(product._id).toLowerCase() === normalizedCode ||
      product.name?.toLowerCase() === normalizedCode ||
      product.name?.toLowerCase().includes(normalizedCode)
    ) || null;
  };

  // Add product by barcode
  const addByBarcode = async (inputCode = barcode.trim()) => {
    const code = String(inputCode || '').trim();
    if (!code) return;
    
    try {
      setLoading(true);
      let product = findProductLocally(code);

      if (!product) {
        const response = await Axios({
          url: `/api/pos/products/lookup?code=${encodeURIComponent(code)}`,
          method: 'GET'
        });

        if (response.data.success) {
          product = response.data.data;
          setProducts(prev => {
            const exists = prev.some(item => item._id === product._id);
            return exists ? prev.map(item => item._id === product._id ? { ...item, ...product } : item) : [product, ...prev];
          });
        }
      }
      
      if (product) {
        addToCart(product);
        setBarcode('');
        if (showProductScanner) {
          setShowProductScanner(false);
          setProductScannerStatus('');
          setProductScannerError('');
          stopActiveScanner();
        }
        toast.success(`${product.name} added from scan`);
      } else {
        toast.error('No product matched that barcode, QR code, SKU, or item name');
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setLoading(false);
    }
  };

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Ensure user is authenticated
    if (!user || !user._id) {
      toast.error('Authentication required. Please log in again.');
      navigate('/login');
      return;
    }
    
    const totals = calculateTotals();

    // Allocate payment amounts automatically: prioritize confirmed M-Pesa rows, then card, then cash (up to amountTendered when present)
    let remaining = totals.total;
    const allocated = [];
    const mpesaRows = splitPayments.filter(r => r.method === 'mobile');
  const cashRows = splitPayments.filter(r => r.method === 'cash');
  const cardRows = splitPayments.filter(r => r.method === 'card');

    // Require success for any M-Pesa rows present
    if (mpesaRows.some(r => r.mpesaStatus !== 'success')) {
      toast.error('Awaiting M-Pesa confirmation');
      return;
    }

    // Allocate M-Pesa: use confirmed sentAmount where available; otherwise split remaining equally
    if (mpesaRows.length > 0) {
      const totalSent = mpesaRows.reduce((s, r) => s + (parseFloat(r.sentAmount || '0') || 0), 0);
      if (totalSent > 0) {
        for (const r of mpesaRows) {
          const want = parseFloat(r.sentAmount || '0') || 0;
          const amt = Math.min(remaining, want);
          if (amt > 0) {
            allocated.push({ method: 'mobile', amount: amt, phone: r.phone, checkoutRequestId: r.mpesaCheckoutId });
            r.allocatedAmount = amt;
            remaining -= amt;
          }
        }
      }
      // If anything still remains and no sent amounts captured, split equally
      if (remaining > 0 && totalSent === 0) {
        const per = remaining / mpesaRows.length;
        for (const r of mpesaRows) {
          const amt = Math.min(remaining, per);
          allocated.push({ method: 'mobile', amount: amt, phone: r.phone, checkoutRequestId: r.mpesaCheckoutId });
          r.allocatedAmount = amt;
          remaining -= amt;
        }
      }
    }

    // Allocate cash next: bounded by tendered amount (if provided), else assume up to remaining
    if (remaining > 0 && cashRows.length > 0) {
      const tendered = parseFloat(amountTendered || '0');
      const maxCash = isNaN(tendered) || tendered <= 0 ? remaining : Math.min(remaining, tendered);
      const per = maxCash / cashRows.length;
      for (const r of cashRows) {
        const amt = Math.min(remaining, per);
        allocated.push({ method: 'cash', amount: amt });
        r.allocatedAmount = amt;
        remaining -= amt;
      }
    }

    // Allocate card last (no prompt): fill any remaining, split across rows equally
    if (remaining > 0 && cardRows.length > 0) {
      const per = remaining / cardRows.length;
      for (const r of cardRows) {
        const amt = Math.min(remaining, per);
        allocated.push({ method: 'card', amount: amt });
        r.allocatedAmount = amt;
        remaining -= amt;
      }
    }

    const paid = allocated.reduce((s, a) => s + a.amount, 0);
  const cashAllocated = allocated.filter(a => a.method === 'cash').reduce((s, a) => s + a.amount, 0);
  const cashTenderedValRaw = parseFloat(amountTendered || '0') || 0;
  const cashTenderedVal = cashRows.length > 0 ? (cashTenderedValRaw || cashAllocated) : 0;
  const amountTenderedTotal = paid - cashAllocated + cashTenderedVal; // replace allocated cash with actual tendered (default to allocated when empty)
    if (paid + 0.0001 < totals.total) {
      toast.error('Payment methods do not cover total');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create sale record
      const saleData = {
        items: cart.map(item => ({
          product: item._id,
          sku: item.sku || '',
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          discountPct: item.discountPct || 0,
          total: item.price * item.quantity
        })),
        customer: customer?._id || null,
        customerName: (customer?.name || walkInName || '').trim(),
        customerPhone: (customer?.phone || walkInPhone || '').trim(),
  subtotal: totals.subtotal,
  discount: totals.discountAmount,
  tax: totals.tax,
        total: totals.total,
        paymentMethod: (splitPayments && splitPayments.length > 1) ? 'split' : (splitPayments[0]?.method || paymentMethod),
        payments: (splitPayments && splitPayments.length >= 1) ? allocated : undefined,
  amountTendered: amountTenderedTotal,
  change: Math.max(0, amountTenderedTotal - totals.total),
        cashier: user._id,
        cashierName: user.name,
        saleDate: new Date(),
        note: orderNote
      };
      
      const response = await Axios({
        url: '/api/pos/sale',
        method: 'POST',
        data: saleData
      });
      
      if (response.data.success) {
        const saleNumber = response.data.saleNumber;
        const saleWithNumber = { ...saleData, saleNumber };
        setCurrentSale(saleWithNumber);
        
        // Generate QR code for the transaction
        await generateQRCode(saleWithNumber);
        
        setShowReceiptModal(true);
        // Auto-print shortly after showing receipt so DOM is ready
        setTimeout(() => {
          try { printReceipt(); } catch {}
        }, 500); // Increased delay to ensure QR code loads
        clearCart();
        setShowPaymentModal(false);
        toast.success('Sale completed successfully');
        
        // Update customer loyalty points if customer is selected
        if (customer?._id) {
          updateCustomerPoints(totals.total, saleNumber, customer._id);
        }
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setLoading(false);
    }
  };

  const updateCustomerPoints = async (saleAmount, saleNumber, customerId) => {
    try {
      if (!customerId) return;
      await Axios({
        url: `/api/loyalty/add-points`,
        method: 'POST',
        data: {
          userId: customerId,
          points: Math.floor(saleAmount / 100), // 1 point per 100 KES
          description: `NAWIRI Sale - ${saleNumber || currentSale?.saleNumber || ''}`
        }
      });
    } catch (error) {
      console.error('Error updating loyalty points:', error);
    }
  };

  const clearCart = () => {
    setCart([]);
    setCustomer(null);
    setDiscount(0);
    setAmountTendered('');
    setPaymentMethod('cash');
    setSplitPayments([{ method: 'cash', amount: '', phone: '', mpesaStatus: 'idle', mpesaCheckoutId: '', mpesaRequesting: false }]);
    setOrderNote('');
    setWalkInName('');
    setWalkInPhone('');
  };

  const printReceipt = () => {
    window.print();
  };

  // Generate QR code for transaction verification
  const generateQRCode = async (saleData) => {
    try {
      const verificationUrl = `${nawiriBrand.websiteUrl}/verify?txn=${saleData.saleNumber}&date=${new Date(saleData.saleDate).toISOString().slice(0,10)}&amount=${saleData.total}`;
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback QR code with basic transaction info
      try {
        const fallbackData = `NWR:${saleData.saleNumber}|AMT:${saleData.total}|DATE:${new Date(saleData.saleDate).toISOString().slice(0,10)}`;
        const qrDataUrl = await QRCode.toDataURL(fallbackData, { width: 200, margin: 1 });
        setQrCodeDataUrl(qrDataUrl);
      } catch (fallbackError) {
        console.error('Fallback QR generation failed:', fallbackError);
      }
    }
  };

  // Build monospace receipt text for printing on 80mm
  const buildReceiptText = (sale) => {
    const line = '-'.repeat(48);
    const fmt = (n) => `Ksh ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const now = new Date(sale.saleDate);
    const dateStr = now.toLocaleString('en-KE', { hour12: true, timeZoneName: undefined });
    const branch = sale.branch || user.staff_branch || 'Main Store';
    const cashier = sale.cashierName || user.name || '';
    const header = [
      line,
      `NAWIRI HAIR - ${branch}, Nairobi | Tel: +254 712 345 678`,
      `NAWIRI System | Receipt No: ${sale.saleNumber} | Date: ${dateStr}`,
      `Cashier: ${cashier}`,
      line,
    ];
    const cust = (sale.customerName || sale.customerPhone)
      ? [`Customer: ${sale.customerName || 'Walk-in'}${sale.customerPhone ? ` | Phone: ${sale.customerPhone}` : ''}`, line]
      : [];
    const items = sale.items.map(it => {
      const left = `${it.quantity} x ${it.name}`;
      const mid = fmt(it.price);
      const right = fmt(it.total);
      // Compose as: left | mid | right with basic spacing
      const maxLeft = 28;
      const l = left.length > maxLeft ? left.slice(0, maxLeft - 1) + 'â€¦' : left.padEnd(maxLeft, ' ');
      const m = mid.padEnd(12, ' ');
      return `${l} | ${m} | ${right}`;
    });
    const taxRateLabel = (typeof sale.tax === 'number' && sale.tax > 0) ? '16%' : '0%';
    const totalsBlock = [
      line,
      `Subtotal: ${fmt(sale.subtotal)}`,
      `Tax (${taxRateLabel}): ${fmt(sale.tax || 0)}`,
      `Total: ${fmt(sale.total)}`,
    ];
    // Payment details
    const paymentLines = [];
    paymentLines.push(`Payment: ${sale.paymentMethod}`);
    if (sale.paymentMethod === 'split' && Array.isArray(sale.payments)) {
      for (const p of sale.payments) {
        const label = p.method === 'mobile' ? `M-Pesa${p.phone ? ` (${p.phone})` : ''}` : (p.method.charAt(0).toUpperCase() + p.method.slice(1));
        paymentLines.push(` - ${label}: ${fmt(p.amount)}`);
      }
    }
    if (sale.change && sale.change > 0) {
      paymentLines.push(`Change: ${fmt(sale.change)}`);
    }
    const extra = [
      line,
      (sale.note || sale.notes) ? `Order Note: ${sale.note || sale.notes}` : null,
      'Warranty: Refer to product manual for details',
      'Returns accepted within 7 days with receipt',
      line,
      'Thank you for shopping at NAWIRI HAIR!',
      `Contact: ${nawiriBrand.email} | ${nawiriBrand.websiteUrl.replace(/^https?:\/\//, '')}`,
      line,
    ].filter(Boolean);
    return [...header, ...cust, ...items, ...totalsBlock, ...paymentLines, ...extra].join('\n');
  };

  const totals = calculateTotals();
  

  // Helpers
  const addSplitRow = () => setSplitPayments(prev => [...prev, { method: 'cash', amount: '', phone: '', mpesaStatus: 'idle', mpesaCheckoutId: '', mpesaRequesting: false }]);
  const removeSplitRow = (idx) => setSplitPayments(prev => prev.filter((_, i) => i !== idx));
  const updateSplitRow = (idx, key, val) => setSplitPayments(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));

  const requestMpesaSTKForRow = async (idx) => {
    try {
      const row = splitPayments[idx];
      if (!row.phone || !row.phone.trim()) {
        toast.error('Enter phone number');
        return;
      }
      // Determine amount to request: use previous sentAmount if present (resend), otherwise split outstanding equally
      const t = calculateTotals();
      const committedMpesa = splitPayments
        .filter(r => r.method === 'mobile' && (r.mpesaStatus === 'pending' || r.mpesaStatus === 'success') && (r.sentAmount || 0) > 0)
        .reduce((s, r) => s + (r.sentAmount || 0), 0);
      const tenderedCash = parseFloat(amountTendered || '0');
      const cashConsider = isNaN(tenderedCash) || tenderedCash <= 0 ? 0 : tenderedCash;
      let outstanding = Math.max(0, t.total - committedMpesa - cashConsider);
      let sendAmount = row.sentAmount && row.sentAmount > 0 ? row.sentAmount : 0;
      if (!sendAmount) {
        const remainingRows = splitPayments.filter(r => r.method === 'mobile' && !r.mpesaCheckoutId).length || 1;
        sendAmount = Math.max(0, outstanding / remainingRows);
      }
      sendAmount = Math.max(0, Math.round(sendAmount));
      if (sendAmount <= 0) {
        toast.error('Nothing due for M-Pesa');
        return;
      }
      setSplitPayments(prev => prev.map((r,i)=> i===idx ? { ...r, mpesaRequesting: true } : r));
      const res = await Axios({
        url: SummaryApi.posMpesaSTK.url,
        method: SummaryApi.posMpesaSTK.method,
        data: { phoneNumber: row.phone.trim(), amount: sendAmount }
      });
      if (res.data.success) {
        const id = res?.data?.data?.CheckoutRequestID || '';
        setSplitPayments(prev => prev.map((r,i)=> i===idx ? { ...r, mpesaCheckoutId: id, mpesaStatus: 'pending', sentAmount: sendAmount } : r));
        toast.success(`M-Pesa prompt sent for ${DisplayPriceInShillings(sendAmount)}. Ask customer to authorize.`);
      } else {
        toast.error(res.data.message || 'Failed to send M-Pesa prompt');
      }
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setSplitPayments(prev => prev.map((r,i)=> i===idx ? { ...r, mpesaRequesting: false } : r));
    }
  };

  // Poll pending M-Pesa rows every 3s
  useEffect(() => {
    const interval = setInterval(async () => {
      const pending = splitPayments
        .map((r, i) => ({ ...r, idx: i }))
        .filter(r => r.method === 'mobile' && r.mpesaStatus === 'pending' && r.mpesaCheckoutId);
      if (pending.length === 0) return;
      for (const r of pending) {
        try {
          const res = await Axios({ url: `/api/mpesa/status?checkoutRequestId=${encodeURIComponent(r.mpesaCheckoutId)}`, method: 'GET' });
          const st = res?.data?.status;
          if (st === 'success' || st === 'failed') {
            setSplitPayments(prev => prev.map((row, idx) => idx === r.idx ? { ...row, mpesaStatus: st } : row));
          }
        } catch {}
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [splitPayments]);

  const parkCurrentSale = () => {
    if (cart.length === 0) {
      toast.error('Nothing to hold');
      return;
    }
    const id = `${Date.now()}`;
    const entry = { id, when: new Date().toISOString(), cart, customer, discount, applyTax, orderNote };
    const next = [entry, ...parkedSales].slice(0, 20);
    setParkedSales(next);
    localStorage.setItem('pos_parkedSales', JSON.stringify(next));
    clearCart();
    toast.success('Sale held');
  };

  const resumeParkedSale = (id) => {
    const found = parkedSales.find(p => p.id === id);
    if (!found) return;
    setCart(found.cart);
    setCustomer(found.customer || null);
    setDiscount(found.discount || 0);
    setApplyTax(!!found.applyTax);
    setOrderNote(found.orderNote || '');
    const next = parkedSales.filter(p => p.id !== id);
    setParkedSales(next);
    localStorage.setItem('pos_parkedSales', JSON.stringify(next));
    setShowParkedDrawer(false);
  };

  const deleteParkedSale = (id) => {
    const next = parkedSales.filter(p => p.id !== id);
    setParkedSales(next);
    localStorage.setItem('pos_parkedSales', JSON.stringify(next));
  };

  const filteredParked = useMemo(() => {
    const q = parkedSearch.trim().toLowerCase();
    if (!q) return parkedSales;
    const match = (p) => {
      const customerStr = `${p.customer?.name || ''} ${p.customer?.email || ''}`.toLowerCase();
      const noteStr = (p.orderNote || '').toLowerCase();
      const productStr = (p.cart || []).map(i => i.name).join(' ').toLowerCase();
      return customerStr.includes(q) || noteStr.includes(q) || productStr.includes(q);
    };
    return parkedSales.filter(match);
  }, [parkedSales, parkedSearch]);

  const parkedTotal = (p) => {
    try {
      return (p.cart || []).reduce((s, i) => s + (i.price * i.quantity), 0);
    } catch { return 0; }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      switch (e.key) {
        case 'F2': e.preventDefault(); searchRef.current?.focus(); break;
        case 'F4': e.preventDefault(); setShowPaymentModal(true); break;
        case 'F6': e.preventDefault(); setDiscount(d => Math.min(100, d + 1)); break;
        case 'F7': e.preventDefault(); parkCurrentSale(); break;
        case 'F8': e.preventDefault(); setShowParkedDrawer(true); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [parkCurrentSale]);

  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
        @page { size: 80mm auto; margin: 0; }
        @media print {
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden !important; }
          #receipt-print, #receipt-print * { visibility: visible !important; }
          #receipt-print { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 80mm !important; 
            font-family: 'Poppins', sans-serif !important;
            background: white !important;
            color: black !important;
          }
          .print\:w-\[80mm\] { width: 80mm !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .receipt-header { background: #8b5cf6 !important; color: white !important; }
          .thank-you-personal { background: #8b5cf6 !important; color: white !important; }
          .payment-status { background: #f0fff4 !important; border-color: #10b981 !important; }
          .policies-box { background: #f8fafc !important; border-color: #e2e8f0 !important; }
          .transaction-id { background: #f7fafc !important; border-color: #cbd5e0 !important; }
          .qr-code { background: white !important; border-color: #e2e8f0 !important; }
        }
        .receipt-container {
          font-family: 'Poppins', sans-serif;
          line-height: 1.4;
          color: #2d3748;
        }
        .receipt-header {
          text-align: center;
          padding: 8px 0;
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%);
          color: white;
          margin-bottom: 8px;
          border-radius: 4px;
        }
        .receipt-section {
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid #e2e8f0;
        }
        .receipt-section:last-child {
          border-bottom: none;
        }
        .section-title {
          font-weight: 600;
          font-size: 11px;
          color: #8b5cf6;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .store-info {
          text-align: center;
          font-size: 9px;
          color: #4a5568;
        }
        .logo-container {
          text-align: center;
          margin-bottom: 6px;
        }
        .brand-tagline {
          font-size: 8px;
          color: #f59e0b;
          font-weight: 300;
          font-style: italic;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          margin-bottom: 2px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          margin-bottom: 2px;
        }
        .total-final {
          font-weight: 700;
          font-size: 11px;
          color: #8b5cf6;
          border-top: 2px solid #8b5cf6;
          padding-top: 4px;
          margin-top: 4px;
        }
        .payment-info {
          font-size: 9px;
          color: #4a5568;
        }
        .footer-info {
          text-align: center;
          font-size: 8px;
          color: #718096;
          margin-top: 8px;
        }
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
          margin: 6px 0;
        }
        .payment-status {
          background: #f0fff4;
          border: 1px solid #10b981;
          border-radius: 4px;
          padding: 4px 6px;
          font-size: 8px;
          color: #065f46;
          font-weight: 500;
          display: inline-block;
        }
        .policies-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 6px;
          margin: 6px 0;
          font-size: 8px;
          color: #4a5568;
        }
        .policy-item {
          display: flex;
          align-items: center;
          margin-bottom: 2px;
        }
        .policy-icon {
          margin-right: 4px;
          font-size: 10px;
        }
        .transaction-id {
          text-align: center;
          font-family: 'Courier New', monospace;
          font-size: 8px;
          background: #f7fafc;
          border: 1px dashed #cbd5e0;
          padding: 4px;
          margin: 6px 0;
          border-radius: 2px;
        }
        .thank-you-personal {
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
          color: white;
          padding: 8px;
          border-radius: 6px;
          text-align: center;
          font-size: 9px;
          margin: 8px 0;
        }
        .qr-code {
          width: 60px;
          height: 60px;
          margin: 6px auto;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-code img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      `}</style>
      {/* Loading overlay to keep hooks order consistent */}
      {productsLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-dm-card rounded-card p-6 shadow-xl">
            <LoadingSpinner size="large" />
          </div>
        </div>
      )}
      {/* Header / Toolbar */}
      <div className="bg-white/90 backdrop-blur dark:bg-gray-800 sticky top-0 z-30 border-b border-gray-200 dark:border-gray-700">
        <div className="px-3 sm:px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">NAWIRI Hair Sales Counter</h1>
            <p className="text-xs text-gray-600 dark:text-gray-400">{SALES_COUNTER_TITLE} â€¢ Seller: {user.name} â€¢ Branch: {user.staff_branch || 'Main Store'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button onClick={() => setShowParkedDrawer(true)} className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
              <FaListUl /> <span className="hidden sm:inline">Held</span>
            </button>
            <button onClick={() => setShowHelp(true)} className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
              <FaQuestionCircle /> <span className="hidden sm:inline">Help</span>
            </button>
            <div className="min-w-0 flex-1 sm:flex-none text-left sm:text-right">
              <div className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">{DisplayPriceInShillings(calculateTotals().total)}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{calculateTotals().itemCount} items</div>
            </div>
            <button onClick={() => setShowPaymentModal(true)} disabled={cart.length===0} className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-50">
              Charge (F4)
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-[calc(100dvh-72px)] flex-col xl:flex-row">
        {/* Left Panel - Products */}
        <div className="flex-1 min-w-0 p-3 sm:p-4 xl:overflow-hidden">
          {/* Search and Scan Row */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-4 mb-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
              {/* Product Search */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-brown-300" />
                <input
                  type="text"
                  placeholder="Search products, SKU, barcode, or QR..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  ref={searchRef}
                  className="w-full pl-10 pr-4 py-2 border border-blush-200 dark:border-dm-border rounded-pill bg-blush-100 dark:bg-dm-card-2 focus:ring-2 focus:ring-plum-500 text-charcoal dark:text-white placeholder:text-brown-300 outline-none"
                />
              </div>
              {/* Barcode Scanner */}
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
                <div className="flex">
                  <div className="relative flex-1">
                    <FaBarcode className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Scan barcode / QR or enter SKU..."
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addByBarcode()}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={() => addByBarcode()}
                    className="px-4 py-2 bg-primary-500 text-white rounded-r-lg hover:bg-primary-600"
                  >
                    Add
                  </button>
                </div>
                <button
                  type="button"
                  onClick={openProductScanner}
                  className="w-full sm:w-auto px-4 py-2 border border-primary-500 text-primary-600 dark:text-primary-300 dark:border-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  <FaQrcode />
                  Use Camera
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-start justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
              <p>Search products, type the SKU, or scan a product barcode or QR code directly with the device camera.</p>
              <p>{cameraDetectionAvailable ? 'Live barcode and QR detection are available in supported mobile browsers.' : 'If live detection is unavailable, manual barcode or QR entry still works.'}</p>
            </div>

            {/* Category Filter moved below */}
            <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button onClick={() => setSelectedCategory('all')} className={`px-3 py-2 rounded-full text-sm whitespace-nowrap border ${selectedCategory==='all' ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>All</button>
              {categories.map(c => (
                <button key={c._id} onClick={() => setSelectedCategory(c._id)} className={`px-3 py-1.5 rounded-pill text-sm whitespace-nowrap border transition-colors ${selectedCategory===c._id ? 'bg-plum-700 text-white border-plum-700' : 'bg-blush-50 dark:bg-dm-card-2 text-charcoal dark:text-white/70 border-blush-200 dark:border-dm-border hover:bg-plum-50'}`}>{c.name}</button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-4 min-h-[320px] max-h-[55dvh] xl:h-[calc(100dvh-250px)] xl:max-h-none overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducts.map(product => (
                <div key={product._id} className="group border border-brown-100 dark:border-dm-border rounded-card p-3 hover-lift bg-white dark:bg-dm-card transition-all">
                  <div className="relative aspect-square mb-2 bg-blush-50 dark:bg-dm-card-2 rounded-lg overflow-hidden">
                    {product.image && product.image[0] ? (
                      <img src={product.image[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brown-200"><FaShoppingCart size={24} /></div>
                    )}
                    <button onClick={() => addToCart(product)} className="absolute bottom-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium">Add</button>
                    <div className="absolute left-2 top-2 bg-white/90 dark:bg-gray-800/80 text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600">Stock: {product.stock}</div>
                  </div>
                  <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 min-h-[36px]">{product.name}</h3>
                  {getProductScanLabel(product) && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {getProductScanLabel(product).label}: {getProductScanLabel(product).value}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="font-price text-gold-600 dark:text-gold-400 font-semibold text-sm">{DisplayPriceInShillings(product.price)}</p>
                    <button onClick={() => addToCart(product)} className="w-7 h-7 rounded-full border border-plum-200 dark:border-plum-700 hover:bg-plum-50 dark:hover:bg-plum-900/30 text-plum-700 dark:text-plum-300 text-sm flex items-center justify-center font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Cart & Customer */}
        <div className="w-full xl:w-[360px] xl:min-w-[360px] bg-white dark:bg-gray-800 border-t xl:border-t-0 xl:border-l border-gray-200 dark:border-gray-700 flex flex-col xl:max-h-[calc(100dvh-72px)]">
          {/* Customer Section */}
          <div className="p-4 border-b border-brown-100 dark:border-dm-border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-charcoal dark:text-white">Customer</h3>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-plum-700 hover:bg-plum-800 text-white rounded-pill transition-colors"
                title="Search for existing customer"
              >
                <FaUserPlus size={11} />
                <span>Search</span>
              </button>
            </div>
            {customer ? (
              <div className="bg-plum-50 dark:bg-plum-900/20 p-3 rounded-card border border-plum-100 dark:border-plum-800/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-charcoal dark:text-white">{customer.name}</p>
                      {scannedCustomer?.scanMethod && (
                        <span className="text-xs bg-plum-100 dark:bg-plum-900 text-plum-700 dark:text-plum-200 px-2 py-0.5 rounded-pill">
                          {scannedCustomer.scanMethod === 'barcode' ? 'ðŸ“Š' : 'ðŸ“¸'} Scanned
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-brown-400 dark:text-white/50">{customer.email}</p>
                    {customer.mobile && (
                      <p className="text-sm text-brown-400 dark:text-white/50">ðŸ“ž {customer.mobile}</p>
                    )}
                    {customer.loyaltyCard && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-plum-100 dark:bg-plum-900 text-plum-700 dark:text-plum-200 px-2 py-0.5 rounded-pill">
                            {customer.loyaltyCard.tier} Member
                          </span>
                          <span className="text-xs bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 px-2 py-0.5 rounded-pill">
                            {getCustomerDiscount()}% Discount
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-brown-400 dark:text-white/40">
                          <span>ðŸ’³ {customer.loyaltyCard.cardNumber}</span>
                          <span>â­ {customer.loyaltyCard.pointsEarned || 0} pts</span>
                        </div>
                        {discount > 0 && (
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                            âœ… {discount}% loyalty discount applied to cart
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setCustomer(null);
                      setScannedCustomer(null);
                      // Clear any applied loyalty discount
                      if (customer?.loyaltyCard) {
                        setDiscount(0);
                      }
                    }}
                    className="text-red-500 hover:text-red-600 ml-2"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-center py-3 text-gray-500 dark:text-gray-400">
                  <FaUser className="mx-auto mb-2" />
                  <p className="text-sm">No customer selected</p>
                </div>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <input
                    type="text"
                    value={walkInName}
                    onChange={(e)=>setWalkInName(e.target.value)}
                    placeholder="Customer name (optional)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="tel"
                    value={walkInPhone}
                    onChange={(e)=>setWalkInPhone(e.target.value)}
                    placeholder="Phone number (optional)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0 max-h-[38dvh] xl:max-h-none">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Cart Items</h3>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-brown-300 dark:text-white/30">
                <FaShoppingCart className="mx-auto mb-2 text-3xl" />
                <p className="text-sm">Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item._id} className="border border-brown-100 dark:border-dm-border rounded-card p-3 bg-white dark:bg-dm-card">
                    <div className="flex gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-blush-50 dark:bg-dm-card-2 overflow-hidden flex-shrink-0">
                        {item.image?.[0] ? (
                          <img src={item.image[0]} alt={item.name} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h4 className="font-medium text-sm text-charcoal dark:text-white truncate pr-2" title={item.name}>{item.name}</h4>
                          <button onClick={() => removeFromCart(item._id)} className="text-blush-400 hover:text-red-500 flex-shrink-0 transition-colors"><FaTrash size={13} /></button>
                        </div>
                        {getProductScanLabel(item) && (
                          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                            {getProductScanLabel(item).label}: {getProductScanLabel(item).value}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateQuantity(item._id, item.quantity - 1)} className="w-6 h-6 rounded-full bg-blush-100 dark:bg-dm-card-2 flex items-center justify-center text-plum-600 dark:text-plum-300"><FaMinus size={9} /></button>
                            <input type="number" min="1" value={item.quantity} onChange={(e)=>updateQuantity(item._id, Math.max(1, parseInt(e.target.value||'1')))} className="w-10 text-center text-sm border border-blush-200 dark:border-dm-border rounded-md bg-white dark:bg-dm-card text-charcoal dark:text-white" />
                            <button onClick={() => updateQuantity(item._id, item.quantity + 1)} className="w-6 h-6 rounded-full bg-blush-100 dark:bg-dm-card-2 flex items-center justify-center text-plum-600 dark:text-plum-300"><FaPlus size={9} /></button>
                          </div>
                          <div className="text-right min-w-0">
                            <p className="font-price text-sm font-semibold text-gold-600 dark:text-gold-400 truncate">{DisplayPriceInShillings(item.price * item.quantity)}</p>
                            <div className="flex items-center justify-end gap-1.5 text-xs text-brown-400 dark:text-white/40">
                              <span className="truncate">{DisplayPriceInShillings(item.price)} ea</span>
                              <span>â€¢</span>
                              <span className="flex items-center gap-0.5"><FaPercent size={9} />
                                <input type="number" min="0" max="100" value={item.discountPct || ''} onChange={(e)=> setCart(prev=>prev.map(it => it._id===item._id ? { ...it, discountPct: Math.max(0, Math.min(100, parseFloat(e.target.value || '0'))) } : it))} className="w-10 text-right border border-blush-200 dark:border-dm-border rounded px-1 bg-white dark:bg-dm-card text-charcoal dark:text-white" placeholder="0" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary & Actions */}
          <div className="p-4 border-t border-brown-100 dark:border-dm-border">
            <div className="space-y-1.5 mb-4 bg-blush-50 dark:bg-dm-card-2 rounded-card p-3">
              <div className="flex justify-between text-sm">
                <span className="text-brown-400 dark:text-white/50">Subtotal:</span>
                <span className="text-charcoal dark:text-white font-medium">{DisplayPriceInShillings(totals.subtotal)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-brown-400 dark:text-white/50">Discount:</span>
                  <span className="text-blush-500">-{DisplayPriceInShillings(totals.discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-brown-400 dark:text-white/50 cursor-pointer">
                  <input type="checkbox" checked={applyTax} onChange={e=>setApplyTax(e.target.checked)} className="accent-plum-600" /> Tax (16%)
                </label>
                <span className="text-charcoal dark:text-white">{DisplayPriceInShillings(totals.tax || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-brown-100 dark:border-dm-border">
                <span className="text-charcoal dark:text-white">Total:</span>
                <span className="font-price text-gold-600 dark:text-gold-400">{DisplayPriceInShillings(totals.total)}</span>
              </div>
            </div>

            <div className="space-y-2 overflow-visible">
              {/* Discount Input */}
              <div className="grid grid-cols-3 gap-2 items-center">
                <div className="col-span-1 relative z-10">
                  <label className="inline-flex items-center gap-1 text-xs text-brown-400 dark:text-white/50">
                    <span>Disc.</span>
                    <select
                      value={discountMode}
                      onChange={(e)=>setDiscountMode(e.target.value)}
                      className="px-1.5 py-1 border border-blush-200 dark:border-dm-border rounded-md bg-white dark:bg-dm-card text-charcoal dark:text-white text-xs"
                    >
                      <option value="percent">%</option>
                      <option value="amount">KSh</option>
                    </select>
                  </label>
                </div>
                {discountMode === 'percent' ? (
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="0"
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                      className="flex-1 px-3 py-1.5 text-sm border border-blush-200 dark:border-dm-border rounded-pill bg-white dark:bg-dm-card text-charcoal dark:text-white"
                    />
                    <span className="text-xs text-brown-400 dark:text-white/40">% off</span>
                  </div>
                ) : (
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="flex-1 px-3 py-1.5 text-sm border border-blush-200 dark:border-dm-border rounded-pill bg-white dark:bg-dm-card text-charcoal dark:text-white"
                    />
                    <span className="text-xs text-brown-400 dark:text-white/40">KSh</span>
                  </div>
                )}
              </div>

              {/* Order note */}
              <textarea value={orderNote} onChange={(e)=>setOrderNote(e.target.value)} placeholder="Order note (optional)" className="w-full text-sm border border-blush-200 dark:border-dm-border rounded-card bg-white dark:bg-dm-card text-charcoal dark:text-white placeholder:text-brown-300 p-2 resize-none" rows={2} />

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="px-3 py-2 text-sm border border-brown-200 dark:border-dm-border rounded-pill text-charcoal dark:text-white/70 hover:bg-blush-50 dark:hover:bg-dm-card-2 disabled:opacity-50 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  disabled={cart.length === 0}
                  className="px-3 py-2 text-sm bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill disabled:opacity-50 press transition-colors"
                >
                  Pay Now
                </button>
                <button onClick={parkCurrentSale} disabled={cart.length===0} className="px-3 py-2 text-sm border border-brown-200 dark:border-dm-border rounded-pill hover:bg-plum-50 dark:hover:bg-dm-card-2 text-charcoal dark:text-white/70 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"><FaSave size={12}/> Hold</button>
                <button onClick={()=>setShowParkedDrawer(true)} className="px-3 py-2 text-sm border border-brown-200 dark:border-dm-border rounded-pill hover:bg-plum-50 dark:hover:bg-dm-card-2 text-charcoal dark:text-white/70 flex items-center justify-center gap-2 transition-colors"><FaListUl size={12}/> Held</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showProductScanner && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scan Product Code</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Use the back camera for the fastest scan.</p>
              </div>
              <button
                onClick={() => {
                  setShowProductScanner(false);
                  setProductScannerError('');
                  setProductScannerStatus('');
                  stopActiveScanner();
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
                <video
                  ref={productScannerVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="absolute inset-4 border-2 border-primary-500 rounded-2xl pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 text-center">
                  <span className="inline-flex items-center rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                    Center the product barcode or QR code inside the frame
                  </span>
                </div>
              </div>

              {productScannerStatus && (
                <p className="text-sm text-blue-700 dark:text-blue-300">{productScannerStatus}</p>
              )}

              {productScannerError && (
                <p className="text-sm text-red-600 dark:text-red-400">{productScannerError}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addByBarcode()}
                  placeholder="Type or paste barcode / QR / SKU"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={() => addByBarcode()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Add Product
                </button>
                <button
                  onClick={() => {
                    setShowProductScanner(false);
                    setProductScannerError('');
                    setProductScannerStatus('');
                    stopActiveScanner();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Camera scanning works best on HTTPS or localhost and may depend on browser barcode support. Manual entry is always available.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-ivory dark:bg-dm-card rounded-card shadow-hover p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-xl italic text-plum-900 dark:text-white">Select Customer</h3>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  setCustomerSearch('');
                  setCustomerSearchResults([]);
                  setLoyaltyCardNumber('');
                  setShowQRScanner(false);
                  setQrScannerError('');
                  setLoyaltyScannerStatus('');
                  stopActiveScanner();
                }}
                className="text-brown-300 hover:text-charcoal dark:text-white/40 dark:hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="relative mb-4">
              <FaSearch className="absolute left-3 top-3 text-brown-300" />
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  searchCustomers(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2 border border-blush-200 dark:border-dm-border rounded-pill bg-blush-100 dark:bg-dm-card-2 focus:ring-2 focus:ring-plum-500 text-charcoal dark:text-white placeholder:text-brown-300 outline-none"
              />
            </div>

            {/* Code Scanner for Loyalty Cards */}
            <div className="mb-4 p-4 bg-plum-50 dark:bg-plum-900/20 rounded-card border border-plum-100 dark:border-plum-800/30">
              <h4 className="text-sm font-semibold text-plum-800 dark:text-plum-200 mb-3">Scan Loyalty Card</h4>
              
              {/* Scan Mode Selection */}
              <div className="mb-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setScanMode('barcode')}
                    className={`flex-1 px-3 py-2 text-sm rounded-pill border transition-colors ${
                      scanMode === 'barcode'
                        ? 'bg-plum-700 text-white border-plum-700'
                        : 'bg-white dark:bg-dm-card text-charcoal dark:text-white/70 border-brown-200 dark:border-dm-border hover:bg-plum-50'
                    }`}
                  >
                    ðŸ“Š Barcode
                  </button>
                  <button
                    onClick={() => setScanMode('qr')}
                    className={`flex-1 px-3 py-2 text-sm rounded-pill border transition-colors ${
                      scanMode === 'qr'
                        ? 'bg-plum-700 text-white border-plum-700'
                        : 'bg-white dark:bg-dm-card text-charcoal dark:text-white/70 border-brown-200 dark:border-dm-border hover:bg-plum-50'
                    }`}
                  >
                    ðŸ“¸ QR Code
                  </button>
                </div>
              </div>
              
              {!showQRScanner ? (
                <div className="text-center">
                  <button
                    onClick={() => {
                      setShowQRScanner(true);
                      setTimeout(initializeScanner, 100);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-plum-700 hover:bg-plum-800 text-white rounded-pill transition-colors"
                  >
                    {scanMode === 'barcode' ? (
                      <><FaBarcode /> Start Barcode Scanner</>
                    ) : (
                      <><FaQrcode /> Start QR Scanner</>
                    )}
                  </button>
                  <p className="text-xs text-brown-400 dark:text-white/40 mt-2">
                    Activate camera to scan customer's loyalty card
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Allow camera access when prompted. On unsupported browsers, you can still paste the barcode or QR value below.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
                    <div className="aspect-square bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center relative">
                      <video 
                        ref={loyaltyScannerVideoRef}
                        className="w-full h-full object-cover rounded-lg"
                        autoPlay
                        playsInline
                        muted
                      ></video>
                      <div className="absolute inset-0 border-2 border-plum-500 rounded-lg"></div>
                      <div className="absolute top-2 left-2 right-2">
                        <p className="text-xs text-white bg-black/50 px-2 py-1 rounded-pill">
                          Position {scanMode} within frame
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {loyaltyScannerStatus && (
                    <p className="text-xs text-blue-700 dark:text-blue-300">{loyaltyScannerStatus}</p>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        setShowQRScanner(false);
                        setQrScannerError('');
                        setLoyaltyScannerStatus('');
                        stopActiveScanner();
                      }}
                      className="flex-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <input
                      type="text"
                      placeholder={`Or paste ${scanMode} data...`}
                      value={loyaltyCardNumber}
                      onChange={(e) => setLoyaltyCardNumber(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && loyaltyCardNumber.trim() && scanLoyaltyCard()}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      onClick={scanLoyaltyCard}
                      disabled={scanningCard || !loyaltyCardNumber.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {scanningCard ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                  
                  {qrScannerError && (
                    <p className="text-red-600 text-xs">{qrScannerError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Loading indicator */}
            {loadingCustomers ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-plum-600"></div>
                <p className="text-sm text-brown-400 dark:text-white/40 mt-2">Loading customers...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {customerSearchResults.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {customerSearchResults.length} customer{customerSearchResults.length !== 1 ? 's' : ''} found
                      </p>
                      {customerSearch && (
                        <button
                          onClick={() => {
                            setCustomerSearch('');
                            setCustomerSearchResults(allCustomers);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                    {customerSearchResults.map(customerResult => (
                  <div
                    key={customerResult._id}
                    onClick={() => {
                      setCustomer(customerResult);
                      setShowCustomerModal(false);
                      setCustomerSearch('');
                      setCustomerSearchResults([]);
                      setWalkInName('');
                      setWalkInPhone('');
                    }}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{customerResult.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{customerResult.email}</p>
                        {customerResult.mobile && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">ðŸ“ž {customerResult.mobile}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {customerResult.loyaltyCard && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                            {customerResult.loyaltyCard.tier}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                    ))}
                  </div>
                ) : !customerSearch.trim() && allCustomers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No customers loaded yet</p>
                    <button
                      onClick={loadAllCustomers}
                      className="mt-2 px-4 py-2 bg-plum-700 hover:bg-plum-800 text-white text-sm rounded-pill transition-colors"
                    >
                      Load Customers
                    </button>
                  </div>
                ) : customerSearch.trim() ? (
                  <div className="text-center py-8 text-brown-300 dark:text-white/30">
                    <p className="text-sm">No customers found for "{customerSearch}"</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-brown-300 dark:text-white/30">
                    <p className="text-sm">Start typing to search customers</p>
                    <p className="text-xs mt-1">Or scan a loyalty card above</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal - Slide-over */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="absolute inset-0" onClick={()=>setShowPaymentModal(false)} />
          <div className="absolute right-0 top-0 h-full w-[420px] bg-ivory dark:bg-dm-card shadow-hover p-6 overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-lg italic text-plum-900 dark:text-white">Take Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-brown-300 hover:text-charcoal dark:text-white/40 dark:hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-center py-4 bg-gradient-to-br from-plum-50 to-blush-50 dark:from-plum-900/20 dark:to-dm-card-2 rounded-card border border-plum-100 dark:border-plum-800/30">
                <p className="font-price text-2xl font-bold text-gold-600 dark:text-gold-400">
                  {DisplayPriceInShillings(totals.total)}
                </p>
                <p className="text-xs text-brown-400 dark:text-white/40 mt-0.5">Total Amount</p>
              </div>
            </div>

            {/* Split payments */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-charcoal dark:text-white">Payments</label>
              </div>
              {splitPayments.map((row, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                  <select value={row.method} onChange={e=>updateSplitRow(idx, 'method', e.target.value)} className="col-span-2 px-3 py-2 border border-blush-200 dark:border-dm-border rounded-pill bg-white dark:bg-dm-card text-charcoal dark:text-white">
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="mobile">M-Pesa</option>
                  </select>
                  {row.method === 'mobile' ? (
                    <div className="col-span-3 flex items-center gap-2">
                      <input type="tel" value={row.phone || ''} onChange={e=>updateSplitRow(idx,'phone', e.target.value)} placeholder="07XXXXXXXX" className="flex-1 px-3 py-2 border border-blush-200 dark:border-dm-border rounded-pill bg-white dark:bg-dm-card text-charcoal dark:text-white" />
                      <button onClick={()=>requestMpesaSTKForRow(idx)} disabled={row.mpesaRequesting} className="px-3 py-2 bg-plum-700 hover:bg-plum-800 text-white rounded-pill disabled:opacity-50 transition-colors text-sm">
                        {row.mpesaRequesting ? 'Sendingâ€¦' : (row.mpesaStatus === 'pending' ? 'Resend' : 'Send')}
                      </button>
                    </div>
                  ) : <div className="col-span-3" />}
                  <div className="col-span-1 flex items-center justify-end gap-2">
                    {splitPayments.length > 1 && (
                      <button onClick={()=>removeSplitRow(idx)} className="text-blush-400 hover:text-red-500"><FaTimes /></button>
                    )}
                  </div>
                  {row.method === 'mobile' && (
                    <div className="col-span-6 text-xs text-brown-400 dark:text-white/40">
                      {row.mpesaStatus === 'pending' && 'Waiting for customer approvalâ€¦'}
                      {row.mpesaStatus === 'success' && `Payment confirmed${row.allocatedAmount ? `: KSh ${row.allocatedAmount.toFixed(2)}` : ''}.`}
                      {row.mpesaStatus === 'failed' && 'Payment failed. Try again.'}
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-2">
                <button onClick={addSplitRow} className="w-full px-3 py-2 border border-blush-200 dark:border-dm-border rounded-pill text-charcoal dark:text-white/70 hover:bg-blush-50 dark:hover:bg-dm-card-2 text-sm transition-colors">+ Add Method</button>
              </div>
            </div>

            {/* Cash tendered input if cash method present */}
            {splitPayments.some(r=>r.method==='cash') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-charcoal dark:text-white/70 mb-2">Cash Tendered</label>
                <input type="number" value={amountTendered} onChange={(e)=>setAmountTendered(e.target.value)} placeholder="Enter amount" className="w-full px-3 py-2 border border-blush-200 dark:border-dm-border rounded-pill bg-blush-100 dark:bg-dm-card-2 focus:ring-2 focus:ring-plum-500 text-charcoal dark:text-white outline-none" />
                {splitPayments.length === 1 && splitPayments[0].method === 'cash' && amountTendered && parseFloat(amountTendered) >= totals.total && (
                  <p className="text-sm text-plum-600 dark:text-plum-300 mt-1">Change: {DisplayPriceInShillings(Math.max(0, parseFloat(amountTendered) - totals.total))}</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-brown-200 dark:border-dm-border rounded-pill text-charcoal dark:text-white/70 hover:bg-blush-50 dark:hover:bg-dm-card-2 transition-colors"
              >
                Cancel
              </button>
              {(()=>{ const anyMobilePending = splitPayments.some(r => r.method==='mobile' && r.mpesaStatus !== 'success');
              return (
              <button
                onClick={processSale}
                disabled={loading || anyMobilePending}
                className="flex-1 px-4 py-2 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill disabled:opacity-50 press transition-colors"
              >
                {loading ? <LoadingSpinner size="small" /> : (anyMobilePending ? 'Awaiting M-Pesaâ€¦' : 'Complete Sale')}
              </button>
              )})()}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && currentSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dm-card rounded-card shadow-hover p-6 w-[420px] max-w-full mx-4 print:w-[80mm]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sales Receipt</h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-brown-300 hover:text-charcoal dark:text-white/40 dark:hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            <div id="receipt-print" className="receipt-container">
              {/* Header with Logo and Brand */}
              <div className="logo-container">
                <img 
                  src={nawiriBrand.logo} 
                  alt="Nawiri Hair" 
                  style={{ 
                    width: '80px', 
                    height: '80px', 
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                  }} 
                />
                <div className="receipt-header">
                  <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>NAWIRI HAIR</div>
                  <div className="brand-tagline">Your Beauty, Our Pride</div>
                </div>
              </div>

              {/* Store Information */}
              <div className="receipt-section">
                <div className="section-title">Store Information</div>
                <div className="store-info">
                  <div>{user.staff_branch || 'Main Store'}, {nawiriBrand.location}</div>
                  <div>Tel: {nawiriBrand.phoneDisplay}</div>
                  <div>Receipt No: {currentSale.saleNumber}</div>
                  <div>{new Date(currentSale.saleDate).toLocaleString('en-KE', { hour12: true })}</div>
                  <div>Cashier: {currentSale.cashierName || user.name}</div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="receipt-section">
                <div className="section-title">Customer Information</div>
                <div className="store-info">
                  <div style={{ fontWeight: '500' }}>
                    {currentSale.customerName || walkInName || 'Valued Customer'}
                  </div>
                  {(currentSale.customerPhone || walkInPhone) && (
                    <div>Contact: {currentSale.customerPhone || walkInPhone}</div>
                  )}
                  {customer?.loyaltyCard && (
                    <div style={{ color: '#8b5cf6', fontWeight: '500', fontSize: '8px' }}>
                      Loyalty: {customer.loyaltyCard.tier} Member
                    </div>
                  )}
                </div>
              </div>

              <div className="divider"></div>

              {/* Purchase Details */}
              <div className="receipt-section">
                <div className="section-title">Purchase Details</div>
                {currentSale.items.map((item, idx) => (
                  <div key={idx} className="item-row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{item.quantity} x {item.name}</div>
                      <div style={{ fontSize: '8px', color: '#718096' }}>
                        @ {DisplayPriceInShillings(item.price)} each
                      </div>
                      {item.sku && (
                        <div style={{ fontSize: '8px', color: '#718096' }}>
                          Barcode: {item.sku}
                        </div>
                      )}
                    </div>
                    <div style={{ fontWeight: '600' }}>
                      {DisplayPriceInShillings(item.total)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="divider"></div>

              {/* Totals */}
              <div className="receipt-section">
                <div className="section-title">Summary</div>
                <div className="totals-row">
                  <span>Subtotal:</span>
                  <span>{DisplayPriceInShillings(currentSale.subtotal)}</span>
                </div>
                {currentSale.discount && currentSale.discount > 0 && (
                  <div className="totals-row" style={{ color: '#ec4899' }}>
                    <span>Discount:</span>
                    <span>-{DisplayPriceInShillings(currentSale.discount)}</span>
                  </div>
                )}
                <div className="totals-row">
                  <span>Tax ({(typeof currentSale.tax === 'number' && currentSale.tax > 0) ? '16%' : '0%'}):</span>
                  <span>{DisplayPriceInShillings(currentSale.tax || 0)}</span>
                </div>
                <div className="totals-row total-final">
                  <span>TOTAL:</span>
                  <span>{DisplayPriceInShillings(currentSale.total)}</span>
                </div>
              </div>

              <div className="divider"></div>

              {/* Payment Information */}
              <div className="receipt-section">
                <div className="section-title">Payment Details</div>
                <div className="payment-info">
                  <div className="totals-row">
                    <span>Method:</span>
                    <span style={{ textTransform: 'capitalize' }}>
                      {currentSale.paymentMethod === 'cash' && 'Cash Payment'}
                      {currentSale.paymentMethod === 'card' && 'Card Payment'}
                      {currentSale.paymentMethod === 'mobile' && 'M-Pesa Payment'}
                      {currentSale.paymentMethod === 'split' && 'Split Payment'}
                    </span>
                  </div>
                  <div className="totals-row">
                    <span>Status:</span>
                    <span className="payment-status">âœ“ CONFIRMED</span>
                  </div>
                  {currentSale.paymentMethod === 'split' && Array.isArray(currentSale.payments) && 
                    currentSale.payments.map((payment, idx) => (
                      <div key={idx} className="totals-row" style={{ fontSize: '8px', marginLeft: '8px' }}>
                        <span>
                          {payment.method === 'mobile' 
                            ? `M-Pesa${payment.phone ? ` (${payment.phone})` : ''} - Confirmed` 
                            : `${payment.method.charAt(0).toUpperCase() + payment.method.slice(1)} - Confirmed`
                          }:
                        </span>
                        <span>{DisplayPriceInShillings(payment.amount)}</span>
                      </div>
                    ))
                  }
                  {currentSale.change && currentSale.change > 0 && (
                    <div className="totals-row" style={{ color: '#10b981' }}>
                      <span>Change Given:</span>
                      <span>{DisplayPriceInShillings(currentSale.change)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Verification */}
              <div className="receipt-section">
                <div className="section-title">Transaction Verification</div>
                <div className="transaction-id">
                  <div>Transaction ID: NWR-{currentSale.saleNumber}</div>
                  <div style={{ fontSize: '7px', color: '#718096', marginTop: '2px' }}>
                    {new Date(currentSale.saleDate).toISOString().slice(0, 19)}Z
                  </div>
                </div>
                <div className="qr-code">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="Verification QR Code" />
                  ) : (
                    <div style={{ fontSize: '8px', color: '#718096' }}>Loading QR...</div>
                  )}
                </div>
                <div style={{ textAlign: 'center', fontSize: '7px', color: '#718096' }}>
                  Scan to verify transaction or visit {nawiriBrand.websiteUrl.replace(/^https?:\/\//, '')}
                </div>
              </div>

              {/* Order Note */}
              {(currentSale.note || currentSale.notes) && (
                <div className="receipt-section">
                  <div className="section-title">Order Note</div>
                  <div style={{ fontSize: '8px', color: '#4a5568', fontStyle: 'italic' }}>
                    {currentSale.note || currentSale.notes}
                  </div>
                </div>
              )}

              <div className="divider"></div>

              {/* Policies Box */}
              <div className="policies-box">
                <div className="policy-item">
                  <span className="policy-icon">âœ…</span>
                  <span>Warranty: Refer to product manual for details</span>
                </div>
                <div className="policy-item">
                  <span className="policy-icon">ðŸ”„</span>
                  <span>Returns accepted within 7 days with receipt</span>
                </div>
                <div className="policy-item">
                  <span className="policy-icon">ðŸ“ž</span>
                  <span>Customer Support: {nawiriBrand.phoneDisplay}</span>
                </div>
              </div>

              {/* Personalized Thank You */}
              <div className="thank-you-personal">
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  Thank you, {currentSale.customerName || walkInName || 'valued customer'}!
                </div>
                <div style={{ fontSize: '8px' }}>
                  We appreciate your trust in Nawiri Hair. Your beauty is our pride, 
                  and we look forward to serving you again.
                </div>
              </div>

              {/* Footer */}
              <div className="footer-info">
                <div style={{ marginBottom: '4px' }}>
                  <div>{nawiriBrand.email}</div>
                  <div>{nawiriBrand.websiteUrl.replace(/^https?:\/\//, '')}</div>
                </div>
                <div style={{ fontSize: '7px', color: '#a0aec0', marginTop: '4px' }}>
                  Receipt generated on {new Date().toLocaleDateString('en-KE')}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={printReceipt}
                className="flex-1 px-4 py-2 border border-brown-200 dark:border-dm-border rounded-pill text-charcoal dark:text-white/70 hover:bg-blush-50 dark:hover:bg-dm-card-2 flex items-center justify-center gap-2 transition-colors"
              >
                <FaPrint size={14} />
                Print
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 px-4 py-2 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill press transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parked Drawer */}
      {showParkedDrawer && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setShowParkedDrawer(false)} />
          <div className="absolute right-0 top-0 h-full w-[380px] bg-ivory dark:bg-dm-card p-4 overflow-y-auto scrollbar-hide shadow-hover">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{SALES_RECORDS_LABEL} on Hold</h3>
              <button onClick={()=>setShowParkedDrawer(false)} className="text-gray-500"><FaTimes/></button>
            </div>
            <div className="mb-3">
              <input
                type="text"
                value={parkedSearch}
                onChange={(e)=>setParkedSearch(e.target.value)}
                placeholder="Search by product, customer, or note"
                className="w-full px-3 py-2 text-sm border border-blush-200 dark:border-dm-border rounded-pill bg-blush-100 dark:bg-dm-card-2 text-charcoal dark:text-white placeholder:text-brown-300 outline-none"
              />
            </div>
            {parkedSales.length === 0 ? (
              <p className="text-sm text-brown-300 dark:text-white/30">No held sales</p>
            ) : (
              <div className="space-y-3">
                {filteredParked.map(p => (
                  <div key={p.id} className="border border-brown-100 dark:border-dm-border rounded-card p-3 bg-white dark:bg-dm-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-charcoal dark:text-white truncate">{new Date(p.when).toLocaleString()}</p>
                        <p className="text-xs text-brown-400 dark:text-white/50">
                          {p.cart.length} items â€¢ {p.customer?.name || 'Walk-in'} â€¢ <span className="font-price text-gold-600">{DisplayPriceInShillings(parkedTotal(p))}</span>
                        </p>
                        {p.orderNote && <p className="text-xs text-brown-300 dark:text-white/30 truncate">Note: {p.orderNote}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={()=>resumeParkedSale(p.id)} className="px-3 py-1 text-xs rounded-pill bg-plum-700 hover:bg-plum-800 text-white transition-colors">Resume</button>
                        <button onClick={()=>deleteParkedSale(p.id)} className="px-2 py-1 text-xs rounded-pill border border-brown-200 dark:border-dm-border hover:bg-blush-50 dark:hover:bg-dm-card-2 text-charcoal dark:text-white/60 transition-colors">Del</button>
                      </div>
                    </div>
                    <div className="mt-2">
                      {expandedParked[p.id] ? (
                        <div className="space-y-1">
                          {(p.cart || []).map((i, idx) => (
                            <div key={idx} className="text-xs text-brown-400 dark:text-white/50 flex justify-between gap-2">
                              <span className="truncate">{i.quantity} x {i.name}</span>
                              <span className="flex-shrink-0 font-price text-gold-600 dark:text-gold-400">{DisplayPriceInShillings(i.price * i.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {(p.cart || []).slice(0,3).map((i, idx) => (
                            <div key={idx} className="text-xs text-brown-400 dark:text-white/50 flex justify-between gap-2">
                              <span className="truncate">{i.quantity} x {i.name}</span>
                              <span className="flex-shrink-0">{DisplayPriceInShillings(i.price * i.quantity)}</span>
                            </div>
                          ))}
                          {(p.cart || []).length > 3 && (
                            <div className="text-xs text-brown-300 dark:text-white/30">+ {(p.cart || []).length - 3} moreâ€¦</div>
                          )}
                        </div>
                      )}
                    </div>
                    {(p.cart || []).length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={()=>setExpandedParked(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                          className="text-xs text-plum-600 dark:text-plum-300 hover:underline"
                        >
                          {expandedParked[p.id] ? 'Hide items' : 'Show items'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-ivory dark:bg-dm-card rounded-card shadow-hover p-6 w-[600px] max-w-full animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg italic text-plum-900 dark:text-white">Keyboard Shortcuts</h3>
              <button onClick={()=>setShowHelp(false)} className="text-brown-300 hover:text-charcoal dark:text-white/40 transition-colors"><FaTimes/></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-charcoal dark:text-white/70">
              <div>F2 â€“ Focus Search</div>
              <div>F4 â€“ Open Payment</div>
              <div>F6 â€“ Increase Discount</div>
              <div>F7 â€“ Hold Sale</div>
              <div>F8 â€“ Show Held</div>
              <div>+ / - â€“ Change Quantity</div>
              <div>Del â€“ Remove Item</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPOS;
