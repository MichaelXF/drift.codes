import * as React from "react";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContentText from "@mui/material/DialogContentText";
import { Box } from "@mui/material";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";

export default function ZoomMenu({ value, onChange }) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [customDialogOpen, setCustomDialogOpen] = React.useState(false);
  const [customValue, setCustomValue] = React.useState("");
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuSelect = (zoomValue) => {
    onChange(zoomValue);
    handleClose();
  };

  const handleCustomClick = () => {
    setCustomDialogOpen(true);
    handleClose();

    setTimeout(() => {
      if (customRef.current) {
        customRef.current.focus();
      }
    }, 16);
  };

  const handleCustomClose = () => {
    setCustomDialogOpen(false);
    setCustomValue("");
  };

  const handleCustomSubmit = () => {
    const intValue = parseInt(customValue, 10);
    if (!isNaN(intValue)) {
      onChange(intValue);
    }
    handleCustomClose();
  };

  const customRef = React.useRef();

  return (
    <Box>
      <Button
        id="zoom-button"
        aria-controls={open ? "zoom-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        variant="inherit"
        sx={{
          textTransform: "none",
          fontWeight: "normal",
          height: "36px",
          mr: -1,
        }}
        endIcon={open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
      >
        {value === "auto" ? "Auto" : parseInt(value) + "%"}
      </Button>
      <Menu
        id="zoom-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "zoom-button",
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
        <MenuItem onClick={() => handleMenuSelect("auto")}>Auto</MenuItem>

        {[115, 100, 75, 50].map((zoom) => (
          <MenuItem key={zoom} onClick={() => handleMenuSelect(zoom)}>
            {zoom}%
          </MenuItem>
        ))}

        <MenuItem onClick={handleCustomClick}>Custom</MenuItem>
      </Menu>

      <Dialog open={customDialogOpen} onClose={handleCustomClose}>
        <DialogTitle>Enter Custom Zoom</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please enter a custom zoom percentage value.
          </DialogContentText>
          <TextField
            autoFocus={true}
            margin="dense"
            label="Zoom Percentage"
            type="number"
            fullWidth
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            inputRef={customRef}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCustomClose}>Cancel</Button>
          <Button onClick={handleCustomSubmit}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
