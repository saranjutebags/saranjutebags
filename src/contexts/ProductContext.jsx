import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db, isFirebaseActive } from '../firebase/config';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useAdmin } from './AdminContext';

const ProductContext = createContext();

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Jute Bags', image: '/Jute-Bags-1.webp', banner: '/Jute-Bags-1.webp', icon: 'Bag', featured: true, visible: true, sortOrder: 1 },
  { id: 2, name: 'Cotton Bags', image: '/canvas-bags.webp', banner: '/canvas-bags.webp', icon: 'Shirt', featured: true, visible: true, sortOrder: 2 },
  { id: 3, name: 'Canvas Bags', image: '/Canvas-tote-bag.webp', banner: '/Canvas-tote-bag.webp', icon: 'Box', featured: true, visible: true, sortOrder: 3 },
];

const createProductId = () => `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const createCategoryId = () => `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseActive) {
      setLoading(false);
      return;
    }

    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const docs = [];
      snapshot.forEach((d) => docs.push(d.data()));
      docs.sort((a, b) => {
        if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
        return Number(b.id) - Number(a.id);
      });
      setProducts(docs);
      setLoading(false);
    }, (error) => {
      console.warn('Products sync unavailable.', error?.message || error);
      setLoading(false);
    });

    const unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      if (snapshot.empty) {
        DEFAULT_CATEGORIES.forEach((c) => {
          setDoc(doc(db, 'categories', String(c.id)), c).catch(() => undefined);
        });
      } else {
        const docs = [];
        snapshot.forEach((d) => docs.push(d.data()));
        docs.sort((a, b) => a.sortOrder - b.sortOrder);
        setCategories(docs);
      }
    }, (error) => {
      console.warn('Categories sync unavailable.', error?.message || error);
    });

    const unsubscribeInventory = onSnapshot(collection(db, 'inventoryHistory'), (snapshot) => {
      if (!snapshot.empty) {
        const docs = [];
        snapshot.forEach((d) => docs.push(d.data()));
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

  const { testProductSettings } = useAdmin();

  const testProductObject = useMemo(() => {
    if (!testProductSettings?.enabled) return null;
    const totalPrice = Number(testProductSettings.price || 0) + Number(testProductSettings.gstAmount || 0) + Number(testProductSettings.deliveryFee || 0);
    return {
      id: 'test-demo-product',
      name: testProductSettings.name || 'Demo Test Product (Razorpay Testing)',
      price: Number(testProductSettings.price ?? 1.00),
      originalPrice: totalPrice,
      gstAmount: Number(testProductSettings.gstAmount ?? 0),
      deliveryFee: Number(testProductSettings.deliveryFee ?? 0),
      isTestProduct: true,
      category: testProductSettings.category || 'Jute Bags',
      images: testProductSettings.images || ['/Jute-Bags-1.webp'],
      description: testProductSettings.description || 'Demo product configured by Admin for testing Razorpay payment integration.',
      sku: testProductSettings.sku || 'DEMO-TEST',
      stock: 999,
      visible: true,
      archived: false,
      featured: true,
      bestseller: false,
      newArrival: false,
      rating: 5.0,
      reviews: 1,
      customerReviews: [{ id: 'rev-test', name: 'Admin Test', rating: 5, text: 'Demo Test Product for Razorpay testing', date: new Date().toLocaleDateString() }],
      createdAt: new Date().toISOString(),
    };
  }, [testProductSettings]);

  const allProducts = useMemo(() => {
    if (testProductObject) {
      const exists = products.some(p => String(p.id) === String(testProductObject.id));
      if (!exists) {
        return [testProductObject, ...products];
      }
    }
    return products;
  }, [products, testProductObject]);

  const getProductById = (id) => allProducts.find((product) => String(product.id) === String(id));
  const getFeaturedProducts = () => allProducts.filter((product) => product.featured && product.visible && !product.archived);
  const getBestsellers = () => allProducts.filter((product) => product.bestseller && product.visible && !product.archived);
  const getNewArrivals = () => allProducts.filter((product) => product.newArrival && product.visible && !product.archived);
  const getProductsByCategory = (category) => allProducts.filter((product) => product.category === category && product.visible && !product.archived);

  const addProduct = async (product) => {
    const nextProduct = {
      ...product,
      id: createProductId(),
      archived: false,
      visible: true,
      weightPerPiece: Number(product.weightPerPiece) || 0,
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
      await setDoc(doc(db, 'products', String(nextProduct.id)), nextProduct);
    }
    return nextProduct;
  };

  const updateProduct = async (productId, updates) => {
    if (isFirebaseActive) {
      const existing = products.find((product) => String(product.id) === String(productId));
      if (existing) {
        await setDoc(doc(db, 'products', String(productId)), { ...existing, ...updates });
      }
    }
  };

  const deleteProduct = async (productId) => {
    if (isFirebaseActive) {
      await deleteDoc(doc(db, 'products', String(productId)));
    }
  };

  const duplicateProduct = async (productId) => {
    const source = products.find((product) => String(product.id) === String(productId));
    if (!source) return null;

    const copy = {
      ...source,
      id: createProductId(),
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
      await setDoc(doc(db, 'products', String(copy.id)), copy);
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

  const [inventoryHistory, setInventoryHistory] = useState([]);

  const addInventoryLog = async (productId, type, quantity, previousStock, newStock, notes = '') => {
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
      await setDoc(doc(db, 'inventoryHistory', newLog.id), newLog);
    }
  };

  const updateProductStock = async (productId, stock, notes = 'Manual stock adjustment') => {
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return;
    const oldStock = product.stock;
    const newStock = Math.max(0, Number(stock) || 0);
    const diff = newStock - oldStock;
    if (diff === 0) return;

    const type = diff > 0 ? 'Stock In' : 'Stock Out';
    await updateProduct(productId, { stock: newStock });
    await addInventoryLog(productId, type, Math.abs(diff), oldStock, newStock, notes);
  };

  const bulkUpdateStock = async (updates, notes = 'Bulk stock adjustment') => {
    for (const update of updates) {
      await updateProductStock(update.productId, update.stock, notes);
    }
  };

  const addCategory = async (category) => {
    const nextCategory = {
      ...category,
      id: createCategoryId(),
      visible: true,
      featured: Boolean(category.featured),
      sortOrder: Number(category.sortOrder) || categories.length + 1,
    };
    if (isFirebaseActive) {
      await setDoc(doc(db, 'categories', String(nextCategory.id)), nextCategory);
    }
    return nextCategory;
  };

  const updateCategory = async (categoryId, updates) => {
    if (isFirebaseActive) {
      const existing = categories.find((c) => c.id === categoryId);
      if (existing) {
        await setDoc(doc(db, 'categories', String(categoryId)), { ...existing, ...updates });
      }
    }
  };

  const deleteCategory = async (categoryId) => {
    if (isFirebaseActive) {
      await deleteDoc(doc(db, 'categories', String(categoryId)));
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
        images: reviewData.images || [],
        hidden: false,
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

  const deleteProductReview = (productId, reviewId) => {
    const product = products.find(p => String(p.id) === String(productId));
    if (product) {
      const updatedReviews = (product.customerReviews || []).filter(r => r.id !== reviewId);
      const avgRating = updatedReviews.length > 0
        ? updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length
        : 0;
      const reviewCount = Math.max(0, (product.reviews || 0) - 1);

      updateProduct(productId, {
        customerReviews: updatedReviews,
        rating: avgRating,
        reviews: reviewCount
      });
    }
  };

  const toggleReviewVisibility = (productId, reviewId) => {
    const product = products.find(p => String(p.id) === String(productId));
    if (product) {
      const updatedReviews = (product.customerReviews || []).map(r =>
        r.id === reviewId ? { ...r, hidden: !r.hidden } : r
      );
      updateProduct(productId, { customerReviews: updatedReviews });
    }
  };

  const value = useMemo(() => ({
    products: allProducts,
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
    deleteProductReview,
    toggleReviewVisibility,
  }), [categories, allProducts, inventoryHistory, loading]);

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};
