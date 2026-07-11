const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileNameLabel = document.getElementById('file-name');
const actionBtn = document.getElementById('action-btn');
const statusMsg = document.getElementById('status');
const modeSlider = document.getElementById('mode-slider');

// UI Elements
const appLogo = document.getElementById('app-logo');
const heroTitle = document.getElementById('hero-title');
const heroSubtitle = document.getElementById('hero-subtitle');
const uploadIcon = document.getElementById('upload-icon');

let selectedFile = null;
let currentMode = 'convert';

// --- 1. SLIDER TOGGLE LOGIC ---
modeSlider.addEventListener('change', () => {
    selectedFile = null;
    actionBtn.disabled = true;
    statusMsg.innerText = "";
    fileInput.value = "";

    if (modeSlider.checked) {
        // Switch to Convertiny (Compress)
        currentMode = 'compress';
        appLogo.innerHTML = 'Convertiny<span>.</span>';
        heroTitle.innerHTML = 'Compress your files <span class="text-gradient">Compactly.</span>';
        heroSubtitle.innerText = 'Shrink PDF and DOCX files without losing quality.';
        fileInput.accept = '.docx, .pdf';
        fileNameLabel.innerHTML = 'Drag & drop your <b>.docx</b> or <b>.pdf</b> file here';
        actionBtn.innerText = 'Compress File';
        uploadIcon.innerText = '🗜️';
    } else {
        // Switch to Convertly (Convert)
        currentMode = 'convert';
        appLogo.innerHTML = 'Convertly<span>.</span>';
        heroTitle.innerHTML = 'Convert your docx <span class="text-gradient">Swiftly.</span>';
        heroSubtitle.innerText = 'Simple, Fast, and Secure. High-quality PDF conversion.';
        fileInput.accept = '.docx';
        fileNameLabel.innerHTML = 'Drag & drop your <b>.docx</b> file here';
        actionBtn.innerText = 'Convert to PDF';
        uploadIcon.innerText = '📄';
    }
});

// --- 2. FILE SELECTION ---
dropZone.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    handleFile(e.target.files[0]);
};

function handleFile(file) {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    let isValid = false;

    // Focused only on DOCX for Convertly
    if (currentMode === 'convert' && ext === 'docx') isValid = true;
    if (currentMode === 'compress' && (ext === 'docx' || ext === 'pdf')) isValid = true;

    if (isValid) {
        selectedFile = file;
        fileNameLabel.innerHTML = `Selected: <b>${file.name}</b>`;
        actionBtn.disabled = false;
        statusMsg.innerText = "";
    } else {
        const allowed = currentMode === 'convert' ? '.docx' : '.docx or .pdf';
        alert(`Please upload a valid ${allowed} file.`);
        fileInput.value = '';
    }
}

// --- 3. ACTION LOGIC ---
actionBtn.onclick = async () => {
    if (!selectedFile) return;

    actionBtn.disabled = true;
    actionBtn.innerText = "Processing...";
    
    if (currentMode === 'convert') {
        processConversion();
    } else {
        processCompression();
    }
};

function processConversion() {
    statusMsg.innerText = "Reading document...";
    const reader = new FileReader();
    reader.onload = async (event) => {
        const arrayBuffer = event.target.result;

        mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
            .then(function(result) {
                const container = document.getElementById('preview-container');
                container.innerHTML = result.value;

                statusMsg.innerText = "Generating PDF...";
                
                const opt = {
                    margin: 0.5,
                    filename: selectedFile.name.replace('.docx', '.pdf'),
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                };

                html2pdf().set(opt).from(container).save().then(() => {
                    statusMsg.innerText = "✅ Conversion Successful!";
                    actionBtn.disabled = false;
                    actionBtn.innerText = "Convert to PDF";
                });
            })
            .catch(err => {
                console.error(err);
                statusMsg.innerText = "❌ Error during conversion.";
                actionBtn.disabled = false;
            });
    };
    reader.readAsArrayBuffer(selectedFile);
}

function processCompression() {
    statusMsg.innerText = "Compressing... (Mockup)";
    setTimeout(() => {
        statusMsg.innerText = "✅ Done! (Backend required for real compression)";
        actionBtn.disabled = false;
        actionBtn.innerText = "Compress File";
    }, 1500);
}