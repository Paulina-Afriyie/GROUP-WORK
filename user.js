const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";

let booksData = [
    {
        id: 1,
        title: "Your Uploaded Book Cover",
        author: "Unknown Author",
        price: 25.00,
        category: "fiction",
        stock: 3,
        image: "images/dd.jpg"
    },
    {
        id: 2,
        title: "Clean Code",
        author: "Robert C. Martin",
        price: 34.99,
        category: "tech",
        stock: 5,
        image: "images/bb.jpg"
    },
    {
        id: 3,
        title: "Atomic Habits",
        author: "James Clear",
        price: 18.20,
        category: "self-help",
        stock: 2,
        image: "images/ss.jpg"
    },
    {
        id: 4,
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        price: 14.50,
        category: "fiction",
        stock: 0,
        image: "images/hh.jpg"
    },
    {
        id: 5,
        title: "Eloquent JavaScript",
        author: "Marijn Haverbeke",
        price: 28.99,
        category: "tech",
        stock: 6,
        image: "images/hh (2).jpg"
    },
    {
        id: 6,
        title: "Deep Work",
        author: "Cal Newport",
        price: 16.99,
        category: "self-help",
        stock: 1,
        image: "images/The Joys of Motherhood.jpg"
    }
];

let cart = [];
let activeCategory = "all";
let searchQuery = "";
const LOW_STOCK_THRESHOLD = 3;

document.addEventListener("DOMContentLoaded", () => {
    loadBooks();
    loadCart();
    updateCartUI();
    setupCartUI();
    setupFilters();
    renderPurchases();
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

    // ensure numeric stock property exists on fallback/sample entries
    booksData = booksData.map((b) => ({ stock: 0, ...b }));

    populateCategoryChips();
    renderBooks();
    // ensure any saved cart quantities don't exceed freshly loaded stock
    reconcileCartWithStock();
}

function reconcileCartWithStock() {
    if (!Array.isArray(cart) || !Array.isArray(booksData)) return;
    let changed = false;
    cart.forEach(item => {
        const bk = booksData.find(b => Number(b.id) === Number(item.id));
        if (bk) {
            const available = Number(bk.stock) || 0;
            if (item.quantity > available) {
                item.quantity = available;
                changed = true;
            }
        }
    });
    if (changed) saveCart();
    updateCartUI();
}

function renderBooks() {
    const booksGrid = document.getElementById("books-grid");
    booksGrid.innerHTML = "";

    const filteredBooks = booksData.filter((book) => {
        const query = (searchQuery || '').trim().toLowerCase();
        const matchesCategory = activeCategory === "all" || (book.category || '') === activeCategory;
        const matchesSearch =
            (book.title || '').toString().toLowerCase().includes(query) ||
            (book.author || '').toString().toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
    });

    if (filteredBooks.length === 0) {
        console.debug('renderBooks: no results', { searchQuery, activeCategory, totalBooks: booksData.length });
        booksGrid.innerHTML = "<p class='text-muted'>No books found matching your search.</p>";
        return;
    }

    filteredBooks.forEach((book) => {
        const card = document.createElement('div');
        card.className = 'book-card';

        const top = document.createElement('div');
        const cover = document.createElement('div');
        cover.className = 'book-cover';
        const img = document.createElement('img');
        img.className = 'book-img';
        img.src = book.image || '';
        img.alt = book.title || '';
        cover.appendChild(img);
        top.appendChild(cover);

        const h4 = document.createElement('h4');
        h4.className = 'book-title';
        h4.textContent = book.title || '';
        top.appendChild(h4);

        const pa = document.createElement('p');
        pa.className = 'book-author';
        pa.textContent = book.author || '';
        top.appendChild(pa);

        const footer = document.createElement('div');
        footer.className = 'book-footer';

        const left = document.createElement('div');
        const price = document.createElement('span');
        price.className = 'book-price';
        price.textContent = `$${(Number(book.price) || 0).toFixed(2)}`;
        left.appendChild(price);

        const stockDiv = document.createElement('div');
        stockDiv.className = 'book-stock';
        if (Number(book.stock) > 0) {
            stockDiv.textContent = `${Number(book.stock)} in stock`;
            if (Number(book.stock) <= LOW_STOCK_THRESHOLD) {
                const badge = document.createElement('span');
                badge.className = 'low-stock-badge';
                badge.textContent = 'Low stock';
                stockDiv.appendChild(document.createTextNode(' '));
                stockDiv.appendChild(badge);
            }
        } else {
            const strong = document.createElement('strong');
            strong.className = 'out-of-stock';
            strong.textContent = 'Out of stock';
            stockDiv.appendChild(strong);
        }
        left.appendChild(stockDiv);

        const addBtn = document.createElement('button');
        addBtn.className = 'add-to-cart';
        addBtn.type = 'button';
        addBtn.dataset.bookId = String(book.id);
        addBtn.textContent = 'Add +';
        if (Number(book.stock) <= 0) addBtn.disabled = true;

        footer.appendChild(left);
        footer.appendChild(addBtn);

        card.appendChild(top);
        card.appendChild(footer);

        if (Number(book.stock) > 0 && Number(book.stock) <= LOW_STOCK_THRESHOLD) card.classList.add('low-stock');
        addBtn.addEventListener('click', () => addToCart(book.id));
        booksGrid.appendChild(card);
    });
}

function setupFilters() {
    document.getElementById("search-input").addEventListener("input", (event) => {
        searchQuery = event.target.value;
        renderBooks();
    });

    // category chips are generated dynamically by populateCategoryChips()
}

function populateCategoryChips() {
    const container = document.getElementById('category-tags');
    if (!container) return;
    // normalize category keys once
    booksData = booksData.map(b => ({ ...b, category: (b.category || 'Uncategorized').toString().toLowerCase().replace(/\s+/g, '-') }));
    const categories = Array.from(new Set(booksData.map(b => b.category)));
    container.innerHTML = '';

    const makeChip = (key, label, isActive = false) => {
        const btn = document.createElement('button');
        btn.className = 'category-chip' + (isActive ? ' active' : '');
        btn.dataset.category = key;
        btn.type = 'button';
        btn.textContent = label;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach((c) => c.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = key;
            renderBooks();
        });
        return btn;
    };

    container.appendChild(makeChip('all', 'All Books', activeCategory === 'all'));
    categories.forEach((cat) => {
        const key = cat;
        const label = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ');
        container.appendChild(makeChip(key, label, activeCategory === key));
    });
}

