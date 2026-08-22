// ================= 顶部时钟 =================
function updateClock() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
  const date = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${week}`;
  document.getElementById('clockTime').textContent = time;
  document.getElementById('clockDate').textContent = date;
}
updateClock();
setInterval(updateClock, 1000);
