const API_BASE_URL = "http://127.0.0.1:8000";

const passwordField = document.getElementById("passwordField");
const togglePassword = document.getElementById("togglePassword");

if (togglePassword && passwordField) {
  togglePassword.addEventListener("click", function () {
    if (passwordField.type === "password") {
      passwordField.type = "text";
      togglePassword.src = "images/eye icon.png";
    } else {
      passwordField.type = "password";
      togglePassword.src = "images/eye icon.png";
    }
  });
}

document.getElementById("loginBtn")?.addEventListener("click", async function (e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("passwordField").value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("user_name", data.name);
      localStorage.setItem("user_email", data.email);

      alert("Login successful!");
      window.location.href = "dashboard.html";
    } else {
      alert(data.detail || "Login failed. Please check your credentials.");
    }
  } catch (error) {
    console.error("Error during login:", error);
    alert("An error occurred during login. Please try again later.");
  }
});

document.getElementById("forgotBtn")?.addEventListener("click", async () => {
  const email = prompt("Enter your email for reset password:");
  if (!email) return;

  try {
    const res = await fetch(`${API_BASE_URL}/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    alert(data.message);
    window.location.href = "reset-password.html";
  } catch (error) {
    alert("Error requesting password reset.");
  }
});