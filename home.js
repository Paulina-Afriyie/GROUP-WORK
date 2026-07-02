document.addEventListener("DOMContentLoaded", () => {
    const browseBtn = document.getElementById("start-hosting-btn");
    const heroSigninBtn = document.getElementById("hero-signin-btn");
    const navSigninBtn = document.getElementById("nav-signin-btn");

    browseBtn?.addEventListener("click", () => {
        window.location.href = "login.html";
    });

    const goToLogin = () => {
        window.location.href = "login.html";
    };

    heroSigninBtn?.addEventListener("click", goToLogin);
    navSigninBtn?.addEventListener("click", goToLogin);
});
