module.exports = async (req, res) => {
  // Allow cross-origin requests (needed when Hostinger frontend calls this Vercel API)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log('[DelhiveryProxy] req.url:', req.url);
  console.log('[DelhiveryProxy] req.method:', req.method);

  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  let subPath = pathname.replace(/^\/api\/delhivery\//, '');
  if (subPath === pathname) {
    subPath = pathname.replace(/^\/api\/delhivery/, '');
  }
  subPath = subPath.replace(/^\/+/, '');
  const targetUrl = `https://track.delhivery.com/${subPath}${url.search}`;
  console.log('[DelhiveryProxy] targetUrl:', targetUrl);

  // Prefer the server-side env var (set in Vercel dashboard as DELHIVERY_API_KEY).
  // This keeps the key out of the browser JS bundle and works regardless of whether
  // VITE_DELHIVERY_API_KEY is available at build time.
  const serverKey =
    process.env.DELHIVERY_API_KEY ||
    process.env.VITE_DELHIVERY_API_KEY ||
    '';

  const headers = {};
  if (serverKey) {
    // Server-side key takes priority — always correct in production
    headers['Authorization'] = `Token ${serverKey}`;
  } else if (req.headers.authorization) {
    // Fallback: forward whatever the client sent (useful in local dev via Vite proxy)
    headers['Authorization'] = req.headers.authorization;
  }

  const fetchOptions = { method: req.method, headers };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf-8');
    if (rawBody) {
      fetchOptions.body = rawBody;
      headers['Content-Type'] =
        req.headers['content-type'] ||
        (rawBody.startsWith('{') ? 'application/json' : 'application/x-www-form-urlencoded');
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const responseBody = await response.text();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.status(response.status).send(responseBody);
  } catch (error) {
    console.error('[DelhiveryProxy] Fetch error:', error.message, error.stack);
    res.status(500).json({ error: 'Delhivery proxy error', message: error.message, url: targetUrl });
  }
};
