import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if(args.some(arg=>!/^--target=\d+$/.test(arg)))throw new Error('Usage: npm run catalog:expand -- --target=2000');
const cwd = fileURLToPath(new URL('../', import.meta.url));
function run(mode) {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--env-file=.env.local','scripts/expand-diverse-catalog.mjs',mode,...args],{cwd,stdio:'inherit',windowsHide:true});
    child.on('error',reject);
    child.on('exit',(code,signal)=>code===0?resolve():reject(new Error(`Catalog ${mode} stopped (${signal??code}). Saved progress can be resumed; no automatic import was performed after a failed collection.`)));
  });
}
try {
  console.log('Collecting Korean products. Keep this terminal open; rerunning resumes saved progress.');
  await run('--resume');
  console.log('Collection complete. Inserting new Korean products; existing products stay unchanged.');
  await run('--apply');
}catch(error){console.error(error.message);process.exitCode=1;}
