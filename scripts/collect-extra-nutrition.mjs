import fs from 'node:fs/promises';
import sharp from 'sharp';
const root='data/nutrition-review';
for(const id of ['rice','frozen-shrimp-fried-rice']) {
 const path=`${root}/${id}.json`, row=JSON.parse(await fs.readFile(path,'utf8'));
 const html=await (await fetch(row.product_url)).text();
 await fs.writeFile(`${root}/${id}.html`,html);
 let urls=[];
 if(id.startsWith('kurly')) {
  const product=JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]).props.pageProps.product;
  const description=JSON.parse(product.productDetail.contentDescription.description.description);
  urls=description.blocks.filter(b=>b.isExposure).flatMap(b=>b.modules.filter(m=>m.type==='IMAGE').map(m=>m.data.pc.src)).filter(Boolean);
 } else {
  urls=[...new Set([...html.matchAll(/(?:src|data-src)=["']([^"']+)["']/g)].map(m=>m[1]).filter(s=>/\.(jpg|png|jpeg)(\?|$)/i.test(s)))];
 }
 console.log(id,JSON.stringify(urls));
 for(const [index,url] of urls.entries()) {
  if(!id.startsWith('kurly')&&index!==urls.length-1)continue;
  const file=`${root}/images/${id}-extra-${index}.jpg`;
  await fs.writeFile(file,Buffer.from(await (await fetch(url)).arrayBuffer()));
  row.labels.push({url,file});
  const meta=await sharp(file).metadata();
  for(let top=0;top<meta.height;top+=1800) await sharp(file).extract({left:0,top,width:meta.width,height:Math.min(1800,meta.height-top)}).toFile(`${root}/images/${id}-crop-${top}.png`);
  console.log(id,meta.width,meta.height);
 }
 await fs.writeFile(path,JSON.stringify(row,null,2));
}
