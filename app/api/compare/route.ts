import { unitPrice, type CompareResponse, type Offer, type Product } from "../../../lib/catalog";
import { catalogItems } from "../../../lib/catalog-db";

type ShoppingResult = {
  title?: string;
  source?: string;
  extracted_price?: number;
  price?: string;
  product_link?: string;
  link?: string;
};

function quantityFromTitle(title: string, unit: "g" | "개"): number | null {
  const text = title.replaceAll(",", "").replaceAll("㎏", "kg");
  if (unit === "개") {
    const count = text.match(/(\d+)\s*(?:구|알|개)(?!월)/);
    return count ? Number(count[1]) : null;
  }
  const weight = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|그램)/i);
  if (!weight) return null;
  const grams = Number(weight[1]) * (weight[2].toLowerCase() === "kg" ? 1000 : 1);
  const rest = text.slice(weight.index! + weight[0].length);
  const multiple = rest.match(/^\s*(?:[x×*]|\+|묶음|세트)?\s*(\d+)\s*(?:팩|개|입|봉|통|모)(?:\b|\s|$)/);
  return grams * (multiple ? Number(multiple[1]) : 1);
}

function safeProductUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

function liveOffers(results: ShoppingResult[], product: Product): Offer[] {
  const mapped = results.flatMap((item, index) => {
    const price = item.extracted_price;
    const url = safeProductUrl(item.product_link ?? item.link);
    if (!price || !Number.isFinite(price) || price < 100 || !url) return [];
    const title = (item.title ?? "").replace(/<[^>]*>/g, "").trim();
    if (!title) return [];
    const quantity = quantityFromTitle(title, product.unit);
    const comparable = quantity !== null && quantity >= product.quantity * 0.4 && quantity <= product.quantity * 3;
    return [{
      id: `live-${index}`,
      seller: item.source?.trim() || "판매처 확인",
      title,
      price: Math.round(price),
      quantity: comparable ? quantity : null,
      unit: comparable ? product.unit : null,
      unitPrice: comparable ? unitPrice(price, quantity, product.unit) : null,
      url,
      isSearchLink: false,
    } satisfies Offer];
  });
  return mapped.sort((a, b) => (a.unitPrice ?? Number.POSITIVE_INFINITY) - (b.unitPrice ?? Number.POSITIVE_INFINITY) || a.price - b.price).slice(0, 8);
}

export async function GET(request: Request) {
  const itemId = new URL(request.url).searchParams.get("item");
  const product = (await catalogItems()).find((entry) => entry.id === itemId);
  if (!product) return Response.json({ message: "상품을 찾을 수 없습니다." }, { status: 400 });

  const registered: Offer[] = product.productUrl ? [{id:`catalog-${product.id}`,seller:new URL(product.productUrl).hostname,title:product.name,price:product.price,quantity:product.quantity,unit:product.unit,unitPrice:unitPrice(product.price,product.quantity,product.unit),url:product.productUrl,isSearchLink:false}] : [];
  const key = process.env.SERPAPI_KEY;
  if (!key) {
    const response: CompareResponse = { status: "unavailable", itemId: product.id, checkedAt: null, offers: registered, message: "등록된 판매 페이지의 확인 가격이에요. 실시간 최저가가 아니며 옵션·배송비는 판매처에서 확인해 주세요." };
    return Response.json(response);
  }

  try {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: product.searchQuery,
      location: "Seoul,Seoul,South Korea",
      gl: "kr",
      hl: "ko",
      api_key: key,
      output: "json",
    });
    const result = await fetch(`https://serpapi.com/search?${params}`, { cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!result.ok) throw new Error(`Shopping provider returned ${result.status}`);
    const body = await result.json() as { shopping_results?: ShoppingResult[]; error?: string };
    if (body.error) throw new Error(body.error);
    const offers = liveOffers(body.shopping_results ?? [], product);
    const response: CompareResponse = { status: "live", itemId: product.id, checkedAt: new Date().toISOString(), offers, message: offers.length ? undefined : "비교 가능한 상품을 찾지 못했습니다. 쇼핑몰 검색 결과를 확인해 주세요." };
    return Response.json(response);
  } catch {
    const response: CompareResponse = { status: "error", itemId: product.id, checkedAt: null, offers: [], message: "온라인 가격을 가져오지 못했습니다. 아래 쇼핑몰에서 현재 가격을 확인해 주세요." };
    return Response.json(response, { status: 502 });
  }
}
