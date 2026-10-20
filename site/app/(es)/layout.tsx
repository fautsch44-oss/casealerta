import '../globals.css';
import { RootDoc } from '@/components/Shell';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootDoc lang="es">{children}</RootDoc>;
}
