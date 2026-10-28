import { Link } from "react-router"
import { paths } from "@/lib/paths"

const LABS = [
  ["explorer", "Stage 1-2 explorer (fixtures, async lab, typed lab)"],
  ["effects", "4.x effects demos"],
  ["rules", "4.1 rules of hooks"],
  ["refs", "4.5 refs"],
  ["countdown", "4.6 countdown lab"],
  ["memo", "4.8 memo lab"],
  ["closures", "4.9 stale closures"],
  ["bugs", "4.10 five broken effects"],
  ["keys", "3.5 index keys bug"],
] as const

export default function DevIndexRoute() {
  return (
    <div className="p-4">
      <h1 className="mb-2 text-xl font-medium">Dev labs</h1>
      <ul className="list-disc pl-5">
        {LABS.map(([path, label]) => (
          <li key={path}>
            <Link className="underline" to={paths.dev(path)}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
