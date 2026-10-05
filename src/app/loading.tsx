import Skeleton from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <main role="status" aria-label="Cargando" className="mx-auto max-w-[1280px] px-6 pt-32">
      <Skeleton className="mb-4 h-12 w-2/3 max-w-xl" />
      <Skeleton className="mb-10 h-5 w-96 max-w-full" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
      </div>
    </main>
  )
}
