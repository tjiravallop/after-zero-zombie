import assert from 'node:assert/strict';
import { buildStoryHistory, storyLogKey, storyText } from '../src/components/StoryFeed';

const log = [
  { id: 3, day: 2, text: 'เขารับของแล้วถอยกลับหลังประตู', kind: 'story' },
  { id: 2, day: 2, text: 'คนหลังประตู — วางยาให้แล้วถอย', kind: 'story' },
  { id: 1, day: 1, text: 'เจ้าลืมตาขึ้น', kind: 'story' },
];
const history = buildStoryHistory(log);
assert.equal(history.length, 2);
assert.equal(history[0].title, 'คนหลังประตู');
assert.equal(history[0].choice, 'วางยาให้แล้วถอย');
assert.equal(history[0].text, 'เขารับของแล้วถอยกลับหลังประตู');
assert.equal(buildStoryHistory(log, log.slice(0, 2).map(storyLogKey)).length, 1);
assert.equal(storyText('[ภัยพื้นที่ 60/100 · โอกาสปะทะ 15%] เขายิงจากแนวกั้น (สภาพร่าง -5)'), 'เขายิงจากแนวกั้น');
assert.equal(storyText('เจ้าจำชื่อบนรูปได้ · สติ +4'), 'เจ้าจำชื่อบนรูปได้');
assert.equal(buildStoryHistory(['ความทรงจำจากเซฟเก่า'])[0].text, 'ความทรงจำจากเซฟเก่า');
assert.equal(buildStoryHistory([]).length, 0);
// A different day's entry must not be joined to a later decision.
assert.equal(buildStoryHistory([{ ...log[0], day: 3 }, log[1]]).length, 2);
console.log('Story feed checks passed');
