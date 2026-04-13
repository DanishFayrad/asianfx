document.addEventListener("DOMContentLoaded", function () {

  // ===== PASSWORD TOGGLE =====
  const signupPassword = document.getElementById("signupPassword");
  const toggleSignupPassword = document.getElementById("toggleSignupPassword");

  if (signupPassword && toggleSignupPassword) {
    toggleSignupPassword.addEventListener("click", function () {
      signupPassword.type =
        signupPassword.type === "password" ? "text" : "password";
    });
  }

  // ===== CONFIG =====
  const API_BASE_URL = "http://127.0.0.1:8000";

  // ===== SIGNUP BUTTON =====
  const signupBtn = document.getElementById("signupBtn");

  if (signupBtn) {
    signupBtn.addEventListener("click", async function (e) {
      e.preventDefault();

      const name = document.getElementById("signupName").value;
      const email = document.getElementById("signupEmail").value;
      const password = signupPassword.value;

      if (!name || !email || !password) {
        alert("Please fill in all required fields.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
          alert(data.message || "Signup successful! Please check your email for verification.");
          // Save email temporarily for OTP verification if needed
          localStorage.setItem("verify_email", email);
          window.location.href = "verify.html";
        } else {
          // Now handles error status codes like 400 or 500
          console.error("Signup error details:", data);
          alert(data.detail || data.error || "Signup failed. Please try again.");
        }
      } catch (error) {
        console.error("Network or catch during signup:", error);
        alert("An error occurred during signup. Please check your connection and try again.");
      }
    });
  } else {
    console.log("signupBtn NOT found");
  }

});