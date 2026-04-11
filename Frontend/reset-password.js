document.addEventListener("DOMContentLoaded", function () {

  // ===== FORM =====
  const form = document.getElementById("resetForm");

  // ===== TOKEN =====
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  console.log("RESET TOKEN:", token); // debug

  // ===== INPUTS =====
  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");

  // ===== EYE ICONS =====
  const toggleNew = document.getElementById("toggleNewPassword");
  const toggleConfirm = document.getElementById("toggleConfirmPassword");

  // ===== EYE TOGGLE NEW PASSWORD =====
  if (toggleNew) {
    toggleNew.addEventListener("click", function () {
      newPassword.type = newPassword.type === "password" ? "text" : "password";
    });
  }

  // ===== EYE TOGGLE CONFIRM PASSWORD =====
  if (toggleConfirm) {
    toggleConfirm.addEventListener("click", function () {
      confirmPassword.type = confirmPassword.type === "password" ? "text" : "password";
    });
  }

  // ===== FORM SUBMIT =====
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // ⚠️ token check (VERY IMPORTANT)
    if (!token) {
      alert("Reset link invalid or expired (token missing)");
      return;
    }

    if (newPassword.value !== confirmPassword.value) {
      alert("Passwords do not match");
      return;
    }

    const res = await fetch("http://127.0.0.1:8000/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: token,
        new_password: newPassword.value
      })
    });

    const data = await res.json();

    if (res.ok) {
      alert("Password reset successful");
      window.location.href = "login.html";
    } else {
      alert(data.detail || "Error");
    }
  });

});