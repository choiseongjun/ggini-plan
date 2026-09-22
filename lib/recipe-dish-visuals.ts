// No real product photo exists for a synthesized govDB recipe (nothing was ever purchased/photographed),
// so ProductThumb's existing emoji+color fallback (app/product-thumb.tsx) is the only visual available.
// This picks a dish-appropriate emoji/color instead of one flat placeholder for all recipes, ordered
// most-specific ingredient first so e.g. "회덮밥" doesn't fall through to a generic "덮밥" bowl icon.
const rules: [RegExp, string, string][] = [
 [/회덮밥|회\b/, '🐟', 'lilac'],
 [/장어/, '🐟', 'lilac'],
 [/오징어|낙지|주꾸미|문어/, '🦑', 'lilac'],
 [/새우/, '🍤', 'lilac'],
 [/멸치|어묵|해물/, '🐟', 'lilac'],
 [/닭/, '🍗', 'peach'],
 [/순대|곱창|돼지껍데기/, '🍖', 'sand'],
 [/삼겹|제육|돼지고기/, '🥓', 'sand'],
 [/소고기|차돌|한우/, '🥩', 'sand'],
 [/소시지/, '🌭', 'sand'],
 [/계란|달걀/, '🍳', 'butter'],
 [/버섯/, '🍄', 'mint'],
 [/감자/, '🥔', 'mint'],
 [/당근/, '🥕', 'mint'],
 [/양파/, '🧅', 'mint'],
 [/브로콜리/, '🥦', 'mint'],
 [/김치/, '🌶️', 'peach'],
 [/애호박|호박/, '🥒', 'mint'],
 [/미역|다시마/, '🌊', 'mint'],
 [/나물|깻잎|풋고추|마늘쫑|죽순/, '🥬', 'mint'],
 [/짜장|자장/, '🍜', 'butter'],
 [/면|라면|우동|파스타/, '🍜', 'butter'],
 [/볶음밥/, '🍚', 'butter'],
 [/덮밥/, '🍚', 'butter'],
 [/볶음/, '🍳', 'peach'],
];

export function pickDishVisual(name: string): {emoji: string; color: string} {
 const match = rules.find(([pattern]) => pattern.test(name));
 return match ? {emoji: match[1], color: match[2]} : {emoji: '🍽️', color: 'mint'};
}
