import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db, isFirebaseActive } from '../firebase/config';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const ProductContext = createContext();

const STORAGE_KEYS = {
  products: 'saran-jute-products',
  categories: 'saran-jute-categories',
};

// No DEFAULT_PRODUCTS — only admin-added products are shown.
// If Firestore is empty, show empty state instead of seeding hardcoded items.

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Jute Bags', image: '/Jute-Bags-1.webp', banner: '/Jute-Bags-1.webp', icon: 'Bag', featured: true, visible: true, sortOrder: 1 },
  { id: 2, name: 'Cotton Bags', image: '/canvas-bags.webp', banner: '/canvas-bags.webp', icon: 'Shirt', featured: true, visible: true, sortOrder: 2 },
  { id: 3, name: 'Canvas Bags', image: '/Canvas-tote-bag.webp', banner: '/Canvas-tote-bag.webp', icon: 'Box', featured: true, visible: true, sortOrder: 3 },
];

const readJson = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const createProductId = (items) => Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;
const createCategoryId = (items) => Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

export const ProductProvider = ({ children }) => {
  // Start with empty array — never seed hardcoded products
  const [products, setProducts] = useState(() => readJson(STORAGE_KEYS.products, []));
  const [categories, setCategories] = useState(() => readJson(STORAGE_KEYS.categories, DEFAULT_CATEGORIES));
  const [loading, setLoading] = useState(true);

  // Sync with Firestore if active
  useEffect(() => {
    if (!isFirebaseActive) {
      setLoading(false);
      return;
    }

    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      // Never auto-seed default products — show empty if no admin-added products exist
      const docs = [];
      snapshot.forEach((d) => {
        docs.push(d.data());
      });
      docs.sort((a, b) => {
        // Sort by createdAt descending if available, otherwise by id descending
        if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
        return Number(b.id) - Number(a.id);
      });
      setProducts(docs);
      writeJson(STORAGE_KEYS.products, docs);
      setLoading(false);
    }, (error) => {
      console.warn('Products sync unavailable; using local cache.', error?.message || error);
      setProducts(readJson(STORAGE_KEYS.products, []));
      setLoading(false);
    });

    const unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      if (snapshot.empty) {
        // Seed default categories only (not products)
        DEFAULT_CATEGORIES.forEach((c) => {
          setDoc(doc(db, 'categories', String(c.id)), c).catch(() => undefined);
        });
      } else {
        const docs = [];
        snapshot.forEach((d) => {
          docs.push(d.data());
        });
        docs.sort((a, b) => a.sortOrder - b.sortOrder);
        setCategories(docs);
        writeJson(STORAGE_KEYS.categories, docs);
      }
    }, (error) => {
      console.warn('Categories sync unavailable; using local cache.', error?.message || error);
      setCategories(readJson(STORAGE_KEYS.categories, DEFAULT_CATEGORIES));
    });

    const unsubscribeInventory = onSnapshot(collection(db, 'inventoryHistory'), (snapshot) => {
      if (!snapshot.empty) {
        const docs = [];
        snapshot.forEach((d) => {
          docs.push(d.data());
        });
        docs.sort((a, b) => b.id.localeCompare(a.id));
        setInventoryHistory(docs);
      }
    }, (error) => {
      console.warn('Inventory sync unavailable.', error?.message || error);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
      unsubscribeInventory();
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.products, products);
    }
  }, [products]);

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.categories, categories);
    }
  }, [categories]);

  const getProductById = (id) => products.find((product) => String(product.id) === String(id));
  const getFeaturedProducts = () => products.filter((product) => product.featured && product.visible && !product.archived);
  const getBestsellers = () => products.filter((product) => product.bestseller && product.visible && !product.archived);
  const getNewArrivals = () => products.filter((product) => product.newArrival && product.visible && !product.archived);
  const getProductsByCategory = (category) => products.filter((product) => product.category === category && product.visible && !product.archived);

  const addProduct = (product) => {
    const nextProduct = {
      ...product,
      id: createProductId(products),
      archived: false,
      visible: true,
      featured: Boolean(product.featured),
      bestseller: Boolean(product.bestseller),
      newArrival: Boolean(product.newArrival),
      images: product.images || [],
      colors: product.colors || [],
      sizes: product.sizes || [],
      tags: product.tags || [],
      specifications: product.specifications || [],
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseActive) {
      setDoc(doc(db, 'products', String(nextProduct.id)), nextProduct).catch(() => {
        setProducts((prev) => [nextProduct, ...prev]);
      });
    } else {
      setProducts((prev) => [nextProduct, ...prev]);
    }
    return nextProduct;
  };

  const updateProduct = (productId, updates) => {
    if (isFirebaseActive) {
      const existing = products.find((product) => String(product.id) === String(productId));
      if (existing) {
        setDoc(doc(db, 'products', String(productId)), { ...existing, ...updates }).catch(() => {
          setProducts((prev) => prev.map((p) => String(p.id) === String(productId) ? { ...p, ...updates } : p));
        });
      }
    } else {
      setProducts((prev) => prev.map((product) => String(product.id) === String(productId) ? { ...product, ...updates } : product));
    }
  };

  const deleteProduct = (productId) => {
    if (isFirebaseActive) {
      deleteDoc(doc(db, 'products', String(productId))).catch(() => {
        setProducts((prev) => prev.filter((p) => String(p.id) !== String(productId)));
      });
    } else {
      setProducts((prev) => prev.filter((product) => String(product.id) !== String(productId)));
    }
  };

  const duplicateProduct = (productId) => {
    const source = products.find((product) => String(product.id) === String(productId));
    if (!source) return null;

    const copy = {
      ...source,
      id: createProductId(products),
      name: `${source.name} Copy`,
      sku: `${source.sku || 'SKU'}-COPY`,
      barcode: `${source.barcode || 'BAR'}-COPY`,
      archived: false,
      visible: source.visible,
      featured: false,
      bestseller: false,
      newArrival: false,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseActive) {
      setDoc(doc(db, 'products', String(copy.id)), copy).catch(() => {
        setProducts((prev) => [copy, ...prev]);
      });
    } else {
      setProducts((prev) => [copy, ...prev]);
    }
    return copy;
  };

  const archiveProduct = (productId) => {
    updateProduct(productId, { archived: true, visible: false });
  };

  const toggleProductVisibility = (productId) => {
    const product = products.find((p) => String(p.id) === String(productId));
    if (product) {
      updateProduct(productId, { visible: !product.visible });
    }
  };

  // Inventory History tracking
  const [inventoryHistory, setInventoryHistory] = useState(() => {
    return readJson('saran-jute-inventory-history', []);
  });

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson('saran-jute-inventory-history', inventoryHistory);
    }
  }, [inventoryHistory]);

  const addInventoryLog = (productId, type, quantity, previousStock, newStock, notes = '') => {
    const product = products.find(p => String(p.id) === String(productId));
    const newLog = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      productId,
      productName: product ? product.name : 'Unknown Product',
      type,
      quantity: Number(quantity),
      timestamp: new Date().toLocaleString(),
      previousStock: Number(previousStock),
      newStock: Number(newStock),
      notes,
    };
    if (isFirebaseActive) {
      setDoc(doc(db, 'inventoryHistory', newLog.id), newLog).catch(() => {
        setInventoryHistory(prev => [newLog, ...prev]);
      });
    } else {
      setInventoryHistory(prev => [newLog, ...prev]);
    }
  };

  const updateProductStock = (productId, stock, notes = 'Manual stock adjustment') => {
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return;
    const oldStock = product.stock;
    const newStock = Math.max(0, Number(stock) || 0);
    const diff = newStock - oldStock;
    if (diff === 0) return;

    const type = diff > 0 ? 'Stock In' : 'Stock Out';
    updateProduct(productId, { stock: newStock });
    addInventoryLog(productId, type, Math.abs(diff), oldStock, newStock, notes);
  };

  const bulkUpdateStock = (updates, notes = 'Bulk stock adjustment') => {
    setProducts((prevProducts) => {
      const nextProducts = prevProducts.map((product) => {
        const update = updates.find((u) => String(u.productId) === String(product.id));
        if (update) {
          const oldStock = product.stock;
          const newStock = Math.max(0, Number(update.stock) || 0);
          const diff = newStock - oldStock;
          if (diff !== 0) {
            const type = diff > 0 ? 'Stock In' : 'Stock Out';
            setTimeout(() => {
              addInventoryLog(product.id, type, Math.abs(diff), oldStock, newStock, notes);
            }, 0);
          }
          return { ...product, stock: newStock };
        }
        return product;
      });
      return nextProducts;
    });
  };

  const addCategory = (category) => {
    const nextCategory = {
      ...category,
      id: createCategoryId(categories),
      visible: true,
      featured: Boolean(category.featured),
      sortOrder: Number(category.sortOrder) || categories.length + 1,
    };
    if (isFirebaseActive) {
      setDoc(doc(db, 'categories', String(nextCategory.id)), nextCategory).catch(() => {
        setCategories((prev) => [nextCategory, ...prev]);
      });
    } else {
      setCategories((prev) => [nextCategory, ...prev]);
    }
    return nextCategory;
  };

  const updateCategory = (categoryId, updates) => {
    if (isFirebaseActive) {
      const existing = categories.find((c) => c.id === categoryId);
      if (existing) {
        setDoc(doc(db, 'categories', String(categoryId)), { ...existing, ...updates }).catch(() => {
          setCategories((prev) => prev.map((c) => c.id === categoryId ? { ...c, ...updates } : c));
        });
      }
    } else {
      setCategories((prev) => prev.map((category) => (category.id === categoryId ? { ...category, ...updates } : category)));
    }
  };

  const deleteCategory = (categoryId) => {
    if (isFirebaseActive) {
      deleteDoc(doc(db, 'categories', String(categoryId))).catch(() => {
        setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      });
    } else {
      setCategories((prev) => prev.filter((category) => category.id !== categoryId));
    }
  };

  const toggleCategoryVisibility = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      updateCategory(categoryId, { visible: !category.visible });
    }
  };

  const addReview = (productId, reviewData) => {
    const product = products.find(p => String(p.id) === String(productId));
    if (product) {
      const newReview = {
        id: Date.now(),
        name: reviewData.name || 'Anonymous',
        rating: reviewData.rating,
        text: reviewData.text,
        date: new Date().toLocaleDateString()
      };

      const updatedReviews = [...(product.customerReviews || []), newReview];
      const avgRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;
      const reviewCount = (product.reviews || 0) + 1;

      updateProduct(productId, {
        customerReviews: updatedReviews,
        rating: avgRating,
        reviews: reviewCount
      });
    }
  };

  const value = useMemo(() => ({
    products,
    categories,
    inventoryHistory,
    loading,
    getProductById,
    getFeaturedProducts,
    getBestsellers,
    getNewArrivals,
    getProductsByCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    archiveProduct,
    toggleProductVisibility,
    updateProductStock,
    bulkUpdateStock,
    addInventoryLog,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryVisibility,
    addReview,
  }), [categories, products, inventoryHistory, loading]);

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};
