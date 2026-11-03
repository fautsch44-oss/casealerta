import { llmsFullTxt } from '@/lib/llms';
export const dynamic = 'force-static';
export function GET() {
  return new Response(llmsFullTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=86400' } });
}
