import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fullnesscampinternacional.com";

export default function robots(): MetadataRoute.Robots {
  if (process.env.MAINTENANCE_MODE === "true") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/carrito", "/checkout", "/pago", "/campus", "/demo", "/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
