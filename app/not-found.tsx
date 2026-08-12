export const metadata = { title: "Page not found | Arc Trips", robots: { index: false, follow: true } };

/**
 * The site itself lives in public/prototype and is served as static HTML, so
 * this only catches URLs Next handles directly. It must never dead-end: the
 * prototype home is the one route that always exists.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">We could not find that page</h1>
      <p className="text-lg">The link may be out of date, or the page may not be published yet.</p>
      <p>
        <a href="/">Back to Arc Trips</a>
      </p>
    </main>
  );
}
