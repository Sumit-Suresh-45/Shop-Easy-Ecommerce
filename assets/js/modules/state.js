/**
 * Global application state
 */
export const state = {
  products: [],
  currentCart: [],
  currentUser: null,
  currentStep: 1
};

export function setCurrentUser(user) {
  state.currentUser = user;
}

export function getCurrentUser() {
  return state.currentUser;
}

export function setProducts(products) {
  state.products = products;
}

export function getProducts() {
  return state.products;
}

export function setCurrentCart(cart) {
  state.currentCart = cart;
}

export function getCurrentCart() {
  return state.currentCart;
}
