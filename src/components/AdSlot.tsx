import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Manually-placed AdSense unit. The loader script lives in index.html.
 * Guard on data-adsbygoogle-status so a remount never double-pushes the
 * same <ins> (AdSense throws on that).
 */
/** Flip to re-enable ads (also restore the adsbygoogle loader in index.html). */
const ADS_ENABLED = false;

export default function AdSlot({ slot }: { slot: string }) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!ADS_ENABLED) return;
    const ins = ref.current;
    if (!ins || ins.dataset.adsbygoogleStatus === 'done') return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // loader blocked or absent — leave the slot empty
    }
  }, []);

  if (!ADS_ENABLED) return null;

  return (
    <div className="ad-slot">
      <span className="ad-slot-label">Advertisement</span>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-1303389657186007"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
