import { useTheme } from "@emotion/react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Fade,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { rgbToHex } from "../utils/color-utils";

import { RiAiGenerate, RiBrushAiLine, RiSparkling2Line } from "react-icons/ri";
import HTMLPreview from "./HTMLPreview";
import { getImageDimensions } from "../utils/file-utils";
import Screenshot from "./Screenshot";
import CompareDialog from "./dialogs/CompareDialog";
import ContextMenuExample from "./ContextMenu";
import { Link } from "react-router-dom";
import BoundingBoxes from "./BoundingBoxes";
import { AspectRatio, Close, OpenInNew } from "@mui/icons-material";
import { debounce } from "../utils/react-utils";
import ChatPopover from "./js-confuser-ai/components/ChatPopover";

export default function EditorPage({ model, file, imageURL, changePage }) {
  const ref = useRef();
  const [page, setPage] = useState("preview");

  const [generating, setGenerating] = useState(false);
  const [imageDimensions, setImageDimensions] = useState();
  const [selectedNode, setSelectedNode] = useState();
  const [answers, setAnswers] = useState();
  const [currentResponse, setCurrentResponse] = useState();
  const [fullScreenMode, setFullScreenMode] = useState(false);
  const [followAspectRatio, setFollowAspectRatio] = useState(true);

  const [showChatPopover, setShowChatPopover] = useState(false);

  useEffect(() => {
    if (!imageURL) return;

    async function loadDimensions() {
      setImageDimensions(await getImageDimensions(imageURL));
    }

    loadDimensions();
  }, [imageURL]);

  const htmlCleanupRef = useRef();

  async function chatSessionSendMessage({
    message,
    files = [],
    onNewPart = () => {},
  }) {
    setGenerating(true);
    const response = await model.sendMessageStream(message, ...files);
    let fullResponse = "";

    setCurrentResponse("Loading...");

    for await (const part of response) {
      const text = model.getPartText(part);
      if (!text) continue;

      fullResponse += text;
      onNewPart(fullResponse);
      setCurrentResponse(fullResponse);
    }

    setGenerating(false);
    return fullResponse;
  }

  async function getBoundingBoxes() {
    setGenerating(true);

    try {
      // 1. Get component list
      console.log("Getting component list...");
      const componentResponse = await chatSessionSendMessage({
        message: `
        This is a design of a webpage. We are creating this design in TailwindCSS and would like to know which components we should use to create this design.
        Based on the image, provide a structured list of all UI components present.
        Focus on the bigger picture components, such as Layouts, Sections, Navbars, Footers, Sidebars, Dashboard components, Tables, Banners, Charts, Cards, etc.
        Individual UI controls like Buttons, Inputs, etc. are not needed.
        Think about creating a list of components that make sense for an HTML/TailwindCSS page.

        Format as JSON with this structure:
        {
          "components": [
            {"name": "ComponentName", "type": "component type", "description": "brief description"}
          ]
        }
      `,
        files: [file],
      });
      const components = componentResponse;
      console.log("Components:", components);

      // 2. Get bounding boxes
      console.log("Getting component bounding boxes...");
      const boundingResponse = await chatSessionSendMessage({
        message: `
        For each component identified, provide its approximate position and size.
        Remember this an HTML page. 
        Think about bounding boxes as elements and how a browser would render them.

        Your response should use a percentage-based coordinate system. 
        The top left corner of the image is 0,0 and the bottom right corner is 100,100.
        Use percentage values for the x, y, width, and height should be between 0 and 100.

        Format as JSON with this structure:
        {
          "boundingBoxes": [
            {
              "component": "ComponentName",
              "bounds": {
                "x": 0,
                "y": 0,
                "width": 0,
                "height": 0
              }
            }
          ]
        }
      `,
      });
      const boundingBoxes = boundingResponse;
      console.log("Bounding boxes:", boundingBoxes);

      var answers = {
        components,
        boundingBoxes,
      };
      setAnswers(answers);
      return answers;
    } catch (error) {
      console.error("Error analyzing image:", error);
    } finally {
      setGenerating(false);
    }
  }

  async function sendMessage(message, files, nodeID) {
    setGenerating(true);

    const isSnippet = typeof nodeID === "number";

    function stripMarkdown(fullResponse) {
      fullResponse = fullResponse.trim();
      if (fullResponse.startsWith("```html")) {
        fullResponse = fullResponse.slice("```html".length);
      }
      fullResponse = fullResponse.trim();
      if (fullResponse.endsWith("```")) {
        fullResponse = fullResponse.slice(0, -3);
      }

      return fullResponse.trim();
    }

    let importInstructions = `
**Imports for you:**

You do not need to import anything other than TailwindCSS. Import this script tag in your code:

\`\`\`html
<script src="https://cdn.tailwindcss.com"></script>
\`\`\`
    `;

    let imageInstructions = `**Image Instructions:**

- The first image is the original design of the webpage being recreated as HTML. Match the design as closely as possible.
- Take careful note the components used, the colors, and the layout of the design.
- Make sure to use proper icons, border-radiuses, links, badges, and dividers where needed.
`;

    let sentHTML = value;
    let parentNodeId;
    let childIndex;

    if (isSnippet) {
      importInstructions = `
**Imports are not needed or needed**

You do not need to import Tailwind, Remix Icons, or any other library.
You are only provided a snippet of a full HTML page. 
There is code that was not provided in this message as it this iteration does not apply to the full HTML page.
Please focus only the snippet provided, return the snippet modified and do NOT return a full HTML page. Only the snippet should be replied.
      `;

      imageInstructions = `**Image Instructions:**

- The first image is a zoomed-in area of the original design. This is the region of concern for revisions and where changes should be targeted.
- The second image is the same zoomed-in area but of the current design. 
- - Take careful note of the differences between the first and second images.
- - This is how your current code looks, use the user's feedback and the images provided to make this image resemble the design being requested.
`;
      // - The third image is the entire original design of the webpage being recreated as HTML. This provides more context of the design.

      const node = preservedASTMappingsRef.current[nodeID];
      if (!node) {
        console.warn("Node not found for ID", nodeID);
        return;
      }

      parentNodeId = node.getAttribute("data-ast-parent-id");
      let parentNode = preservedASTMappingsRef.current[parentNodeId];
      if (!parentNode) {
        console.warn("Parent node not found for ID", parentNodeId);
        return;
      }

      childIndex = Array.from(parentNode.children).indexOf(node);
      if (childIndex === -1) {
        console.warn("Child index not found for ID", nodeID);
        return;
      }

      sentHTML = node.outerHTML;
    }

    const fullMessage = `
You will be helping me code an HTML webpage from a design image. 
Create the HTML for this webpage. 
You are helping with me create & revise the HTML for this webpage.

**Libraries that must be used in your code:**

- TailwindCSS
- Please extend tailwind.config.theme with exact colors found in the original design
- Remix Icons
- Please only use these icons
- Do not use custom fonts, use the sans-serif font, or 'Mona Sans'

**Code style:**

- Annotate sections with proper comments, IDs, and aria-labels
- Match closely the text-align, flex layout, icons, links, badges, border-radiuses, dividers, and other components used (Try to make your design one-to-one)
- Do not use any JavaScript, this is purely converting the design to HTML
- Do not use real images, simply use icons or placeholder background divs with the same dimensions
- Use 2 spaces, not tabs.

${importInstructions}

${imageInstructions}

Your Current HTML Code:

\`\`\`html
${sentHTML}
\`\`\`

**Instructions:**

Please update the HTML to resemble closer to the original (Image 1 and 2)
The user has left feedback regarding this next iteration items to address:

${message.trim()}

Respond only with the HTML code. Do not use markdown.
`;

    const fullResponse = await chatSessionSendMessage({
      message: fullMessage,
      files: files,
      onNewPart: (fullResponse) => {
        const stripped = stripMarkdown(fullResponse);
        if (isSnippet) {
          replaceValueByNodeID(stripped, parentNodeId, childIndex);
        } else {
          replaceValue(stripped);
        }
      },
    });

    if (isSnippet) {
      // Finish

      replaceValue(astRef.current.documentElement.outerHTML);
    }

    setGenerating(false);

    return fullResponse;
  }

  const theme = useTheme();

  const handleEditorDidMount = (editor, monaco) => {
    ref.current = { editor, monaco };
    window.editor = editor;
    window.monaco = monaco;

    // Define the custom theme here
    monaco.editor.defineTheme("myCustomTheme", {
      base: "vs-dark", // Can be "vs", "vs-dark", or "hc-black"
      inherit: true, // Inherit from the base theme
      rules: [],
      colors: {
        "editor.background": rgbToHex(bodyBackgroundColor), // Custom background color
      },
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES6,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: true,
    });

    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

    // Apply the custom theme
    monaco.editor.setTheme("myCustomTheme");

    // Ensure the editor uses Fira Code font
    editor.updateOptions({
      fontFamily: "Fira Code, monospace",
      fontSize: 14,
      minimap: { enabled: false },
    });

    const revealLineNumber = revealLineNumberRef.current;
    if (revealLineNumber) {
      setTimeout(() => {
        // Move cursor to the matched text
        editor.setPosition({
          lineNumber: revealLineNumber,
          column: 0,
        });

        // Reveal and center the position in the editor
        editor.revealPositionInCenter({
          lineNumber: revealLineNumber,
          column: 0,
        });
      }, 100);
      revealLineNumberRef.current = null;
    }
  };

  // Access the body background color
  const bodyBackgroundColor = theme.palette.background.default;

  const preservedASTRef = useRef();
  const preservedASTMappingsRef = useRef();
  const astRef = useRef();
  const astMappingsRef = useRef();

  const [value, setValue] = useState();
  const [iframeHTML, setIframeHTML] = useState();

  const revealLineNumberRef = useRef();

  // Create clone without any attributes
  function removedAttributesClone(inputHTML) {
    let myPolicy;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      myPolicy = window.trustedTypes.createPolicy("my-app-policy", {
        createHTML: (input) => input,
        createScript: () => {
          throw new Error("Cannot create script elements");
        },
        createScriptURL: () => {
          throw new Error("Cannot create script URLs");
        },
      });
    } else {
      console.warn(
        "Trusted Types not supported by this browser, you may be vulnerable to XSS attacks"
      );
    }

    const parser = new DOMParser();
    const htmlString = inputHTML;

    let trustedHTMLObject = htmlString;
    if (myPolicy) {
      trustedHTMLObject = myPolicy.createHTML(htmlString);
    }

    const doc = parser.parseFromString(trustedHTMLObject, "text/html");
    const processNode = (node) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) {
        return; // Skip anything that's not a dom element.
      }

      node.removeAttribute("data-ast-id");
      node.removeAttribute("data-ast-parent-id");

      // Recursively process all child nodes.
      node.childNodes.forEach((child) => processNode(child));
    };

    processNode(doc.documentElement);

    setValue(doc.documentElement.outerHTML);
  }

  function replaceValueByNodeID(newSubtreeHTML, parentNodeId, childIndex) {
    if (!preservedASTRef.current || !preservedASTMappingsRef.current) {
      console.warn("AST not initialized");
      return;
    }

    const parentNode = preservedASTMappingsRef.current[parentNodeId];
    if (!parentNode) {
      console.warn("No parent node");
      return;
    }

    console.log("Replacing node", parentNode, childIndex, newSubtreeHTML);

    var doc = preservedASTRef.current;

    if (!parentNode) {
      console.warn("No parent node");
      parentNode.innerHTML = newSubtreeHTML;
    } else {
      const oldChild = parentNode.children[childIndex];

      if (!oldChild) {
        console.warn("Old child not found");
        return;
      }

      var div = document.createElement("div");
      div.innerHTML = newSubtreeHTML;
      div.setAttribute("data-ast-temp-div", "true");

      parentNode.replaceChild(div, oldChild);
    }

    setIframeHTML(doc.documentElement.outerHTML);
    removedAttributesClone(doc.documentElement.outerHTML);
  }

  const replaceValue = debounce(
    (newValue) => {
      let myPolicy;
      if (window.trustedTypes && window.trustedTypes.createPolicy) {
        myPolicy = window.trustedTypes.createPolicy("my-app-policy", {
          createHTML: (input) => input,
          createScript: () => {
            throw new Error("Cannot create script elements");
          },
          createScriptURL: () => {
            throw new Error("Cannot create script URLs");
          },
        });
      } else {
        console.warn(
          "Trusted Types not supported by this browser, you may be vulnerable to XSS attacks"
        );
      }

      const parser = new DOMParser();
      const htmlString = newValue;

      let trustedHTMLObject = htmlString;
      if (myPolicy) {
        trustedHTMLObject = myPolicy.createHTML(htmlString);
      }
      const doc = parser.parseFromString(trustedHTMLObject, "text/html");

      // Replace temp divs with their children
      doc.querySelectorAll("[data-ast-temp-div]").forEach((div) => {
        const parent = div.parentNode;
        if (!parent) return;

        // Move all children before the temp div
        while (div.firstChild) {
          parent.insertBefore(div.firstChild, div);
        }
        // Remove the now-empty temp div
        div.remove();
      });

      astRef.current = doc;

      // Attach unique 'data-ast-id' attributes to each DOM node
      astMappingsRef.current = Object.create(null); // Reset mappings for new parses
      let nextNodeIdCounter = 0; // Reset ID counter for each new process
      // Function to process each element recursively
      const processNode = (node, parentId) => {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
          return; // Skip anything that's not a dom element.
        }

        const id = nextNodeIdCounter++;
        astMappingsRef.current[id] = node;
        node.setAttribute("data-ast-id", id);
        node.setAttribute("data-ast-parent-id", parentId);

        // Recursively process all child nodes.
        node.childNodes.forEach((child) => processNode(child, id));
      };

      // Start the processing from the root node.
      processNode(doc.documentElement, null);

      setIframeHTML(doc.documentElement.outerHTML);
      removedAttributesClone(doc.documentElement.outerHTML);
    },
    250,
    1000
  );

  const [previewValue, setPreviewValue] = useState(100);

  const handleChange = (event, newValue) => {
    setPreviewValue(newValue);
  };

  const [screenshot, setScreenshot] = useState();
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const originalImageRef = useRef();
  const iframeRef = useRef();
  const [interactive, setInteractive] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false);

  const firstInitRef = useRef(false);
  if (!firstInitRef.current && imageDimensions) {
    firstInitRef.current = true;
    setTimeout(() => {
      sendMessage(
        `
This is the first iteration. You are starting from scratch this revision, hence why only the original design is being provided.
Keep in mind you will be revising the design several times in the future, please make sure to keep the code clean and organized.
  
Based on the image, provide a structured list of all UI components present.
Focus on the bigger picture components, such as Layouts, Sections, Navbars, Footers, Sidebars, Dashboard components, Tables, Banners, Charts, Cards, etc.
Individual UI controls like Buttons, Inputs, etc. are not needed.
Think about creating a list of components that make sense for an HTML/TailwindCSS page.`,

        [file]
      );
    }, 50);
  }

  const [contextMenu, setContextMenu] = useState(null);

  const maxViewport = fullScreenMode ? 100 : 80;

  return (
    <Box
      display="flex"
      width="100vw"
      height="100vh"
      alignItems="flex-end"
      justifyContent="center"
    >
      <ContextMenuExample
        contextMenu={contextMenu}
        onClose={() => {
          console.log("Context menu closed.");
          setContextMenu(null);
        }}
        onDeleteNode={(node) => {
          node.remove();

          const realNode =
            astMappingsRef.current[node.getAttribute("data-ast-id")];
          realNode.remove();
          const doc = astRef.current.documentElement;

          replaceValue(doc.outerHTML);
          setContextMenu(null);
        }}
        onViewCode={(node) => {
          const doc = astRef.current.documentElement;
          const withASTIds = doc.innerHTML;
          var searchText = 'data-ast-id="' + node.getAttribute("data-ast-id");

          console.log(withASTIds);

          const index = withASTIds.indexOf(searchText);
          if (index === -1) {
            alert("not found");
            return;
          }

          setPage("code");
          setContextMenu(null);

          const lineNumber = withASTIds.slice(0, index).split("\n").length;

          revealLineNumberRef.current = lineNumber;
        }}
      />

      <Screenshot
        onScreenshot={(image) => {
          setScreenshot(image);
          setShowCompareDialog(true);
        }}
        active={page === "preview" && !showCompareDialog}
        originalImageRef={originalImageRef}
        iframeRef={iframeRef}
        htmlCleanupRef={htmlCleanupRef}
      />

      {showChatPopover ? (
        <ChatPopover
          onClose={() => {
            setShowChatPopover(false);
          }}
          model={model}
        />
      ) : null}
      <CompareDialog
        open={showCompareDialog}
        onClose={() => {
          setShowCompareDialog(false);
        }}
        screenshot={screenshot}
        onConfirm={async (message) => {
          setShowCompareDialog(false);

          // Capture the selected node ID for snippet in-place replacement
          let nodeID;
          let dataASTId = selectedNode?.getAttribute("data-ast-id");
          if (dataASTId) {
            nodeID = parseInt(dataASTId);
          }

          // Preserve the AST and mappings for the current code
          preservedASTRef.current = astRef.current;
          preservedASTMappingsRef.current = astMappingsRef.current;

          setGenerating(true);
          sendMessage(
            message,
            [
              {
                mimeType: "image/png",
                display: "Original Design.png",
                blob: screenshot.originalImage.blob,
              },
              {
                mimeType: "image/png",
                display: "Current Design.png",
                blob: screenshot.revisionImage.blob,
              },
            ],
            nodeID
          );

          if (selectedNode) {
            setSelectedNode(null);
          }
        }}
      />
      <Fade in={generating} unmountOnExit timeout={500}>
        <Box
          sx={{
            top: 0,
            left: 0,
            right: 0,
            zIndex: 600,
            position: "absolute",
          }}
        >
          <LinearProgress sx={{ height: "3px" }} />
        </Box>
      </Fade>
      <Box
        position="absolute"
        top="16px"
        left="50%"
        sx={{
          transform: "translate(-50%, 0)",
          color: "primary.main",
          typography: "body2",
          fontWeight: "bold",
          cursor: "pointer",
        }}
        component={Link}
        to="/"
        onClick={() => {
          changePage("intro");
        }}
      >
        drift.codes
      </Box>

      <Box
        maxWidth="94vw"
        maxHeight="min(94vh, calc(100vh - 64px))"
        height="100%"
        width="100%"
        borderRadius="8px"
        overflow="hidden"
        sx={{
          boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        }}
        display="flex"
        flexDirection="column"
      >
        <Stack
          direction="row"
          width="100%"
          bgcolor="#1c222650"
          alignItems="stretch"
          height="34px"
          flexShrink={0}
          position="relative"
          onMouseDown={(e) => {
            // Prevent nav mouse downs from triggering screenshot
            e.stopPropagation();
          }}
        >
          <Button
            startIcon={<RiAiGenerate />}
            sx={{
              px: 2,
              py: "4px",
              bgcolor: page === "code" ? "primary.alpha" : "transparent",
            }}
            onClick={() => {
              setPage("code");
            }}
          >
            Code
          </Button>
          <Button
            startIcon={<RiBrushAiLine />}
            sx={{
              px: 2,
              py: "4px",
              bgcolor: page === "preview" ? "primary.alpha" : "transparent",
            }}
            onClick={() => {
              setPage("preview");
              replaceValue(value);
            }}
          >
            Preview
          </Button>
          {page === "preview" ? (
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              position="absolute"
              sx={{
                left: "50%",
                transform: "translate(-50%,0)",
                top: "0px",
              }}
            >
              <Stack
                ml={1}
                spacing={2}
                direction="row"
                sx={{ alignItems: "center" }}
              >
                <Typography variant="body2" sx={{ userSelect: "none" }}>
                  Original
                </Typography>
                <Slider
                  step={15}
                  marks
                  aria-label="Volume"
                  value={previewValue}
                  onChange={handleChange}
                  size="small"
                  sx={{ minWidth: "140px" }}
                />
                <Typography variant="body2" sx={{ userSelect: "none" }}>
                  AI
                </Typography>
              </Stack>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={interactive}
                    indeterminate={!!selectedNode}
                    onChange={(e) => {
                      setInteractive(e.target.checked);
                      setSelectedNode(null);
                    }}
                  />
                }
                sx={{
                  ml: 2,
                  "& .MuiFormControlLabel-label": {
                    typography: "body2",
                  },
                  flexShrink: 0,
                }}
                label={
                  selectedNode ? "Deselect Element" : "Select Specific Node"
                }
              />

              {/* <FormControlLabel
                control={
                  <Checkbox
                    checked={showBoundingBoxes}
                    onChange={(e) => {
                      setShowBoundingBoxes(e.target.checked);
                      if (!answers && !generating) getBoundingBoxes();
                    }}
                  />
                }
                sx={{
                  ml: 2,
                  "& .MuiFormControlLabel-label": {
                    typography: "body2",
                  },
                  flexShrink: 0,
                }}
                label="Show Bounding Boxes"
              /> */}

              <IconButton
                size="small"
                onClick={() => {
                  setFullScreenMode(!fullScreenMode);
                }}
                title="Full Screen"
              >
                <OpenInNew />
              </IconButton>
            </Stack>
          ) : null}
          <Box mr="auto"></Box>
          <Button
            startIcon={<RiSparkling2Line />}
            sx={{ px: 2, py: "4px" }}
            onClick={() => {
              setShowChatPopover(true);
            }}
          >
            Chat
          </Button>
        </Stack>

        <Box flexGrow={1}>
          {page === "code" ? (
            <Editor
              height={`100%`}
              defaultLanguage="html"
              value={value}
              onChange={(v) => setValue(v)}
              theme="myCustomTheme"
              options={{
                wordWrap: "on", // Enable word wrap
                minimap: { enabled: false }, // Disable minimap (optional)
                automaticLayout: true,
              }}
              onMount={handleEditorDidMount} // Use the onMount callback
              loading={<CircularProgress />}
            />
          ) : null}

          {page === "preview" ? (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
              width="100%"
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                maxWidth={`${maxViewport}vw`}
                maxHeight={`${maxViewport}vh`}
                width="100%"
                height="100%"
                sx={
                  !fullScreenMode
                    ? { userSelect: "none" }
                    : {
                        userSelect: "none",
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: "100vw",
                        height: "100vh",
                        maxWidth: "100vw",
                        maxHeight: "100vh",
                        background: "#000",
                        zIndex: 3,
                      }
                }
              >
                {fullScreenMode ? (
                  <Box
                    sx={{
                      position: "absolute",
                      top: "16px",
                      right: "16px",
                      zIndex: 3,
                    }}
                  >
                    <IconButton
                      onClick={() => {
                        setFollowAspectRatio(!followAspectRatio);
                      }}
                      sx={{
                        bgcolor: "rgba(0,0,0,0.7)",
                        "&:hover": {
                          bgcolor: "rgba(0,0,0,0.9)",
                        },
                        mr: 2,
                      }}
                      size="small"
                      title="Toggle Aspect Ratio"
                    >
                      <AspectRatio />
                    </IconButton>

                    <IconButton
                      onClick={() => {
                        setFullScreenMode(false);
                        setFollowAspectRatio(true);
                      }}
                      sx={{
                        bgcolor: "rgba(0,0,0,0.7)",
                        "&:hover": {
                          bgcolor: "rgba(0,0,0,0.9)",
                        },
                      }}
                      size="small"
                      title={"Exit Full Screen"}
                    >
                      <Close />
                    </IconButton>
                  </Box>
                ) : null}
                <Box
                  sx={{
                    width: "100%",
                    height: "auto",
                    aspectRatio:
                      imageDimensions && followAspectRatio
                        ? `${imageDimensions.width} / ${imageDimensions.height}`
                        : "1/1",
                    bgcolor: "#fff",
                    position: "relative",
                    borderRadius:
                      fullScreenMode && !followAspectRatio ? "0px" : "8px",
                    boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
                    overflow: "hidden",

                    maxWidth:
                      imageDimensions && followAspectRatio
                        ? `clamp(0px, 100%, calc(${maxViewport}vh * (${imageDimensions.width} / ${imageDimensions.height})))`
                        : "100%",
                    maxHeight:
                      imageDimensions && followAspectRatio
                        ? `clamp(0px, calc(${maxViewport}vw / (${imageDimensions.width} / ${imageDimensions.height})), 100%)`
                        : "100%",
                  }}
                >
                  {showBoundingBoxes ? (
                    <BoundingBoxes
                      boundingBoxes={answers?.boundingBoxes}
                      imageDimensions={imageDimensions}
                    />
                  ) : null}
                  <HTMLPreview
                    html={iframeHTML}
                    iframeRef={iframeRef}
                    onElementChanged={(target) => {
                      setSelectedNode(target);
                      console.log(
                        astMappingsRef.current[
                          target.getAttribute("data-ast-id")
                        ].parentNode
                      );
                    }}
                    htmlCleanupRef={htmlCleanupRef}
                    sx={{
                      position: "absolute",

                      width: "100%",
                      height: "100%",
                      top: 0,
                      left: 0,
                      opacity: previewValue / 100,
                      transition: "none",
                      userSelect: "none",
                      pointerEvents:
                        interactive && !selectedNode ? "inherit" : "none",
                    }}
                    interactive={interactive}
                    selectedNode={selectedNode}
                    onElementContextMenu={(contextMenu) => {
                      setContextMenu(contextMenu);
                    }}
                  />
                  <img
                    src={imageURL}
                    alt="Website Preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                    ref={originalImageRef}
                    draggable={false}
                  />
                </Box>
              </Box>
            </Box>
          ) : null}

          {page === "chat" ? <Box></Box> : null}
        </Box>
      </Box>
    </Box>
  );
}
