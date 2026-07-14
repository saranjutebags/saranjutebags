import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Home, MapPin, Plus, Trash2, CheckCircle2, ShoppingBag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const emptyAddress = {
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  landmark: '',
  isDefault: false,
};

const ProfileView = () => {
  const { user, userData, setUserData } = useAuth();
  const { addresses, orders, addAddress, updateAddress, removeAddress, setDefaultAddress } = useCart();
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState(() => ({
    name: userData?.displayName || user?.displayName || '',
    email: userData?.email || user?.email || '',
    phone: userData?.phone || '',
  }));
  const [addressForm, setAddressForm] = useState(emptyAddress);

  const defaultAddress = useMemo(() => addresses.find(address => address.isDefault) || addresses[0] || null, [addresses]);

  const handleAddressSubmit = (event) => {
    event.preventDefault();
    addAddress(addressForm);
    setAddressForm(emptyAddress);
    setTab('addresses');
  };

  const handleProfileSave = () => {
    setUserData({
      ...(userData || {}),
      displayName: form.name,
      phone: form.phone,
      email: form.email,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">My Profile</h1>
            <p className="text-gray-600">Edit your profile, manage addresses, and keep checkout ready.</p>
          </div>
          <button
            onClick={() => setTab('addresses')}
            className="btn-primary px-5 py-3 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        </div>

        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {['profile', 'addresses', 'orders'].map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`px-5 py-3 rounded-xl font-semibold whitespace-nowrap border transition-colors ${tab === item ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50'}`}
            >
              {item === 'profile' ? 'Edit Profile' : item === 'addresses' ? 'Saved Addresses' : 'Order History'}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="grid lg:grid-cols-3 gap-8">
            <motion.div className="lg:col-span-2 glass rounded-3xl p-8 border border-emerald-100" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-6">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-2xl font-bold text-gray-800">Edit Profile</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input value={form.email} disabled className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl" placeholder="Phone number" />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={handleProfileSave} className="btn-primary px-5 py-3 w-full">Save Profile</button>
                </div>
              </div>
            </motion.div>

            <motion.div className="glass rounded-3xl p-8 border border-emerald-100" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Profile Summary</h3>
              <p className="text-gray-600 mb-2">{user?.displayName || 'User'}</p>
              <p className="text-gray-600 mb-6">{user?.email}</p>
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-gray-700">
                Add addresses in the address tab, then pick one in checkout.
              </div>
            </motion.div>
          </div>
        )}

        {tab === 'addresses' && (
          <div className="grid lg:grid-cols-2 gap-8">
            <motion.form onSubmit={handleAddressSubmit} className="glass rounded-3xl p-8 border border-emerald-100 space-y-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-2">
                <Home className="w-5 h-5 text-emerald-600" />
                <h2 className="text-2xl font-bold text-gray-800">Add Address</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <input required value={addressForm.name} onChange={(event) => setAddressForm({ ...addressForm, name: event.target.value })} placeholder="Full name" className="px-4 py-3 bg-white border border-gray-200 rounded-xl" />
                <input required value={addressForm.phone} onChange={(event) => setAddressForm({ ...addressForm, phone: event.target.value })} placeholder="Phone" className="px-4 py-3 bg-white border border-gray-200 rounded-xl" />
                <input required value={addressForm.addressLine1} onChange={(event) => setAddressForm({ ...addressForm, addressLine1: event.target.value })} placeholder="Address line 1" className="md:col-span-2 px-4 py-3 bg-white border border-gray-200 rounded-xl" />
                <input value={addressForm.addressLine2} onChange={(event) => setAddressForm({ ...addressForm, addressLine2: event.target.value })} placeholder="Address line 2" className="md:col-span-2 px-4 py-3 bg-white border border-gray-200 rounded-xl" />
                <input required value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} placeholder="City" className="px-4 py-3 bg-white border border-gray-200 rounded-xl" />
                <input required value={addressForm.state} onChange={(event) => setAddressForm({ ...addressForm, state: event.target.value })} placeholder="State" className="px-4 py-3 bg-white border border-gray-200 rounded-xl" />
                <input required value={addressForm.pincode} onChange={(event) => setAddressForm({ ...addressForm, pincode: event.target.value })} placeholder="Pincode" className="px-4 py-3 bg-white border border-gray-200 rounded-xl" />
                <input value={addressForm.landmark} onChange={(event) => setAddressForm({ ...addressForm, landmark: event.target.value })} placeholder="Landmark (optional)" className="px-4 py-3 bg-white border border-gray-200 rounded-xl" />
              </div>
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input type="checkbox" checked={addressForm.isDefault} onChange={(event) => setAddressForm({ ...addressForm, isDefault: event.target.checked })} />
                Set as default address
              </label>
              <button type="submit" className="btn-primary px-5 py-3 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Save Address
              </button>
            </motion.form>

            <motion.div className="space-y-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              {addresses.length === 0 ? (
                <div className="glass rounded-3xl p-8 border border-emerald-100 text-center">
                  <MapPin className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No saved addresses</h3>
                  <p className="text-gray-600">Add an address here and it will appear in checkout.</p>
                </div>
              ) : addresses.map((address) => (
                <div key={address.id} className="glass rounded-3xl p-6 border border-emerald-100">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="font-semibold text-gray-800">{address.name}</p>
                      <p className="text-sm text-gray-600">{address.phone}</p>
                    </div>
                    {address.isDefault && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">Default</span>}
                  </div>
                  <p className="text-gray-700 text-sm mb-4">
                    {address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}, {address.city}, {address.state} - {address.pincode}
                    {address.landmark ? `, Landmark: ${address.landmark}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setDefaultAddress(address.id)} className="px-4 py-2 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50">Use in checkout</button>
                    <button type="button" onClick={() => updateAddress(address.id, { ...address, name: `${address.name} (edited)` })} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">Edit</button>
                    <button type="button" onClick={() => removeAddress(address.id)} className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-4 h-4" />Remove</button>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        )}

        {tab === 'orders' && (
          <motion.div className="glass rounded-3xl p-8 border border-emerald-100" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <h2 className="text-2xl font-bold text-gray-800">Order History</h2>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 text-gray-700">
              Orders are shown from checkout once you place them. Add one from checkout to see the history here.
            </div>
            <div className="mt-6 space-y-4">
              {defaultAddress && (
                <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-1">Default address on file</p>
                  <p className="text-sm text-gray-600">{defaultAddress.addressLine1}, {defaultAddress.city}, {defaultAddress.state} - {defaultAddress.pincode}</p>
                </div>
              )}
              {orders.length > 0 ? orders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-emerald-100 bg-white p-4">
                  <p className="font-semibold text-gray-800 mb-1">{order.id}</p>
                  <p className="text-sm text-gray-600 mb-2">{order.items.length} item(s) • {order.status}</p>
                  <p className="text-sm text-gray-500">{order.date}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-gray-500">
                  Your completed orders will appear here after checkout.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ProfileView;