import React, { useState } from "react";
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Icon,
} from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import DeleteIcon from "@mui/icons-material/Delete";
import { RiSparklingLine } from "react-icons/ri";

export default function ContextMenuExample({
  contextMenu,
  onClose,
  onViewCode,
  onDeleteNode,
  onSelectNode,
}) {
  const handleViewInCode = () => {
    onViewCode(contextMenu.node);
  };

  const handleTargetForAI = () => {
    onSelectNode(contextMenu.node);
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
          <Icon component={RiSparklingLine} fontSize="small" />
        </ListItemIcon>
        <ListItemText>Retouch with AI</ListItemText>
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
