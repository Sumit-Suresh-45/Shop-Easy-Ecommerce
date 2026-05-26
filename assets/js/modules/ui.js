/**
 * Renders star rating HTML based on a numeric rating (0-5)
 * @param {number} rating 
 * @returns {string} HTML string
 */
export function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 !== 0;
  let stars = '';
  for (let i = 0; i < full; i++) stars += '<i class="fas fa-star"></i>';
  if (half) stars += '<i class="fas fa-star-half-alt"></i>';
  const empty = 5 - Math.ceil(rating);
  for (let i = 0; i < empty; i++) stars += '<i class="far fa-star"></i>';
  return stars;
}

/**
 * Simple notification system using Bootstrap-friendly structure
 * @param {string} message 
 * @param {string} type - 'success', 'error', 'info', 'warning'
 */
export function showNotification(message, type = 'info') {
  // Check if a container exists, otherwise create it
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
    document.body.appendChild(container);
  }

  const alertDiv = document.createElement('div');
  const alertClass = type === 'error' ? 'danger' : type;
  alertDiv.className = `alert alert-${alertClass} alert-dismissible fade show shadow-sm`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  container.appendChild(alertDiv);

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      const bsAlert = new bootstrap.Alert(alertDiv);
      bsAlert.close();
    }
  }, 4000);
}

/**
 * Helper to render a consistent product card
 * @param {object} product 
 * @returns {string} HTML string
 */
export function renderProductCard(product) {
  const imgSrc = (product.images && product.images[0]) ? product.images[0] : '';
  const price = parseFloat(product.price).toFixed(2);
  return `
    <div class="col-6 col-md-4 col-lg-3 mb-4">
      <div class="card h-100 product-card">
        <a href="product.html?id=${product.id}">
          <img src="${imgSrc}" class="card-img-top" alt="${product.title}" style="height:180px;object-fit:contain;" loading="lazy">
        </a>
        <div class="card-body d-flex flex-column">
          <h6 class="card-title mb-1">
            <a href="product.html?id=${product.id}" class="text-dark text-decoration-none">${product.title}</a>
          </h6>
          <p class="text-muted small mb-2">${product.brand} • ${product.category}</p>
          <div class="mb-2">
            <div class="rating-stars d-inline">${renderStars(product.rating)}</div>
            <span class="rating-number">(${product.rating})</span>
          </div>
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <strong>$${price}</strong>
            <button class="btn btn-sm btn-warning add-to-cart" data-id="${product.id}">Add</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
