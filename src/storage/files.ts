/**
 * Moving files in and out of the app.
 *
 * Exporting hands the user a file through the browser's own download, and importing takes one back
 * through a file input. Both work everywhere, which the File System Access API does not — projects
 * live in origin-private storage instead, and these two are the only doors to the file system the
 * user can actually see.
 */

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadBytes(name: string, bytes: Uint8Array, type: string) {
  // Copied into a buffer of its own so that what is handed over is the bytes themselves rather than
  // a view onto something larger.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);

  download(name, new Blob([copy.buffer], {type}));
}

/** A file the user chose, or nothing if they dismissed the dialog. */
function uploadFile(accept: string): Promise<{name: string, bytes: Uint8Array} | undefined> {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";

    const finish = async () => {
      const file = input.files?.[0];
      resolve(file ? {name: file.name, bytes: new Uint8Array(await file.arrayBuffer())} : undefined);
      input.remove();
    };

    input.onchange = finish;
    // Not every browser reports a dismissed file dialog, so the promise settles on whichever of the
    // two arrives and the other is left to be garbage.
    input.oncancel = () => {
      resolve(undefined);
      input.remove();
    };

    document.body.appendChild(input);
    input.click();
  });
}

export {downloadBytes, uploadFile};
