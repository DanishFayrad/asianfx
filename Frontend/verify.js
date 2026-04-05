const options = document.querySelectorAll(".verify-option");

options.forEach(option => {
  option.addEventListener("click", () => {
    options.forEach(o => o.classList.remove("active"));
    option.classList.add("active");
  });
});

document.querySelector(".continue-btn").addEventListener("click", () => {
  const selected = document.querySelector(".verify-option.active h4").innerText;

  if (!selected) {
    alert("Please select a method");
    return;
  }

  // Redirect to OTP page
  window.location.href = "otp.html";
});
document.querySelector(".continue-btn").addEventListener("click", function () {
  window.location.href = "otp.html";
});