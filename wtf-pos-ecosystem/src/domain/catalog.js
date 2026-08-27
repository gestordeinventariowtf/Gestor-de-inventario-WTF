import { normalizeSearchText } from "./text.js";

export class ProductCatalog {
  constructor(products = []) {
    this.products = products.map((product) => normalizeProduct(product));
  }

  allActive() {
    return this.products.filter((product) => product.active !== false && product.archived !== true);
  }

  search(query, { limit = 20 } = {}) {
    const needle = normalizeSearchText(query);
    if (!needle) return this.allActive().slice(0, limit);

    return this.allActive()
      .map((product) => ({ product, score: scoreProduct(product, needle) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
      .slice(0, limit)
      .map((row) => row.product);
  }

  lookupBarcode(code) {
    const value = String(code || "").trim();
    if (!value) return null;
    return this.allActive().find((product) => String(product.barcode || "").trim() === value) || null;
  }

  lookupSku(sku) {
    const value = normalizeSearchText(sku);
    if (!value) return null;
    return this.allActive().find((product) => normalizeSearchText(product.sku) === value) || null;
  }

  getById(productId) {
    return this.products.find((product) => product.id === productId) || null;
  }
}

export function normalizeProduct(product) {
  if (!product || !product.id) throw new Error("Producto invalido.");
  return Object.assign({
    sku: "",
    barcode: "",
    categoryId: "",
    price: 0,
    active: true,
    archived: false
  }, product, {
    price: Number(product.price || 0)
  });
}

export class BarcodeLookupService {
  constructor(catalog) {
    this.catalog = catalog;
  }

  resolve(input) {
    const raw = String(input || "").trim();
    if (!raw) return { type: "empty", product: null, matches: [] };

    const barcodeMatch = this.catalog.lookupBarcode(raw);
    if (barcodeMatch) return { type: "barcode", product: barcodeMatch, matches: [barcodeMatch] };

    const skuMatch = this.catalog.lookupSku(raw);
    if (skuMatch) return { type: "sku", product: skuMatch, matches: [skuMatch] };

    const matches = this.catalog.search(raw, { limit: 10 });
    return {
      type: matches.length === 1 ? "name" : "search",
      product: matches.length === 1 ? matches[0] : null,
      matches
    };
  }
}

function scoreProduct(product, needle) {
  const name = normalizeSearchText(product.name);
  const sku = normalizeSearchText(product.sku);
  const barcode = normalizeSearchText(product.barcode);
  const category = normalizeSearchText(product.categoryName || product.categoryId);

  if (barcode === needle) return 100;
  if (sku === needle) return 95;
  if (name === needle) return 90;
  if (name.startsWith(needle)) return 75;
  if (name.includes(needle)) return 60;
  if (sku.includes(needle)) return 50;
  if (category.includes(needle)) return 25;
  return 0;
}
