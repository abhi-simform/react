import { NotFoundError } from "@/lib/notFound"

import { POLICIES } from "./content"

/** One legal page, from the data in `content.ts`. An unknown slug is a real 404 (the nearest ErrorBoundary). */
export function PolicyPage({ slug }: { slug: string }) {
  const policy = Object.hasOwn(POLICIES, slug) ? POLICIES[slug] : undefined
  if (!policy) throw new NotFoundError("Policy", slug)
  return (
    <article className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-medium">{policy.title}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Last updated {policy.updated}
      </p>
      {policy.sections.map((section) => (
        <section key={section.heading} className="mb-4">
          <h2 className="mb-1 font-medium">{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="mb-2 text-sm">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  )
}
