"""Build a local, reproducible preview from official downloaded source files."""
import csv
import hashlib
import json
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/regional-prices'


def number(value):
    value = str(value).replace(',', '').strip()
    try:
        result = float(value)
        return result if result > 0 else None
    except ValueError:
        return None


def expand_rows(rows):
    grid = []
    for i, cells in enumerate(rows):
        while len(grid) <= i:
            grid.append([])
        col = 0
        for cell in cells:
            while col < len(grid[i]) and grid[i][col] is not None:
                col += 1
            for y in range(i, i + cell['rowSpan']):
                while len(grid) <= y:
                    grid.append([])
                for x in range(col, col + cell['colSpan']):
                    while len(grid[y]) <= x:
                        grid[y].append(None)
                    grid[y][x] = cell['text'].strip()
            col += cell['colSpan']
    return grid


def build_kamis(snapshots):
    result, missing = [], []
    for snapshot in snapshots:
        count = 0
        for table in snapshot['tables']:
            if '일간' not in (table['caption'] or ''):
                continue
            rows = expand_rows(table['rows'])
            if rows and len(rows[0]) == 4 and len(rows) == 2:
                continue  # Official empty-region table has no date columns.
            if not rows or len(rows[0]) != 10 or rows[0][4] != '당일 (10/07)' or rows[0][6] != '1주일전 (09/30)':
                raise ValueError('Unexpected KAMIS snapshot columns/dates; update snapshot metadata first')
            for row in rows[1:]:
                if len(row) != 10 or not number(row[4]):
                    continue
                current, previous = number(row[4]), number(row[6])
                result.append(dict(source='kamis', region=snapshot['region'], name=row[0], variety=row[1], unit=row[2], grade=row[3], price=current, previous=previous, change=round((current/previous-1)*100,1) if previous else None, date='2026-10-07', previousDate='2026-09-30'))
                count += 1
        if not count:
            missing.append(snapshot['region'])
    return result, missing


def build_tprice(rows):
    groups = defaultdict(lambda: defaultdict(dict))
    invalid = 0
    for row in rows:
        price = number(row['판매가격'])
        if price is None:
            invalid += 1
            continue
        key = (row['상품명'].strip(), row['제조사'].strip())
        date, store = row['조사일'], row['판매업소'].strip()
        groups[key][date][store] = dict(store=store, region=None, address=None, regionStatus='unverified', date=date, price=price, sale=row['세일여부'] or None, onePlusOne=row['원플러스원'] or None)
    products = []
    for (name, maker), dates in sorted(groups.items()):
        latest = max(dates)
        offers = sorted(dates[latest].values(), key=lambda o:(o['price'],o['store']))
        products.append(dict(source='tprice', id=hashlib.sha256((name+'|'+maker).encode()).hexdigest()[:16], name=name, maker=maker, date=latest, count=len(offers), minimum=offers[0]['price'], maximum=offers[-1]['price'], average=round(sum(o['price'] for o in offers)/len(offers)), offers=offers))
    return products, invalid


def build_live_tprice(rows):
    groups=defaultdict(list)
    for row in rows:
        if number(row['판매가격']) is None:
            raise ValueError('Invalid live store price')
        groups[row['productId']].append(row)
    products=[]
    for product_id, observations in sorted(groups.items()):
        if len({r['상품명'] for r in observations}) != 1 or len({r['조사일'] for r in observations}) != 1:
            raise ValueError('Product name/date conflict')
        row=observations[0]
        offers=sorted([dict(store=r['판매업소'],storeId=r['storeId'],region=r['region'],regionStatus='source-reported',address=None,date=r['조사일'],price=number(r['판매가격']),sale=None,onePlusOne=None) for r in observations],key=lambda o:(o['price'],o['store']))
        products.append(dict(source='tprice-web',id='tprice-'+product_id,sourceProductId=product_id,name=row['상품명'],maker='제조사 미제공',date=row['조사일'],count=len(offers),minimum=offers[0]['price'],maximum=offers[-1]['price'],average=round(sum(o['price'] for o in offers)/len(offers)),offers=offers))
    return products,0


