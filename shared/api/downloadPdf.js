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
 * @param {{ locale?: string }} [options]
 */
function withLocaleQuery(url, options = {}) {
  const search = new URLSearchParams();
  if (options.locale === "en" || options.locale === "ar") {
    search.set("locale", options.locale);
  }
  const qs = search.toString();
  return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
}

/**
 * @param {string} url
 * @param {{ locale?: string }} [options]
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

/**
 * Open the PDF in a new tab and trigger the browser print dialog (ERP-style direct print).
 *
 * @param {Blob} blob
 */
export async function openPdfBlobForPrint(blob) {
  const pdfBlob =
    blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(pdfBlob);
  const win = window.open(objectUrl, "_blank", "noopener,noreferrer");
  if (!win) {
    URL.revokeObjectURL(objectUrl);
    const error = new Error("Request failed");
    error.details = { code: "PDF_PRINT_POPUP_BLOCKED" };
    throw error;
  }

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      // Browser may block scripted print; the tab still shows the PDF for manual Ctrl+P.
    }
  };

  // Blob PDF tabs often never fire a reliable load event — retry briefly, then leave the tab open.
  window.setTimeout(triggerPrint, 400);
  window.setTimeout(triggerPrint, 1200);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
}

/**
 * @param {string} url
 * @param {string} filename
 * @param {{ locale?: string, mode?: "download" | "print" }} [options]
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
 * @param {{ locale?: string }} [options]
 */
export async function printPdf(url, options = {}) {
  const blob = await fetchPdfBlob(url, options);
  await openPdfBlobForPrint(blob);
}
