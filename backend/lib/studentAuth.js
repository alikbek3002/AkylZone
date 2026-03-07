const crypto = require('crypto');

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12h

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET in environment');
  }

  return secret;
}

function getTokenTtlSeconds() {
  const ttlFromEnv = Number(process.env.STUDENT_TOKEN_TTL_SECONDS);
  if (!Number.isNaN(ttlFromEnv) && ttlFromEnv > 0) {
    return ttlFromEnv;
  }

  return DEFAULT_TOKEN_TTL_SECONDS;
}

function safeEqual(a, b) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function signStudentToken(payload = {}) {
  const tokenPayload = {
    ...payload,
    role: 'student',
    exp: Math.floor(Date.now() / 1000) + getTokenTtlSeconds(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(tokenPayload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function verifyStudentToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac('sha256', getSecret())
    .update(encodedPayload)
    .digest('base64url');

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload?.exp || Date.now() / 1000 >= payload.exp) {
    return null;
  }

  if (payload.role !== 'student') {
    return null;
  }

  return payload;
}

module.exports = {
  hashPassword,
  signStudentToken,
  verifyStudentToken,
};
