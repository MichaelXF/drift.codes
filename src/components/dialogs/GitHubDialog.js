import { InfoOutlined, OpenInNew } from "@mui/icons-material";
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
} from "@mui/material";
import { useState } from "react";
import { RiGeminiLine, RiGithubLine } from "react-icons/ri";

export default function GitHubDialog({ open, onClose, onConfirm }) {
  const [url, setUrl] = useState("");

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>GitHub</DialogTitle>

      <DialogContent>
        <Typography mb={4}>
          Please enter the GitHub repository URL to get started.
        </Typography>

        <TextField
          label="GitHub URL"
          placeholder="GitHub URL"
          variant="filled"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <RiGithubLine />
              </InputAdornment>
            ),
          }}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
          }}
          fullWidth
          sx={{ width: "100%" }}
        />

        <Box mt={4} typography="body2" color="text.secondary">
          <Typography variant="inherit">
            <InfoOutlined
              sx={{ fontSize: "0.9rem", mb: "-2.25px", mr: "4px" }}
            />
            Free key: This 'free-tier' API Key is granted{" "}
            <Link href="https://ai.google.dev/pricing#1_5flash" target="_blank">
              1,500 requests per day
              <OpenInNew sx={{ mb: "-3px", ml: "2px" }} />
            </Link>
            ! There will be no charges will be made to your account.
          </Typography>

          <Typography variant="inherit" mt={2}>
            <InfoOutlined
              sx={{ fontSize: "0.9rem", mb: "-2.25px", mr: "4px" }}
            />
            Secure key: Your Gemini API key is isolated to Gemini. It cannot
            access your Google account in any way.
          </Typography>

          <Typography variant="inherit" mt={2}>
            <InfoOutlined
              sx={{ fontSize: "0.9rem", mb: "-2.25px", mr: "4px" }}
            />
            Open-source: Drift.codes is 100% open source, meaning theres no
            shenanigans or hidden code. You can view the source code on GitHub.
            Or run it yourself.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={() => {
            onConfirm(url);
          }}
        >
          Clone Repository
        </Button>

        <Button
          onClick={() => {
            onClose();
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
