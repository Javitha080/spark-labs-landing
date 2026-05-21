import React, { useEffect } from 'react';

/**
 * Security middleware component that applies security protections
 * to the React application.
 *
 * NOTE: CSP headers are set server-side by the Cloudflare Worker (src/worker/index.ts).
 * We no longer inject a duplicate CSP <meta> tag here — it caused Lighthouse to flag
 * "CSP defined in a <meta> tag" and added unnecessary main-thread DOM work.
 */
export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const referrerTag = document.querySelector('meta[name="referrer"]');
    if (!referrerTag) {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'referrer');
      meta.setAttribute('content', 'strict-origin-when-cross-origin');
      document.head.appendChild(meta);
    }
  }, []);

  return <>{children}</>;
};

export default SecurityProvider;