document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("saveDataBtn");
    const viewBtn = document.getElementById("viewDataBtn");

    saveBtn.addEventListener("click", () => {
        const buyer = JSON.parse(localStorage.getItem("buyers")) || [];
        const seller = JSON.parse(localStorage.getItem("sellers")) || [];
        const invoices = window.invoices || [];

        const currentSeller = document.getElementById("sellerName").value || "Unknown Seller";
        const date = new Date();
        const formattedDate = date.toISOString().split("T")[0];
        const month = date.toLocaleString("default", { month: "long" });

        const record = {
            id: Date.now(),
            seller: currentSeller,
            date: formattedDate,
            month: month,
            buyer,
            sellerData: seller,
            invoices,
        };

        const savedRecords = JSON.parse(localStorage.getItem("form27c_records")) || [];
        savedRecords.push(record);
        localStorage.setItem("form27c_records", JSON.stringify(savedRecords));

        alert("Form data saved successfully for " + currentSeller);
    });

    viewBtn.addEventListener("click", () => {
        const records = JSON.parse(localStorage.getItem("form27c_records")) || [];
        if (records.length === 0) {
            alert("No saved records found.");
            return;
        }

        const modal = document.createElement("div");
        modal.id = "viewModal";
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Saved Records</h2>
                    <button id="closeViewModal">&times;</button>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Seller</th>
                            <th>Date</th>
                            <th>Month</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records
                            .map(
                                (r, i) => `
                            <tr>
                                <td>${r.seller}</td>
                                <td>${r.date}</td>
                                <td>${r.month}</td>
                                <td><button class="loadRecordBtn" data-index="${i}">Load</button></td>
                            </tr>`
                            )
                            .join("")}
                    </tbody>
                </table>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById("closeViewModal").onclick = () => modal.remove();

        document.querySelectorAll(".loadRecordBtn").forEach(btn => {
            btn.addEventListener("click", e => {
                const index = e.target.dataset.index;
                const record = records[index];
                if (!record) return alert("Record not found.");

                if (record.buyer && record.buyer.length > 0) {
                    localStorage.setItem("buyers", JSON.stringify(record.buyer));
                }
                if (record.sellerData && record.sellerData.length > 0) {
                    localStorage.setItem("sellers", JSON.stringify(record.sellerData));
                }
                if (record.invoices && record.invoices.length > 0) {
                    window.invoices = record.invoices;
                    window.renderInvoiceTable();
                    window.renderAnnexure(record.invoices);
                }

                window.loadData();
                modal.remove();
                alert("Record loaded for seller: " + record.seller);
            });
        });
    });
});
