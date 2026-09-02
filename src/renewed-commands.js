'use strict'

const axios = require('axios')
const googleTTS = require('google-tts-api')

const DEFAULT_TIMEOUT = 15000

function withTimeout(promise, ms = DEFAULT_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
  ])
}

function cleanText(value = '') {
  return String(value).replace(/[<>]/g, '').trim()
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

function commandHelp(prefix = '.') {
  return [
    '*𝐌𝐈𝐀𝐍𝐱𝐁𝐀𝐃𝐒𝐇𝐀𝐇 MD — VERIFIED COMMANDS*',
    '',
    `${prefix}catfact — random cat fact`,
    `${prefix}dog — random dog image`,
    `${prefix}anime <name> — anime search`,
    `${prefix}ghibli — random Studio Ghibli film`,
    `${prefix}trivia — trivia question`,
    `${prefix}joke — safe random joke`,
    `${prefix}define <word> — dictionary lookup`,
    `${prefix}weather <city> — weather via Open-Meteo`,
    `${prefix}tts <text> — MP3 voice reply`,
    `${prefix}sticker — convert a replied image/video to sticker`,
    `${prefix}logo <text> — generate a clean logo card`,
    `${prefix}thumbnail <url> — fetch an image as thumbnail`,
    `${prefix}channelreact <channel-url> <message-id> <emoji> — real newsletter reaction`,
    '',
    '*All network calls have bounded timeouts and user-friendly errors.*'
  ].join('\n')
}

async function json(url, options = {}) {
  let lastError
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await withTimeout(axios.get(url, {
        timeout: DEFAULT_TIMEOUT,
        validateStatus: status => status >= 200 && status < 400,
        ...options
      }))
      return response.data
    } catch (error) {
      lastError = error
      const status = error.response?.status
      if (status && status < 429 && status < 500) throw error
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)))
    }
  }
  throw lastError
}

function targetHasProtectedName(text, mentionedJid = [], quotedName = '') {
  const normalized = `${text || ''} ${quotedName || ''}`.normalize('NFKC').toLowerCase()
  if (/mianxbadshah|mian\s*x\s*badshah/i.test(normalized)) return true
  return mentionedJid.some(jid => /mianx?badshah|mianx?badshah|mianxbadshah/i.test(String(jid)))
}

