/**
 * FastNav Suite - LootLabs Engine
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
    // MODULE 5: LOOTLABS INSTANT SOLVER (links.lootlabs.gg / *.lootlabs.gg)
    // ====================================================
    if (host.includes("lootlabs.gg")) {
        log("Kích hoạt LootLabs Instant Solver Engine");
        showToast("LootLabs Bypass", "Đang tự động bóc tách và giải quyết nhiệm vụ...");

        function decryptLootDestination(dataStr, keyLen = 5) {
            try {
                const clean = dataStr.trim().replace(/[^A-Za-z0-9+/=]/g, '');
                const binary = atob(clean);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                const key = bytes.slice(0, keyLen);
                const payload = bytes.slice(keyLen);
                const out = new Uint8Array(payload.length);
                for (let i = 0; i < payload.length; i++) {
                    out[i] = payload[i] ^ key[i % keyLen];
                }
                return new TextDecoder('utf-8').decode(out).trim();
            } catch(e) {
                logErr("Lỗi giải mã đích LootLabs:", e);
                return dataStr.trim();
            }
        }

        // Can thiệp vào fetch của window / unsafeWindow để ép max_tasks = 1 và đọc /tc
        const targetWindow = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
        const origFetch = targetWindow.fetch;

        targetWindow.fetch = async function(...args) {
            const [resource, config = {}] = args;
            const url = typeof resource === 'string' ? resource : resource?.url || '';

            // 1. Ép /tc chỉ yêu cầu 1 task duy nhất
            if (config.method && config.method.toUpperCase() === 'POST' && url.endsWith('/tc')) {
                let body = config.body;
                if (body) {
                    try {
                        const parsed = typeof body === "string" ? JSON.parse(body) : body;
                        if (parsed && typeof parsed === 'object' && 'max_tasks' in parsed) {
                            parsed.max_tasks = 1;
                            parsed.num_of_tasks = '1';
                            parsed.bl = [18, 2, 33, 7, 21, 49];
                            parsed.tier_id = parsed.tier_id || '0';
                            parsed.taboola_user_sync = '0';
                            config.body = JSON.stringify(parsed);
                            log("Đã tiêm tối giản 1 task vào /tc request");
                        }
                    } catch(e) {}
                }
            }

            const response = await origFetch.apply(this, args);

            // 2. Bắt response của /tc
            if (url.includes('/tc')) {
                try {
                    const clone = response.clone();
                    const data = await clone.json();
                    log("Đã bắt được danh sách nhiệm vụ /tc:", data);
                    handleLootlabsTasks(data);
                } catch(e) {
                    logErr("Lỗi parse /tc response:", e);
                }
            }

            return response;
        };

        function handleLootlabsTasks(data) {
            if (!Array.isArray(data) || data.length === 0) return;

            // Kích hoạt postbacks
            data.filter(t => typeof t?.postback_url === 'string').forEach(t => {
                log("Gửi postback:", t.postback_url);
                nativeFetch(t.postback_url, "GET").catch(() => {});
            });

            // Tìm task captcha hoặc dùng task đầu
            const captchaTask = data.find(t => t?.ad_url && typeof t.ad_url === 'string' && t.ad_url.includes('nerventualken.com/captcha'));
            const targetTask = captchaTask || data[0];

            let { urid, task_id, action_pixel_url, session_id } = targetTask;
            let sessionId = session_id || targetWindow.p?.SESSION || targetWindow.conf_rew?.session || '';
            let key = targetWindow.KEY || targetWindow.conf_rew?.key || targetWindow.p?.KEY || '';
            let tid = targetWindow.TID || targetWindow.conf_rew?.cd || targetWindow.p?.TID || '0';

            // Gửi sự kiện click
            data.forEach((t, idx) => {
                if (t.task_id) {
                    nativeFetch(`https://enaightdecipie.com/?event=task_clicked&session_id=${t.task_id}&info=${idx + 1}`).catch(() => {});
                }
            });

            const subId = parseInt(String(urid).slice(-5)) % 3;
            const serverDomain = typeof targetWindow.INCENTIVE_SERVER_DOMAIN !== 'undefined' ? targetWindow.INCENTIVE_SERVER_DOMAIN : 'onsultingco.com';
            const syncerDomain = typeof targetWindow.INCENTIVE_SYNCER_DOMAIN !== 'undefined' ? targetWindow.INCENTIVE_SYNCER_DOMAIN : 'nismscoldnesfspu.org';
            const isLoot = location.href.includes('loot') ? '1' : '0';

            const wsUrl = `wss://${subId}.${serverDomain}/c?uid=${urid}&cat=${task_id}&key=${key}&session_id=${sessionId}&is_loot=${isLoot}&tid=${tid}`;
            log("Kết nối LootLabs WebSocket:", wsUrl);
            showToast("LootLabs Bypass", "Đang xử lý kết nối máy chủ xác thực...");

            let captchaUrl = targetTask.ad_url || '';
            if (captchaUrl.startsWith('//')) captchaUrl = 'https:' + captchaUrl;
            if (!captchaUrl.startsWith('http')) captchaUrl = 'https://nerventualken.com/captcha?urid=' + urid;

            setupLootlabsWS(wsUrl, captchaUrl, urid, task_id, tid);

            if (navigator.sendBeacon) {
                navigator.sendBeacon(`https://${subId}.${serverDomain}/st?uid=${urid}&cat=${task_id}`);
            }
            if (action_pixel_url) {
                nativeFetch(action_pixel_url.startsWith('//') ? 'https:' + action_pixel_url : action_pixel_url).catch(() => {});
            }
            nativeFetch(`https://${syncerDomain}/td?ac=auto_complete&urid=${urid}&cat=${task_id}&tid=${tid}`).catch(() => {});
        }

        function setupLootlabsWS(wsUrl, captchaUrl, urid, taskId, tid) {
            // Nhúng iframe giải captcha ngầm hoặc hiển thị nhỏ gọn
            let iframe = document.getElementById("lootlabs-captcha-frame");
            if (!iframe) {
                iframe = document.createElement("iframe");
                iframe.id = "lootlabs-captcha-frame";
                iframe.src = captchaUrl;
                iframe.style.cssText = "position:fixed;bottom:10px;left:10px;width:320px;height:120px;z-index:999999;border:1px solid #10b981;border-radius:10px;background:#0f172a;box-shadow:0 10px 30px rgba(0,0,0,0.8);";
                (document.body || document.documentElement).appendChild(iframe);
            }

            const ws = new WebSocket(wsUrl);
            let pingTimer = null;

            ws.onopen = () => {
                log("WebSocket LootLabs đã mở, gửi ping giữ nhịp");
                pingTimer = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send('0');
                        log("LootLabs ping sent");
                    }
                }, 10000);
            };

            ws.onclose = () => {
                log("WebSocket LootLabs đã đóng");
                if (pingTimer) clearInterval(pingTimer);
            };

            ws.onerror = (err) => {
                logErr("WebSocket LootLabs gặp lỗi:", err);
                if (pingTimer) clearInterval(pingTimer);
            };

            ws.onmessage = async (msg) => {
                log("WebSocket LootLabs nhận tin nhắn:", msg.data);
                if (typeof msg.data === 'string' && msg.data.startsWith('r:')) {
                    const cleanRaw = msg.data.replace(/^r:/, '').trim();
                    const destUrl = decryptLootDestination(cleanRaw, 5);
                    log("ĐÃ GIẢI MÃ THÀNH CÔNG LINK ĐÍCH:", destUrl);
                    showToast("Thành công!", "Đã mở khóa đích, đang chuyển hướng...", true);
                    ws.close();
                    if (iframe) iframe.remove();
                    if (destUrl && destUrl.startsWith('http')) {
                        setTimeout(() => {
                            window.location.replace(destUrl);
                        }, 500);
                    }
                }
            };

            // Lắng nghe message từ iframe captcha
            window.addEventListener("message", function onCaptchaMessage(evt) {
                if (!evt.origin || !evt.origin.includes("nerventualken.com")) return;
                const d = evt.data;
                log("Tin nhắn từ Captcha Iframe:", d);
                if (d === 'ok' || d === 'solved' || (typeof d === 'object' && d?.solved)) {
                    log("Captcha Turnstile đã giải quyết thành công!");
                    showToast("LootLabs", "Captcha đã giải! Đang đợi máy chủ cấp link đích...");
                    nativeFetch(`https://nerventualken.com/td?ac=captcha&urid=${urid}&cat=${taskId}&tid=${tid}`).catch(() => {});
                }
            });
        }
    }
})();
