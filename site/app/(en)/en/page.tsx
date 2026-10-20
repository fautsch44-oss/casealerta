import { Home, homeMeta } from '@/lib/routes';
export const metadata = homeMeta('en');
export default function Page() { return <Home lang="en" />; }
