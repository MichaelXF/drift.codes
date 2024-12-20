import { Box, CircularProgress, Fade, IconButton, Link } from "@mui/material";
import { useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { LocalStorageKeys } from "../constants";
import IntroPage from "../components/IntroPage";
import EditorPage from "../components/EditorPage";
import GeminiModel from "../models/GeminiModel";
import AnthropicModel from "../models/AnthropicModel";
import OpenAIModel from "../models/OpenAIModel";
import { RiGithubLine } from "react-icons/ri";

const { GoogleAIFileManager } = require("@google/generative-ai/server");

export default function PageHome() {
  var [file, setFile] = useState();
  var [imageURL, setImageURL] = useState();
  var [page, setPage] = useState(file ? "editor" : "intro");
  var [apiKeys, setApiKeys] = useLocalStorage(
    LocalStorageKeys.DriftCodesAPIKeys,
    {}
  );
  var [selectedModel, setSelectedModel] = useLocalStorage(
    LocalStorageKeys.DriftCodesSelectedModel,
    "gemini"
  );

  var [model, setModel] = useState(null);

  useEffect(() => {
    if (apiKeys && selectedModel) {
      const apiKey = apiKeys[selectedModel];
      if (apiKey) {
        if (selectedModel === "gemini") {
          setModel(new GeminiModel(apiKey));
        } else if (selectedModel === "anthropic") {
          setModel(new AnthropicModel(apiKey));
        } else if (selectedModel === "openai") {
          setModel(new OpenAIModel(apiKey));
        } else {
          alert("Please select a model");
        }
      }
    }
  }, [apiKeys, selectedModel]);

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
          <Box position="absolute" right="16px" top="16px" zIndex="10">
            <IconButton
              component={Link}
              href="https://github.com/MichaelXF/drift.codes"
              target="_blank"
              size="small"
              sx={{
                color: "text.secondary",
                cursor: "pointer",
              }}
            >
              <RiGithubLine />
            </IconButton>
          </Box>

          <IntroPage
            apiKeys={apiKeys}
            selectedModel={selectedModel}
            onUpdateAPIKey={(model, apiKey) => {
              setSelectedModel(model);
              setApiKeys((keys) => {
                return { ...keys, [model]: apiKey };
              });
            }}
            onStart={(file) => {
              setFile({
                blob: file.arrayBuffer,
                displayName: file.fileName,
                mimeType: file.mimeType,
              });

              // Convert the ArrayBuffer to a Blob
              const blob = new Blob([file.arrayBuffer], {
                type: file.mimeType,
              });

              // Create an Object URL for the Blob
              const imageUrl = URL.createObjectURL(blob);

              setImageURL(imageUrl);

              setPage("editor");
            }}
          />
        </Box>
      </Fade>

      <Fade in={page === "editor"} unmountOnExit timeout={500}>
        <Box>
          <EditorPage
            model={model}
            file={file}
            imageURL={imageURL}
            changePage={(newPage) => setPage(newPage)}
          />
        </Box>
      </Fade>
    </Box>
  );
}
