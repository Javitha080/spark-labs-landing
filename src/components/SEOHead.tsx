import { Helmet } from "react-helmet-async";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, MAX_TITLE_LENGTH, type SEOProps } from "@/lib/seo";

interface ExtendedSEOProps extends SEOProps {
  /** One or more JSON-LD structured data objects to inject */
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

/** Ensures any title rendered stays within search-result limits (~60 chars). */
function clampTitle(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length <= MAX_TITLE_LENGTH) return trimmed;
  const sliced = trimmed.slice(0, MAX_TITLE_LENGTH - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const head = lastSpace > MAX_TITLE_LENGTH * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${head}…`;
}

export default function SEOHead({ title, description, path, ogImage, ogType = "website", article, noindex, structuredData }: ExtendedSEOProps) {
  const url = `${SITE_URL}${path}`;
  const image = ogImage || DEFAULT_OG_IMAGE;
  const safeTitle = clampTitle(title);

  // Normalize to array
  const jsonLdItems = structuredData
    ? Array.isArray(structuredData) ? structuredData : [structuredData]
    : [];

  return (
    <Helmet>
      <title>{safeTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Article-specific */}
      {article?.publishedTime && <meta property="article:published_time" content={article.publishedTime} />}
      {article?.author && <meta property="article:author" content={article.author} />}
      {article?.tags?.map(tag => <meta key={tag} property="article:tag" content={tag} />)}

      {/* Structured Data (JSON-LD) */}
      {jsonLdItems.map((item, i) => (
        <script key={`ld-${(item as Record<string, unknown>)['@type']}`} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}
