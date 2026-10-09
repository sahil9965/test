// Builds ticket and seller-log PDFs off the main thread so thousands of tickets don't freeze the page.
importScripts("/vendor/pdf-lib.min.js", "/core.js");
self.onmessage = async e => {
  const { id, kind, state, opts } = e.data || {};
  try {
    const fn = kind === "seller" ? self.TRCore.buildSellerPdf : self.TRCore.buildTicketPdf;
    const onProgress = (p, n, t) => self.postMessage({ id, progress: p, n, t });
    const r = await fn(self.PDFLib, state, Object.assign({}, opts, { onProgress }));
    const { bytes } = r;
    delete r.bytes;
    self.postMessage({ id, done: true, bytes, info: r }, [bytes.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
