const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";

document.addEventListener("DOMContentLoaded", () => {
    const dashboardData = {
        staff: {
            title: "Staff Management",
            tableTitle: "Active Personnel Registry",
            headers: ["Staff ID", "Staff Name", "Staff Username", "Staff Role"],
            endpoint: "staff",
            fields: [
                { name: "staff_name", label: "Staff Name", type: "text", required: true },
                { name: "staff_username", label: "Staff Email / Username", type: "email", required: true },
                { name: "staff_role", label: "Staff Role", type: "text", required: true },
                { name: "staff_password", label: "Password", type: "password", required: true }
            ]
        },
        products: {
            title: "Products",
            tableTitle: "Book Product Registry",
            headers: ["Product ID", "Product Name", "Author", "Price", "Quantity", "Supplier ID", "Category ID", "Image"],
            endpoint: "products",
            fields: [
                { name: "product_name", label: "Product Name", type: "text", required: true },
                { name: "product_author", label: "Author", type: "text" },
                { name: "product_price", label: "Price", type: "number", step: "0.01", required: true },
                { name: "product_quantity_in_stock", label: "Quantity In Stock", type: "number", required: true },
                { name: "supplier_ID", label: "Supplier ID", type: "number" },
                { name: "category_ID", label: "Category ID", type: "number" },
                { name: "product_image", label: "Image Path", type: "text", placeholder: "images/book.jpg" }
            ]
        },
        category: {
            title: "Category",
            tableTitle: "Book Categories",
            headers: ["Category ID", "Category Name"],
            endpoint: "category",
            fields: [
                { name: "category_name", label: "Category Name", type: "text", required: true },
                { name: "category_id", label: "Category ID", type: "text", required: true }
            ]
        },
        stock: {
            title: "Products In Stock",
            tableTitle: "Available Book Inventory",
            headers: ["Product ID", "Book Title", "Author", "Quantity Left", "Unit Price"],
            endpoint: "stock",
            fields: []
        },
        out: {
            title: "Out of Stock Products",
            tableTitle: "Out of Stock Books",
            headers: ["Product ID", "Book Title", "Supplier ID", "Status"],
            endpoint: "out",
            fields: []
        },
        suppliers: {
            title: "Suppliers Database",
            tableTitle: "Verified Suppliers",
            headers: ["Supplier ID", "Supplier Name", "Address", "Phone Number"],
            endpoint: "suppliers",
            fields: [
                { name: "supplier_name", label: "Supplier Name", type: "text", required: true },
                { name: "supplier_address", label: "Address", type: "text" },
                { name: "supplier_phone_number", label: "Phone Number", type: "tel" }
            ]
        },
        customers: {
            title: "Customer/User Database",
            tableTitle: "Registered Customers",
            headers: ["Customer ID", "Customer Name", "Address", "Phone Number", "Email"],
            endpoint: "customers",
            fields: [
                { name: "customer_name", label: "Customer Name", type: "text", required: true },
                { name: "customer_address", label: "Address", type: "text" },
                { name: "customer_phone_number", label: "Phone Number", type: "tel" },
                { name: "customer_email", label: "Email", type: "email", required: true }
            ]
        },
        sales: {
            title: "Sales",
            tableTitle: "Sales Records",
            headers: ["Sales ID", "Sales Date", "Total Amount", "Staff ID", "Customer ID"],
            endpoint: "sales",
            fields: [
                { name: "sales_date", label: "Sales Date", type: "datetime-local" },
                { name: "sales_total_amount", label: "Total Amount", type: "number", step: "0.01", required: true },
                { name: "staff_ID", label: "Staff ID", type: "number" },
                { name: "customer_ID", label: "Customer ID", type: "number" }
            ]
        },
        salesDetails: {
            title: "Sales Details",
            tableTitle: "Sale Line Items",
            headers: ["Sales Details ID", "Sales ID", "Product ID", "Quantity", "Price"],
            endpoint: "salesDetails",
            fields: [
                { name: "sales_ID", label: "Sales ID", type: "number", required: true },
                { name: "product_ID", label: "Product ID", type: "number", required: true },
                { name: "sales_details_quantity", label: "Quantity", type: "number", required: true },
                { name: "sales_details_price", label: "Price", type: "number", step: "0.01", required: true }
            ]
        }
    };

    const pageTitle = document.getElementById("page-title");
    const tableTitle = document.getElementById("table-title");
    const tableHeaders = document.getElementById("table-headers");
    const tableBody = document.getElementById("table-body");
    const navItems = document.querySelectorAll(".nav-item[data-section]");
    const form = document.getElementById("record-form");
    const toggleFormBtn = document.getElementById("toggle-form-btn");

    let activeSection = "staff";

    function formatCell(value) {
        if (value === null || value === undefined || value === "") return "-";
        return value;
    }

    function buildForm(sectionKey) {
        const data = dashboardData[sectionKey];
        form.innerHTML = "";

        if (!data.fields.length) {
            form.classList.add("hidden");
            toggleFormBtn.classList.add("hidden");
            return;
        }

        toggleFormBtn.classList.remove("hidden");

        const fields = data.fields.map((field) => `
            <label class="record-field">
                <span>${field.label}</span>
                <input
                    type="${field.type}"
                    name="${field.name}"
                    ${field.step ? `step="${field.step}"` : ""}
                    ${field.placeholder ? `placeholder="${field.placeholder}"` : ""}
                    ${field.required ? "required" : ""}
                >
            </label>
        `).join("");

        form.innerHTML = `
            <div class="record-form-grid">${fields}</div>
            <div class="record-form-actions">
                <button class="secondary-action-btn" type="button" id="cancel-form-btn">Cancel</button>
                <button class="primary-action-btn" type="submit">Save Record</button>
            </div>
        `;

        document.getElementById("cancel-form-btn").addEventListener("click", () => {
            form.reset();
            form.classList.add("hidden");
        });
    }

    async function loadSection(sectionKey) {
        const data = dashboardData[sectionKey];
        if (!data) return;

        activeSection = sectionKey;
        pageTitle.innerText = data.title;
        tableTitle.innerText = data.tableTitle;
        tableHeaders.innerHTML = data.headers.map((header) => `<th>${header}</th>`).join("");
        tableBody.innerHTML = `<tr><td colspan="${data.headers.length}">Loading records...</td></tr>`;
        buildForm(sectionKey);

        try {
            const response = await fetch(`${API_BASE}/api/admin/${data.endpoint}`);
            const rows = await response.json();

            if (!response.ok) {
                throw new Error(rows.message || "Could not load records.");
            }

            if (rows.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="${data.headers.length}">No records found.</td></tr>`;
                return;
            }

            tableBody.innerHTML = rows.map((row) => {
                const cells = Object.values(row).map((cell) => `<td>${formatCell(cell)}</td>`).join("");
                return `<tr>${cells}</tr>`;
            }).join("");
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="${data.headers.length}">${error.message}</td></tr>`;
        }
    }

    toggleFormBtn.addEventListener("click", () => {
        form.classList.toggle("hidden");
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = dashboardData[activeSection];
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`${API_BASE}/api/admin/${data.endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || "Could not save record.");
                return;
            }

            form.reset();
            form.classList.add("hidden");
            await loadSection(activeSection);
        } catch (error) {
            alert("Could not save record. Check that the backend server is running.");
        }
    });

    navItems.forEach((item) => {
        item.addEventListener("click", () => {
            navItems.forEach((nav) => nav.classList.remove("active"));
            item.classList.add("active");
            loadSection(item.dataset.section);
        });
    });

    loadSection(activeSection);
});
