const rows = document.querySelectorAll("tbody tr");
const rowsPerPage = 6;
const showingText = document.querySelector(".showing-text");
const pagination = document.querySelector(".pagination");
let currentPage = 1;

const API_BASE_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", async function () {
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    window.location.href = "login.html";
    return;
  }

  try {
    // Fetch User Dashboard Stats
    const response = await fetch(`${API_BASE_URL}/dashboard/${userId}`);
    if (response.ok) {
      const data = await response.json();

      const stats = data.stats;
      const user = data.user;

      const walletBalanceBtn = document.getElementById("walletBalanceBtn");
      if (walletBalanceBtn) walletBalanceBtn.innerText = `$${user.wallet_balance.toFixed(2)}`;
      
      const statTotalTrades = document.getElementById("statTotalTrades");
      if (statTotalTrades) statTotalTrades.innerText = stats.total_trades;
      
      const statWinRate = document.getElementById("statWinRate");
      if (statWinRate) statWinRate.innerText = `${stats.win_rate}%`;
      
      const statHit = document.getElementById("statHit");
      if (statHit) statHit.innerText = stats.winning_trades;

      const statProfit = document.getElementById("statProfit");
      if (statProfit) {
        const profitStr = stats.total_profit >= 1000
          ? `$${(stats.total_profit / 1000).toFixed(1)}K`
          : `$${stats.total_profit.toFixed(2)}`;
        statProfit.innerText = profitStr;
      }
    } else if (response.status === 401 || response.status === 404) {
       // Clear session if user not found or unauthorized
       localStorage.clear();
       window.location.href = "login.html";
    }
  } catch (error) {
    console.error("Dashboard fetch error:", error);
  }
});

// Calculate total pages
const totalPages = Math.ceil(rows.length / rowsPerPage);

// Function to show specific page
function showPage(page) {
  currentPage = page;
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;

  // Show/hide rows
  rows.forEach((row, index) => {
    row.style.display = index >= start && index < end ? "" : "none";
  });

  // Update active page number
  document.querySelectorAll(".page-number").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.querySelector(`.page-number[data-page="${page}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  // Update showing text
  showingText.innerText = `Showing ${start + 1}-${Math.min(end, rows.length)} of ${rows.length} signals`;
}

// Dynamically create page number buttons
function createPageNumbers() {
  // Remove existing page-number buttons
  document.querySelectorAll(".page-number").forEach(btn => btn.remove());

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = "page-number";
    btn.dataset.page = i;
    btn.innerText = i;
    if (i === 1) btn.classList.add("active");
    btn.addEventListener("click", () => showPage(i));
    pagination.insertBefore(btn, document.querySelector(".next"));
  }
}

// Next button
document.querySelector(".next").addEventListener("click", () => {
  if (currentPage < totalPages) {
    showPage(currentPage + 1);
  }
});

// Prev button
document.querySelector(".prev").addEventListener("click", () => {
  if (currentPage > 1) {
    showPage(currentPage - 1);
  }
});

// Initialize
createPageNumbers();
showPage(1);
function toggleMenu() {
  document.getElementById("mobileMenu").classList.toggle("show");
}
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('show');
});
document.getElementById("walletBtn").addEventListener("click", function () {
  window.location.href = "wallet.html";
});
document.getElementById("newSignalBtn").addEventListener("click", function() {
    window.location.href = "buysignal.html";
});
