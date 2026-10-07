import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
def module(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file)
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result
collector=module('collector','collect-tprice.py')
builder=module('builder','build-regional-prices.py')
class LivePriceTest(unittest.TestCase):
    def test_source_ids_region_and_price_are_preserved(self):
        html='''전체(1)<tr><td>서울특별시</td><td><input name="hid_cartGoodId" value="965"><input name="hid_cartGoodName" value="두부 &amp; 콩"><input name="hid_cartEntpId" value="12"><input name="hid_entpName" value="가게"><input name="hid_goodPrice" value="2750"></td></tr>'''
        total,rows=collector.parse_page(html,'2026-09-25')
        self.assertEqual(total,1);self.assertEqual(rows[0]['상품명'],'두부 & 콩')
        products,_=builder.build_live_tprice(rows)
        self.assertEqual(products[0]['id'],'tprice-965')
        self.assertEqual(products[0]['offers'][0]['region'],'서울특별시')
        self.assertEqual(products[0]['average'],2750)
        self.assertIsNone(products[0]['offers'][0]['sale'])
    def test_same_name_distinct_source_products_stay_separate(self):
        base={'상품명':'두부','판매업소':'가게','판매가격':'1000','조사일':'2026-09-25','storeId':'1','region':'서울특별시'}
        products,_=builder.build_live_tprice([dict(base,productId='1'),dict(base,productId='2')])
        self.assertEqual(len(products),2)
    def test_error_page_is_not_empty_success(self):
        with self.assertRaises(ValueError): collector.parse_page('<h1>오류</h1>','2026-09-25')
if __name__=='__main__':unittest.main()
