import { Box, CircularProgress, Fade } from "@mui/material";
import { useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { LocalStorageKeys } from "../constants";
import IntroPage from "../components/IntroPage";
import EditorPage from "../components/EditorPage";

const { GoogleAIFileManager } = require("@google/generative-ai/server");

export default function PageHome() {
  var [file, setFile] = useState();
  var [imageURL, setImageURL] = useState();
  var [page, setPage] = useState(file ? "editor" : "intro");
  var [apiKey, setApiKey] = useLocalStorage(
    LocalStorageKeys.DriftCodesGeminiAPIKey,
    ""
  );

  /**
   * Uploads the given file to Gemini.
   *
   * See https://ai.google.dev/gemini-api/docs/prompting_with_media
   */
  async function uploadToGemini(arrayBuffer, displayName, mimeType) {
    setPage("loading");

    const fileManager = new GoogleAIFileManager(apiKey);

    const uploadResult = await fileManager.uploadFile(arrayBuffer, {
      mimeType,
      displayName: displayName,
    });
    const file = uploadResult.file;

    console.log(`Uploaded file ${file.displayName} as: ${file.name}`);

    // Convert the ArrayBuffer to a Blob
    const blob = new Blob([arrayBuffer], { type: mimeType });

    // Create an Object URL for the Blob
    const imageUrl = URL.createObjectURL(blob);

    setImageURL(imageUrl);

    setFile(file);
    setPage("editor");
  }

  return (
    <Box>
      <Fade in={page === "loading"} unmountOnExit timeout={500}>
        <Box
          width="100vw"
          height="100vh"
          position="absolute"
          top={0}
          left={0}
          right={0}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          zIndex="2"
        >
          <CircularProgress />
        </Box>
      </Fade>

      <Fade
        in={page === "intro"}
        unmountOnExit
        timeout={{ enter: 2000, exit: 500 }}
      >
        <Box>
          <IntroPage
            hasAPIKey={!!apiKey}
            onUpdateAPIKey={(apiKey) => {
              setApiKey(apiKey);
            }}
            onStart={(file) => {
              uploadToGemini(file.arrayBuffer, file.fileName, file.mimeType);
            }}
          />
        </Box>
      </Fade>

      <Fade in={page === "editor"} unmountOnExit timeout={500}>
        <Box>
          <EditorPage apiKey={apiKey} file={file} imageURL={imageURL} />
        </Box>
      </Fade>
    </Box>
  );
}
