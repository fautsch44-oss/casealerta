import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';
const bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'Googlebot'];
export default function robots(): MetadataRoute.Robots {
  return { rules: [...bots.map((b) => ({ userAgent: b, allow: '/' })), { userAgent: '*', allow: '/', disallow: ['/api/'] }], sitemap: 'https://casealerta.com/sitemap.xml' };
}
