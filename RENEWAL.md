# 𝐌𝐈𝐀𝐍𝐱𝐁𝐀𝐃𝐒𝐇𝐀𝐇 MD Renewal

This archive adds a timeout-safe command registry at `src/renewed-commands.js` and integrates it before the legacy dispatcher. Network calls are bounded, failures are converted into user-facing replies, and the bot no longer ships the previously embedded Groq, Tenor, or OMDb credentials.

## Verified commands

The new no-key integrations are `renewedhelp`, `newmenu`, `catfact`, `dog`, `dogpic`, `anime`, `ghibli`, `trivia`, `joke`, `define`, and `weather`. Media features include `tts`, `sticker`, `logo`, and `thumbnail`. `channelreact` performs a real WhatsApp newsletter reaction when the installed Baileys version supports it; it does not fabricate a fake reaction.

The protected-name fix prevents the fun check/insult-style commands from scoring or insulting a target whenever the protected owner alias appears in the command text or the quoted profile name. The requester receives a neutral redirect response instead. Anti-bad-word moderation also ignores messages containing the protected owner alias.

## Setup

Run `npm install`, copy `.env.example` to `.env`, and fill only the optional keys you own. Then run `npm test` before starting the bot with `npm start`. Native media commands may require the platform build of `sharp` and FFmpeg, depending on the deployment environment.

The archive intentionally excludes `node_modules`, session files, temporary downloads, and secrets. Never commit `.env` or authentication/session data.
