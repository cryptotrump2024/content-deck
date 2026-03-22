// TweetDeck Server — Express-like HTTP server with Twitter API proxy
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 9997;
const DATA_FILE = path.join(__dirname, 'data', 'tweets.json');
const SUPABASE_CONFIG_FILE = path.join(__dirname, 'supabase-config.json');

// Load Supabase config from file or env
function getSupabaseConfig() {
  let url = process.env.SUPABASE_URL || '';
  let key = process.env.SUPABASE_ANON_KEY || '';
  if (fs.existsSync(SUPABASE_CONFIG_FILE)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(SUPABASE_CONFIG_FILE, 'utf8'));
      url = cfg.url || url;
      key = cfg.key || key;
    } catch(e) {}
  }
  return { url: url.trim(), key: key.trim() };
}

// Map a tweet object to Supabase table columns
function tweetToRow(tw) {
  return {
    id: tw.id,
    platform: tw.platform || 'twitter',
    text: tw.text || '',
    linkedin_text: tw.linkedinText || null,
    status: tw.status || 'sent',
    topics: tw.topics || [],
    hashtags: tw.hashtags || [],
    linkedin_hashtags: tw.linkedinHashtags || [],
    linkedin_topic: tw.linkedinTopic || null,
    image_path: tw.imagePath || null,
    source_url: tw.sourceUrl || null,
    notes: tw.notes || null,
    created_at: tw.createdAt || new Date().toISOString(),
    sent_at: tw.sentAt || null,
    archived_at: tw.archivedAt || tw.sentAt || new Date().toISOString(),
    metadata: tw
  };
}

// Push one or more rows to Supabase (upsert)
async function supabasePush(rows) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase not configured');
  const endpoint = `${url}/rest/v1/archived_posts`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows])
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Supabase error ${resp.status}: ${text}`);
  }
  return resp;
}

// Twitter API credentials (Using Bearer Token for now)
const TWITTER_API = {
  // For OAuth 2.0 Client Credentials Flow (currently having issues)
  clientId: 'ZWR3cTVGTmhjTHYtbWw2VVJBbUI6MTpjaQ',
  clientSecret: 'qfV8zyz476tnNyw3X8PKbWGxd1rXIhN0aVCUKitwJxt9jyuwCK',
  authEndpoint: 'https://api.twitter.com/2/oauth2/token',
  
  // For App-Only Authentication (Bearer Token) - USING THIS FOR NOW
  bearerToken: process.env.TWITTER_BEARER_TOKEN || 'AAAAAAAAAAAAAAAAAAAAAMd28QEAAAAA9CdrEJC%2F0QRWpMGJYTA%2B%2Bz%2Bp1kg%3Dc84kY1ySllDtgZaoWmXJirZEiSXZwvizrrJtpM2OH1GPSeFbj9',
  apiEndpoint: 'https://api.twitter.com/2',
  accessToken: null,
  tokenExpiresAt: null
};

// Image Generation via Gemini 3 Pro
async function generateTweetImage(tweetText, topic) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.log('⚠ GEMINI_API_KEY not set. Skipping image generation.');
    return null;
  }

  try {
    const imagePrompt = `Create a professional, minimalist Bitcoin-themed infographic for: "${tweetText}"\nTopic: ${topic || 'Bitcoin'}\nStyle: Deep black background (#0f0f0f), orange accents (#F7931A), clean and modern, no text overlays, 1024x1024px.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: imagePrompt }] }],
        generationConfig: { responseMimeType: 'image/png' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`✗ Image gen error: ${response.status}`);
      return null;
    }

    const imageBuffer = await response.buffer();
    const dir = path.join(__dirname, 'data', 'images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const imagePath = path.join(dir, `${Date.now()}_${topic || 'tweet'}.png`);
    fs.writeFileSync(imagePath, imageBuffer);
    console.log(`✓ Image generated: ${path.relative(__dirname, imagePath)} (${imageBuffer.length} bytes)`);
    return imagePath;
  } catch (error) {
    console.log(`✗ Image generation failed: ${error.message}`);
    return null;
  }
}