function addToCart(id) {
    const targetBook = booksData.find((book) => Number(book.id) === Number(id));
    if (!targetBook) return;

    const existingItem = cart.find((item) => Number(item.id) === Number(id));

    const currentQty = existingItem ? existingItem.quantity : 0;
    if (targetBook.stock <= currentQty) {
        alert('Cannot add more — reached available stock.');
        return;
    }

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...targetBook, quantity: 1 });
    }

    updateCartUI();
}

function removeFromCart(id) {
    cart = cart.filter((item) => Number(item.id) !== Number(id));
    updateCartUI();
}

function changeQuantity(id, delta) {
    const book = booksData.find(b => Number(b.id) === Number(id));
    const item = cart.find(i => Number(i.id) === Number(id));
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        removeFromCart(id);
        return;
    }
    const available = book ? Number(book.stock) || 0 : 0;
    if (newQty > available) {
        alert('Cannot increase — exceeds available stock.');
        item.quantity = available;
    } else {
        item.quantity = newQty;
    }
    if (item.quantity <= 0) removeFromCart(id);
    else updateCartUI();
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

    container.innerHTML = '';
    let totalPrice = 0;

    cart.forEach((item) => {
        totalPrice += (Number(item.price) || 0) * (Number(item.quantity) || 0);

        const div = document.createElement('div');
        div.className = 'cart-item';

        const left = document.createElement('div');
        const title = document.createElement('h5');
        title.textContent = item.title || '';
        left.appendChild(title);
        const price = document.createElement('small');
        price.className = 'text-muted';
        price.textContent = `$${(Number(item.price) || 0).toFixed(2)}`;
        left.appendChild(price);

        const right = document.createElement('div');
        const qtyControl = document.createElement('div');
        qtyControl.className = 'qty-control';
        qtyControl.setAttribute('role', 'group');
        qtyControl.setAttribute('aria-label', 'Quantity controls');

        const dec = document.createElement('button');
        dec.className = 'qty-decrease';
        dec.dataset.id = String(item.id);
        dec.setAttribute('aria-label', 'Decrease quantity');
        dec.textContent = '-';
        dec.addEventListener('click', (e) => { e.preventDefault(); changeQuantity(item.id, -1); });

        const num = document.createElement('span');
        num.className = 'qty-number';
        num.textContent = String(item.quantity);

        const inc = document.createElement('button');
        inc.className = 'qty-increase';
        inc.dataset.id = String(item.id);
        inc.setAttribute('aria-label', 'Increase quantity');
        inc.textContent = '+';
        inc.addEventListener('click', (e) => { e.preventDefault(); changeQuantity(item.id, 1); });

        qtyControl.appendChild(dec);
        qtyControl.appendChild(num);
        qtyControl.appendChild(inc);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.type = 'button';
        closeBtn.style.fontSize = '1.15rem';
        closeBtn.innerText = '×';
        closeBtn.addEventListener('click', () => removeFromCart(item.id));

        right.appendChild(qtyControl);
        right.appendChild(closeBtn);

        div.appendChild(left);
        div.appendChild(right);
        container.appendChild(div);
    });

    totalSpan.innerText = totalPrice.toFixed(2);

    saveCart();
    updateAddButtons();
}

