export default function Loading() {
  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="h-10 w-80 rounded-md bg-accent/50 animate-pulse" />
      </div>
      <div className="flex flex-col gap-2 items-start">
        <div className="h-6 w-48 rounded bg-muted animate-pulse" />
        <div className="h-40 w-full max-w-3xl rounded border animate-pulse" />
      </div>
      <div>
        <div className="h-6 w-40 rounded bg-muted animate-pulse mb-4" />
        <div className="h-24 w-full max-w-2xl rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
