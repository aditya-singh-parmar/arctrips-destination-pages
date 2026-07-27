/**
 * Emits structured data into the server-rendered HTML.
 * The `<` escape stops a stray `</script>` inside content from closing the
 * tag early, which would break the page rather than just the markup.
 */
export function JsonLd({ data }: { data: object | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
