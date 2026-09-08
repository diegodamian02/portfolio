// Renders the owner-only analytics dashboard (GET /admin, wired in server.js)
// as one self-contained HTML string — inline CSS, no scripts, no external
// assets, charts drawn as plain CSS bars. The data comes from getDashboard()
// in db.js; everything visitor-authored (note text, names, search terms, track
// titles) is escaped here before it lands in the page.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

function num(n) {
    return Number(n || 0).toLocaleString('en-US');
}

// Short tz label for a given IANA zone, e.g. "CDT" — computed off "now" so it
// tracks DST rather than being hardcoded.
export function tzAbbr(tz) {
    try {
        return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
            .formatToParts(new Date())
            .find((p) => p.type === 'timeZoneName')?.value || tz;
    } catch {
        return tz;
    }
}

// "Sep 7, 2026, 3:42 PM"
function fmtAbs(value, tz) {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-US', {
        timeZone: tz, month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
}

// "3 hours ago" / "in 2 days" — largest sensible unit.
function fmtRel(value) {
    if (!value) return '';
    const diff = new Date(value).getTime() - Date.now();
    const abs = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const MIN = 60e3, HR = 3600e3, DAY = 86400e3;
    if (abs < 45e3) return 'just now';
    if (abs < HR) return rtf.format(Math.round(diff / MIN), 'minute');
    if (abs < DAY) return rtf.format(Math.round(diff / HR), 'hour');
    if (abs < 30 * DAY) return rtf.format(Math.round(diff / DAY), 'day');
    if (abs < 365 * DAY) return rtf.format(Math.round(diff / (30 * DAY)), 'month');
    return rtf.format(Math.round(diff / (365 * DAY)), 'year');
}

// The one-line stamp appended to the guestbook notification email (plain text,
// no markup) — shared here so the dashboard and the email agree on wording.
export function formatStamp({ at, tz, country, device, browser }) {
    const when = new Date(at).toLocaleString('en-US', {
        timeZone: tz, dateStyle: 'medium', timeStyle: 'short',
    });
    const where = [country || 'location unknown', device, browser].filter(Boolean).join(' · ');
    return `— Sent ${when} ${tzAbbr(tz)} · ${where}`;
}

// Horizontal CSS bars for a { key, count } / { label, value } list.
function barList(rows, { label, value, max }) {
    if (!rows.length) return `<p class="empty">Nothing yet.</p>`;
    const ceiling = max || Math.max(...rows.map(value), 1);
    return `<div class="bars">${rows.map((r) => {
        const v = value(r);
        const pct = Math.max((v / ceiling) * 100, 1.5);
        return `<div class="bar-row">
            <span class="bar-label">${esc(label(r))}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${pct.toFixed(1)}%"></span></span>
            <span class="bar-value">${num(v)}</span>
        </div>`;
    }).join('')}</div>`;
}

// Vertical bars, one per day.
function columnChart(series) {
    if (!series.length) return `<p class="empty">No plays in this window.</p>`;
    const ceiling = Math.max(...series.map((d) => d.count), 1);
    const step = Math.max(1, Math.round(series.length / 6));
    const cols = series.map((d, i) => {
        const pct = d.count ? Math.max((d.count / ceiling) * 100, 4) : 0;
        const showLabel = i === 0 || i === series.length - 1 || i % step === 0;
        const [, mm, dd] = d.day.split('-');
        return `<div class="col" title="${esc(d.day)}: ${d.count}">
            <span class="col-fill" style="height:${pct.toFixed(1)}%"></span>
            <span class="col-label">${showLabel ? `${Number(mm)}/${Number(dd)}` : ''}</span>
        </div>`;
    }).join('');
    return `<div class="chart"><div class="chart-cols">${cols}</div>
        <div class="chart-peak">peak ${ceiling}/day</div></div>`;
}

function statCard(label, value, sub) {
    return `<div class="stat">
        <div class="stat-value">${num(value)}</div>
        <div class="stat-label">${esc(label)}</div>
        ${sub ? `<div class="stat-sub">${esc(sub)}</div>` : ''}
    </div>`;
}

function windowNav(days, keyRaw, tz) {
    const q = (d) => `?key=${encodeURIComponent(keyRaw)}&tz=${encodeURIComponent(tz)}&days=${d}`;
    return ['7', '30', '90', 'all'].map((d) => {
        const on = d === days ? ' class="on"' : '';
        const text = d === 'all' ? 'all time' : `${d}d`;
        return `<a href="${q(d)}"${on}>${text}</a>`;
    }).join('');
}

