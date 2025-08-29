function showMessage(text, type = "info") {
  const area = document.getElementById("messageArea");
  area.innerHTML = `<div class="message ${type}">${text}</div>`;
  area.style.display = "block";
  setTimeout(() => {
    area.style.display = "none";
  }, 3000);
}

function setLoading(btn, label) {
  if (!btn) return () => {};
  const prev = btn.textContent;
  btn.textContent = label;
  btn.disabled = true;
  btn.classList.add("loading");
  return () => {
    btn.textContent = prev;
    btn.disabled = false;
    btn.classList.remove("loading");
  };
}

function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const opts = {
    ...options,
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };
  return fetch(url, opts).finally(() => clearTimeout(timer));
}

async function search(btn) {
  const keyword = document.getElementById("searchInput").value.trim();
  if (!keyword) return;
  const done = setLoading(btn, "검색 중...");
  try {
    const res = await fetchWithTimeout("/api/search", {
      method: "POST",
      body: JSON.stringify({ keyword }),
    });
    if (!res.ok) throw new Error();
    document.getElementById("searchInput").value = "";
    addUserSearchKeyword(keyword);
    await updatePopularKeywords();
    showMessage(`"${keyword}" 검색이 완료되었습니다!`, "success");
  } catch {
    showMessage("검색 중 오류가 발생했습니다.", "error");
  } finally {
    done();
  }
}

function addUserSearchKeyword(keyword) {
  const el = document.getElementById("recentKeywords");
  const cur = el.innerHTML;
  const newHtml = `<div class="keyword-item" style="color:#007bff;font-weight:bold;background:#e3f2fd;border:2px solid #007bff;">🔍 ${keyword}</div>`;
  el.innerHTML = newHtml + cur;
  const items = el.querySelectorAll(".keyword-item");
  if (items.length > 15) items[items.length - 1].remove();
}

async function updatePopularKeywords() {
  try {
    const r = await fetchWithTimeout("/api/search/popular");
    const data = r.ok ? await r.json() : [];
    displayKeywords("popularKeywords", Array.isArray(data) ? data : []);
  } catch {}
}

async function loadKeywords() {
  try {
    const [p, r] = await Promise.all([
      fetchWithTimeout("/api/search/popular"),
      fetchWithTimeout("/api/search/recent"),
    ]);
    const pop = p.ok ? await p.json() : [];
    const rec = r.ok ? await r.json() : [];
    displayKeywords("popularKeywords", Array.isArray(pop) ? pop : []);
    displayKeywords("recentKeywords", Array.isArray(rec) ? rec : []);
  } catch {
    displayKeywords("popularKeywords", []);
    displayKeywords("recentKeywords", []);
  }
}

function displayKeywords(id, list) {
  const el = document.getElementById(id);
  if (!Array.isArray(list) || list.length === 0) {
    el.innerHTML = '<div class="keyword-item">검색어가 없습니다</div>';
    return;
  }
  el.innerHTML = list
    .map((kw, i) => {
      let s = "";
      if (i === 0) s = ' style="color:#e74c3c;font-weight:bold;"';
      else if (i === 1) s = ' style="color:#f39c12;font-weight:bold;"';
      else if (i === 2) s = ' style="color:#f1c40f;font-weight:bold;"';
      return `<div class="keyword-item"${s}>${i + 1}. ${kw}</div>`;
    })
    .join("");
}

document.getElementById("searchInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") search(null);
});

function pickValue(x) {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof x.value === "string") return x.value;
  if (typeof x.member === "string") return x.member;
  if (typeof x.element === "string") return x.element;
  return String(x.value ?? x.member ?? x.element ?? x);
}
function pickScore(x) {
  if (x == null) return "";
  if (typeof x.score === "number" || typeof x.score === "string")
    return x.score;
  return "";
}

async function generateTestData(btn) {
  const done = setLoading(btn, "데이터 생성 중...");
  try {
    const r = await fetchWithTimeout("/api/test/generate-data", {
      method: "POST",
    });
    if (!r.ok) throw new Error();
    await r.json();
    await loadKeywords();
    showMessage("테스트 데이터가 성공적으로 생성되었습니다!", "success");
  } catch {
    showMessage("테스트 데이터 생성 중 오류가 발생했습니다.", "error");
  } finally {
    done();
  }
}

