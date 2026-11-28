'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// No-op until NEXT_PUBLIC_META_PIXEL_ID is set. PageView on each navigation. Lead is fired from AuthForm with a shared event_id.
export const META_PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID || '').trim();

type Fbq = (...args: unknown[]) => void;

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function trackMeta(name: 'PageView' | 'Lead', eventId?: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined' || !META_PIXEL_ID) return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (!fbq) return;
  const id = eventId || randomId();
  try {
    fbq('track', name, params, { eventID: id });
  } catch {
    /* the pixel must never break the page */
  }
}

export function MetaPixel() {
  const pathname = usePathname();
  useEffect(() => {
    trackMeta('PageView');
  }, [pathname]);

  if (!META_PIXEL_ID) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('set','autoConfig',false,'${META_PIXEL_ID}');fbq('init','${META_PIXEL_ID}');`}
    </Script>
  );
}
