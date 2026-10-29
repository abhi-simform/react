import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import * as api from "@/features/marketing/api"
import { BannerDialog } from "@/features/marketing/BannerDialog"
import type { Banner } from "@/features/marketing/types"
import { requirePermission } from "@/lib/auth/guards"
import { formatDateTime } from "@/lib/format"
import { qk } from "@/lib/queryKeys"

const bannersOptions = () =>
  queryOptions({ queryKey: qk.marketing.banners(), queryFn: api.listBanners })

export const Route = createFileRoute("/_authed/banners")({
  staticData: { crumb: "Banners" },
  beforeLoad: ({ context }) =>
    requirePermission(context.user, "marketing:manage"),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(bannersOptions())
  },
  component: BannersPage,
})

function BannersPage() {
  const { data, error, refetch } = useQuery(bannersOptions())
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Banner | "new" | null>(null)
  const [removing, setRemoving] = useState<Banner | null>(null)
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: qk.marketing.banners() })
  const toggle = useMutation({
    mutationFn: (b: Banner) =>
      api.updateBanner(b._id, { isActive: !b.isActive }),
    onError: (e) => toast.error(e.message),
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: (b: Banner) => api.deleteBanner(b._id),
    onSuccess: () => toast.success("Banner deleted"),
    onError: (e) => toast.error(e.message),
    onSettled: refresh,
  })
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Home banners</h1>
        <Button onClick={() => setEditing("new")}>New banner</Button>
      </div>
      {error ? (
        <div role="alert">
          {error.message}{" "}
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      <Table>
        <caption className="sr-only">Banners</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Banner</TableHead>
            <TableHead>Placement</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Window (IST)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-6 text-center">
                No banners yet.
              </TableCell>
            </TableRow>
          ) : null}
          {data?.map((b) => (
            <TableRow key={b._id}>
              <TableCell className="flex items-center gap-2">
                <img
                  src={b.imageUrl}
                  alt=""
                  className="h-10 w-16 rounded object-cover"
                />
                <span>
                  {b.title}
                  <span className="block text-xs text-muted-foreground">
                    {b.linkUrl}
                  </span>
                </span>
              </TableCell>
              <TableCell>{b.placement}</TableCell>
              <TableCell>{b.sortOrder}</TableCell>
              <TableCell>
                {b.startsAt ? formatDateTime(b.startsAt) : "any time"}
                {" to "}
                {b.endsAt ? formatDateTime(b.endsAt) : "no end"}
              </TableCell>
              <TableCell>
                <Badge variant={b.isActive ? "default" : "secondary"}>
                  {b.isActive ? "on" : "off"}
                </Badge>
              </TableCell>
              <TableCell className="flex gap-1">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setEditing(b)}
                >
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate(b)}
                >
                  {b.isActive ? "Switch off" : "Switch on"}
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => setRemoving(b)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editing ? (
        <BannerDialog
          banner={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <AlertDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this banner?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.title} disappears from the home page. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) remove.mutate(removing)
                setRemoving(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
