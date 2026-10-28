import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { AsyncView } from "@/components/common/AsyncView"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth"
import { STALE } from "@/lib/query-client"
import { authKeys } from "@/lib/queryKeys"
import { toAsyncState } from "@/lib/queryState"
import { paths } from "@/lib/paths"

import { getSessions, logoutAllDevices, revokeSession } from "../security.api"

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))

/** "Active sessions" (10.7): one row per login (device), with revoke and "log out everywhere". */
export function SessionsList() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const sessions = toAsyncState(
    useQuery({
      queryKey: authKeys.sessions,
      queryFn: ({ signal }) => getSessions(signal),
      staleTime: STALE.none, // security data: always look again
    })
  )
  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      toast.success("That device was signed out.")
      return queryClient.invalidateQueries({ queryKey: authKeys.sessions })
    },
    onError: () => toast.error("Could not sign that device out."),
    meta: { silent: true },
  })
  const logoutAll = useMutation({
    mutationFn: logoutAllDevices,
    onSuccess: async () => {
      await logout() // the guard of this page sends us home
      navigate(paths.home())
      toast.success("Signed out of all devices.")
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <AsyncView
        state={sessions}
        loading={<Skeleton className="h-24 w-full" />}
      >
        {(list) => (
          <ul className="flex max-w-xl flex-col gap-2">
            {list.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {s.device}{" "}
                    {s.current && (
                      <span className="rounded bg-success-muted px-1 text-xs text-success">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    IP {s.ip ?? "unknown"} · signed in {when(s.startedAt)} ·
                    last active {when(s.lastActiveAt)}
                  </p>
                </div>
                {!s.current && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={revoke.isPending && revoke.variables === s.id}
                    onClick={() => revoke.mutate(s.id)}
                  >
                    Sign out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </AsyncView>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={logoutAll.isPending}
        onClick={() => logoutAll.mutate()}
      >
        Log out of all devices
      </Button>
    </div>
  )
}
