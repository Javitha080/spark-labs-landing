import React, { useEffect } from 'react';
import { getCSPPolicy } from './security';
import { initAntiDebug, destroyAntiDebug, setAdminBypass } from './antiDebug';

/**
 * Security middleware component that applies security headers and protections
 * to the React application
 */
export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Apply security headers via meta tags
    const metaTags = [
      {
        httpEquiv: 'Content-Security-Policy',
        content: getCSPPolicy()
      },
      {
        name: 'referrer',
        content: 'strict-origin-when-cross-origin'
      }
    ];

    metaTags.forEach(tagProps => {
      const existingTag = document.querySelector(
        `meta[${tagProps.httpEquiv ? 'http-equiv' : 'name'}="${tagProps.httpEquiv || tagProps.name}"]`
      );

      if (!existingTag) {
        const metaTag = document.createElement('meta');
        if (tagProps.httpEquiv) {
          metaTag.setAttribute('http-equiv', tagProps.httpEquiv);
        } else if (tagProps.name) {
          metaTag.setAttribute('name', tagProps.name);
        }
        metaTag.setAttribute('content', tagProps.content);
        document.head.appendChild(metaTag);
      }
    });

    // Initialize anti-debugging protections (production only, skipped for admins)
    initAntiDebug();

    return () => {
      destroyAntiDebug();
    };
  }, []);

  return <>{children}</>;
};

/** Call this from RoleContext or auth logic to set/clear admin bypass */
export { setAdminBypass };

export default SecurityProvider;