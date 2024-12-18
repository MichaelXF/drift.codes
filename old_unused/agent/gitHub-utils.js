// Import JSZip and idb libraries
import JSZip from "jszip";
import { openDB } from "idb";
import { DriftCodesIndexedDBPrefix } from "../../src/constants";

// Function to download, unzip, and store files
export async function downloadAndStoreRepo(owner, repo, branch = "main") {
  const zipUrl = `http://github.com/${owner}/${repo}/zipball/master/`;
  const projectName = `${owner}-${repo}-${branch}`;

  try {
    // Step 1: Download the ZIP file
    const response = await fetch(
      "http://localhost:3001/download/?url=" + encodeURIComponent(zipUrl)
    );
    if (!response.ok)
      throw new Error(`Failed to download repo: ${response.statusText}`);
    const zipBlob = await response.blob();

    console.log("hi");

    // Step 2: Unzip the file
    const jszip = new JSZip();
    const zip = await jszip.loadAsync(zipBlob);
    const files = Object.keys(zip.files);
    const rootDir = files[0].split("/", 2)[0];

    // Step 3: Open IndexedDB
    const db = await openDB(DriftCodesIndexedDBPrefix + projectName, 1, {
      upgrade(db) {
        // Create an object store for files
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "path" });
        }
      },
    });

    // Step 4: Store files in IndexedDB
    for (const fileName of files) {
      const file = zip.files[fileName];
      if (!file.dir) {
        const fileContent = await file.async("blob"); // Get file content as Blob

        const trimmedFileName = fileName.replace(rootDir + "/", "");

        await db.put("files", { path: trimmedFileName, content: fileContent });
        console.log(`Stored: ${trimmedFileName}`);
      }
    }

    console.log("All files stored in IndexedDB!");
  } catch (error) {
    console.error("Error:", error);
  }

  return projectName;
}

export function parseGitHubURL(url) {
  const regex = /^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/;
  const match = url.match(regex);

  if (!match) {
    throw new Error("Invalid GitHub URL");
  }

  const [, owner, repo, branch] = match;
  return {
    owner,
    repo,
    branch: branch || "main", // Default to "main" if no branch is specified
  };
}
