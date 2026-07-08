const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            alert("Please enter your email and password.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role: "user" })
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || "Login failed.");
                return;
            }

            localStorage.setItem("currentUser", JSON.stringify(result.user));
            window.location.href = "user.html";
        } catch (error) {
            // Demo mode: server not running — create a local session with the entered email
            const demoName = email.split("@")[0]
                .replace(/[._-]/g, " ")
                .replace(/\b\w/g, c => c.toUpperCase());
            const demoUser = { id: "demo", fullname: demoName, email: email, role: "user" };
            localStorage.setItem("currentUser", JSON.stringify(demoUser));
            window.location.href = "user.html";
        }
    });
});
