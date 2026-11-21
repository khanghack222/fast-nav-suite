/**
 * FastNav Suite - Linkvertise Engine Pro
 * Independent Core Module with Hybrid GraphQL + DOM Auto-Completer
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
    // MODULE 2: LINKVERTISE ENGINE (GRAPHQL + DOM HYBRID)
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
                (t.__typename === "WaitTask" || t.__typename === "AdTask" || t.__typename === "PremiumTask") && 
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
                } else {
                    log(`Task ID ${t.id} (${t.__typename}), hoàn tất...`);
                    if (onProgress) onProgress("Đang xử lý bước quảng cáo...");
                    await sendGQL(M_COMPLETE_TASK, { identifier, task_id: t.id, task_args: taskArgs }, referer);
                }
            }
            await new Promise(r => setTimeout(r, 600));
        }

        let finalRes = await sendGQL(Q_GET_CONTENT, { identifier, task_args: taskArgs }, referer);
        return finalRes?.data?.getContent?.url || (finalRes?.data?.getContent?.paste ? { paste: finalRes.data.getContent.paste } : null);
    }

    // Xuất ra FastNav để các engine khác (như ComboWick) gọi được
    window.FastNav.solveLinkvertise = solveLinkvertise;

    if (isLinkvertise) {
        log("Phát hiện trang Linkvertise");

        // DOM Auto-Completer dự phòng song song
        function startLinkvertiseDOMHelper() {
            log("Kích hoạt Linkvertise DOM Helper...");
            const domTimer = setInterval(() => {
                // 1. Tự động click nút Free Access with Ads
                const buttons = Array.from(document.querySelectorAll('button, a'));
                const freeAccessBtn = buttons.find(b => {
                    const txt = (b.textContent || "").toLowerCase();
                    return (
                        txt.includes("free access with ads") ||
                        txt.includes("free access") ||
                        txt.includes("access with ads") ||
                        txt.includes("kostenloser zugang") ||
                        txt.includes("accès gratuit") ||
                        txt.includes("acceso gratis")
                    ) && !b.disabled;
                });
                if (freeAccessBtn) {
                    log("Phát hiện nút Free Access, click:", freeAccessBtn.textContent.trim());
                    freeAccessBtn.click();
                }

                // 2. Tự động đóng popup quảng cáo khi có nút X
                const closeBtns = document.querySelectorAll('button.close, [aria-label="Close"], svg.cross, .dialog-close, [class*="close"]');
                closeBtns.forEach(cb => {
                    if (cb && !cb.disabled && cb.offsetParent !== null) {
                        try { cb.click(); } catch(e) {}
                    }
                });

                // 3. Tự động click I'm interested nếu xuất hiện prompt
                const interestedBtn = buttons.find(b => {
                    const txt = (b.textContent || "").toLowerCase();
                    return txt.includes("i'm interested") || txt.includes("tôi quan tâm") || txt.includes("interested");
                });
                if (interestedBtn && !interestedBtn.disabled) {
                    try { interestedBtn.click(); } catch(e) {}
                }
            }, 500);
        }
        startLinkvertiseDOMHelper();

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
})();
