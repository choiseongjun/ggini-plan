import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inferFoodType,isFoodType} from '../lib/catalog-food-types';
test('food kinds identify prepared dishes before ingredient names',()=>{
 for(const [name,kind] of [['소스 닭가슴살 100g','chicken_breast'],['닭가슴살 볶음밥','fried_rice'],['닭가슴살 샐러드','salad'],['닭가슴살 도시락','lunch_box'],['샐러드 드레싱','sauce_oil'],['우유 식빵','bread'],['시리얼','cereal'],['우유','milk'],['두유','soy_milk'],['그릭 요거트','yogurt'],['두부면','noodles'],['모르는 상품',null]] as const)assert.equal(inferFoodType(name),kind,name);
});
test('only registered food kinds are accepted',()=>{assert.ok(isFoodType('chicken_breast'));assert.equal(isFoodType('toString'),false);assert.equal(isFoodType(null),false);});
