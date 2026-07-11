/* =========================================================
   CONVERTLY — TOOL REGISTRY & CONVERSION LOGIC
   To add a new tool:
     1. Add an entry to TOOLS below (icon, labels, accepted
        file types, optional `options`, and a `run` function).
     2. Write that `run(files, options, onProgress)` function.
   `run` must return one of:
     { blob, filename, meta }                 — single file
     { files: [{blob, filename}, ...], meta }  — multiple files (auto-zipped)
     { downloaded: true, filename, meta }      — tool already saved the file itself
   ========================================================= */

if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.worker.min.js';
}

const TOOLS = [
    {
        id: 'docx-to-pdf',
        category: 'convert',
        icon: '📄',
        title: 'DOCX to PDF',
        description: 'Turn Word documents into polished, ready-to-share PDFs.',
        accept: '.docx',
        multiple: false,
        actionLabel: 'Convert to PDF',
        dropLabel: 'Drag & drop your <b>.docx</b> file here, or click to browse',
        run: toolDocxToPdf
    },
    {
        id: 'img-to-pdf',
        category: 'convert',
        icon: '🖼️',
        title: 'Images to PDF',
        description: 'Combine one or more images into a single PDF file.',
        accept: '.jpg,.jpeg,.png,.webp',
        multiple: true,
        orderMatters: true,
        actionLabel: 'Create PDF',
        dropLabel: 'Drag & drop images here — you can add more than one',
        run: toolImagesToPdf
    },
    {
        id: 'pdf-to-img',
        category: 'convert',
        icon: '🧩',
        title: 'PDF to Images',
        description: 'Export every page of a PDF as a high-res PNG.',
        accept: '.pdf',
        multiple: false,
        actionLabel: 'Export Images',
        dropLabel: 'Drag & drop your <b>.pdf</b> file here',
        run: toolPdfToImages
    },
    {
        id: 'img-convert',
        category: 'convert',
        icon: '🔁',
        title: 'Image Format Converter',
        description: 'Convert images between PNG, JPG, and WEBP.',
        accept: '.jpg,.jpeg,.png,.webp,.gif,.bmp',
        multiple: true,
        actionLabel: 'Convert Images',
        dropLabel: 'Drag & drop images here',
        options: [{ id: 'format', type: 'select', label: 'Target format', choices: ['PNG', 'JPG', 'WEBP'], value: 'PNG' }],
        run: toolImageConvert
    },
    {
        id: 'img-compress',
        category: 'compress',
        icon: '🗜️',
        title: 'Image Compressor',
        description: 'Shrink image file size while keeping the visual quality.',
        accept: '.jpg,.jpeg,.png,.webp',
        multiple: true,
        actionLabel: 'Compress Images',
        dropLabel: 'Drag & drop images here',
        options: [{ id: 'quality', type: 'range', label: 'Quality', min: 10, max: 95, value: 70, unit: '%' }],
        run: toolImageCompress
    },
    {
        id: 'pdf-compress',
        category: 'compress',
        icon: '📦',
        title: 'PDF Compressor',
        description: 'Reduce PDF file size — great for scanned documents.',
        accept: '.pdf',
        multiple: false,
        actionLabel: 'Compress PDF',
        dropLabel: 'Drag & drop your <b>.pdf</b> file here',
        options: [{ id: 'level', type: 'select', label: 'Compression level', choices: ['Light', 'Medium', 'Maximum'], value: 'Medium' }],
        run: toolPdfCompress
    },
    {
        id: 'pdf-merge',
        category: 'organize',
        icon: '➕',
        title: 'Merge PDF',
        description: 'Combine multiple PDF files into a single document.',
        accept: '.pdf',
        multiple: true,
        orderMatters: true,
        actionLabel: 'Merge Files',
        dropLabel: 'Drag & drop two or more <b>.pdf</b> files here',
        run: toolPdfMerge
    },
    {
        id: 'pdf-split',
        category: 'organize',
        icon: '✂️',
        title: 'Split PDF',
        description: 'Break a PDF into separate pages, or extract a range.',
        accept: '.pdf',
        multiple: false,
        actionLabel: 'Split PDF',
        dropLabel: 'Drag & drop your <b>.pdf</b> file here',
        options: [{ id: 'range', type: 'text', label: 'Page range (optional)', placeholder: 'e.g. 1-3,5 — leave blank to split every page' }],
        run: toolPdfSplit
    }
];