function saveCart() {
    try {
        localStorage.setItem('bookshop_cart', JSON.stringify(cart));
    } catch (e) {
        // ignore localStorage errors
    }
}

function loadCart() {
    try {
        const raw = localStorage.getItem('bookshop_cart');
        if (raw) cart = JSON.parse(raw);
    } catch (e) {
        cart = [];
    }
}

function updateAddButtons() {
    document.querySelectorAll('.add-to-cart').forEach((btn) => {
        const id = Number(btn.dataset.bookId);
        const book = booksData.find(b => Number(b.id) === id);
        if (!book) return;
        const inCart = cart.find(i => Number(i.id) === id);
        const qty = inCart ? inCart.quantity : 0;
        if (book.stock <= qty) btn.disabled = true;
        else btn.disabled = false;
    });
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

        (async () => {
            // prepare sale payload
            const totalPrice = cart.reduce((s, it) => s + it.price * it.quantity, 0);
            try {
                const saleRes = await fetch(`${API_BASE}/api/admin/sales`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sales_total_amount: totalPrice })
                });

                if (!saleRes.ok) throw new Error('Could not create sale');
                const saleJson = await saleRes.json();
                const sales_ID = saleJson.sales_ID;

                // post sales details
                const detailResponses = await Promise.all(cart.map(item => fetch(`${API_BASE}/api/admin/salesDetails`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sales_ID,
                        product_ID: item.id,
                        sales_details_quantity: item.quantity,
                        sales_details_price: item.price
                    })
                })));
                // ensure all detail posts succeeded
                for (const r of detailResponses) {
                    if (!r.ok) throw new Error('Failed to save sales detail');
                }

                // update local stocks and save purchase history
                cart.forEach(ci => {
                    const bk = booksData.find(b => Number(b.id) === Number(ci.id));
                    if (bk) bk.stock = Math.max(0, (Number(bk.stock) || 0) - Number(ci.quantity));
                });

                const purchases = loadPurchases();
                purchases.unshift({ id: sales_ID || Date.now(), date: new Date().toISOString(), items: cart.map(i => ({ id: i.id, title: i.title, qty: i.quantity, price: i.price })), total: totalPrice });
                savePurchases(purchases);
                renderPurchases();

                cart = [];
                updateCartUI();
                renderBooks();
                closeCart();
                alert('Checkout complete. Thank you for your purchase.');
            } catch (e) {
                console.error('checkout error', e);
                alert('Checkout failed. Try again later.');
            }
        })();
    });
}

function savePurchases(list) {
    try { localStorage.setItem('bookshop_purchases', JSON.stringify(list)); } catch (e) {}
}

function loadPurchases() {
    try { const raw = localStorage.getItem('bookshop_purchases'); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
}

function renderPurchases() {
    const container = document.getElementById('purchases-list');
    if (!container) return;
    const list = loadPurchases();
    if (!list.length) {
        container.innerHTML = '<p class="text-muted">No purchases yet.</p>';
        return;
    }
    container.innerHTML = '';
    list.forEach(p => {
        const wrap = document.createElement('div');
        wrap.className = 'purchase';
        wrap.innerHTML = `<div class="purchase-meta"><strong>Order #${p.id}</strong> <small class="text-muted">${new Date(p.date).toLocaleString()}</small></div>`;
        const ul = document.createElement('ul');
        p.items.forEach(it => {
            const li = document.createElement('li');
            li.textContent = `${it.title} — ${it.qty} × $${it.price.toFixed(2)}`;
            ul.appendChild(li);
        });
        wrap.appendChild(ul);
        wrap.insertAdjacentHTML('beforeend', `<div class="purchase-total">Total: $${p.total.toFixed(2)}</div>`);
        container.appendChild(wrap);
    });
}
