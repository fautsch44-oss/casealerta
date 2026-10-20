import { NewsIndex, newsIndexMeta } from '@/lib/routes';
export const metadata = newsIndexMeta('en');
export default function Page() { return <NewsIndex lang="en" />; }
