const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileNameLabel = document.getElementById('file-name');
const convertBtn = document.getElementById('convert-btn');
const status = document.getElementById('status');
const themeToggle = document.getElementById('theme-toggle');

let selectedFile = null;

// --- 1. DARK MODE LOGIC ---
themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.body.removeAttribute('data-theme');
        themeToggle.innerText = '🌓';
    } else {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerText = '☀️';
    }
});

// --- 2. FILE SELECTION ---
dropZone.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    handleFile(e.target.files[0]);
};

function handleFile(file) {
    if (file && file.name.endsWith('.docx')) {
        selectedFile = file;
        fileNameLabel.innerHTML = `Selected: <b>${file.name}</b>`;
        convertBtn.disabled = false;
        status.innerText = "";
    } else {
        alert("Please upload a valid .docx file");
    }
}

// --- 3. CONVERSION LOGIC ---
convertBtn.onclick = async () => {
    if (!selectedFile) return;

    convertBtn.disabled = true;
    convertBtn.innerText = "Processing...";
    status.innerText = "Reading document...";

    const reader = new FileReader();
    reader.onload = async (event) => {
        const arrayBuffer = event.target.result;

        // Convert DOCX to HTML
        mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
            .then(function(result) {
                const htmlContent = result.value;
                const container = document.getElementById('preview-container');
                container.innerHTML = htmlContent;

                status.innerText = "Generating PDF...";
                
                // Convert HTML to PDF
                const opt = {
                    margin: 1,
                    filename: selectedFile.name.replace('.docx', '.pdf'),
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                };

                html2pdf().set(opt).from(container).save().then(() => {
                    status.innerText = "✅ Conversion Successful!";
                    convertBtn.disabled = false;
                    convertBtn.innerText = "Convert to PDF";
                });
            })
            .catch(err => {
                console.error(err);
                status.innerText = "❌ Error during conversion.";
            });
    };
    reader.readAsArrayBuffer(selectedFile);
};