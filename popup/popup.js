var _toolbarId = 'toolbar_____';
var _parent = {};
var _container = $('#container');
var _bmKey = 'bookmark_key';

var _pop_topId = _toolbarId;
var _pop_newTab = true;
var _pop_css = null;
var _pop_autoOpen = true;
var _pop_autoOpenPause = 850;
var _pop_loadFavicons = false;
var _pop_enhancedFavicons = false;
var _favTabIconsPromise = null;
const _favPageDiscovery = new Map();

var _onItemFocusTimeoutId = null;
var _onReturnBoxFocusTimeoutId = null;


function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}


function setSetting(setting) {
    if (setting) {
        _pop_topId = setting.topId || _toolbarId;
        _pop_newTab = typeof setting.newTab === 'boolean' ? setting.newTab : true;
        _pop_css = typeof setting.css === 'string' ? setting.css : '';
        _pop_autoOpen = typeof setting.autoOpen === 'boolean' ? setting.autoOpen : true;
        _pop_autoOpenPause = isNumeric(setting.autoOpenPause) ? Math.max(0, Math.min(9999, Number(setting.autoOpenPause))) : 850;
        _pop_loadFavicons = setting.loadFavicons === true;

    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const active = SpiderpiggyHoliday.resolveTheme(setting || {}, new Date(), prefersDark);
    const filename = active.theme === 'custom' ? 'light' : active.theme;
    document.getElementById('sp-theme-css').href = chrome.runtime.getURL('themes/' + filename + '.css');
    document.getElementById('sp-custom-css').textContent = active.theme === 'custom' ? _pop_css : '';

    // Pseudo-element label in all five built-in themes follows the user's language.
    const title = chrome.i18n.getMessage('bookmarks') || 'Bookmarks';
    document.documentElement.style.setProperty('--sp-bookmarks-label', JSON.stringify(title.toUpperCase()));
}

/**
 * User-selected favicon mode: basic (own HTTPS host + known icon files),
 * or enhanced (Firefox host permission + tabs + page link[rel~="icon"]).
 * No third-party favicon lookup/proxy, no bookmark uploads/analytics.
 * The website and, where declared, its favicon CDN can see GET requests.
 */
function bookmarkOrigin(bookmark) {
    try {
        const url = new URL(bookmark.url);
        return url.protocol === 'https:' && url.hostname ? url.origin : null;
    } catch (e) { return null; }
}

/**
 * Site-specific paths for sites that don't use their root /favicon.ico.
 * These are fetched only for matching bookmark hosts and only over HTTPS.
 * Dynamic discovery below remains the primary long-term solution because
 * websites can rename, move, or hash their icon assets.
 */
/**
 * Telenet TV may redirect visitors from telenettv.be to telenet.be/www2.telenet.be.
 * Treat ONLY these explicitly listed official hosts as one favicon family.
 * Do not generalize redirect trust to arbitrary domains.
 */
function isTelenetTvHost(hostname) {
    return hostname === 'telenettv.be' || hostname === 'www.telenettv.be';
}

function isApprovedTelenetHost(hostname) {
    return ['telenettv.be', 'www.telenettv.be', 'telenet.be',
            'www.telenet.be', 'www2.telenet.be'].includes(hostname.toLowerCase());
}

function sameFaviconSite(firstUrl, secondUrl) {
    if (sameWwwHost(firstUrl, secondUrl)) return true;
    try {
        const a = new URL(firstUrl), b = new URL(secondUrl);
        return a.protocol === 'https:' && b.protocol === 'https:' &&
            !a.username && !a.password && !b.username && !b.password &&
            isApprovedTelenetHost(a.hostname) && isApprovedTelenetHost(b.hostname);
    } catch (e) { return false; }
}

function knownFaviconCandidates(bookmark) {
    const origin = bookmarkOrigin(bookmark);
    if (!origin) return [];
    const host = new URL(origin).hostname.toLowerCase();
    const result = [];
    if (host === 'vtm.be' || host.endsWith('.vtm.be')) {
        result.push(origin + '/vtmgo/img/vtmgo/favicon.ico');
    }
    if (host === 'telenet.be' || host.endsWith('.telenet.be')) {
        result.push(origin + '/favicon/favicon-32x32.png',
                    origin + '/favicon/favicon-16x16.png',
                    origin + '/favicon/favicon.png',
                    origin + '/favicon/apple-touch-icon.png');
    }
    // Telenet TV redirects to the main website.  Do not guess fixed icon paths:
    // the site declares relative paths which must be resolved from its final URL.
    if (host === 'adminbox.eu' || host.endsWith('.adminbox.eu')) {
        // Known official asset; HTML discovery can find its replacement
        // automatically when the filename changes.
        result.push(origin + '/assets/favicon/1.0/favicon-blue-32x32-d0acc5a5663bad5cdbfbe08dd5e66f817f832c9539f56572a1c1f56b369c0973.png');
    }
    return result;
}

function faviconCandidates(bookmark) {
    if (!_pop_loadFavicons) return [];
    const origin = bookmarkOrigin(bookmark);
    if (!origin) return [];
    const candidates = [];
    const host = new URL(origin).hostname;
    if (host === 'mail.google.com' || host === 'gmail.google.com') {
        candidates.push('https://ssl.gstatic.com/images/branding/productlogos/gmail_2026/v2/ico/gmail_2026_256dp.ico');
        candidates.push('https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico');
    }
    if (host === 'contacts.google.com') {
        candidates.push('https://ssl.gstatic.com/images/branding/product/1x/contacts_2022_48dp.png');
    }
    candidates.push(origin + '/favicon.ico', origin + '/favicon.svg', origin + '/favicon.png',
                    origin + '/favicon-32x32.png', origin + '/apple-touch-icon.png');
    const segment = new URL(bookmark.url).pathname.split('/').filter(Boolean)[0];
    if (['mail', 'app', 'apps', 'web', 'ui'].includes(segment)) {
        candidates.push(origin + '/' + segment + '/favicon.ico');
    }
    return [...new Set(candidates)];
}

function fallbackInitial(bookmark) {
    const display = (bookmark.title || '').trim();
    if (display) return Array.from(display)[0].toLocaleUpperCase();
    try { return new URL(bookmark.url).hostname.replace(/^www\./, '').charAt(0).toUpperCase() || '?'; }
    catch (e) { return '?'; }
}

function safeHttpsIcon(raw, base) {
    try {
        const u = new URL(raw, base);
        if (u.protocol !== 'https:' || !u.hostname || u.username || u.password) return null;
        return u.href;
    } catch (e) { return null; }
}

/** Use favicons already known to Firefox for open tabs, if tabs permission was granted. */
async function faviconFromOpenTabs(bookmark) {
    if (!_pop_enhancedFavicons || !bookmark.url) return [];
    if (!_favTabIconsPromise) {
        _favTabIconsPromise = browser.tabs.query({}).catch(() => []);
    }
    const tabs = await _favTabIconsPromise;
    const origin = bookmarkOrigin(bookmark);
    const matched = tabs.filter(tab => tab.favIconUrl && bookmarkOrigin(tab) &&
        (bookmarkOrigin(tab) === origin ||
         (isTelenetTvHost(new URL(origin).hostname) &&
          sameFaviconSite(origin, bookmarkOrigin(tab)))));
    matched.sort((a, b) => Number(b.url === bookmark.url) - Number(a.url === bookmark.url));
    return matched.map(tab => safeHttpsIcon(tab.favIconUrl)).filter(Boolean);
}

/** A redirect from example.com to www.example.com (or vice versa) is
 * common. Follow only that narrow variant; never read unrelated origins.
 */
function sameWwwHost(firstUrl, secondUrl) {
    try {
        const a = new URL(firstUrl), b = new URL(secondUrl);
        if (a.protocol !== 'https:' || b.protocol !== 'https:' || a.username ||
            a.password || b.username || b.password) return false;
        const withoutWww = host => host.toLowerCase().replace(/^www\./, '');
        return withoutWww(a.hostname) === withoutWww(b.hostname);
    } catch(e) { return false; }
}

/** Extract icon links from inert HTML. Resolve normal relative URLs against
 * the actual page URL; respect an HTML <base> element only when it belongs
 * to the same host (including www variants).
 * Prefer favicon images close to the usual 16–64px size over huge mobile icons.
 */
function parseDeclaredIconLinks(html, pageUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let base = pageUrl;
    const baseElement = doc.querySelector('base[href]');
    if (baseElement) {
        const declaredBase = safeHttpsIcon(baseElement.getAttribute('href'), pageUrl);
        if (declaredBase && sameFaviconSite(pageUrl, declaredBase)) base = declaredBase;
    }
    const icons = [];
    let sequence = 0;
    for (const link of doc.querySelectorAll('link[rel][href]')) {
        const rel = (link.getAttribute('rel') || '').toLowerCase().split(/\s+/);
        const standard = rel.includes('icon');
        const apple = rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed');
        const mask = rel.includes('mask-icon');
        if (!standard && !apple && !mask) continue;
        const rawHref = link.getAttribute('href');
        const type = (link.getAttribute('type') || '').toLowerCase();
        if (type && !type.startsWith('image/') && type !== 'application/octet-stream') continue;
        const sizeString = link.getAttribute('sizes') || '';
        const match = sizeString.match(/(?:^|\s)(\d{1,4})x(\d{1,4})(?=\s|$)/i);
        const px = match ? parseInt(match[1], 10) : 0;
        let score = standard ? 0 : apple ? 200 : 300;
        score += px ? Math.abs(px - 32) : 70;

        // Honour the regular HTML URL resolution first.  Some Telenet landing
        // pages redirect to a directory-like route without a trailing slash
        // (e.g. /residential/nl) while declaring relative 'favicon/foo.png'.
        // Try the directory interpretation as an additional fallback on those
        // official hosts only.  A real <base href> always takes precedence.
        const bases = [base];
        if (!baseElement && rawHref && !/^(?:[a-z][a-z0-9+.-]*:|\/|#|\?)/i.test(rawHref)) {
            const url = new URL(base);
            const last = url.pathname.split('/').pop();
            if (isApprovedTelenetHost(url.hostname) &&
                    !url.pathname.endsWith('/') && !/\.[a-z0-9]{1,8}$/i.test(last)) {
                bases.push(url.origin + url.pathname + '/');
            }
        }
        for (const [index, iconBase] of bases.entries()) {
            const href = safeHttpsIcon(rawHref, iconBase);
            if (!href) continue;
            const iconScore = score + (index ? 10 : 0) +
                (type.includes('svg') || href.toLowerCase().endsWith('.svg') ? 3 : 0);
            icons.push({href, score: iconScore, sequence: sequence++});
            if (icons.length >= 50) break;
        }
        if (icons.length >= 50) break;
    }
    icons.sort((a,b) => a.score - b.score || a.sequence - b.sequence);
    return [...new Set(icons.map(item => item.href))];
}

/** Read declared favicons from a bookmarked site's public homepage.
 * Never request a bookmarked path, query, cookies, or HTTP URLs.
 * Only same-host or www/non-www redirects are accepted. Remote scripts
 * aren't evaluated, and <base> URL resolution is constrained to this site.
 */
async function declaredFavicons(bookmark) {
    if (!_pop_enhancedFavicons) return [];
    const origin = bookmarkOrigin(bookmark);
    if (!origin) return [];
    if (_favPageDiscovery.has(origin)) return _favPageDiscovery.get(origin);
    const pending = (async () => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4200);
        try {
            const res = await fetch(origin + '/', {
                method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer',
                redirect: 'follow', signal: ctrl.signal
            });
            if (!res.ok || !sameFaviconSite(origin, res.url)) return [];
            const type = res.headers.get('content-type') || '';
            if (!/text\/html|application\/xhtml\+xml/i.test(type)) return [];
            const reader = res.body && res.body.getReader();
            if (!reader) return [];
            const decoder = new TextDecoder();
            let html = '', size = 0;
            try {
                for (;;) {
                    const chunk = await reader.read();
                    if (chunk.done) break;
                    size += chunk.value.byteLength;
                    html += decoder.decode(chunk.value, {stream: true});
                    if (size >= 196608 || /<\/head\s*>/i.test(html)) {
                        await reader.cancel();
                        break;
                    }
                }
            } finally { try { reader.releaseLock(); } catch(e) {} }
            return parseDeclaredIconLinks(html, res.url);
        } catch(e) { return []; }
        finally { clearTimeout(timer); }
    })();
    _favPageDiscovery.set(origin, pending);
    return pending;
}

