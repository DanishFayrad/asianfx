const rows = document.querySelectorAll("tbody tr");
const rowsPerPage = 6;
const showingText = document.querySelector(".showing-text");
const pagination = document.querySelector(".pagination");
let currentPage = 1;

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