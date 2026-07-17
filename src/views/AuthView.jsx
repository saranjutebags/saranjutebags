import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAuth, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { User, Mail, Lock, Eye, EyeOff, Leaf, ShieldCheck, Sparkles, KeyRound } from 'lucide-react';
import UiPopup from '../components/UiPopup';

const getFriendlyAuthError = (message = '') => {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid-credential') || normalized.includes('invalid login')) {
    return 'The email or password does not match a registered account. Please try again.';
  }

  if (normalized.includes('popup-closed-by-user') || normalized.includes('cancelled')) {
    return 'Google sign-in was cancelled before it completed. Please try again.';
  }

  if (normalized.includes('permission-denied') || normalized.includes('insufficient permissions')) {
    return 'Firebase access is blocked by the current Firestore rule set.';
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
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

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      setPopup({ title: 'Error', message: 'Please enter your email address' });
      return;
    }
    setLoading(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSent(true);
      setPopup({ title: 'Email Sent', message: 'Password reset link has been sent to your email. Please check your inbox.' });
    } catch (error) {
      setPopup({ title: 'Error', message: getFriendlyAuthError(error.message) });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!password.trim() || password.length < 6) {
      setPopup({ title: 'Error', message: 'New password must be at least 6 characters' });
      return;
    }
    setLoading(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updatePassword(currentUser, password);
        setPopup({ title: 'Success', message: 'Password changed successfully!' });
        setPassword('');
      } else {
        setPopup({ title: 'Error', message: 'You must be logged in to change password' });
      }
    } catch (error) {
      setPopup({ title: 'Error', message: getFriendlyAuthError(error.message) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 flex items-start justify-center px-4 pt-32 sm:pt-36 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-2xl p-6 sm:p-8 border border-emerald-100 shadow-xl">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Leaf className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gradient">
              {showForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {showForgotPassword ? 'Enter your email to receive a reset link' : (isLogin ? 'Sign in to continue' : 'Create a customer account')}
            </p>
          </div>

          {showForgotPassword ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <button onClick={handleForgotPassword} disabled={loading} className="w-full btn-primary py-2.5 text-sm font-bold">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <div className="text-center">
                <button onClick={() => { setShowForgotPassword(false); setResetSent(false); }} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  Back to Sign In
                </button>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="Your full name" />
                    </div>
                  </motion.div>
                )}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="you@example.com" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" placeholder="Your password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {isLogin && (
                  <div className="text-right">
                    <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">Forgot Password?</button>
                  </div>
                )}
                <button type="submit" disabled={loading} className="w-full btn-primary py-2.5 text-sm font-bold">
                  {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                </button>
              </form>
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-gray-400 text-xs">or continue with</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <button onClick={handleGoogleSignIn} disabled={loading} className="w-full py-2.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
              <div className="mt-6 text-center">
                <p className="text-gray-500 text-sm">
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <button onClick={() => setIsLogin(!isLogin)} className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>

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
