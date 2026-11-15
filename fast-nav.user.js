// ==UserScript==
// @name         FastNav Suite Pro - Direct Navigation Helper
// @namespace    http://tampermonkey.net/
// @version      1.3.1
// @description  Tự động hỗ trợ điều hướng và giải quyết liên kết đích mượt mà (kiến trúc Modular Engine).
// @author       khanghack222
// @match        *://*.linkvertise.com/*
// @match        *://linkvertise.com/*
// @match        *://*.link-to.net/*
// @match        *://link-to.net/*
// @match        *://*.link-target.net/*
// @match        *://link-target.net/*
// @match        *://*.link-center.net/*
// @match        *://link-center.net/*
// @match        *://*.link-hub.net/*
// @match        *://link-hub.net/*
// @match        *://*.direct-link.net/*
// @match        *://direct-link.net/*
// @match        *://*.file-link.net/*
// @match        *://file-link.net/*
// @match        *://*.work.ink/*
// @match        *://work.ink/*
// @match        *://*.workink.click/*
// @match        *://workink.click/*
// @match        *://*.pass.work.ink/*
// @match        *://pass.work.ink/*
// @match        *://keys.combowick.com/*
// @match        *://combowick.com/*
// @match        *://app.getmadium.xyz/*
// @match        https://links.lootlabs.gg/*
// @match        https://*.lootlabs.gg/*
// @match        https://nerventualken.com/*
// @connect      *
// @connect      sqahviibykrzlwnulgmw.supabase.co
// @connect      publisher.linkvertise.com
// @connect      auth.getmadium.xyz
// @connect      enaightdecipie.com
// @connect      onsultingco.com
// @connect      nismscoldnesfspu.org
// @connect      nerventualken.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @run-at       document-start
// @require      https://raw.githubusercontent.com/khanghack222/fast-nav-suite/main/engines/workink.core.js
// @require      https://raw.githubusercontent.com/khanghack222/fast-nav-suite/main/engines/linkvertise.core.js
// @require      https://raw.githubusercontent.com/khanghack222/fast-nav-suite/main/engines/combowick.core.js
// @require      https://raw.githubusercontent.com/khanghack222/fast-nav-suite/main/engines/madium.core.js
// @require      https://raw.githubusercontent.com/khanghack222/fast-nav-suite/main/engines/lootlabs.core.js
// @require      https://raw.githubusercontent.com/khanghack222/fast-nav-suite/main/engines/turnstile.core.js
// @updateURL    https://raw.githubusercontent.com/khanghack222/fast-nav-suite/main/fast-nav.user.js
// @downloadURL  https://raw.githubusercontent.com/khanghack222/fast-nav-suite/main/fast-nav.user.js
// ==/UserScript==

(function() {
    'use strict';
    console.log('%c[FastNav Suite]%c Loader initialized with 6 engines.', 'color:#10b981;font-weight:bold;', 'color:#38bdf8;');
})();
