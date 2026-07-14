const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";

document.addEventListener("DOMContentLoaded", () => {
    const signupForm = document.getElementById("signup-form");

    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fullname = document.getElementById("fullname").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        if (!fullname || !email || !password) {
            alert("Please complete all required fields.");
            return;
        }

        const user = {
            fullname,
            email,
            password,
            role: "user"
        };

        try {
            const response = await fetch(`${API_BASE}/api/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(user)
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || "Could not create account.");
                return;
            }

            alert("Account created. Please sign in.");
            window.location.href = "login.html";
        } catch (error) {
            alert("Could not reach the backend server. Please start the server and try again.");
        }
    });
});
