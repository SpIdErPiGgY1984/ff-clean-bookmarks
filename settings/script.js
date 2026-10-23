/* Spiderpiggy Clean Bookmarks: theme selector and legacy CSS compatibility. */
let _bookmarkFolders = [];
let _selectId = 'toolbar_____';
let _saved = {};
const _themes = ['auto', 'light', 'dark', 'halloween', 'christmas', 'newyear', 'custom'];
const gm = n => chrome.i18n.getMessage(n) || n;

function selectedTheme(saved) {
    return SpiderpiggyHoliday.selectedTheme(saved);
}

function updateThemeVisibility() {
    $('#custom-css-row').prop('hidden', $('#theme').val() !== 'custom');
}

function setUiTranslations() {
    document.documentElement.lang = chrome.i18n.getUILanguage().split('-')[0];
    const strings = {
        'settings':'settings', 'popup_folder':'popup_folder',
        'auto_open':'auto_open', 'auto_open_pause':'auto_open_pause',
        'open_in_new_tab':'open_in_new_tab', 'notes':'notes',
        'update_favicon':'update_favicon', 'open_wo_closing':'open_wo_closing',
        'style-textarea':'style_textarea', 'theme-label':'theme_label',
        'theme-hint':'theme_hint', 'auto_holiday':'auto_holiday',
        'holiday_dates':'holiday_dates', 'pin_to_toolbar':'pin_to_toolbar',
        'load_favicons':'load_favicons', 'favicon_hint':'favicon_hint',
        'faviconEnhancedHint':'favicon_enhanced_hint'
    };
    for (const [id, key] of Object.entries(strings)) $('#' + id).text(gm(key));
    $('#revertCss').val(gm('revert_css'));
    $('#saveCss').val(gm('save_css'));
    $('#faviconEnhancedBtn').text(gm('favicon_enhanced_button'));
    for (const theme of _themes) {
        $('#theme').append($('<option>').val(theme).text(gm('theme_' + theme)));
    }
}

function updateHolidayStatus() {
    const currentHoliday = $('#autoHoliday').prop('checked')
        ? SpiderpiggyHoliday.activeHoliday(new Date()) : null;
    const messageKey = currentHoliday ? 'holiday_active' : 'holiday_inactive';
    let message = gm(messageKey);
    if (currentHoliday) {
        message = message.replace('{theme}', gm('theme_' + currentHoliday));
    }
    $('#holiday_status').text(message);
}

function updateEnhancedPermissionsUi() {
    const enabled = $('#loadFavicons').prop('checked');
    $('#favicon-enhanced-controls').prop('hidden', !enabled);
    if (!enabled) return;
    Promise.all([
        browser.permissions.contains({origins: ['https://*/*']}),
        browser.permissions.contains({permissions: ['tabs']})
    ]).then(([hosts,tabs]) => {
        const granted = hosts && tabs;
        $('#faviconEnhancedBtn').prop('hidden', granted);
        $('#faviconEnhancedStatus').text(gm(granted ? 'favicon_enhanced_active' : 'favicon_enhanced_inactive'));
    }).catch(() => $('#faviconEnhancedStatus').text(gm('favicon_enhanced_inactive')));
}

function restore() {
    chrome.storage.local.get('setting', (result) => {
        _saved = result.setting || {};
        _selectId = _saved.topId || 'toolbar_____';
        $('#newTab').prop('checked', typeof _saved.newTab === 'boolean' ? _saved.newTab : true);
        $('#css').val(typeof _saved.css === 'string' && _saved.css.length ? _saved.css : popup_css);
        $('#autoOpen').prop('checked', typeof _saved.autoOpen === 'boolean' ? _saved.autoOpen : true);
        $('#autoOpenPause').val(_saved.autoOpenPause ?? '850');
        $('#theme').val(selectedTheme(_saved));
        $('#autoHoliday').prop('checked', SpiderpiggyHoliday.holidaysEnabled(_saved));
        // This preference is only useful while Firefox's explicit consent remains granted.
        browser.permissions.contains({data_collection: ['bookmarksInfo']})
            .then(granted => {
                $('#loadFavicons').prop('checked', granted && _saved.loadFavicons === true);
                updateEnhancedPermissionsUi();
            }).catch(() => {
                $('#loadFavicons').prop('checked', false);
                updateEnhancedPermissionsUi();
            });
        updateThemeVisibility();
        updateHolidayStatus();
        updateEnhancedPermissionsUi();
        setFolderList();
    });
}

