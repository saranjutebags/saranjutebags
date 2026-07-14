import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db, isFirebaseActive } from '../firebase/config';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const ProductContext = createContext();

const STORAGE_KEYS = {
  products: 'saran-jute-products',
  categories: 'saran-jute-categories',
};

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: 'Premium Jute Tote Bag',
    shortDescription: 'Eco-friendly jute tote bag for daily use.',
    description: 'Eco-friendly jute tote bag perfect for daily use and shopping. Durable and biodegradable.',
    price: 299,
    originalPrice: 499,
    category: 'Jute Bags',
    subCategory: 'Tote',
    images: ['/Jute-Bags-1.webp', '/Canvas-tote-bag.webp'],
    videos: [],
    stock: 50,
    lowStockAlert: 10,
    rating: 4.8,
    reviews: 128,
    customerReviews: [
      { id: 1, name: 'Amit Sharma', rating: 5, text: 'Excellent quality! Very durable and eco-friendly.', date: new Date().toLocaleDateString() },
      { id: 2, name: 'Priya Patel', rating: 4, text: 'Great product, perfect for daily use.', date: new Date().toLocaleDateString() }
    ],
    material: 'Laminated Jute',
    dimensions: '16" x 14" x 4"',
    weight: '250 g',
    colors: ['Natural', 'Black', 'Blue'],
    sizes: ['Standard'],
    tags: ['featured', 'best seller'],
    sku: 'JB001',
    barcode: '890000000001',
    hsnCode: '4202',
    brand: 'Saran Jute Bags',
    specifications: ['Reinforced handles', 'Biodegradable', 'Reusable'],
    featured: true,
    bestseller: true,
    newArrival: false,
    archived: false,
    visible: true,
    discountPercentage: 40,
    discountPrice: 299,
    visibility: 'Public',
    seoTitle: 'Premium Jute Tote Bag',
    seoDescription: 'Buy premium reusable jute tote bag.',
  },
  {
    id: 2,
    name: 'Customized Jute Bag',
    shortDescription: 'Custom printed jute bags for branding.',
    description: 'Custom printed jute bags perfect for branding and promotional purposes.',
    price: 399,
    originalPrice: 599,
    category: 'Jute Bags',
    subCategory: 'Custom',
    images: ['/customized-jute-bags.webp', '/Jute-Bags-1.webp'],
    videos: [],
    stock: 100,
    lowStockAlert: 15,
    rating: 4.9,
    reviews: 86,
    customerReviews: [],
    material: 'Premium Jute',
    dimensions: '15" x 13" x 5"',
    weight: '300 g',
    colors: ['Natural', 'Custom Print'],
    sizes: ['Standard'],
    tags: ['new arrival'],
    sku: 'JB002',
    barcode: '890000000002',
    hsnCode: '4202',
    brand: 'Saran Jute Bags',
    specifications: ['Printable surface', 'Corporate gifting', 'Reusable'],
    featured: true,
    bestseller: false,
    newArrival: true,
    archived: false,
    visible: true,
    discountPercentage: 33,
    discountPrice: 399,
    visibility: 'Public',
    seoTitle: 'Customized Jute Bag',
    seoDescription: 'Personalized jute bags for branding and events.',
  },
  {
    id: 3,
    name: 'Cotton Shopping Bag',
    shortDescription: 'Reusable cotton shopping bag.',
    description: 'Reusable cotton shopping bag with strong handles and spacious design.',
    price: 199,
    originalPrice: 349,
    category: 'Cotton Bags',
    subCategory: 'Shopping',
    images: ['/canvas-bags.webp', '/Canvas-tote-bag.webp'],
    videos: [],
    stock: 75,
    lowStockAlert: 10,
    rating: 4.7,
    reviews: 64,
    material: 'Organic Cotton',
    dimensions: '18" x 15" x 5"',
    weight: '180 g',
    colors: ['White', 'Beige', 'Black'],
    sizes: ['Standard'],
    tags: ['bestseller'],
    sku: 'CB001',
    barcode: '890000000003',
    hsnCode: '4202',
    brand: 'Saran Jute Bags',
    specifications: ['Washable', 'Reusable'],
    featured: false,
    bestseller: true,
    newArrival: false,
    archived: false,
    visible: true,
    discountPercentage: 43,
    discountPrice: 199,
    visibility: 'Public',
    seoTitle: 'Cotton Shopping Bag',
    seoDescription: 'Reusable cotton shopping bag with strong handles.',
  },
  {
    id: 4,
    name: 'Canvas Tote Bag',
    shortDescription: 'Heavy-duty canvas tote bag.',
    description: 'Heavy-duty canvas tote bag perfect for work, school, and daily errands.',
    price: 349,
    originalPrice: 499,
    category: 'Canvas Bags',
    subCategory: 'Tote',
    images: ['/Canvas-tote-bag.webp', '/canvas-bags.webp'],
    videos: [],
    stock: 45,
    lowStockAlert: 10,
    rating: 4.6,
    reviews: 92,
    material: '16oz Canvas',
    dimensions: '17" x 14" x 5"',
    weight: '320 g',
    colors: ['Natural', 'Black', 'Navy', 'Olive'],
    sizes: ['Standard'],
    tags: ['featured'],
    sku: 'CV001',
    barcode: '890000000004',
    hsnCode: '4202',
    brand: 'Saran Jute Bags',
    specifications: ['Heavy duty', 'Washable'],
    featured: true,
    bestseller: false,
    newArrival: false,
    archived: false,
    visible: true,
    discountPercentage: 30,
    discountPrice: 349,
    visibility: 'Public',
    seoTitle: 'Canvas Tote Bag',
    seoDescription: 'Heavy duty canvas tote bag for daily use.',
  },
  {
    id: 5,
    name: 'Lunch Jute Bag',
    shortDescription: 'Insulated jute lunch bag.',
    description: 'Insulated jute lunch bag to keep your food fresh and eco-friendly.',
    price: 249,
    originalPrice: 399,
    category: 'Jute Bags',
    subCategory: 'Lunch',
    images: ['/Lunch-Bag.webp', '/Jute-Bags-1.webp'],
    videos: [],
    stock: 60,
    lowStockAlert: 10,
    rating: 4.5,
    reviews: 48,
    material: 'Jute with Insulation',
    dimensions: '12" x 10" x 6"',
    weight: '210 g',
    colors: ['Natural', 'Colorful'],
    sizes: ['Standard'],
    tags: ['new arrival'],
    sku: 'JB003',
    barcode: '890000000005',
    hsnCode: '4202',
    brand: 'Saran Jute Bags',
    specifications: ['Insulated lining', 'Lunch carry bag'],
    featured: false,
    bestseller: false,
    newArrival: true,
    archived: false,
    visible: true,
    discountPercentage: 38,
    discountPrice: 249,
    visibility: 'Public',
    seoTitle: 'Lunch Jute Bag',
    seoDescription: 'Insulated reusable lunch jute bag.',
  },
  {
    id: 6,
    name: 'Promotional Jute Bag',
    shortDescription: 'Affordable promotional bag.',
    description: 'Affordable promotional jute bags for events, campaigns, and corporate gifting.',
    price: 149,
    originalPrice: 249,
    category: 'Jute Bags',
    subCategory: 'Promotional',
    images: ['/Jute-Bags-1.webp', '/customized-jute-bags.webp'],
    videos: [],
    stock: 200,
    lowStockAlert: 20,
    rating: 4.4,
    reviews: 76,
    material: 'Standard Jute',
    dimensions: '14" x 12" x 4"',
    weight: '190 g',
    colors: ['Natural'],
    sizes: ['Standard'],
    tags: ['bestseller'],
    sku: 'JB004',
    barcode: '890000000006',
    hsnCode: '4202',
    brand: 'Saran Jute Bags',
    specifications: ['Promotional bag', 'Bulk friendly'],
    featured: false,
    bestseller: true,
    newArrival: false,
    archived: false,
    visible: true,
    discountPercentage: 40,
    discountPrice: 149,
    visibility: 'Public',
    seoTitle: 'Promotional Jute Bag',
    seoDescription: 'Affordable promotional jute bag for events and campaigns.',
  },
];

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
  const [products, setProducts] = useState(() => readJson(STORAGE_KEYS.products, DEFAULT_PRODUCTS));
  const [categories, setCategories] = useState(() => readJson(STORAGE_KEYS.categories, DEFAULT_CATEGORIES));

  // Sync with Firestore if active
  useEffect(() => {
    if (!isFirebaseActive) return;

    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      if (snapshot.empty) {
        // Seed default products
        DEFAULT_PRODUCTS.forEach((p) => {
          setDoc(doc(db, 'products', String(p.id)), p);
        });
      } else {
        const docs = [];
        snapshot.forEach((d) => {
          docs.push(d.data());
        });
        docs.sort((a, b) => b.id - a.id);
        setProducts(docs);
      }
    });

    const unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      if (snapshot.empty) {
        // Seed default categories
        DEFAULT_CATEGORIES.forEach((c) => {
          setDoc(doc(db, 'categories', String(c.id)), c);
        });
      } else {
        const docs = [];
        snapshot.forEach((d) => {
          docs.push(d.data());
        });
        docs.sort((a, b) => a.sortOrder - b.sortOrder);
        setCategories(docs);
      }
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

  const getProductById = (id) => products.find((product) => product.id === Number(id));
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
    };

    if (isFirebaseActive) {
      setDoc(doc(db, 'products', String(nextProduct.id)), nextProduct);
    } else {
      setProducts((prev) => [nextProduct, ...prev]);
    }
    return nextProduct;
  };

  const updateProduct = (productId, updates) => {
    if (isFirebaseActive) {
      const existing = products.find((product) => product.id === productId);
      if (existing) {
        setDoc(doc(db, 'products', String(productId)), { ...existing, ...updates });
      }
    } else {
      setProducts((prev) => prev.map((product) => (product.id === productId ? { ...product, ...updates } : product)));
    }
  };

  const deleteProduct = (productId) => {
    if (isFirebaseActive) {
      deleteDoc(doc(db, 'products', String(productId)));
    } else {
      setProducts((prev) => prev.filter((product) => product.id !== productId));
    }
  };

  const duplicateProduct = (productId) => {
    const source = products.find((product) => product.id === productId);
    if (!source) {
      return null;
    }

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
    };

    if (isFirebaseActive) {
      setDoc(doc(db, 'products', String(copy.id)), copy);
    } else {
      setProducts((prev) => [copy, ...prev]);
    }
    return copy;
  };

  const archiveProduct = (productId) => {
    updateProduct(productId, { archived: true, visible: false });
  };

  const toggleProductVisibility = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      updateProduct(productId, { visible: !product.visible });
    }
  };

  // Inventory History tracking
  const [inventoryHistory, setInventoryHistory] = useState(() => {
    const stored = readJson('saran-jute-inventory-history', null);
    if (stored) return stored;
    return [
      { id: 'inv-1', productId: 1, productName: 'Premium Jute Tote Bag', type: 'Stock In', quantity: 50, timestamp: new Date().toLocaleString(), previousStock: 0, newStock: 50, notes: 'Initial inventory load' },
      { id: 'inv-2', productId: 2, productName: 'Customized Jute Bag', type: 'Stock In', quantity: 100, timestamp: new Date().toLocaleString(), previousStock: 0, newStock: 100, notes: 'Initial inventory load' },
      { id: 'inv-3', productId: 3, productName: 'Cotton Shopping Bag', type: 'Stock In', quantity: 75, timestamp: new Date().toLocaleString(), previousStock: 0, newStock: 75, notes: 'Initial inventory load' },
      { id: 'inv-4', productId: 4, productName: 'Canvas Tote Bag', type: 'Stock In', quantity: 45, timestamp: new Date().toLocaleString(), previousStock: 0, newStock: 45, notes: 'Initial inventory load' },
      { id: 'inv-5', productId: 5, productName: 'Lunch Jute Bag', type: 'Stock In', quantity: 60, timestamp: new Date().toLocaleString(), previousStock: 0, newStock: 60, notes: 'Initial inventory load' },
      { id: 'inv-6', productId: 6, productName: 'Promotional Jute Bag', type: 'Stock In', quantity: 200, timestamp: new Date().toLocaleString(), previousStock: 0, newStock: 200, notes: 'Initial inventory load' },
    ];
  });

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson('saran-jute-inventory-history', inventoryHistory);
    }
  }, [inventoryHistory]);

  const addInventoryLog = (productId, type, quantity, previousStock, newStock, notes = '') => {
    const product = products.find(p => p.id === productId);
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
      setDoc(doc(db, 'inventoryHistory', newLog.id), newLog);
    } else {
      setInventoryHistory(prev => [newLog, ...prev]);
    }
  };

  const updateProductStock = (productId, stock, notes = 'Manual stock adjustment') => {
    const product = products.find(p => p.id === productId);
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
    // updates is array of { productId, stock }
    setProducts((prevProducts) => {
      const nextProducts = prevProducts.map((product) => {
        const update = updates.find((u) => u.productId === product.id);
        if (update) {
          const oldStock = product.stock;
          const newStock = Math.max(0, Number(update.stock) || 0);
          const diff = newStock - oldStock;
          if (diff !== 0) {
            const type = diff > 0 ? 'Stock In' : 'Stock Out';
            // We call state update side effect asynchronously or just log immediately
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
    setCategories((prev) => [nextCategory, ...prev]);
    return nextCategory;
  };

  const updateCategory = (categoryId, updates) => {
    setCategories((prev) => prev.map((category) => (category.id === categoryId ? { ...category, ...updates } : category)));
  };

  const deleteCategory = (categoryId) => {
    setCategories((prev) => prev.filter((category) => category.id !== categoryId));
  };

  const toggleCategoryVisibility = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      updateCategory(categoryId, { visible: !category.visible });
    }
  };

  const addReview = (productId, reviewData) => {
    const product = products.find(p => p.id === productId);
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
  }), [categories, products, inventoryHistory]);

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};