import {
  InfoOutlined,
  KeyboardArrowDown,
  KeyboardArrowUp,
  OpenInNew,
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
  MenuItem,
  Menu,
  Stack,
} from "@mui/material";
import { useEffect, useState } from "react";
import { RiGeminiLine } from "react-icons/ri";

export default function APIKeyDialog({
  apiKeys,
  selectedModel,
  open,
  onClose,
  onUpdateAPIKey,
}) {
  const [apiKey, setApiKey] = useState(apiKeys[selectedModel]);

  useEffect(() => {
    setApiKey(apiKeys[selectedModel] || "");
  }, [selectedModel]);

  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Welcome!</DialogTitle>

      <DialogContent>
        <Typography mb={4}>
          Welcome to drift.codes! Please enter your Gemini API key to get
          started.
          <br />
          <Link href="https://aistudio.google.com/apikey" target="_blank">
            Get your API Key here!
            <OpenInNew sx={{ mb: "-3px", ml: "3px" }} />
          </Link>
        </Typography>

        <Stack direction="row" width="100%">
          <TextField
            label="API Key"
            placeholder="API Key"
            variant="filled"
            type="password"
            key={selectedModel}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <RiGeminiLine />
                </InputAdornment>
              ),
            }}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
            }}
            fullWidth
            sx={{ width: "100%", mr: 2 }}
            autoFocus={true}
          />
          <Button
            id="basic-button"
            aria-controls={menuOpen ? "basic-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={menuOpen ? "true" : undefined}
            onClick={handleClick}
            sx={{
              ml: "auto",
              flexShrink: 0,
              minWidth: "170px",
            }}
            size="small"
            endIcon={menuOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          >
            Model: {selectedModel}
          </Button>
          <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleClose}
            MenuListProps={{
              "aria-labelledby": "basic-button",
            }}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "center",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "center",
            }}
          >
            {["Gemini", "Anthropic", "OpenAI"].map((model) => (
              <MenuItem
                key={model}
                onClick={() => {
                  var modelName = model.toLowerCase();
                  onUpdateAPIKey(modelName, apiKeys[modelName]);

                  handleClose();
                }}
              >
                {model}
              </MenuItem>
            ))}
          </Menu>
        </Stack>

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
            onUpdateAPIKey(selectedModel, apiKey);
            onClose();
          }}
        >
          Confirm API Key
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
