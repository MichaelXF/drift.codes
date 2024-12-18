import { useTheme } from "@emotion/react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Fade,
  FormControlLabel,
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

const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");

export default function EditorPage({ apiKey, file, imageURL }) {
  const ref = useRef();
  const [page, setPage] = useState("code");

  const [generating, setGenerating] = useState(false);
  const [imageDimensions, setImageDimensions] = useState();
  const [selectedNode, setSelectedNode] = useState();

  useEffect(() => {
    if (!imageURL) return;

    async function loadDimensions() {
      setImageDimensions(await getImageDimensions(imageURL));
    }

    loadDimensions();
  }, [imageURL]);

  const genAI = useMemo(
    () => apiKey && new GoogleGenerativeAI(apiKey),
    [apiKey]
  );

  const model = useMemo(
    () =>
      genAI &&
      genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
      }),
    [genAI]
  );
  const chatSession = useMemo(() => model && model.startChat(), [model]);

  const htmlCleanupRef = useRef();

  /**
   * Uploads the given file to Gemini.
   *
   * See https://ai.google.dev/gemini-api/docs/prompting_with_media
   */
  async function uploadToGemini(arrayBuffer, displayName, mimeType) {
    const fileManager = new GoogleAIFileManager(apiKey);

    const uploadResult = await fileManager.uploadFile(arrayBuffer, {
      mimeType,
      displayName: displayName,
    });
    const file = uploadResult.file;

    console.log(`Uploaded file ${file.displayName} as: ${file.name}`);

    return file;
  }

  async function sendMessage(message, files, nodeID) {
    setGenerating(true);

    const isSnippet = typeof nodeID === "number";

    let importInstructions = `
**Imports for you:**

\`\`\`html
<link
  href="https://cdn.jsdelivr.net/npm/remixicon@4.5.0/fonts/remixicon.css"
  rel="stylesheet"
/>
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

    const response = await chatSession.sendMessageStream([
      ...files.map((file) => ({
        fileData: {
          mimeType: file.mimeType,
          fileUri: file.uri,
        },
      })),
      {
        text: `
You will be helping me code an HTML webpage from a design image. 
Create the HTML for this webpage. 
You are helping with me create & revise the HTML for this webpage.

**Libraries that must be used in your code:**

- TailwindCSS
- Please extend tailwind.config.theme with exact colors found in the original design
- Remix Icons
- Please only use these icons

**Code style:**

- Annotate sections with proper comments, IDs, and aria-labels
- Match closely the icons, links, badges, border-radiuses, dividers, and other components used (Try to make your design one-to-one)
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
    `,
      },
    ]);
    let fullResponse = "";

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

    for await (const part of response.stream) {
      fullResponse += part.text();
      const stripped = stripMarkdown(fullResponse);
      if (isSnippet) {
        replaceValueByNodeID(stripped, parentNodeId, childIndex);
      } else {
        replaceValue(stripped);
      }
    }

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

      parentNode.replaceChild(div, oldChild);
    }

    setIframeHTML(doc.documentElement.outerHTML);
    removedAttributesClone(doc.documentElement.outerHTML);
  }

  function replaceValue(newValue) {
    try {
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
    } catch (err) {
      console.error(err);
    }
  }

  const [previewValue, setPreviewValue] = useState(100);

  const handleChange = (event, newValue) => {
    setPreviewValue(newValue);
  };

  const [screenshot, setScreenshot] = useState();
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const originalImageRef = useRef();
  const iframeRef = useRef();
  const [interactive, setInteractive] = useState(false);

  const firstInitRef = useRef(false);
  if (!firstInitRef.current) {
    firstInitRef.current = true;
    setTimeout(() => {
      sendMessage(
        `
This is the first iteration. You are starting from scratch this revision, hence why only the original design is being provided.
Keep in mind you will be revising the design several times in the future, please make sure to keep the code clean and organized.
        `,

        [file]
      );
    }, 100);
  }

  const [contextMenu, setContextMenu] = useState(null);

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
          var file1 = await uploadToGemini(
            screenshot.originalImage.blob,
            "Original Design.png",
            "image/png"
          );
          var file2 = await uploadToGemini(
            screenshot.revisionImage.blob,
            "Current Design.png",
            "image/png"
          );

          sendMessage(message, [file1, file2], nodeID);

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
        }}
      >
        drift.codes
      </Box>

      <Box
        maxWidth="90vw"
        maxHeight="90vh"
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
                }}
                label={
                  selectedNode ? "Deselect Element" : "Select Specific Node"
                }
              />
            </Stack>
          ) : null}
          <Box mr="auto"></Box>
          <Button
            startIcon={<RiSparkling2Line />}
            sx={{ px: 2, py: "4px" }}
            onClick={() => {
              setPage("chat");
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
                maxWidth="80vw"
                maxHeight="80vh"
                width="100%"
                height="100%"
                sx={{ userSelect: "none" }}
              >
                <Box
                  sx={{
                    width: "100%",
                    height: "auto",
                    aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`,
                    bgcolor: "#fff",
                    position: "relative",
                    borderRadius: "8px",
                    boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
                    overflow: "hidden",

                    maxWidth: `clamp(0px, 100%, calc(80vh * (${imageDimensions.width} / ${imageDimensions.height})))`,
                    maxHeight: `clamp(0px, calc(80vw / (${imageDimensions.width} / ${imageDimensions.height})), 100%)`,
                  }}
                >
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
