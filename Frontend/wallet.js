function goTo(page) {
  window.location.href = page;
}

function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("active");
}

let transactions = [];
let currentPage = 1;
const rowsPerPage = 5;
let filteredTransactions = [];

// Elements
const tbody = document.querySelector("tbody");
const footerSpan = document.querySelector(".footer span");
const paginationDiv = document.querySelector(".pagination");
const filterType = document.querySelector(".filters select");
const filterDate = document.querySelector(".filters input");
const filterBtn = document.querySelector(".filter-btn");

const API_BASE_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/${userId}`);
    if (response.ok) {
      const data = await response.json();
      const stats = data.stats;
      const user = data.user;

      // Populate Wallet Stats if elements exist (wallet.html)
      const walletBalanceBtn = document.getElementById("walletBalanceBtn");
      if (walletBalanceBtn) walletBalanceBtn.innerText = `$${user.wallet_balance.toFixed(2)}`;

      const totalBalance = document.getElementById("walletTotalBalance");
      if (totalBalance) totalBalance.innerText = `$${user.wallet_balance.toFixed(2)}`;

      const totalDeposit = document.getElementById("walletTotalDeposit");
      if (totalDeposit) totalDeposit.innerText = `$${stats.total_deposit.toFixed(2)}`;

      const totalWithdrawal = document.getElementById("walletTotalWithdrawal");
      if (totalWithdrawal) totalWithdrawal.innerText = `$${stats.total_withdrawal.toFixed(2)}`;

      const totalProfit = document.getElementById("walletTotalProfit");
      if (totalProfit) totalProfit.innerText = `$${stats.total_profit.toFixed(2)}`;

      const totalLoss = document.getElementById("walletTotalLoss");
      if (totalLoss) totalLoss.innerText = `$${stats.total_loss.toFixed(2)}`;

      // Setup Transactions Table if it exists (transaction.html)
      if (tbody) {
        transactions = data.recent_transactions.map(tx => {
          const d = new Date(tx.created_at);
          return {
            date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            time: d.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }),
            type: tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
            amount: `${tx.type === 'deposit' || tx.type === 'profit' ? '+' : '-'}$${tx.amount.toFixed(2)}`,
            status: "Completed" // API only returns completed tx currently
          };
        });
        filteredTransactions = [...transactions];
        initFilters();
        renderTable();
      }
    }
  } catch (error) {
    console.error("Wallet fetch error:", error);
  }
});

function renderTable() {
  if (!tbody) return;
  tbody.innerHTML = "";
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageTransactions = filteredTransactions.slice(start, end);

  pageTransactions.forEach(tx => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="date">${tx.date}<small>${tx.time}</small></td>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-weight:600;">${tx.type}</div>
        </div>
      </td>
      <td class="${tx.amount.startsWith('+') ? 'profit' : 'loss'}">${tx.amount}</td>
      <td class="${tx.status.toLowerCase()}">${tx.status}</td>
      <td class="view">View</td>
    `;
    tbody.appendChild(tr);
  });

  if (footerSpan) {
    footerSpan.textContent = `Showing ${Math.min(start + 1, filteredTransactions.length)}-${Math.min(end, filteredTransactions.length)} of ${filteredTransactions.length} transactions`;
  }
  renderPagination();
}

function renderPagination() {
  if (!paginationDiv) return;
  const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);
  paginationDiv.innerHTML = `
    <button id="prev">Previous</button>
    ${Array.from({ length: totalPages }, (_, i) => `<button class="${i + 1 === currentPage ? 'active' : ''}">${i + 1}</button>`).join('')}
    <button id="next">Next</button>
  `;

  paginationDiv.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.id === "prev" && currentPage > 1) currentPage--;
      else if (btn.id === "next" && currentPage < totalPages) currentPage++;
      else if (!isNaN(btn.textContent)) currentPage = parseInt(btn.textContent);
      renderTable();
    });
  });
}

function applyFilter() {
  const typeValue = filterType.value;
  const dateValue = filterDate.value;

  filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date + " " + tx.time);
    const filterDateObj = dateValue ? new Date(dateValue) : null;

    const typeMatch = typeValue === "All Types" || tx.type === typeValue;
    const dateMatch = !filterDateObj || (
      txDate.getFullYear() === filterDateObj.getFullYear() &&
      txDate.getMonth() === filterDateObj.getMonth() &&
      txDate.getDate() === filterDateObj.getDate()
    );

    return typeMatch && dateMatch;
  });

  currentPage = 1;
  renderTable();
}

function initFilters() {
  if (!filterType) return;
  const types = ["All Types", ...new Set(transactions.map(tx => tx.type))];
  filterType.innerHTML = types.map(t => `<option>${t}</option>`).join('');
  if (filterBtn) filterBtn.addEventListener("click", applyFilter);
}