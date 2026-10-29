import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { NativeSelect } from "@/components/native-select"
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isApiError } from "@/lib/api/errors"
import { qk } from "@/lib/queryKeys"
import type { Category } from "@/features/products/types"
import * as api from "./api"

type Node = Category & { children: Node[] }

function buildTree(flat: Category[]): Node[] {
  const byId = new Map(
    flat.map((c) => [c._id, { ...c, children: [] as Node[] }])
  )
  const roots: Node[] = []
  for (const n of byId.values()) {
    const parent = n.parent ? byId.get(n.parent) : undefined
    if (parent) parent.children.push(n)
    else roots.push(n)
  }
  return roots
}

const descendantIds = (n: Node): string[] =>
  n.children.flatMap((c) => [c._id, ...descendantIds(c)])

type Editing =
  | { mode: "create"; parentId: string | null }
  | { mode: "edit"; node: Node }
  | null

export function CategoryManager() {
  const queryClient = useQueryClient()
  const { data, error, isPending, refetch } = useQuery({
    queryKey: qk.categories.admin(),
    queryFn: api.listCategoriesFlat,
  })
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<Node | null>(null)
  const tree = useMemo(() => buildTree(data ?? []), [data])

  // The public tree/brand caches and the product list's category filter all read this data.
  const done = () =>
    queryClient.invalidateQueries({ queryKey: qk.categories.all() })
  const fail = (e: Error) => toast.error(e.message)

  const reorder = useMutation({
    mutationFn: ({
      parentId,
      ids,
    }: {
      parentId: string | null
      ids: string[]
    }) => api.reorderCategories(parentId, ids),
    // Optimistic: the list reorders at once, the server answer replaces it.
    onSuccess: (list) => queryClient.setQueryData(qk.categories.admin(), list),
    onError: fail,
    onSettled: done,
  })
  const remove = useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: () => toast.success("Category deleted"),
    onError: fail,
    onSettled: done,
  })
  const toggle = useMutation({
    mutationFn: (n: Node) =>
      api.updateCategory(n._id, { isActive: !n.isActive }),
    onError: fail,
    onSettled: done,
  })

  function move(siblings: Node[], index: number, delta: -1 | 1) {
    const ids = siblings.map((s) => s._id)
    const [a, b] = [ids[index], ids[index + delta]]
    if (!a || !b) return
    ids[index] = b
    ids[index + delta] = a
    reorder.mutate({ parentId: siblings[0]?.parent ?? null, ids })
  }

  function renderLevel(nodes: Node[]) {
    return (
      <ul className="flex flex-col gap-1 pl-5">
        {nodes.map((n, i) => (
          <li key={n._id}>
            <div className="flex flex-wrap items-center gap-2 py-1">
              <span
                className={
                  n.isActive ? "" : "text-muted-foreground line-through"
                }
              >
                {n.name}
              </span>
              <Badge variant="secondary">{n.productCount} products</Badge>
              {!n.isActive ? <Badge variant="outline">hidden</Badge> : null}
              <Button
                size="xs"
                variant="outline"
                aria-label={`Move ${n.name} up`}
                disabled={i === 0}
                onClick={() => move(nodes, i, -1)}
              >
                Up
              </Button>
              <Button
                size="xs"
                variant="outline"
                aria-label={`Move ${n.name} down`}
                disabled={i === nodes.length - 1}
                onClick={() => move(nodes, i, 1)}
              >
                Down
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setEditing({ mode: "edit", node: n })}
              >
                Edit / move
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setEditing({ mode: "create", parentId: n._id })}
              >
                Add child
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => toggle.mutate(n)}
              >
                {n.isActive ? "Hide" : "Show"}
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setDeleting(n)}
              >
                Delete
              </Button>
            </div>
            {n.children.length ? renderLevel(n.children) : null}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Categories</h1>
        <Button onClick={() => setEditing({ mode: "create", parentId: null })}>
          New category
        </Button>
      </div>
      {isPending ? <p>Loading...</p> : null}
      {error ? (
        <div role="alert">
          {error.message}{" "}
          <Button size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      {data ? renderLevel(tree) : null}

      {editing ? (
        <CategoryDialog
          key={
            editing.mode === "edit"
              ? editing.node._id
              : `new-${editing.parentId}`
          }
          editing={editing}
          flat={data ?? []}
          tree={tree}
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
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Only an empty category can be deleted: the server refuses while it
              still has sub-categories or products ({deleting?.productCount}{" "}
              products directly in it).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) remove.mutate(deleting._id)
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

function CategoryDialog({
  editing,
  flat,
  tree,
  onClose,
  onSaved,
}: {
  editing: NonNullable<Editing>
  flat: Category[]
  tree: Node[]
  onClose: () => void
  onSaved: () => void
}) {
  const node = editing.mode === "edit" ? editing.node : null
  const [name, setName] = useState(node?.name ?? "")
  const [parentId, setParentId] = useState<string>(
    node
      ? (node.parent ?? "")
      : ((editing as { parentId: string | null }).parentId ?? "")
  )
  const [error, setError] = useState<{
    name?: string
    parentId?: string
    form?: string
  }>({})

  // A category cannot move under itself or its own descendants (the server refuses too).
  const blocked = new Set(
    node ? [node._id, ...descendantIds(findNode(tree, node._id) ?? node)] : []
  )
  const options = flat.filter((c) => !blocked.has(c._id))

  const save = useMutation({
    mutationFn: () =>
      node
        ? api.updateCategory(node._id, { name, parentId: parentId || null })
        : api.createCategory({ name, parentId: parentId || null }),
    onSuccess: () => {
      toast.success(node ? "Category saved" : "Category created")
      onSaved()
    },
    onError: (err) => {
      const f = isApiError(err) ? err.fieldErrors : {}
      setError({
        name: f.name,
        parentId: f.parentId,
        form: Object.keys(f).length ? undefined : err.message,
      })
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {node ? `Edit ${node.name}` : "New category"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setError({})
            if (!name.trim()) return setError({ name: "Name is required" })
            save.mutate()
          }}
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!error.name}
            />
            {error.name ? (
              <p role="alert" className="text-sm text-destructive">
                {error.name}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="cat-parent">Parent</Label>
            <NativeSelect
              id="cat-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">(top level)</option>
              {options.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
            {error.parentId ? (
              <p role="alert" className="text-sm text-destructive">
                {error.parentId}
              </p>
            ) : null}
          </div>
          {error.form ? (
            <p role="alert" className="text-sm text-destructive">
              {error.form}
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

function findNode(nodes: Node[], id: string): Node | undefined {
  for (const n of nodes) {
    if (n._id === id) return n
    const hit = findNode(n.children, id)
    if (hit) return hit
  }
  return undefined
}
