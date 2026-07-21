export default async (req, res) => {
  console.log('[DelhiveryProxy] req.url:', req.url);
  console.log('[DelhiveryProxy] req.method:', req.method);
  console.log('[DelhiveryProxy] req.headers:', JSON.stringify(req.headers));

  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  let subPath = pathname.replace(/^\/api\/delhivery\//, '');
  if (subPath === pathname) {
    subPath = pathname.replace(/^\/api\/delhivery/, '');
  }
  subPath = subPath.replace(/^\/+/, '');
  const targetUrl = `https://track.delhivery.com/${subPath}${url.search}`;
  console.log('[DelhiveryProxy] targetUrl:', targetUrl);

  const headers = {};
  if (req.headers.authorization) {
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
      headers['Content-Type'] = req.headers['content-type']
        || (rawBody.startsWith('{') ? 'application/json' : 'application/x-www-form-urlencoded');
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const responseBody = await response.text();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.status(response.status).send(responseBody);
  } catch (error) {
    console.error('[DelhiveryProxy] Fetch error:', error.message);
    res.status(500).json({ error: 'Delhivery proxy error', message: error.message, url: targetUrl });
  }
};
