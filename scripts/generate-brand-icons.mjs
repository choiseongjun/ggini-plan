import {readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const source=await readFile(new URL('../app/icon.svg',import.meta.url));
const render=size=>sharp(source).resize(size,size).png().toBuffer();
await writeFile(new URL('../app/icon.png',import.meta.url),await render(192));
await writeFile(new URL('../app/apple-icon.png',import.meta.url),await render(180));
const sizes=[16,32,48,96,256],images=await Promise.all(sizes.map(render));
const header=Buffer.alloc(6+16*sizes.length);
header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
let offset=header.length;
for(let i=0;i<sizes.length;i++){
 const entry=6+i*16;header[entry]=sizes[i]===256?0:sizes[i];header[entry+1]=header[entry];
 header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);
 header.writeUInt32LE(images[i].length,entry+8);header.writeUInt32LE(offset,entry+12);offset+=images[i].length;
}
await writeFile(new URL('../app/favicon.ico',import.meta.url),Buffer.concat([header,...images]));
console.log('Brand SVG, PNG, Apple icon and multi-size ICO are aligned.');
