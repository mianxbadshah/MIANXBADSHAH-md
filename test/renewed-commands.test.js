'use strict'
const assert = require('node:assert/strict')
const { executeRenewedCommand, targetHasProtectedName, withTimeout } = require('../src/renewed-commands')

async function main() {
  assert.equal(targetHasProtectedName('𝐌𝐈𝐀𝐍𝐱𝐁𝐀𝐃𝐒𝐇𝐀𝐇 MD harami', [], ''), true)
  assert.equal(targetHasProtectedName('hello', [], '𝐌𝐈𝐀𝐍𝐱𝐁𝐀𝐃𝐒𝐇𝐀𝐇 MD Official'), true)
  assert.equal(targetHasProtectedName('hello', [], 'Alice'), false)
  assert.equal(await withTimeout(Promise.resolve('ok'), 100), 'ok')
  await assert.rejects(() => withTimeout(new Promise(() => {}), 15), /timed out/)

  const replies = []
  const sent = []
  const conn = { sendMessage: async (...args) => { sent.push(args); return { key: { id: 'test' } } } }
  const m = { chat: 'test@s.whatsapp.net', quoted: null }
  const reply = async value => replies.push(String(value))

  assert.equal(await executeRenewedCommand({ command: 'catfact', text: '', prefix: '.', m, conn, reply }), true)
  assert.match(replies.at(-1), /CAT FACT/)
  assert.equal(await executeRenewedCommand({ command: 'joke', text: '', prefix: '.', m, conn, reply }), true)
  assert.match(replies.at(-1), /JOKE/)
  assert.equal(await executeRenewedCommand({ command: 'anime', text: 'Naruto', prefix: '.', m, conn, reply }), true)
  assert.match(replies.at(-1), /ANIME RESULT/)
  assert.equal(await executeRenewedCommand({ command: 'ghibli', text: '', prefix: '.', m, conn, reply }), true)
  assert.match(replies.at(-1), /STUDIO GHIBLI/)
  assert.equal(await executeRenewedCommand({ command: 'trivia', text: '', prefix: '.', m, conn, reply }), true)
  assert.match(replies.at(-1), /TRIVIA/)
  assert.equal(await executeRenewedCommand({ command: 'define', text: 'hello', prefix: '.', m, conn, reply }), true)
  assert.match(replies.at(-1), /DICTIONARY/)
  assert.equal(await executeRenewedCommand({ command: 'weather', text: 'London', prefix: '.', m, conn, reply }), true)
  assert.match(replies.at(-1), /WEATHER/)
  assert.equal(await executeRenewedCommand({ command: 'dog', text: '', prefix: '.', m, conn, reply }), true)
  assert.equal(sent.at(-1)[1].image.url.includes('dog.ceo'), true)
  assert.equal(await executeRenewedCommand({ command: 'tts', text: 'hello from mianxbadshah md', prefix: '.', m, conn, reply }), true)
  assert.equal(sent.at(-1)[1].mimetype, 'audio/mpeg')
  assert.equal(await executeRenewedCommand({ command: 'logo', text: 'TEST LOGO', prefix: '.', m, conn, reply }), true)
  assert.equal(Buffer.isBuffer(sent.at(-1)[1].image), true)
  assert.equal(sent.at(-1)[1].image.slice(0, 8).toString('hex'), '89504e470d0a1a0a')
  const mediaMessage = { download: async () => require('fs').readFileSync('./media/image1.jpg') }
  m.quoted = mediaMessage
  assert.equal(await executeRenewedCommand({ command: 'sticker', text: '', prefix: '.', m, conn, reply }), true)
  assert.equal(Boolean(sent.at(-1)[1].sticker), true)
  m.quoted = null
  assert.equal(await executeRenewedCommand({ command: 'thumbnail', text: 'not-a-url', prefix: '.', m, conn, reply }), true)
  assert.match(replies.at(-1), /Usage: \.thumbnail/)
  assert.equal(await executeRenewedCommand({ command: 'channelreact', text: 'https://example.com x ❤️', prefix: '.', m, conn, reply }), true)
  assert.match(replies.at(-1), /Usage: \.channelreact/)
  assert.equal(await executeRenewedCommand({ command: 'unknown', text: '', prefix: '.', m, conn, reply }), false)
  console.log('renewed command tests: PASS')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
