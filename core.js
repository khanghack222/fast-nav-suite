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
    // MẠNG: NATIVE FETCH (KHÔNG BỊ TAMPERMONKEY CHẶN) + GM_xmlhttpRequest FALLBACK
    // ====================================================
    function nativeFetch(url, method = "GET", headers = {}, data = null) {
        const safeHeaders = {};
        for (let k in headers) {
            const lk = k.toLowerCase();
            if (lk !== "origin" && lk !== "referer" && lk !== "user-agent") {
                safeHeaders[k] = headers[k];
            }
        }
        const fetchFunc = (typeof unsafeWindow !== "undefined" && unsafeWindow.fetch) ? unsafeWindow.fetch : window.fetch;
        return fetchFunc(url, {
            method,
            headers: safeHeaders,
            body: data
        }).then(r => r.json().catch(() => r.text()));
    }

    function sendReq(url, method = "GET", headers = {}, data = null) {
        return new Promise((resolve, reject) => {
            // Với Supabase trên ComboWick, dùng trực tiếp native fetch để không bao giờ bị popup quyền/chặn Tampermonkey
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
                    log("Đã bỏ qua 3 nhiệm vụ chờ mạng xã hội của Madium.");
                } catch(e) {}
            }

            // Kiểm tra xem vừa từ LootLabs quay về hay không
            if (userId) {
                const pendingKey = `mad_lootlabs_pending:${userId}`;
                let pendingData = null;
                try { pendingData = JSON.parse(localStorage.getItem(pendingKey) || "null"); } catch(e) {}

                if (pendingData && pendingData.clickId && pendingData.expiresAt > Date.now()) {
                    showToast("Madium Checkpoint", "LootLabs đã xong! Đang kiểm tra xác nhận key...", true);
                    log("Phát hiện phiên pending:", pendingData);

                    // Kiểm tra xác thực tới 10 lần
                    for (let t = 0; t < 10; t++) {
                        if (t > 0) await new Promise(r => setTimeout(r, 2000));
                        try {
                            const res = await nativeFetch(`https://auth.getmadium.xyz/getkey/lootlabs/status?click_id=${encodeURIComponent(pendingData.clickId)}`, "GET", {
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
                                showToast("Thông báo", "Tài khoản của bạn vẫn còn thời hạn key!", true);
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
                panel.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:99999;background:rgba(15,23,42,0.92);border:1.5px solid #22c55e;border-radius:12px;padding:12px 16px;box-shadow:0 10px 30px rgba(0,0,0,0.8);display:flex;flex-direction:column;gap:8px;font-family:-apple-system,sans-serif;";
                
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
                alert("Vui lòng đăng nhập tài khoản Madium trước khi nhận key!");
                return;
            }
            const userId = getUserIdFromToken(token);
            try {
                if (userId) sessionStorage.setItem("mad_lootlabs_intro", userId);
            } catch(e) {}

            showToast("Madium Auto-Key", `Đang khởi tạo LootLabs (${platform})...`);
            try {
                const res = await nativeFetch("https://auth.getmadium.xyz/getkey/lootlabs/start", "POST", {
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
                    showToast("Lỗi bắt đầu", res?.message || JSON.stringify(res));
                }
            } catch(e) {
                logErr("Lỗi khởi tạo Lootlabs:", e);
                showToast("Lỗi", e.message || String(e));
            }
        }

        if (document.readyState === "loading") {
            window.addEventListener("DOMContentLoaded", () => setTimeout(initMadium, 400));
        } else {
            setTimeout(initMadium, 400);
        }
    }

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