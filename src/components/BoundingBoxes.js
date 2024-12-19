import { Box, Typography } from "@mui/material";

export default function BoundingBoxes({ boundingBoxes, imageDimensions }) {

  let parsed = boundingBoxes;
  if(typeof boundingBoxes === "string"){
    let cleanedString = boundingBoxes.trim();
    if(cleanedString.startsWith('```json')) {
      cleanedString = cleanedString.slice(7);
    }
    cleanedString = cleanedString.trim();
    if(cleanedString.endsWith('```')) {
      cleanedString = cleanedString.slice(0, -3);
    }
    cleanedString = cleanedString.trim();

    try {
      parsed = JSON.parse(cleanedString)?.boundingBoxes;

    } catch (error) {
      console.error("Error parsing bounding boxes:", error);
    }
  }

  return (
    <div style={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 1,
      pointerEvents: 'none'
    }}>
      {parsed?.map((component, index) => {

        const {component: componentName, bounds: box} = component;

        const xPercent = box.x;
        const yPercent = box.y;
        const widthPercent = box.width;
        const heightPercent = box.height;

        return (
          <Box
            key={index}
            sx={{
              position: 'absolute',
              left: `${xPercent}%`,
              top: `${yPercent}%`,
              width: `${widthPercent}%`,
              height: `${heightPercent}%`,
              border: '2px solid red',
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          >
            <Typography variant="caption"  sx={{
              position: 'absolute',
              [yPercent > 5 ? "top":"bottom"]: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
              fontWeight: "bold",
              backgroundColor: "red",
              color: "white",
              borderRadius: "4px",
              px: "2px",
              fontSize: "0.6rem"
            }}>
              {componentName}
            </Typography>
          </Box>
        );
      })}
    </div>
  );
}
