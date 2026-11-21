/**
 * FastNav Suite - ComboWick Engine Pro
 * Hardened Full-Cycle Auto-Solver & Navigation Engine
 * Zero Errors - Auto-Clicker MutationObserver - Auto-Advancer - Auto-Key Copy
 */
(function() {
    'use strict';

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
    // MODULE 3: COMBOWICK COMPLETE AUTO-SOLVER (PRO HARDENED)
    // ====================================================
    if (host.includes("combowick.com")) {
        log("Kích hoạt ComboWick Pro Engine trên combowick.com");

        // 1. Tự động ngụy trang document.referrer thuộc hệ thống Linkvertise
        try {
            Object.defineProperty(document, 'referrer', {
                get: function() { return 'https://link-to.net/'; },
                configurable: true
            });
        } catch(e) {}

        // Tắt tiếng video YouTube tự động để tránh ồn và tiết kiệm tài nguyên
        function muteYouTubePlayer() {
            document.querySelectorAll('iframe[src*="youtube"]').forEach(iframe => {
                try {
                    iframe.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
                } catch(e) {}
            });
        }
        setTimeout(muteYouTubePlayer, 500);
        setTimeout(muteYouTubePlayer, 1500);

        // 2. Trang /access-key -> Tự động tìm và sao chép Key vào Clipboard
        if (window.location.pathname.includes("/access-key")) {
            log("Đang ở trang /access-key, khởi động Key Auto-Extractor...");
            showToast("ComboWick Key", "Đang tự động phát hiện và trích xuất Key...", true);

            let copied = false;
            const keyCheckInterval = setInterval(() => {
                if (copied) {
                    clearInterval(keyCheckInterval);
                    return;
                }

                // Tìm vùng hiển thị key (code, input readonly, font-mono, thẻ chứa key)
                const codeElements = Array.from(document.querySelectorAll('code, pre, input[readonly], .font-mono, [class*="font-mono"]'));
                for (const el of codeElements) {
                    const text = (el.value || el.textContent || "").trim();
                    // Key roblox của combowick thường có dạng hex hoặc ký tự đặc trưng dài > 10
                    if (text && text.length >= 10 && !text.includes(" ") && !text.toLowerCase().includes("select")) {
                        copied = true;
                        clearInterval(keyCheckInterval);
                        log("Đã phát hiện Key:", text);
                        if (typeof GM_setClipboard === "function") {
                            GM_setClipboard(text);
                        }
                        showToast("ComboWick Key Thành Công", `Đã copy Key vào bộ nhớ tạm: ${text.slice(0, 8)}...`, true);
                        return;
                    }
                }

                // Nếu chưa có key (người dùng chưa chọn game), hỗ trợ bấm nút Get Key nếu game đã chọn
                const getBtn = Array.from(document.querySelectorAll('button')).find(b => {
                    const t = (b.textContent || "").toLowerCase();
                    return (t.includes("get my") || t.includes("nhận key")) && !b.disabled;
                });
                if (getBtn) {
                    log("Phát hiện nút nhận Key khả dụng, tự động nhấn:", getBtn.textContent.trim());
                    getBtn.click();
                }
            }, 500);
            return;
        }

        // 3. Nếu bị chuyển vào trang /blocked -> Tự động khôi phục về bước trước
        if (window.location.pathname.includes("/blocked")) {
            log("Phát hiện trang cảnh báo bảo mật /blocked. Đang tự động gỡ và tiếp tục...");
            showToast("ComboWick", "Đang tự động khôi phục phiên xác thực...", true);
            try {
                localStorage.removeItem("verification_step");
            } catch(e) {}
            setTimeout(() => {
                const params = new URLSearchParams(window.location.search);
                const redir = params.get("redirect") || "/verify/step1";
                log("Chuyển hướng về:", redir);
                window.location.replace(redir);
            }, 800);
            return;
        }

        // 4. Nếu ở trang /ad-return -> Watchdog chuyển tiếp nếu router của trang bị chậm
        if (window.location.pathname.includes("/ad-return")) {
            log("Đang ở trang /ad-return, theo dõi quá trình chuyển tiếp...");
            showToast("ComboWick Step", "Xác thực bước thành công! Đang chuyển tiếp...", true);

            // Watchdog: Nếu sau 3 giây trang chưa tự chuyển bước, script sẽ tự kích hoạt chuyển
            setTimeout(() => {
                const p = window.location.pathname;
                if (p.includes("step1")) {
                    window.location.replace("https://keys.combowick.com/verify/step2");
                } else if (p.includes("step2")) {
                    window.location.replace("https://keys.combowick.com/verify/step3");
                } else if (p.includes("step3")) {
                    window.location.replace("https://keys.combowick.com/access-key");
                }
            }, 3000);
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

        async function callSupabase(payload, referer) {
            log("Gửi Supabase:", JSON.stringify(payload), "Referer:", referer);
            try {
                const res = await sendReq(SUPABASE_URL, "POST", {
                    "Content-Type": "application/json",
                    "apikey": ANON_KEY,
                    "Authorization": `Bearer ${ANON_KEY}`,
                    "Origin": "https://keys.combowick.com",
                    "Referer": referer || "https://keys.combowick.com/verify/step1"
                }, JSON.stringify(payload));
                return res;
            } catch(e) {
                logErr("Lỗi gửi Supabase:", e);
                return { success: false, reason: e.message || "network_error" };
            }
        }

        // Tự động kích hoạt bấm nút Checkpoint ngay khi sẵn sàng (MutationObserver + Poller)
        function startAutoClickWatcher(targetStep) {
            log(`Kích hoạt Watcher tự động click Checkpoint [${targetStep || ''}]...`);
            showToast("ComboWick Auto-Nav", "Đang theo dõi bộ đếm để tự động chuyển bước...");

            let clicked = false;

            function triggerClick(btn) {
                if (clicked || !btn || btn.disabled) return;
                clicked = true;
                log("Nút Checkpoint khả dụng! Kích hoạt click:", btn.textContent.trim());
                showToast("ComboWick", "Đang tự động chuyển tiếp...", true);
                
                // Kích thích đầy đủ sự kiện chuột & pointer
                btn.focus();
                btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                btn.click();
            }

            function checkButtons() {
                if (clicked) return;
                const btns = Array.from(document.querySelectorAll('main button, button'));
                const actionBtn = btns.find(b => {
                    const txt = (b.textContent || "").toLowerCase();
                    return (
                        txt.includes("checkpoint") ||
                        txt.includes("continue") ||
                        txt.includes("tiếp tục") ||
                        txt.includes("finish") ||
                        txt.includes("get my key") ||
                        txt.includes("nhận key") ||
                        txt.includes("hoàn tất")
                    );
                });

                if (actionBtn) {
                    if (!actionBtn.disabled) {
                        triggerClick(actionBtn);
                    } else {
                        const txt = actionBtn.textContent.trim();
                        if (/\d+s/.test(txt) || txt.toLowerCase().includes("wait") || txt.toLowerCase().includes("chờ")) {
                            showToast("ComboWick Countdown", txt);
                        }
                    }
                }
            }

            // MutationObserver bắt ngay khoảnh khắc React đổi disabled thành false (< 1ms)
            const obs = new MutationObserver(() => {
                checkButtons();
                if (clicked) obs.disconnect();
            });
            obs.observe(document.body || document.documentElement, {
                attributes: true,
                childList: true,
                subtree: true,
                attributeFilter: ['disabled', 'class']
            });

            // Poller dự phòng 300ms
            const timer = setInterval(() => {
                if (clicked) {
                    clearInterval(timer);
                    obs.disconnect();
                    return;
                }
                checkButtons();
                muteYouTubePlayer();
            }, 300);
        }

        async function solveComboWickStepHash(stepNum) {
            const solver = window.FastNav?.solveLinkvertise || (typeof solveLinkvertise !== "undefined" ? solveLinkvertise : null);
            if (!solver) {
                log("Chưa có Linkvertise solver trong bộ nhớ");
                return "";
            }

            const targetUrl = `https://keys.combowick.com/ad-return/step${stepNum}`;
            const b64Target = btoa(targetUrl);
            const lvUrl = `https://link-to.net/405401/123/dynamic?r=${b64Target}`;
            const ident = { userIdAndHash: { user_id: 405401, hash: b64Target } };

            log(`Đang giải hash cho Step ${stepNum}...`);
            try {
                let fullUrl = await solver(ident, lvUrl, (msg) => {
                    showToast(`ComboWick Step ${stepNum}/3`, msg);
                });

                if (typeof fullUrl === "string" && fullUrl.includes("hash=")) {
                    const h = fullUrl.split("hash=")[1].split("&")[0];
                    log(`Đã lấy hash Step ${stepNum}:`, h);
                    return h;
                }
            } catch(e) {
                logErr(`Lỗi giải hash Step ${stepNum}:`, e);
            }
            return "";
        }

        async function runComboWickEngine() {
            try {
                showToast("ComboWick Auto-Nav", "Khởi tạo hệ thống điều hướng thông minh...");

                const pathname = window.location.pathname;
                const isStep1 = pathname.includes("/verify/step1") || pathname === "/verify" || pathname === "/verify/";

                // Khởi tạo hoặc làm mới SID khi ở step 1
                let sid = localStorage.getItem("verify_sid");
                if (isStep1 || !sid || sid.length !== 32) {
                    const sidBytes = new Uint8Array(16);
                    crypto.getRandomValues(sidBytes);
                    sid = Array.from(sidBytes).map(b => b.toString(16).padStart(2, "0")).join("");
                    try {
                        localStorage.setItem("verify_sid", sid);
                        localStorage.removeItem("step1_completed");
                        localStorage.removeItem("step2_completed");
                        localStorage.removeItem("step3_completed");
                        localStorage.setItem("selected_ad_provider", "linkvertise");
                    } catch(e) {}
                }
                log("Sử dụng SID:", sid);

                // Khởi động phiên xác thực Supabase nếu ở step1
                if (isStep1) {
                    log("Gửi start request tới Supabase...");
                    const startRes = await callSupabase({ action: "start", sid }, "https://keys.combowick.com/verify/step1");
                    log("Supabase start response:", JSON.stringify(startRes));

                    const startOk = startRes && (startRes.success === true || startRes.reason === "repeat");
                    if (!startOk) {
                        logErr("Khởi tạo Supabase không thành công:", startRes);
                        startAutoClickWatcher("step1");
                        return;
                    }
                }

                // Luôn kích hoạt auto-clicker để tự động bấm nút ngay khi video/bộ đếm hoàn tất
                const currentStepMatch = pathname.match(/step([123])/);
                const currentStep = currentStepMatch ? parseInt(currentStepMatch[1], 10) : 1;
                startAutoClickWatcher(`step${currentStep}`);

            } catch(fatalErr) {
                logErr("Lỗi Fatal trong runComboWickEngine:", fatalErr);
                startAutoClickWatcher();
            }
        }

        if (document.readyState === "loading") {
            window.addEventListener("DOMContentLoaded", () => {
                setTimeout(runComboWickEngine, 200);
            });
        } else {
            setTimeout(runComboWickEngine, 200);
        }
    }
})();
