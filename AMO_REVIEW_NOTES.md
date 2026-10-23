# Mozilla Add-ons submission / reviewer notes

**Version:** 1.0.0. This file is for reviewers; it does not imply Mozilla approval.

- Standalone Spiderpiggy fork of Virtuos86's My Clean Bookmarks (original source 0.5.41; original listing states MPL 2.0). See `THIRD_PARTY_NOTICES.md` and `LICENSE`. The upstream GitHub snapshot has no explicit LICENSE file; recheck applicable source licensing before upload.
- All scripts are packaged locally. jQuery 3.7.1 is an unmodified third-party minified distribution (MIT, source URL in third-party notices). No remotely fetched JavaScript or eval.
- Firefox 140+ desktop; Manifest V2 (Mozilla Firefox). No Android compatibility claimed.
- Required permissions: `bookmarks` and `storage`. No background execution or telemetry.
- Optional `data_collection_permissions.optional: bookmarksInfo`: user requests this only for real favicon loading; it can transmit bookmarked hostnames to sites/icon hosts. Default is off.
- Optional `https://*/*` and `tabs`: separately requested by user for advanced favicon discovery. The code fetches HTTPS site homepages using `credentials: omit` and `referrerPolicy: no-referrer`, parses icon link elements and optionally accesses favIconUrl from open tabs. It does not execute page scripts or upload bookmark lists to an aggregator.
- The optional website access is broad; Firefox exposes the user's choice. Disabling favicons removes optional consent where available. Reviewers should check the permissions/data disclosures against current AMO requirements.
- Source archive and AMO upload ZIP accompany this release. Manifest is at ZIP root in upload package.

**Suggested live Firefox checks before submission:** nested folders; user-supplied titles containing markup; theme and holiday boundaries; preserved custom CSS; favicons enabled/disabled; consent denied/revoked; right-click refresh; middle-click; Telenet fallback; browser restart after signing.
