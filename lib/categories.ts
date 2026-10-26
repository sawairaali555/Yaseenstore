export type CategoryNode = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  image: string;
  enabled: boolean;
  autoDisabled?: boolean;
  displayOrder: number;
  description: string;
  metaTitle?: string;
  metaKeywords?: string;
  metaDescription?: string;
  depth: number;
  children: CategoryNode[];
};

export const categorySeed: Record<string, string[]> = {
  Fashion: ['Shoes', 'Clothing', 'Traditional wear'],
  'Beauty & Care': ['Skincare', 'Haircare', 'Beauty tools'],
  'Home & Kitchen': ['Cookware', 'Storage', 'Home essentials'],
  Electronics: ['Audio', 'Wearables', 'Mobile accessories'],
  Accessories: ['Bags', 'Watches', 'Everyday accessories'],
  "Women's Clothing": ['Dresses', 'Tops & T-Shirts', 'Blouses & Shirts', 'Jeans & Pants', 'Skirts', 'Sweaters & Cardigans', 'Coats & Jackets', 'Two-Piece Sets', 'Activewear', 'Modest Clothing'],
  "Women's Curve Clothing": ['Plus Size Dresses', 'Plus Size Tops', 'Plus Size Pants', 'Plus Size Sets', 'Plus Size Activewear'],
  "Women's Shoes": ['Flats', 'Heels', 'Sandals', 'Sneakers', 'Boots', 'Slippers'],
  "Women's Lingerie & Loungewear": ['Bras', 'Shapewear', 'Panties', 'Lingerie Sets', 'Sports Bras', 'Bralettes', 'Camisoles & Slips', 'Sleepwear & Pajamas', 'Robes', 'Loungewear', 'Socks & Hosiery', 'Maternity & Nursing Bras'],
  "Men's Clothing": ['T-Shirts & Polos', "Men's Shirts", "Men's Jeans & Pants", "Men's Shorts", "Men's Sweaters", "Men's Coats & Jackets", "Men's Suits", "Men's Activewear", "Men's Traditional Wear"],
  "Men's Shoes": ["Men's Sneakers", "Men's Formal Shoes", "Men's Sandals", "Men's Boots", "Men's Slippers", "Men's Sports Shoes"],
  "Men's Big & Tall": ['Big & Tall T-Shirts', 'Big & Tall Shirts', 'Big & Tall Pants', 'Big & Tall Jackets'],
  "Men's Underwear & Sleepwear": ['Boxers', 'Briefs', 'Undershirts', "Men's Pajamas", "Men's Robes", "Men's Socks"],
  'Sports & Outdoors': ['Fitness Equipment', 'Yoga & Pilates', 'Cycling', 'Camping & Hiking', 'Fishing', 'Team Sports', 'Swimming', 'Outdoor Accessories'],
  'Jewelry & Accessories': ['Necklaces', 'Earrings', 'Rings', 'Bracelets', 'Jewelry Sets', 'Sunglasses', 'Hair Accessories', 'Belts', 'Scarves & Hats'],
  'Toys & Games': ['Educational Toys', 'Building Blocks', 'Dolls & Accessories', 'Remote Control Toys', 'Puzzles', 'Board Games', 'Outdoor Toys', 'Stuffed Animals'],
  Automotive: ['Car Interior Accessories', 'Car Exterior Accessories', 'Car Electronics', 'Car Cleaning & Care', 'Motorcycle Accessories', 'Automotive Tools'],
  "Kids' Fashion": ["Girls' Clothing", "Boys' Clothing", "Kids' Sets", "Kids' Sleepwear", "Kids' Accessories"],
  "Kids' Shoes": ["Girls' Shoes", "Boys' Shoes", "Kids' Sneakers", "Kids' Sandals", "Kids' Boots"],
  'Baby & Maternity': ['Baby Clothing', 'Baby Feeding', 'Diapering', 'Baby Bath & Care', 'Nursery', 'Strollers & Carriers', 'Maternity Clothing', 'Baby Safety'],
  'Bags & Luggage': ['Handbags', 'Backpacks', 'Crossbody Bags', 'Travel Luggage', 'Wallets & Cardholders', 'Travel Accessories'],
  'Patio, Lawn & Garden': ['Gardening Tools', 'Outdoor Furniture', 'Planters & Pots', 'Outdoor Lighting', 'Garden Decor', 'Watering & Irrigation'],
  'Arts, Crafts & Sewing': ['Sewing Supplies', 'Knitting & Crochet', 'Painting & Drawing', 'DIY Crafts', 'Beads & Jewelry Making', 'Scrapbooking'],
  'Business, Industry & Science': ['Office Equipment', 'Packaging Supplies', 'Industrial Tools', 'Safety Equipment', 'Laboratory Supplies'],
  'Tools & Home Improvement': ['Hand Tools', 'Power Tools', 'Hardware', 'Electrical Supplies', 'Plumbing', 'Home Security', 'Measuring Tools'],
  'Office & School Supplies': ['Stationery', 'Notebooks & Planners', 'Pens & Pencils', 'Desk Organization', 'School Bags', 'Art Supplies'],
  'Pet Supplies': ['Dog Supplies', 'Cat Supplies', 'Pet Feeding', 'Pet Toys', 'Pet Grooming', 'Pet Beds & Carriers', 'Aquarium Supplies'],
};
categorySeed['Beauty & Care'].push('Makeup', 'Fragrances', 'Nail Care', 'Bath & Body', 'Personal Care', 'Health Care Products');
categorySeed['Home & Kitchen'].push('Home Decor Products', 'Kitchen Utensils & Supplies', 'Kitchen Storage & Organization', 'Bedding', 'Home Storage & Organization', 'Seasonal Decor', 'Closet & Laundry Storage', 'Bath', 'Event & Party Supplies', 'Dining & Entertaining', 'Rugs & Mats', 'Couch & Sofa Decor', 'Window Treatments & Hardware', 'Lighting & Accessories', 'Cleaning Supplies', 'Bakeware', 'Towels & Shower Curtains', 'Kitchen & Table Linens');
categorySeed.Electronics.push('Headphones & Earbuds', 'Phones & Accessories', 'Computers & Tablets', 'Chargers & Cables', 'Smart Home Devices', 'Cameras & Photography', 'Gaming Accessories');

// Preserve existing category IDs and ordering; new departments follow the original five.
export const defaultCategories = Object.keys(categorySeed);

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'category';
}

export function buildDefaultCategoryTree(): CategoryNode[] {
  return defaultCategories.map((name, index) => {
    const parentId = slugify(name);
    return {
      id: parentId,
      parentId: null,
      name,
      slug: parentId,
      image: '',
      enabled: true,
      displayOrder: index,
      description: '',
      depth: 0,
      children: (categorySeed[name] || []).map((child, childIndex) => ({
        id: `${parentId}-${slugify(child)}`,
        parentId,
        name: child,
        slug: slugify(child),
        image: '',
        enabled: true,
        displayOrder: childIndex,
        description: '',
        depth: 1,
        children: [],
      })),
    };
  });
}

export function topLevelCategoryNames(tree: CategoryNode[] = []): string[] {
  return tree.filter((node) => node.enabled).map((node) => node.name);
}
