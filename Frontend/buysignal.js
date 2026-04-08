
const cards = document.querySelectorAll(".card");
const searchInput = document.getElementById("searchInput");

const assetName = document.getElementById("assetName");
const priceEl = document.getElementById("price");
const totalEl = document.getElementById("total");
const afterBalanceEl = document.getElementById("afterBalance");

let balance = 12450;

// 🔥 function to update UI
function updateUI(card) {
  const name = card.getAttribute("data-name");
  const price = parseFloat(card.getAttribute("data-price"));

  assetName.textContent = name;
  priceEl.textContent = "$" + price.toFixed(2);
  totalEl.textContent = "$" + price.toFixed(2);

  const after = balance - price;
  afterBalanceEl.textContent =
    "$" + after.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

// 🔥 default select
let defaultCard = null;

cards.forEach(card => {
  const radio = card.querySelector(".select-radio");
  if (radio.checked) {
    defaultCard = card;
  }
});

if (!defaultCard && cards.length > 0) {
  defaultCard = cards[0];
  defaultCard.querySelector(".select-radio").checked = true;
}

if (defaultCard) {
  defaultCard.classList.add("active");
  updateUI(defaultCard);
}

// 🔥 click event
cards.forEach(card => {
  card.addEventListener("click", () => {

    cards.forEach(c => {
      c.classList.remove("active");
      c.querySelector(".select-radio").checked = false;
    });

    card.classList.add("active");
    card.querySelector(".select-radio").checked = true;

    updateUI(card);
  });
});

// 🔥 SEARCH FUNCTION
searchInput.addEventListener("keyup", () => {
  const value = searchInput.value.toLowerCase();

  cards.forEach(card => {
    const name = card.getAttribute("data-name").toLowerCase();

    if (name.includes(value)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
});
