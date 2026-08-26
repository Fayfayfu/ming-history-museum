import assert from 'node:assert/strict';
import test from 'node:test';
import {buildPersonSearchIndex, buildSearchIndex, matchesPersonSearch, matchesSearchIndex} from './person_search.mjs';

const person = buildPersonSearchIndex({
  name: '唐寅',
  alt: '唐伯虎',
  category: '在野人物',
  office: '画家、诗人、书法家',
  hometown: '南直隶苏州府吴县',
  summary: '以书画谋生。',
  evaluation: '诗书画兼擅。',
  domains: ['文学艺术'],
});

test('人物检索支持姓名全拼与首字母', () => {
  assert.equal(matchesPersonSearch(person, 'tangyin'), true);
  assert.equal(matchesPersonSearch(person, 'tang yin'), true);
  assert.equal(matchesPersonSearch(person, 'ty'), true);
});

test('人物检索支持繁体名与别名的拼音', () => {
  assert.equal(matchesPersonSearch(person, '唐寅'), true);
  assert.equal(matchesPersonSearch(person, '唐伯虎'), true);
  assert.equal(matchesPersonSearch(person, 'tangbohu'), true);

  const emperor = buildPersonSearchIndex({name: '朱祁镇', alt: '明英宗'});
  assert.equal(matchesPersonSearch(emperor, '朱祁鎮'), true);
  assert.equal(matchesPersonSearch(emperor, 'zhuqizhen'), true);
});

test('人物检索保留既有中文字段检索，且不产生宽泛误命中', () => {
  assert.equal(matchesPersonSearch(person, '苏州'), true);
  assert.equal(matchesPersonSearch(person, '文学艺术'), true);
  assert.equal(matchesPersonSearch(person, 'zhangjuzheng'), false);
  assert.equal(matchesPersonSearch(person, ''), true);
});

test('事件检索支持标题、关联人物与别名的全拼、简拼和繁体字', () => {
  const event = {
    title: '北京保卫战',
    people: ['于谦', '朱祁镇'],
    category: '军事',
  };
  const search = buildSearchIndex([
    event.title,
    ...event.people,
    '少保于谦',
    '朱祁鎮',
  ]);
  const text = `${event.title} ${event.people.join(' ')} ${event.category}`;

  assert.equal(matchesSearchIndex(search, text, 'beijingbaoweizhan'), true);
  assert.equal(matchesSearchIndex(search, text, 'bjbwz'), true);
  assert.equal(matchesSearchIndex(search, text, '北京保衛戰'), true);
  assert.equal(matchesSearchIndex(search, text, 'shaobaoyuqian'), true);
  assert.equal(matchesSearchIndex(search, text, 'sbyq'), true);
  assert.equal(matchesSearchIndex(search, text, 'zhangjuzheng'), false);
});
