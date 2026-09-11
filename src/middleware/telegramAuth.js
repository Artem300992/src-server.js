import crypto from 'node:crypto';
import { db } from '../db/index.js';

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // initData older than this is rejected

/**
 * Validates Telegram Mini App initData per the official scheme:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Expects header: Authorization: tma <initData>
 * where <initData> is the raw query string Telegram gives the frontend
 * via window.Telegram.WebApp.initData — send it unmodified, don't re-encode it.
 */
export function telegramAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const [scheme, initData] = authHeader.split(' ');

  if (scheme !== 'tma' || !initData) {
    return res.status(401).json({ error: 'missing_init_data' });
  }

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return res.status(401).json({ error: 'invalid_init_data' });
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) {
    return res.status(401).json({ error: 'invalid_signature' });
  }

  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) {
    return res.status(401).json({ error: 'init_data_expired' });
  }

  const userRaw = params.get('user');
  if (!userRaw) return res.status(401).json({ error: 'no_user_in_init_data' });
  const user = JSON.parse(userRaw);

  upsertUser(user);
  req.telegramUser = user;
  next();
}

function upsertUser(user) {
  db.prepare(`
    INSERT INTO users (telegram_id, username, first_name, last_active_at)
    VALUES (@id, @username, @first_name, datetime('now'))
    ON CONFLICT(telegram_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      last_active_at = datetime('now')
  `).run({
    id: user.id,
    username: user.username || null,
    first_name: user.first_name || null,
  });
}
