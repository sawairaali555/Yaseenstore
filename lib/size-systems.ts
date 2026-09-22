export interface SizeSystem {
  id: string;
  name: string;
  category: string;
  description: string;
  sizes: string[];
}

export const SIZE_SYSTEMS: SizeSystem[] = [
  {
    id: "eu",
    name: "EU",
    category: "Footwear / European",
    description: "European standard shoe sizing (33 – 48)",
    sizes: [
      "33", "33.5", "34", "34.5", "35", "35.5", "36", "36.5",
      "37", "37.5", "38", "38.5", "39", "39.5", "40", "40.5",
      "41", "41.5", "42", "42.5", "43", "43.5", "44", "44.5",
      "45", "45.5", "46", "46.5", "47", "47.5", "48"
    ],
  },
  {
    id: "uk",
    name: "UK",
    category: "Footwear / British",
    description: "UK standard shoe sizing (1 – 13)",
    sizes: [
      "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5",
      "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5",
      "9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5", "13"
    ],
  },
  {
    id: "us",
    name: "US",
    category: "Footwear / American",
    description: "US standard shoe sizing (4 – 14)",
    sizes: [
      "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5",
      "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5",
      "12", "12.5", "13", "13.5", "14"
    ],
  },
  {
    id: "international",
    name: "International",
    category: "Apparel / Alpha",
    description: "Alpha standard clothing sizes (XXS – 6XL)",
    sizes: [
      "XXS", "XS", "S", "M", "L", "XL",
      "2XL", "3XL", "4XL", "5XL", "6XL",
      "Free Size", "One Size", "Plus Size"
    ],
  },
  {
    id: "clothing",
    name: "Clothing",
    category: "Standard Apparel",
    description: "Standard clothing sizes (XS – 4XL, Free Size)",
    sizes: [
      "XS", "S", "M", "L", "XL", "XXL",
      "3XL", "4XL", "Free Size", "One Size"
    ],
  },
  {
    id: "full_look",
    name: "Full Look",
    category: "Pants / Waist / Sets",
    description: "Waist, length, and trousers sizing (26 – 48)",
    sizes: [
      "26", "27", "28", "29", "30", "31", "32", "33",
      "34", "35", "36", "37", "38", "40", "42", "44",
      "46", "48", "28/30", "30/30", "30/32", "32/30", "32/32", "34/32", "36/32"
    ],
  },
  {
    id: "suit_only",
    name: "Suit Only",
    category: "Formal / Tailoring",
    description: "Chest & jacket drop sizing (Short, Regular, Long)",
    sizes: [
      "34R", "36R", "38R", "40R", "42R", "44R", "46R", "48R", "50R",
      "34S", "36S", "38S", "40S", "42S", "44S",
      "38L", "40L", "42L", "44L", "46L"
    ],
  },
  {
    id: "collar",
    name: "Collar",
    category: "Formal Shirts",
    description: "Shirt collar neck size in inches (14 – 20)",
    sizes: [
      "14", "14.5", "15", "15.5", "16", "16.5",
      "17", "17.5", "18", "18.5", "19", "19.5", "20"
    ],
  },
  {
    id: "other",
    name: "Custom / Other",
    category: "Kids, Babies & Custom",
    description: "Custom sizes, kids, infant age sizes and specialty options",
    sizes: [
      "Standard", "Free Size", "One Size", "Custom",
      "0-3M", "3-6M", "6-9M", "9-12M", "12-18M", "18-24M",
      "1-2Y", "2-3Y", "3-4Y", "4-5Y", "5-6Y", "7-8Y", "9-10Y", "11-12Y", "13-14Y"
    ],
  },
];

/**
 * Detect which size system a list of sizes belongs to most strongly
 */
export function detectSizeSystem(selectedSizes: string[]): string {
  if (!selectedSizes || selectedSizes.length === 0) return "eu";

  let bestSystem = "eu";
  let maxMatches = -1;

  for (const system of SIZE_SYSTEMS) {
    const matches = selectedSizes.filter((s) => system.sizes.includes(s)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestSystem = system.id;
    }
  }

  // If nothing matched, default to EU or Other
  return maxMatches > 0 ? bestSystem : "eu";
}

/**
 * Get recommended size systems based on product category / subcategory
 */
export function getRecommendedSizeSystems(categoryName?: string, subcategoryName?: string): {
  defaultSystemId: string;
  recommendedIds: string[];
} {
  const text = `${categoryName || ""} ${subcategoryName || ""}`.toLowerCase();

  if (text.match(/shoe|footwear|sneaker|heel|sandal|boot|slippers|loafer/)) {
    return { defaultSystemId: "eu", recommendedIds: ["eu", "uk", "us"] };
  }

  if (text.match(/suit|blazer|coat|tuxedo|tailor/)) {
    return { defaultSystemId: "suit_only", recommendedIds: ["suit_only", "collar", "clothing"] };
  }

  if (text.match(/shirt|kurta|formal/)) {
    return { defaultSystemId: "collar", recommendedIds: ["collar", "clothing", "international"] };
  }

  if (text.match(/trouser|pant|jeans|bottom|waist|shorts/)) {
    return { defaultSystemId: "full_look", recommendedIds: ["full_look", "clothing", "international"] };
  }

  if (text.match(/clothing|apparel|dress|wear|top|t-shirt|hoodie|jacket|sweater|fashion/)) {
    return { defaultSystemId: "clothing", recommendedIds: ["clothing", "international", "full_look"] };
  }

  if (text.match(/kid|baby|infant|child/)) {
    return { defaultSystemId: "other", recommendedIds: ["other", "clothing"] };
  }

  return { defaultSystemId: "clothing", recommendedIds: ["clothing", "international", "eu", "other"] };
}

/**
 * Check if changing from one system to another has conflicting/unmatched sizes
 */
export function getConflictingSizes(selectedSizes: string[], targetSystemId: string): string[] {
  const targetSystem = SIZE_SYSTEMS.find((s) => s.id === targetSystemId);
  if (!targetSystem) return [];
  return selectedSizes.filter((s) => !targetSystem.sizes.includes(s));
}