const COMING_SOON = [
    { icon: '📝', title: 'PDF to Word', description: 'Turn a PDF back into an editable Word document.' },
    { icon: '🔲', title: 'QR Code Generator', description: 'Generate QR codes for links, WiFi, or contact cards.' },
    { icon: '📊', title: 'CSV ⇄ JSON', description: 'Convert spreadsheet data to JSON and back.' }
];

/* ---------- TOOL IMPLEMENTATIONS ---------- */

async function toolDocxToPdf(files, options, onProgress) {
    if (typeof mammoth === 'undefined' || typeof html2pdf === 'undefined') {
        throw new Error('Conversion engine failed to load. Please refresh and try again.');
    }
    const file = files[0];
    onProgress('Reading document…', 15);
    const arrayBuffer = await readFileAsArrayBuffer(file);

    onProgress('Converting to HTML…', 35);
    const result = await mammoth.convertToHtml({ arrayBuffer });

    const container = document.createElement('div');
    container.style.cssText = "position:fixed;left:-9999px;top:0;width:800px;padding:32px;background:#fff;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;line-height:1.6;";
    container.innerHTML = result.value;
    document.body.appendChild(container);

    const filename = file.name.replace(/\.docx$/i, '.pdf');
    const opt = {
        margin: 0.5,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
        onProgress('Building PDF…', 65);
        const blob = await html2pdf().set(opt).from(container).outputPdf('blob');
        onProgress('Done!', 100);
        return { blob, filename, meta: `PDF ready — ${formatBytes(blob.size)}` };
    } catch (primaryError) {
        console.warn('outputPdf(blob) failed, falling back to direct save:', primaryError);
        onProgress('Building PDF…', 65);
        await html2pdf().set(opt).from(container).save();
        onProgress('Done!', 100);
        return { downloaded: true, filename, meta: 'Your PDF was saved to your downloads folder.' };
    } finally {
        if (container.parentNode) container.parentNode.removeChild(container);
    }
}

async function toolImagesToPdf(files, options, onProgress) {
    if (typeof window.jspdf === 'undefined') throw new Error('PDF engine failed to load. Please refresh and try again.');
    const { jsPDF } = window.jspdf;
    const A4 = { w: 595.28, h: 841.89 };
    let doc = null;
    const total = files.length;

    for (let i = 0; i < total; i++) {
        onProgress(`Adding image ${i + 1} of ${total}…`, Math.round(((i + 1) / total) * 88));
        const dataUrl = await readFileAsDataURL(files[i]);
        const img = await loadImageFromDataUrl(dataUrl);

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const jpegUrl = canvas.toDataURL('image/jpeg', 0.92);

        const isLandscape = canvas.width > canvas.height;
        const pageW = isLandscape ? A4.h : A4.w;
        const pageH = isLandscape ? A4.w : A4.h;
        const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
        const w = canvas.width * ratio;
        const h = canvas.height * ratio;
        const x = (pageW - w) / 2;
        const y = (pageH - h) / 2;

        if (i === 0) {
            doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' });
        } else {
            doc.addPage('a4', isLandscape ? 'landscape' : 'portrait');
        }
        doc.addImage(jpegUrl, 'JPEG', x, y, w, h);
    }

    onProgress('Finalizing PDF…', 96);
    const blob = doc.output('blob');
    onProgress('Done!', 100);
    return { blob, filename: 'images.pdf', meta: `Combined ${total} image${total > 1 ? 's' : ''} into one PDF — ${formatBytes(blob.size)}` };
}

async function toolPdfToImages(files, options, onProgress) {
    if (typeof pdfjsLib === 'undefined') throw new Error('PDF engine failed to load. Please refresh and try again.');
    const file = files[0];
    onProgress('Loading PDF…', 10);
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const total = pdf.numPages;
    const baseName = file.name.replace(/\.pdf$/i, '');
    const outputs = [];

    for (let i = 1; i <= total; i++) {
        onProgress(`Rendering page ${i} of ${total}…`, 10 + Math.round((i / total) * 82));
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await canvasToBlob(canvas, 'image/png');
        const suffix = total > 1 ? `-page-${i}` : '';
        outputs.push({ blob, filename: `${baseName}${suffix}.png` });
    }

    onProgress('Done!', 100);
    const totalSize = outputs.reduce((s, o) => s + o.blob.size, 0);
    return { files: outputs, meta: `Exported ${total} page image${total > 1 ? 's' : ''} — ${formatBytes(totalSize)}` };
}

