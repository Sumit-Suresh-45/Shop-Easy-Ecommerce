import { apiFetch } from './api.js';
import { state } from './state.js';
import { showNotification } from './ui.js';

export async function syncCart() {
  if (!state.currentUser) {
    const raw = localStorage.getItem('se_guest_cart');
    state.currentCart = raw ? JSON.parse(raw) : [];
    // If guest cart items don't have product details, they'll need them for rendering.
    // In a real app, you'd fetch them or store them.
    return;
  }
  try {
    state.currentCart = await apiFetch('/cart');
  } catch (err) {
    state.currentCart = [];
  }
}

export function saveGuestCart() {
  const slim = state.currentCart.map(item => ({ id: item.id, qty: item.qty }));
  localStorage.setItem('se_guest_cart', JSON.stringify(slim));
}

export async function pushLocalCartToServer() {
  const raw = localStorage.getItem('se_guest_cart');
  if (!raw) return;
  const guestCart = JSON.parse(raw);
  for (const item of guestCart) {
    try {
      await apiFetch('/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: item.id, qty: item.qty })
      });
    } catch {}
  }
  localStorage.removeItem('se_guest_cart');
}

export async function addToCart(productId, qty = 1) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  if (!state.currentUser) {
    const existing = state.currentCart.find(i => i.id === productId);
    if (existing) {
      existing.qty += qty;
    } else {
      state.currentCart.push({ id: productId, qty, product });
    }
    saveGuestCart();
    updateCartBadge();
    showNotification('Added to cart!', 'success');
    return;
  }

  try {
    await apiFetch('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, qty })
    });
    await syncCart();
    updateCartBadge();
    showNotification('Added to cart!', 'success');
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

export async function removeFromCart(productId, onUpdate) {
  if (!state.currentUser) {
    state.currentCart = state.currentCart.filter(i => i.id !== productId);
    saveGuestCart();
    updateCartBadge();
    if (onUpdate) onUpdate();
    return;
  }
  try {
    await apiFetch(`/cart/${productId}`, { method: 'DELETE' });
    await syncCart();
    updateCartBadge();
    if (onUpdate) onUpdate();
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

export async function updateCartQuantity(productId, newQty, onUpdate) {
  const qty = parseInt(newQty);
  if (!state.currentUser) {
    if (qty <= 0) {
      await removeFromCart(productId, onUpdate);
      return;
    }
    const item = state.currentCart.find(i => i.id === productId);
    if (item) {
      item.qty = qty;
      saveGuestCart();
      updateCartBadge();
      if (onUpdate) onUpdate();
    }
    return;
  }
  try {
    if (qty <= 0) {
      await removeFromCart(productId, onUpdate);
      return;
    }
    await apiFetch(`/cart/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ qty })
    });
    await syncCart();
    updateCartBadge();
    if (onUpdate) onUpdate();
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

export async function clearCart() {
  if (!state.currentUser) {
    state.currentCart = [];
    localStorage.removeItem('se_guest_cart');
    updateCartBadge();
    return;
  }
  try {
    await apiFetch('/cart', { method: 'DELETE' });
    state.currentCart = [];
    updateCartBadge();
  } catch {}
}

export function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const total = state.currentCart.reduce((sum, item) => sum + (item.qty || 0), 0);
  badge.textContent = total;
  badge.style.display = total > 0 ? 'block' : 'none';
}

export function proceedToCheckout() {
  if (!state.currentUser) {
    showNotification('Please sign in to proceed to checkout.', 'error');
    const modalEl = document.getElementById('signInModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
    return;
  }
  window.location.href = 'checkout.html';
}
