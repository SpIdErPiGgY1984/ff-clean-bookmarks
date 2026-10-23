/* Spiderpiggy Clean Bookmarks: annual holiday calendar, local browser dates.
 * The saved theme is not changed: seasonal overrides are temporary.
 * No background timers, network requests or extra permissions are needed.
 */
(function (root) {
    'use strict';

    const VALID_THEMES = Object.freeze(['auto', 'light', 'dark', 'halloween', 'christmas', 'newyear', 'custom']);

    function activeHoliday(at = new Date()) {
        // Use the user's LOCAL date rather than UTC so the changeover occurs
        // at midnight in their Firefox timezone, including the year boundary.
        const month = at.getMonth() + 1;
        const day = at.getDate();
        if ((month === 10 && day >= 25) || (month === 11 && day === 1)) {
            return 'halloween';
        }
        if (month === 12 && day >= 20 && day <= 26) {
            return 'christmas';
        }
        if ((month === 12 && day >= 27) || (month === 1 && day <= 3)) {
            return 'newyear';
        }
        return null;
    }

    function selectedTheme(setting = {}) {
        if (VALID_THEMES.includes(setting.theme)) {
            return setting.theme;
        }
        // Preserve the user's pre-existing custom CSS when upgrading.
        return typeof setting.css === 'string' && setting.css.trim() ? 'custom' : 'auto';
    }

    function holidaysEnabled(setting = {}) {
        // Missing setting: on by default for new and existing installations.
        return setting.autoHoliday !== false;
    }

    function resolveTheme(setting = {}, at = new Date(), prefersDark = false) {
        const normalTheme = selectedTheme(setting);
        const seasonalTheme = holidaysEnabled(setting) ? activeHoliday(at) : null;
        const chosenTheme = seasonalTheme || normalTheme;
        return {
            theme: chosenTheme === 'auto' ? (prefersDark ? 'dark' : 'light') : chosenTheme,
            normalTheme: normalTheme,
            holiday: seasonalTheme
        };
    }

    root.SpiderpiggyHoliday = Object.freeze({
        activeHoliday, selectedTheme, holidaysEnabled, resolveTheme
    });
})(typeof window !== 'undefined' ? window : globalThis);
