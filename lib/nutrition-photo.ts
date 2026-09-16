export const MAX_NUTRITION_PHOTO_BYTES = 8 * 1024 * 1024;

export async function validatedPhoto(value: FormDataEntryValue | null): Promise<{ bytes: Buffer; mime: string } | null> {
  if (value === null) return null;
  if (!(value instanceof File)) throw new Error("사진 파일을 선택해 주세요.");
  if (value.size === 0 || value.size > MAX_NUTRITION_PHOTO_BYTES) throw new Error("사진은 8MB 이하로 첨부해 주세요.");
  const bytes = Buffer.from(await value.arrayBuffer());
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (png) return { bytes, mime: "image/png" };
  if (jpeg) return { bytes, mime: "image/jpeg" };
  if (webp) return { bytes, mime: "image/webp" };
  throw new Error("JPG, PNG, WEBP 사진만 첨부할 수 있습니다.");
}
