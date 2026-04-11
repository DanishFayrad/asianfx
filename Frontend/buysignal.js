const GRID = document.querySelector(".grid");
const SEARCH_INPUT = document.getElementById("searchInput");

const ASSET_NAME = document.getElementById("assetName");
const PRICE_EL = document.getElementById("price");
const TOTAL_EL = document.getElementById("total");
const AFTER_BALANCE_EL = document.getElementById("afterBalance");
const TOP_WALLET_BALANCE = document.getElementById("topWalletBalance");
const AVAILABLE_BALANCE = document.getElementById("availableBalance");
const BUY_SIGNAL_BTN = document.getElementById("buySignalBtn");

const API_BASE_URL = "http://127.0.0.1:8000";

let balance = 0;
let currentSignalId = null;

async function fetchDashboard() {
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/${userId}`);
    if (response.ok) {
      const data = await response.json();
      balance = data.user.wallet_balance;
      if (TOP_WALLET_BALANCE) TOP_WALLET_BALANCE.textContent = `$${balance.toFixed(2)}`;
      if (AVAILABLE_BALANCE) AVAILABLE_BALANCE.textContent = `$${balance.toFixed(2)}`;

      // Now fetch signals
      await fetchSignals();
    }
  } catch (err) {
    console.error("Dashboard fetch error:", err);
  }
}

async function fetchSignals() {
  try {
    const response = await fetch(`${API_BASE_URL}/signals`);
    if (response.ok) {
      const signals = await response.json();
      if (signals.length > 0) {
        GRID.innerHTML = ""; // Clear existing dummy cards
        signals.forEach(sig => {
          const card = document.createElement('div');
          card.className = 'card';
          card.setAttribute("data-id", sig.id);
          card.setAttribute("data-name", sig.symbol);
          card.setAttribute("data-price", sig.price || 100);

          card.innerHTML = `
            <div class="card-left">
              <div class="top">
                <img src="images/container (2).png">
                <div>
                  <h4>${sig.symbol}</h4>
                  <p class="sub">${sig.type}</p>
                </div>
              </div>
              <p class="label">Signal Target: ${sig.target_price}</p>
            </div>
            <div class="card-right">
              <input type="radio" name="asset" class="select-radio">
              <p class="price">Buy It</p>
            </div>
          `;
          GRID.appendChild(card);
        });

        attachCardEvents();
      } else {
        attachCardEvents();
      }
    }
  } catch (err) {
    console.error("Signals fetch error:", err);
    attachCardEvents();
  }
}

function updateUI(card) {
  const name = card.getAttribute("data-name");
  const price = parseFloat(card.getAttribute("data-price")) || 100;
  let id = card.getAttribute("data-id");

  if (!id) {
    id = Math.floor(Math.random() * 1000); // temporary id
  }

  currentSignalId = parseInt(id);

  if (ASSET_NAME) ASSET_NAME.textContent = name;
  if (PRICE_EL) PRICE_EL.textContent = "$" + price.toFixed(2);
  if (TOTAL_EL) TOTAL_EL.textContent = "$" + price.toFixed(2);

  const after = balance - price;
  if (AFTER_BALANCE_EL) {
    AFTER_BALANCE_EL.textContent = "$" + after.toFixed(2);
    AFTER_BALANCE_EL.style.color = after < 0 ? "red" : "#22c55e";
  }
}

function attachCardEvents() {
  const cards = document.querySelectorAll(".card");
  if (cards.length === 0) return;

  const firstCard = cards[0];
  firstCard.classList.add("active");

  const firstRadio = firstCard.querySelector(".select-radio");
  if (firstRadio) firstRadio.checked = true;

  updateUI(firstCard);

  cards.forEach(card => {
    card.onclick = () => {
      document.querySelectorAll(".card").forEach(c => {
        c.classList.remove("active");
        const r = c.querySelector(".select-radio");
        if (r) r.checked = false;
      });

      card.classList.add("active");
      const radio = card.querySelector(".select-radio");
      if (radio) radio.checked = true;

      updateUI(card);
    };
  });
}

if (SEARCH_INPUT) {
  SEARCH_INPUT.addEventListener("keyup", () => {
    const value = SEARCH_INPUT.value.toLowerCase();
    const cards = document.querySelectorAll(".card");
    cards.forEach(card => {
      const name = card.getAttribute("data-name").toLowerCase();
      card.style.display = name.includes(value) ? "flex" : "none";
    });
  });
}

if (BUY_SIGNAL_BTN) {
  BUY_SIGNAL_BTN.addEventListener("click", async () => {
    if (!currentSignalId) {
      alert("Please select a signal first.");
      return;
    }

    const userId = localStorage.getItem("user_id");
    let investAmount = 100.0;

    if (balance < investAmount) {
      alert("Insufficient Balance! Please deposit more funds.");
      return;
    }

    try {
      const resp = await fetch(`${API_BASE_URL}/signals/take?user_id=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal_id: parseInt(currentSignalId), invested_amount: investAmount })
      });

      const data = await resp.json();
      if (resp.ok) {
        alert("Signal purchased successfully!");
        fetchDashboard(); // Refresh balance
      } else {
        alert(data.detail || data.error || "Failed to purchase signal");
      }
    } catch (err) {
      console.error("Signal purchase error:", err);
      alert("An error occurred. Try again.");
    }
  });
}

document.addEventListener("DOMContentLoaded", fetchDashboard);
