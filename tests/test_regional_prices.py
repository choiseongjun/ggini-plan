import importlib.util
from pathlib import Path
import unittest
import json

spec = importlib.util.spec_from_file_location('prices', Path(__file__).resolve().parents[1]/'scripts/build-regional-prices.py')
prices = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prices)


class PricesTest(unittest.TestCase):
    def test_api_average_compares_only_same_markets(self):
        def record(date,market,price):
            return dict(se_cd='01',sgg_cd='1101',sgg_nm='서울',item_cd='224',item_nm='호박',vrty_cd='01',vrty_nm='애호박',grd_cd='04',grd_nm='상품',unit='개',unit_sz='1',exmn_ymd=date,mrkt_cd=market,exmn_dd_prc=str(price))
        rows=[record('20261007','A',800),record('20261007','B',1000),record('20260930','A',1000),record('20260930','B',1000)]
        result,date,before=prices.build_api_kamis({'rows':rows})
        self.assertEqual((date,before),('2026-10-07','2026-09-30'))
        self.assertEqual((result[0]['price'],result[0]['previous'],result[0]['change']),(900,1000,-10))
        changed=prices.build_api_kamis({'rows':rows[:-1]})[0][0]
        self.assertIsNone(changed['previous'])
        self.assertEqual(changed['comparisonStatus'],'missing-or-changed-markets')

    def test_national_fill_uses_regional_median_and_keeps_official_rows(self):
        def row(region,name,price,previous):
            return dict(region=region,name=name,variety='v',grade='상품',unit='1kg',price=price,previous=previous,date='2026-10-06',previousDate='2026-09-29')
        kamis=[row('전국','돼지',2000,1900),row('서울','돼지',2500,2400),row('서울','양파',2000,2200),row('부산','양파',2100,2000),row('대구','양파',1800,2000),row('광주','양파',3000,None)]
        filled=prices.fill_national(kamis)
        self.assertEqual([r['name'] for r in filled],['양파'])
        onion=filled[0]
        # Comparable regions only (광주 lacks last week), so the change compares the same three regions.
        self.assertEqual((onion['price'],onion['previous'],onion['regionCount'],onion['source']),(2000,2000,3,'kamis-computed'))
        too_few=prices.fill_national([row('서울','감자',300,280),row('부산','감자',320,None)])[0]
        self.assertEqual((too_few['price'],too_few['previous'],too_few['comparisonStatus']),(310,None,'too-few-comparable-regions'))

    def test_connections_exclude_processed_food_and_wrong_variety(self):
        config=json.loads((prices.DATA/'connections.json').read_text(encoding='utf8'))
        products=[dict(id='tofu',name='행복한콩 부침두부(300g)',offers=[]),dict(id='baby',name='아이꼬야 맘스쿠킹 소고기와두부진밥(100g)',offers=[])]
        kamis=[dict(name='호박',variety='애호박'),dict(name='호박',variety='단호박')]
        linked=prices.connect_data(kamis,products,config)
        self.assertEqual(products[0]['ingredientIds'],['tofu'])
        self.assertEqual(products[1]['ingredientIds'],[])
        self.assertEqual(kamis[1]['ingredientIds'],[])
        self.assertIn('tofu',next(i for i in linked['ingredients'] if i['id']=='tofu')['productIds'])

    def test_all_stores_retained_without_inferred_regions(self):
        rows=[{'상품명':'두부','제조사':'A','조사일':'2026-08-28','판매가격':str(100+i),'판매업소':f'서울점{i}','세일여부':'','원플러스원':''} for i in range(12)]
        products,_=prices.build_tprice(rows)
        self.assertEqual(len(products[0]['offers']),12)
        self.assertTrue(all(o['region'] is None for o in products[0]['offers']))

    def test_unexpected_snapshot_dates_rejected(self):
        cells = [dict(text='wrong date', rowSpan=1, colSpan=1) for _ in range(10)]
        with self.assertRaises(ValueError):
            prices.build_kamis([dict(region='서울', tables=[dict(caption='일간', rows=[cells])])])

    def test_missing_prices_are_not_free(self):
        for value in ['-', '', '0', '-10']:
            self.assertIsNone(prices.number(value))
        self.assertEqual(prices.number('1,250'),1250)

    def test_rowspan_preserves_product_for_second_grade(self):
        cell = lambda text, span=1: dict(text=text,rowSpan=span,colSpan=1)
        rows = prices.expand_rows([[cell('감자',2),cell('상품'),cell('500')],[cell('중품'),cell('400')]])
        self.assertEqual(rows[1],['감자','중품','400'])

    def test_latest_date_and_exact_product_only(self):
        def row(name, date, price,store):
            return {'상품명':name,'제조사':'A','조사일':date,'판매가격':price,'판매업소':store,'세일여부':'','원플러스원':''}
        products,_=prices.build_tprice([row('두부300g','2026-08-07','100','옛점'),row('두부300g','2026-08-28','200','새점'),row('두부600g','2026-08-28','300','새점')])
        self.assertEqual(len(products),2)
        self.assertEqual(products[0]['average'],200)
        self.assertEqual(products[0]['offers'][0]['sale'],None)


if __name__ == '__main__': unittest.main()
