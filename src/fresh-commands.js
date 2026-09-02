'use strict'

const axios = require('axios')
const googleTTS = require('google-tts-api')

const TIMEOUT = 12000
const MAX_TEXT = 1800

function clean(value = '') {
  return String(value).replace(/[<>]/g, '').trim().slice(0, MAX_TEXT)
}

function withTimeout(promise, ms = TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
  ])
}

async function getJson(url, options = {}) {
  const response = await withTimeout(axios.get(url, {
    timeout: TIMEOUT,
    validateStatus: status => status >= 200 && status < 400,
    maxContentLength: 4 * 1024 * 1024,
    ...options
  }))
  return response.data
}

function usage(prefix, name, args) {
  return `Usage: ${prefix}${name}${args ? ` ${args}` : ''}`
}

function menu(prefix = '.') {
  return [
    '*𝐌𝐈𝐀𝐍𝐱𝐁𝐀𝐃𝐒𝐇𝐀𝐇 MD — FRESH COMMANDS*',
    '',
    '*Facts & fun:* catfact, dog, dogfact, advice, joke, quote, uselessfact, chuck, kanye, number, trivia, bored',
    '*Search & knowledge:* define, wiki, anime, country, github, npm, ip, uuid',
    '*Weather & time:* weather, forecast, timezone, sunrise, sunset, moon',
    '*Utilities:* base64, hash, calc, qr, color, password, lorem, translate',
    '*Media:* tts, sticker, vv, thumbnail',
    '*Group/admin:* welcome, antilink, antidelete, groupinfo, tagall',
    '',
    'Network calls have timeouts, bounded response sizes and friendly failures.'
  ].join('\n')
}

function protectedName(text = '', mentioned = [], displayName = '') {
  const haystack = `${text} ${displayName}`.normalize('NFKC').toLowerCase()
  if (/(^|[^a-z0-9])shadow([^a-z0-9]|$)/i.test(haystack)) return true
  return mentioned.some(jid => /shadow/i.test(String(jid)))
}

