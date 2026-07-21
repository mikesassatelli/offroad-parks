/**
 * Renders a JSON-LD structured-data script tag for SEO / rich results.
 *
 * Server component — the `data` object is serialized to JSON and injected as
 * the body of a `<script type="application/ld+json">` tag. Callers build the
 * schema.org object (e.g. TouristAttraction) and pass it in.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
