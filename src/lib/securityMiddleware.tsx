import React, { useEffect } from 'react';
import { getCSPPolicy } from './security';

/**
 * Security middleware component that applies security headers and protections
 * to the React application
 */
export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Apply security headers via meta tags
    const metaTags = [
      // Content Security Policy
      {
        httpEquiv: 'Content-Security-Policy',
        content: getCSPPolicy()
      },
      // Prevent MIME type sniffing
      {
        httpEquiv: 'X-Content-Type-Options',
        content: 'nosniff'
      },
      // Clickjacking protection
      {
        httpEquiv: 'X-Frame-Options',
        content: 'DENY'
      },
      // XSS protection
      {
        httpEquiv: 'X-XSS-Protection',
        content: '1; mode=block'
      },
      // Referrer policy
      {
        name: 'referrer',
        content: 'strict-origin-when-cross-origin'
      },
      // Permissions policy
      {
        httpEquiv: 'Permissions-Policy',
        content: 'camera=(), microphone=(), geolocation=(self)'
      }
    ];

    // Add meta tags to document head
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
  }, []);

  return <>{children}</>;
};

export default SecurityProvider;