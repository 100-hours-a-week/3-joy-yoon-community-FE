/**
 * 공통 header/footer를 동적으로 불러오는 스크립트
 * - fetch로 HTML 조각 삽입
 * - 경로 자동 계산
 * - 로딩 placeholder 표시
 * - 캐시 재사용
 */

async function includeHTML(selector, fileName) {
  const element = document.querySelector(selector);
  if (!element) return;

  // 로딩 상태 표시 (깜빡임 방지)
  element.innerHTML = '<div class="loading-placeholder"></div>';

  // 현재 경로 기반으로 상대 경로 계산
  const basePath = window.location.pathname.split('/').slice(0, -1).join('/');
  const filePath = `${basePath}/${fileName}`.replace(/\/+/g, '/');

  // 캐시를 먼저 확인 (localStorage)
  const cacheKey = `cache_${fileName}`;
  const cachedHTML = localStorage.getItem(cacheKey);

  if (cachedHTML) {
    element.innerHTML = cachedHTML;
  }

  try {
    const response = await axios.get(filePath, {
      headers: { 'Cache-Control': 'no-store' }
    });
    const html = response.data;

    element.innerHTML = html;
    localStorage.setItem(cacheKey, html); // 캐시 저장
  } catch (error) {
    console.error(`${fileName} 불러오기 실패:`, error);
    element.innerHTML = `<p style="color:red;">${fileName}을(를) 불러올 수 없습니다.</p>`;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  includeHTML("#header", "header.html");
  includeHTML("#footer", "footer.html");
});