// Token Getter - Using Bearer Token (simpler than OAuth 2.0)
async function getAccessToken() {
  // Return Bearer Token directly (no expiration for app-only auth)
  if (TWITTER_API.bearerToken) {
    console.log(`✓ Using Bearer Token for authentication`);
    return TWITTER_API.bearerToken;
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);
  
  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // ============ API ROUTES (checked first) ============

  // API: Test Twitter connection
  if (pathname === '/api/twitter/test') {
    console.log('✓ API route matched: /api/twitter/test');
    try {
      const token = await getAccessToken();
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'error', 
          message: 'Failed to obtain OAuth 2.0 token'
        }));
        return;
      }
      
      console.log(`  Fetching: ${TWITTER_API.apiEndpoint}/tweets/search/recent`);
      const response = await fetch(`${TWITTER_API.apiEndpoint}/tweets/search/recent?query=bitcoin&max_results=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`  Response status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`  Success! User: ${data.data.username}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'success', 
          message: 'Twitter API Connected',
          user: data.data 
        }));
      } else {
        console.log(`  Error response: ${response.status}`);
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        const text = await response.text();
        res.end(JSON.stringify({ 
          status: 'error', 
          message: `Twitter API Error: ${response.status}`,
          details: text
        }));
      }
    } catch (error) {
      console.log(`  Exception: ${error.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'error', 
        message: 'Connection failed',
        error: error.message
      }));
    }
    console.log('  Handler complete, returning');
    return;
  }

  // API: Upload media to Twitter (v1.1 media upload)
  if (pathname === '/api/twitter/upload-media' && req.method === 'POST') {
    let bodyChunks = [];
    req.on('data', chunk => bodyChunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = Buffer.concat(bodyChunks);
        const payload = JSON.parse(body.toString());
        const imagePath = payload.imagePath;
        
        if (!imagePath || !fs.existsSync(imagePath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Image not found: ' + imagePath }));
          return;
        }
        
        const imageData = fs.readFileSync(imagePath);
        const base64Data = imageData.toString('base64');
        const ext = path.extname(imagePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
        
        // Twitter v1.1 media/upload uses Bearer token
        const token = await getAccessToken();
        if (!token) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'No auth token' }));
          return;
        }
        
        // Build multipart form for v1.1 media upload
        const boundary = '----ContentDeck' + Date.now();
        const parts = [];
        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="media_data"\r\n\r\n${base64Data}\r\n`);
        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="media_category"\r\n\r\ntweet_image\r\n`);
        parts.push(`--${boundary}--\r\n`);
        const multipartBody = parts.join('');
        
        console.log(`  Uploading image: ${path.basename(imagePath)} (${imageData.length} bytes)`);
        
        const uploadResp = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
          },
          body: multipartBody
        });
        
        if (uploadResp.ok) {
          const uploadData = await uploadResp.json();
          console.log(`  Media uploaded: media_id=${uploadData.media_id_string}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', media_id: uploadData.media_id_string }));
        } else {
          const errText = await uploadResp.text();
          console.log(`  Media upload failed: ${uploadResp.status} ${errText}`);
          res.writeHead(uploadResp.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: `Media upload failed: ${uploadResp.status}`, details: errText }));
        }
      } catch (error) {
        console.log(`  Media upload error: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: error.message }));
      }
    });
    return;
  }

  // API: Post tweet to Twitter (with optional media)
  if (pathname === '/api/twitter/post' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Failed to obtain token' }));
          return;
        }
        
        const payload = JSON.parse(body);
        const tweetBody = { text: payload.text };
        
        // Attach media if media_ids provided
        if (payload.media_ids && payload.media_ids.length > 0) {
          tweetBody.media = { media_ids: payload.media_ids };
          console.log(`  Posting tweet with ${payload.media_ids.length} media attachment(s)`);
        }
        
        const response = await fetch(`${TWITTER_API.apiEndpoint}/tweets`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(tweetBody)
        });
        
        if (response.ok) {
          const data = await response.json();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', tweetId: data.data.id }));
        } else {
          res.writeHead(response.status, { 'Content-Type': 'application/json' });
          const errText = await response.text();
          res.end(JSON.stringify({ 
            status: 'error', 
            message: `Failed to post: ${response.status}`,
            details: errText
          }));
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: error.message }));
      }
    });
    return;
  }

  // API: Generate image for tweet
  if (pathname === '/api/generate-image' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { text, topic } = JSON.parse(body);
        if (!text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing tweet text' }));
          return;
        }
        
        const imagePath = await generateTweetImage(text, topic);
        if (imagePath) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', imagePath }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Image generation failed' }));
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: error.message }));
      }
    });
    return;
  }

  // API: Get tweets (with optional platform filter)
  if (pathname === '/api/tweets' && req.method === 'GET') {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      const platform = parsedUrl.query.platform;
      
      if (platform && platform !== 'all') {
        data.active_tweets = (data.active_tweets || []).filter(t => (t.platform || 'twitter') === platform);
        data.sent_tweets = (data.sent_tweets || []).filter(t => (t.platform || 'twitter') === platform);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  
  // API: Get stats (cross-platform)
  if (pathname === '/api/stats' && req.method === 'GET') {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      const active = data.active_tweets || [];
      const sent = data.sent_tweets || [];
      
      const stats = {
        twitter: {
          active: active.filter(t => (t.platform || 'twitter') === 'twitter').length,
          draft: active.filter(t => (t.platform || 'twitter') === 'twitter' && t.status === 'draft').length,
          ready: active.filter(t => (t.platform || 'twitter') === 'twitter' && t.status === 'ready').length,
          archived: sent.filter(t => (t.platform || 'twitter') === 'twitter').length
        },
        linkedin: {
          active: active.filter(t => t.platform === 'linkedin').length,
          draft: active.filter(t => t.platform === 'linkedin' && t.status === 'draft').length,
          ready: active.filter(t => t.platform === 'linkedin' && t.status === 'ready').length,
          archived: sent.filter(t => t.platform === 'linkedin').length
        },
        total: { active: active.length, archived: sent.length }
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // API: Save tweets
  if (pathname === '/api/tweets' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        fs.writeFileSync(DATA_FILE, body, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'saved' }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // API: Fetch article metadata from URL
  if (pathname === '/api/fetch-article' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { url } = JSON.parse(body);
        if (!url || !url.startsWith('http')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid URL' }));
          return;
        }
        const pageRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentDeck/1.0)' },
          signal: AbortSignal.timeout(8000)
        });
        const html = await pageRes.text();
        // Extract title from <title> or og:title
        let title = '';
        const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
        if (ogMatch) title = ogMatch[1];
        if (!title) {
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) title = titleMatch[1];
        }
        title = title.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
        // Extract description
        let desc = '';
        const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,})/i)
          || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{10,})/i);
        if (descMatch) desc = descMatch[1].slice(0, 200);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ title: title || '', description: desc || '', url }));
      } catch(e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ title: '', description: '', error: e.message }));
      }
    });
    return;
  }

  // ============ SUPABASE ENDPOINTS ============

  // Save Supabase config
  if (pathname === '/api/supabase/save-config' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { url, key } = JSON.parse(body);
        fs.writeFileSync(SUPABASE_CONFIG_FILE, JSON.stringify({ url: url.trim(), key: key.trim() }, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'saved' }));
      } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: e.message }));
      }
    });
    return;
  }

  // Get Supabase status
  if (pathname === '/api/supabase/status' && req.method === 'GET') {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: false, count: 0, lastSync: null, message: 'Not configured' }));
      return;
    }
    try {
      const resp = await fetch(`${url}/rest/v1/archived_posts?select=id&order=archived_at.desc&limit=1`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Prefer': 'count=exact' }
      });
      if (resp.ok) {
        const countHeader = resp.headers.get('content-range');
        const count = countHeader ? parseInt(countHeader.split('/')[1]) || 0 : 0;
        const data = await resp.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ connected: true, count, lastSync: data[0]?.archived_at || null }));
      } else {
        const text = await resp.text();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ connected: false, count: 0, lastSync: null, message: `${resp.status}: ${text}` }));
      }
    } catch(e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: false, count: 0, lastSync: null, message: e.message }));
    }
    return;
  }

  // Push single item to Supabase
  if (pathname === '/api/supabase/push-item' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const item = JSON.parse(body);
        await supabasePush(tweetToRow(item));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: e.message }));
      }
    });
    return;
  }

  // Sync all archives to Supabase
  if (pathname === '/api/supabase/sync-archive' && req.method === 'POST') {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      const sent = data.sent_tweets || [];
      if (sent.length === 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', synced: 0 }));
        return;
      }
      const rows = sent.map(tweetToRow);
      // Batch in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        await supabasePush(rows.slice(i, i + chunkSize));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', synced: rows.length }));
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: e.message }));
    }
    return;
  }

  // ============ STATIC FILES (checked after API) ============

  console.log('→ Serving as static file');
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);
  
  console.log(`  filePath: ${filePath}`);
  console.log(`  startsWith check: ${filePath.startsWith(__dirname)}`);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    console.log('✗ BLOCKED: Path traversal attempt');
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
      };
      
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      res.end(content);
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TweetDeck server running at http://localhost:${PORT}`);
});
