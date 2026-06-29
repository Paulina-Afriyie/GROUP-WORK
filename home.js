document.addEventListener("DOMContentLoaded", () => {
    const browseBtn = document.getElementById("start-hosting-btn");
    const heroSigninBtn = document.getElementById("hero-signin-btn");
    const navSigninBtn = document.getElementById("nav-signin-btn");

    browseBtn?.addEventListener("click", () => {
        window.location.href = "login.html";
    });

    const goToSignup = () => {
        window.location.href = "signup.html";
    };

    heroSigninBtn?.addEventListener("click", goToSignup);
    navSigninBtn?.addEventListener("click", goToSignup);
});
