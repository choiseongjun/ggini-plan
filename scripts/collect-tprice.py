import json, re, subprocess, time, math, os
from pathlib import Path
from html import unescape
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlencode
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data/regional-prices'
BASE='https://www.price.go.kr/tprice/portal/dailynecessitypriceinfo/priceiteminfo/'
def request(endpoint, params=None):
    for attempt in range(3):
        args=['curl','-f','-sS','--max-time','45','--cacert',str(ROOT/'certs/price-go-kr-ca.pem'),BASE+endpoint]
        if params is not None: args += ['--data',urlencode(params)]
        p=subprocess.run(args,capture_output=True)
        if p.returncode==0: return p.stdout.decode('utf-8')
        time.sleep(1+attempt)
    detail=p.stderr.decode('utf-8',errors='replace').strip()[:500]
    raise RuntimeError(f'Official price source failed (curl {p.returncode}): {detail}; previous snapshot preserved')
def codes(endpoint,params):
    return sorted([str(x['CODE']) for x in json.loads(request(endpoint,params))['json']],reverse=True)
def parse_page(html,date):
    match=re.search(r'전체\(([\d,]+)\)',html)
    if not match: raise ValueError('Missing official total')
    rows=[]
    for block in re.findall(r'<tr\b[^>]*>(.*?)</tr>',html,re.S):
        fields=dict(re.findall(r'<input\b[^>]*name="([^"]+)"[^>]*value="([^"]*)"',block))
        if 'hid_cartGoodId' not in fields: continue
        cells=re.findall(r'<td\b[^>]*>(.*?)</td>',block,re.S)
        if not cells or not re.fullmatch(r'\d+(?:\.\d+)?',fields.get('hid_goodPrice','')): raise ValueError('Invalid price row')
        rows.append({'상품명':unescape(fields['hid_cartGoodName']),'판매업소':unescape(fields['hid_entpName']),'판매가격':fields['hid_goodPrice'],'조사일':date,'제조사':'','세일여부':'','원플러스원':'','storeId':fields['hid_cartEntpId'],'productId':fields['hid_cartGoodId'],'region':unescape(re.sub('<[^>]+>','',cells[0])).strip()})
    return int(match[1].replace(',','')),rows

def main():
    year=codes('getInspectYear.do',{})[0]
    month=codes('getInspectMonth.do',{'inspectYear':year})[0]
    day=codes('getInspectDay.do',{'inspectYear':year,'inspectMonth':month})[0]
    date=f'{year}-{month}-{day}'
    target=DATA/'raw/tprice-latest.json'
    if target.exists() and not os.getenv('TPRICE_FORCE'):
        previous=json.loads(target.read_text(encoding='utf-8'))
        age=(datetime.now(timezone.utc)-datetime.fromisoformat(previous['collectedAt'])).total_seconds()
        if previous['date']>date: raise ValueError('Source date regressed; previous snapshot preserved')
        if previous['date']==date and age<72000:
            print('Already checked latest survey: '+date,flush=True); return
    page=request('getPriceItemInfoList.do')
    categories=sorted(set(re.findall(r'getPriceItemInfoList.do\?goodClassCode=(\d+)',page)))
    if len(categories)<10: raise ValueError('Incomplete category discovery')
    print(f'Latest survey {date}; {len(categories)} categories',flush=True)
    checkpoint=DATA/'raw'/('tprice-'+date+'-'+datetime.now(timezone.utc).strftime('%Y%m%d'));checkpoint.mkdir(exist_ok=True)
    def collect(category):
        saved=checkpoint/(category+'.json')
        if saved.exists():
            cached=json.loads(saved.read_text(encoding='utf-8'))
            if cached['total']!=len(cached['rows']) or any(r['조사일']!=date for r in cached['rows']): raise ValueError('Invalid checkpoint')
            return cached
        params=dict(inspectYear=year,inspectMonth=month,inspectDay=day,goodClassCode=category,entpTypeArr='LM,DP,SM,TR,CS',pageUnit=200,pageNo=1,searchType='btnSearch',entpTypeTab='ALL')
        total,rows=parse_page(request('getPriceItemInfoList.do',params),date)
        for n in range(2,math.ceil(total/200)+1):
            time.sleep(.3)
            params['pageNo']=n
            count,chunk=parse_page(request('getPriceItemInfoList.do',params),date)
            if count!=total or not chunk: raise ValueError('Incomplete or changed pagination')
            rows.extend(chunk)
            if n%40==0: print(f'{category}: {len(rows)}/{total}',flush=True)
        if len(rows)!=total or len({(r['storeId'],r['productId']) for r in rows})!=total: raise ValueError('Count/identity mismatch')
        result=dict(category=category,total=total,rows=rows)
        partial=saved.with_suffix('.tmp')
        partial.write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8');partial.replace(saved)
        print(f'Completed {category}: {total}',flush=True)
        return result
    with ThreadPoolExecutor(max_workers=3) as pool: results=list(pool.map(collect,categories))
    rows=[r for x in results for r in x['rows']]
    if not rows: raise ValueError('Empty collection')
    if len({(r['storeId'],r['productId']) for r in rows})!=len(rows): raise ValueError('Duplicate identities across categories')
    snapshot=dict(source=BASE+'getPriceItemInfoList.do',date=date,collectedAt=datetime.now(timezone.utc).isoformat(),categories=[dict(category=x['category'],total=x['total']) for x in results],rows=rows)
    temp=target.with_suffix('.tmp');temp.write_text(json.dumps(snapshot,ensure_ascii=False),encoding='utf-8');temp.replace(target)
    print(json.dumps(dict(date=date,rows=len(rows),products=len({r['productId'] for r in rows}),stores=len({r['storeId'] for r in rows}))),flush=True)
if __name__=='__main__': main()
