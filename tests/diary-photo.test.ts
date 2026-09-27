import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {diaryPhoto} from '../lib/diary-photo';
test('diary retains higher resolution, strips metadata, and does not enlarge thumbnails',async()=>{
 const large=await sharp({create:{width:2400,height:1800,channels:3,background:'#99b577'}}).jpeg().withMetadata().toBuffer();
 const saved=await sharp(await diaryPhoto(large)).metadata();
 assert.equal(saved.width,1600);assert.equal(saved.height,1200);assert.equal(saved.exif,undefined);
 const small=await sharp({create:{width:130,height:130,channels:3,background:'#99b577'}}).jpeg().toBuffer();
 const thumb=await sharp(await diaryPhoto(small)).metadata();assert.equal(thumb.width,130);assert.equal(thumb.height,130);
});
