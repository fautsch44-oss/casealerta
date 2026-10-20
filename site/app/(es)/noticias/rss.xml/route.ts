import { rss } from '@/components/News';
export const dynamic = 'force-static';
export function GET() { return new Response(rss('es'), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } }); }
