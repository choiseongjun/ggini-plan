export type Product = {
  id: string;
  emoji: string;
  name: string;
  detail: string;
  price: number;
  portions: string;
  protein: string;
  color: string;
  searchQuery: string;
  unit: "g" | "개";
  quantity: number;
};

export const catalogCategories = {
  ingredient: "식재료",
  meal_kit: "밀키트",
  frozen_meal: "냉동식품",
  ready_meal: "간편식",
  other: "기타",
} as const;
export type CatalogCategory = keyof typeof catalogCategories;

export type CatalogItem = Product & {
  isSample?: boolean;
  category: CatalogCategory;
  inWeeklyCart: boolean;
  productImageUrl: string | null;
  priceCheckedAt?: string | null;
  priceNote?: string | null;
  allergens?: string[];
  productUrl: string | null;
  nutritionSourceName: string | null;
  nutritionSourceUrl: string | null;
  nutritionPhotoUrl: string | null;
  nutritionBasis: string | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbohydratesG: number | null;
  fatG: number | null;
  sodiumMg: number | null;
  updatedAt: string | null;
};

export type Offer = {
  id: string;
  seller: string;
  title: string;
  price: number;
  quantity: number | null;
  unit: "g" | "개" | null;
  unitPrice: number | null;
  url: string;
  isSearchLink: boolean;
};

export type CompareResponse = {
  status: "live" | "unavailable" | "error";
  itemId: string;
  checkedAt: string | null;
  offers: Offer[];
  message?: string;
};

export function shoppingSearchLinks(query: string) {
  const q = encodeURIComponent(query);
  return [
    { name: "네이버쇼핑", url: `https://search.shopping.naver.com/search/all?query=${q}` },
    { name: "쿠팡", url: `https://www.coupang.com/np/search?q=${q}` },
    { name: "컬리", url: `https://www.kurly.com/search?sword=${q}` },
    { name: "SSG.COM", url: `https://www.ssg.com/search.ssg?query=${q}` },
  ];
}

export function unitPrice(price: number, quantity: number, unit: "g" | "개") {
  return Math.round(price / quantity * (unit === "g" ? 100 : 1));
}
