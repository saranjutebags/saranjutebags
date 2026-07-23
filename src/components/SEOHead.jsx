import { Helmet } from 'react-helmet-async';

const DEFAULT_TITLE = 'Jute Bags Manufacturer India | Saran Jute Bags Hyderabad & Telangana';
const DEFAULT_DESCRIPTION = 'Leading Jute Bags Manufacturer & Wholesale Supplier in India, Hyderabad, Telangana & Vijayawada. Custom printed eco-friendly jute bags, corporate gift bags, tote bags, lunch bags & promotional reusable bags at factory price.';
const DEFAULT_KEYWORDS = 'Jute Bags Manufacturer India, Jute Bags Manufacturers Hyderabad, Jute Bags Company Hyderabad, Jute Bags Company Telangana, Jute Bags Company Vijayawada, Wholesale Jute Bags, Bulk Jute Bags, Eco-Friendly Bags, Reusable Shopping Bags, Custom Printed Jute Bags, Corporate Gift Bags, Promotional Jute Bags, Grocery Bags, Lunch Bags, Tote Bags';
const SITE_URL = import.meta.env.VITE_WEBSITE_URL || 'https://saranjutebags.in';
const DEFAULT_IMAGE = `${SITE_URL}/logo.webp`;

const SEOHead = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_IMAGE,
  schema = null,
}) => {
  const fullTitle = title ? `${title} | Saran Jute Bags` : DEFAULT_TITLE;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : SITE_URL;

  // Global Organization & LocalBusiness JSON-LD schema
  const defaultOrganizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#organization`,
    'name': 'Saran Jute Bags',
    'legalName': 'Saran Jute Bags Manufacturers India',
    'url': SITE_URL,
    'logo': `${SITE_URL}/logo.webp`,
    'image': DEFAULT_IMAGE,
    'description': DEFAULT_DESCRIPTION,
    'telephone': import.meta.env.VITE_PHONE_NUMBER || '+91-XXXXXXXXXX',
    'email': import.meta.env.VITE_SUPPORT_EMAIL || 'support@saranjutebags.in',
    'priceRange': '₹₹',
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': import.meta.env.VITE_STREET_ADDRESS || 'Mehdipatnam',
      'addressLocality': 'Hyderabad',
      'addressRegion': 'Telangana',
      'postalCode': '500028',
      'addressCountry': 'IN',
    },
    'geo': {
      '@type': 'GeoCoordinates',
      'latitude': '17.392',
      'longitude': '78.441',
    },
    'areaServed': ['India', 'Hyderabad', 'Mehdipatnam', 'Telangana', 'Vijayawada', 'Andhra Pradesh'],
    'sameAs': [
      SITE_URL,
    ],
  };

  const schemasToRender = schema
    ? Array.isArray(schema) ? [defaultOrganizationSchema, ...schema] : [defaultOrganizationSchema, schema]
    : [defaultOrganizationSchema];

  return (
    <Helmet>
      {/* Title & Basics */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Saran Jute Bags" />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonicalUrl} />

      {/* Google Site Verification */}
      <meta name="google-site-verification" content="google50a69331a6cf6c9d.html" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="Saran Jute Bags" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Theme & Mobile */}
      <meta name="theme-color" content="#059669" />

      {/* JSON-LD Structured Data */}
      {schemasToRender.map((s, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEOHead;
