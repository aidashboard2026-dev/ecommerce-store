import { storefrontAPI } from '../api'

// Thin wrapper around storefrontAPI for the product module.
// Keeps module imports clean: `import { fetchProducts } from '@/services/storefront/productsService'`

export const fetchProducts = (params = {}) => storefrontAPI.getProducts(params).then((r) => r.data)

export const fetchProductBySlug = (slug) => storefrontAPI.getProductBySlug(slug).then((r) => r.data)

export const fetchOffers = () => storefrontAPI.getOffers().then((r) => r.data)

export const fetchBanners = () => storefrontAPI.getBanners().then((r) => r.data)

export const fetchCustomProducts = (params = {}) =>
  storefrontAPI.getCustomProducts(params).then((r) => r.data)

export const fetchCustomProduct = (id) =>
  storefrontAPI.getCustomProduct(id).then((r) => r.data)