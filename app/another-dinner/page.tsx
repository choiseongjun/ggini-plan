import type {Metadata} from 'next';
import DinnerExperience from './screen';

export const metadata:Metadata={title:'당신이 먹지 않은 저녁 | 끼니플랜',description:'어제의 한 끼에 다른 결말을 만들어 보세요. 집밥, 외식, 편의점 중 오늘의 선택을 골라요.'};
export default function Page(){return <DinnerExperience/>;}
