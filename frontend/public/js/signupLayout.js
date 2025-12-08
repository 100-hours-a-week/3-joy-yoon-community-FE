// layout.html을 로드하고, 그 안에 signup.html의 내용 삽입
document.addEventListener("DOMContentLoaded", () => {
  const pageEl = document.getElementById("page-content");
  const pageHTML = pageEl ? pageEl.innerHTML : "";

  axios.get("/layout.html")
    .then(res => res.data)
    .then(layout => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(layout, "text/html");

      // body 전체 교체
      document.body.innerHTML = doc.body.innerHTML;

      const main = document.getElementById("content");
      if (main) main.innerHTML = pageHTML;
      else console.error("layout.html에 <main id='content'>가 없습니다.");

      // signup.js를 layout 삽입 후 로드
      const script = document.createElement("script");
      script.src = "/js/signup.js";
      document.body.appendChild(script);
    })
    .catch(err => {
      console.error("layout.html 로드 실패:", err);
      // 실패 시 폼만 보여주기
      document.body.innerHTML = pageHTML;
      const fallback = document.createElement("script");
      fallback.src = "/js/signup.js";
      document.body.appendChild(fallback);
    });
});