function tryIconSources(img, candidates, refresh) {
    const unique = [...new Set(candidates.filter(Boolean))];
    return new Promise(resolve => {
        let next = 0;
        let timeoutId;
        function attempt() {
            clearTimeout(timeoutId);
            img.off('.spicon').css('opacity', 0);
            if (next >= unique.length) { resolve(false); return; }
            let url = unique[next++];
            if (refresh) {
                const u = new URL(url);
                u.searchParams.set('sp-refresh', String(Date.now()));
                url = u.href;
            }
            img.one('load.spicon', () => {
                clearTimeout(timeoutId);
                img.css('opacity', 1);
                resolve(true);
            });
            img.one('error.spicon', attempt);
            timeoutId = setTimeout(attempt, 2200);
            img.attr('src', url);
        }
        attempt();
    });
}

function appendBookmarkIcon(cell, bookmark) {
    if (!bookmark.url) {
        return $('<img>', {src: 'imgs/folder.png', alt: ''}).appendTo(cell);
    }
    const holder = $('<span>', {class: 'sp-favicon-wrap', 'aria-hidden': 'true'});
    $('<span>', {class: 'sp-favicon-letter'}).text(fallbackInitial(bookmark)).appendTo(holder);
    const img = $('<img>', {alt: ''}).css('opacity', 0).appendTo(holder);
    holder.appendTo(cell);
    if (!_pop_loadFavicons) return img;
    let generation = 0;
    async function loadIcon(refresh = false) {
        const current = ++generation;
        // Firefox's own tab favicon is preferred if available; it often handles
        // applications whose favicon is hosted on a different HTTPS hostname.
        const tabs = await faviconFromOpenTabs(bookmark);
        if (generation !== current) return;
        if (tabs.length && await tryIconSources(img, tabs, refresh)) return;
        if (generation !== current) return;
        const known = knownFaviconCandidates(bookmark);
        const isTvRedirect = isTelenetTvHost(new URL(bookmark.url).hostname.toLowerCase());
        if (isTvRedirect && _pop_enhancedFavicons) {
            // For the legacy TV domain, discover the redirected site's real icon
            // before trying guesses that might themselves redirect to HTML.
            const discovered = await declaredFavicons(bookmark);
            if (generation !== current) return;
            if (discovered.length && await tryIconSources(img, discovered, refresh)) return;
            if (generation !== current) return;
            await tryIconSources(img, [...known, ...faviconCandidates(bookmark)], refresh);
            return;
        }
        // Preserve the normal favicon lookup for all other websites.
        if (known.length && await tryIconSources(img, known, refresh)) return;
        if (generation !== current) return;
        const fromPage = await declaredFavicons(bookmark);
        if (generation !== current) return;
        await tryIconSources(img, [...fromPage, ...faviconCandidates(bookmark)], refresh);
    }
    cell.data('refresh-favicon', () => loadIcon(true));
    loadIcon(false);
    return img;
}

