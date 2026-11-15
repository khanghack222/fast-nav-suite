/**
 * FastNav Suite - ComboWick Engine
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
    // MODULE 3: COMBOWICK COMPLETE AUTO-SOLVER (HARDENED)
    // ====================================================
    if (host.includes("combowick.com")) {
        log("Kích hoạt ComboWick Engine trên combowick.com");

        // 1. Tự động ngụy trang document.referrer thuộc hệ thống Linkvertise
        try {
            Object.defineProperty(document, 'referrer', {
                get: function() { return 'https://link-to.net/'; },
                configurable: true
            });
        } catch(e) {}

        // 2. Nếu đang ở trang /access-key -> Đã hoàn thành, dừng
        if (window.location.pathname.includes("/access-key")) {
            log("Đang ở trang /access-key, dừng engine.");
            return;
        }

        // 3. Nếu bị chuyển vào trang /blocked -> Tự động khôi phục về bước trước
        if (window.location.pathname.includes("/blocked")) {
            log("Phát hiện trang cảnh báo bảo mật /blocked. Đang tự động gỡ và tiếp tục...");
            showToast("Bảo mật phát hiện", "Đang tự động khôi phục phiên xác thực an toàn...", true);
            try {
                localStorage.removeItem("verification_step");
            } catch(e) {}
            setTimeout(() => {
                const params = new URLSearchParams(window.location.search);
                const redir = params.get("redirect") || "/verify/step1";
                log("Chuyển hướng về:", redir);
                window.location.replace(redir);
            }, 1200);
            return;
        }

        // 4. Nếu ở trang /ad-return -> Trang đang tự xử lý hash, tránh xung đột
        if (window.location.pathname.includes("/ad-return")) {
            log("Đang ở trang /ad-return, nhường trình duyệt xử lý hash...");
            return;
        }

        const SUPABASE_URL = "https://sqahviibykrzlwnulgmw.supabase.co/functions/v1/issue-verify-token";
        const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYWh2aWlieWtyemx3bnVsZ213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODAxNjQsImV4cCI6MjEwMzg1NjE2NH0.mvRGR-d3EOcy8bBlCTDwIHEF4ELIU9PfVXDi8NSALlA";

        function formatErr(err) {
            if (!err) return "Lỗi không xác định";
            if (typeof err === "string") return err;
            if (err.reason) return err.reason;
            if (err.message) return err.message;
            try { return JSON.stringify(err); } catch(e) { return String(err); }
        }

        function callSupabase(payload, referer) {
            log("Gửi Supabase:", JSON.stringify(payload), "Referer:", referer);
            return sendReq(SUPABASE_URL, "POST", {
                "Content-Type": "application/json",
                "apikey": ANON_KEY,
                "Authorization": `Bearer ${ANON_KEY}`,
                "Origin": "https://keys.combowick.com",
                "Referer": referer || "https://keys.combowick.com/verify/step1"
            }, JSON.stringify(payload));
        }

        async function solveComboWickStepHash(stepNum) {
            const targetUrl = `https://keys.combowick.com/ad-return/step${stepNum}`;
            const b64Target = btoa(targetUrl);
            const lvUrl = `https://link-to.net/405401/123/dynamic?r=${b64Target}`;
            const ident = { userIdAndHash: { user_id: "405401", hash: b64Target } };

            log(`Đang giải hash cho Step ${stepNum}...`);
            let fullUrl = await solveLinkvertise(ident, lvUrl, (msg) => {
                showToast(`ComboWick Step ${stepNum}/3`, msg);
            });

            if (typeof fullUrl === "string" && fullUrl.includes("hash=")) {
                const h = fullUrl.split("hash=")[1].split("&")[0];
                log(`Đã lấy hash Step ${stepNum}:`, h);
                return h;
            }
            return "";
        }

        // Tự động kích hoạt bấm nút Checkpoint khi hết video 7 giây nếu cần làm thủ công
        function startAutoClickWatcher() {
            log("Bật watcher tự động bấm nút Checkpoint...");
            const timer = setInterval(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const continueBtn = btns.find(b => {
                    const txt = b.textContent.toLowerCase();
                    return (txt.includes("tiếp tục") || txt.includes("continue")) && !b.disabled;
                });
                if (continueBtn) {
                    clearInterval(timer);
                    log("Phát hiện nút Checkpoint khả dụng! Tự động nhấn...");
                    showToast("Tự động tiếp tục", "Đang chuyển sang bước quảng cáo...", true);
                    continueBtn.click();
                }
            }, 500);
        }

        async function runComboWickEngine() {
            try {
                showToast("ComboWick Auto-Access", "Đang khởi tạo phiên làm việc an toàn...");

                // Đọc hoặc sinh 32-ký tự HEX hợp lệ chuẩn Supabase session
                let sid = localStorage.getItem("verify_sid");
                if (!sid || sid.length !== 32) {
                    const sidBytes = new Uint8Array(16);
                    crypto.getRandomValues(sidBytes);
                    sid = Array.from(sidBytes).map(b => b.toString(16).padStart(2, "0")).join("");
                    try { localStorage.setItem("verify_sid", sid); } catch(e) {}
                }
                try { localStorage.setItem("selected_ad_provider", "linkvertise"); } catch(e) {}
                log("Sử dụng SID:", sid);

                log("Gửi start request tới Supabase...");
                const startRes = await callSupabase({ action: "start", sid }, "https://keys.combowick.com/verify/step1");
                log("Supabase start response:", JSON.stringify(startRes));

                // Nếu start trả về repeat (đã start rồi) thì vẫn tiếp tục, nếu lỗi khác mới chuyển watcher
                if (startRes && !startRes.success && startRes.reason !== "repeat") {
                    logErr("Khởi tạo thất bại, bật auto-clicker:", startRes);
                    showToast("ComboWick", "Chuyển sang chế độ tự động bấm checkpoint...");
                    startAutoClickWatcher();
                    return;
                }

                showToast("ComboWick Auto-Access", "Khởi tạo thành công! Bắt đầu tiến trình...", true);

                let allPassed = true;
                for (let step = 1; step <= 3; step++) {
                    showToast(`ComboWick Step ${step}/3`, "Đang bóc tách mã xác thực...");

                    let hashVal = "";
                    for (let retry = 0; retry < 2; retry++) {
                        hashVal = await solveComboWickStepHash(step);
                        if (hashVal) break;
                        showToast(`ComboWick Step ${step}/3`, `Thử lại bóc mã (${retry + 1}/2)...`);
                        await new Promise(r => setTimeout(r, 1500));
                    }

                    if (!hashVal) {
                        logErr(`Không lấy được hash cho Step ${step}. Chuyển sang watcher nút bấm...`);
                        showToast("ComboWick", `Linkvertise cần duyệt trang. Tự động bấm nút...`);
                        startAutoClickWatcher();
                        allPassed = false;
                        break;
                    }

                    // Chống phát hiện "nhanh quá bị tê" (Backend yêu cầu tối thiểu >= 8 giây, giãn cách 10s an toàn tuyệt đối)
                    for (let s = 10; s > 0; s--) {
                        showToast(`ComboWick Step ${step}/3`, `Giãn cách an toàn (tránh bị phát hiện): ${s}s...`);
                        await new Promise(r => setTimeout(r, 1000));
                    }

                    try {
                        localStorage.setItem("verification_step", `step${step}`);
                    } catch(e) {}

                    log(`Gửi xác thực Step ${step} với hash:`, hashVal);
                    const stepRes = await callSupabase(
                        { action: "step", sid, step: `step${step}`, hash: hashVal },
                        `https://keys.combowick.com/ad-return/step${step}?hash=${hashVal}`
                    );
                    log(`Supabase step ${step} response:`, JSON.stringify(stepRes));

                    if (!stepRes || !stepRes.success) {
                        logErr(`Xác thực Step ${step} thất bại:`, stepRes);
                        if (stepRes && stepRes.reason === "too_fast") {
                            showToast("ComboWick", `Tốc độ quá nhanh, đang chờ thêm 5s...`);
                            await new Promise(r => setTimeout(r, 5000));
                            // Thử gửi lại 1 lần nữa sau khi đã chờ thêm
                            const retryStep = await callSupabase(
                                { action: "step", sid, step: `step${step}`, hash: hashVal },
                                `https://keys.combowick.com/ad-return/step${step}?hash=${hashVal}`
                            );
                            if (retryStep && retryStep.success) {
                                log(`Step ${step} gửi lại thành công!`);
                                try { localStorage.setItem(`step${step}_completed`, "true"); } catch(e) {}
                                continue;
                            }
                        }
                        showToast("ComboWick", `Xác thực Step ${step} không thành công. Chuyển sang hỗ trợ nút.`);
                        startAutoClickWatcher();
                        allPassed = false;
                        break;
                    }

                    try {
                        localStorage.setItem(`step${step}_completed`, "true");
                    } catch(e) {}
                }

                if (!allPassed) return;

                // Nhận verify_token cuối cùng
                log("Đang gửi yêu cầu nhận verify_token cuối cùng...");
                showToast("ComboWick", "Đang hoàn tất cấp Key 8 tiếng...", true);
                await new Promise(r => setTimeout(r, 1500));

                const tokenRes = await callSupabase({ sid }, "https://keys.combowick.com/ad-return/step3");
                log("Kết quả nhận Token:", JSON.stringify(tokenRes));

                if (tokenRes && tokenRes.token) {
                    try {
                        localStorage.setItem("verify_token", JSON.stringify({
                            token: tokenRes.token,
                            expires_at: tokenRes.expires_at,
                            hours: tokenRes.hours || 8
                        }));
                        localStorage.removeItem("verification_step");
                    } catch(e) {}

                    log("THÀNH CÔNG RỰC RỠ! Chuyển hướng vào trang /access-key");
                    showToast("Thành công tuyệt đối", "Đang chuyển vào trang tạo Key...", true);
                    setTimeout(() => {
                        window.location.href = "https://keys.combowick.com/access-key";
                    }, 800);
                } else {
                    logErr("Lỗi cấp Token:", tokenRes);
                    showToast("Lỗi cấp Token", formatErr(tokenRes));
                    startAutoClickWatcher();
                }
            } catch(fatalErr) {
                logErr("Lỗi Fatal trong runComboWickEngine:", fatalErr);
                showToast("ComboWick", "Gặp lỗi: " + formatErr(fatalErr));
                startAutoClickWatcher();
            }
        }

        if (document.readyState === "loading") {
            window.addEventListener("DOMContentLoaded", () => {
                setTimeout(runComboWickEngine, 300);
            });
        } else {
            setTimeout(runComboWickEngine, 300);
        }
    }
})();
