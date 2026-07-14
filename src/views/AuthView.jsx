import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Lock, Eye, EyeOff, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import UiPopup from '../components/UiPopup';

const getFriendlyAuthError = (message = '') => {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid-credential') || normalized.includes('invalid login')) {
    return 'The email or password does not match a registered Firebase account. Use your real account details, or create one in Firebase Authentication before trying again.';
  }

  if (normalized.includes('popup-closed-by-user') || normalized.includes('cancelled')) {
    return 'Google sign-in was cancelled before it completed. Please try again.';
  }

  if (normalized.includes('permission-denied') || normalized.includes('insufficient permissions')) {
    return 'Firebase access is blocked by the current Firestore rule set. The site is using a secure Firebase project, so you need a permitted account or updated rules for live data.';
  }

  return message || 'Authentication could not be completed. Please try again.';
};

const AuthView = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(null);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const result = await signIn(email, password);
        if (!result.success) {
          throw new Error(result.error || 'Invalid login details');
        }
        navigate(result.role === 'admin' ? '/dashboard' : '/');
      } else {
        const result = await signUp(email, password, name);
        if (!result.success) {
          throw new Error(result.error || 'Unable to create account');
        }
        navigate('/');
      }
    } catch (error) {
      console.error(error);
      setPopup({
        title: 'Authentication failed',
        message: getFriendlyAuthError(error.message),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        throw new Error(result.error || 'Google sign in failed');
      }
      navigate('/');
    } catch (error) {
      console.error(error);
      setPopup({
        title: 'Google sign in failed',
        message: getFriendlyAuthError(error.message),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.24),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.26),_transparent_30%)]" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-800 opacity-95" />
          <div className="relative z-10 flex h-full w-full items-center justify-center p-12 text-white">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-md">
                <Sparkles className="w-4 h-4" />
                Secure Firebase account access
              </div>
              <h1 className="mt-6 text-4xl font-black leading-tight xl:text-5xl">
                Saran Jute Bags
              </h1>
              <p className="mt-3 text-lg text-emerald-50/90">
                Premium sustainable products, secure ordering, and a production-ready admin workspace.
              </p>
              <div className="mt-8 space-y-4 rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-200" />
                  <p className="text-sm text-emerald-50/90">
                    Use your real Firebase email/password account for customer and admin access.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 text-emerald-200" />
                  <p className="text-sm text-emerald-50/90">
                    Admin access must be assigned in the authenticated user profile, not just by the current browser session.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="glass rounded-[2rem] p-8 border border-emerald-100 shadow-2xl">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Leaf className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gradient mb-2">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h1>
                <p className="text-gray-600">
                  {isLogin ? 'Sign in with your registered account' : 'Create a customer account to place orders'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Your full name"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 text-lg font-bold"
                >
                  {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                </button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-gray-500 text-sm">or continue with</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>

              <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-gray-700">
                <p className="font-semibold text-emerald-800 mb-1">Account access</p>
                <p>Use your registered Firebase account to sign in. If this is an admin attempt, the account must exist in Firebase Auth and have the matching admin role in Firestore.</p>
              </div>

              <div className="mt-8 text-center">
                <p className="text-gray-600">
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <UiPopup
        open={Boolean(popup)}
        title={popup?.title}
        message={popup?.message}
        icon="i"
        primaryAction={
          <button onClick={() => setPopup(null)} className="btn-primary px-5 py-3 w-full sm:w-auto sm:ml-auto">
            Close
          </button>
        }
      />
    </div>
  );
};

export default AuthView;
