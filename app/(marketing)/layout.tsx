import { MarketingHeader } from '@/components/marketing/marketing-header';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { MarketingTransition } from '@/components/marketing/marketing-transition';
import { RevealObserver } from '@/components/marketing/reveal';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-marketing className="min-h-screen">
      <RevealObserver />
      <MarketingHeader />
      <MarketingTransition>{children}</MarketingTransition>
      <MarketingFooter />
    </div>
  );
}
