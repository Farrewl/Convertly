/* =========================================================
   CONVERTLY — CORE APP ENGINE
   Handles navigation, dashboard rendering, generic file
   upload / options / result UI, and shared utilities.
   Tool definitions & conversion logic live in tools.js —
   that's the only file you need to touch to add a new tool.
   ========================================================= */

/* ---------- DOM REFERENCES ---------- */
const appLogo = document.getElementById('app-logo');
const dashboardView = document.getElementById('dashboard-view');
const toolView = document.getElementById('tool-view');
const searchInput = document.getElementById('tool-search');
const categoriesContainer = document.getElementById('dashboard-categories');

const backBtn = document.getElementById('back-btn');
const toolIconEl = document.getElementById('tool-icon');
const toolTitleEl = document.getElementById('tool-title');
const toolDescEl = document.getElementById('tool-desc');

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadIconEl = document.getElementById('upload-icon');
const dropLabelEl = document.getElementById('drop-label');
const fileListEl = document.getElementById('file-list');
const optionsEl = document.getElementById('tool-options');
const actionBtn = document.getElementById('action-btn');
const progressWrapEl = document.getElementById('progress-wrap');
const progressBarEl = document.getElementById('progress-bar');
const statusMsgEl = document.getElementById('status');
const resultPanelEl = document.getElementById('result-panel');
const toastContainer = document.getElementById('toast-container');

/* ---------- STATE ---------- */
let currentTool = null;
let selectedFiles = [];
let currentView = 'dashboard';

const CATEGORY_META = {
    convert: { title: 'Convert', icon: '🔄', description: 'Turn files into the format you actually need.' },
    compress: { title: 'Compress', icon: '🗜️', description: 'Shrink file size without losing what matters.' },
    organize: { title: 'Organize', icon: '🗂️', description: 'Merge, split, and tidy up your documents.' }
};

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', init);

function init() {
    renderDashboard();
    wireGlobalEvents();
}

function wireGlobalEvents() {
    appLogo.addEventListener('click', () => { if (currentView !== 'dashboard') switchView('dashboard'); });
    backBtn.addEventListener('click', () => switchView('dashboard'));
    searchInput.addEventListener('input', handleSearch);

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(Array.from(e.target.files)));

    ['dragenter', 'dragover'].forEach((evt) => dropZone.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!dropZone.classList.contains('is-disabled')) dropZone.classList.add('drag-over');
    }));
    ['dragleave', 'drop'].forEach((evt) => dropZone.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropZone.classList.remove('drag-over');
    }));
    dropZone.addEventListener('drop', (e) => {
        if (dropZone.classList.contains('is-disabled')) return;
        handleFiles(Array.from(e.dataTransfer.files));
    });

    actionBtn.addEventListener('click', runCurrentTool);
}

/* ---------- DASHBOARD RENDERING ---------- */
function renderDashboard() {
    categoriesContainer.innerHTML = '';
    let cardIndex = 0;

    Object.keys(CATEGORY_META).forEach((catKey) => {
        const toolsInCat = TOOLS.filter(t => t.category === catKey);
        if (!toolsInCat.length) return;
        const meta = CATEGORY_META[catKey];

        const section = document.createElement('div');
        section.className = 'category-group';
        section.dataset.category = catKey;
        section.innerHTML = `<div class="category-heading"><h2><span class="cat-icon">${meta.icon}</span>${meta.title}</h2><p>${meta.description}</p></div>`;

        const grid = document.createElement('div');
        grid.className = 'tool-grid';
        toolsInCat.forEach((tool) => {
            grid.appendChild(buildToolCard(tool, cardIndex));
            cardIndex++;
        });
        section.appendChild(grid);
        categoriesContainer.appendChild(section);
    });

    if (typeof COMING_SOON !== 'undefined' && COMING_SOON.length) {
        const section = document.createElement('div');
        section.className = 'category-group';
        section.innerHTML = `<div class="category-heading"><h2><span class="cat-icon">🧰</span>Coming Soon</h2><p>New tools land here first.</p></div>`;
        const grid = document.createElement('div');
        grid.className = 'tool-grid';
        COMING_SOON.forEach((tool) => {
            grid.appendChild(buildComingSoonCard(tool, cardIndex));
            cardIndex++;
        });
        section.appendChild(grid);
        categoriesContainer.appendChild(section);
    }
}

