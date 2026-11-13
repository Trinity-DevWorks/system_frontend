import { tenantApiClient } from "@/lib/axios";

/**
 * @param {Blob} blob
 * @returns {Promise<Error>}
 */
async function errorFromBlob(blob) {
  try {
    const text = await blob.text();
    const json = JSON.parse(text);
    const code = typeof json?.code === "string" ? json.code : undefined;
    const message =
      typeof json?.message === "string" && json.message.trim()
        ? json.message
        : "Request failed";
    const error = new Error(code ? "Request failed" : message);
    error.details = { code, errors: json?.errors };
    return error;
  } catch {
    const error = new Error("Request failed");
    error.details = { code: undefined, errors: undefined };
    return error;
  }
}

/**
 * @param {string} url
 * @param {{ locale?: string, template?: "receipt" }} [options]
 */
function withLocaleQuery(url, options = {}) {
  const search = new URLSearchParams();
  if (options.locale === "en" || options.locale === "ar") {
    search.set("locale", options.locale);
  }
  if (options.template === "receipt") {
    search.set("template", "receipt");
  }
  const qs = search.toString();
  return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
}

/**
 * @param {string} url
 * @param {{ locale?: string, template?: "receipt" }} [options]
 * @returns {Promise<Blob>}
 */
export async function fetchPdfBlob(url, options = {}) {
  try {
    const response = await tenantApiClient.get(withLocaleQuery(url, options), {
      responseType: "blob",
      timeout: 120_000,
    });
    const blob = response.data;
    if (blob instanceof Blob && String(blob.type).includes("json")) {
      throw await errorFromBlob(blob);
    }
    if (!(blob instanceof Blob)) {
      throw new Error("Request failed");
    }
    // Some servers omit Content-Type; force PDF so the browser print preview works.
    if (!blob.type || blob.type === "application/octet-stream") {
      return new Blob([blob], { type: "application/pdf" });
    }
    return blob;
  } catch (error) {
    const details = error && typeof error === "object" && "details" in error ? error.details : null;
    if (details instanceof Blob) {
      throw await errorFromBlob(details);
    }
    throw error;
  }
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
export function savePdfBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

const PRINT_FRAME_ID = "erp-pdf-print-frame";

/** @type {string | null} */
let printFrameUrl = null;

/** Drop the previous print frame (kept alive until the next print so its dialog isn't cut off). */
function removePrintFrame() {
  document.getElementById(PRINT_FRAME_ID)?.remove();
  if (printFrameUrl) URL.revokeObjectURL(printFrameUrl);
  printFrameUrl = null;
}

/**
 * Fallback: show the PDF in a new tab (the user prints with Ctrl+P / the viewer's print button).
 * @param {string} objectUrl
 */
function openPdfTab(objectUrl) {
  // No "noopener": with it window.open always returns null, so a blocked popup can't be detected.
  const win = window.open(objectUrl, "_blank");
  if (!win) {
    const error = new Error("Request failed");
    error.details = { code: "PDF_PRINT_POPUP_BLOCKED" };
    throw error;
  }
  win.opener = null;
}

/**
 * Print the PDF straight from the current page: it loads into a hidden iframe and the
 * browser print dialog opens on top of the app (no new tab, no download).
 * Falls back to opening the PDF in a new tab when the browser refuses to print the frame.
 *
 * @param {Blob} blob
 */
export async function openPdfBlobForPrint(blob) {
  const pdfBlob =
    blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  removePrintFrame();
  const objectUrl = URL.createObjectURL(pdfBlob);
  printFrameUrl = objectUrl;

  const frame = document.createElement("iframe");
  frame.id = PRINT_FRAME_ID;
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  // Not display:none — Chrome doesn't load the PDF viewer in a hidden frame.
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";

  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(undefined);
    };
    frame.onload = finish;
    // Some browsers never fire load for a PDF frame.
    window.setTimeout(finish, 3000);
    frame.src = objectUrl;
    document.body.appendChild(frame);
  });

  // Give the PDF viewer a moment to render the pages before printing.
  await new Promise((resolve) => window.setTimeout(resolve, 300));

  try {
    const win = frame.contentWindow;
    if (!win) throw new Error("no frame window");
    win.focus();
    win.print();
  } catch {
    // e.g. Firefox/Safari refusing to print a PDF frame — show it in a tab instead.
    document.getElementById(PRINT_FRAME_ID)?.remove();
    openPdfTab(objectUrl);
  }
}

/**
 * @param {string} url
 * @param {string} filename
 * @param {{ locale?: string, mode?: "download" | "print", template?: "receipt" }} [options]
 */
export async function downloadPdf(url, filename, options = {}) {
  if (options.mode === "print") {
    await printPdf(url, options);
    return;
  }
  const blob = await fetchPdfBlob(url, options);
  savePdfBlob(blob, filename);
}

/**
 * Fetch the document PDF and open the system print dialog.
 *
 * @param {string} url
 * @param {{ locale?: string, template?: "receipt" }} [options]
 */
export async function printPdf(url, options = {}) {
  const blob = await fetchPdfBlob(url, options);
  await openPdfBlobForPrint(blob);
}
