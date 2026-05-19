import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="px-4 py-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="mb-6 flex gap-4 border-b border-border">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
