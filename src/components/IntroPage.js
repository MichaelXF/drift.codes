import { Box, Button, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { LocalStorageKeys } from "../constants";
import { Api, KeyboardArrowRight } from "@mui/icons-material";
import { openFilePicker } from "../utils/file-utils";
import APIKeyDialog from "./dialogs/APIKeyDialog";

// Animate the arrow icons on hover
export const animateIconSx = {
  px: "20px",
  "& .MuiButton-icon": {
    pl: "10px",
    transform: "translateX(0px)",
    transition: "transform 0.2s",
  },
  "&:hover": {
    "& .MuiButton-icon": {
      transform: "translateX(4px)",
    },
  },
};

export default function IntroPage({
  apiKeys,
  selectedModel,
  onStart,
  onUpdateAPIKey,
}) {
  const hasAPIKey = !!apiKeys[selectedModel];
  const [showAPIKeyDialog, setShowAPIKeyDialog] = useState(false);

  return (
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
    >
      <APIKeyDialog
        open={showAPIKeyDialog}
        onClose={() => {
          setShowAPIKeyDialog(false);
        }}
        selectedModel={selectedModel}
        apiKeys={apiKeys}
        onUpdateAPIKey={(model, apiKey) => {
          onUpdateAPIKey(model, apiKey);
        }}
      />

      <Box textAlign="center" maxWidth="900px" width="100%" p={10} mx="auto">
        <Typography variant="h2" mb={4}>
          Welcome to drift.codes!
        </Typography>

        <Typography fontSize="1.125rem" color="text.secondary" mb={2}>
          Drift is an proof-of-concept AI Agent tool that can code entire
          TailwindCSS pages for you using Google Gemini's Vision capabilities.{" "}
          <br />
        </Typography>

        <Box maxWidth="700px" px={8} mx="auto" width="100%" mt={4}>
          {[
            "I can reiterate the design on my own, and you can provide feedback for specific elements along the way.",
            "I am completely free to use thanks to Gemini API free tier.",
            "I am a proof-of-concept demo, you shouldn't expect perfect results.",
          ].map((item, i) => {
            return (
              <Box
                display="flex"
                justifyContent="flex-start"
                textAlign="left"
                mb={2}
                key={i}
                width="100%"
              >
                <Box
                  sx={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    backgroundColor: "primary.alpha",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "primary.main",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    flexShrink: 0,
                    flexGrow: 0,
                  }}
                >
                  {i + 1}.
                </Box>

                <Typography ml={4} fontSize="1.125rem" color="text.secondary">
                  {item}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Stack
          mt={4}
          direction="row"
          spacing={2}
          justifyContent="center"
          width="100%"
        >
          <Button
            size="large"
            endIcon={<KeyboardArrowRight />}
            sx={animateIconSx}
            onClick={() => {
              setShowAPIKeyDialog(true);
            }}
          >
            {!hasAPIKey ? "Add" : "Edit"} {selectedModel || "Gemini"} API Key
          </Button>

          {hasAPIKey && (
            <Button
              size="large"
              endIcon={<KeyboardArrowRight />}
              sx={animateIconSx}
              onClick={() => {
                openFilePicker()
                  .then((file) => {
                    onStart(file);
                  })
                  .catch((err) => {});
              }}
              disabled={!hasAPIKey}
            >
              Upload Image
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
