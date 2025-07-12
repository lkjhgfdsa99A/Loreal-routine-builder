/* Global variables */
let allProducts = [];
let selectedProducts = [];
let conversationHistory = [];
let isRTL = false;

/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearSelectionBtn = document.getElementById("clearSelection");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
// RTL toggle button removed but functionality preserved

/* Initialize the app */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadProducts();
    loadSelectedProducts();
    setupEventListeners();
    displayAllProducts();
    updateSelectedProductsDisplay();
    updateGenerateButton();
    console.log('App initialized successfully. Products loaded:', allProducts.length);
  } catch (error) {
    console.error('Error initializing app:', error);
    showError('Failed to initialize the application. Please refresh the page.');
  }
});

/* Load product data from JSON file */
async function loadProducts() {
  try {
    const response = await fetch('products.json');
    if (!response.ok) {
      throw new Error('Failed to fetch products data');
    }
    const data = await response.json();
    allProducts = data.products;
    console.log('Products loaded from JSON:', allProducts.length);
  } catch (error) {
    console.error('Error loading products:', error);
    showError('Failed to load products. Please refresh the page.');
  }
}

/* Setup event listeners */
function setupEventListeners() {
  // Product filtering
  categoryFilter.addEventListener("change", filterProducts);
  productSearch.addEventListener("input", debounce(filterProducts, 300));
  
  // Product selection
  productsContainer.addEventListener("click", handleProductClick);
  
  // Selected products management
  generateRoutineBtn.addEventListener("click", generateRoutine);
  clearSelectionBtn.addEventListener("click", clearAllSelections);
  selectedProductsList.addEventListener("click", handleSelectedProductClick);
  
  // Chat functionality
  chatForm.addEventListener("submit", handleChatSubmit);
  
  console.log('Event listeners setup complete');
}

/* Filter products based on category and search */
function filterProducts() {
  const selectedCategory = categoryFilter.value;
  const searchTerm = productSearch.value.toLowerCase().trim();
  
  console.log('Filtering products:', { selectedCategory, searchTerm, totalProducts: allProducts.length });
  
  let filteredProducts = allProducts;
  
  // Filter by category
  if (selectedCategory) {
    filteredProducts = filteredProducts.filter(product => 
      product.category === selectedCategory
    );
    console.log('After category filter:', filteredProducts.length);
  }
  
  // Filter by search term
  if (searchTerm) {
    filteredProducts = filteredProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.brand.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm)
    );
    console.log('After search filter:', filteredProducts.length);
  }
  
  displayProducts(filteredProducts);
}

/* Display all products initially */
function displayAllProducts() {
  console.log('Displaying all products:', allProducts.length);
  displayProducts(allProducts);
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found matching your criteria. Try adjusting your search or filter.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map(product => `
      <div class="product-card ${isSelected(product.id) ? 'selected' : ''}" 
           data-product-id="${product.id}">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        <div class="product-info">
          <div class="brand">${product.brand}</div>
          <h3>${product.name}</h3>
          <div class="category">${product.category}</div>
        </div>
        <div class="product-description">
          ${product.description}
        </div>
        <div class="info-indicator">ⓘ</div>
      </div>
    `)
    .join("");
}

/* Handle product card clicks */
function handleProductClick(event) {
  const productCard = event.target.closest('.product-card');
  if (!productCard) return;
  
  const productId = parseInt(productCard.dataset.productId);
  const product = allProducts.find(p => p.id === productId);
  
  if (!product) return;
  
  if (isSelected(productId)) {
    removeFromSelection(productId);
    productCard.classList.remove('selected');
  } else {
    addToSelection(product);
    productCard.classList.add('selected');
  }
  
  updateSelectedProductsDisplay();
  updateGenerateButton();
  saveSelectedProducts();
}

/* Check if product is selected */
function isSelected(productId) {
  return selectedProducts.some(p => p.id === productId);
}

/* Add product to selection */
function addToSelection(product) {
  if (!isSelected(product.id)) {
    selectedProducts.push(product);
  }
}

/* Remove product from selection */
function removeFromSelection(productId) {
  selectedProducts = selectedProducts.filter(p => p.id !== productId);
  
  // Update product card display
  const productCard = document.querySelector(`[data-product-id="${productId}"]`);
  if (productCard) {
    productCard.classList.remove('selected');
  }
}

/* Update selected products display */
function updateSelectedProductsDisplay() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = '<div class="placeholder-message">No products selected yet</div>';
    return;
  }
  
  selectedProductsList.innerHTML = selectedProducts
    .map(product => `
      <div class="selected-product-item">
        ${product.brand} ${product.name}
        <button class="remove-btn" data-product-id="${product.id}">×</button>
      </div>
    `)
    .join("");
}

/* Handle clicks on selected products */
function handleSelectedProductClick(event) {
  if (event.target.classList.contains('remove-btn')) {
    const productId = parseInt(event.target.dataset.productId);
    removeFromSelection(productId);
    updateSelectedProductsDisplay();
    updateGenerateButton();
    saveSelectedProducts();
  }
}

