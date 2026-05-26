import { apiFetch, getToken, removeToken, setToken } from './api.js';
import { state, setCurrentUser } from './state.js';
import { showNotification } from './ui.js';

export async function loadCurrentUser() {
  const token = getToken();
  if (!token) {
    setCurrentUser(null);
    return;
  }
  try {
    const data = await apiFetch('/auth/me');
    setCurrentUser(data.user);
  } catch (err) {
    removeToken();
    setCurrentUser(null);
  }
}

export function updateAuthUI() {
  const currentUser = state.currentUser;
  const authLinks = document.getElementById('authLinks');
  const userDropdown = document.getElementById('userDropdown');
  const userInitial = document.getElementById('userInitial');
  const userGreeting = document.getElementById('userGreeting');
  const userNameDisp = document.getElementById('userNameDisplay');

  if (currentUser) {
    if (authLinks) authLinks.classList.add('d-none');
    if (userDropdown) {
      userDropdown.classList.remove('d-none');
      userDropdown.classList.add('d-flex');
    }
    if (userInitial) userInitial.textContent = currentUser.name[0].toUpperCase();
    if (userGreeting) userGreeting.textContent = currentUser.name;
    if (userNameDisp) userNameDisp.textContent = currentUser.name;
  } else {
    if (authLinks) authLinks.classList.remove('d-none');
    if (userDropdown) {
      userDropdown.classList.add('d-none');
      userDropdown.classList.remove('d-flex');
    }
  }
}

export function setupAuthEventHandlers(callbacks = {}) {
  const signInForm = document.getElementById('signInForm');
  if (signInForm) {
    signInForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signInEmail').value;
      const password = document.getElementById('signInPassword').value;
      const errEl = document.getElementById('signInError');

      try {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        setToken(data.token);
        setCurrentUser(data.user);

        if (callbacks.onLogin) await callbacks.onLogin();

        updateAuthUI();

        const modalEl = document.getElementById('signInModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();

        showNotification(`Welcome back, ${data.user.name}!`, 'success');
        if (errEl) errEl.classList.add('d-none');
      } catch (err) {
        if (errEl) {
          errEl.textContent = err.message;
          errEl.classList.remove('d-none');
        } else {
          showNotification(err.message, 'error');
        }
      }
    });
  }

  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      removeToken();
      setCurrentUser(null);
      if (callbacks.onLogout) callbacks.onLogout();
      updateAuthUI();
      showNotification('Signed out successfully.', 'success');
    });
  }
}
