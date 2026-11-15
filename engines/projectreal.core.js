/**
 * FastNav Suite - ProjectReal & Work.ink Direct Download Engine
 * Independent Core Module
 */
(function() {
    'use strict';

    // Shared Utilities
    window.FastNav = window.FastNav || {};

    function log(msg, ...args) {
        console.log(`%c[FastNav RealSetup]%c ${msg}`, "color:#10b981;font-weight:bold;", "color:#38bdf8;", ...args);
    }
    function logErr(msg, ...args) {
        console.error(`%c[FastNav RealSetup ERROR]%c ${msg}`, "color:#ef4444;font-weight:bold;", "color:#f87171;", ...args);
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
            if (subtitle) html += `<div style="margin-top:4px;font-size:12px;color:#9ca3af;font-weight:400;">${subtitle}</div>`;
            box.innerHTML = html;
        } catch(e) {}
    }

    const host = window.location.hostname.toLowerCase();

    // ====================================================
    // TRƯỜNG HỢP 1: ĐANG Ở PROJECTREAL.GG / DOWNLOAD
    // ====================================================
    if (host.includes("projectreal")) {
        log("Kích hoạt ProjectReal Download Automation Engine");

        async function triggerInstantDownload() {
            showToast("ProjectReal", "Đang tự động bỏ qua Work.ink và cấp file tải...");
            try {
                // Tạo phiên attempt mới
                const attRes = await fetch("https://api.projectreal.gg/adwall/attempts", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ purpose: "download", provider: "workink" })
                }).then(r => r.json()).catch(() => null);

                if (!attRes || !attRes.attempt_id || !attRes.capability) {
                    logErr("Không thể tạo phiên attempt:", attRes);
                    return;
                }

                log("Phiên attempt tạo thành công:", attRes);

                // Tự động claim bằng session cookie của trình duyệt
                const claimRes = await fetch(`https://api.projectreal.gg/adwall/attempts/${encodeURIComponent(attRes.attempt_id)}/claim`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ capability: attRes.capability })
                }).then(r => r.json()).catch(() => null);

                log("Kết quả claim:", claimRes);
                if (claimRes && claimRes.token) {
                    const downloadUrl = `https://api.projectreal.gg/download/setup?token=${encodeURIComponent(claimRes.token)}`;
                    showToast("Thành công!", "Đang tự động tải RealSetup.exe...", true);
                    log("Tải ngay:", downloadUrl);
                    window.location.href = downloadUrl;
                    return;
                } else if (attRes.url) {
                    // Nếu cần qua Work.ink với session token này
                    try {
                        localStorage.setItem("real_download_protected_claim", JSON.stringify({
                            attemptId: attRes.attempt_id,
                            capability: attRes.capability,
                            wt: "",
                            rsToken: ""
                        }));
                    } catch(e) {}
                    showToast("Chuyển tiếp", "Đang mở Work.ink để xác thực tự động...", true);
                    window.location.href = attRes.url;
                }
            } catch(e) {
                logErr("Lỗi claim:", e);
            }
        }

        // Tự động kích hoạt khi vào trang download
        if (window.location.pathname.includes("/download")) {
            setTimeout(triggerInstantDownload, 600);
        }
    }

    // ====================================================
    // TRƯỜNG HỢP 2: ĐANG Ở WORK.INK/2znc/real-setup -> QUAY VỀ CLAIM
    // ====================================================
    if (host.includes("work.ink") && window.location.pathname.includes("real-setup")) {
        log("Phát hiện Work.ink real-setup. Thiết lập cầu nối quay về ProjectReal...");

        function returnToProjectReal() {
            try {
                showToast("Work.ink Đã Xong", "Đang quay về ProjectReal để nhận file tải...", true);
                // Tạo một claim giả định hoặc chuyển thẳng về trang download của projectreal
                setTimeout(() => {
                    window.location.href = "https://projectreal.gg/en/download/?wt=1";
                }, 800);
            } catch(e) {}
        }

        // Bắt sự kiện khi click nút hoặc nhận destination
        setInterval(() => {
            const destBtn = document.querySelector('#access-offers, a.button.large, button.accessBtn, .cta-btn, button:not(.skipBtn)');
            if (destBtn) {
                const txt = destBtn.textContent.trim().toLowerCase();
                if (txt.includes('destination') || txt.includes('proceed') || txt.includes('access')) {
                    destBtn.onclick = returnToProjectReal;
                }
            }
        }, 500);
    }
})();
