import { motion } from 'framer-motion';
import { Mail, MapPin, Phone } from 'lucide-react';
import SEOHead from '../components/SEOHead';

const branches = [
  {
    name: 'Hyderabad',
    address: import.meta.env.VITE_HYDERABAD_ADDRESS || 'Mehdipatnam, Hyderabad, Telangana',
  },
  {
    name: 'Secunderabad',
    address: import.meta.env.VITE_SECUNDERABAD_ADDRESS || 'Secunderabad, Telangana',
  },
  {
    name: 'Vijayawada',
    address: import.meta.env.VITE_VIJAYAWADA_ADDRESS || 'Vijayawada, Andhra Pradesh',
  },
];

const ContactView = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 sm:pt-36 pb-16">
      <SEOHead
        title="Contact Us | Jute Bags Manufacturer Hyderabad, Secunderabad & Vijayawada"
        description="Contact Saran Jute Bags in Mehdipatnam, Hyderabad, Secunderabad, Telangana & Vijayawada. Bulk orders, custom printed bags & corporate gifting inquiries."
        canonical="/contact"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 font-semibold mb-4">
            <MapPin className="w-4 h-4" />
            Contact Us
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">Visit or Reach Out</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">For custom bags, bulk orders, and product queries, contact the nearest branch or send us an email.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          {branches.map((branch, index) => (
            <motion.div key={branch.name} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="glass rounded-3xl p-6 border border-emerald-100">
              <h2 className="text-xl font-bold text-gray-800 mb-2">{branch.name}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{branch.address}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass rounded-3xl p-8 border border-emerald-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Contact Details</h2>
            <div className="space-y-4 text-gray-700">
              <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-emerald-600" /> {import.meta.env.VITE_PHONE_NUMBER || '+91 XXXXXXXXXX'}</div>
              <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-emerald-600" /> {import.meta.env.VITE_SUPPORT_EMAIL || 'support@saranjutebags.in'}</div>
              <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-emerald-600" /> {import.meta.env.VITE_HYDERABAD_ADDRESS || 'Mehdipatnam, Hyderabad, Telangana'}</div>
            </div>
          </div>

          <div className="glass rounded-3xl p-8 border border-emerald-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Business Hours</h2>
            <p className="text-gray-700 mb-2">Monday to Saturday: 9:30 AM - 7:30 PM</p>
            <p className="text-gray-700">Sunday: Closed</p>
            <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-gray-700 text-sm">For checkout support and saved address help, use the profile and checkout pages.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactView;
