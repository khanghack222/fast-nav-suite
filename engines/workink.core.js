/**
 * FastNav Suite - Work.ink Engine
 * Independent Core Module
 */
(function() {
    "use strict";

    const currentHost = (typeof window !== "undefined" && window.location.hostname) ? window.location.hostname.toLowerCase() : "";
    if (!currentHost.includes("work.ink") && !currentHost.includes("workink.click") && !currentHost.includes("pass.work.ink")) {
        return;
    }

    // ====================================================
    // INSTANT BACKGROUND WEBSOCKET BYPASSER (ZERO DELAY)
    // ====================================================
    (function runInstantBgBypass() {
        const _BASE = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        function b62(s) {
            let v = _BASE.indexOf(s[0]);
            for (let i = 1; i < s.length; i++) {
                v = 62 * v + _BASE.indexOf(s[i]);
            }
            return v;
        }

        try {
            const pathParts = window.location.pathname.replace(/^\/+|\/+$/g, "").split("/");
            if (pathParts.length < 2) return;
            const encodedUid = pathParts[pathParts.length - 2];
            const linkCustom = pathParts[pathParts.length - 1];
            const decodedUid = b62(encodedUid);

            log("Khởi chạy Instant Background Bypass cho:", linkCustom, decodedUid);
            const ws = new WebSocket("wss://redirect-api.work.ink/v1/ws");

            ws.onopen = () => {
                log("Đã kết nối trực tiếp WebSocket redirect-api!");
                ws.send(JSON.stringify({
                    type: "c_announce",
                    payload: { linkCustom, linkUserId: decodedUid, referer: "unknown" }
                }));
            };

            let socials = [];
            let monos = new Set();

            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    const t = data.type;
                    const payload = data.payload || {};

                    if (t === "s_link_info") {
                        if (payload.socials) socials.push(...payload.socials);
                        const ms = payload.monetizationScript || "";
                        if (ms.includes("readArticles")) monos.add("readArticles");
                        if (ms.includes("browserExtension")) monos.add("browserExtension");
                    } else if (t === "s_start_recaptcha_check") {
                        ws.send(JSON.stringify({
                            type: "c_recaptcha_response",
                            payload: { recaptchaResponse: crypto.randomUUID() }
                        }));
                    } else if (t === "s_recaptcha_okay") {
                        for (const s of socials) {
                            ws.send(JSON.stringify({ type: "c_social_started", payload: { url: s.url } }));
                        }
                        for (const m of monos) {
                            if (m === "readArticles") {
                                ws.send(JSON.stringify({ type: "c_monetization", payload: { type: "readArticles", payload: { event: "start" } } }));
                                ws.send(JSON.stringify({ type: "c_monetization", payload: { type: "readArticles", payload: { event: "closeClicked" } } }));
                                ws.send(JSON.stringify({ type: "c_monetization", payload: { type: "readArticles", payload: { event: "completed" } } }));
                            } else if (m === "browserExtension") {
                                ws.send(JSON.stringify({ type: "c_monetization", payload: { type: "browserExtension", payload: { event: "start" } } }));
                            }
                        }
                    } else if (t === "s_monetization") {
                        if (payload.type === "browserExtension") {
                            ws.send(JSON.stringify({
                                type: "c_monetization",
                                payload: { type: "browserExtension", payload: { event: "confirm", token: payload.payload?.token } }
                            }));
                        }
                    } else if (t === "s_link_destination") {
                        let destUrl = payload.url || "";
                        try {
                            const parsed = new URL(destUrl);
                            if (parsed.searchParams.has("duf")) {
                                destUrl = atob(parsed.searchParams.get("duf").split("").reverse().join(""));
                            }
                        } catch(err) {}

                        if (destUrl && destUrl.startsWith("http")) {
                            log("ĐÃ NHẬN LINK ĐÍCH NGAY LẬP TỨC:", destUrl);
                            try { ws.close(); } catch(_) {}
                            window.location.replace(destUrl);
                        }
                    }
                } catch(err) {}
            };
        } catch(e) {
            logErr("Lỗi khởi tạo Instant Bg Bypass:", e);
        }
    })();



    
    const DEBUG = true; // debug logging

    // Preserve original console methods in case the site overrides them
    const oldLog = unsafeWindow.console.log;
    const oldWarn = unsafeWindow.console.warn;
    const oldError = unsafeWindow.console.error;
    
    // Wrapper functions prepend a tag and only log when DEBUG is true
    function log(...args) { if (DEBUG) oldLog("[UnShortener]", ...args); }
    function warn(...args) { if (DEBUG) oldWarn("[UnShortener]", ...args); }
    function error(...args) { if (DEBUG) oldError("[UnShortener]", ...args); }

    // Override console.clear in DEBUG mode to prevent the site from erasing debug logs
    if (DEBUG) unsafeWindow.console.clear = function() {};

    const container = unsafeWindow.document.createElement("div");
    container.style.position = "fixed";
    container.style.bottom = "10px";
    container.style.left = "10px";
    container.style.zIndex = 999999;

    // Attach closed shadow root
    const shadow = container.attachShadow({ mode: "closed" });

    // Create your hint element
    const hint = unsafeWindow.document.createElement("div");
    hint.textContent = "🔒 Please solve the captcha to continue";

    Object.assign(hint.style, {
        background: "rgba(0,0,0,0.8)",
        color: "#fff",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "14px",
        fontFamily: "sans-serif",
        pointerEvents: "none"
    });

    shadow.appendChild(hint);
    function mountHint() {
        const doc = (typeof unsafeWindow !== "undefined" && unsafeWindow.document) ? unsafeWindow.document : document;
        const target = doc.body || doc.documentElement;
        if (target && !doc.contains(container)) {
            target.appendChild(container);
        }
    }
    mountHint();
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mountHint);
    }

    const NAME_MAP = {
        onLinkInfo: ["onLinkInfo"],
        onLinkDestination: ["onLinkDestination"],
        onProxyDetected: ["onProxyDetected"],
        onMonocleFailed: ["onMonocleFailed"]
    };

    function resolveName(obj, candidates) {
        for (let i = 0; i < candidates.length; i++) {
            const name = candidates[i];
            if (typeof obj[name] === "function") {
                return { fn: obj[name], index: i, name };
            }
        }
        return { fn: null, index: -1, name: null };
    }

    function resolveWriteFunction(obj) {
        for (let i in obj) {
            if (typeof obj[i] == "function" && obj[i].length == 2) {
                return { fn: obj[i], name: i };
            }
        }
        return { fn: null, index: -1, name: null };
    }

    // Global state
    let _sessionController = undefined;
    let _linkInfo = undefined;
    let _sendMessage = undefined;
    let _onProxyDetected = undefined;
    let _onMonocleFailed = undefined;
    let _onLinkInfo = undefined;
    let _onLinkDestination = undefined;
    
    // Constants
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
        if (!_sessionController || !_sendMessage) return;
        // If modal or continue button is present, turnstile is already solved
        const hasTurnstileInput = !!document.querySelector('input[name="cf-turnstile-response"]')?.value;
        const hasPaywallModal = Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim().toLowerCase() === 'continue' || b.textContent.trim().toLowerCase() === 'back');
        if (!challengeSolved && !hasTurnstileInput && !hasPaywallModal) return;

        challengeSolved = true;
        if (hint) hint.textContent = "⏳ Đang tự động vượt Work.ink Paywall & Ads...";

        hint.textContent = "⏳ Captcha solved, bypassing... (This can take up to a minute)";

        // Send bypass messages
        for (const social of _linkInfo.socials) {
            log("Processing social:", social);
            _sendMessage.call(this, clientPacketTypes.SOCIAL_STARTED, {
                url: social.url
            });
        }

        for (const monetization of _sessionController.monetizations) {
            log("Processing monetization:", monetization);
            const monetizationId = monetization.id;
            const monetizationSendMessage = monetization.sendMessage;

            switch (monetizationId) {
                case 22: { // readArticles2
                    monetizationSendMessage.call(monetization, { event: "read" });
                    monetizationSendMessage.call(monetization, { event: "completed" });
                    break;
                }
                case 23: // readArticles
                case 24: {
                    monetizationSendMessage.call(monetization, { event: "start" });
                    monetizationSendMessage.call(monetization, { event: "read" });
                    monetizationSendMessage.call(monetization, { event: "completed" });
                    break;
                }

                case 25: { // operaGX
                    monetizationSendMessage.call(monetization, {
                        event: "start"
                    });
                    monetizationSendMessage.call(monetization, {
                        event: "installClicked"
                    });
                    fetch('/_api/v2/affiliate/operaGX', {
                        method: 'GET',
                        mode: 'no-cors'
                    });
                    setTimeout(() => {
                        fetch('https://work.ink/_api/v2/callback/operaGX', {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                'noteligible': true
                            })
                        });
                    }, 5000);
                    break;
                }

                case 34: { // norton
                    monetizationSendMessage.call(monetization, {
                        event: "start"
                    });
                    monetizationSendMessage.call(monetization, {
                        event: "installClicked"
                    });
                    break;
                }

                case 71: { // externalArticles
                    monetizationSendMessage.call(monetization, {
                        event: "start"
                    });
                    monetizationSendMessage.call(monetization, {
                        event: "installClicked"
                    });
                    break;
                }

                case 45: { // pdfeditor
                    monetizationSendMessage.call(monetization,{
                        event: "installed"
                    });
                    break;
                }

                case 57: { // betterdeals
                    monetizationSendMessage.call(monetization, {
                        event: "installed"
                    });
                    break;
                }

                default: {
                    log("Unknown monetization type, firing generic complete:", monetizationId, monetization);
                    try {
                        monetizationSendMessage.call(monetization, { event: "start" });
                        monetizationSendMessage.call(monetization, { event: "read" });
                        monetizationSendMessage.call(monetization, { event: "completed" });
                        monetizationSendMessage.call(monetization, { event: "installed" });
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

            // https://docs.spur.us/monocle/assessment, vpn/proxy detection
            if (packet_data === clientPacketTypes.MONOCLE) {
                warn("Blocked monocle message to avoid detections.");
                return;
            }

            if (packet_type === clientPacketTypes.ADBLOCKER_DETECTED) {
                warn("Blocked adblocker detected message to avoid false positive.");
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

            log("Link info received:", linkInfo);
            solveChallenge();

            Object.defineProperty(linkInfo, "isAdblockEnabled", {
                get() { return false },
                set(newValue) {
                    log("Attempted to set isAdblockEnabled to:", newValue);
                },
                configurable: false,
                enumerable: true
            });

            return _onLinkInfo.apply(this, args);
        };
    }

    function updateHint(waitLeft) {
        hint.textContent = `⏳ Destination found, redirecting in ${Math.round(waitLeft)} seconds...`;
    }

    function redirect(url) {
        hint.textContent = "🎉 Redirecting to your destination...";
        window.location.href = url;
    }

    function startCountdown(url, waitLeft) {
        updateHint(waitLeft);

        const interval = setInterval(() => {
            waitLeft -= 1;
            if (waitLeft > 0) {
                updateHint(waitLeft);
            } else {
                clearInterval(interval);
                redirect(url);
            }
        }, 1000);
    }
    
    function createOnLinkDestinationProxy() {
        return function (...args) {
            const payload = args[0];
            log("Link destination received:", payload);

            log("Bypass thành công, chuyển hướng ngay lập tức:", payload.url);
            redirect(payload.url);

            return _onLinkDestination.apply(this, args);
        };
    }

    function createOnProxyDetectedProxy() {
        return function () {
            log("Proxy detection blocked.");
            return;
        };
    }

    function createOnMonocleFailedProxy() {
        return function (...args) {
            log("Monocle failure detection blocked.");
            return;
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
        const onProxyDetectedProxy = createOnProxyDetectedProxy();
        const onMonocleFailedProxy = createOnMonocleFailedProxy();

        // Patch the actual property name that exists
        Object.defineProperty(_sessionController, sendMessage.name, {
            get() { return sendMessageProxy },
            set(newValue) { _sendMessage = newValue },
            configurable: false,
            enumerable: true
        });

        Object.defineProperty(_sessionController, onLinkInfo.name, {
            get() { return onLinkInfoProxy },
            set(newValue) { _onLinkInfo = newValue },
            configurable: false,
            enumerable: true
        });

        Object.defineProperty(_sessionController, onLinkDestination.name, {
            get() { return onLinkDestinationProxy },
            set(newValue) { _onLinkDestination = newValue },
            configurable: false,
            enumerable: true
        });

        Object.defineProperty(_sessionController, onProxyDetected.name, {
            get() { return onProxyDetectedProxy },
            set(newValue) { _onProxyDetected = newValue },
            configurable: false,
            enumerable: true
        });

        Object.defineProperty(_sessionController, onMonocleFailed.name, {
            get() { return onMonocleFailedProxy },
            set(newValue) { _onMonocleFailed = newValue },
            configurable: false,
            enumerable: true
        });

        log(`SessionController proxies installed: ${sendMessage.name}, ${onLinkInfo.name}, ${onLinkDestination.name}, ${onProxyDetected.name}, ${onMonocleFailed.name}`);
    }

    function checkForSessionController(target, prop, value, receiver) {
        log("Checking property set:", prop, value);

        if (
            value &&
            typeof value === "object" &&
            resolveWriteFunction(value).fn &&
            resolveName(value, NAME_MAP.onLinkInfo).fn &&
            resolveName(value, NAME_MAP.onLinkDestination).fn &&
            !_sessionController
        ) {
            _sessionController = value;
            log("Intercepted session controller:", _sessionController);
            setupSessionControllerProxy();
        }

        return Reflect.set(target, prop, value, receiver);
    }

    function pageComponentContextSetProxy(target, prop, value, receiver) {
        log("Page component property set:", prop, value);

        if (prop === "1") {
            log(`Blocked monocle popup by overriding context property ${value}.`);
            return value;
        }

        return Reflect.set(target, prop, value, receiver);
    }

    function createComponentProxy(component, componentCallback, setCallback) {
        return new Proxy(component, {
            construct(target, args) {
                const result = Reflect.construct(target, args);
                log("Intercepted SvelteKit component construction:", target, args, result);

                if (componentCallback) {
                    componentCallback(result);
                }

                if (setCallback) {
                    result.$$.ctx = new Proxy(result.$$.ctx, {
                        set: setCallback
                    });
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
            log("Intercepted SvelteKit node result:", result);
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

                        if (typeof appModule === "object" &&
                            typeof appModule.nodes === "object" &&
                            typeof options === "object" &&
                            typeof options.node_ids === "object") {

                            const oldPageNode = appModule.nodes[options.node_ids[0]];
                            appModule.nodes[options.node_ids[0]] = createNodeProxy(oldPageNode, undefined, pageComponentContextSetProxy);
                            
                            const oldAdNode = appModule.nodes[options.node_ids[1]];
                            appModule.nodes[options.node_ids[1]] = createNodeProxy(oldAdNode, undefined, checkForSessionController);
                        }

                        log("kit.start intercepted!", options);
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
                        log("SvelteKit modules loaded");

                        const [success, wrappedKit] = createKitProxy(kit);
                        if (success) {
                            // Restore original Promise.all
                            Promise.all = originalPromiseAll;

                            log("Wrapped kit ready:", wrappedKit, app);
                        }

                        resolve([wrappedKit, app, ...args]);
                    });
                });
            }

            return await result;
        };
    }

    // Initialize the bypass
    setupSvelteKitInterception();

    // Patched in 2 cpu cycles atp
    unsafeWindow.window.googletag = {cmd: [], _loaded_: true};

    // More adblocker detections, really?
    const originalFetch = unsafeWindow.window.fetch;

    function createFetchProxy() {
        return function(...args) {
            const url = args[0];
            const options = args[1] || {};
            if (url === "https://js.stripe.com/v3/" && options.method === "HEAD" && options.mode === "no-cors") {
                log("Blocked ad blocker check:", url);
                return Promise.resolve(new Response("", { status: 200 }));
            } else if (url === "/country.json") {
                log("Blocked country.json fetch:", url);
                return Promise.resolve(new Response(JSON.stringify({ countryCode: "US" }), { status: 200 }));
            }
            return originalFetch.apply(this, args);
        };
    }

    const fetchProxy = createFetchProxy();
    unsafeWindow.window.fetch = fetchProxy;

    // Define blocked ad classes and ids
    const blockedClasses = [
        "adsbygoogle",
        "adsense-wrapper",
        "inline-ad",
        "gpt-billboard-container"
    ];

    const blockedIds = [
        "billboard-1",
        "billboard-2",
        "billboard-3",
        "sidebar-ad-1",
        "skyscraper-ad-1"
    ];

    // Remove injected ads
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType === 1) {
                    // Block by class
                    blockedClasses.forEach((cls) => {
                        // Direct match
                        if (node.classList?.contains(cls)) {
                            node.remove();
                            log("Removed injected ad by class:", node);
                        }
                        // Or children inside the node
                        node.querySelectorAll?.(`.${cls}`).forEach((el) => {
                            el.remove();
                            log("Removed nested ad:", el);
                        });
                    });
                    // Block by id
                    blockedIds.forEach((id) => {
                        // Direct match
                        if (node.id === id) {
                            node.remove();
                            log("Removed injected ad by id:", node);
                        }
                        // Or children inside the node
                        node.querySelectorAll?.(`#${id}`).forEach((el) => {
                            el.remove();
                            log("Removed nested ad:", el);
                        });
                    });
                }
            }
        }
    });

    // Start observing the document for changes
    observer.observe(unsafeWindow.document.documentElement, { childList: true, subtree: true });

    // Tự động bypass modal chọn gói / Watch Ad / Continue
    setInterval(() => {
        // Nếu thấy nút Continue
        const btns = Array.from(document.querySelectorAll('button'));
        
        // Tìm radio hoặc card Watch Ad
        const watchAdOption = Array.from(document.querySelectorAll('div, label, span, p')).find(el => {
            const t = el.textContent.trim().toLowerCase();
            return t.includes('watch ad') && !t.includes('no ads');
        });
        if (watchAdOption) {
            const clickable = watchAdOption.closest('div[class*="cursor"], label, button') || watchAdOption;
            clickable.click();
        }

        const continueBtn = btns.find(b => b.textContent.trim().toLowerCase() === 'continue');
        if (continueBtn && !continueBtn.disabled) {
            log("Tự động click nút Continue modal!");
            continueBtn.click();
        }

        // Kiểm tra turnstile token trong form để kích hoạt solveChallenge
        const turnstileResp = document.querySelector('input[name="cf-turnstile-response"]')?.value;
        if (turnstileResp && !challengeSolved) {
            challengeSolved = true;
            solveChallenge();
        }

        // Bấm nút Go To Destination / Access Offers nếu đã xuất hiện
        const destBtn = document.querySelector('#access-offers, a.button.large, button.accessBtn, .cta-btn, button:not(.skipBtn)');
        if (destBtn) {
            const txt = destBtn.textContent.trim().toLowerCase();
            if (txt.includes('destination') || txt.includes('proceed') || txt.includes('access') || txt.includes('continue') || destBtn.id === 'access-offers') {
                destBtn.click();
            }
        }
    }, 400);


    // Bỏ qua bộ đếm thời gian (Countdown timer 46s/50s) trên DOM nếu có
    setInterval(() => {
        // Tìm bất kỳ element nào có bộ đếm ngược hoặc class countdown
        const timeElems = document.querySelectorAll('[class*="countdown"], [class*="timer"], [id*="timer"], [id*="countdown"]');
        timeElems.forEach(el => {
            el.textContent = "0s";
        });

        // Tự động tìm và click nút hoàn thành/bỏ qua ngay lập tức
        const skipBtn = document.querySelector('button.skipBtn, button.skip, button[class*="skip"]');
        if (skipBtn) {
            log("Tự động click nút Skip ngay lập tức!");
            skipBtn.click();
        }
    }, 200);

})();
