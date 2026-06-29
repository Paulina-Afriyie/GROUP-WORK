const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";

let booksData = [
    {
        id: 1,
        title: "Your Uploaded Book Cover",
        author: "Unknown Author",
        price: 25.00,
        category: "fiction",
        image: "images/dd.jpg"
    },
    {
        id: 2,
        title: "Clean Code",
        author: "Robert C. Martin",
        price: 34.99,
        category: "tech",
        image: "images/bb.jpg"
    },
    {
        id: 3,
        title: "Atomic Habits",
        author: "James Clear",
        price: 18.20,
        category: "self-help",
        image: "images/ss.jpg"
    },
    {
        id: 4,
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        price: 14.50,
        category: "fiction",
        image: "images/hh.jpg"
    },
    {
        id: 5,
        title: "Eloquent JavaScript",
        author: "Marijn Haverbeke",
        price: 28.99,
        category: "tech",
        image: "images/hh (2).jpg"
    },
    {
        id: 6,
        title: "Deep Work",
        author: "Cal Newport",
        price: 16.99,
        category: "self-help",
        image: "images/The Joys of Motherhood.jpg"
    }
];

let cart = [];
let activeCategory = "all";
let searchQuery = "";

document.addEventListener("DOMContentLoaded", () => {
    loadBooks();
    setupCartUI();
    setupFilters();
});

async function loadBooks() {
    try {
        const response = await fetch(`${API_BASE}/api/books`);

        if (!response.ok) {
            throw new Error("Book request failed");
        }

        booksData = await response.json();
    } catch (error) {
        // Keep the sample books visible when the backend is not running yet.
    }

    renderBooks();
}

function renderBooks() {
    const booksGrid = document.getElementById("books-grid");
    booksGrid.innerHTML = "";

    const filteredBooks = booksData.filter((book) => {
        const query = searchQuery.toLowerCase();
        const matchesCategory = activeCategory === "all" || book.category === activeCategory;
        const matchesSearch =
            book.title.toLowerCase().includes(query) ||
            book.author.toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
    });

    if (filteredBooks.length === 0) {
        booksGrid.innerHTML = "<p class='text-muted'>No books found matching your search.</p>";
        return;
    }

    filteredBooks.forEach((book) => {
        const card = document.createElement("div");
        card.className = "book-card";
        card.innerHTML = `
            <div>
                <div class="book-cover">
                    <img src="${book.image}" alt="${book.title}" class="book-img">
                </div>
                <h4 class="book-title">${book.title}</h4>
                <p class="book-author">${book.author}</p>
            </div>
            <div class="book-footer">
                <span class="book-price">$${book.price.toFixed(2)}</span>
                <button class="add-to-cart" type="button" data-book-id="${book.id}">Add +</button>
            </div>
        `;

        card.querySelector(".add-to-cart").addEventListener("click", () => addToCart(book.id));
        booksGrid.appendChild(card);
    });
}

function setupFilters() {
    document.getElementById("search-input").addEventListener("input", (event) => {
        searchQuery = event.target.value;
        renderBooks();
    });

    document.querySelectorAll(".category-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".category-chip").forEach((item) => item.classList.remove("active"));
            chip.classList.add("active");
            activeCategory = chip.dataset.category;
            renderBooks();
        });
    });
}

function addToCart(id) {
    const targetBook = booksData.find((book) => book.id === id);
    if (!targetBook) return;

    const existingItem = cart.find((item) => item.id === id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...targetBook, quantity: 1 });
    }

    updateCartUI();
}

function removeFromCart(id) {
    cart = cart.filter((item) => item.id !== id);
    updateCartUI();
}

function updateCartUI() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const container = document.getElementById("cart-items-container");
    const totalSpan = document.getElementById("cart-total");

    document.getElementById("cart-count").innerText = count;

    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
        totalSpan.innerText = "0.00";
        return;
    }

    container.innerHTML = "";
    let totalPrice = 0;

    cart.forEach((item) => {
        totalPrice += item.price * item.quantity;

        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <div>
                <h5>${item.title}</h5>
                <small class="text-muted">$${item.price.toFixed(2)} x ${item.quantity}</small>
            </div>
            <button class="close-btn" type="button" style="font-size:1.15rem">&times;</button>
        `;

        div.querySelector(".close-btn").addEventListener("click", () => removeFromCart(item.id));
        container.appendChild(div);
    });

    totalSpan.innerText = totalPrice.toFixed(2);
}

function setupCartUI() {
    const drawer = document.getElementById("cart-drawer");
    const overlay = document.getElementById("overlay");
    const toggleBtn = document.getElementById("cart-toggle-btn");
    const closeBtn = document.getElementById("close-cart-btn");
    const checkoutBtn = document.getElementById("checkout-btn");

    const openCart = () => {
        drawer.classList.add("open");
        overlay.classList.add("open");
    };

    const closeCart = () => {
        drawer.classList.remove("open");
        overlay.classList.remove("open");
    };

    toggleBtn.addEventListener("click", openCart);
    closeBtn.addEventListener("click", closeCart);
    overlay.addEventListener("click", closeCart);

    checkoutBtn.addEventListener("click", () => {
        if (cart.length === 0) {
            alert("Your cart is empty.");
            return;
        }

        alert("Checkout complete.");
        cart = [];
        updateCartUI();
        closeCart();
    });
}
