import { StatusIndex, statusIndexMeta } from '@/lib/routes';
export const metadata = statusIndexMeta('en');
export default function Page() { return <StatusIndex lang="en" />; }
