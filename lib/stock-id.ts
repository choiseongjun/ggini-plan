// Recipe ingredient IDs include their Korean names. Keep the same contract for
// pantry quantities, purchase expenses and recommendation supplies.
export function validStockId(id: unknown): id is string {
 return typeof id==='string'&&/^[a-zA-Z0-9_가-힣-]{1,100}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
}
