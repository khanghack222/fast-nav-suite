/**
 * FastNav Suite - Madium Engine
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
    // MODULE 4: MADIUM (app.getmadium.xyz) AUTO-KEY & INTRO BYPASS
    // ====================================================
    if (host.includes("getmadium.xyz")) {
        log("Kích hoạt Madium Engine trên app.getmadium.xyz");

        function getUserIdFromToken(tok) {
            try {
                if (!tok) return null;
                const p = tok.split('.')[1];
                if (!p) return null;
                const pad = '='.repeat((4 - p.length % 4) % 4);
                const json = atob(p + pad);
                const data = JSON.parse(json);
                return data.id || data.sub || data.user_id || null;
            } catch(e) { return null; }
        }

        async function getMadiumHeaders() {
            try {
                let devId = localStorage.getItem("madium_device_v1");
                if (!devId || !/^[a-zA-Z0-9_-]{16,128}$/.test(devId)) {
                    devId = crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, "");
                    localStorage.setItem("madium_device_v1", devId);
                }
                const nav = navigator;
                let highEntropy = {};
                try {
                    highEntropy = await nav.userAgentData?.getHighEntropyValues?.(["architecture", "bitness", "model", "platformVersion", "uaFullVersion"]) ?? {};
                } catch(e) {}

                const fpObj = {
                    userAgent: nav.userAgent,
                    platform: nav.platform,
                    languages: nav.languages,
                    hardwareConcurrency: nav.hardwareConcurrency,
                    deviceMemory: nav.deviceMemory ?? null,
                    maxTouchPoints: nav.maxTouchPoints,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    screen: [screen.width, screen.height, screen.availWidth, screen.availHeight, screen.colorDepth],
                    pixelRatio: window.devicePixelRatio,
                    brands: nav.userAgentData?.brands ?? [],
                    mobile: nav.userAgentData?.mobile ?? null,
                    uaPlatform: nav.userAgentData?.platform ?? "",
                    highEntropy: highEntropy
                };

                const enc = new TextEncoder().encode(JSON.stringify(fpObj));
                const digest = await crypto.subtle.digest("SHA-256", enc);
                const fpHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");

                return {
                    "X-Madium-Device": devId,
                    "X-Madium-Fingerprint": fpHash
                };
            } catch(e) {
                return {};
            }
        }

        async function initMadium() {
            const token = localStorage.getItem("mad_token");
            if (!token) {
                log("Chưa đăng nhập Madium, vui lòng đăng nhập.");
                return;
            }

            const userId = getUserIdFromToken(token);
            if (userId) {
                // Tự động bỏ qua 3 bước bắt buộc 30 giây (Wyv, Like Youtube, Sub Youtube)
                try {
                    sessionStorage.setItem("mad_lootlabs_intro", userId);
                    log("Đã bỏ qua 3 nhiệm vụ mạng xã hội của Madium.");
                } catch(e) {}
            }

            // Kiểm tra xem vừa từ LootLabs quay về hay không
            if (userId) {
                const pendingKey = `mad_lootlabs_pending:${userId}`;
                let pendingData = null;
                try { pendingData = JSON.parse(localStorage.getItem(pendingKey) || "null"); } catch(e) {}

                if (pendingData && pendingData.clickId && pendingData.expiresAt > Date.now()) {
                    showToast("Madium Checkpoint", "LootLabs đã hoàn tất! Đang gửi xác nhận cộng giờ...", true);
                    log("Phát hiện phiên pending:", pendingData);

                    const madHeaders = await getMadiumHeaders();
                    // Kiểm tra xác thực tới 10 lần
                    for (let t = 0; t < 10; t++) {
                        if (t > 0) await new Promise(r => setTimeout(r, 2500));
                        try {
                            const res = await nativeFetch(`https://auth.getmadium.xyz/getkey/lootlabs/status?click_id=${encodeURIComponent(pendingData.clickId)}`, "GET", {
                                ...madHeaders,
                                "Authorization": `Bearer ${token}`
                            });
                            log("Status check:", res);
                            if (res && res.status === "credited") {
                                localStorage.removeItem(pendingKey);
                                showToast("Thành công tuyệt đối", `Đã cộng ${res.creditedHours || 24}h vào tài khoản Madium!`, true);
                                setTimeout(() => window.location.reload(), 1500);
                                return;
                            } else if (res && res.status === "step_done") {
                                showToast("Checkpoint hoàn tất", `Bước ${res.completedSteps} đã xong. Đang mở bước tiếp theo...`, true);
                                localStorage.removeItem(pendingKey);
                                setTimeout(() => startLootlabsKey(pendingData.platform || "windows"), 1200);
                                return;
                            } else if (res && res.status === "already_stocked") {
                                localStorage.removeItem(pendingKey);
                                showToast("Thông báo", "Tài khoản của bạn hiện vẫn còn thời gian key!", true);
                                return;
                            } else if (res && res.status === "expired") {
                                localStorage.removeItem(pendingKey);
                                showToast("Phiên hết hạn", "Phiên LootLabs đã hết hạn, vui lòng bắt đầu lại.", false);
                                return;
                            }
                        } catch(err) {
                            logErr("Lỗi check status:", err);
                        }
                    }
                }
            }

            // Tạo nút bấm hỗ trợ nhanh trên giao diện
            function createMadiumPanel() {
                if (document.getElementById("madium-fastnav-panel")) return;
                const panel = document.createElement("div");
                panel.id = "madium-fastnav-panel";
                panel.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:99999;background:rgba(15,23,42,0.95);border:1.5px solid #22c55e;border-radius:12px;padding:12px 16px;box-shadow:0 10px 30px rgba(0,0,0,0.8);display:flex;flex-direction:column;gap:8px;font-family:-apple-system,sans-serif;";
                
                const title = document.createElement("div");
                title.style.cssText = "color:#f8fafc;font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:6px;";
                title.innerHTML = "<span style='color:#22c55e;'>⚡</span> FastNav LootLabs Auto-Key";
                panel.appendChild(title);

                const btnRow = document.createElement("div");
                btnRow.style.cssText = "display:flex;gap:8px;";

                const btnWin = document.createElement("button");
                btnWin.textContent = "Nhận Key Windows";
                btnWin.style.cssText = "background:#22c55e;color:#0f172a;font-weight:700;font-size:12px;padding:6px 12px;border:none;border-radius:6px;cursor:pointer;";
                btnWin.onclick = () => startLootlabsKey("windows");

                const btnAnd = document.createElement("button");
                btnAnd.textContent = "Nhận Key Android";
                btnAnd.style.cssText = "background:#3b82f6;color:#ffffff;font-weight:700;font-size:12px;padding:6px 12px;border:none;border-radius:6px;cursor:pointer;";
                btnAnd.onclick = () => startLootlabsKey("android");

                btnRow.appendChild(btnWin);
                btnRow.appendChild(btnAnd);
                panel.appendChild(btnRow);
                document.body.appendChild(panel);
            }

            createMadiumPanel();
        }

        async function startLootlabsKey(platform = "windows") {
            const token = localStorage.getItem("mad_token");
            if (!token) {
                showToast("Chưa đăng nhập", "Vui lòng đăng nhập Madium trước khi nhận key!");
                return;
            }
            const userId = getUserIdFromToken(token);
            try {
                if (userId) sessionStorage.setItem("mad_lootlabs_intro", userId);
            } catch(e) {}

            showToast("Madium Auto-Key", `Đang khởi tạo LootLabs (${platform})...`);
            try {
                const madHeaders = await getMadiumHeaders();
                const res = await nativeFetch("https://auth.getmadium.xyz/getkey/lootlabs/start", "POST", {
                    ...madHeaders,
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }, JSON.stringify({ platform }));
                
                log("Kết quả start LootLabs:", res);
                if (res && res.url && res.clickId) {
                    if (userId) {
                        try {
                            localStorage.setItem(`mad_lootlabs_pending:${userId}`, JSON.stringify({
                                clickId: res.clickId,
                                expiresAt: res.expiresAt,
                                platform
                            }));
                        } catch(e) {}
                    }
                    showToast("Chuyển hướng", "Đang mở LootLabs để tự động vượt...", true);
                    setTimeout(() => {
                        window.location.href = res.url;
                    }, 500);
                } else {
                    const msg = (typeof res === "string" ? res : (res?.message || JSON.stringify(res)));
                    showToast("Lỗi bắt đầu", msg);
                }
            } catch(e) {
                logErr("Lỗi khởi tạo Lootlabs:", e);
                showToast("Lỗi bắt đầu", e.message || String(e));
            }
        }

        if (document.readyState === "loading") {
            window.addEventListener("DOMContentLoaded", () => setTimeout(initMadium, 400));
        } else {
            setTimeout(initMadium, 400);
        }
    }
})();
