import { apiFetch, getToken, setToken, removeToken } from './modules/api.js';
import { state, setCurrentUser } from './modules/state.js';
import { loadCurrentUser, updateAuthUI, setupAuthEventHandlers } from './modules/auth.js';
import { syncCart, updateCartBadge, pushLocalCartToServer, addToCart, removeFromCart, updateCartQuantity, clearCart, proceedToCheckout } from './modules/cart.js';
import { loadProducts, getFilteredProducts } from './modules/products.js';
import { renderStars, renderProductCard, showNotification } from './modules/ui.js';

// ─── Shared Render Helpers (keeping here for now or could move to separate modules) ───────────

function renderFeaturedProducts() {
  const container = document.getElementById('featured-products');
  if (!container) return;
  const featured = state.products.slice(0, 8);
  container.innerHTML = featured.map(renderProductCard).join('');
}

function renderShopPage() {
  const container = document.getElementById('products-grid');
  if (!container) return;
  const filtered = getFilteredProducts();
  container.innerHTML = filtered.map(renderProductCard).join('');
  const countEl = document.getElementById('product-count');
  if (countEl) countEl.textContent = `${filtered.length} products found`;
}

function renderProductPage() {
  const productId = new URLSearchParams(window.location.search).get('id');
  if (!productId) return;
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  document.title = `${product.title} - ShopEasy`;
  const container = document.getElementById('product-details');
  if (container) container.innerHTML = renderProductDetails(product);
}