async function toolImageConvert(files, options, onProgress) {
    const targetFormat = (options.format || 'PNG').toUpperCase();
    const mimeMap = { PNG: 'image/png', JPG: 'image/jpeg', WEBP: 'image/webp' };
    const extMap = { PNG: 'png', JPG: 'jpg', WEBP: 'webp' };
    const mime = mimeMap[targetFormat] || 'image/png';
    const ext = extMap[targetFormat] || 'png';
    const total = files.length;
    const outputs = [];

    for (let i = 0; i < total; i++) {
        const file = files[i];
        onProgress(`Converting ${file.name}…`, Math.round(((i + 1) / total) * 92));
        const dataUrl = await readFileAsDataURL(file);
        const img = await loadImageFromDataUrl(dataUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (mime === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        const blob = await canvasToBlob(canvas, mime, mime === 'image/png' ? undefined : 0.92);
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        outputs.push({ blob, filename: `${baseName}.${ext}` });
    }

    onProgress('Done!', 100);
    return { files: outputs, meta: `Converted ${total} image${total > 1 ? 's' : ''} to ${targetFormat}` };
}

async function toolImageCompress(files, options, onProgress) {
    const quality = Math.min(0.95, Math.max(0.1, (options.quality || 70) / 100));
    const total = files.length;
    const outputs = [];
    let originalTotal = 0;
    let compressedTotal = 0;

    for (let i = 0; i < total; i++) {
        const file = files[i];
        originalTotal += file.size;
        onProgress(`Compressing ${file.name}…`, Math.round(((i + 1) / total) * 92));

        const dataUrl = await readFileAsDataURL(file);
        const img = await loadImageFromDataUrl(dataUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');

        const hasTransparency = /png/i.test(file.type) || /\.png$/i.test(file.name);
        const targetMime = hasTransparency ? 'image/webp' : 'image/jpeg';
        if (!hasTransparency) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);

        const blob = await canvasToBlob(canvas, targetMime, quality);
        const actualExt = blob.type === 'image/webp' ? 'webp' : (blob.type === 'image/png' ? 'png' : 'jpg');
        compressedTotal += blob.size;
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        outputs.push({ blob, filename: `${baseName}-compressed.${actualExt}` });
    }

    onProgress('Done!', 100);
    const saved = originalTotal > 0 ? Math.round((1 - compressedTotal / originalTotal) * 100) : 0;
    const meta = saved > 0
        ? `${formatBytes(originalTotal)} → ${formatBytes(compressedTotal)} (${saved}% smaller)`
        : `${formatBytes(originalTotal)} → ${formatBytes(compressedTotal)}`;
    return { files: outputs, meta };
}

async function toolPdfCompress(files, options, onProgress) {
    if (typeof pdfjsLib === 'undefined' || typeof window.jspdf === 'undefined') {
        throw new Error('PDF engine failed to load. Please refresh and try again.');
    }
    const file = files[0];
    const level = options.level || 'Medium';
    const presets = {
        Light: { scale: 2.0, quality: 0.85 },
        Medium: { scale: 1.5, quality: 0.65 },
        Maximum: { scale: 1.0, quality: 0.45 }
    };
    const { scale, quality } = presets[level] || presets.Medium;

    onProgress('Loading PDF…', 8);
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const total = pdf.numPages;
    const { jsPDF } = window.jspdf;
    let doc = null;

    for (let i = 1; i <= total; i++) {
        onProgress(`Compressing page ${i} of ${total}…`, 8 + Math.round((i / total) * 80));
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        const imgData = canvas.toDataURL('image/jpeg', quality);

        if (i === 1) {
            doc = new jsPDF({ unit: 'pt', format: [viewport.width, viewport.height] });
        } else {
            doc.addPage([viewport.width, viewport.height]);
        }
        doc.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height);
    }

    onProgress('Finalizing…', 95);
    const blob = doc.output('blob');
    onProgress('Done!', 100);
    const saved = Math.round((1 - blob.size / file.size) * 100);
    const filename = file.name.replace(/\.pdf$/i, '-compressed.pdf');
    const meta = saved > 0
        ? `${formatBytes(file.size)} → ${formatBytes(blob.size)} (${saved}% smaller)`
        : `${formatBytes(file.size)} → ${formatBytes(blob.size)}. This PDF was already well optimized.`;
    return { blob, filename, meta };
}

async function toolPdfMerge(files, options, onProgress) {
    if (typeof PDFLib === 'undefined') throw new Error('PDF engine failed to load. Please refresh and try again.');
    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();
    const total = files.length;

    for (let i = 0; i < total; i++) {
        onProgress(`Adding ${files[i].name}…`, Math.round(((i + 1) / total) * 88));
        const bytes = await readFileAsArrayBuffer(files[i]);
        const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
    }

    onProgress('Saving merged PDF…', 96);
    const mergedBytes = await mergedPdf.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });
    onProgress('Done!', 100);
    return { blob, filename: 'merged.pdf', meta: `Merged ${total} files into one PDF (${mergedPdf.getPageCount()} pages) — ${formatBytes(blob.size)}` };
}

