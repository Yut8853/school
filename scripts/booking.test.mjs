import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../booking/Code.gs', import.meta.url), 'utf8');
function app(failAt = 0) {
  const messages = [];
  let released = false;
  const context = vm.createContext({
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => { released = true; } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
    MailApp: { sendEmail: message => { messages.push(message); if (messages.length === failAt) throw new Error('Mail failure'); } }
  });
  vm.runInContext(source, context);
  return { post: payload => context.doPost({ postData: { contents: JSON.stringify(payload) } }), messages, released: () => released };
}
const valid = { mode: 'apply', name: 'Test', email: 'student@example.com', agree: true, goals: ['HTML'], message: 'Test only' };
test('application reaches configured recipient without requiring a booking slot', () => {
  const a = app(); const result = a.post(valid);
  assert.equal(result.ok, true);
  assert.equal(a.messages.length, 2);
  assert.equal(a.messages[0].to, 'factory0611@gmail.com');
  assert.equal(a.messages[0].replyTo, valid.email);
  assert.equal(a.messages[1].to, valid.email);
  assert.equal(a.messages[1].replyTo, 'hello@junkbranding.com');
  assert.equal(a.released(), true);
});
test('invalid email or missing consent sends no mail', () => {
  for (const payload of [{ ...valid, email: 'bad' }, { ...valid, agree: false }]) {
    const a = app(); assert.equal(a.post(payload).error, 'invalid_input'); assert.equal(a.messages.length, 0);
  }
});
test('honeypot sends no mail', () => {
  const a = app(); a.post({ ...valid, website: 'spam' }); assert.equal(a.messages.length, 0);
});
test('owner delivery failure does not report success', () => {
  const a = app(1); assert.equal(a.post(valid).ok, false); assert.equal(a.released(), true);
});
test('confirmation failure keeps accepted application without inviting duplicate submission', () => {
  const a = app(2); const result = a.post(valid);
  assert.equal(result.ok, true); assert.equal(result.confirmationSent, false);
});
test('booking without a valid slot is still rejected', () => {
  const a = app(); assert.equal(a.post({ name: valid.name, email: valid.email }).error, 'invalid_slot');
  assert.equal(a.messages.length, 0);
});