function renderProductDetails(product) {
  const images = product.images || [];
  const price = parseFloat(product.price).toFixed(2);
  return `
    <div class="row">
      <div class="col-lg-6">
        <div class="product-gallery">
          <img src="${images[0] || ''}" class="main-image" id="mainImage" alt="${product.title}">
          <div class="d-flex gap-2 mt-3">
            ${images.map((img, i) => `
              <img src="${img}" class="thumbnail ${i === 0 ? 'active' : ''}" onclick="changeMainImage('${img}', this)" alt="${product.title}">
            `).join('')}
          </div>
        </div>
      </div>
      <div class="col-lg-6">
        <h1 class="h3 mb-3">${product.title}</h1>
        <div class="mb-3">
          <div class="rating-stars d-inline">${renderStars(product.rating)}</div>
          <span class="rating-number ms-2">${product.rating}</span>
        </div>
        <div class="mb-3"><span class="h4 text-primary">$${price}</span></div>
        <div class="mb-3"><span class="badge bg-success">In Stock (${product.stock} available)</span></div>
        <div class="mb-4"><p>${product.description || ''}</p></div>
        <div class="row mb-4">
          <div class="col-4">
            <label for="quantity" class="form-label">Quantity:</label>
            <select class="form-select" id="quantity">
              ${Array.from({ length: Math.min(product.stock || 1, 10) }, (_, i) =>
                `<option value="${i + 1}">${i + 1}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="d-grid gap-2 d-md-block">
          <button class="btn btn-primary btn-lg me-2" onclick="addToCartFromProduct('${product.id}')">Add to Cart</button>
          <button class="btn btn-outline-primary btn-lg" onclick="buyNow('${product.id}')">Buy Now</button>
        </div>
      </div>
    </div>

    <div class="row mt-5">
      <div class="col-12">
        <ul class="nav nav-pills mb-3">
          <li class="nav-item"><a class="nav-link active" data-bs-toggle="pill" href="#desc-tab">Description</a></li>
          <li class="nav-item"><a class="nav-link" data-bs-toggle="pill" href="#specs-tab">Specifications</a></li>
          <li class="nav-item"><a class="nav-link" data-bs-toggle="pill" href="#reviews-tab">Reviews</a></li>
          <li class="nav-item"><a class="nav-link" data-bs-toggle="pill" href="#shipping-tab">Shipping & Returns</a></li>
        </ul>
        <div class="tab-content">
          <div class="tab-pane fade show active" id="desc-tab"><p>${product.description || ''}</p></div>
          <div class="tab-pane fade" id="specs-tab">
            <table class="table">
              ${Object.entries(product.specs || {}).map(([k, v]) =>
                `<tr><td><strong>${k.charAt(0).toUpperCase() + k.slice(1)}</strong></td><td>${v}</td></tr>`
              ).join('')}
            </table>
          </div>
          <div class="tab-pane fade" id="reviews-tab">
            <p class="text-muted">No reviews yet. Be the first to review!</p>
          </div>
          <div class="tab-pane fade" id="shipping-tab">
            <ul>
              <li>Free shipping on orders over $50</li>
              <li>Standard shipping: $5 (3-5 business days)</li>
              <li>Express shipping: $15 (1-2 business days)</li>
              <li>30-day return policy</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCartPage() {
  const container = document.getElementById('cart-items');
  const summaryEl = document.getElementById('cart-summary');
  if (!container) return;

  if (state.currentCart.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
        <h4>Your cart is empty</h4>
        <p class="text-muted">Add some products to get started!</p>
        <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
      </div>`;
    if (summaryEl) summaryEl.innerHTML = '';
    return;
  }

  container.innerHTML = state.currentCart.map(item => {
    const p = item.product;
    if (!p) return '';
    const price = parseFloat(p.price);
    const lineTotal = (price * item.qty).toFixed(2);
    const imgSrc = (p.images && p.images[0]) ? p.images[0] : '';
    const stock = p.stock || 10;
    return `
      <div class="cart-item">
        <div class="row align-items-center g-3">
          <div class="col-3 col-md-2">
            <img src="${imgSrc}" class="img-fluid rounded" style="max-height:80px;object-fit:contain;" alt="${p.title}">
          </div>
          <div class="col-9 col-md-4">
            <h6 class="mb-1" style="font-size:0.95rem; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${p.title}</h6>
            <p class="text-muted small mb-0">${p.brand}</p>
          </div>
          <div class="col-4 col-md-2 text-md-center">
            <span class="text-muted d-md-none small d-block">Price</span>
            <span class="fw-bold">$${price.toFixed(2)}</span>
          </div>
          <div class="col-4 col-md-1">
            <span class="text-muted d-md-none small d-block">Qty</span>
            <select class="form-select form-select-sm" onchange="updateCartQuantity('${item.id}', this.value)">
              ${Array.from({ length: Math.min(stock, 10) }, (_, i) =>
                `<option value="${i + 1}" ${i + 1 === item.qty ? 'selected' : ''}>${i + 1}</option>`
              ).join('')}
            </select>
          </div>
          <div class="col-4 col-md-2 text-end text-md-center">
            <span class="text-muted d-md-none small d-block">Total</span>
            <span class="fw-bold">$${lineTotal}</span>
          </div>
          <div class="col-12 col-md-1 text-end">
            <button class="btn btn-outline-danger btn-sm w-100 w-md-auto" onclick="removeFromCart('${item.id}')" title="Remove item">
              <i class="fas fa-trash me-1"></i><span class="d-md-none">Remove</span>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  if (summaryEl) {
    const subtotal = state.currentCart.reduce((sum, item) => {
      const price = item.product ? parseFloat(item.product.price) : 0;
      return sum + price * item.qty;
    }, 0);
    const shipping = subtotal >= 50 ? 0 : 5;
    const tax = subtotal * 0.05;
    const total = subtotal + shipping + tax;

    summaryEl.innerHTML = `
      <h5 class="mb-3">Order Summary</h5>
      <div class="d-flex justify-content-between mb-2"><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>
      <div class="d-flex justify-content-between mb-2"><span>Shipping:</span><span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span></div>
      <div class="d-flex justify-content-between mb-2"><span>Tax (5%):</span><span>$${tax.toFixed(2)}</span></div>
      <hr>
      <div class="d-flex justify-content-between mb-3"><strong>Total:</strong><strong>$${total.toFixed(2)}</strong></div>
      <button class="btn btn-primary w-100 btn-lg" onclick="proceedToCheckout()">Proceed to Checkout</button>`;
  }
}

// ─── Page Initialization ─────────────────────────────────────

let _appInitialized = false;

async function initializeApp() {
  if (_appInitialized) return;
  _appInitialized = true;

  try {
    await loadProducts();
    await loadCurrentUser();
    await syncCart();
    updateCartBadge();
    initializeEventListeners();
    setupAuthEventHandlers({
      onLogin: async () => {
        await pushLocalCartToServer();
        await syncCart();
        updateCartBadge();
      },
      onLogout: () => {
        state.currentCart = [];
        updateCartBadge();
        if (getCurrentPage() === 'cart') renderCartPage();
      }
    });
    updateAuthUI();

    const currentPage = getCurrentPage();
    switch (currentPage) {
      case 'index':         renderFeaturedProducts(); break;
      case 'shop':
        const urlParams = new URLSearchParams(window.location.search);
        const catParam = urlParams.get('category');
        if (catParam) {
          const radio = document.querySelector(`input[name="category"][value="${catParam}"]`);
          if (radio) radio.checked = true;
        }
        renderShopPage();
        break;
      case 'product':       renderProductPage(); break;
      case 'cart':          renderCartPage(); break;
      case 'checkout':      initializeCheckout(); break;
      case 'payment':       initializePayment(); break;
      case 'order-confirm': renderOrderConfirmation(); break;
      case 'account':       renderAccountPage(); break;
      case 'signup':        initializeSignupPage(); break;
    }
  } catch (err) {
    console.error('Init error:', err);
  }
}

function getCurrentPage() {
  const path = window.location.pathname;
  const page = path.split('/').pop().split('.')[0];
  return page || 'index';
}

// ─── Event Listeners ──────────────────────────────────────────

function initializeEventListeners() {
  // Add-to-cart buttons (delegated)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart');
    if (btn) {
      const id = btn.dataset.id;
      if (id) addToCart(id);
    }
  });

  // Search functionality
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');

  const executeSearch = () => {
    const term = searchInput?.value;
    if (getCurrentPage() === 'shop') {
      renderShopPage();
    } else if (term) {
      window.location.href = `shop.html?search=${encodeURIComponent(term)}`;
    }
  };

  if (searchBtn) searchBtn.addEventListener('click', executeSearch);
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') executeSearch();
    });
    const urlSearch = new URLSearchParams(window.location.search).get('search');
    if (urlSearch) searchInput.value = urlSearch;
  }

  // Filters
  const priceRange = document.getElementById('priceRange');
  if (priceRange) {
    priceRange.addEventListener('input', () => {
      const el = document.getElementById('priceValue');
      if (el) el.textContent = '$' + priceRange.value;
      renderShopPage();
    });
  }

  const sortBy = document.getElementById('sortBy');
  if (sortBy) sortBy.addEventListener('change', renderShopPage);

  document.querySelectorAll('input[name="brand"]').forEach(cb => {
    cb.addEventListener('change', renderShopPage);
  });
}

