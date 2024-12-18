export function openFilePicker() {
  return new Promise((resolve, reject) => {
    // Create an input element dynamically
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*"; // Accept only image files

    // Event listener for file selection
    input.addEventListener("change", async (event) => {
      const file = event.target.files[0]; // Get the selected file
      disposeInput();

      if (file) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          resolve({
            arrayBuffer,
            mimeType: file.type, // Resolve with the MIME type
            fileName: file.name, // Resolve with the file name
          });
        } catch (error) {
          reject(error); // Reject if reading fails
        }
      } else {
        reject(new Error("No file selected."));
      }
    });

    // Event listener for cancellation (optional fallback)
    input.addEventListener("cancel", () => {
      disposeInput();
      reject(new Error("File picker was closed without selecting a file."));
    });

    // Clean up the input element
    function disposeInput() {
      input.remove(); // Remove the input element from the DOM
    }

    // Trigger the file picker
    input.click(); // Open the file picker
  });
}

export const getImageDimensions = (source) => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Ensure CORS settings to load blobs or external URLs
    img.crossOrigin = "anonymous";

    // Resolve with dimensions once the image loads
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const aspectRatio = width / height;
      resolve({ width, height, aspectRatio });
    };

    // Reject in case of error
    img.onerror = (err) => reject(err);

    // Set the source
    if (typeof source === "string") {
      // Handle image URL
      img.src = source;
    } else if (source instanceof Blob) {
      // Handle Blob (convert to URL)
      const objectURL = URL.createObjectURL(source);
      img.src = objectURL;

      // Clean up the object URL after the image is loaded
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const aspectRatio = width / height;
        resolve({ width, height, aspectRatio });
        URL.revokeObjectURL(objectURL); // Free memory
      };
    } else if (source instanceof ArrayBuffer) {
      // Handle ArrayBuffer (convert to Blob, then URL)
      const blob = new Blob([source]);
      const objectURL = URL.createObjectURL(blob);
      img.src = objectURL;

      // Clean up the object URL after the image is loaded
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const aspectRatio = width / height;
        resolve({ width, height, aspectRatio });
        URL.revokeObjectURL(objectURL); // Free memory
      };
    } else {
      reject(
        new Error(
          "Invalid source type. Must be a string, Blob, or ArrayBuffer."
        )
      );
    }
  });
};
