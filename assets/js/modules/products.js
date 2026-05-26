import { apiFetch } from './api.js';
import { state, setProducts } from './state.js';

export async function loadProducts() {
  try {
    const products = await apiFetch('/products');
    setProducts(products);
    return products;
  } catch (err) {
    console.error('Could not load products:', err);
    setProducts([]);
    return [];
  }
}

export function getFilteredProducts() {
  let filtered = [...state.products];

  const urlParams = new URLSearchParams(window.location.search);
  const categoryFilter = urlParams.get('category');
  if (categoryFilter) {
    filtered = filtered.filter(p => p.category === categoryFilter);
  }

  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(searchTerm) ||
      p.brand.toLowerCase().includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm)
    );
  }

  const priceRange = document.getElementById('priceRange');
  if (priceRange) {
    filtered = filtered.filter(p => parseFloat(p.price) <= parseFloat(priceRange.value));
  }

  const brandFilters = document.querySelectorAll('input[name="brand"]:checked');
  if (brandFilters.length > 0) {
    const selected = Array.from(brandFilters).map(cb => cb.value);
    filtered = filtered.filter(p => selected.includes(p.brand));
  }

  const sortBy = document.getElementById('sortBy')?.value;
  if (sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  return filtered;
}