function messagesSection(rows, tz) {
    if (!rows.length) {
        return `<section><h2>Guestbook notes</h2><p class="empty">No notes yet.</p></section>`;
    }
    const cards = rows.map((m) => {
        const email = m.email
            ? `<a href="mailto:${encodeURIComponent(m.email)}">${esc(m.email)}</a>`
            : '<span class="muted">no email left</span>';
        const meta = [m.country || '—', m.device, m.browser].filter(Boolean).map(esc).join(' · ');
        const delivered = m.delivered
            ? '<span class="pill ok">delivered</span>'
            : '<span class="pill warn">not delivered</span>';
        return `<article class="note">
            <div class="note-head">
                <div>
                    <strong>${esc(m.name || 'Anonymous')}</strong>
                    <span class="note-email">${email}</span>
                </div>
                <div class="note-when">
                    <span class="rel">${esc(fmtRel(m.at))}</span>
                    <span class="abs">${esc(fmtAbs(m.at, tz))}</span>
                </div>
            </div>
            <p class="note-body">${esc(m.message)}</p>
            <div class="note-foot">${delivered}<span class="muted">${meta}</span></div>
        </article>`;
    }).join('');
    return `<section><h2>Guestbook notes <span class="count">${rows.length}</span></h2>
        <div class="notes">${cards}</div></section>`;
}

function listenersSection(rows, tz) {
    if (!rows.length) {
        return `<section><h2>Listeners</h2><p class="empty">No plays in this window.</p></section>`;
    }
    const body = rows.map((l) => {
        const who = [l.country || '—', l.device, l.browser].filter(Boolean).map(esc).join(' · ');
        const shown = (l.tracks || []).filter(Boolean).slice(0, 15);
        const hidden = l.plays - shown.length;
        const more = hidden > 0 ? ` <span class="muted">+${hidden} more</span>` : '';
        const span = l.firstAt && l.lastAt && String(l.firstAt) !== String(l.lastAt)
            ? `${fmtAbs(l.firstAt, tz)} → ${fmtAbs(l.lastAt, tz)}`
            : fmtAbs(l.lastAt || l.firstAt, tz);
        return `<tr>
            <td><code>${esc(String(l.visitor).slice(0, 8))}</code><div class="muted small">${who}</div></td>
            <td class="num">${num(l.plays)}</td>
            <td>${shown.map(esc).join(', ')}${more}<div class="muted small">${esc(span)}</div></td>
        </tr>`;
    }).join('');
    return `<section><h2>Listeners <span class="count">${rows.length}</span></h2>
        <p class="hint">One row per visitor (a daily-rotating hash — the same person is a new row each day, by design).</p>
        <table class="grid">
            <thead><tr><th>Visitor</th><th class="num">Plays</th><th>Tracks played, in order</th></tr></thead>
            <tbody>${body}</tbody>
        </table></section>`;
}

function searchesSection(rows) {
    if (!rows.length) {
        return `<section><h2>Searches</h2><p class="empty">No searches in this window.</p></section>`;
    }
    const body = rows.map((s) => `<tr>
        <td>${esc(s.term)}</td>
        <td class="num">${num(s.clicks)}</td>
        <td class="num">${num(s.searchers)}</td>
        <td class="muted">${(s.picked || []).filter(Boolean).map(esc).join(', ')}</td>
    </tr>`).join('');
    return `<section><h2>Searches that led to a pick <span class="count">${rows.length}</span></h2>
        <table class="grid">
            <thead><tr><th>Term</th><th class="num">Picks</th><th class="num">People</th><th>What they picked</th></tr></thead>
            <tbody>${body}</tbody>
        </table></section>`;
}