async function clearCache(btn) {
  const done = setLoading(btn, "초기화 중...");
  try {
    const r = await fetchWithTimeout("/api/test/clear-cache", {
      method: "POST",
    });
    if (!r.ok) throw new Error();
    await r.json();
    await loadKeywords();
    showMessage("캐시가 성공적으로 초기화되었습니다!", "info");
  } catch {
    showMessage("캐시 초기화 중 오류가 발생했습니다.", "error");
  } finally {
    done();
  }
}

async function checkRedisStatus(btn) {
  const done = setLoading(btn, "확인 중...");
  try {
    const r = await fetchWithTimeout("/api/search/debug/redis-status");
    if (!r.ok) throw new Error();
    const status = await r.json();
    const el = document.getElementById("performanceComparison");
    const pop = Array.isArray(status.popularKeywords)
      ? status.popularKeywords
      : [];
    const rec = Array.isArray(status.recentKeywords)
      ? status.recentKeywords
      : [];
    const popHtml = pop
      .map(
        (it) =>
          `<div class="keyword-item">${pickValue(it)}${
            pickScore(it) !== "" ? ` (${pickScore(it)}점)` : ``
          }</div>`
      )
      .join("");
    const recHtml = rec
      .map(
        (it, i) => `<div class="keyword-item">${i + 1}. ${pickValue(it)}</div>`
      )
      .join("");
    el.innerHTML = `
      <div class="keyword-item" style="font-weight:bold;color:#007bff;">Redis 상태 정보</div>
      <div class="keyword-item">인기 검색어 수: ${status.totalPopularCount || 0}개</div>
      <div class="keyword-item">최근 검색어 수: ${status.totalRecentCount || 0}개</div>
      <div class="keyword-item" style="margin-top:10px;font-weight:bold;">인기 검색어 (점수 포함):</div>
      ${popHtml || '<div class="keyword-item">데이터가 없습니다</div>'}
      <div class="keyword-item" style="margin-top:10px;font-weight:bold;">최근 검색어:</div>
      ${recHtml || '<div class="keyword-item">데이터가 없습니다</div>'}
    `;
    showMessage("Redis 상태를 확인했습니다.", "info");
  } catch {
    showMessage("Redis 상태 확인 중 오류가 발생했습니다.", "error");
  } finally {
    done();
  }
}

async function compareRedisVsDB(btn) {
  const done = setLoading(btn, "비교 중...");
  try {
    const r = await fetchWithTimeout("/api/search/compare/redis-vs-db");
    if (!r.ok) throw new Error();
    const c = await r.json();
    const el = document.getElementById("performanceComparison");
    const r1 = Array.isArray(c.redisResult) ? c.redisResult : [];
    const r2 = Array.isArray(c.dbResult) ? c.dbResult : [];
    el.innerHTML = `
      <div class="keyword-item" style="font-weight:bold;color:#007bff;">Redis vs DB 성능 비교 결과</div>
      <div class="keyword-item">Redis 조회 시간: ${c.redisTime}</div>
      <div class="keyword-item">DB 조회 시간: ${c.dbTime}</div>
      <div class="keyword-item" style="color:#28a745;">성능 향상: ${c.performanceImprovement}</div>
      <div class="keyword-item" style="margin-top:10px;font-weight:bold;">Redis 결과:</div>
      ${r1.map((x, i) => `<div class="keyword-item">${i + 1}. ${x}</div>`).join("")}
      <div class="keyword-item" style="margin-top:10px;font-weight:bold;">DB 결과:</div>
      ${r2.map((x, i) => `<div class="keyword-item">${i + 1}. ${x}</div>`).join("")}
    `;
    showMessage("성능 비교가 완료되었습니다!", "success");
  } catch {
    showMessage("성능 비교 중 오류가 발생했습니다.", "error");
  } finally {
    done();
  }
}

(async function init() {
  await loadKeywords();
  setInterval(updatePopularKeywords, 3000);
})();

Object.assign(window, {
  search,
  generateTestData,
  clearCache,
  checkRedisStatus,
  compareRedisVsDB,
});
