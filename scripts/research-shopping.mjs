import fs from 'node:fs/promises';
const headers={Origin:'https://www.kurly.com',Referer:'https://www.kurly.com/'};
const manifest=JSON.parse(await fs.readFile('data/catalog-import-2026-09-16.json','utf8'));
const rows=manifest.rows.filter(p=>/볶음밥|솥밥|도시락|파스타|비빔국수/.test(p.name));
for(const id of [5011229,5040715,5011223,1000430679,5036742,5141864,5011225,1000956905,5161538,5067010,1000085902,1001793482,1002115423,1002066866])rows.push({id:`kurly-${id}`,productUrl:`https://www.kurly.com/goods/${id}`});
const results=[];
for(const row of rows){
 try{
  const response=await fetch(row.productUrl,{headers,signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const html=await response.text();
  const match=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  const p=JSON.parse(match[1]).props.pageProps.product;
  results.push({id:row.id,checkedAt:new Date().toISOString(),product:p});
  console.log(row.id,p.name);
 }catch(e){console.log(row.id,e.message);}
}
await fs.writeFile('data/shopping-source-research.json',JSON.stringify(results,null,2));
