import { getPool } from "../lib/db";
import { importProductImage, isStoredImage, prepareImageBucket, storeImage } from "../lib/catalog-storage";

async function migrate() {
  await prepareImageBucket();
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; product_image_url: string | null; nutrition_photo: Buffer | null; nutrition_photo_mime: string | null }>("SELECT id,product_image_url,nutrition_photo,nutrition_photo_mime FROM catalog_items ORDER BY id");
  for (const row of rows) {
    if (row.product_image_url && !isStoredImage(row.product_image_url)) {
      const url = await importProductImage(row.product_image_url);
      const result = await pool.query("UPDATE catalog_items SET product_image_url=$1 WHERE id=$2 AND product_image_url=$3", [url, row.id, row.product_image_url]);
      console.log(row.id, "product", result.rowCount ? "migrated" : "changed concurrently; skipped");
    }
    if (row.nutrition_photo && row.nutrition_photo_mime) {
      const url = await storeImage({ bytes: row.nutrition_photo, mime: row.nutrition_photo_mime }, "nutrition");
      const result = await pool.query("UPDATE catalog_items SET nutrition_photo_url=$1,nutrition_photo=NULL WHERE id=$2 AND nutrition_photo=$3", [url, row.id, row.nutrition_photo]);
      console.log(row.id, "nutrition", result.rowCount ? "migrated" : "changed concurrently; skipped");
    }
  }
}
migrate().catch(error => { console.error(error instanceof Error ? error.message : "Image migration failed"); process.exitCode = 1; }).finally(() => getPool().end());
