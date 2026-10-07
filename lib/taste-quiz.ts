import {parseTaste,tasteFoods} from './taste-atlas';

// v2 links encode a side per question, unlike the v1 liked-food mask.
// Keep question order and options stable for already shared links.
export const tasteQuestions=[
 {scene:'점심시간, 딱 하나만',prompt:'오늘 점심으로 내가 고를 건?',foods:[0,3]},
 {scene:'비 오는 저녁',prompt:'이런 날 내가 찾는 한 끼는?',foods:[1,4]},
 {scene:'스트레스 받은 날',prompt:'기분 풀려고 내가 고를 건?',foods:[2,5]},
 {scene:'주말의 늦은 점심',prompt:'여유로운 날, 내 입맛은?',foods:[4,0]},
 {scene:'집밥이 생각날 때',prompt:'밥 한 공기와 곁들일 내 선택은?',foods:[5,1]},
 {scene:'가볍게 만나 한 끼',prompt:'친구와 먹을 때 내가 고를 건?',foods:[3,2]},
] as const;
export {parseTaste as parseQuiz};
export function quizAnswers(mask:number){return tasteQuestions.map((_,i)=>(mask>>i)&1);}
export function quizMask(answers:number[]){return answers.reduce((mask,side,i)=>mask|(side<<i),0);}
export function quizSelections(mask:number){return tasteQuestions.map((q,i)=>q.foods[(mask>>i)&1]);}
export function quizScore(target:number,guess:number){return quizAnswers(target).filter((side,i)=>side===((guess>>i)&1)).length;}
export function quizMenuIndices(mask:number){return [...new Set(quizSelections(mask))];}
export function commonQuizMenus(a:number,b:number){const other=new Set(quizMenuIndices(b));return quizMenuIndices(a).filter(i=>other.has(i));}
export function quizVerdict(score:number){return score===6?'내 입맛, 거의 다 들켰네':score>=4?'우리 꽤 잘 먹고 다녔네':score>=2?'우리 밥 몇 번 먹었더라?':'다음 밥 약속이 시급해요';}
export function quizRows(mask:number){return quizSelections(mask).map((index,i)=>({scene:tasteQuestions[i].scene,name:tasteFoods[index].name}));}