async function toolPdfSplit(files, options, onProgress) {
    if (typeof PDFLib === 'undefined') throw new Error('PDF engine failed to load. Please refresh and try again.');
    const { PDFDocument } = PDFLib;
    const file = files[0];
    onProgress('Loading PDF…', 10);
    const bytes = await readFileAsArrayBuffer(file);
    const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pageCount = srcDoc.getPageCount();
    const baseName = file.name.replace(/\.pdf$/i, '');
    const rangeStr = (options.range || '').trim();
    const selectedPages = parsePageRange(rangeStr, pageCount);

    if (selectedPages === null) {
        const outputs = [];
        for (let i = 0; i < pageCount; i++) {
            onProgress(`Splitting page ${i + 1} of ${pageCount}…`, 10 + Math.round(((i + 1) / pageCount) * 82));
            const newDoc = await PDFDocument.create();
            const [page] = await newDoc.copyPages(srcDoc, [i]);
            newDoc.addPage(page);
            const newBytes = await newDoc.save();
            outputs.push({ blob: new Blob([newBytes], { type: 'application/pdf' }), filename: `${baseName}-page-${i + 1}.pdf` });
        }
        onProgress('Done!', 100);
        return { files: outputs, meta: `Split into ${pageCount} separate PDF files` };
    }

    onProgress('Extracting pages…', 60);
    const newDoc = await PDFDocument.create();
    const indices = selectedPages.map(p => p - 1);
    const copied = await newDoc.copyPages(srcDoc, indices);
    copied.forEach(p => newDoc.addPage(p));
    const newBytes = await newDoc.save();
    const blob = new Blob([newBytes], { type: 'application/pdf' });
    onProgress('Done!', 100);
    return { blob, filename: `${baseName}-extracted.pdf`, meta: `Extracted ${indices.length} page${indices.length > 1 ? 's' : ''} (${rangeStr}) — ${formatBytes(blob.size)}` };
}

function parsePageRange(rangeStr, maxPages) {
    if (!rangeStr) return null;
    const pages = new Set();
    rangeStr.split(',').forEach((part) => {
        part = part.trim();
        if (!part) return;
        if (part.includes('-')) {
            const bounds = part.split('-').map(n => parseInt(n.trim(), 10));
            if (!isNaN(bounds[0]) && !isNaN(bounds[1])) {
                const lo = Math.min(bounds[0], bounds[1]);
                const hi = Math.max(bounds[0], bounds[1]);
                for (let p = lo; p <= hi; p++) {
                    if (p >= 1 && p <= maxPages) pages.add(p);
                }
            }
        } else {
            const p = parseInt(part, 10);
            if (!isNaN(p) && p >= 1 && p <= maxPages) pages.add(p);
        }
    });
    const arr = Array.from(pages).sort((a, b) => a - b);
    return arr.length ? arr : null;
}
