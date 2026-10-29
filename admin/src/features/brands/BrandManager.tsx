import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createBrand,
  deleteBrand,
  listBrands,
  updateBrand,
} from "@/features/categories/api"
import type { Brand } from "@/features/products/types"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { isApiError } from "@/lib/api/errors"
import { qk } from "@/lib/queryKeys"

export function BrandManager() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const q = useDebouncedValue(search.trim(), 250) || undefined
  const { data, error, isPending, refetch } = useQuery({
    queryKey: qk.brands.admin(q),
    queryFn: () => listBrands(q),
  })
  const [editing, setEditing] = useState<Brand | "new" | null>(null)
  const [deleting, setDeleting] = useState<Brand | null>(null)
  const done = () =>
    queryClient.invalidateQueries({ queryKey: qk.brands.all() })

  const remove = useMutation({
    mutationFn: (b: Brand) => deleteBrand(b._id),
    onSuccess: () => toast.success("Brand deleted"),
    onError: (e) => toast.error(e.message), // BRAND_IN_USE says how many products use it
    onSettled: done,
  })

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Brands</h1>
        <Button onClick={() => setEditing("new")}>New brand</Button>
      </div>
      <Input
        type="search"
        aria-label="Search brands"
        placeholder="Search brands"
        className="w-64"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isPending ? <p>Loading...</p> : null}
      {error ? (
        <div role="alert">
          {error.message}{" "}
          <Button size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      {data ? (
        <Table>
          <caption className="sr-only">Brands</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No brands.
                </TableCell>
              </TableRow>
            ) : (
              data.map((b) => (
                <TableRow key={b._id}>
                  <TableCell>{b.name}</TableCell>
                  <TableCell>{b.slug}</TableCell>
                  <TableCell>{b.productCount}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setEditing(b)}
                    >
                      Rename
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setDeleting(b)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      ) : null}

      {editing ? (
        <BrandDialog
          key={editing === "new" ? "new" : editing._id}
          brand={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void done()
          }}
        />
      ) : null}

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.productCount
                ? `${deleting.productCount} products still use this brand: the server will refuse.`
                : "This brand has no products."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) remove.mutate(deleting)
                setDeleting(null)
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

function BrandDialog({
  brand,
  onClose,
  onSaved,
}: {
  brand: Brand | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(brand?.name ?? "")
  const [error, setError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () =>
      brand ? updateBrand(brand._id, { name }) : createBrand({ name }),
    onSuccess: () => {
      toast.success(brand ? "Brand saved" : "Brand created")
      onSaved()
    },
    onError: (e) =>
      setError(isApiError(e) ? (e.fieldErrors.name ?? e.message) : e.message),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{brand ? "Rename brand" : "New brand"}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            if (!name.trim()) return setError("Name is required")
            save.mutate()
          }}
        >
          {brand ? (
            <p className="text-sm text-muted-foreground">
              Renaming also renames the brand on its {brand.productCount}{" "}
              products.
            </p>
          ) : null}
          <Label htmlFor="brand-name">Name</Label>
          <Input
            id="brand-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!error}
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
