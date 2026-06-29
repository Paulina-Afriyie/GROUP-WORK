document.addEventListener("DOMContentLoaded", () => {
    const dashboardData = {
        staff: {
            title: "Staff Management",
            tableTitle: "Active Personnel Registry",
            headers: ["Staff ID", "Staff Name", "Staff Username", "Staff Role", "Actions"],
            rows: []
        },
        products: {
            title: "Products",
            tableTitle: "Book Product Registry",
            headers: ["Product ID", "Product Name", "Product Price", "Supplier ID", "Category ID", "Actions"],
            rows: []
        },
        category: {
            title: "Category",
            tableTitle: "Book Categories",
            headers: ["Category ID", "Category Name", "Actions"],
            rows: []
        },
        stock: {
            title: "Products In Stock",
            tableTitle: "Available Book Inventory",
            headers: ["SKU Code", "Book Title", "Category", "Quantity Left", "Unit Price", "Actions"],
            rows: []
        },
        out: {
            title: "Out of Stock Products",
            tableTitle: "Out of Stock Books",
            headers: ["SKU Code", "Book Title", "Last Supplier ID", "Status", "Actions"],
            rows: []
        },
        suppliers: {
            title: "Suppliers Database",
            tableTitle: "Verified Suppliers",
            headers: ["Supplier ID", "Supplier Name", "Company Name", "Address", "Phone Number", "Actions"],
            rows: []
        },
        customers: {
            title: "Customer/User Database",
            tableTitle: "Registered User Accounts",
            headers: ["Customer ID", "Customer Name", "Address", "Phone Number", "Email", "Actions"],
            rows: []
        }
    };

    const pageTitle = document.getElementById("page-title");
    const tableTitle = document.getElementById("table-title");
    const tableHeaders = document.getElementById("table-headers");
    const tableBody = document.getElementById("table-body");
    const navItems = document.querySelectorAll(".nav-item[data-section]");

    function renderSection(sectionKey) {
        const data = dashboardData[sectionKey];
        if (!data) return;

        pageTitle.innerText = data.title;
        tableTitle.innerText = data.tableTitle;
        tableHeaders.innerHTML = data.headers.map((header) => `<th>${header}</th>`).join("");

        if (data.rows.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${data.headers.length}">No records found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = data.rows.map((row) => {
            const cells = row.map((cell) => `<td>${cell}</td>`).join("");
            return `<tr>${cells}<td><button class="action-btn" type="button">Manage</button></td></tr>`;
        }).join("");
    }

    navItems.forEach((item) => {
        item.addEventListener("click", () => {
            navItems.forEach((nav) => nav.classList.remove("active"));
            item.classList.add("active");
            renderSection(item.dataset.section);
        });
    });

    renderSection("staff");
});
