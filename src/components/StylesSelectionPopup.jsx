import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ChevronLeft, ChevronRight, Plus, Minus, ShoppingBag, Upload, Image as ImageIcon, ChevronDown } from 'lucide-react';

const StylesSelectionPopup = ({ 
  isOpen, 
  onClose, 
  product, 
  onConfirm, 
  onBack 
}) => {
  const [step, setStep] = useState(1); // 1 = selection, 2 = confirmation
  const [selectedStyles, setSelectedStyles] = useState({});
  const [quantities, setQuantities] = useState({});
  const [customText, setCustomText] = useState('');
  const [customLogo, setCustomLogo] = useState('');
  const [logoName, setLogoName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customDesignSelected, setCustomDesignSelected] = useState(false);
  const [customDesignQuantity, setCustomDesignQuantity] = useState(1);

  // Initialize with default quantities from product styles - DON'T auto-select
  useEffect(() => {
    if (product?.styles?.length > 0) {
      const initialQuantities = {};
      product.styles.forEach((style, index) => {
        initialQuantities[style.name || `Style ${index + 1}`] = style.defaultQuantity || 1;
      });
      setQuantities(initialQuantities);
    }
  }, [product]);

  // Custom design fee from product (default 100)
  const customDesignFee = product?.customDesignFee || 100;
  // Custom design price = product price + custom design fee
  const customDesignPrice = (product?.price || 0) + customDesignFee;

  const selectedCount = Object.values(selectedStyles).filter(Boolean).length + (customDesignSelected ? 1 : 0);
  // Only sum quantities for SELECTED styles
  const styleTotalQuantity = product?.styles?.reduce((sum, style, index) => {
    const styleName = style.name || `Style ${index + 1}`;
    if (selectedStyles[styleName]) {
      return sum + (quantities[styleName] || 1);
    }
    return sum;
  }, 0) || 0;
  const customDesignQty = customDesignSelected ? customDesignQuantity : 0;
  const totalQuantity = styleTotalQuantity + customDesignQty;
  const totalPrice = product?.price ? (product.price * styleTotalQuantity) + (customDesignPrice * customDesignQty) : 0;

  const handleCheckboxChange = (styleName) => {
    setSelectedStyles(prev => ({ ...prev, [styleName]: !prev[styleName] }));
  };

  const handleQuantityChange = (styleName, delta) => {
    const current = quantities[styleName] || 1;
    const newQty = Math.max(1, current + delta);
    setQuantities(prev => ({ ...prev, [styleName]: newQty }));
  };

  const handleCustomDesignCheckboxChange = () => {
    setCustomDesignSelected(prev => !prev);
  };

  const handleCustomDesignQuantityChange = (delta) => {
    const current = customDesignQuantity || 1;
    const newQty = Math.max(1, current + delta);
    setCustomDesignQuantity(newQty);
  };

  const handleContinue = () => {
    if (selectedCount === 0 && !customDesignSelected) {
      alert('Please select at least one style or custom design');
      return;
    }
    setStep(2);
  };

  const handleGoBack = () => {
    if (step === 1) {
      onBack?.();
    } else {
      setStep(1);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomLogo(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    const selectedItems = product.styles
      .filter(style => selectedStyles[style.name || ''])
      .map(style => ({
        name: style.name,
        quantity: quantities[style.name] || 1,
        price: product.price,
        total: product.price * (quantities[style.name] || 1),
      }));

    // Add custom design as a selected style if enabled
    if (customDesignSelected) {
      selectedItems.push({
        name: 'Custom Design',
        quantity: customDesignQuantity,
        price: customDesignPrice,
        total: customDesignPrice * customDesignQuantity,
        isCustomDesign: true,
        customText,
        customLogo,
        customDescription,
        customDesignFee,
      });
    }

    onConfirm?.({
      selectedStyles: selectedItems,
      totalQuantity,
      totalPrice,
      customText,
      customLogo,
      customDescription,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {step === 1 ? 'Select Styles' : 'Confirm Selection'}
                </h2>
                <p className="text-emerald-100 text-sm mt-1">
                  {step === 1 
                    ? 'Choose styles and quantities for your order' 
                    : 'Review your selection before adding to cart'}
                </p>
              </div>
              <button
                onClick={handleGoBack}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {step === 1 && (
              <div className="space-y-6">
                {/* Product Info */}
                <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <img 
                    src={product?.images?.[0] || product?.image} 
                    alt={product?.name} 
                    className="w-20 h-20 object-contain rounded-xl"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-800">{product?.name}</h3>
                    <p className="text-sm text-gray-600">Base Price: ₹{product?.price} per style</p>
                  </div>
                </div>

                {/* Styles List */}
                {product?.styles?.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-emerald-600" />
                      Available Styles
                    </h4>
                    {product.styles.map((style, index) => {
                      const styleName = style.name || `Style ${index + 1}`;
                      const isSelected = selectedStyles[styleName];
                      const qty = quantities[styleName] || 1;

                      return (
                        <motion.div
                          key={styleName}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`rounded-2xl p-4 border-2 transition-all ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-50' 
                              : 'border-gray-200 bg-white hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <label className="flex items-center gap-4 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleCheckboxChange(styleName)}
                                className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                              />
                              <div>
                                <p className="font-medium text-gray-800">{styleName}</p>
                                <p className="text-sm text-gray-500">₹{product?.price} each</p>
                              </div>
                            </label>

                            {isSelected && (
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-emerald-700">
                                  ₹{(product?.price * qty).toFixed(2)}
                                </span>
                                <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                                  <button
                                    onClick={() => handleQuantityChange(styleName, -1)}
                                    className="px-3 py-2 text-gray-600 hover:text-gray-800"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="px-4 py-2 font-semibold text-gray-800 min-w-[3rem] text-center">
                                    {qty}
                                  </span>
                                  <button
                                    onClick={() => handleQuantityChange(styleName, 1)}
                                    className="px-3 py-2 text-gray-600 hover:text-gray-800"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Custom Design as selectable item */}
                    <motion.div
                      key="custom-design"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (product?.styles?.length || 0) * 0.05 }}
                      className={`rounded-2xl p-4 border-2 transition-all ${
                        customDesignSelected 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-gray-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <label className="flex items-center gap-4 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={customDesignSelected}
                            onChange={handleCustomDesignCheckboxChange}
                            className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <div>
                            <p className="font-medium text-gray-800 flex items-center gap-2">
                              <ImageIcon className="w-5 h-5 text-emerald-600" />
                              Custom Design
                            </p>
                            <p className="text-sm text-gray-500">₹{customDesignPrice} each <span className="text-xs text-gray-400">(₹{product?.price} + ₹{customDesignFee})</span></p>
                          </div>
                        </label>

                        {customDesignSelected && (
                          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                            <div className="flex items-center gap-3 w-full">
                              <span className="font-semibold text-emerald-700">
                                ₹{(customDesignPrice * customDesignQuantity).toFixed(2)}
                              </span>
                              <div className="flex items-center border border-gray-300 rounded-lg bg-white ml-auto">
                                <button
                                  onClick={() => handleCustomDesignQuantityChange(-1)}
                                  className="px-3 py-2 text-gray-600 hover:text-gray-800"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="px-4 py-2 font-semibold text-gray-800 min-w-[3rem] text-center">
                                  {customDesignQuantity}
                                </span>
                                <button
                                  onClick={() => handleCustomDesignQuantityChange(1)}
                                  className="px-3 py-2 text-gray-600 hover:text-gray-800"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Custom Design Detail Fields - shown when selected */}
                            <div className="space-y-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 w-full">
                              <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">Text to Print</label>
                                <input
                                  type="text"
                                  value={customText}
                                  onChange={(e) => setCustomText(e.target.value)}
                                  placeholder="Enter brand name, text, or phone to print"
                                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 bg-white text-sm"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">Upload Logo/Design</label>
                                <div className="relative border border-dashed border-emerald-200 rounded-xl p-3 text-center hover:bg-emerald-50/50 transition-colors">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                  <div className="flex flex-col items-center gap-1">
                                    {customLogo ? (
                                      <>
                                        <img src={customLogo} alt="Custom Logo" className="w-16 h-16 object-contain mb-2 rounded-lg border border-gray-100 bg-white" />
                                        <p className="text-xs text-emerald-700 font-semibold truncate max-w-[200px]">
                                          {logoName}
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => { setCustomLogo(''); setLogoName(''); }}
                                          className="text-red-600 hover:text-red-700 text-xs font-medium"
                                        >
                                          Remove
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="w-6 h-6 text-emerald-600 mb-1" />
                                        <p className="text-xs text-emerald-700 font-semibold">Choose print logo file</p>
                                        <p className="text-[10px] text-gray-400">PNG, JPG, JPEG, SVG formats</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">Custom Requirements / Description</label>
                                <textarea
                                  value={customDescription}
                                  onChange={(e) => setCustomDescription(e.target.value)}
                                  placeholder="Describe your custom requirements (size, color, design, etc.)"
                                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm min-h-[80px] bg-white"
                                  rows={3}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>

                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No styles available for this product</p>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Selected Styles:</span>
                    <span className="font-semibold text-gray-800">{selectedCount}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Total Quantity:</span>
                    <span className="font-semibold text-gray-800">{totalQuantity}</span>
                  </div>
                  <div className="space-y-1 border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Product Price (₹{product?.price} × {styleTotalQuantity})</span>
                      <span className="font-medium">₹{product?.price * styleTotalQuantity}</span>
                    </div>
                    {customDesignSelected && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Design Price (₹{customDesignFee} × {customDesignQty})</span>
                        <span className="font-medium">₹{customDesignFee * customDesignQty}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-emerald-700 border-t border-gray-200 pt-3">
                      <span>Total</span>
                      <span>₹{totalPrice}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Review Your Selection</h3>
                  <p className="text-gray-600 mt-1">
                    {selectedCount} style{selectedCount !== 1 ? 's' : ''} selected, {totalQuantity} total item{totalQuantity !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="space-y-3">
                  {product?.styles?.filter(style => selectedStyles[style.name || '']).map((style, index) => {
                    const styleName = style.name || `Style ${index + 1}`;
                    const qty = quantities[styleName] || 1;
                    return (
                      <div key={styleName} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-gray-800">{styleName}</p>
                            <p className="text-sm text-gray-500">Qty: {qty} × ₹{product?.price}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-700">₹{product?.price * qty}</p>
                        </div>
                      </div>
                    );
                  })}

                  {customDesignSelected && (
                    <div key="custom-design-review" className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm">
                          <ImageIcon className="w-5 h-5" />
                        </span>
                        <div>
                          <p className="font-medium text-gray-800">Custom Design</p>
                          <p className="text-sm text-gray-500">Qty: {customDesignQuantity} × ₹{customDesignPrice} <span className="text-xs text-gray-400">(₹{product?.price} + ₹{customDesignFee})</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-700">₹{(customDesignPrice * customDesignQuantity).toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <div className="flex justify-between text-lg font-bold text-emerald-800">
                    <span>Total Amount</span>
                    <span>₹{totalPrice}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <div className="flex gap-3">
              {step === 1 ? (
                <>
                  <button
                    onClick={handleGoBack}
                    className="flex-1 btn-secondary py-3"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Go Back
                  </button>
                  <button
                    onClick={handleContinue}
                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                    disabled={selectedCount === 0}
                  >
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleGoBack}
                    className="flex-1 btn-secondary py-3"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Add to Cart
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StylesSelectionPopup;