function createPanel(bid, parentId, isSubFolder = false) {
    chrome.bookmarks.getChildren(bid, children => {
        if (!Array.isArray(children)) return;
        if (parentId) _parent[bid] = parentId;

        const panel = $('<div>', { class: 'panel' }).toggleClass('sp-subfolder', Boolean(parentId || _parent[bid]));
        const toolbar = $('<div>', { class: 'toolbar' }).appendTo(panel);
        $('<img>', { src: 'imgs/settings.png', alt: '' })
            .on('click', () => { chrome.runtime.openOptionsPage(); window.close(); })
            .appendTo(toolbar);
        const table = $('<table>').appendTo(panel);
        let ignoreSep = false;

        for (const bookmark of children) {
            if (bookmark.type === 'separator') {
                if (!ignoreSep) {
                    table.append($('<tr>').append($('<td>', { colspan: 3 })
                        .append($('<div>', { class: 'splitter' }))));
                }
                continue;
            }
            ignoreSep = false;
            if (typeof bookmark.url === 'string' && bookmark.url.startsWith('place:')) {
                ignoreSep = true;
                continue;
            }

            const isFolder = !bookmark.url;
            const iconClass = isSubFolder ? 'subfolder-icon' : 'icon';
            const titleClass = isFolder ? (isSubFolder ? 'subfolder' : 'folder')
                                        : (isSubFolder ? 'subfolder-title' : 'title');
            const displayName = bookmark.title || bookmark.url || '';
            const detail = displayName + (bookmark.url ? '\n' + bookmark.url : '');

            // All user-controlled strings are assigned through text()/attr(), never HTML.
            const tr = $('<tr>');
            const iconCell = $('<td>').addClass(iconClass).appendTo(tr);
            const titleCell = $('<td>').addClass(titleClass).attr('title', detail)
                .append($('<span>').text(displayName)).appendTo(tr);
            const arrowCell = $('<td>').addClass('arrow').appendTo(tr);
            if (isFolder) $('<img>', { src: 'imgs/arrow.png', alt: '' }).appendTo(arrowCell);
            appendBookmarkIcon(iconCell, bookmark);
            tr.data(_bmKey, bookmark);

            tr.on('click', function () {
                const bm = $(this).data(_bmKey);
                if (bm.url) {
                    if (_pop_newTab) chrome.tabs.create({ url: bm.url });
                    else chrome.tabs.update({ url: bm.url });
                    window.close();
                } else {
                    createPanel(bm.id, bid, true);
                }
            }).on('mousedown', function (e) {
                if (e.which === 3 && _pop_loadFavicons && bookmark.url) {
                    // Retry known HTTPS favicon locations on an explicit right-click.
                    const retry = $(this).find('td.' + iconClass).data('refresh-favicon');
                    if (typeof retry === 'function') retry();
                }
            }).on('mouseup', function (e) {
                if (e.which === 2) {
                    const bm = $(this).data(_bmKey);
                    if (bm.url) chrome.tabs.create({ url: bm.url });
                }
            }).on('mouseenter', function () {
                if (!_pop_autoOpen || !isFolder) return;
                clearTimeout(_onItemFocusTimeoutId);
                _onItemFocusTimeoutId = setTimeout(() => createPanel(bookmark.id, bid, true), _pop_autoOpenPause);
            }).on('mouseleave', () => clearTimeout(_onItemFocusTimeoutId));
            table.append(tr);
        }

        if (!children.length) {
            table.append($('<tr>')
                .append($('<td>', { class: 'icon' }))
                .append($('<td>', { class: 'subfolder-title' })
                    .append($('<span>', { class: 'empty' }).text(chrome.i18n.getMessage('empty') || '...')))
                .append($('<td>', { class: 'arrow' })));
        }

        _container.empty().append(panel);
        let pw = panel.outerWidth();
        let ph = panel.outerHeight();
        if (_parent[bid]) {
            const back = $('<div>', { class: 'return_box' })
                .append($('<img>', { src: 'imgs/return.png', alt: '' })).appendTo(panel);
            back.css({ top: 0, height: ph });
            back.children('img').css('margin-top', (back.height() - 13) / 2);
            pw = panel.outerWidth();
            const goBack = () => createPanel(_parent[bid], null, _parent[bid] !== _pop_topId);
            back.on('click', goBack)
                .on('mouseenter', () => {
                    if (!_pop_autoOpen) return;
                    clearTimeout(_onReturnBoxFocusTimeoutId);
                    _onReturnBoxFocusTimeoutId = setTimeout(goBack, _pop_autoOpenPause);
                })
                .on('mouseleave', () => clearTimeout(_onReturnBoxFocusTimeoutId));
        }
        _container.width(pw).height(ph);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get('setting', d => {
        setSetting(d.setting);
        if (!_pop_loadFavicons) {
            createPanel(_pop_topId, null);
            return;
        }
        // A saved checkbox does not prove Firefox consent still exists.
        Promise.all([
            browser.permissions.contains({data_collection: ['bookmarksInfo']}),
            browser.permissions.contains({origins: ['https://*/*']}),
            browser.permissions.contains({permissions: ['tabs']})
        ]).then(([consent, hosts, tabs]) => {
            _pop_loadFavicons = consent === true;
            _pop_enhancedFavicons = _pop_loadFavicons && hosts === true && tabs === true;
            createPanel(_pop_topId, null);
        }).catch(() => {
            _pop_loadFavicons = false;
            _pop_enhancedFavicons = false;
            createPanel(_pop_topId, null);
        });
    });
});
