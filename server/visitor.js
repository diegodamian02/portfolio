// Turns a request into the handful of non-identifying fields the db module
// stores: a visitor hash, a country, and a coarse device/browser guess.
//
// No raw IP ever reaches a table. `visitorHash` is a one-way digest of the IP,
// User-Agent and the current day — it lets two rows be recognised as "the same
// visitor" without being reversible to an address, and it changes every day so
// rows can't be joined into a longer history. This is the same shape Plausible
// and Fathom use for cookieless analytics.
import crypto from 'crypto';

// Rotates daily so no single value can be used to track a visitor across days.
// Not a secret — its only job is to make the hash non-obvious, not to gate
// access to anything.
const SALT_SEED = process.env.VISITOR_SALT || 'portfolio-visitor';

function dailySalt() {
    return `${SALT_SEED}:${new Date().toISOString().slice(0, 10)}`;
}

export function visitorHash(ip, userAgent) {
    return crypto
        .createHash('sha256')
        .update(`${dailySalt()}|${ip}|${userAgent || ''}`)
        .digest('hex')
        .slice(0, 16); // enough to distinguish visitors, short enough to skim in a query console
}

// Deliberately coarse — three buckets, not a full OS/device model breakdown.
// Order matters: iPad's UA contains "Mobile" on recent iPadOS versions, so
// tablet must be checked before the mobile regex would wrongly claim it.
export function classifyDevice(userAgent) {
    const ua = userAgent || '';
    if (/iPad|Tablet(?!.*Mobile)|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
    if (/Mobi|iPhone|Android/i.test(ua)) return 'mobile';
    return 'desktop';
}

// Checked in an order that resolves the real ambiguities: Edge and Chrome
// both carry "Chrome" in their UA, and Chrome on iOS carries "Safari" too, so
// the more specific token has to win first.
export function classifyBrowser(userAgent) {
    const ua = userAgent || '';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/OPR\/|Opera/.test(ua)) return 'Opera';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/CriOS|Chrome\//.test(ua)) return 'Chrome';
    if (/Safari\//.test(ua)) return 'Safari';
    return 'Other';
}

// One call per request, giving server.js everything it needs for any of the
// three tables without repeating the header-reading logic at each call site.
export function visitorContext(req) {
    const ip = req.get('CF-Connecting-IP') || req.ip || 'unknown';
    const userAgent = req.get('User-Agent') || '';
    return {
        visitor: visitorHash(ip, userAgent),
        country: req.get('CF-IPCountry') || null,
        device: classifyDevice(userAgent),
        browser: classifyBrowser(userAgent),
    };
}
