import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsView = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 sm:pt-36 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-6 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Terms of Service</h1>
          <p className="text-gray-500 text-sm mb-8">Last updated: June 06, 2024</p>

          <div className="prose prose-emerald max-w-none text-gray-700 space-y-6">
            <p>Welcome to Saran Jute Bags. By using our website and services, you agree to comply with and be bound by the following terms and conditions.</p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>By accessing or using our Service, you agree to be bound by these Terms. If you do not agree to all the terms, you may not access the Service.</p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">2. Products and Orders</h2>
            <p>All product descriptions, images, and pricing are subject to change without notice. We reserve the right to cancel any order for any reason including but not limited to product unavailability, pricing errors, or suspected fraud.</p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">3. Custom Orders</h2>
            <p>Custom orders including personalized bags with logos, text, or designs are subject to additional terms. Once production begins on a custom order, cancellation may not be possible.</p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">4. Shipping and Delivery</h2>
            <p>We strive to deliver products within the estimated timeframe. Delivery times are estimates only and may vary. We are not responsible for delays caused by shipping carriers or customs.</p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">5. Returns and Refunds</h2>
            <p>Please review our return policy for information on returns and refunds. Custom/personalized items may not be eligible for return unless there is a manufacturing defect.</p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">6. Limitation of Liability</h2>
            <p>Saran Jute Bags shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with the use of our products or services.</p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">7. Contact Information</h2>
            <p>For any questions regarding these Terms, please contact us:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Email: <a href="mailto:saranjutebags@gmail.com" className="text-emerald-600 hover:underline">saranjutebags@gmail.com</a></li>
              <li>Phone: +91 9866027027 / +91 9701000234</li>
              <li>Address: 12-2-420/14 Alapati Nagar Road, Gudi Malkapur, Mehdipatnam, Hyderabad, Telangana 500028</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsView;
