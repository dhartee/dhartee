document.addEventListener('DOMContentLoaded', () => {
    // Check if the required library is loaded
    if (typeof XLSX === 'undefined') {
        console.error('SheetJS library (xlsx.full.min.js) is not loaded. Imports will not work.');
        return;
    }

    // --- Get DOM Elements ---
    const importBuyerBtn = document.getElementById('importBuyerBtn');
    const buyerFile = document.getElementById('buyerFile');
    const importSellerBtn = document.getElementById('importSellerBtn');
    const sellerFile = document.getElementById('sellerFile');
    const importInvoiceBtn = document.getElementById('importInvoiceBtn');
    const invoiceFile = document.getElementById('invoiceFile');

    // --- NEW: Template Download Links ---
    const downloadBuyerTemplate = document.getElementById('downloadBuyerTemplate');
    const downloadSellerTemplate = document.getElementById('downloadSellerTemplate');
    const downloadInvoiceTemplate = document.getElementById('downloadInvoiceTemplate');


    // --- Add Event Listeners ---
    importBuyerBtn.addEventListener('click', () => {
        handleImport(buyerFile, processBuyerData, 'Buyer');
    });

    importSellerBtn.addEventListener('click', () => {
        handleImport(sellerFile, processSellerData, 'Seller');
    });

    importInvoiceBtn.addEventListener('click', () => {
        handleImport(invoiceFile, processInvoiceData, 'Invoice');
    });

    // --- NEW: Template Download Event Listeners (Updated) ---
    downloadBuyerTemplate.addEventListener('click', (e) => {
        e.preventDefault();
        generateTemplate(
            'Buyer_Template.xlsx',
            buyerTemplateHeaders,
            buyerDummyData,
            buyerInstructions
        );
    });

    downloadSellerTemplate.addEventListener('click', (e) => {
        e.preventDefault();
        generateTemplate(
            'Seller_Template.xlsx',
            sellerTemplateHeaders,
            sellerDummyData,
            sellerInstructions
        );
    });

    downloadInvoiceTemplate.addEventListener('click', (e) => {
        e.preventDefault();
        generateTemplate(
            'Invoice_Template.xlsx',
            invoiceTemplateHeaders,
            invoiceDummyData,
            invoiceInstructions
        );
    });


    // --- Generic Import Handler ---
    function handleImport(fileInput, processorFunction, importType) {
        const file = fileInput.files[0];
        if (!file) {
            alert(`Please select a ${importType} file to import.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                // Read the file, cellDates: true attempts to parse dates
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                
                // Convert sheet to JSON
                // We use raw: false so dates are formatted (if possible)
                // Note: For best results, dates in Excel should be TEXT 'YYYY-MM-DD'
                const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false });

                if (jsonData.length === 0) {
                    alert('The selected file is empty or in the wrong format.');
                    return;
                }
                
                // Process the data using the specific function
                processorFunction(jsonData);
                
            } catch (error) {
                console.error('Error processing file:', error);
                alert(`There was an error processing the file. Make sure it is a valid .xlsx or .csv file.\n\nError: ${error.message}`);
            }
        };

        reader.onerror = () => {
             alert('Error reading the file.');
        };

        reader.readAsBinaryString(file);
    }

    // --- Specific Data Processors ---

    function processBuyerData(data) {
        let importedCount = 0;
        let errorCount = 0;
        
        data.forEach((row, index) => {
            try {
                // We don't need to map, we just pass the row.
                // saveEntity expects an object with keys matching form IDs.
                // This assumes Excel headers *exactly* match the form IDs.
                if (!row.buyerName) {
                    throw new Error(`Row ${index + 2} is missing a buyerName.`);
                }

                // Convert "TRUE"/"FALSE" strings from Excel to booleans
                row.purposeManufacturing = String(row.purposeManufacturing).toUpperCase() === 'TRUE';
                row.purposePower = String(row.purposePower).toUpperCase() === 'TRUE';

                saveEntity('buyer', row); // Call the function from script.js
                importedCount++;
            } catch (error) {
                console.error(`Error importing buyer row ${index + 2}:`, error.message);
                errorCount++;
            }
        });
        
        // --- NEW: Populate form with the first imported item ---
        if (importedCount > 0) {
            window.populateForm(data[0]); // This fills the input boxes
        }
        
        alert(`Buyer Import Complete:\n- ${importedCount} buyers imported successfully.\n- ${errorCount} rows failed.`);
        
        // We must call loadData() from script.js to refresh the dropdowns
        loadData();
    }

    function processSellerData(data) {
        let importedCount = 0;
        let errorCount = 0;
        
        data.forEach((row, index) => {
            try {
                if (!row.sellerName) {
                    throw new Error(`Row ${index + 2} is missing a sellerName.`);
                }
                saveEntity('seller', row); // Call the function from script.js
                importedCount++;
            } catch (error) {
                console.error(`Error importing seller row ${index + 2}:`, error.message);
                errorCount++;
            }
        });
        
        // --- NEW: Populate form with the first imported item ---
        if (importedCount > 0) {
            window.populateForm(data[0]); // This fills the input boxes
        }
        
        alert(`Seller Import Complete:\n- ${importedCount} sellers imported successfully.\n- ${errorCount} rows failed.`);
        
        // We must call loadData() from script.js to refresh the dropdowns
        loadData();
    }

    function processInvoiceData(data) {
        try {
            // Map the JSON data to the `invoices` array structure
            const importedInvoices = data.map((row, index) => {
                if (!row.billNo || !row.date || !row.amount) {
                    throw new Error(`Row ${index + 2} is missing data (billNo, date, or amount).`);
                }
                return {
                    billNo: row.billNo,
                    date: row.date, // Assumes date is in YYYY-MM-DD format
                    amount: row.amount
                };
            });

            // Overwrite the global 'invoices' array from script.js
            // This is a bit of a hack, but it's the simplest way to link the files.
            // We must declare 'invoices' in script.js as `let invoices = [];` not `const`.
            window.invoices = importedInvoices;
            
            // Call functions from script.js to update the UI
            renderInvoiceTable(); // Updates the modal
            renderAnnexure(window.invoices); // Updates the printed annexure

            alert(`Invoice Import Complete:\n- ${importedInvoices.length} invoices imported successfully.`);

        } catch (error) {
            console.error('Error importing invoices:', error.message);
            alert(`Error importing invoices: ${error.message}`);
        }
    }

    // --- Template Generation Logic (HEAVILY MODIFIED) ---

    // --- Headers ---
    const buyerTemplateHeaders = [
        'buyerName', 'buyerPan', 'buyerFlat', 'buyerPremises', 'buyerStatus',
        'buyerRoad', 'buyerArea', 'buyerWard', 'buyerAoArea', 'buyerAoType',
        'buyerAoRange', 'buyerAoNo', 'buyerCity', 'buyerState', 'buyerPin',
        'buyerEmail', 'buyerPhone', 'buyerBusinessNature', 'purposeManufacturing',
        'purposePower', 'goodsNature', 'declarantName', 'declarationPlace', 'declarationDate'
    ];

    const sellerTemplateHeaders = [
        'sellerName', 'sellerPan', 'sellerAddress', 'sellerTan', 'sellerEmail',
        'sellerPhone', 'sellerStatus', 'furnishDate', 'debitDate', 'forwardPlace',
        'forwardDate'
    ];

    const invoiceTemplateHeaders = [
        'billNo', 'date', 'amount'
    ];

    // --- Dummy Data Rows ---
    const buyerDummyData = {
        buyerName: "ABC Timbers Pvt. Ltd.",
        buyerPan: "AAACB1234E",
        buyerFlat: "Unit 10",
        buyerPremises: "Industrial Complex",
        buyerStatus: 1,
        buyerRoad: "Main Road",
        buyerArea: "MIDC Area",
        buyerWard: "Ward 5",
        buyerAoArea: "MUM",
        buyerAoType: "W",
        buyerAoRange: "10",
        buyerAoNo: "5",
        buyerCity: "Mumbai",
        buyerState: "Maharashtra",
        buyerPin: "400001",
        buyerEmail: "contact@abctimbers.com",
        buyerPhone: "9876543210",
        buyerBusinessNature: "Timber Manufacturing",
        purposeManufacturing: "TRUE",
        purposePower: "FALSE",
        goodsNature: "Timber Logs",
        declarantName: "Mr. Suresh Gupta",
        declarationPlace: "Mumbai",
        declarationDate: "2025-10-28"
    };

    const sellerDummyData = {
        sellerName: "XYZ Trading Co.",
        sellerPan: "AAAFX5678K",
        sellerAddress: "123, Market Street, Delhi",
        sellerTan: "DELX12345A",
        sellerEmail: "sales@xyztrading.com",
        sellerPhone: "9012345678",
        sellerStatus: 2,
        furnishDate: "2025-10-28",
        debitDate: "2025-10-28",
        forwardPlace: "Delhi",
        forwardDate: "2025-10-29"
    };

    const invoiceDummyData = {
        billNo: "INV-1001",
        date: "2025-10-25",
        amount: "150000"
    };

    // --- Instruction Texts ---
    const buyerInstructions = `
Instructions for Buyer Template:

1.  This file must have two sheets: 'Data' and 'Instructions'. Do not change the sheet names.
2.  The 'Data' sheet must have the exact headers as provided in Row 1. Do not change them.
3.  Fill your buyer data starting from Row 2.
4.  'buyerStatus' must be a number from 1 to 6 (1=Company, 2=Firm, 3=AOP/BOI, 4=HUF, 5=Individual, 6=Others).
5.  'purposeManufacturing' and 'purposePower' must be written as TRUE or FALSE.
6.  All dates ('declarationDate') must be in YYYY-MM-DD format (e.g., 2025-10-28).
`;

    const sellerInstructions = `
Instructions for Seller Template:

1.  This file must have two sheets: 'Data' and 'Instructions'. Do not change the sheet names.
2.  The 'Data' sheet must have the exact headers as provided in Row 1. Do not change them.
3.  Fill your seller data starting from Row 2.
4.  'sellerStatus' must be a number from 1 to 6 (1=Company, 2=Firm, 3=AOP/BOI, 4=HUF, 5=Individual, 6=Others).
5.  All dates ('furnishDate', 'debitDate', 'forwardDate') must be in YYYY-MM-DD format (e.g., 2025-10-28).
`;

    const invoiceInstructions = `
Instructions for Invoice Template:

1.  This file must have two sheets: 'Data' and 'Instructions'. Do not change the sheet names.
2.  The 'Data' sheet must have the exact headers as provided in Row 1. Do not change them.
3.  Fill your invoice data starting from Row 2. You can add multiple rows for multiple invoices.
4.  'date' must be in YYYY-MM-DD format (e.g., 2025-10-25).
5.  'amount' should be a number without commas or currency symbols.
`;

    // --- Updated Template Generator Function ---
    function generateTemplate(fileName, headers, dummyData, instructionsText) {
        // --- Create Sheet 1: Data ---
        // Convert dummy data object to an array in the correct header order
        const dummyDataArray = headers.map(header => dummyData[header]);
        
        // Create data for the sheet: [headers, dummy_data]
        const dataSheetData = [headers, dummyDataArray];
        
        const wsData = XLSX.utils.aoa_to_sheet(dataSheetData);
        
        // Set column widths for data sheet (optional, but helpful)
        wsData['!cols'] = headers.map(h => ({ wch: h.length + 5 > 20 ? h.length + 5 : 20 }));


        // --- Create Sheet 2: Instructions ---
        // Split instructions text into lines and map to array-of-arrays format
        const instructionLines = instructionsText.trim().split('\n').map(line => [line.trim()]);
        
        const wsInstructions = XLSX.utils.aoa_to_sheet(instructionLines);
        
        // Set column width for instruction sheet
        wsInstructions['!cols'] = [{ wch: 80 }]; // 80 characters wide

        
        // --- Create Workbook and Add Sheets ---
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsData, 'Data'); // Sheet 1
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions'); // Sheet 2
        
        // Write the workbook and trigger a download
        XLSX.writeFile(wb, fileName);
    }
});
