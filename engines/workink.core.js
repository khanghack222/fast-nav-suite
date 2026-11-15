/**
 * FastNav Suite - Work.ink Instant Auto-Bypass Core Engine
 * Zero Wait Time - Real-time WebSocket Protocol Hooking - Auto Modal Dismissal
 * Tested & Verified for Work.ink 2026 SvelteKit Architecture
 */
(function() {
    'use strict';

    const currentHost = (typeof window !== "undefined" && window.location.hostname) ? window.location.hostname.toLowerCase() : "";
    if (!currentHost.includes("work.ink") && !currentHost.includes("workink.click") && !currentHost.includes("pass.work.ink")) {
        return;
    }

    var _win = (typeof unsafeWindow !== "undefined") ? unsafeWindow : window;
    const _doc = _win.document || document;

    function log(...args) {
        console.log("%c[FastNav WorkInk]%c", "color:#10b981;font-weight:bold;", "color:#38bdf8;", ...args);
    }

    // ====================================================
    // 1. INSTANT STYLES: HIDE ADS, POPUPS & PAYWALL MODAL
    // ====================================================
    const css = `
        /* Hide paywall modal immediately (Fixes 46s/50s ad block screen) */
        .main-modal.svelte-uutib1,
        [class*="main-modal"][class*="uutib1"],
        div[class*="modalwrapper"] [class*="modal-backdrop"] {
            display: none !important;
            pointer-events: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
        }
        [id^="bsa-zone_"], ins:nth-of-type(1), .google-auto-placed, iframe[id^="aswift_"] {
            display: none !important;
        }
    `;
    const styleEl = _doc.createElement('style');
    styleEl.textContent = css;
    (_doc.head || _doc.documentElement).appendChild(styleEl);

    // Continuous cleanup for dynamically attached modals
    setInterval(() => {
        _doc.querySelectorAll('.main-modal').forEach(el => {
            if (el.classList.contains('svelte-uutib1')) {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('pointer-events', 'none', 'important');
            }
        });
        // Remove adblocker warning if present
        _doc.querySelectorAll('button').forEach(btn => {
            if (btn.innerText && btn.innerText.trim() === 'Refresh Page') {
                btn.closest('div[class*="flex"]')?.parentElement?.remove();
            }
        });
    }, 50);

    // ====================================================
    // 2. WEBSOCKET PROTOCOL HOOK (INTERCEPT IN-FLIGHT SVELTEKIT WS)
    // ====================================================
    if (currentHost.includes("work.ink")) {
        const [encodedUserId, linkCustom] = decodeURIComponent(window.location.pathname.slice(1)).split("/").slice(-2);

        const payloads = {
            social: (url) => JSON.stringify({
                type: "c_social_started",
                payload: { url }
            }),
            readArticles: {
                1: JSON.stringify({
                    type: "c_monetization",
                    payload: { type: "readArticles", payload: { event: "start" } }
                }),
                2: JSON.stringify({
                    type: "c_monetization",
                    payload: { type: "readArticles", payload: { event: "closeClicked" } }
                })
            },
            browserExtension: {
                1: JSON.stringify({
                    type: "c_monetization",
                    payload: { type: "browserExtension", payload: { event: "start" } }
                }),
                2: (token) => JSON.stringify({
                    type: "c_monetization",
                    payload: { type: "browserExtension", payload: { event: "confirm", token } }
                })
            }
        };

        const _origWSSend = _win.WebSocket.prototype.send;
        _win.WebSocket.prototype.send = function(data) {
            try {
                const parsed = JSON.parse(data);
                if (parsed.type === "c_recaptcha" && parsed.payload?.token === "patched_bypass") {
                    return; // prevent invalid token override
                }
            } catch(e) {}
            return _origWSSend.call(this, data);
        };

        let socials = [];
        let activeMonetizationTypes = [];

        const _origWSAddListener = _win.WebSocket.prototype.addEventListener;
        _win.WebSocket.prototype.addEventListener = function(type, handler, opts) {
            if (type === 'message') {
                const wrappedHandler = async (e) => {
                    const sleep = ms => new Promise(r => setTimeout(r, ms));
                    let data;
                    try { data = JSON.parse(e.data); } catch(err) { return handler(e); }
                    if (data.error) return handler(e);
                    const payload = data.payload || {};

                    log("WS Message Received:", data.type);

                    switch (data.type) {
                        case "s_link_info":
                            if (payload.socials) socials.push(...payload.socials);
                            const monetizationTypes = ["readArticles", "browserExtension"];
                            for (const t of monetizationTypes) {
                                if (payload.monetizationScript?.includes(t)) {
                                    activeMonetizationTypes.push(t);
                                }
                            }
                            break;

                        case "s_recaptcha_okay":
                            log("Captcha resolved! Sending auto-skip monetization payloads...");
                            if (socials.length) {
                                for (const social of socials) {
                                    _origWSSend.call(this, payloads.social(social.url));
                                    await sleep(500);
                                }
                            }
                            for (const t of activeMonetizationTypes) {
                                switch (t) {
                                    case "readArticles":
                                        _origWSSend.call(this, payloads.readArticles["1"]);
                                        await sleep(200);
                                        _origWSSend.call(this, payloads.readArticles["2"]);
                                        break;
                                    case "browserExtension":
                                        _origWSSend.call(this, payloads.browserExtension["1"]);
                                        break;
                                }
                            }
                            break;

                        case "s_monetization":
                            if (payload.type === "browserExtension" && payload.payload?.token) {
                                log("Confirming browserExtension...");
                                _origWSSend.call(this, payloads.browserExtension["2"](payload.payload.token));
                            }
                            break;

                        case "s_link_destination":
                            let destUrl = payload.url;
                            log(">>> NHẬN LINK ĐÍCH THÀNH CÔNG:", destUrl);
                            try {
                                const parsed = new URL(destUrl);
                                if (parsed.searchParams.has("duf")) {
                                    destUrl = _win.atob(parsed.searchParams.get("duf").split("").reverse().join(""));
                                }
                            } catch(err) {}

                            // Save globally for Selenium verification
                            _win.__destLink = destUrl;

                            // Instant redirect (0 wait)
                            log(">>> Chuyển hướng ngay lập tức đến link đích:", destUrl);
                            _win.location.replace(destUrl);
                            return;
                    }
                    return handler(e);
                };
                return _origWSAddListener.call(this, type, wrappedHandler, opts);
            }
            return _origWSAddListener.call(this, type, handler, opts);
        };

        // ====================================================
        // 3. ZERO-DELAY BUTTON CLICKER & NAVIGATION TRIGGER
        // ====================================================
        function forceClick(btn) {
            if (!btn) return;
            log("Kích hoạt click ngay lập tức:", btn.className || btn.tagName);
            btn.click();
            btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            if (btn.tagName === 'A' && btn.href && btn.href.startsWith('http')) {
                _win.location.href = btn.href;
            }
        }

        let clicked = false;
        const clickTimer = setInterval(() => {
            if (clicked) {
                clearInterval(clickTimer);
                return;
            }

            // Priority 1: Destination button
            const destBtn = _doc.querySelector('#access-offers');
            if (destBtn) {
                clicked = true;
                clearInterval(clickTimer);
                forceClick(destBtn);
                return;
            }

            // Priority 2: Access / Continue button on main screen
            const accessBtn = _doc.querySelector('.button.large.accessBtn, .accessBtn, button.continue, button.access');
            if (accessBtn) {
                const txt = (accessBtn.innerText || "").trim().toLowerCase();
                if (txt.includes('destination') || txt.includes('proceed') || txt.includes('continue') || txt.includes('access')) {
                    clicked = true;
                    clearInterval(clickTimer);
                    forceClick(accessBtn);
                    return;
                }
            }

            // Priority 3: Article CTA button
            const ctaBtn = _doc.querySelector('.cta-btn');
            if (ctaBtn) {
                const evt = new MouseEvent('click', { bubbles: true, cancelable: false });
                evt._fromBypass = true;
                ctaBtn.dispatchEvent(evt);
            }
        }, 100);

    } else if (currentHost.includes("pass.work.ink")) {
        _win.close();
    } else if (currentHost.includes("workink.click")) {
        _win.close();
    }
})();
