import {generateAllEligibleRecipes} from '../lib/recipe-optimizer-batch.ts';

const {total, eligible, saved, failed, removed} = await generateAllEligibleRecipes();
console.log(`${eligible}/${total}건이 현재 템플릿으로 생성 가능해요.`);
console.log(`완료: ${saved}건 저장, ${failed}건 실패, 더 이상 대상이 아니라 제거된 ${removed}건.`);
process.exit(0);
