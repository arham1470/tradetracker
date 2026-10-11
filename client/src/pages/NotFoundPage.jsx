import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-neutral-500 ring-1 ring-border">
        <Compass size={26} />
      </div>
      <div>
        <p className="text-lg font-semibold text-white">Page not found</p>
        <p className="mt-1 text-sm text-neutral-500">The page you are looking for does not exist.</p>
      </div>
      <Link to="/" className="btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}