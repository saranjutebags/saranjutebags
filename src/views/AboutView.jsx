import { motion } from 'framer-motion';
import { Award, Globe, Leaf, Shield, Truck } from 'lucide-react';

const stats = [
  { number: '14+', label: 'Years Experience' },
  { number: '1000+', label: 'Products' },
  { number: '5000+', label: 'Happy Clients' },
  { number: '3', label: 'Branches' },
];

const AboutView = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 font-semibold mb-4">
            <Leaf className="w-4 h-4" />
            About Saran Jute Bags
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">Think Green. Use Jute.</h1>
          <p className="text-gray-600 max-w-3xl mx-auto">Saran Jute Bags, established in August 2010, manufactures and exports jute, cotton, and canvas bags with a focus on sustainable production and branded packaging solutions.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <motion.div className="glass rounded-3xl p-8 border border-emerald-100" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">What We Do</h2>
            <p className="text-gray-700 leading-relaxed mb-4">We make high-quality eco-friendly bags for retail, gifting, promotions, and corporate branding. Every product is designed for durability, reuse, and a cleaner supply chain.</p>
            <p className="text-gray-700 leading-relaxed">Our production emphasizes high-grade laminated jute, dependable finishing, and practical designs that work for everyday customers and business buyers.</p>
          </motion.div>
          <motion.div className="grid sm:grid-cols-2 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {stats.map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-6 text-center border border-emerald-100">
                <div className="text-4xl font-bold text-gradient mb-2">{stat.number}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Leaf, title: 'Eco-Friendly', desc: '100% biodegradable' },
            { icon: Shield, title: 'Premium Quality', desc: 'Laminated jute' },
            { icon: Truck, title: 'Pan India', desc: 'Delivery to all pincodes' },
            { icon: Globe, title: 'Export Ready', desc: 'Worldwide shipping' },
            { icon: Award, title: 'Trusted Brand', desc: 'Serving since 2010' },
          ].map((item) => (
            <div key={item.title} className="glass rounded-2xl p-6 text-center border border-emerald-100">
              <item.icon className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AboutView;