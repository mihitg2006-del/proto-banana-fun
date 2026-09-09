import type { ProductCategory } from "@/lib/lm/types";

export interface CategoryResult {
  category: ProductCategory;
  /** 0-100 */
  confidence: number;
  matched: string[];
  verificationRequired: boolean;
}

const KEYWORDS: Array<{ category: ProductCategory; words: string[] }> = [
  {
    category: "BEVERAGE",
    words: [
      "juice", "drink", "beverage", "soda", "cola", "water", "nectar", "sharbat",
      "tea", "coffee", "milkshake", "lassi", "syrup",
    ],
  },
  {
    category: "FOOD",
    words: [
      "biscuit", "cookie", "namkeen", "chips", "snack", "atta", "flour", "rice",
      "dal", "pulses", "masala", "spice", "chocolate", "candy", "noodle", "pasta",
      "ghee", "oil", "sugar", "salt", "jam", "pickle", "wafer", "mix", "food",
      "edible", "cereal", "bread", "paneer", "butter",
    ],
  },
  {
    category: "COSMETIC",
    words: [
      "shampoo", "cream", "soap", "lotion", "conditioner", "face wash", "facewash",
      "moisturiser", "moisturizer", "perfume", "deodorant", "talc", "gel",
      "toothpaste", "cosmetic", "serum", "oil for hair", "hair oil",
    ],
  },
  {
    category: "ELECTRONIC",
    words: [
      "charger", "adapter", "battery", "led", "bulb", "cable", "earphone",
      "headphone", "speaker", "power bank", "appliance", "watt", "voltage",
      "electronic",
    ],
  },
  {
    category: "GARMENT",
    words: [
      "shirt", "t-shirt", "tshirt", "trouser", "jeans", "saree", "kurta", "garment",
      "apparel", "size m", "size l", "size xl", "cotton", "fabric",
    ],
  },
];

/**
 * Lightweight keyword classifier over the product name + OCR text.
 * Deterministic and fully local — no model, no network.
 */
export function detectCategory(productName: string | null, ocrText: string): CategoryResult {
  const haystack = `${productName ?? ""}\n${ocrText}`.toLowerCase();
  const name = (productName ?? "").toLowerCase();

  let best: { category: ProductCategory; score: number; matched: string[] } | null = null;

  for (const group of KEYWORDS) {
    const matched = group.words.filter((w) => haystack.includes(w));
    if (!matched.length) continue;
    // Hits inside the product name weigh more than hits anywhere in the label text.
    const nameHits = matched.filter((w) => name.includes(w)).length;
    const score = matched.length + nameHits * 2;
    if (!best || score > best.score) best = { category: group.category, score, matched };
  }

  if (!best) {
    const looksPackaged = /(net\s*(qty|quantity|wt|weight)|m\.?r\.?p|manufactur|packed)/i.test(ocrText);
    if (looksPackaged) {
      return {
        category: "GENERAL_PACKAGED_COMMODITY",
        confidence: 45,
        matched: [],
        verificationRequired: true,
      };
    }
    return { category: "UNKNOWN", confidence: 0, matched: [], verificationRequired: true };
  }

  const confidence = Math.min(95, 45 + best.score * 12);
  if (confidence < 55) {
    return {
      category: "GENERAL_PACKAGED_COMMODITY",
      confidence,
      matched: best.matched,
      verificationRequired: true,
    };
  }

  return {
    category: best.category,
    confidence,
    matched: best.matched,
    verificationRequired: confidence < 70,
  };
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  FOOD: "Food",
  BEVERAGE: "Beverage",
  COSMETIC: "Cosmetic",
  ELECTRONIC: "Electronic",
  GARMENT: "Garment",
  GENERAL_PACKAGED_COMMODITY: "General packaged commodity",
  UNKNOWN: "Unknown",
};
