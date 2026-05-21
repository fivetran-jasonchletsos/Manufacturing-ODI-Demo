import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div className="font-display text-6xl text-graphite-900 mb-3">404</div>
      <div className="font-mono text-xs uppercase tracking-[0.16em] text-graphite-500 mb-6">Page not found</div>
      <p className="text-graphite-700 mb-6">The route you requested isn't in this demo. Head back to the plant floor.</p>
      <Link to="/" className="inline-block bg-safety text-graphite-900 px-5 py-2 font-mono text-xs font-bold uppercase tracking-wider border-2 border-safety hover:bg-safety-bright">
        ← Back to Home
      </Link>
    </div>
  );
}
