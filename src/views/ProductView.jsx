import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Heart, Star, ArrowLeft, Share2, Truck, ShieldCheck, RefreshCw, Check, X } from 'lucide-react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const ProductView = () => {
  const { id } = useParams();
  const location = useLocation();
  const productUrl = `${window.location.origin}${location.pathname}`;
  const { getProductById, addReview } = useProducts();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [customText, setCustomText] = useState('');
  const [customLogo, setCustomLogo] = useState('');
  const [logoName, setLogoName] = useState('');
  
  // Review state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ name: '', rating: 0, text: '' });
  
  // Share state
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const product = getProductById(id);

  const handleAddToCart = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    addToCart(product, quantity, customText, customLogo);
  };

  const handleAddReview = () => {
    if (newReview.rating === 0 || !newReview.text.trim()) {
      alert('Please select a rating and write a review');
      return;
    }
    addReview(Number(id), {
      name: newReview.name || (user ? user.name : 'Anonymous'),
      rating: newReview.rating,
      text: newReview.text
    });
    setNewReview({ name: '', rating: 0, text: '' });
    setShowReviewForm(false);
  };

  const handleShare = (platform) => {
    setShowShareMenu(false);
    if (platform === 'copy') {
      navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=Check%20out%20this%20product:%20${encodeURIComponent(productUrl)}`);
    } else if (platform === 'email') {
      window.open(`mailto:?subject=Check%20out%20this%20product&body=Check%20out%20this%20product:%20${encodeURIComponent(productUrl)}`);
    } else if (platform === 'instagram') {
      alert('Please copy the link and share on Instagram');
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 pb-16 flex items-center justify-center">
        <div className="text-center glass rounded-3xl p-12 border border-emerald-100">
          <div className="text-6xl mb-4">🌿</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Product not found</h2>
          <Link to="/products" className="btn-primary inline-block">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const isCustomizable = product.category === 'Customized' || product.subCategory === 'Custom' || product.customizable || product.name?.toLowerCase().includes('custom');

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

  const features = [
    { icon: Truck, title: 'Free Delivery', desc: 'On orders over ₹999' },
    { icon: ShieldCheck, title: 'Premium Quality', desc: '100% eco-friendly materials' },
    { icon: RefreshCw, title: 'Easy Returns', desc: '7 days return policy' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>

        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="glass rounded-3xl p-8 border border-emerald-100">
              <div className="relative h-[400px] bg-gradient-to-br from-emerald-50 to-mint-50 rounded-2xl flex items-center justify-center overflow-hidden">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />

                {/* Custom Overlay Mockup */}
                {isCustomizable && (customText || customLogo) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginTop: '20px' }}>
                    <div className="bg-white/85 backdrop-blur-sm border border-emerald-200 p-4 rounded-2xl flex flex-col items-center max-w-[190px] shadow-2xl animate-fade-in">
                      {customLogo && (
                        <img src={customLogo} alt="Custom Logo" className="w-16 h-16 object-contain mb-2 rounded-lg border border-gray-100 bg-white" />
                      )}
                      {customText && (
                        <p className="text-sm font-bold text-gray-800 text-center truncate w-full" style={{ fontFamily: 'Georgia, serif' }}>
                          "{customText}"
                        </p>
                      )}
                      <span className="text-[10px] text-emerald-600 font-semibold mt-1">Logo Mockup</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    className="glass rounded-xl p-4 border border-emerald-100 hover:border-emerald-500 transition-all"
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="h-20 w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="mb-6">
              <span className="inline-block bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                {product.category}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'fill-current' : ''}`} />
                  ))}
                </div>
                <span className="text-gray-600">({product.reviews} reviews)</span>
              </div>
              <div className="flex items-baseline gap-4 mb-8">
                <span className="text-4xl font-bold text-gradient">₹{product.price}</span>
                <span className="text-2xl text-gray-400 line-through">₹{product.originalPrice}</span>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                </span>
              </div>
            </div>

            <p className="text-gray-700 text-lg mb-8 leading-relaxed">{product.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="glass rounded-xl p-4 border border-emerald-100">
                <p className="text-gray-500 text-sm mb-1">Material</p>
                <p className="font-semibold text-gray-800">{product.material}</p>
              </div>
              <div className="glass rounded-xl p-4 border border-emerald-100">
                <p className="text-gray-500 text-sm mb-1">Dimensions</p>
                <p className="font-semibold text-gray-800">{product.dimensions}</p>
              </div>
            </div>

            {/* Customization Panel */}
            {isCustomizable && (
              <div className="glass rounded-2xl p-6 border border-emerald-100 mb-8 space-y-4">
                <h3 className="text-lg font-bold text-gray-800">🎨 Custom Branding details</h3>
                <p className="text-xs text-gray-500">Provide print text and upload your logo image. Mockup will preview on left.</p>
                
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
                  <label className="block text-xs font-semibold text-gray-700">Upload Logo/Graphics</label>
                  <div className="relative border border-dashed border-emerald-200 rounded-xl p-3 text-center hover:bg-emerald-50/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <p className="text-xs text-emerald-700 font-semibold truncate">
                      {logoName ? `File: ${logoName}` : 'Choose print logo file'}
                    </p>
                    <p className="text-[10px] text-gray-400">PNG, JPG, JPEG, SVG formats</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-6 mb-8">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center border border-gray-200 rounded-xl">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 hover:bg-emerald-50 transition-colors"
                  >
                    -
                  </button>
                  <span className="px-6 py-2 font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 hover:bg-emerald-50 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                onClick={handleAddToCart}
                className="flex-1 btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-6 h-6" />
                Add to Cart
              </button>
              <button
                onClick={() => toggleWishlist(product)}
                className={`px-6 sm:px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  isInWishlist(product.id)
                    ? 'bg-red-100 text-red-600 border border-red-200'
                    : 'btn-secondary'
                }`}
              >
                <Heart className={`w-6 h-6 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                {isInWishlist(product.id) ? 'Saved' : 'Save'}
              </button>
              <div className="relative">
                <button 
                  className="btn-secondary px-4 py-4 flex items-center justify-center gap-2"
                  onClick={() => setShowShareMenu(!showShareMenu)}
                >
                  {copied ? <Check className="w-6 h-6" /> : <Share2 className="w-6 h-6" />}
                </button>
                {showShareMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 min-w-48 z-50">
                    <button 
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
                      onClick={() => handleShare('copy')}
                    >
                      <span className="text-sm">Copy Link</span>
                    </button>
                    <button 
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
                      onClick={() => handleShare('whatsapp')}
                    >
                      <span className="text-sm">WhatsApp</span>
                    </button>
                    <button 
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
                      onClick={() => handleShare('instagram')}
                    >
                      <span className="text-sm">Instagram</span>
                    </button>
                    <button 
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
                      onClick={() => handleShare('email')}
                    >
                      <span className="text-sm">Email</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              {features.map((feature, idx) => (
                <div key={idx} className="glass rounded-xl p-6 border border-emerald-100 text-center">
                  <feature.icon className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-800 mb-1">{feature.title}</h4>
                  <p className="text-gray-500 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Reviews Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Customer Reviews</h3>
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="btn-primary px-6 py-2"
                >
                  Write a Review
                </button>
              </div>

              {showReviewForm && (
                <div className="glass rounded-2xl p-6 border border-emerald-100 mb-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Add Your Review</h4>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Your name"
                      value={newReview.name}
                      onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    />
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Rating</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setNewReview({ ...newReview, rating: star })}
                          >
                            <Star className={`w-8 h-8 cursor-pointer transition-all ${
                              star <= newReview.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      placeholder="Write your review..."
                      value={newReview.text}
                      onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl min-h-[120px]"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleAddReview}
                        className="btn-primary px-6 py-2"
                      >
                        Submit Review
                      </button>
                      <button
                        onClick={() => setShowReviewForm(false)}
                        className="btn-secondary px-6 py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {(product.customerReviews || []).length > 0 ? (
                  product.customerReviews.map((review) => (
                    <div key={review.id} className="glass rounded-2xl p-6 border border-emerald-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-800">{review.name}</h4>
                        <p className="text-sm text-gray-500">{review.date}</p>
                      </div>
                      <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-700">{review.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProductView;
