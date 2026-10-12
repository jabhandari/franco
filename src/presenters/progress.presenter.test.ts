import { skillCompletion } from './progress.presenter.ts';
import type { SkillProgress } from '../types';
function equal(actual: ReturnType<typeof skillCompletion>,expected: ReturnType<typeof skillCompletion>) {
  if (JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error('Unexpected completion totals');
}
const rows: SkillProgress[]=[
  {skill:'lire',level:'A1',exercises_done:2,exercises_total:4,exercises_correct:1,percent:50},
  {skill:'lire',level:'A2',exercises_done:1,exercises_total:8,exercises_correct:1,percent:13},
  {skill:'ecouter',level:'A1',exercises_done:8,exercises_total:8,exercises_correct:8,percent:100},
];
equal(skillCompletion(rows,'lire'),{done:3,total:12,percent:25});
equal(skillCompletion(rows,'lire','A1'),{done:2,total:4,percent:50});
equal(skillCompletion(rows,'parler'),{done:0,total:0,percent:0});
equal(skillCompletion([],'lire'),{done:0,total:0,percent:0});
console.log('progress presenter tests passed');