// ─── Account Page Logic ──────────────────────────────────────────

async function renderAccountPage() {
  const currentUser = state.currentUser;
  if (!currentUser) {
    showNotification('Please sign in to view your account.', 'error');
    const modalEl = document.getElementById('signInModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    setTimeout(() => { if (!getToken()) window.location.href = 'index.html'; }, 3000);
    return;
  }

  const nameEl = document.getElementById('profile-name');
  const emailEl = document.getElementById('profile-email');
  const roleEl = document.getElementById('profile-role');

  if (nameEl) nameEl.textContent = currentUser.name;
  if (emailEl) emailEl.textContent = currentUser.email;
  if (roleEl) {
    roleEl.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    roleEl.className = `badge ${currentUser.role === 'admin' ? 'bg-danger' : 'bg-primary'} px-3`;
  }

  const ordersList = document.getElementById('orders-list');
  if (!ordersList) return;

  try {
    const orders = await apiFetch('/orders');
    if (orders.length === 0) {
      ordersList.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-5">
            <i class="fas fa-box-open fa-2x text-muted mb-2 d-block"></i>
            <p class="text-muted">You haven't placed any orders yet.</p>
            <a href="shop.html" class="btn btn-sm btn-outline-primary">Start Shopping</a>
          </td>
        </tr>`;
      return;
    }

    ordersList.innerHTML = orders.map(order => {
      const date = new Date(order.createdAt).toLocaleDateString();
      const statusClass = {
        'confirmed': 'bg-info', 'processing': 'bg-warning', 'shipped': 'bg-primary', 'delivered': 'bg-success', 'cancelled': 'bg-danger'
      }[order.status] || 'bg-secondary';

      return `
        <tr>
          <td class="ps-4"><strong>${order.id}</strong></td>
          <td class="text-muted">${date}</td>
          <td class="fw-bold">$${parseFloat(order.total).toFixed(2)}</td>
          <td><span class="badge ${statusClass}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></td>
          <td class="text-end pe-4">
            <a href="order-confirm.html?orderId=${order.id}" class="btn btn-sm btn-light">View Details</a>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    ordersList.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Error loading orders: ${err.message}</td></tr>`;
  }
}

// ─── Signup Page ──────────────────────────────────────────

function initializeSignupPage() {
  const form      = document.getElementById('signupForm');
  const errBox    = document.getElementById('signupError');
  const succBox   = document.getElementById('signupSuccess');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  // Clear is-invalid on input
  form.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => input.classList.remove('is-invalid'));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name     = document.getElementById('signupFullName').value.trim();
    const email    = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm  = document.getElementById('signupConfirmPassword').value;
    const terms    = document.getElementById('termsCheck').checked;

    errBox.classList.add('d-none');
    errBox.textContent = '';
    succBox.classList.add('d-none');

    // Client-side validation
    if (!name || !email || !password || !confirm) {
      errBox.textContent = 'Please fill in all fields.';
      errBox.classList.remove('d-none');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      document.getElementById('signupEmail').classList.add('is-invalid');
      errBox.textContent = 'Please enter a valid email address.';
      errBox.classList.remove('d-none');
      return;
    }
    if (password.length < 6) {
      errBox.textContent = 'Password must be at least 6 characters.';
      errBox.classList.remove('d-none');
      return;
    }
    if (password !== confirm) {
      document.getElementById('signupConfirmPassword').classList.add('is-invalid');
      errBox.textContent = 'Passwords do not match.';
      errBox.classList.remove('d-none');
      return;
    }
    if (!terms) {
      errBox.textContent = 'Please agree to the Terms of Service.';
      errBox.classList.remove('d-none');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';

    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });

      setToken(data.token);
      setCurrentUser(data.user);

      succBox.textContent = `Account created! Welcome, ${data.user.name}! Redirecting...`;
      succBox.classList.remove('d-none');

      setTimeout(() => { window.location.href = 'index.html'; }, 1500);

    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('d-none');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Create Account';
    }
  });
}

// ─── Checkout Logic ──────────────────────────────────────────

function initializeCheckout() {
  showCheckoutStep(1);
  updateCheckoutNavButtons();
  renderCheckoutSummary();
}

function showCheckoutStep(step) {
  document.querySelectorAll('.checkout-step').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`step-${step}`);
  if (el) el.classList.add('active');
  document.querySelectorAll('.step').forEach((el, i) => {
    el.classList.remove('active', 'completed');
    if (i + 1 < step) el.classList.add('completed');
    if (i + 1 === step) el.classList.add('active');
  });
  state.currentStep = step;
  updateCheckoutNavButtons();
  // Save address fields to sessionStorage when navigating between steps
  const fields = ['firstName', 'lastName', 'address', 'city', 'state', 'zipCode', 'phone', 'email'];
  fields.forEach(f => {
    const input = document.getElementById(f);
    if (input) sessionStorage.setItem(`checkout_${f}`, input.value);
  });
}

function updateCheckoutNavButtons() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (prevBtn) prevBtn.style.display = state.currentStep > 1 ? 'block' : 'none';
  if (nextBtn) {
    nextBtn.innerHTML = state.currentStep === 3
      ? 'Proceed to Payment <i class="fas fa-arrow-right ms-2"></i>'
      : 'Continue <i class="fas fa-arrow-right ms-2"></i>';
  }
}

function renderCheckoutSummary() {
  const container = document.getElementById('checkout-summary');
  if (!container) return;

  const cart = state.currentCart;
  if (!cart || cart.length === 0) {
    container.innerHTML = '<p class="text-muted">No items in cart.</p>';
    return;
  }

  const subtotal = cart.reduce((sum, item) => {
    const price = item.product ? parseFloat(item.product.price) : 0;
    return sum + price * item.qty;
  }, 0);
  const shipping = subtotal >= 50 ? 0 : 5;
  const tax = subtotal * 0.05;
  const total = subtotal + shipping + tax;

  container.innerHTML = `
    ${cart.map(item => {
      if (!item.product) return '';
      const img = (item.product.images && item.product.images[0]) ? item.product.images[0] : '';
      return `
        <div class="d-flex align-items-center mb-3">
          <img src="${img}" class="me-3 rounded" style="width:50px;height:50px;object-fit:contain;" alt="${item.product.title}">
          <div class="flex-grow-1">
            <h6 class="mb-0 small">${item.product.title}</h6>
            <small class="text-muted">Qty: ${item.qty}</small>
          </div>
          <span class="fw-bold small">$${(parseFloat(item.product.price) * item.qty).toFixed(2)}</span>
        </div>`;
    }).join('')}
    <hr>
    <div class="d-flex justify-content-between mb-1"><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>
    <div class="d-flex justify-content-between mb-1"><span>Shipping:</span><span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span></div>
    <div class="d-flex justify-content-between mb-1"><span>Tax (5%):</span><span>$${tax.toFixed(2)}</span></div>
    <hr>
    <div class="d-flex justify-content-between"><strong>Total:</strong><strong>$${total.toFixed(2)}</strong></div>
  `;
}

// ─── Bridge functions for global scope (onclick handlers in HTML) ───────────

window.addToCartFromProduct = (productId) => {
  const qty = parseInt(document.getElementById('quantity')?.value) || 1;
  addToCart(productId, qty);
};

window.buyNow = (productId) => {
  const qty = parseInt(document.getElementById('quantity')?.value) || 1;
  addToCart(productId, qty).then(() => { window.location.href = 'cart.html'; });
};

window.changeMainImage = (src, el) => {
  document.getElementById('mainImage').src = src;
  document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
};

window.updateCartQuantity = (productId, qty) => updateCartQuantity(productId, qty, renderCartPage);
window.removeFromCart = (productId) => removeFromCart(productId, renderCartPage);
window.proceedToCheckout = proceedToCheckout;
window.nextCheckoutStep = () => {
  if (state.currentStep === 3) {
    window.location.href = 'payment.html';
  } else if (validateCurrentStep() && state.currentStep < 3) {
    showCheckoutStep(state.currentStep + 1);
  }
};
window.previousCheckoutStep = () => { if (state.currentStep > 1) showCheckoutStep(state.currentStep - 1); };

function validateCurrentStep() {
  const el = document.getElementById(`step-${state.currentStep}`);
  if (!el) return true;
  let valid = true;
  el.querySelectorAll('[required]').forEach(field => {
    if (!field.value.trim()) { field.classList.add('is-invalid'); valid = false; }
    else field.classList.remove('is-invalid');
  });
  return valid;
}

// Order Confirm
async function renderOrderConfirmation() {
  const orderId = new URLSearchParams(window.location.search).get('orderId');
  if (!orderId) { window.location.href = 'index.html'; return; }
  const container = document.getElementById('order-details');
  if (!container) return;
  if (!state.currentUser) {
    container.innerHTML = '<div class="text-center py-5"><p>Please sign in to view your order.</p></div>';
    return;
  }
  try {
    const order = await apiFetch(`/orders/${orderId}`);
    container.innerHTML = renderOrderDetails(order);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Could not load order: ${err.message}</div>`;
  }
}

function renderOrderDetails(order) {
  const deliveryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString();
  return `
    <div class="order-success">
       <div class="success-icon text-success mb-3" style="font-size: 3rem;"><i class="fas fa-check-circle"></i></div>
       <h2 class="text-success">Order Confirmed!</h2>
       <p class="lead">Thank you for your purchase. Order ID: ${order.id}</p>
    </div>
    <div class="row mt-4">
      <div class="col-lg-8">
        <h5>Order Items</h5>
        <div class="table-responsive">
          <table class="table">
            <tbody>
              ${order.items.map(item => `
                <tr>
                   <td>${item.product.title}</td>
                   <td>${item.qty}</td>
                   <td>$${(item.product.price * item.qty).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="col-lg-4 text-end">
         <h5>Total: $${parseFloat(order.total).toFixed(2)}</h5>
         <a href="shop.html" class="btn btn-primary mt-2">Shop More</a>
      </div>
    </div>
  `;
}

// ─── Payment Page ──────────────────────────────────────────

function initializePayment() {
  document.querySelectorAll('.payment-method').forEach(method => {
    method.addEventListener('click', function () {
      document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
      this.classList.add('selected');
      const cardForm = document.getElementById('cardForm');
      if (cardForm) cardForm.style.display = this.dataset.method === 'card' ? 'block' : 'none';
    });
  });
}

async function processPayment() {
  const selected = document.querySelector('.payment-method.selected');
  if (!selected) { showNotification('Please select a payment method', 'error'); return; }

  const paymentMethod = selected.dataset.method;
  if (!state.currentUser) {
    showNotification('Please sign in to place an order.', 'error');
    return;
  }

  const shippingAddress = {
    firstName: sessionStorage.getItem('checkout_firstName') || '',
    lastName:  sessionStorage.getItem('checkout_lastName')  || '',
    address:   sessionStorage.getItem('checkout_address')   || '',
    city:      sessionStorage.getItem('checkout_city')      || '',
    state:     sessionStorage.getItem('checkout_state')     || '',
    zipCode:   sessionStorage.getItem('checkout_zipCode')   || '',
    phone:     sessionStorage.getItem('checkout_phone')     || '',
    email:     sessionStorage.getItem('checkout_email')     || state.currentUser.email
  };

  showNotification('Processing payment...', 'info');

  try {
    const data = await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({ shippingAddress, paymentMethod })
    });
    await clearCart();
    window.location.href = `order-confirm.html?orderId=${data.order.id}`;
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// ─── Bootstrap ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', initializeApp);

// Expose functions globally for the inline header/footer loader scripts and event listeners
window.initializeApp    = initializeApp;
window.initializePayment = initializePayment;
window.processPayment    = processPayment;
window.renderShopPage   = renderShopPage;
window.renderFeaturedProducts = renderFeaturedProducts;
window.renderProductPage = renderProductPage;
window.renderCartPage   = renderCartPage;
