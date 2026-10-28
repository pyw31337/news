// Cloudflare Worker example for proxying Korean news RSS / APIs
// Deploy: wrangler deploy or via Cloudflare dashboard
// Usage: https://your-worker.workers.dev/?feed=https://www.yna.co.kr/rss/politics.xml

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const feed = url.searchParams.get('feed');
    const naverQuery = url.searchParams.get('naver');

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (feed) {
        // RSS proxy
        const res = await fetch(feed, {
          headers: { 'User-Agent': 'LetsNews/1.0' }
        });
        const text = await res.text();
        return new Response(text, {
          headers: { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8' }
        });
      }

      if (naverQuery) {
        // Placeholder for Naver API (add your Client ID/Secret as env vars)
        // const clientId = env.NAVER_CLIENT_ID;
        // const clientSecret = env.NAVER_CLIENT_SECRET;
        return new Response(JSON.stringify({ error: 'Set NAVER_CLIENT_ID and NAVER_CLIENT_SECRET in Worker secrets' }), {
          status: 501,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Provide ?feed=URL or ?naver=query' }), {
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
