// Category tree + per-category brand/product vocab used by the seeder.
export interface CatSeed {
  name: string
  image: string
  children: LeafSeed[]
}
export interface LeafSeed {
  name: string
  brands: string[]
  nouns: string[]
  priceRange: [number, number]
  specKeys: string[]
}

export const CATALOG: CatSeed[] = [
  {
    name: "Electronics",
    image: "electronics",
    children: [
      {
        name: "Mobiles",
        brands: ["Apple", "Samsung", "OnePlus", "Xiaomi", "Realme", "Google"],
        nouns: ["Smartphone 5G", "Pro Max", "Ultra", "Lite", "Neo"],
        priceRange: [7999, 129999],
        specKeys: ["RAM", "Storage", "Display", "Battery", "Camera"],
      },
      {
        name: "Laptops",
        brands: ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer"],
        nouns: ["Laptop", "Ultrabook", "Gaming Laptop", "Notebook"],
        priceRange: [29999, 199999],
        specKeys: ["Processor", "RAM", "Storage", "Display", "Weight"],
      },
      {
        name: "Headphones & Audio",
        brands: ["Sony", "JBL", "boAt", "Bose", "Sennheiser", "Noise"],
        nouns: [
          "Wireless Headphones",
          "Earbuds",
          "Soundbar",
          "Bluetooth Speaker",
          "Neckband",
        ],
        priceRange: [799, 29999],
        specKeys: ["Type", "Battery Life", "Connectivity", "Noise Cancellation"],
      },
      {
        name: "Smartwatches",
        brands: ["Apple", "Samsung", "Noise", "Fire-Boltt", "Garmin", "Amazfit"],
        nouns: ["Smartwatch", "Fitness Band", "Sports Watch"],
        priceRange: [1299, 69999],
        specKeys: ["Display", "Battery Life", "Water Resistance", "Sensors"],
      },
    ],
  },
  {
    name: "Fashion",
    image: "fashion",
    children: [
      {
        name: "Men's Clothing",
        brands: ["Levi's", "H&M", "Allen Solly", "Puma", "Peter England", "U.S. Polo"],
        nouns: ["Slim Fit Shirt", "Denim Jeans", "Polo T-Shirt", "Hoodie", "Chinos"],
        priceRange: [399, 5999],
        specKeys: ["Fit", "Fabric", "Pattern", "Care"],
      },
      {
        name: "Women's Clothing",
        brands: ["Biba", "W", "Zara", "H&M", "Global Desi", "Libas"],
        nouns: ["Kurta Set", "Maxi Dress", "Palazzo", "Top", "Saree"],
        priceRange: [399, 8999],
        specKeys: ["Fabric", "Pattern", "Occasion", "Care"],
      },
      {
        name: "Footwear",
        brands: ["Nike", "Adidas", "Puma", "Skechers", "Bata", "Crocs"],
        nouns: ["Running Shoes", "Sneakers", "Sandals", "Formal Shoes", "Slides"],
        priceRange: [599, 14999],
        specKeys: ["Sole", "Closure", "Material", "Occasion"],
      },
    ],
  },
  {
    name: "Home & Kitchen",
    image: "home",
    children: [
      {
        name: "Kitchen Appliances",
        brands: [
          "Philips",
          "Prestige",
          "Bajaj",
          "Morphy Richards",
          "Havells",
          "Butterfly",
        ],
        nouns: [
          "Air Fryer",
          "Mixer Grinder",
          "Electric Kettle",
          "Induction Cooktop",
          "Toaster",
        ],
        priceRange: [699, 15999],
        specKeys: ["Power", "Capacity", "Warranty", "Material"],
      },
      {
        name: "Furniture",
        brands: [
          "Wakefit",
          "Nilkamal",
          "Godrej Interio",
          "IKEA",
          "Durian",
          "Urban Ladder",
        ],
        nouns: ["Office Chair", "Study Table", "Bookshelf", "Sofa Set", "Bed"],
        priceRange: [1999, 59999],
        specKeys: ["Material", "Dimensions", "Assembly", "Warranty"],
      },
    ],
  },
  {
    name: "Beauty & Personal Care",
    image: "beauty",
    children: [
      {
        name: "Skincare",
        brands: [
          "Cetaphil",
          "Minimalist",
          "Lakmé",
          "Nivea",
          "The Ordinary",
          "Neutrogena",
        ],
        nouns: [
          "Face Serum",
          "Moisturiser",
          "Sunscreen SPF 50",
          "Face Wash",
          "Night Cream",
        ],
        priceRange: [149, 2999],
        specKeys: ["Skin Type", "Volume", "Key Ingredient"],
      },
      {
        name: "Grooming",
        brands: ["Philips", "Braun", "Gillette", "Beardo", "Park Avenue", "Wahl"],
        nouns: ["Trimmer", "Electric Shaver", "Beard Oil", "Hair Dryer"],
        priceRange: [199, 7999],
        specKeys: ["Type", "Battery", "Warranty"],
      },
    ],
  },
  {
    name: "Books",
    image: "books",
    children: [
      {
        name: "Fiction",
        brands: ["Penguin", "HarperCollins", "Bloomsbury", "Hachette", "Rupa"],
        nouns: ["Novel", "Thriller", "Fantasy Saga", "Classic Edition"],
        priceRange: [149, 899],
        specKeys: ["Language", "Pages", "Publisher", "Binding"],
      },
      {
        name: "Technology & Programming",
        brands: ["O'Reilly", "Manning", "Pragmatic", "Packt", "Apress"],
        nouns: ["Handbook", "Cookbook", "Complete Guide", "In Action"],
        priceRange: [399, 2999],
        specKeys: ["Language", "Pages", "Publisher", "Edition"],
      },
    ],
  },
  {
    name: "Sports & Fitness",
    image: "sports",
    children: [
      {
        name: "Gym & Fitness",
        brands: ["Decathlon", "Boldfit", "Cosco", "Nivia", "Fitkit", "Lifelong"],
        nouns: [
          "Dumbbell Set",
          "Yoga Mat",
          "Resistance Bands",
          "Treadmill",
          "Protein Shaker",
        ],
        priceRange: [299, 39999],
        specKeys: ["Material", "Weight", "Warranty"],
      },
    ],
  },
]
