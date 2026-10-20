import { Bulletin, bulletinMeta } from '@/lib/routes';
export const revalidate = 3600;
export const metadata = bulletinMeta('en');
export default function Page() { return <Bulletin lang="en" />; }
