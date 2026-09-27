import sharp from 'sharp';

// Keep the diary image separate from the smaller, transient AI input.
export async function diaryPhoto(bytes:Buffer){
 return sharp(bytes,{limitInputPixels:25_000_000}).rotate()
  .resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true})
  .jpeg({quality:90,chromaSubsampling:'4:4:4'}).toBuffer();
}
