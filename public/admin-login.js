const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("admin-login-form");
    const emailInput = document.getElementById("admin-email");
    const passwordInput = document.getElementById("admin-password");

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            alert("Please enter your admin email and password.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role: "admin" })
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || "Admin login failed.");
                return;
            }

            localStorage.setItem("currentUser", JSON.stringify(result.user));
            window.location.href = "admin.html";
        } catch (error) {
            alert("Could not reach the backend server. Please start the server and try again.");
        }
    });
});
