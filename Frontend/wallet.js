function goTo(page){
  window.location.href = page;
}
const transactions = [
  { date: "Dec 28, 2024", time: "10:32 AM", type: "Trade", amount: "+$2,450.00", status: "Completed" },
  { date: "Dec 27, 2024", time: "03:15 PM", type: "Withdrawal", amount: "-$5,000.00", status: "Pending" },
  { date: "Dec 26, 2024", time: "11:48 AM", type: "Deposit", amount: "+$10,000.00", status: "Completed" },
  { date: "Dec 25, 2024", time: "09:22 AM", type: "Trade", amount: "-$1,320.00", status: "Completed" },
  { date: "Dec 24, 2024", time: "01:15 PM", type: "Deposit", amount: "+$7,000.00", status: "Completed" },
  { date: "Dec 23, 2024", time: "05:00 PM", type: "Trade", amount: "-$900.00", status: "Pending" },
  { date: "Dec 22, 2024", time: "11:12 AM", type: "Withdrawal", amount: "-$2,200.00", status: "Completed" },
  { date: "Dec 21, 2024", time: "02:30 PM", type: "Deposit", amount: "+$4,000.00", status: "Completed" },
  { date: "Dec 20, 2024", time: "10:10 AM", type: "Trade", amount: "-$1,100.00", status: "Completed" },
  { date: "Dec 19, 2024", time: "03:45 PM", type: "Withdrawal", amount: "-$3,500.00", status: "Pending" },
];

// Pagination and filtering variables
let currentPage = 1;
const rowsPerPage = 5;
let filteredTransactions = [...transactions];

// Elements
const tbody = document.querySelector("tbody");
const footerSpan = document.querySelector(".footer span");
const paginationDiv = document.querySelector(".pagination");
const filterType = document.querySelector(".filters select");
const filterDate = document.querySelector(".filters input");
const filterBtn = document.querySelector(".filter-btn");

// Render table function
function renderTable() {
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
          <img src="div (10).png" style="width:29px; height:42px;">
          <div><div style="font-weight:600;">${tx.type}</div></div>
        </div>
      </td>
      <td class="${tx.amount.startsWith('+') ? 'profit' : 'loss'}">${tx.amount}</td>
      <td class="${tx.status.toLowerCase()}">${tx.status}</td>
      <td class="view">View</td>
    `;
    tbody.appendChild(tr);
  });

  footerSpan.textContent = `Showing ${Math.min(start + 1, filteredTransactions.length)}-${Math.min(end, filteredTransactions.length)} of ${filteredTransactions.length} transactions`;
  renderPagination();
}

// Render pagination buttons dynamically
function renderPagination() {
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

// Filter transactions
function applyFilter() {
  const typeValue = filterType.value;
  const dateValue = filterDate.value; // format YYYY-MM-DD

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

  currentPage = 1; // reset to first page after filtering
  renderTable();
}

// Initialize type filter options dynamically
function initFilters() {
  const types = ["All Types", ...new Set(transactions.map(tx => tx.type))];
  filterType.innerHTML = types.map(t => `<option>${t}</option>`).join('');
}

// Event listener for filter button
filterBtn.addEventListener("click", applyFilter);

// Initial setup
initFilters();
renderTable();
function toggleSidebar(){
  document.querySelector(".sidebar").classList.toggle("active");
}
function toggleSidebar(){
  document.querySelector(".sidebar").classList.toggle("active");
}