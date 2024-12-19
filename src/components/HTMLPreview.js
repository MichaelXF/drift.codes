import { Box } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";

const HTMLPreview = ({
  html,
  iframeRef,
  sx,
  interactive,
  onElementChanged,
  selectedNode,
  htmlCleanupRef,
  onElementContextMenu,
}) => {
  const [iframeUrl, setIframeUrl] = useState("");

  const hoveredElementRef = useRef(null);
  const selectedNodeRef = useRef(selectedNode);
  const prevSelectedNodeRef = useRef(null);
  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;

  htmlCleanupRef.current = function (toggle) {
    // remove selected styling from the selected node
    if (selectedNodeRef.current) {
      if (toggle) {
        applySelectedStyling(selectedNodeRef.current);
      } else {
        resetElementStyling(selectedNodeRef.current);
      }
    }
  };

  useEffect(() => {
    let blobUrl;
    if (html) {
      const blob = new Blob([html], { type: "text/html" });
      blobUrl = URL.createObjectURL(blob);
      setIframeUrl(blobUrl);
    }
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [html]);

  // Keep selectedNodeRef in sync with the prop
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
    updateElementStyling();
  }, [selectedNode]); // when parent updates selection, re-style

  function updateInteractive() {
    if (iframeRef && iframeRef.current) {
      const doc = iframeRef.current.querySelector("iframe")?.contentDocument;
      if (doc) {
        if (interactive) {
          doc.documentElement.style.overflow = "auto";
          doc.body.style.overflow = "auto";
        } else {
          doc.documentElement.style.overflow = "hidden";
          doc.body.style.overflow = "hidden";
        }
      }
    }
  }

  // Styling helpers
  const resetElementStyling = (el) => {
    if (el && el.nodeType === Node.ELEMENT_NODE) {
      el.style.boxShadow = "";
      el.style.backgroundColor = "";
    }
  };

  const applyHoverStyling = (el) => {
    if (el && el.nodeType === Node.ELEMENT_NODE) {
      el.style.boxShadow = "0 0 2px rgba(255,0,0,1)";
      el.style.backgroundColor = "";
    }
  };

  const applySelectedStyling = (el) => {
    if (el && el.nodeType === Node.ELEMENT_NODE) {
      el.style.boxShadow = "0 0 4px rgba(255,0,0,1)";
      el.style.backgroundColor = "rgba(255,0,0,0.1)";
    }
  };

  const updateElementStyling = () => {
    if (!iframeRef || !iframeRef.current) return;
    const iframe = iframeRef.current.querySelector("iframe");
    const doc = iframe?.contentDocument;
    if (!doc) return;

    const hovered = hoveredElementRef.current;
    const selected = selectedNodeRef.current;
    const prevSelected = prevSelectedNodeRef.current;

    // If selection changed, clean up old selected if needed
    if (prevSelected && prevSelected !== selected && prevSelected !== hovered) {
      resetElementStyling(prevSelected);
    }

    // Apply selected styling if we have a selected node
    if (selected) {
      // Ensure selected node is styled as selected
      applySelectedStyling(selected);
    }

    // Handle hovered element
    // If hovered is selected, it already has selected styling
    if (hovered && hovered !== selected) {
      // hovered is different from selected, so give it hover styling
      // First reset it to ensure a clean slate
      resetElementStyling(hovered);
      applyHoverStyling(hovered);
    } else if (hovered && hovered === selected) {
      // hovered and selected are the same; do nothing special
      // selected styling is already applied
    }

    prevSelectedNodeRef.current = selected;
  };

  const handleIframeMouseMove = (e) => {
    if (!interactiveRef.current) return;

    const target = e.target;
    const prevHovered = hoveredElementRef.current;
    const selected = selectedNodeRef.current;

    if (target !== prevHovered) {
      // If we had a previously hovered element that's not selected, reset it
      if (prevHovered && prevHovered !== selected) {
        resetElementStyling(prevHovered);
      }
      hoveredElementRef.current = target;
      updateElementStyling();
    }
  };

  const handleIframeClick = (e) => {
    if (!interactiveRef.current) return;
    const target = e.target;
    const selected = selectedNodeRef.current;

    if (target === selected) {
      // Clicking the currently selected node again => deselect
      if (typeof onElementChanged === "function") {
        onElementChanged(null);
      }
    } else {
      // Selecting a new node
      if (typeof onElementChanged === "function") {
        onElementChanged(target);
      }
    }
  };

  const handleIframeContextMenu = (e) => {
    if (!interactiveRef.current) return;

    e.preventDefault();
    const hovered = hoveredElementRef.current;
    if (!hovered) return;

    const containerRect = iframeRef.current.getBoundingClientRect();

    onElementContextMenu({
      node: hovered,
      x: e.clientX + containerRect.x,
      y: e.clientY + containerRect.y,
    });
  };

  const handleIframeLoad = () => {
    updateInteractive();
    if (iframeRef && iframeRef.current) {
      const iframe = iframeRef.current.querySelector("iframe");
      const doc = iframe?.contentDocument;
      if (doc) {
        doc.addEventListener("contextmenu", handleIframeContextMenu);
        doc.addEventListener("mousemove", handleIframeMouseMove);
        doc.addEventListener("click", handleIframeClick);
      }

      // Get the iframe's document object
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

      // Create a new link element
      const link = iframeDoc.createElement("link");
      link.rel = "stylesheet";
      link.href = "http://localhost:3000/preview/remixicon/remixicon.css";

      // Append the link element to the iframe's documentElement
      iframeDoc.head.appendChild(link);
    }
  };

  useEffect(() => {
    updateInteractive();
  }, [interactive]);

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      if (iframeRef && iframeRef.current) {
        const doc = iframeRef.current.querySelector("iframe")?.contentDocument;
        if (doc) {
          doc.removeEventListener("contextmenu", handleIframeContextMenu);
          doc.removeEventListener("mousemove", handleIframeMouseMove);
          doc.removeEventListener("click", handleIframeClick);
        }
      }
    };
  }, []);

  return (
    <Box
      ref={iframeRef}
      sx={sx}
      onMouseLeave={() => {
        if (hoveredElementRef.current) {
          if (hoveredElementRef.current !== selectedNodeRef.current) {
            resetElementStyling(hoveredElementRef.current);
          }
          hoveredElementRef.current = null;
        }
      }}
    >
      <iframe
        src={iframeUrl}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          background: "#fff",
        }}
        title="HTML Preview"
        draggable={false}
        onLoad={handleIframeLoad}
        sandbox="allow-scripts allow-same-origin"
      />
    </Box>
  );
};

export default HTMLPreview;