async function execute({ command, text = '', prefix = '.', m, conn, reply }) {
  const q = clean(text)
  try {
    switch (command) {
      case 'menu': case 'help': case 'freshmenu':
        await reply(menu(prefix)); return true
      case 'catfact': case 'cat': {
        const d = await getJson('https://catfact.ninja/fact')
        await reply(`*CAT FACT*\n\n${clean(d.fact)}`); return true
      }
      case 'dog': case 'dogpic': {
        const d = await getJson('https://dog.ceo/api/breeds/image/random')
        await conn.sendMessage(m.chat, { image: { url: d.message }, caption: '*DOG PICTURE*' }, { quoted: m }); return true
      }
      case 'dogfact': {
        const d = await getJson('https://dog-api.kinduff.com/api/facts')
        await reply(`*DOG FACT*\n\n${clean(d.facts?.[0] || d.fact || 'No fact available')}`); return true
      }
      case 'advice': {
        const d = await getJson('https://api.adviceslip.com/advice')
        await reply(`*ADVICE*\n\n${clean(d.slip?.advice)}`); return true
      }
      case 'joke': {
        const d = await getJson('https://official-joke-api.appspot.com/random_joke')
        await reply(`*JOKE*\n\n${clean(d.setup)}\n\n${clean(d.punchline)}`); return true
      }
      case 'quote': case 'quotes': {
        const d = await getJson('https://api.quotable.io/random')
        await reply(`*QUOTE*\n\n“${clean(d.content)}”\n— ${clean(d.author)}`); return true
      }
      case 'uselessfact': case 'fact': {
        const d = await getJson('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en')
        await reply(`*FACT*\n\n${clean(d.text)}`); return true
      }
      case 'chuck': {
        const d = await getJson('https://api.chucknorris.io/jokes/random')
        await reply(`*CHUCK NORRIS*\n\n${clean(d.value)}`); return true
      }
      case 'kanye': {
        const d = await getJson('https://api.kanye.rest')
        await reply(`*KANYE QUOTE*\n\n${clean(d.quote)}`); return true
      }
      case 'number': case 'numberfact': {
        const n = q || 'random'
        const d = await getJson(`http://numbersapi.com/${encodeURIComponent(n)}` , { responseType: 'text' })
        await reply(`*NUMBER FACT*\n\n${clean(d)}`); return true
      }
      case 'trivia': {
        const d = await getJson('https://opentdb.com/api.php?amount=1&type=multiple')
        const r = d.results?.[0]
        if (!r) throw new Error('Trivia unavailable')
        await reply(`*TRIVIA*\n\n${clean(r.question)}\n\nCorrect answer: ${clean(r.correct_answer)}`); return true
      }
      case 'bored': {
        const d = await getJson('https://www.boredapi.com/api/activity')
        await reply(`*ACTIVITY*\n\n${clean(d.activity)}\nType: ${clean(d.type)}\nParticipants: ${d.participants}`); return true
      }
      case 'define': case 'meaning': {
        if (!q) { await reply(usage(prefix, command, '<word>')); return true }
        const d = await getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`)
        const meaning = d[0]?.meanings?.[0]
        await reply(`*DICTIONARY*\n\n${q} (${meaning?.partOfSpeech || 'word'})\n${clean(meaning?.definitions?.[0]?.definition || 'No definition found')}`); return true
      }
      case 'wiki': case 'wikipedia': {
        if (!q) { await reply(usage(prefix, command, '<topic>')); return true }
        const d = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`)
        await reply(`*WIKIPEDIA*\n\n${clean(d.title)}\n\n${clean(d.extract)}`); return true
      }
      case 'anime': {
        if (!q) { await reply(usage(prefix, command, '<name>')); return true }
        const d = await getJson(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=1`)
        const a = d.data?.[0]
        await reply(a ? `*ANIME*\n\n${clean(a.title)}\nType: ${a.type || 'N/A'}\nEpisodes: ${a.episodes || 'N/A'}\nScore: ${a.score || 'N/A'}\n${a.url || ''}` : 'Anime not found.'); return true
      }
      case 'country': case 'countryinfo': {
        if (!q) { await reply(usage(prefix, command, '<country>')); return true }
        const d = await getJson(`https://restcountries.com/v3.1/name/${encodeURIComponent(q)}`)
        const c = d[0]
        await reply(`*COUNTRY*\n\n${clean(c.name?.common)}\nCapital: ${clean(c.capital?.[0] || 'N/A')}\nRegion: ${clean(c.region)}\nPopulation: ${c.population?.toLocaleString() || 'N/A'}\nCode: ${c.cca2 || 'N/A'}`); return true
      }
      case 'weather': {
        if (!q) { await reply(usage(prefix, command, '<city>')); return true }
        const place = (await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`)).results?.[0]
        if (!place) throw new Error('City not found')
        const d = await getJson(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`)
        const c = d.current
        await reply(`*WEATHER — ${clean(place.name)}*\n\nTemperature: ${c.temperature_2m}°C\nHumidity: ${c.relative_humidity_2m}%\nWind: ${c.wind_speed_10m} km/h\nTimezone: ${d.timezone}`); return true
      }
      case 'uuid': {
        const d = await getJson('https://httpbin.org/uuid')
        await reply(`*UUID*\n\n${clean(d.uuid)}`); return true
      }
      case 'ip': case 'ipinfo': {
        const ip = q || ''
        const d = await getJson(`https://ipwho.is/${encodeURIComponent(ip)}`)
        await reply(`*IP INFO*\n\nIP: ${clean(d.ip)}\nCountry: ${clean(d.country)}\nCity: ${clean(d.city)}\nISP: ${clean(d.connection?.isp || 'N/A')}`); return true
      }
      case 'base64': {
        if (!q) { await reply(usage(prefix, command, '<text>')); return true }
        await reply(Buffer.from(q).toString('base64')); return true
      }
      case 'decode64': {
        if (!q) { await reply(usage(prefix, command, '<base64>')); return true }
        await reply(clean(Buffer.from(q, 'base64').toString('utf8'))); return true
      }
      case 'calc': {
        if (!/^[0-9+*/().%\-\s]+$/.test(q)) { await reply('Sirf basic numeric calculation allowed hai.'); return true }
        const result = Function(`"use strict"; return (${q})`)()
        await reply(`*CALC*\n\n${q} = ${result}`); return true
      }
      case 'tts': {
        if (!q) { await reply(usage(prefix, command, '<text>')); return true }
        const url = googleTTS.getAudioUrl(q.slice(0, 400), { lang: 'en', slow: false, host: 'https://translate.google.com' })
        const d = await withTimeout(axios.get(url, { responseType: 'arraybuffer', timeout: TIMEOUT, maxContentLength: 5 * 1024 * 1024 }))
        await conn.sendMessage(m.chat, { audio: Buffer.from(d.data), mimetype: 'audio/mpeg', ptt: false }, { quoted: m }); return true
      }
      case 'protectcheck': {
        await reply(protectedName(q, m.mentionedJid || [], m.quoted?.pushName || '') ? 'Protected name detected; abusive response blocked.' : 'No protected name detected.'); return true
      }
      default: return false
    }
  } catch (error) {
    await reply(`Command failed safely: ${clean(error.message || 'temporary service error')}`)
    return true
  }
}

module.exports = { execute, menu, protectedName, withTimeout }