def build_api_kamis(snapshot):
    # Preserve market identities; never compare means from different shop samples.
    groups = defaultdict(lambda: defaultdict(dict))
    for r in snapshot['rows']:
        price = number(r['exmn_dd_prc'])
        if r['se_cd'] != '01' or price is None:
            continue
        key = tuple(r[k] for k in ['sgg_cd','item_cd','vrty_cd','grd_cd','unit','unit_sz'])
        date = datetime.strptime(r['exmn_ymd'],'%Y%m%d').date().isoformat()
        old=groups[key][date].get(r['mrkt_cd'])
        if old is None or r.get('orgnl_reg_dt','') >= old.get('orgnl_reg_dt',''):
            groups[key][date][r['mrkt_cd']] = r
    if not groups:
        raise ValueError('No valid retail observations')
    latest = max(date for dates in groups.values() for date in dates)
    before = (datetime.strptime(latest,'%Y-%m-%d')-timedelta(days=7)).date().isoformat()
    result=[]
    for key,dates in groups.items():
        if latest not in dates:
            continue
        current, prior = dates[latest], dates.get(before,{})
        row=next(iter(current.values()))
        current_price=sum(number(r['exmn_dd_prc']) for r in current.values())/len(current)
        comparable=bool(prior) and set(current)==set(prior)
        previous=sum(number(r['exmn_dd_prc']) for r in prior.values())/len(prior) if comparable else None
        result.append(dict(source='kamis-api',region=row['sgg_nm'],name=row['item_nm'],variety=row['vrty_nm'],grade=row['grd_nm'],unit=row['unit_sz']+row['unit'],price=round(current_price),previous=round(previous) if previous else None,change=round((current_price/previous-1)*100,1) if previous else None,date=latest,previousDate=before,marketCount=len(current),marketCodes=sorted(current),comparisonStatus='same-markets' if comparable else 'missing-or-changed-markets',seriesCodes=list(key),aggregation='unweighted surveyed-market mean'))
    return result, latest, before


NATIONAL = '전국'
MIN_COMPARABLE_REGIONS = 3


def median(values):
    ordered = sorted(values)
    middle = len(ordered) // 2
    return ordered[middle] if len(ordered) % 2 else (ordered[middle-1] + ordered[middle]) / 2


def fill_national(kamis):
    # The API publishes 전국 only for livestock; derive the rest from regional rows and label it as computed.
    series = lambda r: (r['name'], r['variety'], r['grade'], r['unit'])
    official = {series(r) for r in kamis if r['region'] == NATIONAL}
    groups = defaultdict(list)
    for r in kamis:
        if r['region'] != NATIONAL and series(r) not in official and r['price']:
            groups[series(r)].append(r)
    result = []
    for (name, variety, grade, unit), rows in groups.items():
        comparable = [r for r in rows if r['previous']]
        # Change is computed only within the same set of regions on both dates.
        basis = comparable if len(comparable) >= MIN_COMPARABLE_REGIONS else rows
        price = median([r['price'] for r in basis])
        previous = median([r['previous'] for r in comparable]) if basis is comparable else None
        result.append(dict(source='kamis-computed', region=NATIONAL, name=name, variety=variety, grade=grade, unit=unit, price=round(price), previous=round(previous) if previous else None, change=round((price/previous-1)*100,1) if previous else None, date=rows[0]['date'], previousDate=rows[0]['previousDate'], regionCount=len(basis), regions=sorted(r['region'] for r in basis), comparisonStatus='same-regions' if previous else 'too-few-comparable-regions', aggregation='median of regional surveyed-market means (computed, not an official national average)'))
    return result


def connect_data(kamis, products, config):
    ingredients = config['ingredients']
    ids = {i['id'] for i in ingredients}
    if len(ids) != len(ingredients):
        raise ValueError('Duplicate ingredient IDs')
    for recipe in config['recipes']:
        if not set(recipe['ingredientIds']) <= ids:
            raise ValueError('Unknown recipe ingredient')
    for row in kamis:
        row['ingredientIds'] = [i['id'] for i in ingredients if row['name'] in i['kamisNames'] and (not i['kamisVarieties'] or row['variety'] in i['kamisVarieties'])]
    for product in products:
        product['ingredientIds'] = [i['id'] for i in ingredients if product['name'] in i['productNames']]
    links = [dict(**i, productIds=[p['id'] for p in products if i['id'] in p['ingredientIds']]) for i in ingredients]
    report = dict(mappingVersion=config['version'], ingredientCount=len(ingredients), recipeCount=len(config['recipes']), linkedKamisRows=sum(bool(r['ingredientIds']) for r in kamis), linkedProducts=sum(bool(p['ingredientIds']) for p in products), retainedOffers=sum(len(p['offers']) for p in products), verifiedRegionOffers=0, unmappedProductNames=[p['name'] for p in products if not p['ingredientIds']])
    return dict(ingredients=links, recipes=config['recipes'], report=report)