async function executeRenewedCommand({ command, text, prefix = '.', m, conn, reply }) {
  const q = cleanText(text)
  try {
    switch (command) {
      case 'renewedhelp':
      case 'newmenu':
        await reply(commandHelp(prefix)); return true
      case 'catfact': {
        const data = await json('https://catfact.ninja/fact')
        await reply(`*CAT FACT*\n\n${cleanText(data.fact)}`); return true
      }
      case 'dog':
      case 'dogpic': {
        const data = await json('https://dog.ceo/api/breeds/image/random')
        await conn.sendMessage(m.chat, { image: { url: data.message }, caption: '*RANDOM DOG*' }, { quoted: m }); return true
      }
      case 'anime': {
        if (!q) { await reply(`Usage: ${prefix}anime <name>`); return true }
        let item
        try {
          const data = await json(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=1`)
          item = data.data?.[0]
        } catch (_) {
          const response = await withTimeout(axios.post('https://graphql.anilist.co', {
            query: 'query ($search: String) { Page(page: 1, perPage: 1) { media(search: $search, type: ANIME) { title { romaji english } type episodes averageScore siteUrl } } }',
            variables: { search: q }
          }, { timeout: DEFAULT_TIMEOUT }))
          const fallback = response.data?.data?.Page?.media?.[0]
          if (fallback) item = { title: fallback.title.english || fallback.title.romaji, type: fallback.type, episodes: fallback.episodes, score: fallback.averageScore ? fallback.averageScore / 10 : null, url: fallback.siteUrl }
        }
        if (!item) { await reply('No anime found.'); return true }
        await reply(`*ANIME RESULT*\n\n*Title:* ${cleanText(item.title)}\n*Type:* ${item.type || 'N/A'}\n*Episodes:* ${item.episodes || 'N/A'}\n*Score:* ${item.score || 'N/A'}\n*URL:* ${item.url || 'N/A'}`)
        return true
      }
      case 'ghibli': {
        const data = await json('https://ghibliapi.vercel.app/films')
        const item = data[Math.floor(Math.random() * data.length)]
        await reply(`*STUDIO GHIBLI*\n\n*${cleanText(item.title)}* (${item.release_date})\n\n${cleanText(item.description).slice(0, 700)}`); return true
      }
      case 'trivia': {
        const data = await json('https://opentdb.com/api.php?amount=1&type=multiple')
        const item = data.results?.[0]
        if (!item) throw new Error('Trivia unavailable')
        const answers = [...item.incorrect_answers, item.correct_answer].sort(() => Math.random() - 0.5)
        await reply(`*TRIVIA*\n\n${decodeHtml(item.question)}\n\n${answers.map((a, i) => `${i + 1}. ${decodeHtml(a)}`).join('\n')}\n\nReply with the correct number.`); return true
      }
      case 'joke': {
        const data = await json('https://official-joke-api.appspot.com/random_joke')
        await reply(`*JOKE*\n\n${cleanText(data.setup)}\n\n${cleanText(data.punchline)}`); return true
      }
      case 'define': {
        if (!q) { await reply(`Usage: ${prefix}define <word>`); return true }
        let definition
        let partOfSpeech = 'word'
        try {
          const data = await json(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`)
          const entry = data[0]
          const meaning = entry.meanings?.[0]
          definition = meaning?.definitions?.[0]?.definition
          partOfSpeech = meaning?.partOfSpeech || partOfSpeech
        } catch (_) {
          const data = await json(`https://api.datamuse.com/words?sp=${encodeURIComponent(q)}&md=d&max=1`)
          definition = data[0]?.defs?.[0]?.replace(/^\\w\\t/, '')
        }
        if (!definition) throw new Error('Word not found')
        await reply(`*DICTIONARY*\\n\\n*${q}* — ${partOfSpeech}\\n${cleanText(definition)}`); return true
      }
      case 'weather': {
        if (!q) { await reply(`Usage: ${prefix}weather <city>`); return true }
        const places = await json(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`)
        const place = places.results?.[0]
        if (!place) throw new Error('City not found')
        const data = await json(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`)
        const c = data.current
        await reply(`*WEATHER — ${cleanText(place.name)}*\n\nTemperature: ${c.temperature_2m}°C\nHumidity: ${c.relative_humidity_2m}%\nWind: ${c.wind_speed_10m} km/h\nTimezone: ${data.timezone}`); return true
      }
      case 'tts': {
        if (!q) { await reply(`Usage: ${prefix}tts <text>`); return true }
        const url = googleTTS.getAudioUrl(q.slice(0, 400), { lang: 'en', slow: false, host: 'https://translate.google.com' })
        await conn.sendMessage(m.chat, { audio: { url }, mimetype: 'audio/mpeg', ptt: false }, { quoted: m }); return true
      }
      case 'sticker': {
        const quoted = m.quoted
        if (!quoted || !quoted.download) { await reply(`Reply to an image/video with ${prefix}sticker`); return true }
        const buffer = await withTimeout(quoted.download())
        const sharp = require('sharp')
        const webp = await sharp(buffer, { failOn: 'none' }).resize(512, 512, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
        await conn.sendMessage(m.chat, { sticker: webp, mimetype: 'image/webp' }, { quoted: m }); return true
      }
      case 'logo': {
        if (!q) { await reply(`Usage: ${prefix}logo <text>`); return true }
        const safe = q.slice(0, 48).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop stop-color="#111827"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><circle cx="1050" cy="100" r="180" fill="#ffffff" opacity=".08"/><text x="600" y="330" text-anchor="middle" fill="white" font-family="Arial" font-size="86" font-weight="700">${safe}</text><text x="600" y="410" text-anchor="middle" fill="#ddd6fe" font-family="Arial" font-size="28">𝐌𝐈𝐀𝐍𝐱𝐁𝐀𝐃𝐒𝐇𝐀𝐇 MD</text></svg>`
        const sharp = require('sharp')
        const image = await sharp(Buffer.from(svg)).png().toBuffer()
        await conn.sendMessage(m.chat, { image, caption: `*LOGO CREATED*\n${q}` }, { quoted: m }); return true
      }
      case 'thumbnail': {
        if (!/^https?:\/\//i.test(q)) { await reply(`Usage: ${prefix}thumbnail <https-url>`); return true }
        const response = await withTimeout(axios.get(q, { responseType: 'arraybuffer', timeout: DEFAULT_TIMEOUT, maxContentLength: 8 * 1024 * 1024 }))
        await conn.sendMessage(m.chat, { image: Buffer.from(response.data), caption: '*THUMBNAIL*' }, { quoted: m }); return true
      }
      case 'channelreact': {
        const [channelUrl, messageId, emoji = '❤️'] = q.split(/\s+/)
        if (!channelUrl || !messageId || !/^https?:\/\/whatsapp\.com\/channel\//i.test(channelUrl)) { await reply(`Usage: ${prefix}channelreact <channel-url> <message-id> <emoji>`); return true }
        if (typeof conn.newsletterReactMessage !== 'function') throw new Error('This Baileys version does not support newsletter reactions')
        const channelId = channelUrl.split('/').pop()
        const info = await withTimeout(conn.newsletterMetadata('invite', channelId))
        await withTimeout(conn.newsletterReactMessage(info.id, messageId, emoji.slice(0, 2)))
        await reply('Newsletter reaction sent successfully.'); return true
      }
      default: return false
    }
  } catch (error) {
    await reply(`Command failed safely: ${error.message || 'temporary service error'}`)
    return true
  }
}

module.exports = { executeRenewedCommand, commandHelp, targetHasProtectedName, withTimeout }
