export default async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const subPath = url.pathname.replace(/^\/api\/delhivery\//, '');
  const targetUrl = `https://track.delhivery.com/${subPath}${url.search}`;

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
    res.status(500).json({ error: 'Delhivery proxy error', message: error.message });
  }
};
