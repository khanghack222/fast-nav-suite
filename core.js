(function() {
    'use strict';

    function log(msg, ...args) {
        console.log(`%c[FastNav Suite]%c ${msg}`, "color:#10b981;font-weight:bold;", "color:#38bdf8;", ...args);
    }
    function logErr(msg, ...args) {
        console.error(`%c[FastNav Suite ERROR]%c ${msg}`, "color:#ef4444;font-weight:bold;", "color:#f87171;", ...args);
    }

    log("Đã nạp core engine thành công. Khởi tạo...");

    // ====================================================
    // UI TOAST CONTROLLER (ỔN ĐỊNH, KHÔNG GIẬT NHÁY)
    // ====================================================
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

    // ====================================================
    // MẠNG: GM_xmlhttpRequest BẢO MẬT & VƯỢT CORS + FALLBACK FETCH
    // ====================================================
    function sendReq(url, method = "GET", headers = {}, data = null) {
        return new Promise((resolve, reject) => {
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
                    ontimeout: () => reject(new Error("Request timeout")),
                    onerror: err => reject(err)
                });
            } else {
                fetch(url, {
                    method,
                    headers,
                    body: data
                }).then(r => r.json().catch(() => r.text()))
                  .then(resolve)
                  .catch(reject);
            }
        });
    }

    const host = window.location.hostname.toLowerCase();
    log("Hostname hiện tại:", host);

    // ====================================================
    // MODULE 1: WORK.INK (WEBSOCKET & DUF EXTRACTOR)
    // ====================================================
    if (host.includes("work.ink") || host.includes("workink.click") || host.includes("pass.work.ink")) {
        log("Kích hoạt Work.ink Engine");

        if (host.includes("workink.click") || host.includes("pass.work.ink")) {
            window.close();
            return;
        }

        const origOpen = window.open;
        window.open = function(url, target, features) {
            if (url && (url.includes('workink.click') || url.includes('pass.work.ink') || url.includes('google.com/url'))) {
                log("Đã chặn popup rác:", url);
                return null;
            }
            return origOpen.call(window, url, target, features);
        };

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
                                log("Bỏ qua task monetization Work.ink...");
                                showToast("Work.ink", "Đang tự động bỏ qua các bước quảng cáo...");
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
                                let dest = msg.payload.url;
                                try {
                                    const dufUrl = new URL(dest);
                                    if (dufUrl.searchParams.has('duf')) {
                                        dest = atob(dufUrl.searchParams.get('duf').split('').reverse().join(''));
                                    }
                                } catch(_) {}
                                log("Húp link đích Work.ink thành công:", dest);
                                showToast("Thành công", "Đã tìm thấy link đích, đang chuyển hướng...", true);
                                window.location.replace(dest);
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

        setInterval(() => {
            const agreeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().toUpperCase() === 'AGREE');
            if (agreeBtn) agreeBtn.click();

            const destBtn = document.querySelector('#access-offers, a.button.large, button.accessBtn, .cta-btn');
            if (destBtn) {
                const txt = destBtn.textContent.trim().toLowerCase();
                if (txt.includes('destination') || txt.includes('proceed') || txt.includes('access') || txt.includes('continue') || destBtn.id === 'access-offers') {
                    destBtn.click();
                }
            }
        }, 400);
    }

    // ====================================================
    // MODULE 2: LINKVERTISE ENGINE (GRAPHQL CHUẨN XÁC)
    // ====================================================
    const isLinkvertise = ["linkvertise.com", "link-to.net", "link-target.net", "link-center.net", "link-hub.net", "direct-link.net", "file-link.net"].some(d => host.includes(d));

    const GRAPHQL_URL = "https://publisher.linkvertise.com/graphql";

    function sendGQL(query, variables, referer) {
        return sendReq(GRAPHQL_URL, "POST", {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": "https://linkvertise.com",
            "Referer": referer || window.location.href,
            "cqreferrer": referer || window.location.href,
            "User-Agent": navigator.userAgent
        }, JSON.stringify({ query, variables }));
    }

    const Q_GET_CONTENT = `
    query getContent($identifier: PublicLinkIdentificationInput!, $task_args: TaskArgument) {
      getContent(input: $identifier, task_args: $task_args) {
        ... on ContentAccessTaskSet {
          tasks {
            __typename
            id
            status
            ... on WaitTask { remainingWaitingTime adsTotal }
          }
        }
        ... on DetailPageTargetData { url paste type }
      }
    }`;

    const M_COMPLETE_TASK = `
    mutation completeTask($identifier: PublicLinkIdentificationInput!, $task_id: String!, $task_args: TaskArgument) {
      completeTask(input: $identifier, task_id: $task_id, task_args: $task_args) {
        id
        ... on WaitTask { __typename id status remainingWaitingTime }
        ... on AdTask { __typename id status }
      }
    }`;

    async function solveLinkvertise(identifier, referer, onProgress) {
        const actionId = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const taskArgs = {
            action_id: actionId,
            additional_data: {
                taboola: { user_id: "anon", consent_string: "", url: referer, external_referrer: "", session_id: "" }
            }
        };

        log("Bắt đầu giải quyết Linkvertise identifier:", JSON.stringify(identifier));

        for (let loop = 0; loop < 15; loop++) {
            let res = await sendGQL(Q_GET_CONTENT, { identifier, task_args: taskArgs }, referer);
            let content = res?.data?.getContent;
            if (!content) {
                log("Không lấy được content Linkvertise, dừng loop.");
                break;
            }

            if (content.url) {
                log("Đã có link đích Linkvertise:", content.url);
                return content.url;
            }
            if (content.paste) {
                log("Đã có paste Linkvertise");
                return { paste: content.paste };
            }

            let tasks = (content.tasks || []).filter(t => 
                (t.__typename === "WaitTask" || t.__typename === "AdTask") && 
                (t.status === "IN_PROGRESS" || t.status === "OPEN")
            );

            log(`Loop ${loop + 1}: Có ${tasks.length} tasks cần xử lý`);

            if (tasks.length === 0) {
                await new Promise(r => setTimeout(r, 600));
                continue;
            }

            for (let t of tasks) {
                if (t.__typename === "WaitTask") {
                    let waitSec = t.remainingWaitingTime || 0;
                    log(`WaitTask ID ${t.id}, remaining: ${waitSec}s`);
                    if (waitSec > 0 && waitSec <= 20) {
                        for (let s = waitSec; s > 0; s--) {
                            if (onProgress) onProgress(`Đang chờ xác nhận: ${s}s...`);
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    } else if (waitSec > 20) {
                        if (onProgress) onProgress(`Bộ đếm giờ Linkvertise: ${waitSec}s...`);
                    }
                    await sendGQL(M_COMPLETE_TASK, { identifier, task_id: t.id, task_args: taskArgs }, referer);
                } else if (t.__typename === "AdTask") {
                    log(`AdTask ID ${t.id}, hoàn tất...`);
                    if (onProgress) onProgress("Đang xử lý bước quảng cáo...");
                    await sendGQL(M_COMPLETE_TASK, { identifier, task_id: t.id, task_args: taskArgs }, referer);
                }
            }
            await new Promise(r => setTimeout(r, 600));
        }

        let finalRes = await sendGQL(Q_GET_CONTENT, { identifier, task_args: taskArgs }, referer);
        return finalRes?.data?.getContent?.url || (finalRes?.data?.getContent?.paste ? { paste: finalRes.data.getContent.paste } : null);
    }

    if (isLinkvertise) {
        log("Phát hiện trang Linkvertise");
        const pathParts = window.location.pathname.split("/").filter(Boolean);
        const searchParams = new URLSearchParams(window.location.search);
        const rParam = searchParams.get("r");

        // 1. LINK DYNAMIC (?r=...)
        if (rParam || window.location.pathname.includes("/dynamic")) {
            showToast("Linkvertise Dynamic", "Đang tự động bóc tách link đích...");

            let plainTarget = null;
            if (rParam) {
                try { plainTarget = atob(decodeURIComponent(rParam)); } catch(e) {}
            }

            const ident = {
                userIdAndHash: {
                    user_id: pathParts[0] || "405401",
                    hash: rParam
                }
            };

            solveLinkvertise(ident, window.location.href, (msg) => {
                showToast("Linkvertise Dynamic", msg);
            }).then(finalUrl => {
                if (finalUrl && typeof finalUrl === "string" && finalUrl.startsWith("http")) {
                    log("Chuyển hướng sang finalUrl:", finalUrl);
                    showToast("Hoàn tất", "Đang chuyển tiếp...", true);
                    window.location.replace(finalUrl);
                } else if (plainTarget && plainTarget.startsWith("http")) {
                    log("Chuyển hướng sang plainTarget:", plainTarget);
                    showToast("Hoàn tất", "Đang chuyển tiếp...", true);
                    window.location.replace(plainTarget);
                }
            }).catch((err) => {
                logErr("Lỗi giải dynamic:", err);
                if (plainTarget && plainTarget.startsWith("http")) {
                    window.location.replace(plainTarget);
                }
            });
            return;
        }

        // 2. LINK TĨNH DẠNG /userId/slug
        if (pathParts.length >= 2) {
            const userId = pathParts[0];
            const slug = pathParts[1];
            const reserved = ["login", "register", "dashboard", "publisher", "terms", "privacy", "assets"];

            if (!reserved.includes(userId)) {
                showToast("Linkvertise", `Đang giải quyết liên kết [${slug}]...`);
                const ident = { userIdAndUrl: { user_id: userId, url: slug } };

                solveLinkvertise(ident, window.location.href, (msg) => {
                    showToast("Linkvertise", msg);
                }).then(result => {
                    if (result && typeof result === "string" && result.startsWith("http")) {
                        log("Chuyển hướng link tĩnh sang:", result);
                        showToast("Hoàn tất", "Đang chuyển tiếp...", true);
                        window.location.replace(result);
                    } else if (result && result.paste) {
                        showToast("Đã trích xuất nội dung", "Đã sao chép vào bộ nhớ tạm", true);
                        if (typeof GM_setClipboard === "function") {
                            GM_setClipboard(result.paste);
                        }
                        alert("NỘI DUNG TRÍCH XUẤT TỪ LINK:\n\n" + result.paste);
                    }
                }).catch(err => logErr("Lỗi giải link tĩnh:", err));
            }
        }
    }

    // ====================================================
    // MODULE 3: COMBOWICK COMPLETE AUTO-SOLVER
    // ====================================================
    if (host.includes("combowick.com")) {
        log("Kích hoạt ComboWick Engine trên combowick.com");
        if (window.location.pathname.includes("/access-key")) {
            log("Đang ở trang /access-key, dừng solver.");
            return;
        }

        const SUPABASE_URL = "https://sqahviibykrzlwnulgmw.supabase.co/functions/v1/issue-verify-token";
        const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYWh2aWlieWtyemx3bnVsZ213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODAxNjQsImV4cCI6MjEwMzg1NjE2NH0.mvRGR-d3EOcy8bBlCTDwIHEF4ELIU9PfVXDi8NSALlA";

        function callSupabase(payload, referer) {
            log("Gửi Supabase:", JSON.stringify(payload), "Referer:", referer);
            return sendReq(SUPABASE_URL, "POST", {
                "Content-Type": "application/json",
                "apikey": ANON_KEY,
                "Authorization": `Bearer ${ANON_KEY}`,
                "Origin": "https://keys.combowick.com",
                "Referer": referer
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

        // Tự động kích hoạt bấm nút Checkpoint khi hết countdown nếu Linkvertise có cooldown
        function startAutoClickWatcher() {
            log("Bật watcher tự động bấm nút Checkpoint...");
            setInterval(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const continueBtn = btns.find(b => {
                    const txt = b.textContent.toLowerCase();
                    return (txt.includes("tiếp tục") || txt.includes("continue")) && !b.disabled;
                });
                if (continueBtn) {
                    log("Phát hiện nút Checkpoint khả dụng! Tự động nhấn...");
                    showToast("Tự động tiếp tục", "Đang chuyển sang bước quảng cáo...", true);
                    continueBtn.click();
                }
            }, 600);
        }

        async function runComboWickEngine() {
            try {
                showToast("ComboWick Auto-Access", "Đang khởi tạo phiên làm việc an toàn...");

                // Tạo 32-ký tự HEX hợp lệ chuẩn Supabase session
                const sidBytes = new Uint8Array(16);
                crypto.getRandomValues(sidBytes);
                const sid = Array.from(sidBytes).map(b => b.toString(16).padStart(2, "0")).join("");
                log("Đã sinh SID hex:", sid);

                try {
                    localStorage.setItem("verify_sid", sid);
                    localStorage.setItem("selected_ad_provider", "linkvertise");
                } catch(e) {}

                log("Gửi start request tới Supabase...");
                const startRes = await callSupabase({ action: "start", sid }, "https://keys.combowick.com/verify/step1");
                log("Supabase start response:", JSON.stringify(startRes));

                if (!startRes || !startRes.success) {
                    logErr("Khởi tạo thất bại, bật auto-clicker");
                    showToast("ComboWick", "Chuyển sang chế độ tự động bấm checkpoint...");
                    startAutoClickWatcher();
                    return;
                }

                showToast("ComboWick Auto-Access", "Khởi tạo thành công! Bắt đầu giải 3 bước...", true);

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
                        showToast("ComboWick", `Linkvertise cần mở tab hoặc chờ. Tự động hỗ trợ nút...`);
                        startAutoClickWatcher();
                        allPassed = false;
                        break;
                    }

                    // Chờ giãn cách an toàn 8.5s theo quy chuẩn backend để tránh rate limit
                    for (let s = 8; s > 0; s--) {
                        showToast(`ComboWick Step ${step}/3`, `Xác nhận hoàn thành trong: ${s}s...`);
                        await new Promise(r => setTimeout(r, 1000));
                    }

                    log(`Gửi xác thực Step ${step} với hash:`, hashVal);
                    const stepRes = await callSupabase(
                        { action: "step", sid, step: `step${step}`, hash: hashVal },
                        `https://keys.combowick.com/ad-return/step${step}?hash=${hashVal}`
                    );
                    log(`Supabase step ${step} response:`, JSON.stringify(stepRes));

                    if (!stepRes || !stepRes.success) {
                        logErr(`Xác thực Step ${step} thất bại:`, stepRes);
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
                showToast("ComboWick", "Đang cấp token truy cập 8 tiếng...", true);
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
                    showToast("Lỗi cấp Token", JSON.stringify(tokenRes));
                    startAutoClickWatcher();
                }
            } catch(fatalErr) {
                logErr("Lỗi Fatal trong runComboWickEngine:", fatalErr);
                showToast("ComboWick", "Gặp lỗi: " + (fatalErr.message || fatalErr));
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