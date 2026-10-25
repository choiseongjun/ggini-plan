import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {POST} from '../app/api/food-photo/recognize/route';
test('photo API rejects cross-origin and unsigned requests before analysis',async()=>{
 const cross=await POST(new NextRequest('https://gginiplan.kr/api/food-photo/recognize',{method:'POST',headers:{origin:'https://example.com'}}));
 assert.equal(cross.status,403);
 const guest=await POST(new NextRequest('https://gginiplan.kr/api/food-photo/recognize',{method:'POST'}));
 assert.equal(guest.status,401);assert.match((await guest.json()).error,/로그인/);
});