def main():
    snapshots=[]
    rows=[]
    csv_path=DATA/'raw/tprice-20260828.csv'
    if csv_path.exists():
        with csv_path.open(encoding='cp949', newline='') as f:
            rows=list(csv.DictReader(f))
    api_path=DATA/'raw/kamis-api.json'
    api=None
    if api_path.exists():
        api=json.loads(api_path.read_text(encoding='utf-8'))
        kamis,latest,before=build_api_kamis(api)
        kamis+=fill_national(kamis)
        regions=sorted({r['region'] for r in kamis})
        missing=[]
    else:
        snapshots=json.loads((DATA/'raw/kamis-dom.json').read_text(encoding='utf-8'))
        kamis,missing=build_kamis(snapshots)
        latest,before='2026-10-07','2026-09-30'
        regions=[s['region'] for s in snapshots]
    live_path=DATA/'raw/tprice-latest.json'
    live=json.loads(live_path.read_text(encoding='utf-8')) if live_path.exists() else None
    if live:
        rows=live['rows']
        tprice,invalid=build_live_tprice(rows)
    else:
        tprice, invalid = build_tprice(rows)
    connections = connect_data(kamis, tprice, json.loads((DATA/'connections.json').read_text(encoding='utf-8')))
    manifest = dict(builtAt=datetime.now(timezone.utc).isoformat(), kamisRows=len(kamis), kamisRegions=[s['region'] for s in snapshots], missingRegions=missing, tpriceRawRows=len(rows), tpriceInvalidPrices=invalid, tpriceProducts=len(tprice), tpriceStores=len({r['판매업소'] for r in rows}), tpriceDates=sorted({r['조사일'] for r in rows}), scope='KAMIS: 2026-10-07 all displayed regions/categories; Tprice: complete August 2026 CSV. Not all historical data.', sources=[dict(name='KAMIS',url='https://www.kamis.or.kr/customer/price/agricultureRetail/catalogue.do'),dict(name='참가격 공개 CSV',url='https://www.data.go.kr/data/15083256/fileData.do')])
    manifest.update(kamisRegions=regions,kamisDate=latest,kamisPreviousDate=before,kamisMode='api' if api else 'snapshot',kamisRawRows=len(api['rows']) if api else 0,kamisCollectedAt=api['collectedAt'] if api else None,scope=f'KAMIS {latest}: latest available collected retail day; comparison {before}. Tprice: complete August 2026 CSV. Not all history.')
    if api:
        manifest['sources'][0]['url']='https://www.data.go.kr/data/15156057/openapi.do'
        manifest.update(apiStart=api['start'],apiEnd=api['end'],apiRequests=api['requests'],apiItems=len(api['counts']),apiEmptyItems=[i['name'] for i in api['counts'] if not i['rows']])
    if live:
        manifest.update(tpriceMode='web',tpriceCollectedAt=live['collectedAt'],tpriceCategoryCount=len(live['categories']))
        manifest['sources'][1]=dict(name='참가격 공식 조회',url=live['source'])
        manifest['scope']=f'KAMIS {latest}; Tprice latest available survey {live["date"]}. Not all history.'
    (DATA/'preview.json.tmp').write_text(json.dumps(dict(manifest=manifest,kamis=kamis,tprice=tprice,connections=connections),ensure_ascii=False),encoding='utf-8')
    (DATA/'preview.json.tmp').replace(DATA/'preview.json')
    (DATA/'connection-report.json').write_text(json.dumps(connections['report'],ensure_ascii=False,indent=2),encoding='utf-8')
    (DATA/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(manifest,ensure_ascii=True))


if __name__ == '__main__':
    main()
