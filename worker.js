// Cloudflare Worker - LetsNews Proxy (NAVER API HUB)
// Supports:
//   ?feed=https://www.yna.co.kr/rss/politics.xml   → RSS proxy
//   ?naver=정치&display=10&sort=date             → Naver News Search (API HUB)
//
// Set secrets in Cloudflare dashboard or wrangler:
//   wrangler secret put NAVER_CLIENT_ID
//   wrangler secret put NAVER_CLIENT_SECRET
//
// Deploy: wrangler deploy
// Then set WORKER_URL in the frontend.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const feed = url.searchParams.get('feed');
    const naver = url.searchParams.get('naver');
    const display = url.searchParams.get('display') || '10';
    const sort = url.searchParams.get('sort') || 'date';
    const start = url.searchParams.get('start') || '1';

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=300',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // RSS proxy
      if (feed) {
        const res = await fetch(feed, {
          headers: { 'User-Agent': 'LetsNews/1.0 (+https://pyw31337.github.io/news)' }
        });
        const text = await res.text();
        return new Response(text, {
          headers: { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8' }
        });
      }

      // Naver News Search (NAVER API HUB)
      if (naver) {
        const clientId = env.NAVER_CLIENT_ID;
        const clientSecret = env.NAVER_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          return new Response(JSON.stringify({
            error: 'NAVER_CLIENT_ID and NAVER_CLIENT_SECRET not set in Worker secrets'
          }), {
            status: 501,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // New API HUB endpoint
        const naverUrl = new URL('https://naverapihub.apigw.ntruss.com/search/v1/news');
        naverUrl.searchParams.set('query', naver);
        naverUrl.searchParams.set('display', display);
        naverUrl.searchParams.set('start', start);
        naverUrl.searchParams.set('sort', sort);
        naverUrl.searchParams.set('format', 'json');

        const res = await fetch(naverUrl.toString(), {
          headers: {
            'X-NCP-APIGW-API-KEY-ID': clientId,
            'X-NCP-APIGW-API-KEY': clientSecret,
            'User-Agent': 'LetsNews/1.0'
          }
        });

        const data = await res.text();
        return new Response(data, {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
        });
      }

      return new Response(JSON.stringify({
        error: 'Use ?feed=RSS_URL or ?naver=검색어&display=10&sort=date'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