function buildToolCard(tool, index) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'tool-card';
    card.style.setProperty('--delay', `${Math.min(index, 10) * 55}ms`);
    card.innerHTML = `
        <div class="tool-card-icon">${tool.icon}</div>
        <h3>${tool.title}</h3>
        <p>${tool.description}</p>
        <span class="tool-card-arrow">→</span>
    `;
    card.addEventListener('click', () => openTool(tool.id));
    return card;
}

function buildComingSoonCard(tool, index) {
    const card = document.createElement('div');
    card.className = 'tool-card tool-card-disabled';
    card.style.setProperty('--delay', `${Math.min(index, 10) * 55}ms`);
    card.innerHTML = `
        <div class="tool-card-icon">${tool.icon}</div>
        <h3>${tool.title}</h3>
        <p>${tool.description}</p>
        <span class="soon-badge">Soon</span>
    `;
    return card;
}

function handleSearch() {
    const q = searchInput.value.trim().toLowerCase();
    categoriesContainer.querySelectorAll('.category-group').forEach((group) => {
        let visibleCount = 0;
        group.querySelectorAll('.tool-card').forEach((card) => {
            const match = !q || card.textContent.toLowerCase().includes(q);
            card.classList.toggle('hidden-by-search', !match);
            if (match) visibleCount++;
        });
        group.classList.toggle('hidden-by-search', visibleCount === 0);
    });
}

/* ---------- NAVIGATION ---------- */
function switchView(target) {
    const toShow = target === 'tool' ? toolView : dashboardView;
    const toHide = target === 'tool' ? dashboardView : toolView;
    currentView = target;

    toHide.classList.add('view-exit');
    window.setTimeout(() => {
        toHide.classList.add('is-hidden');
        toHide.classList.remove('view-exit');

        toShow.classList.remove('is-hidden');
        void toShow.offsetWidth; /* restart animation */
        toShow.classList.add('view-enter');
        window.setTimeout(() => toShow.classList.remove('view-enter'), 650);
    }, 260);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openTool(id) {
    const tool = TOOLS.find(t => t.id === id);
    if (!tool) return;
    currentTool = tool;
    selectedFiles = [];

    toolIconEl.textContent = tool.icon;
    toolTitleEl.textContent = tool.title;
    toolDescEl.textContent = tool.description;
    uploadIconEl.textContent = tool.icon;
    fileInput.accept = tool.accept;
    fileInput.multiple = !!tool.multiple;
    fileInput.value = '';

    actionBtn.textContent = tool.actionLabel;
    actionBtn.classList.remove('is-loading');

    renderOptions(tool.options);
    syncFileState();

    resultPanelEl.className = 'result-panel';
    resultPanelEl.innerHTML = '';
    statusMsgEl.textContent = '';
    progressWrapEl.classList.remove('show');
    progressBarEl.style.width = '0%';
    dropZone.classList.remove('is-disabled', 'drag-over');

    switchView('tool');
}

/* ---------- FILE HANDLING ---------- */
function handleFiles(files) {
    if (!files.length || !currentTool) return;
    const accepted = files.filter(f => isAcceptedFile(f, currentTool.accept));
    const rejectedCount = files.length - accepted.length;

    if (rejectedCount > 0) {
        showToast(`${rejectedCount} file${rejectedCount > 1 ? 's were' : ' was'} skipped — unsupported format.`, 'error');
    }
    if (!accepted.length) return;

    selectedFiles = currentTool.multiple ? selectedFiles.concat(accepted) : [accepted[0]];
    syncFileState();

    resultPanelEl.className = 'result-panel';
    resultPanelEl.innerHTML = '';

    uploadIconEl.classList.remove('pop');
    void uploadIconEl.offsetWidth;
    uploadIconEl.classList.add('pop');
}

function isAcceptedFile(file, acceptStr) {
    if (!acceptStr) return true;
    const exts = acceptStr.split(',').map(s => s.trim().toLowerCase());
    const name = file.name.toLowerCase();
    return exts.some(ext => name.endsWith(ext));
}

function syncFileState() {
    renderFileList();
    updateDropZoneSummary();
    actionBtn.disabled = selectedFiles.length === 0;
}

function updateDropZoneSummary() {
    if (!currentTool) return;
    if (!selectedFiles.length) {
        dropLabelEl.innerHTML = currentTool.dropLabel;
    } else if (selectedFiles.length === 1) {
        dropLabelEl.innerHTML = `Selected: <b>${escapeHtml(selectedFiles[0].name)}</b> — click to change`;
    } else {
        dropLabelEl.innerHTML = `<b>${selectedFiles.length} files</b> selected — click or drop to add more`;
    }
}

function renderFileList() {
    if (!selectedFiles.length) {
        fileListEl.innerHTML = '';
        return;
    }
    fileListEl.innerHTML = selectedFiles.map((f, i) => `
        <div class="file-chip" data-index="${i}">
            <span class="file-chip-icon">${iconForFile(f.name)}</span>
            <span class="file-chip-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
            <span class="file-chip-size">${formatBytes(f.size)}</span>
            ${currentTool.orderMatters ? `
                <button type="button" class="file-chip-move" data-dir="-1" data-index="${i}" aria-label="Move up">↑</button>
                <button type="button" class="file-chip-move" data-dir="1" data-index="${i}" aria-label="Move down">↓</button>
            ` : ''}
            <button type="button" class="file-chip-remove" data-index="${i}" aria-label="Remove">✕</button>
        </div>
    `).join('');

    fileListEl.querySelectorAll('.file-chip-remove').forEach((btn) => {
        btn.addEventListener('click', () => {
            selectedFiles.splice(Number(btn.dataset.index), 1);
            syncFileState();
        });
    });
    fileListEl.querySelectorAll('.file-chip-move').forEach((btn) => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.index);
            const swapIdx = idx + Number(btn.dataset.dir);
            if (swapIdx < 0 || swapIdx >= selectedFiles.length) return;
            [selectedFiles[idx], selectedFiles[swapIdx]] = [selectedFiles[swapIdx], selectedFiles[idx]];
            syncFileState();
        });
    });
}

