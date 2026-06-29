// Wait for the DOM to fully load
document.addEventListener('DOMContentLoaded', () => {
    
    // Grab UI Elements
    const startHostingBtn = document.getElementById('start-hosting-btn');
    const heroSigninBtn = document.getElementById('hero-signin-btn');
    const navSigninBtn = document.getElementById('nav-signin-btn');

   // Add interactivity / Event Listeners
startHostingBtn.addEventListener('click', (event) => {
    // Prevent default anchor link behavior if this is a link tag
    if (event) event.preventDefault(); 
    
    alert('Redirecting to User Dashboard registration...');
    window.location.href = 'login.html'; // Sends them to the login screen first!
});

    heroSigninBtn.addEventListener('click', handleSignIn);
    navSigninBtn.addEventListener('click', handleSignIn);

    function handleSignIn() {
    alert('Opening Sign In secure portal...');
    window.location.href = 'signup.html'; // Redirects to your signup page immediately after clicking OK
}
});

// Hardcode your real images directly here for now!
const booksData = [
    { 
        id: 1, 
        title: "Your Uploaded Book Cover", 
        author: "Unknown Author", 
        price: 25.00, 
        category: "fiction", 
        image: "images/dd.jpg" // Uses your local file directly!
    },
    { 
        id: 2, 
        title: "Clean Code", 
        author: "Robert C. Martin", 
        price: 34.99, 
        category: "tech", 
        image: "images/bb.jpg" // Uses your local file directly!
    },
    { 
        id: 3, 
        title: "Atomic Habits", 
        author: "James Clear", 
        price: 18.20, 
        category: "self-help", 
        image: "images/ss.jpg" // Uses your local file directly!
    },
    { 
        id: 4, 
        title: "To Kill a Mockingbird", 
        author: "Harper Lee", 
        price: 14.50, 
        category: "fiction", 
        image: "images/hh.jpg" // Uses your local file directly!
    },
    { 
        id: 5, 
        title: "Eloquent JavaScript", 
        author: "Marijn Haverbeke", 
        price: 28.99, 
        category: "tech", 
        image: "images/hh (2).jpg" // Uses your local file directly!
    },


    { 
        id: 6, 
        title: "Deep Work", 
        author: "Cal Newport", 
        price: 16.99, 
        category: "self-help", 
        image: "images/The Joys of Motherhood.jpg" // Uses your local file directly!
    },



    { 
        id: 7, 
        title: "Deep Work", 
        author: "Cal Newport", 
        price: 16.99, 
        category: "self-help", 
        image: "images/The Joys of Motherhood.jpg" // Uses your local file directly!
    },

    { 
        id: 8, 
        title: "Deep Work", 
        author: "Cal Newport", 
        price: 16.99, 
        category: "self-help", 
        image: "images/The Joys of Motherhood.jpg" // Uses your local file directly!
    }
];

let cart = [];
let activeCategory = "all";
let searchQuery = "";

document.addEventListener("DOMContentLoaded", () => {
    // Render books straight away from our local data array
    renderBooks();
    setupCartUI();
    setupFilters();
});

