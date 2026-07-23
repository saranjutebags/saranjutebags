import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SEOHead from '../components/SEOHead';

const PrivacyView = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 sm:pt-36 pb-16">
      <SEOHead
        title="Privacy Policy | Saran Jute Bags"
        description="Privacy policy of Saran Jute Bags. Learn how we collect, store, protect, and use your personal information safely."
        canonical="/privacy"
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-6 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mb-8">Last updated: June 06, 2024</p>

          <div className="prose prose-emerald max-w-none text-gray-700 space-y-6">
            <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
            <p>We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.</p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Interpretation and Definitions</h2>
            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Interpretation</h3>
            <p>The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Definitions</h3>
            <p>For the purposes of this Privacy Policy:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.</li>
              <li><strong>Affiliate</strong> means an entity that controls, is controlled by or is under common control with a party.</li>
              <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our") refers to Saran Jute Bags.</li>
              <li><strong>Cookies</strong> are small files placed on Your device by a website.</li>
              <li><strong>Country</strong> refers to: Telangana, India</li>
              <li><strong>Device</strong> means any device that can access the Service.</li>
              <li><strong>Personal Data</strong> is any information relating to an identified or identifiable individual.</li>
              <li><strong>Service</strong> refers to the Website.</li>
              <li><strong>Service Provider</strong> means any natural or legal person who processes data on behalf of the Company.</li>
              <li><strong>Usage Data</strong> refers to data collected automatically.</li>
              <li><strong>Website</strong> refers to Saran Jute Bags, accessible from <a href="https://saranjutebags.com/" className="text-emerald-600 hover:underline">https://saranjutebags.com/</a></li>
              <li><strong>You</strong> means the individual accessing or using the Service.</li>
            </ul>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Collecting and Using Your Personal Data</h2>
            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Types of Data Collected</h3>
            <p><strong>Personal Data:</strong> While using Our Service, We may ask You to provide us with certain personally identifiable information that can be used to contact or identify You, including email address and phone number.</p>
            <p><strong>Usage Data:</strong> Usage Data is collected automatically when using the Service, including Your Device's IP address, browser type, browser version, pages visited, time and date of visit, and other diagnostic data.</p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Tracking Technologies and Cookies</h3>
            <p>We use Cookies and similar tracking technologies to track activity on Our Service. You can instruct Your browser to refuse all Cookies or to indicate when a Cookie is being sent.</p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Use of Your Personal Data</h2>
            <p>The Company may use Personal Data for purposes including: to provide and maintain our Service, to manage Your Account, to contact You, to provide news and offers, and to manage Your requests.</p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, You can contact us:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>By email: <a href="mailto:saranjutebags@gmail.com" className="text-emerald-600 hover:underline">saranjutebags@gmail.com</a></li>
              <li>By phone: +91 9866027027</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyView;
