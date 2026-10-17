import {storyStateLabel,storySummary} from './stories.presenter';
import type {StoryStop} from '../types';
const equal=(a:string,b:string)=>{if(a!==b) throw new Error(`${a} != ${b}`);};
const stop:StoryStop={id:'story-01',title:'Test',title_en:'Test',level:'A1',order_index:1,state:'current',answered:0};
equal(storyStateLabel(stop),'Your next adventure');equal(storyStateLabel({...stop,answered:3}),'3/6 answered');
equal(storyStateLabel({...stop,state:'skipped'}),'Skipped');equal(storyStateLabel({...stop,state:'locked'}),'Ahead on the path');
equal(storySummary([stop,{...stop,id:'story-02',state:'completed'},{...stop,id:'story-03',state:'skipped'}]),'1 completed · 1 skipped · 3 stories');
console.log('Stories display states and summary passed.');
