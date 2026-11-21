/**
 * FastNav Suite - Turnstile Captcha Engine
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
            if (body && typeof body === "object") {
                return body;
            }
            let msg = (typeof body === "string" && body.length < 150) ? body : `HTTP ${res.status}`;
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
    // MODULE 6: CLOUDFLARE TURNSTILE AUTO-SOLVER (nerventualken.com)
    // ====================================================
    if (host.includes("nerventualken.com")) {
        log("Kích hoạt Turnstile Auto-Submitter trên nerventualken.com");
        let submitted = false;

        async function submitTurnstileToken(token) {
            if (submitted || !token) return;
            submitted = true;
            const params = new URLSearchParams(window.location.search);
            const urid = params.get('urid') || '';
            log("Đang tự động gửi token Turnstile xác thực:", { urid, token });
            try {
                await nativeFetch('https://nerventualken.com/captcha/verify', 'POST', {
                    'Content-Type': 'application/json'
                }, JSON.stringify({ urid, token }));
                log("Gửi /captcha/verify thành công!");
            } catch(e) {
                logErr("Lỗi gửi /captcha/verify:", e);
            }
            if (window.parent) {
                window.parent.postMessage({ type: 'captcha_solved', solved: true, status: 'ok', urid }, '*');
            }
        }

        let origTurnstile = window.turnstile;
        Object.defineProperty(window, 'turnstile', {
            configurable: true,
            get() { return origTurnstile; },
            set(v) {
                origTurnstile = v;
                if (origTurnstile && typeof origTurnstile.render === 'function') {
                    const origRender = origTurnstile.render;
                    origTurnstile.render = function(container, opt) {
                        const origCb = opt?.callback;
                        if (opt) {
                            opt.callback = function(tok) {
                                submitTurnstileToken(tok);
                                if (typeof origCb === 'function') origCb.apply(this, arguments);
                            };
                        }
                        return origRender.apply(this, arguments);
                    };
                }
            }
        });

        const turnstileWatcher = setInterval(() => {
            const input = document.querySelector('input[name="cf-turnstile-response"]');
            if (input && input.value) {
                clearInterval(turnstileWatcher);
                submitTurnstileToken(input.value);
            }
        }, 250);
    }
})();