/* Clear all selections */
function clearAllSelections() {
  selectedProducts = [];
  updateSelectedProductsDisplay();
  updateGenerateButton();
  saveSelectedProducts();
  
  // Remove selected class from all product cards
  document.querySelectorAll('.product-card.selected').forEach(card => {
    card.classList.remove('selected');
  });
}

/* Update generate button state */
function updateGenerateButton() {
  generateRoutineBtn.disabled = selectedProducts.length === 0;
}

/* Generate routine using OpenAI */
async function generateRoutine() {
  if (selectedProducts.length === 0) {
    showError('Please select at least one product before generating a routine.');
    return;
  }
  
  try {
    // Show loading state
    const originalText = generateRoutineBtn.innerHTML;
    generateRoutineBtn.innerHTML = '<div class="loading"></div> Generating...';
    generateRoutineBtn.disabled = true;
    
    // Clear chat window
    chatWindow.innerHTML = '';
    
    // Prepare product data for AI
    const productData = selectedProducts.map(product => ({
      brand: product.brand,
      name: product.name,
      category: product.category,
      description: product.description
    }));
    
    // Create system message
    const systemMessage = {
      role: "system",
      content: `You are a professional beauty advisor for L'Oréal and its sub-brands. Create personalized beauty routines using the selected products. Provide step-by-step instructions, timing (AM/PM), and explain why each product is beneficial. Be enthusiastic and professional.`
    };
    
    // Create user message
    const userMessage = {
      role: "user",
      content: `Please create a personalized beauty routine using these L'Oréal products: ${JSON.stringify(productData)}`
    };
    
    // Call OpenAI API
    const response = await callOpenAI([systemMessage, userMessage]);
    
    // Add to conversation history
    conversationHistory = [systemMessage, userMessage, { role: "assistant", content: response }];
    
    // Display routine
    displayMessage(response, 'ai');
    
    // Reset button
    generateRoutineBtn.innerHTML = originalText;
    generateRoutineBtn.disabled = false;
    
  } catch (error) {
    console.error('Error generating routine:', error);
    showError('Failed to generate routine. Please try again.');
    
    // Reset button
    generateRoutineBtn.innerHTML = originalText;
    generateRoutineBtn.disabled = false;
  }
}

/* Handle chat form submission */
async function handleChatSubmit(event) {
  event.preventDefault();
  
  const message = userInput.value.trim();
  if (!message) return;
  
  // Check if routine has been generated
  if (conversationHistory.length === 0) {
    showError('Please generate a routine first before asking questions.');
    return;
  }
  
  try {
    // Display user message
    displayMessage(message, 'user');
    
    // Clear input
    userInput.value = '';
    
    // Show loading
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message ai';
    loadingDiv.innerHTML = '<div class="loading"></div> Thinking...';
    chatWindow.appendChild(loadingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    // Add user message to conversation history
    conversationHistory.push({ role: "user", content: message });
    
    // Add strict system reminder for follow-up questions
    const strictSystemReminder = {
      role: "system", 
      content: "REMINDER: You are a L'Oréal beauty advisor. ONLY answer questions about beauty, skincare, haircare, makeup, fragrance, and L'Oréal products. REFUSE all unrelated questions and redirect politely."
    };
    
    // Get AI response with strict guidelines
    const response = await callOpenAI([...conversationHistory, strictSystemReminder], true);
    
    // Remove loading message
    chatWindow.removeChild(loadingDiv);
    
    // Display AI response
    displayMessage(response, 'ai');
    
    // Add to conversation history
    conversationHistory.push({ role: "assistant", content: response });
    
  } catch (error) {
    console.error('Error in chat:', error);
    showError('Failed to get response. Please try again.');
  }
}

/* Display message in chat window */
function displayMessage(message, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}`;
  messageDiv.innerHTML = message.replace(/\n/g, '<br>');
  
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Show error message */
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'chat-message ai';
  errorDiv.style.background = '#ffebee';
  errorDiv.style.color = '#c62828';
  errorDiv.style.border = '1px solid #ffcdd2';
  errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
  
  chatWindow.appendChild(errorDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Toggle RTL mode */
function toggleRTL() {
  isRTL = !isRTL;
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  
  // Save preference
  localStorage.setItem('rtl-mode', isRTL);
}

/* Save selected products to localStorage */
function saveSelectedProducts() {
  localStorage.setItem('selected-products', JSON.stringify(selectedProducts));
}

/* Load selected products from localStorage */
function loadSelectedProducts() {
  const saved = localStorage.getItem('selected-products');
  if (saved) {
    try {
      selectedProducts = JSON.parse(saved);
    } catch (error) {
      console.error('Error loading saved products:', error);
      selectedProducts = [];
    }
  }
  
  // Load RTL preference
  const rtlMode = localStorage.getItem('rtl-mode');
  if (rtlMode === 'true') {
    toggleRTL();
  }
}

/* Utility function to debounce search input */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