function iconForFile(name) {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📕';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) return '🖼️';
    if (ext === 'docx') return '📄';
    return '📁';
}

/* ---------- OPTIONS RENDERING ---------- */
function renderOptions(options) {
    optionsEl.innerHTML = '';
    if (!options || !options.length) {
        optionsEl.classList.remove('show');
        return;
    }
    optionsEl.classList.add('show');

    options.forEach((opt) => {
        const field = document.createElement('div');
        field.className = 'option-field';

        if (opt.type === 'range') {
            field.innerHTML = `
                <label for="opt-${opt.id}">${opt.label}: <span class="option-value" id="opt-${opt.id}-val">${opt.value}${opt.unit || ''}</span></label>
                <input type="range" id="opt-${opt.id}" min="${opt.min}" max="${opt.max}" value="${opt.value}">
            `;
        } else if (opt.type === 'select') {
            field.innerHTML = `
                <label>${opt.label}</label>
                <div class="segmented" id="opt-${opt.id}">
                    <div class="seg-pill"></div>
                    ${opt.choices.map(c => `<button type="button" class="seg-btn${c === opt.value ? ' active' : ''}" data-value="${c}">${c}</button>`).join('')}
                </div>
            `;
        } else if (opt.type === 'text') {
            field.innerHTML = `
                <label for="opt-${opt.id}">${opt.label}</label>
                <input type="text" id="opt-${opt.id}" placeholder="${opt.placeholder || ''}">
            `;
        }
        optionsEl.appendChild(field);
    });

    optionsEl.querySelectorAll('input[type=range]').forEach((input) => {
        input.addEventListener('input', () => {
            const cfg = options.find(o => `opt-${o.id}` === input.id);
            const valEl = document.getElementById(`${input.id}-val`);
            if (valEl) valEl.textContent = input.value + (cfg && cfg.unit ? cfg.unit : '');
        });
    });

    optionsEl.querySelectorAll('.segmented').forEach((seg) => {
        updateSegPill(seg);
        seg.querySelectorAll('.seg-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                seg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateSegPill(seg);
            });
        });
    });
}

function updateSegPill(seg) {
    const pill = seg.querySelector('.seg-pill');
    const active = seg.querySelector('.seg-btn.active');
    if (!pill || !active) return;
    pill.style.width = `${active.offsetWidth}px`;
    pill.style.transform = `translateX(${active.offsetLeft}px)`;
}

