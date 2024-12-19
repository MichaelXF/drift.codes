import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Box } from "@mui/material";
import { multiply } from "../utils/color-utils";

const allowOutsideImageBox = false;

const Screenshot = ({
  onScreenshot,
  active,
  originalImageRef,
  iframeRef,
  htmlCleanupRef,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPoint, setCurrentPoint] = useState({ x: 0, y: 0 });
  const [overlayBox, setOverlayBox] = useState(null);

  useEffect(() => {
    if (!active) return;
    let dragStart;

    const handleMouseDown = (e) => {
      if (e.button !== 0) return;

      // Only check image bounds if allowOutsideImageBox is true
      if (!allowOutsideImageBox) {
        const imageEl = originalImageRef.current;
        if (!imageEl) return;

        const rect = imageEl.getBoundingClientRect();
        const padding = 40;

        if (
          e.pageX < -padding + rect.left + window.scrollX ||
          e.pageX > padding + rect.right + window.scrollX ||
          e.pageY < -padding + rect.top + window.scrollY ||
          e.pageY > padding + rect.bottom + window.scrollY
        ) {
          return;
        }
      }

      dragStart = performance.now();
      setIsDragging(true);

      // Only constrain if allowOutsideImageBox is true
      const mouse = !allowOutsideImageBox
        ? constrainMouse([e.pageX, e.pageY])
        : [e.pageX, e.pageY];

      setStartPoint({ x: mouse[0], y: mouse[1] });
      setOverlayBox({
        x: mouse[0],
        y: mouse[1],
        width: 0,
        height: 0,
      });
    };

    const constrainMouse = (mouse) => {
      /**
       * @type {HTMLImageElement}
       */
      const imageEl = originalImageRef.current;
      if (!imageEl) return;
      const rect = imageEl.getBoundingClientRect();

      mouse[0] = Math.max(rect.left, Math.min(rect.right, mouse[0]));
      mouse[1] = Math.max(rect.top, Math.min(rect.bottom, mouse[1]));

      return mouse;
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setCurrentPoint({ x: e.pageX, y: e.pageY });

      // Only constrain if allowOutsideImageBox is true
      const mouse = !allowOutsideImageBox
        ? constrainMouse([e.pageX, e.pageY])
        : [e.pageX, e.pageY];

      const x = Math.min(startPoint.x, mouse[0]);
      const y = Math.min(startPoint.y, mouse[1]);
      const width = Math.abs(startPoint.x - mouse[0]);
      const height = Math.abs(startPoint.y - mouse[1]);

      setOverlayBox({ x, y, width, height });
    };

    const handleMouseUp = async () => {
      if (!isDragging || !overlayBox) return;
      setIsDragging(false);

      function cancel() {
        setOverlayBox(null); // Remove overlay
        setIsDragging(false);
      }

      const duration = performance.now() - dragStart;
      if (duration < 1000) {
        return cancel();
      }

      const { x, y, width, height } = overlayBox;

      if (width < 10 || height < 10) {
        return cancel();
      }

      let patchedImage;

      function patchIframe(ignoreElements) {
        return new Promise((resolve, reject) => {
          const iframe = iframeRef.current.children[0];

          // Access the iframe's content document
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow.document;

          html2canvas(iframeDoc.body, {
            x: 0,
            y: 0,
            width: iframe.clientWidth,
            height: iframe.clientHeight,
            useCORS: true,
            allowTaint: false,
          }).then((canvas) => {
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);

                const image = document.createElement("img");
                image.src = url;
                image.style.width = "100%";
                image.style.height = "100%";
                image.style.position = "absolute";
                image.style.top = "0";
                image.style.left = "0";
                image.style.zIndex = "500";

                iframeRef.current.appendChild(image);

                patchedImage = image;

                resolve();
              }
            });
          });
        });
      }

      function takeScreenshot(setupWork, ignoreElements) {
        return new Promise((resolve, reject) => {
          setupWork();

          // Capture the screenshot

          html2canvas(document.body, {
            x,
            y,
            width,
            height,
            ignoreElements: (element) => ignoreElements.includes(element),
            allowTaint: true,
          }).then((canvas) => {
            canvas.toBlob((blob) => {
              if (blob) {
                resolve({
                  blob,
                  url: URL.createObjectURL(blob),
                });
              }
            });
          });
        });
      }

      const overlayEl = overlayBoxRef.current;

      overlayEl.style.opacity = 0;

      const imageEl = iframeRef.current;

      // Take a screenshot of the original Image
      const originalOpacity = imageEl.style.opacity;
      htmlCleanupRef.current?.(false);

      const originalImage = await takeScreenshot(() => {}, [
        overlayEl,
        imageEl,
      ]);

      // Patch the iframe, this screenshots the iframe, then screenshots as if it was placed in the body
      await patchIframe([overlayEl]);

      htmlCleanupRef.current?.(true);

      // Take a screenshot of the iframe
      const revisionImage = await takeScreenshot(() => {
        imageEl.style.opacity = 1;
      }, [overlayEl]);

      patchedImage.remove();
      imageEl.style.opacity = originalOpacity;
      overlayEl.style.opacity = 1;

      onScreenshot({
        originalImage: originalImage,
        revisionImage: revisionImage,
        width: width,
        height: height,
      });

      setOverlayBox(null); // Remove overlay
    };

    const handleKeyDown = (e) => {
      if (isDragging && e.key === "Escape") {
        setIsDragging(false);
        setOverlayBox(null); // Cancel overlay
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDragging, startPoint, overlayBox, active]);

  useEffect(() => {
    if (!active) {
      setIsDragging(false);
      setOverlayBox(null);
    }
  }, [!!active]);

  const overlayBoxRef = useRef();

  return (
    <>
      {overlayBox && (
        <Box
          ref={overlayBoxRef}
          sx={{
            position: "absolute",
            top: `${overlayBox.y}px`,
            left: `${overlayBox.x}px`,
            width: `${overlayBox.width}px`,
            height: `${overlayBox.height}px`,
            border: "2px dashed",
            borderColor: "primary.main",
            backgroundColor: (theme) =>
              multiply(theme.palette.primary.main, 0.4),
            borderRadius: "6px",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        />
      )}
    </>
  );
};

export default Screenshot;
