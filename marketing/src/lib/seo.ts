// Central SEO constants + JSON-LD helpers for the marketing site.

export const SITE_URL = "https://refocus.co.in";
export const SITE_NAME = "Refocus";
export const ORG_EMAIL = "hello@refocus.co.in";

// Public social profiles for Organization.sameAs (knowledge-panel signal).
// Add/remove real profile URLs here as they go live.
export const SAME_AS: string[] = [];

// X/Twitter handle (with leading @) for twitter:site / twitter:creator.
// Leave empty to omit the tags.
export const TWITTER_HANDLE = "";

// Brand color used for <meta name="theme-color">.
export const THEME_COLOR = "#0b0b0f";

export const abs = (path: string) =>
  path.startsWith("http") ? path : new URL(path, SITE_URL).href;

/** Organization node reused across pages. */
export function organizationJsonLd() {
  const org: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: abs("/icon1.png"),
    email: ORG_EMAIL,
  };
  if (SAME_AS.length) org.sameAs = SAME_AS;
  return org;
}

/** Publisher node for article schema. */
export function publisherJsonLd() {
  return {
    "@type": "Organization",
    name: SITE_NAME,
    logo: { "@type": "ImageObject", url: abs("/icon1.png") },
  };
}

/**
 * BreadcrumbList JSON-LD from an ordered list of { name, path } items.
 * Paths may be relative ("/blog") or absolute.
 */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: abs(item.path),
    })),
  };
}

/**
 * Article JSON-LD for evergreen guide/landing pages. `path` and `image` may be
 * relative. `dateModified` should be an ISO date string.
 */
export function articleJsonLd(opts: {
  headline: string;
  description: string;
  path: string;
  dateModified: string;
  datePublished?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: abs(opts.path),
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: publisherJsonLd(),
    datePublished: opts.datePublished ?? opts.dateModified,
    dateModified: opts.dateModified,
    image: abs(opts.image ?? "/opengraph-image.png"),
  };
}

/**
 * FAQPage JSON-LD. Only use on pages that render the same Q&A visibly — the
 * text here must match what's on the page verbatim.
 */
export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