function collectOptionValues() {
    const values = {};
    (currentTool.options || []).forEach((opt) => {
        if (opt.type === 'range') {
            values[opt.id] = Number(document.getElementById(`opt-${opt.id}`).value);
        } else if (opt.type === 'select') {
            const active = document.querySelector(`#opt-${opt.id} .seg-btn.active`);
            values[opt.id] = active ? active.dataset.value : opt.value;
        } else if (opt.type === 'text') {
            values[opt.id] = document.getElementById(`opt-${opt.id}`).value;
        }
    });
    return values;
}

/* ---------- ACTION / RESULT ---------- */
async function runCurrentTool() {
    if (!selectedFiles.length || !currentTool || actionBtn.disabled) return;

    setBusy(true);
    resultPanelEl.className = 'result-panel';
    resultPanelEl.innerHTML = '';
    progressWrapEl.classList.add('show');
    progressBarEl.style.width = '4%';
    statusMsgEl.textContent = 'Getting started…';

    try {
        const options = collectOptionValues();
        const result = await currentTool.run(selectedFiles.slice(), options, updateProgress);
        await presentResult(result);
    } catch (err) {
        console.error(err);
        showErrorState(err && err.message ? err.message : 'Something went wrong. Please try a different file.');
    } finally {
        setBusy(false);
    }
}

function setBusy(isBusy) {
    actionBtn.disabled = isBusy || selectedFiles.length === 0;
    actionBtn.classList.toggle('is-loading', isBusy);
    dropZone.classList.toggle('is-disabled', isBusy);
}

function updateProgress(label, percent) {
    statusMsgEl.textContent = label;
    progressBarEl.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

async function presentResult(result) {
    let downloadHandler = null;
    let filename = result.filename || 'download';

    if (result.downloaded) {
        /* tool already triggered its own save */
    } else if (result.files && result.files.length > 1) {
        updateProgress('Zipping files…', 96);
        const zip = new JSZip();
        result.files.forEach(f => zip.file(f.filename, f.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        filename = `convertly-${currentTool.id}.zip`;
        downloadHandler = () => downloadBlob(zipBlob, filename);
    } else {
        const single = result.files ? result.files[0] : result;
        filename = single.filename;
        downloadHandler = () => downloadBlob(single.blob, single.filename);
    }

    progressWrapEl.classList.remove('show');
    statusMsgEl.textContent = '';

    resultPanelEl.className = 'result-panel show is-success';
    resultPanelEl.innerHTML = `
        <div class="stamp">
            <span class="stamp-check">✓</span>
            <span class="stamp-label">Done</span>
        </div>
        <p>${result.meta ? escapeHtml(result.meta) : `Your file <b>${escapeHtml(filename)}</b> is ready.`}</p>
        ${downloadHandler ? `<button type="button" class="btn-primary result-download-btn">⬇ Download ${escapeHtml(filename)}</button>` : ''}
        <button type="button" class="btn-ghost result-reset-btn">Convert another file</button>
    `;

    if (downloadHandler) {
        resultPanelEl.querySelector('.result-download-btn').addEventListener('click', downloadHandler);
    }
    resultPanelEl.querySelector('.result-reset-btn').addEventListener('click', resetToolInputs);
}

function showErrorState(message) {
    progressWrapEl.classList.remove('show');
    statusMsgEl.textContent = '';
    resultPanelEl.className = 'result-panel show is-error';
    resultPanelEl.innerHTML = `
        <div class="error-badge">✕</div>
        <h3>Conversion failed</h3>
        <p>${escapeHtml(message)}</p>
        <button type="button" class="btn-ghost result-reset-btn">Try again</button>
    `;
    resultPanelEl.querySelector('.result-reset-btn').addEventListener('click', resetToolInputs);
    requestAnimationFrame(() => {
        resultPanelEl.classList.add('shake');
        window.setTimeout(() => resultPanelEl.classList.remove('shake'), 500);
    });
}

function resetToolInputs() {
    selectedFiles = [];
    syncFileState();
    resultPanelEl.className = 'result-panel';
    resultPanelEl.innerHTML = '';
    fileInput.value = '';
}

/* ---------- UTILITIES ---------- */
function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
        reader.readAsArrayBuffer(file);
    });
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
        reader.readAsDataURL(file);
    });
}

function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Could not decode image'));
        img.src = dataUrl;
    });
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not export image'))), type, quality);
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast${type === 'error' ? ' toast-error' : ''}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(() => {
        toast.classList.remove('show');
        window.setTimeout(() => toast.remove(), 320);
    }, 3400);
}
