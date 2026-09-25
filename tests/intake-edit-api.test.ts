import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {PATCH} from '../app/api/food-intake/route';
test('editing a record requires a signed-in account',async()=>{
 const response=await PATCH(new NextRequest('http://localhost:3000/api/food-intake',{method:'PATCH',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify({id:'a7bcb86c-3c58-4ae4-92bc-9146423a5411',portions:2,version:0})}));
 assert.equal(response.status,401);
});
test('editing a record rejects cross-origin requests before accessing data',async()=>{
 const response=await PATCH(new NextRequest('http://localhost:3000/api/food-intake',{method:'PATCH',headers:{origin:'https://example.com'}}));
 assert.equal(response.status,403);
});
