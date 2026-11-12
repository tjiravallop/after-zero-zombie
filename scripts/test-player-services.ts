import assert from 'node:assert/strict';
import {endingCollection} from '../src/data/endingCollection';
import {encodeCloudSave, decodeCloudSave, queueLifeStart, queueLifeEnding, queueLifeEndings} from '../src/services/playerBackend';

const catalog = {death: {title: 'known', text: 'earned'}, secret: {title: 'SECRET NAME', text: 'SECRET REQUIREMENT'}};
assert.deepEqual(endingCollection(catalog, []), [{unlocked: false}, {unlocked: false}]);
const collection = endingCollection(catalog, [{endingId: 'death'}, {endingId: 'death'}, {endingId: 'unknown'}]);
assert.equal(collection.filter(entry => entry.unlocked).length, 1);
assert(!JSON.stringify(collection).includes('SECRET'));
assert.equal(endingCollection(catalog, [], {endingId: 'death'})[0].unlocked, true);

const original = JSON.stringify({version: 'save', playerName: 'ผู้ติดเชื้อ', pastLives: Array(500).fill({endingId: 'death'})});
assert.equal(await decodeCloudSave(await encodeCloudSave(original)), original);
await assert.rejects(() => decodeCloudSave('!invalid base64'));
await assert.rejects(() => decodeCloudSave('x'.repeat(900001)));
await assert.rejects(() => encodeCloudSave('x'.repeat(10 * 1024 * 1024 + 1)));

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
}});
queueLifeStart('run-a');
queueLifeStart('run-a');
queueLifeEnding('imported-run', 'death');
queueLifeEnding('run-a', 'death');
queueLifeEnding('run-a', 'secret');
assert.deepEqual(JSON.parse([...memory.values()][0]), [{runId: 'run-a', endingId: 'death'}]);
queueLifeStart('run-b');
queueLifeEndings([{runId: 'run-a', endingId: 'secret'}, {runId: 'run-b', endingId: 'death'}, {runId: 'not-started', endingId: 'secret'}]);
assert.deepEqual(JSON.parse([...memory.values()][0]), [{runId: 'run-a', endingId: 'death'}, {runId: 'run-b', endingId: 'death'}]);
console.log('Player services: locked endings, save codec limits, and duplicate life events passed.');