// Render books array dynamically based on structural rules
function renderBooks() {
    const booksGrid = document.getElementById("books-grid");
    booksGrid.innerHTML = "";

    const filteredBooks = booksData.filter(book => {
        const matchesCategory = activeCategory === "all" || book.category === activeCategory;
        const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              book.author.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if(filteredBooks.length === 0) {
        booksGrid.innerHTML = `<p class='text-muted'>No books found matching your parameters.</p>`;
        return;
    }

    filteredBooks.forEach(book => {
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
                <button class="add-to-cart" onclick="addToCart(${book.id})">Add +</button>
            </div>
        `;
        booksGrid.appendChild(card);
    });
}

// Filter handling initialization
function setupFilters() {
    document.getElementById("search-input").addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderBooks();
    });

    const chips = document.querySelectorAll(".category-chip");
    chips.forEach(chip => {
        chip.addEventListener("click", (e) => {
            chips.forEach(c => c.classList.remove("active"));
            e.target.classList.add("active");
            activeCategory = e.target.dataset.category;
            renderBooks();
        });
    });
}

// Cart System Core Operations Logic Engine
window.addToCart = function(id) {
    const targetBook = booksData.find(b => b.id == id);
    if (!targetBook) return;

    const existingItem = cart.find(item => item.id == id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...targetBook, quantity: 1 });
    }
    updateCartUI();
};

function updateCartUI() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById("cart-count").innerText = count;

    const container = document.getElementById("cart-items-container");
    const totalSpan = document.getElementById("cart-total");
    
    if(cart.length === 0) {
        container.innerHTML = `<p class="empty-msg">Your cart is empty.</p>`;
        totalSpan.innerText = "0.00";
        return;
    }

    container.innerHTML = "";
    let totalPrice = 0;

    cart.forEach(item => {
        totalPrice += item.price * item.quantity;
        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <div>
                <h5>${item.title}</h5>
                <small class="text-muted">$${item.price} x ${item.quantity}</small>
            </div>
            <button class="close-btn" style="font-size:1.15rem" onclick="removeFromCart(${item.id})">&times;</button>
        `;
        container.appendChild(div);
    });

    totalSpan.innerText = totalPrice.toFixed(2);
}

window.removeFromCart = function(id) {
    cart = cart.filter(item => item.id != id);
    updateCartUI();
};

// UI Toggles System Setup Control Mechanics
function setupCartUI() {
    const drawer = document.getElementById("cart-drawer");
    const overlay = document.getElementById("overlay");
    const toggleBtn = document.getElementById("cart-toggle-btn");
    const closeBtn = document.getElementById("close-cart-btn");
    const checkoutBtn = document.getElementById("checkout-btn");

    const openCart = () => { drawer.classList.add("open"); overlay.classList.add("open"); };
    const closeCart = () => { drawer.classList.remove("open"); overlay.classList.remove("open"); };

    toggleBtn.addEventListener("click", openCart);
    closeBtn.addEventListener("click", closeCart);
    overlay.addEventListener("click", closeCart);
    
    checkoutBtn.addEventListener("click", () => {
        if(cart.length === 0) return alert("Your cart is empty!");
        alert("🎉 Checkout complete!");
        cart = [];
        updateCartUI();
        closeCart();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // Select our DOM elements from login.html
    const userTabBtn = document.getElementById('user-tab-btn');
    const adminTabBtn = document.getElementById('admin-tab-btn');
    const loginForm = document.getElementById('login-form');
    const identityLabel = document.getElementById('identity-label');
    const emailInput = document.getElementById('email');
    const redirectFooter = document.getElementById('signup-redirect');
    const roleHiddenInput = document.getElementById('user-role');

    // Setup event listeners for switching tabs
    userTabBtn.addEventListener('click', () => setRole('user'));
    adminTabBtn.addEventListener('click', () => setRole('admin'));

    // Tab Switching Logic Engine
    function setRole(role) {
        // Save the chosen role into our hidden input field
        roleHiddenInput.value = role;
        
        // Update visual active states on the button tabs
        userTabBtn.classList.toggle('active', role === 'user');
        adminTabBtn.classList.toggle('active', role === 'admin');

        // Dynamically adjust inputs based on selected role
        if (role === 'admin') {
            identityLabel.innerText = "Admin Registration Email / ID";
            emailInput.placeholder = "admin@bookshop.com";
            redirectFooter.style.visibility = "hidden"; // Hides register option for admins
        } else {
            identityLabel.innerText = "Email Address";
            emailInput.placeholder = "name@example.com";
            redirectFooter.style.visibility = "visible"; // Shows register option for standard users
        }
    }

    // Form Submission & Dashboard Redirection Routing
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevents the page from refreshing automatically
        
        const currentRole = roleHiddenInput.value;
        const enteredEmail = emailInput.value;
        
        if (currentRole === 'admin') {
            alert(`🎉 Logging in successfully as Administrator (${enteredEmail})! Redirecting to dashboard...`);
            window.location.href = 'admin.html'; // Sends admin directly to dashboard
        } else {
            alert(`🎉 Logging in successfully as User (${enteredEmail})! Redirecting to shop...`);
            window.location.href = 'user.html'; // Sends regular user to dashboard
        }
    });
});

//ADMINI DASHBOARD
document.addEventListener("DOMContentLoaded", () => {
    // Dynamic Application Database Structures
    const dashboardData = {
        staff: {
            title: "Staff Management",
            tableTitle: "Active Personnel Registry",
            headers: ["Staff ID", "Staff Name", "Staff Username","Staff Role", "Staff password", "Actions"],
            rows: [
                
            ]
        },

        products: {
            title: "Products",
            tableTitle: "Active Personnel Registry",
            headers: ["Product ID", "Product Name", "Product Price", "Supplier ID","Category ID", "Actions"],
            rows: [
                
            ]
        },

         category: {
            title: "Category",
            tableTitle: "Active Personnel Registry",
            headers: ["Category ID","Category name", "Actions"],
            rows: [
                
            ]
        },
        stock: {
            title: "Products In Stock",
            tableTitle: "Available Book Inventory Logs",
            headers: ["SKU Code", "Book Title", "Category", "Quantity Left", "Unit Price", "Actions"],
            rows: [
                
            ]
        },
        out: {
            title: "Out of Stock Products",
            tableTitle: "Critical Supply Depletion Catalog",
            headers: ["SKU Code", "Depleted Title", "Last Supplier ID", "Status Log" ,"Actions"],
            rows: [
                
            ]
        },
        suppliers: {
            title: "Suppliers Database",
            tableTitle: "Verified Global Distribution Contractors",
            headers: ["Supplier ID", "Supplier Name",  "Company name","Supplier_address", "Supplier_phone_number"],
            rows: [
               
            ]
        },
        customers: {
            title: "Customer/User Database",
            tableTitle: "Registered User Accounts",
            headers: ["Customer ID", "Customer Name", "Customer Address", "Customer phone number","Customer Email"],
            rows: [
                
            ]
        }

    };

    // DOM UI Selection Points
    const pageTitle = document.getElementById("page-title");
    const tableTitle = document.getElementById("table-title");
    const tableHeaders = document.getElementById("table-headers");
    const tableBody = document.getElementById("table-body");
    const navItems = document.querySelectorAll(".nav-item");

    // Unified View Renderer Matrix Engine 
    function renderSection(sectionKey) {
        const data = dashboardData[sectionKey];
        
        // Update view header text parameters
        pageTitle.innerText = data.title;
        tableTitle.innerText = data.tableTitle;

        // Render target column headers
        tableHeaders.innerHTML = data.headers.map(header => `<th>${header}</th>`).join("");

        // Render body records matrix content rows 
        tableBody.innerHTML = data.rows.map(row => {
            let cells = row.map(cell => `<td>${cell}</td>`).join("");
            // Inject standard administrative interactive buttons to tracking tables
            cells += `<td><button class="action-btn" onclick="alert('Modifying entry logs safely...')">Manage</button></td>`;
            return `<tr>${cells}</tr>`;
        }).join("");
    }

    // Bind event controllers to sidebar links layout grid structure
    const routingMap = {
        "nav-staff": "staff",
        "nav-products": "products",
        "nav-category": "category",
        "nav-stock": "stock",
        "nav-out": "out",
        "nav-suppliers": "suppliers",
        "nav-customers": "customers" // Placeholder for future customer database integration
    };

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            const targetId = e.target.id;
            if (!routingMap[targetId]) return;

            // Shift navigation highlighting focus parameters safely
            navItems.forEach(nav => nav.classList.remove("active"));
            e.target.classList.add("active");

            // Build out view layouts smoothly
            renderSection(routingMap[targetId]);
        });
    });

    // Default Initialization Frame Load out Execution (Staff View)
    renderSection("staff");
});