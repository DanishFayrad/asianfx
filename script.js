const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");

hamburger.addEventListener("click", () => {
  navLinks.classList.toggle("active");
});
// =============================================

document.addEventListener('DOMContentLoaded', function () {

  const submitBtn = document.getElementById('submitBtn');

  if (submitBtn) {
    submitBtn.addEventListener('click', function () {

      const fullName     = document.getElementById('fullName').value.trim();
      const emailAddress = document.getElementById('emailAddress').value.trim();
      const phoneNumber  = document.getElementById('phoneNumber').value.trim();
      const investment   = document.getElementById('investmentRange').value;
      const message      = document.getElementById('message').value.trim();

      if (!fullName) {
        alert('Please enter your Full Name.');
        return;
      }

      if (!emailAddress) {
        alert('Please enter your Email Address.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailAddress)) {
        alert('Please enter a valid Email Address.');
        return;
      }

      alert('Thank you, ' + fullName + '! Your consultation has been booked. We will contact you shortly.');

      document.getElementById('fullName').value        = '';
      document.getElementById('emailAddress').value    = '';
      document.getElementById('phoneNumber').value     = '';
      document.getElementById('investmentRange').value = '';
      document.getElementById('message').value         = '';
    });
  }

});
// ================= PROFIT CALCULATOR =================

const investmentEl = document.querySelector(".pc-field:nth-child(1) span");
const returnEl = document.querySelector(".pc-field:nth-child(2) span");
const durationEl = document.querySelector(".pc-field:nth-child(3) span");

const totalEl = document.querySelector(".pc-box.gold h3");
const profitEl = document.querySelector(".pc-box:nth-child(2) h3");
const yourEl = document.querySelector(".pc-box.green h3");
const ourEl = document.querySelector(".pc-box.dim h3");

// default values
let investment = 10000;
let monthlyReturn = 8;
let months = 6;

function calculateProfit() {

  let total = investment * Math.pow((1 + monthlyReturn/100), months);
  let profit = total - investment;

  let yourShare = profit * 0.65;
  let ourShare = profit * 0.35;

  totalEl.innerText = "$" + total.toFixed(2);
  profitEl.innerText = "$" + profit.toFixed(2);
  yourEl.innerText = "$" + yourShare.toFixed(2);
  ourEl.innerText = "$" + ourShare.toFixed(2);

}

// run once
calculateProfit();
document.addEventListener('DOMContentLoaded', function () {

  const submitBtn = document.getElementById('submitBtn');

  if (submitBtn) {
    submitBtn.addEventListener('click', function () {

      const fullName     = document.getElementById('fullName').value.trim();
      const emailAddress = document.getElementById('emailAddress').value.trim();
      const phoneNumber  = document.getElementById('phoneNumber').value.trim();
      const investment   = document.getElementById('investmentRange').value;
      const message      = document.getElementById('message').value.trim();

      if (!fullName) {
        alert('Please enter your Full Name.');
        return;
      }

      if (!emailAddress) {
        alert('Please enter your Email Address.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailAddress)) {
        alert('Please enter a valid Email Address.');
        return;
      }

      alert('Thank you, ' + fullName + '! Your consultation has been booked. We will contact you shortly.');

      document.getElementById('fullName').value        = '';
      document.getElementById('emailAddress').value    = '';
      document.getElementById('phoneNumber').value     = '';
      document.getElementById('investmentRange').value = '';
      document.getElementById('message').value         = '';
    });
  }

});