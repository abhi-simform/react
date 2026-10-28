# Stage 6 checkpoint: model answers

**1. The five states of an async view and how to test each in the browser.**
Initial loading (nothing yet: skeleton with the final layout, `aria-busy`), refreshing (old data stays visible while a reload runs, small "Updating..." note), success (data), empty (success with zero results: say why and offer an action), error (reason plus a retry, `role="alert"`); plus partial (one section fails, the others render). In the browser: throttle or delay `fetch` for loading and refreshing (DevTools Network throttling, or wrap `window.fetch` with a delay and call `reload`), a filter that matches nothing (`?brand=Nope`) for empty, stop the backend or block the request for error, DevTools Offline (or dispatching `offline`) for the banner, and `/?failRail=top` for a partial failure. Success is the default.

**2. What happens, request by request, when I click the heart twice quickly?**
First click: `toggle` sees no request pending for that product id (ref guard), adds the id to the shared Set (all hearts and the header count update at once), marks it pending and sends `POST /wishlist` with `{ productId }`. Second click, same tick or while that request runs: the guard sees the id is pending and returns, so NO second request is sent (decision: ignore, not queue, not last-write-wins). When the response arrives the pending flag clears; a later click sends `DELETE /wishlist/:id` (204). If the POST had failed, the id is removed again and a toast explains. Even if two requests did reach the server, both endpoints are idempotent (unique index + upsert, delete-by-key) so the end state would still be consistent.

**3. Why convert API data into view models?**
One boundary where the backend's shape is translated into what the UI needs: formatted money (`Intl`), discount percent, relative dates, stock note, image fallback, "no ratings yet". Components stay dumb and testable (pass a VM, assert the output), formatting and locale/currency are decided in one place (needed for i18n), and a backend rename is fixed in one mapper instead of in twenty components.

**4. What does a 409 usually mean in ShopSphere, and how should the UI react compared to a 422?**
409 = the request was well-formed but conflicts with current state (email already taken, address limit reached, later: item went out of stock, coupon already used). The user can often fix it by changing something or refreshing state: show a specific message, maybe reload the data. 422 = the input itself is invalid: map `error.details[].path` to the form fields and show the message beside each field, keep the dialog open. 409 is about the world, 422 is about the input.

**5. Pagination vs infinite scroll: three trade-offs each.**
Pagination: URL-addressable and shareable, predictable position (Back works, you can jump to page 7), footer reachable and good for SEO; but each page is a click and a context switch, and it feels slower on mobile feeds. Infinite scroll: continuous, low-friction browsing; but it breaks Back/position restore unless you store pages, the footer is unreachable (so offer a button), screen-reader and keyboard flow suffer, and the DOM grows without bound (virtualization needed). "Load more" button is the hybrid: control plus continuity.

**6. Five things my hand-written fetching cannot do that I want from a library.**
Share and de-duplicate identical requests between components; cache and serve stale data instantly while revalidating (card to PDP, Back); refetch on window focus/reconnect; automatic retry with backoff; invalidate related data after a mutation (and optimistic updates with built-in rollback/context); infinite query helpers; devtools to see all of it. (Pain journal has 22 concrete moments.)
