// 8.1: passing `children` (composition) instead of prop drilling, no Context needed.
import { useState } from "react"

type Product = { name: string; price: string }

// ---- DRILLING: Page -> Layout -> Sidebar -> BuyBoxDrilled. `Layout` and `Sidebar` never
// use `product`; they only carry it. Adding a field means editing all four signatures.
function BuyBoxDrilled({ product }: { product: Product }) {
  return (
    <p>
      {product.name}: {product.price}
    </p>
  )
}
function SidebarDrilled({ product }: { product: Product }) {
  return (
    <aside className="border p-2">
      <BuyBoxDrilled product={product} />
    </aside>
  )
}
function LayoutDrilled({ product }: { product: Product }) {
  return (
    <div className="grid gap-2">
      <SidebarDrilled product={product} />
    </div>
  )
}

// ---- COMPOSITION: Page builds <BuyBox product/> itself and hands it down as `children`
// (or a slot prop). Layout and Sidebar know nothing about products, so they are reusable
// and never re-render because `product` changed (the element is created in Page).
function BuyBox({ product }: { product: Product }) {
  return (
    <p>
      {product.name}: {product.price}
    </p>
  )
}
function Sidebar({ children }: { children: React.ReactNode }) {
  return <aside className="border p-2">{children}</aside>
}
function Layout({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2">{children}</div>
}

export function ChildrenDemo() {
  const [product, setProduct] = useState<Product>({
    name: "Phone",
    price: "Rs 999",
  })
  return (
    <section className="grid gap-3">
      <button
        className="w-fit border p-1"
        onClick={() =>
          setProduct((p) => ({
            ...p,
            price: `Rs ${Math.ceil(Math.random() * 999)}`,
          }))
        }
      >
        Change price
      </button>
      <div>
        <h2 className="font-medium">Drilled (4 signatures carry `product`)</h2>
        <LayoutDrilled product={product} />
      </div>
      <div>
        <h2 className="font-medium">Composed (only Page and BuyBox know it)</h2>
        <Layout>
          <Sidebar>
            <BuyBox product={product} />
          </Sidebar>
        </Layout>
      </div>
    </section>
  )
}
