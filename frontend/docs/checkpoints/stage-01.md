# Stage 1 checkpoint: model answers

1. **`reduce` on an empty array without an initial value?** It throws `TypeError: Reduce of empty array with no initial value`. For an empty cart the totals function would crash the page; passing `0` as the initial value returns `0` and an empty cart renders as a valid zero total.
2. **Why is `sort()` on a prop array a bug, and two fixes?** `sort` mutates in place, so it changes the parent's array (props/state must be treated as read-only) and, since the reference is unchanged, React may not re-render the owner. Fixes: `props.items.toSorted(cmp)` or `[...props.items].sort(cmp)`.
3. **Why does `fetch("/missing")` not throw?** `fetch` only rejects on network-level failure; any HTTP response, including 404/500, resolves. Make it throw with `if (!response.ok) throw new HttpError(response.status, ...)`.
4. **`||` vs `??`?** `||` falls back for every falsy value (`0`, `""`, `NaN`), `??` only for `null`/`undefined`. `product.price || 99` turns a legitimate price of `0` into 99; `product.price ?? 99` keeps `0` and only defaults when the price is missing.
5. **Why compute cart totals, never store them?** Totals are a pure function of lines, coupon and rules. Storing them creates a second source of truth that can go stale or disagree (change a quantity, forget to update the total). Derive on render (or memoise); keep only the lines in state.