function persist(includeCss=false) {
    const values = {
        ..._saved,
        topId: $('#topId').val() || _selectId,
        newTab: $('#newTab').prop('checked'),
        css: includeCss ? $('#css').val() : (_saved.css || ''),
        theme: $('#theme').val(),
        autoHoliday: $('#autoHoliday').prop('checked'),
        loadFavicons: $('#loadFavicons').prop('checked'),
        autoOpen: $('#autoOpen').prop('checked'),
        autoOpenPause: $('#autoOpenPause').val()
    };
    _saved = values;
    chrome.storage.local.set({setting: values});
}

function setFolderList() {
    _bookmarkFolders = [];
    chrome.bookmarks.getTree((root) => {
        if (!root || !root[0] || !root[0].children) return;
        const top = [];
        for (const c of root[0].children) {
            if (c.id === 'toolbar_____') top.unshift(c);
            else top.push(c);
        }
        addBookmarkItem(top, 0);
        const select = $('#topId').empty();
        for (const folder of _bookmarkFolders) {
            // Bookmark folder names are user controlled. Never inject as HTML.
            select.append($('<option>').val(folder.id).text(folder.title));
        }
        $('#folder_loading').hide();
        select.show().val(_selectId);
    });

    function addBookmarkItem(bookmarks, depth) {
        for (const bm of bookmarks) {
            if (!bm.url && bm.children) {
                _bookmarkFolders.push({id: bm.id, title: '　'.repeat(depth) + bm.title});
                addBookmarkItem(bm.children, depth + 1);
            }
        }
    }
}

setUiTranslations();
$('select, input').not('#loadFavicons').on('change', function () {
    if (this.id === 'theme') updateThemeVisibility();
    if (this.id === 'autoHoliday') updateHolidayStatus();
    persist();
});
$('#loadFavicons').on('change', async function () {
    const checkbox = this;
    // User gesture is required for native Firefox data transmission consent.
    if (checkbox.checked) {
        try {
            const granted = await browser.permissions.request({data_collection: ['bookmarksInfo']});
            if (!granted) {
                checkbox.checked = false;
                $('#favicon_status').text(gm('favicon_denied'));
            } else {
                $('#favicon_status').text(gm('favicon_enabled'));
            }
        } catch (e) {
            checkbox.checked = false;
            $('#favicon_status').text(gm('favicon_denied'));
        }
    } else {
        try { await browser.permissions.remove({data_collection: ['bookmarksInfo']}); }
        catch (e) { /* Firefox may already have revoked this permission. */ }
        $('#favicon_status').text(gm('favicon_disabled'));
    }
    if (!checkbox.checked) {
        // Do not retain enhanced website-reading privileges when the user
        // disables favicon requests. Firefox can revoke them in the add-on UI too.
        try { await browser.permissions.remove({origins: ['https://*/*'], permissions: ['tabs']}); }
        catch (e) { /* permissions may already be absent */ }
    }
    persist();
    updateEnhancedPermissionsUi();
});
$('#faviconEnhancedBtn').on('click', async function () {
    if (!$('#loadFavicons').prop('checked')) return;
    try {
        // Request triggered directly by the button click (required by Firefox).
        const granted = await browser.permissions.request({
            origins: ['https://*/*'], permissions: ['tabs']
        });
        $('#faviconEnhancedStatus').text(gm(granted ? 'favicon_enhanced_active' : 'favicon_enhanced_denied'));
    } catch(e) {
        $('#faviconEnhancedStatus').text(gm('favicon_enhanced_denied'));
    }
    updateEnhancedPermissionsUi();
});
$('#revertCss').on('click' , () => $('#css').val(popup_css));
$('#saveCss').on('click', () => persist(true));
restore();
