import {
  KeyboardArrowDown,
  KeyboardArrowRight,
  KeyboardArrowUp,
} from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { loadFilesAndCreateTree } from "../../src/utils/file-utils";
import { RiCheckLine, RiQuestionLine } from "react-icons/ri";

function Folder({ folder, depth = 0, editorComponent, isRoot }) {
  const dirName = folder.path
    ?.split("/")
    .filter((x) => x)
    .at(-1);

  const [open, setOpen] = useState(isRoot);

  function getFullPath(file) {
    var path = folder.path;
    if (path.startsWith("/")) {
      path = path.substring(1);
    }
    if (path && !path.endsWith("/")) {
      path += "/";
    }
    path += file;

    return path;
  }

  const fullyIndexed = folder.files.every((x) =>
    editorComponent.db?.isIndexed(getFullPath(x))
  );

  return (
    <Box>
      {!isRoot ? (
        <Button
          onClick={() => {
            setOpen(!open);
          }}
          startIcon={open ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
          endIcon={
            fullyIndexed ? (
              <RiCheckLine style={{ fontSize: "inherit" }} />
            ) : null
          }
          sx={{
            display: "flex",
            justifyContent: "flex-start",
            textTransform: "none",
            fontWeight: "normal",
            color: "text.secondary",
            py: "6px",
            pl: depth * 1,

            "& > .MuiButton-icon:first": {
              marginRight: "0px",
              marginLeft: "-8px",
              width: "24px",
            },

            "& > .MuiButton-endIcon": {
              ml: "auto",
              color: "text.secondary_darker",
              fontSize: "1rem",
              pr: "4px",
            },
          }}
          color="inherit"
          fullWidth
        >
          {dirName}
        </Button>
      ) : null}

      {open ? (
        <>
          <Box>
            {(folder.folders || []).map((folder, i) => (
              <Folder
                folder={folder}
                key={i}
                depth={depth + 1}
                editorComponent={editorComponent}
              />
            ))}
          </Box>
          <Box>
            {folder.files?.map((file, i) => {
              var path = getFullPath(file);

              return (
                <Button
                  key={i}
                  sx={{
                    display: "flex",
                    justifyContent: "flex-start",
                    textTransform: "none",
                    color: "text.secondary",
                    fontWeight: "normal",

                    pl: depth * 1 + 2,
                    py: "6px",

                    "& > .MuiButton-endIcon": {
                      ml: "auto",
                      color: "text.secondary_darker",
                      fontSize: "1rem",
                      pr: "4px",
                    },
                  }}
                  endIcon={
                    !editorComponent.db ? (
                      <RiQuestionLine style={{ fontSize: "inherit" }} />
                    ) : editorComponent.db.isIndexed(path) ? (
                      <RiCheckLine style={{ fontSize: "inherit" }} />
                    ) : null
                  }
                  color="inherit"
                  fullWidth
                  onClick={() => {
                    editorComponent.newTabFromFile(path);
                  }}
                >
                  {file}
                </Button>
              );
            })}
          </Box>
        </>
      ) : null}
    </Box>
  );
}

export default function EditorPanel({ editorComponent }) {
  const theme = useTheme();

  const { activeTab } = editorComponent;

  const [rootTree, setRootTree] = useState(null);

  useEffect(() => {
    async function loadFiles() {
      const files = await loadFilesAndCreateTree(editorComponent.projectName);

      setRootTree(files);
    }

    loadFiles();
  }, []);

  return (
    <Box
      width="100%"
      flexShrink={0}
      height="calc(100vh - 40px)"
      sx={{
        overflowY: "auto",
        scrollbarWidth: "thin",
        borderRight: `1px solid`,
        borderRightColor: "divider",
      }}
      p={2}
    >
      {rootTree ? (
        <Folder
          folder={rootTree}
          editorComponent={editorComponent}
          isRoot={true}
        />
      ) : null}
    </Box>
  );
}
