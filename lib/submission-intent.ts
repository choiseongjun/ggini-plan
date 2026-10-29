const key='ggini-submission-return';
export function rememberSubmissionReturn(){try{sessionStorage.setItem(key,String(Date.now()));}catch{}}
export function pendingSubmissionReturn(){try{const raw=sessionStorage.getItem(key),age=Date.now()-Number(raw);return raw&&age>=0&&age<30*60_000?'/submissions?kind=food':null;}catch{return null;}}
export function clearSubmissionReturn(){try{sessionStorage.removeItem(key);}catch{}}
