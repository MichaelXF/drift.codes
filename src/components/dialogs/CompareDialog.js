import {
  ArrowDownward,
  CloseOutlined,
  InfoOutlined,
  OpenInNew,
  Send,
  StopCircle,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField,
  Typography,
  Link,
  Backdrop,
  IconButton,
  Stack,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import {
  RiCornerLeftDownFill,
  RiCornerRightDownLine,
  RiGeminiLine,
  RiSparklingLine,
} from "react-icons/ri";

export default function CompareDialog({
  screenshot,
  open,
  onClose,
  onConfirm,
}) {
  const inputRef = useRef();
  const [generating, setGenerating] = useState(false);

  function sendMessageFromEvent() {
    onConfirm(inputRef.current.value);

    inputRef.current.value = "";
  }

  useEffect(() => {
    inputRef.current.value = "";
    const callback = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", callback);
    return () => {
      window.removeEventListener("keydown", callback);
    };
  }, []);

  return (
    <Backdrop
      open={open}
      onClose={onClose}
      sx={(theme) => ({ zIndex: theme.zIndex.drawer + 1 })}
    >
      <Box position="absolute" top="16px" right="16px">
        <IconButton onClick={onClose}>
          <CloseOutlined />
        </IconButton>
      </Box>
      <Box
        minWidth="60vw"
        maxWidth="90vw"
        width="100%"
        p={2}
        textAlign="center"
      >
        <Typography variant="h5">Compare Images</Typography>

        <Stack
          direction="row"
          spacing={4}
          alignItems="center"
          width="100%"
          justifyContent="center"
          sx={{ mt: 4 }}
        >
          <Box>
            <img
              src={screenshot?.originalImage.url}
              alt="Screenshot"
              style={{
                maxWidth: "40vw",
                borderRadius: "6px",
                boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
              }}
            />
          </Box>

          <Box>
            <img
              src={screenshot?.revisionImage.url}
              alt="Screenshot"
              style={{
                maxWidth: "40vw",
                borderRadius: "6px",
                boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
              }}
            />
          </Box>
        </Stack>

        <Box maxWidth="950px" px={10} width="100%" mx="auto" mt={6}>
          <Typography variant="body1" gutterBottom>
            <RiCornerLeftDownFill style={{ marginBottom: "-3px" }} /> Prompt the
            AI to generate a comparison image by sending a message.
          </Typography>

          <Stack direction="row" spacing={2}>
            <TextField
              autoFocus={true}
              placeholder="Send a message"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  sendMessageFromEvent();

                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              inputRef={inputRef}
              multiline
              maxRows={10}
              sx={{
                maxWidth: "100%",
                width: "100%",

                "& > .MuiOutlinedInput-root": {
                  bgcolor: "divider_opaque",
                },

                "& > .MuiInputBase-formControl > .MuiOutlinedInput-notchedOutline, & > .MuiInputBase-formControl:hover:not(:focus-within) > .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor: "divider",
                    transition: "border-color 0.2s ease",
                  },
              }}
              size="small"
              variant="outlined"
              InputProps={{
                sx: {
                  bgcolor: "divider_opaque",
                },
                startAdornment: (
                  <InputAdornment position="start">
                    <RiSparklingLine />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        sendMessageFromEvent();
                      }}
                    >
                      {generating ? (
                        <StopCircle className="blinking" />
                      ) : (
                        <Send />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </Box>
      </Box>
    </Backdrop>
  );
}
