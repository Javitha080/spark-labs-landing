/**
 * JSON-LD Structured Data generators for SEO.
 *
 * Each helper returns a plain object that can be serialised with
 * JSON.stringify and injected into a <script type="application/ld+json"> tag
 * via react-helmet-async.
 *
 * @see https://schema.org
 */

import { SITE_URL, SITE_NAME, SITE_SCHOOL_NAME, DEFAULT_OG_IMAGE, SOCIAL_PROFILES, SCHOOL_PROFILES } from "@/lib/seo";

/* ------------------------------------------------------------------ */
/*  Organization  (homepage)                                          */
/* ------------------------------------------------------------------ */

export interface OrganizationData {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  sameAs?: string[]; // social profile URLs
}

/**
 * Mirrors the static EducationalOrganization block in index.html - same
 * `@id`, so search engines that see both (bot prerender + hydrated client)
 * collapse them into one entity instead of indexing two conflicting orgs.
 */
export function organizationJsonLd(data?: OrganizationData) {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${SITE_URL}/#organization`,
    name: data?.name ?? SITE_NAME,
    alternateName: [
      "YICDVP",
      "Young Innovators Club",
      "Young Innovations Club",
      "Young Innovators' Club",
      "School Invention Club",
      "Inventions Club",
      "Innovation Club",
    ],
    url: data?.url ?? SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: data?.logo ?? DEFAULT_OG_IMAGE,
    },
    description:
      data?.description ??
      "Young Innovators Club at Dharmapala Vidyalaya - STEM, Robotics, IoT & Solar Energy education for students.",
    sameAs: data?.sameAs ?? SOCIAL_PROFILES,
    parentOrganization: {
      "@type": "School",
      "@id": `${SITE_URL}/#school`,
      name: SITE_SCHOOL_NAME,
      sameAs: SCHOOL_PROFILES,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  BlogPosting  (individual blog post)                               */
/* ------------------------------------------------------------------ */

export interface BlogPostingData {
  title: string;
  description: string;
  slug: string;
  authorName: string;
  publishedAt: string; // ISO-8601
  modifiedAt?: string;
  image?: string;
  tags?: string[];
}

export function blogPostingJsonLd(data: BlogPostingData) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: data.title,
    description: data.description,
    url: `${SITE_URL}/blog/${data.slug}`,
    datePublished: data.publishedAt,
    dateModified: data.modifiedAt ?? data.publishedAt,
    image: data.image ?? DEFAULT_OG_IMAGE,
    author: {
      "@type": "Person",
      name: data.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: DEFAULT_OG_IMAGE,
      },
    },
    keywords: data.tags?.join(", "),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${data.slug}`,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Course  (learning hub course detail)                              */
/* ------------------------------------------------------------------ */

export interface CourseData {
  name: string;
  description: string;
  slug: string;
  providerName?: string;
  image?: string;
}

export function courseJsonLd(data: CourseData) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: data.name,
    description: data.description,
    url: `${SITE_URL}/learning-hub/course/${data.slug}`,
    provider: {
      "@type": "Organization",
      name: data.providerName ?? SITE_NAME,
      sameAs: SITE_URL,
    },
    image: data.image,
  };
}

/* ------------------------------------------------------------------ */
/*  Event  (events page / individual event)                           */
/* ------------------------------------------------------------------ */

export interface EventData {
  name: string;
  description: string;
  startDate: string; // ISO-8601
  endDate?: string;
  location?: string;
  image?: string;
  url?: string;
}

export function eventJsonLd(data: EventData) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: data.name,
    description: data.description,
    startDate: data.startDate,
    endDate: data.endDate,
    url: data.url ?? `${SITE_URL}/events`,
    image: data.image,
    location: data.location
      ? {
          "@type": "Place",
          name: data.location,
        }
      : undefined,
    organizer: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  FAQPage  (FAQ section on homepage)                                */
/* ------------------------------------------------------------------ */

export interface FAQItem {
  question: string;
  answer: string;
}

export function faqPageJsonLd(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  WebSite  (sitelinks search box)                                   */
/* ------------------------------------------------------------------ */

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: "YICDVP",
    url: SITE_URL,
  };
}
