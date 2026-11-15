/**
 * FastNav Suite - Work.ink Engine
 * Independent Core Module
 */
(function() {
    'use strict';
// Shared Utilities for FastNav Engines
window.FastNav = window.FastNav || {};

if (!window.FastNav.utils) {
    function log(msg, ...args) {
        console.log(`%c[FastNav Suite]%c ${msg}`, "color:#10b981;font-weight:bold;", "color:#38bdf8;", ...args);
    }
    function logErr(msg, ...args) {
        console.error(`%c[FastNav Suite ERROR]%c ${msg}`, "color:#ef4444;font-weight:bold;", "color:#f87171;", ...args);
    }

    function showToast(title, subtitle = "", isSuccess = false) {
        try {
            let box = document.getElementById("fastnav-suite-toast");
            if (!box) {
                box = document.createElement("div");
                box.id = "fastnav-suite-toast";
                box.style.cssText = "position:fixed;top:24px;left:50%;transform:translateX(-50%);background:rgba(12,12,15,0.96);color:#f3f4f6;padding:12px 24px;border:1.5px solid #10b981;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13.5px;font-weight:600;z-index:99999999;box-shadow:0 10px 35px rgba(0,0,0,0.85);text-align:center;pointer-events:none;min-width:280px;max-width:90vw;transition:border-color 0.3s, box-shadow 0.3s;";
                (document.body || document.documentElement).appendChild(box);
            }
            box.style.borderColor = isSuccess ? "#06b6d4" : "#10b981";
            box.style.boxShadow = isSuccess ? "0 10px 35px rgba(6,182,212,0.3)" : "0 10px 35px rgba(16,185,129,0.25)";
            
            let html = `<div style="display:flex;align-items:center;justify-content:center;gap:8px;"><span style="color:${isSuccess ? '#06b6d4' : '#10b981'};font-size:15px;">●</span> <span>${title}</span></div>`;
            if (subtitle) {
                html += `<div style="margin-top:4px;font-size:12px;color:#9ca3af;font-weight:400;">${subtitle}</div>`;
            }
            box.innerHTML = html;
        } catch(e) {}
    }

    async function nativeFetch(url, method = "GET", headers = {}, data = null) {
        const safeHeaders = {};
        for (let k in headers) {
            const lk = k.toLowerCase();
            if (lk !== "origin" && lk !== "referer" && lk !== "user-agent") {
                safeHeaders[k] = headers[k];
            }
        }
        const fetchFunc = (typeof unsafeWindow !== "undefined" && unsafeWindow.fetch) ? unsafeWindow.fetch : window.fetch;
        const res = await fetchFunc(url, {
            method,
            headers: safeHeaders,
            body: data
        });
        let body = null;
        try {
            body = await res.json();
        } catch(e) {
            try { body = await res.text(); } catch(err) { body = null; }
        }
        if (!res.ok) {
            let msg = (body && typeof body === "object" && body.message) ? body.message : (typeof body === "string" ? body : `HTTP ${res.status}`);
            throw new Error(msg);
        }
        return body;
    }

    function sendReq(url, method = "GET", headers = {}, data = null) {
        return new Promise((resolve, reject) => {
            if (url.includes("supabase.co")) {
                return nativeFetch(url, method, headers, data).then(resolve).catch(reject);
            }

            if (typeof GM_xmlhttpRequest !== "undefined") {
                GM_xmlhttpRequest({
                    url,
                    method,
                    headers,
                    data,
                    timeout: 15000,
                    onload: res => {
                        try { resolve(JSON.parse(res.responseText)); }
                        catch(e) { resolve(res.responseText); }
                    },
                    ontimeout: () => {
                        log("GM_xmlhttpRequest timeout, fallback sang nativeFetch");
                        nativeFetch(url, method, headers, data).then(resolve).catch(reject);
                    },
                    onerror: err => {
                        log("GM_xmlhttpRequest bị chặn/lỗi, tự động chuyển nativeFetch:", err);
                        nativeFetch(url, method, headers, data).then(resolve).catch(reject);
                    }
                });
            } else {
                nativeFetch(url, method, headers, data).then(resolve).catch(reject);
            }
        });
    }

    window.FastNav.utils = {
        log,
        logErr,
        showToast,
        nativeFetch,
        sendReq,
        host: window.location.hostname.toLowerCase()
    };
}

    const { log, logErr, showToast, nativeFetch, sendReq, host } = window.FastNav.utils;

    // ====================================================
    // MODULE 1: WORK.INK (SVELTEKIT SESSION CONTROLLER & DUF EXTRACTOR)
    // ====================================================
    if (host.includes("work.ink") || host.includes("workink.click") || host.includes("pass.work.ink")) {
        log("Kích hoạt Work.ink Engine Pro (SvelteKit Session Hook & DUF Bypass)");

        if (host.includes("workink.click") || host.includes("pass.work.ink")) {
            window.close();
            return;
        }

        // Chặn popup quảng cáo phiền toái
        const origOpen = window.open;
        window.open = function(url, target, features) {
            if (url && (url.includes('workink.click') || url.includes('pass.work.ink') || url.includes('google.com/url'))) {
                log("Đã chặn popup rác:", url);
                return null;
            }
            return origOpen.call(window, url, target, features);
        };

        // Bóc tách DUF trong query string nếu có
        try {
            const u = new URL(window.location.href);
            if (u.searchParams.has("duf")) {
                const rawDuf = u.searchParams.get("duf");
                const decoded = atob(rawDuf.split("").reverse().join(""));
                if (decoded && decoded.startsWith("http")) {
                    log("Bóc DUF thành công:", decoded);
                    showToast("Bóc tách DUF thành công", "Đang chuyển tiếp tới link đích...", true);
                    window.location.replace(decoded);
                    return;
                }
            }
        } catch(e) {}

        // Mock google tag & chặn ad blocker checks
        try {
            const win = (typeof unsafeWindow !== "undefined") ? unsafeWindow : window;
            win.googletag = { cmd: [], _loaded_: true };
            const origFetch = win.fetch;
            win.fetch = function(...args) {
                const url = args[0];
                const options = args[1] || {};
                if (url === "https://js.stripe.com/v3/" && options.method === "HEAD" && options.mode === "no-cors") {
                    return Promise.resolve(new Response("", { status: 200 }));
                } else if (url === "/country.json") {
                    return Promise.resolve(new Response(JSON.stringify({ countryCode: "US" }), { status: 200 }));
                }
                return origFetch.apply(this, args);
            };
        } catch(e) {}

        const NAME_MAP = {
            onLinkInfo: ["onLinkInfo"],
            onLinkDestination: ["onLinkDestination"],
            onProxyDetected: ["onProxyDetected"],
            onMonocleFailed: ["onMonocleFailed"]
        };

        function resolveName(obj, candidates) {
            for (let i = 0; i < candidates.length; i++) {
                const name = candidates[i];
                if (obj && typeof obj[name] === "function") {
                    return { fn: obj[name], index: i, name };
                }
            }
            return { fn: null, index: -1, name: null };
        }

        function resolveWriteFunction(obj) {
            for (let i in obj) {
                if (typeof obj[i] === "function" && obj[i].length === 2) {
                    return { fn: obj[i], name: i };
                }
            }
            return { fn: null, index: -1, name: null };
        }

        let _sessionController = undefined;
        let _linkInfo = undefined;
        let _sendMessage = undefined;
        let _onProxyDetected = undefined;
        let _onMonocleFailed = undefined;
        let _onLinkInfo = undefined;
        let _onLinkDestination = undefined;

        const clientPacketTypes = {
            ANNOUNCE: "c_announce",
            MONETIZATION: "c_monetization",
            SOCIAL_STARTED: "c_social_started",
            RECAPTCHA_RESPONSE: "c_recaptcha_response",
            HCAPTCHA_RESPONSE: "c_hcaptcha_response",
            TURNSTILE_RESPONSE: "c_turnstile_response",
            ADBLOCKER_DETECTED: "c_adblocker_detected",
            FOCUS_LOST: "c_focus_lost",
            OFFERS_SKIPPED: "c_offers_skipped",
            FOCUS: "c_focus",
            WORKINK_PASS_AVAILABLE: "c_workink_pass_available",
            WORKINK_PASS_USE: "c_workink_pass_use",
            PING: "c_ping",
            MONOCLE: "c_monocle"
        };

        let challengeSolved = false;

        function solveChallenge() {
            if (!_linkInfo || !_sessionController || !_sendMessage) return;

            showToast("Work.ink", "Đang tự động vượt qua các nhiệm vụ quảng cáo...");

            if (Array.isArray(_linkInfo.socials)) {
                for (const social of _linkInfo.socials) {
                    log("Tự động vượt social:", social);
                    _sendMessage.call(_sessionController, clientPacketTypes.SOCIAL_STARTED, { url: social.url });
                }
            }

            if (Array.isArray(_sessionController.monetizations)) {
                for (const monetization of _sessionController.monetizations) {
                    log("Tự động xử lý monetization:", monetization);
                    const monetizationId = monetization.id;
                    const monetizationSendMessage = monetization.sendMessage;
                    if (!monetizationSendMessage) continue;

                    switch (monetizationId) {
                        case 22: // readArticles2
                            monetizationSendMessage.call(monetization, { event: "read" });
                            break;
                        case 25: // operaGX
                            monetizationSendMessage.call(monetization, { event: "start" });
                            monetizationSendMessage.call(monetization, { event: "installClicked" });
                            fetch('/_api/v2/affiliate/operaGX', { method: 'GET', mode: 'no-cors' }).catch(()=>{});
                            setTimeout(() => {
                                fetch('https://work.ink/_api/v2/callback/operaGX', {
                                    method: 'POST',
                                    mode: 'no-cors',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ noteligible: true })
                                }).catch(()=>{});
                            }, 5000);
                            break;
                        case 34: // norton
                        case 71: // externalArticles
                            monetizationSendMessage.call(monetization, { event: "start" });
                            monetizationSendMessage.call(monetization, { event: "installClicked" });
                            break;
                        case 45: // pdfeditor
                        case 57: // betterdeals
                            monetizationSendMessage.call(monetization, { event: "installed" });
                            break;
                        default:
                            try {
                                monetizationSendMessage.call(monetization, { event: "start" });
                                monetizationSendMessage.call(monetization, { event: "installClicked" });
                            } catch(e) {}
                            break;
                    }
                }
            }
        }

        const startTime = Date.now();

        function createSendMessageProxy() {
            return function(...args) {
                const packet_type = args[0];
                const packet_data = args[1];

                if (packet_type !== clientPacketTypes.PING) {
                    log("Sent message:", packet_type, packet_data);
                }

                if (packet_data === clientPacketTypes.MONOCLE || packet_type === clientPacketTypes.MONOCLE) {
                    log("Đã chặn phát hiện Monocle / VPN.");
                    return;
                }

                if (packet_type === clientPacketTypes.ADBLOCKER_DETECTED) {
                    log("Đã chặn phát hiện AdBlock.");
                    return;
                }

                if (packet_type === clientPacketTypes.TURNSTILE_RESPONSE) {
                    const ret = _sendMessage.apply(this, args);
                    challengeSolved = true;
                    solveChallenge();
                    return ret;
                }

                return _sendMessage.apply(this, args);
            };
        }

        function createOnLinkInfoProxy() {
            return function(...args) {
                const linkInfo = args[0];
                _linkInfo = linkInfo;
                log("Nhận linkInfo:", linkInfo);
                solveChallenge();

                try {
                    Object.defineProperty(linkInfo, "isAdblockEnabled", {
                        get() { return false; },
                        set() {},
                        configurable: false,
                        enumerable: true
                    });
                } catch(e) {}

                return _onLinkInfo.apply(this, args);
            };
        }

        function redirectWorkink(url) {
            let dest = url;
            try {
                const dufUrl = new URL(dest);
                if (dufUrl.searchParams.has('duf')) {
                    dest = atob(dufUrl.searchParams.get('duf').split('').reverse().join(''));
                }
            } catch(_) {}
            showToast("Thành công!", "Đang chuyển tiếp tới link đích...", true);
            log("Chuyển tiếp đích:", dest);
            window.location.replace(dest);
        }

        function createOnLinkDestinationProxy() {
            return function(...args) {
                const payload = args[0];
                log("Đã nhận link đích Work.ink:", payload);

                const waitTimeSeconds = 15;
                const secondsPassed = (Date.now() - startTime) / 1000;

                if (secondsPassed >= waitTimeSeconds) {
                    redirectWorkink(payload.url);
                } else {
                    const remaining = Math.max(1, Math.round(waitTimeSeconds - secondsPassed));
                    showToast("Hoàn tất nhiệm vụ", `Đang chuẩn bị chuyển hướng (${remaining}s)...`, true);
                    setTimeout(() => redirectWorkink(payload.url), remaining * 1000);
                }

                return _onLinkDestination.apply(this, args);
            };
        }

        function setupSessionControllerProxy() {
            const sendMessage = resolveWriteFunction(_sessionController);
            const onLinkInfo = resolveName(_sessionController, NAME_MAP.onLinkInfo);
            const onLinkDestination = resolveName(_sessionController, NAME_MAP.onLinkDestination);
            const onProxyDetected = resolveName(_sessionController, NAME_MAP.onProxyDetected);
            const onMonocleFailed = resolveName(_sessionController, NAME_MAP.onMonocleFailed);

            _sendMessage = sendMessage.fn;
            _onLinkInfo = onLinkInfo.fn;
            _onLinkDestination = onLinkDestination.fn;
            _onProxyDetected = onProxyDetected.fn;
            _onMonocleFailed = onMonocleFailed.fn;

            const sendMessageProxy = createSendMessageProxy();
            const onLinkInfoProxy = createOnLinkInfoProxy();
            const onLinkDestinationProxy = createOnLinkDestinationProxy();

            if (sendMessage.name) {
                Object.defineProperty(_sessionController, sendMessage.name, {
                    get() { return sendMessageProxy; },
                    set(newValue) { _sendMessage = newValue; },
                    configurable: false,
                    enumerable: true
                });
            }

            if (onLinkInfo.name) {
                Object.defineProperty(_sessionController, onLinkInfo.name, {
                    get() { return onLinkInfoProxy; },
                    set(newValue) { _onLinkInfo = newValue; },
                    configurable: false,
                    enumerable: true
                });
            }

            if (onLinkDestination.name) {
                Object.defineProperty(_sessionController, onLinkDestination.name, {
                    get() { return onLinkDestinationProxy; },
                    set(newValue) { _onLinkDestination = newValue; },
                    configurable: false,
                    enumerable: true
                });
            }

            if (onProxyDetected.name) {
                Object.defineProperty(_sessionController, onProxyDetected.name, {
                    get() { return function() { log("Đã chặn Proxy detection."); }; },
                    set(newValue) { _onProxyDetected = newValue; },
                    configurable: false,
                    enumerable: true
                });
            }

            if (onMonocleFailed.name) {
                Object.defineProperty(_sessionController, onMonocleFailed.name, {
                    get() { return function() { log("Đã chặn Monocle failed."); }; },
                    set(newValue) { _onMonocleFailed = newValue; },
                    configurable: false,
                    enumerable: true
                });
            }

            log("SessionController proxies installed thành công!");
            solveChallenge();
        }

        function checkForSessionController(target, prop, value, receiver) {
            if (
                value &&
                typeof value === "object" &&
                resolveWriteFunction(value).fn &&
                resolveName(value, NAME_MAP.onLinkInfo).fn &&
                resolveName(value, NAME_MAP.onLinkDestination).fn &&
                !_sessionController
            ) {
                _sessionController = value;
                log("Đã bắt được Work.ink session controller:", _sessionController);
                setupSessionControllerProxy();
            }
            return Reflect.set(target, prop, value, receiver);
        }

        function createComponentProxy(component, componentCallback, setCallback) {
            return new Proxy(component, {
                construct(target, args) {
                    const result = Reflect.construct(target, args);
                    if (componentCallback) componentCallback(result);
                    if (setCallback && result.$$ && result.$$.ctx) {
                        result.$$.ctx = new Proxy(result.$$.ctx, { set: setCallback });
                    }
                    return result;
                }
            });
        }

        function createNodeResultProxy(result, componentCallback, setCallback) {
            return new Proxy(result, {
                get(target, prop, receiver) {
                    if (prop === "component") {
                        return createComponentProxy(target.component, componentCallback, setCallback);
                    }
                    return Reflect.get(target, prop, receiver);
                }
            });
        }

        function createNodeProxy(oldNode, componentCallback, setCallback) {
            return async (...args) => {
                const result = await oldNode(...args);
                return createNodeResultProxy(result, componentCallback, setCallback);
            };
        }

        function createKitProxy(kit) {
            if (typeof kit !== "object" || !kit) return [false, kit];
            const originalStart = "start" in kit && kit.start;
            if (!originalStart) return [false, kit];

            const kitProxy = new Proxy(kit, {
                get(target, prop, receiver) {
                    if (prop === "start") {
                        return function(...args) {
                            const appModule = args[0];
                            const options = args[2];
                            if (typeof appModule === "object" && typeof appModule.nodes === "object" && options && options.node_ids) {
                                const oldAdNode = appModule.nodes[options.node_ids[1]];
                                if (oldAdNode) {
                                    appModule.nodes[options.node_ids[1]] = createNodeProxy(oldAdNode, undefined, checkForSessionController);
                                }
                            }
                            return originalStart.apply(this, args);
                        };
                    }
                    return Reflect.get(target, prop, receiver);
                }
            });
            return [true, kitProxy];
        }

        function setupSvelteKitInterception() {
            const originalPromiseAll = Promise.all;
            let intercepted = false;
            Promise.all = async function(promises) {
                const result = originalPromiseAll.call(this, promises);
                if (!intercepted) {
                    intercepted = true;
                    return await new Promise((resolve) => {
                        result.then(([kit, app, ...args]) => {
                            const [success, wrappedKit] = createKitProxy(kit);
                            if (success) {
                                Promise.all = originalPromiseAll;
                            }
                            resolve([wrappedKit, app, ...args]);
                        }).catch(() => {
                            resolve(result);
                        });
                    });
                }
                return await result;
            };
        }

        setupSvelteKitInterception();

        // Fallback: WebSocket Listener truyền thống phòng khi SvelteKit hydrate trước
        const _add = WebSocket.prototype.addEventListener;
        WebSocket.prototype.addEventListener = function(type, handler, opts) {
            if (type === 'message') {
                const ws = this;
                const wrapped = function(e) {
                    try {
                        let msg = null;
                        if (typeof e.data === 'string') {
                            try { msg = JSON.parse(e.data); } catch(_) {}
                        }
                        if (msg) {
                            if (msg.type === 's_recaptcha_okay' || msg.type === 's_start_monetization') {
                                ws.send(JSON.stringify({ type: "c_monetization", payload: { type: "readArticles", payload: { event: "start" } } }));
                                setTimeout(() => {
                                    ws.send(JSON.stringify({ type: "c_monetization", payload: { type: "readArticles", payload: { event: "closeClicked" } } }));
                                }, 300);
                                ws.send(JSON.stringify({ type: "c_monetization", payload: { type: "browserExtension", payload: { event: "start" } } }));
                            }
                            if (msg.type === 's_monetization' && msg.payload?.type === 'browserExtension') {
                                ws.send(JSON.stringify({
                                    type: "c_monetization",
                                    payload: { type: "browserExtension", payload: { event: "confirm", token: msg.payload?.payload?.token } }
                                }));
                            }
                            if (msg.type === 's_link_destination' && msg.payload?.url) {
                                redirectWorkink(msg.payload.url);
                                return;
                            }
                        }
                    } catch(err) {}
                    return handler.apply(this, arguments);
                };
                return _add.call(this, type, wrapped, opts);
            }
            return _add.call(this, type, handler, opts);
        };

        // Auto click và gỡ bỏ overlay phiền toái
        setInterval(() => {
            const checkpointNode = document.querySelector('div.fixed.top-16.left-0.right-0.bottom-0.bg-white.z-40.overflow-y-auto');
            if (checkpointNode) checkpointNode.remove();
            document.querySelector('.main-modal')?.remove();

            const agreeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().toUpperCase() === 'AGREE');
            if (agreeBtn) agreeBtn.click();

            const destBtn = document.querySelector('#access-offers, a.button.large, button.accessBtn, .cta-btn, button:not(.skipBtn)');
            if (destBtn) {
                const txt = destBtn.textContent.trim().toLowerCase();
                if (txt.includes('destination') || txt.includes('proceed') || txt.includes('access') || txt.includes('continue') || destBtn.id === 'access-offers') {
                    destBtn.click();
                }
            }
        }, 300);
    }
})();