const STYLES = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body {
    margin: 0; padding: 2rem 1.25rem 4rem;
    background: #0e0f13; color: #e8e9ec;
    font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.wrap { max-width: 940px; margin: 0 auto; }
a { color: #7aa2ff; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; color: #b9c4e6; }
h1 { font-size: 1.35rem; margin: 0; }
h2 { font-size: 1.05rem; margin: 2.4rem 0 0.9rem; border-bottom: 1px solid #23252e; padding-bottom: 0.4rem; }
.count { color: #7f8694; font-weight: 400; font-size: 0.85rem; }
header { display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; align-items: baseline; justify-content: space-between; }
header .sub { color: #7f8694; font-size: 0.85rem; width: 100%; }
.nav a { display: inline-block; padding: 0.2rem 0.6rem; border: 1px solid #2b2e39; border-radius: 999px; text-decoration: none; margin-left: 0.3rem; font-size: 0.85rem; }
.nav a.on { background: #7aa2ff; border-color: #7aa2ff; color: #0e0f13; font-weight: 600; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-top: 1.4rem; }
.stat { background: #16171d; border: 1px solid #23252e; border-radius: 10px; padding: 0.9rem; }
.stat-value { font-size: 1.6rem; font-weight: 650; }
.stat-label { color: #9aa0ad; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
.stat-sub { color: #6f7684; font-size: 0.78rem; margin-top: 0.2rem; }
.hint, .note-body, .small { }
.hint { color: #7f8694; font-size: 0.83rem; margin: 0 0 0.8rem; }
.empty { color: #7f8694; font-style: italic; }
.muted { color: #8b91a0; }
.small { font-size: 0.8rem; }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
/* bars */
.bars { display: flex; flex-direction: column; gap: 0.35rem; }
.bar-row { display: grid; grid-template-columns: minmax(0, 14rem) 1fr auto; gap: 0.75rem; align-items: center; }
.bar-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-track { background: #1c1e26; border-radius: 4px; height: 0.85rem; overflow: hidden; }
.bar-fill { display: block; height: 100%; background: linear-gradient(90deg, #5b78d6, #7aa2ff); }
.bar-value { font-variant-numeric: tabular-nums; color: #b9c4e6; font-size: 0.85rem; }
/* column chart */
.chart { background: #16171d; border: 1px solid #23252e; border-radius: 10px; padding: 1rem 1rem 0.4rem; }
.chart-cols { display: flex; align-items: flex-end; gap: 2px; height: 150px; }
.col { flex: 1 1 0; min-width: 2px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.col-fill { width: 100%; max-width: 22px; background: linear-gradient(180deg, #7aa2ff, #4c62b8); border-radius: 2px 2px 0 0; }
.col-label { font-size: 0.62rem; color: #6f7684; margin-top: 0.25rem; height: 0.8rem; white-space: nowrap; }
.chart-peak { text-align: right; color: #6f7684; font-size: 0.75rem; margin-top: 0.3rem; }
/* notes */
.notes { display: flex; flex-direction: column; gap: 0.8rem; }
.note { background: #16171d; border: 1px solid #23252e; border-left: 3px solid #7aa2ff; border-radius: 8px; padding: 0.9rem 1rem; }
.note-head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.note-email { margin-left: 0.5rem; font-size: 0.85rem; }
.note-when { text-align: right; font-size: 0.8rem; }
.note-when .rel { display: block; color: #e8e9ec; }
.note-when .abs { color: #7f8694; }
.note-body { white-space: pre-wrap; word-break: break-word; margin: 0.6rem 0; }
.note-foot { display: flex; gap: 0.75rem; align-items: center; font-size: 0.82rem; }
.pill { font-size: 0.72rem; padding: 0.1rem 0.5rem; border-radius: 999px; }
.pill.ok { background: #16351f; color: #6bd48b; }
.pill.warn { background: #3a2410; color: #f0a860; }
/* tables */
table.grid { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
table.grid th { text-align: left; color: #9aa0ad; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.4rem 0.6rem; border-bottom: 1px solid #23252e; }
table.grid td { padding: 0.55rem 0.6rem; border-bottom: 1px solid #1a1c24; vertical-align: top; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
@media (max-width: 640px) {
    .stats { grid-template-columns: repeat(2, 1fr); }
    .two-col { grid-template-columns: 1fr; }
    .bar-row { grid-template-columns: minmax(0, 9rem) 1fr auto; }
}
`;

export function renderDashboard(data, { days = '30', tz, keyRaw = '', generatedAt = new Date() } = {}) {
    const d = { ...data };
    const s = d.summary || {};
    const windowLabel = days === 'all'
        ? (s.firstAt ? `all time (since ${fmtAbs(s.firstAt, tz)})` : 'all time')
        : `last ${days} days`;

    return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Portfolio analytics</title>
<style>${STYLES}</style>
</head><body><div class="wrap">

<header>
    <h1>Portfolio analytics</h1>
    <nav class="nav">${windowNav(days, keyRaw, tz)}</nav>
    <p class="sub">${esc(windowLabel)} · generated ${esc(fmtAbs(generatedAt, tz))} ${esc(tzAbbr(tz))}
        · times shown in <code>${esc(tz)}</code> (override with <code>?tz=</code>) · refresh to update</p>
</header>

<div class="stats">
    ${statCard('plays', s.plays, windowLabel)}
    ${statCard('listeners', s.listeners, 'distinct daily hashes')}
    ${statCard('notes', s.messages, 'all time')}
    ${statCard('searches', s.searches, 'that led to a pick')}
</div>

${messagesSection(d.messages || [], tz)}

<section>
    <h2>Plays over time</h2>
    ${columnChart(d.playsByDay || [])}
</section>

<section>
    <h2>Top tracks <span class="count">${(d.topTracks || []).length}</span></h2>
    ${barList(d.topTracks || [], {
        label: (t) => `${t.title}${t.artist ? ` — ${t.artist}` : ''}`,
        value: (t) => t.plays,
    })}
</section>

${listenersSection(d.listeners || [], tz)}

${searchesSection(d.topSearches || [])}

<section>
    <h2>Where plays come from</h2>
    <div class="two-col">
        <div>
            <h3 class="hint">Device</h3>
            ${barList(d.devices || [], { label: (r) => r.key, value: (r) => r.count })}
        </div>
        <div>
            <h3 class="hint">Country</h3>
            ${barList(d.countries || [], { label: (r) => r.key, value: (r) => r.count })}
        </div>
    </div>
</section>

</div></body></html>`;
}
