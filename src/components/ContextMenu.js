import React, { useState } from "react";
import { Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import DeleteIcon from "@mui/icons-material/Delete";

export default function ContextMenuExample({
  contextMenu,
  onClose,
  onViewCode,
  onDeleteNode,
}) {
  const handleViewInCode = () => {
    onViewCode(contextMenu.node);
  };

  const handleTargetForAI = () => {
    console.log("Target element for AI prompt clicked.");
    onClose();
  };

  const handleDeleteNode = () => {
    onDeleteNode(contextMenu.node);
  };

  return (
    <Menu
      open={contextMenu !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        contextMenu !== null
          ? { top: contextMenu.y, left: contextMenu.x }
          : undefined
      }
      PaperProps={{
        style: {
          boxShadow: "rgba(0, 0, 0, 0.2) 0px 3px 8px",
        },
      }}
    >
      <MenuItem onClick={handleViewInCode}>
        <ListItemIcon>
          <CodeIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>View in code</ListItemText>
      </MenuItem>

      <MenuItem onClick={handleTargetForAI}>
        <ListItemIcon>
          <SmartToyIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Target element for AI prompt</ListItemText>
      </MenuItem>

      <MenuItem onClick={handleDeleteNode}>
        <ListItemIcon>
          <DeleteIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Delete node</ListItemText>
      </MenuItem>
    </Menu>
  );
}
