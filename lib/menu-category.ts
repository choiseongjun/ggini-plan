import type {PlanProduct} from './shopping-plan';

// What people browse by, not the recipe engine's templates: 볶음밥 is 밥 (not a 볶음 반찬) and
// 짜장면 is 면, so rice/noodle dishes are recognised by name first, then by template.
export const categories=[
 {key:'bap',label:'밥·덮밥'},
 {key:'myeon',label:'면'},
 {key:'guk',label:'국·탕'},
 {key:'jjigae',label:'찌개·전골'},
 {key:'bokkeum',label:'볶음'},
 {key:'gui',label:'구이'},
 {key:'jjim',label:'찜'},
 {key:'jorim',label:'조림'},
 {key:'jeon',label:'전·부침'},
 {key:'twigim',label:'튀김'},
 {key:'juk',label:'죽·스프'},
 {key:'etc',label:'기타'},
 {key:'ready',label:'간편식'},
] as const;
export type Category='all'|(typeof categories)[number]['key'];
const byTemplate:Record<string,Category>={guktang:'guk',jjigae:'jjigae','stirfry-meat-rice':'bokkeum',jjajang:'bokkeum',gui:'gui',jjim:'jjim',jorim:'jorim',jeon:'jeon',twigim:'twigim',myeon:'myeon','bap-etc':'bap',juk:'juk'};
const noodleName=/국수|라면|라멘|칼국수|냉면|막국수|우동|짜장면|짬뽕|쌀국수|파스타|스파게티|수제비|기스면|잔치국수/;
const riceName=/밥|김밥|덮밥|리소토|리조또|오므라이스|주먹밥/;
export function categoryOf(p:PlanProduct):Category{
 if(!p.recipe)return 'ready';
 const name=p.name.split('_')[0];
 if(/맛탕/.test(name))return 'etc';
 if(/볶음탕|찜닭|닭찜/.test(name))return 'jjim';
 if(noodleName.test(name))return 'myeon';
 if(riceName.test(name)&&!/국밥|밥솥|밥도둑/.test(name))return 'bap';
 return byTemplate[p.recipe.family.replace(/^govdb-/,'')]??'etc';
}
