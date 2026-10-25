import test from 'node:test';
import assert from 'node:assert/strict';
import { norm, findWord } from 'lib/match';

test('norm strips diacritics, tatweel, spacing and punctuation', () => {
  assert.equal(norm('مَرْحَبًا ـــ بِكُمْ!'), 'مرحبابكم');
  assert.equal(norm('Hello,  World...'), 'helloworld');
});

test('norm folds alef, teh marbuta, yeh and hamza variants', () => {
  assert.equal(norm('أإآ'), 'ااا');
  assert.equal(norm('مدرسة'), 'مدرسه');
  assert.equal(norm('على'), 'علي');
  assert.equal(norm('مؤمن'), 'مومن');
  assert.equal(norm('شئ'), 'شي');
});

test('findWord returns the original phrase when the text contains it loosely', () => {
  const words = ['join my channel', 'بيع متابعين'];
  assert.equal(findWord('Please JOIN   my-channel now', words), 'join my channel');
  assert.equal(findWord('عندنا بَيْعِ مُتَابِعِين رخيص', words), 'بيع متابعين');
  assert.equal(findWord('بيع، متابعين', words), 'بيع متابعين');
});

test('findWord returns null for empty text, empty phrases and no match', () => {
  assert.equal(findWord('', ['x']), null);
  assert.equal(findWord('hello', ['', '   ']), null);
  assert.equal(findWord('hello', ['bye']), null);
});
