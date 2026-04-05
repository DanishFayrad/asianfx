const passwordField = document.getElementById("passwordField");
const togglePassword = document.getElementById("togglePassword");

togglePassword.addEventListener("click", function () {
  
  if (passwordField.type === "password") {
    passwordField.type = "text";
    togglePassword.src = "images/eye icon.png";  // open eye icon
  } else {
    passwordField.type = "password";
    togglePassword.src = "images/eye icon.png";  // closed eye icon
  }

});
document.getElementById("loginBtn").addEventListener("click", function (e) {
  e.preventDefault(); // form submit rukega
  window.location.href = "dashboard.html";
});
