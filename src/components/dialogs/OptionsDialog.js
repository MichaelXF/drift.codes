import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useRef, useState } from "react";

export default function OptionsDialog({ open, onClose, options, setOptions }) {
  var [proposedOptions, setProposedOptions] = useState(null);

  // Avoid using useEffect() to avoid delayed state rendering
  // First render would have stale data, initializing OptionComponents to behave incorrectly
  const openRef = useRef(false);

  // I tried everything to avoid this, but it seems like the only way
  if (open && !openRef.current) {
    let value = { ...options };

    proposedOptions = value;
    openRef.current = value;

    setProposedOptions(value);
  } else if (!open) {
    openRef.current = false;
  }

  // In development, React rerenders twice
  // This is a workaround to ensure the correct state is set
  if (open && proposedOptions === null) {
    proposedOptions = openRef.current;
  }

  const saveChanges = () => {
    var value = { ...proposedOptions };
    delete value.preset; // This is now a 'custom' preset
    delete value.error; // Delete any error messages
    setOptions(value);
    setProposedOptions(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: "bold" }}>Options</DialogTitle>

      <DialogContent>Options</DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={saveChanges}>Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
}
