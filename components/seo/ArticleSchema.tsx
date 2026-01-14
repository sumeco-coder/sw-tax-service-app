import Script from "next/script";

type BreadcrumbItem = {
  name: string;
  url: string;
};

type ArticleSchemaProps = {
  title: string;
  description: string;
  url: string;
  publishedDate: string;
  modifiedDate?: string;
  authorName?: string;
  breadcrumbs: BreadcrumbItem[];
};

export function ArticleSchema({
  title,
  description,
  url,
  publishedDate,
  modifiedDate,
  authorName = "SW Tax Service",
  breadcrumbs,
}: ArticleSchemaProps) {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    author: {
      "@type": "Organization",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "SW Tax Service",
    },
    datePublished: publishedDate,
    dateModified: modifiedDate ?? publishedDate,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.url,
    })),
  };

  return (
    <>
      <Script
        id="article-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema),
        }}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
    </>
  );
}
