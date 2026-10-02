import Skeleton from '@/components/ui/Skeleton'

export default function CampusLoading() {
  return (
    <div role="status" aria-label="Cargando">
      <Skeleton className="mb-3 h-9 w-72" />
      <Skeleton className="mb-8 h-4 w-96 max-w-full" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
      </div>
      <Skeleton className="mt-6 h-64" />
    </div>
  )
}
