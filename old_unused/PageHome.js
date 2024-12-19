import { Box, Button, Stack, Typography } from "@mui/material";
import useSEO from "../src/hooks/useSEO";
import { useEffect, useState } from "react";
import { listIndexedDBs } from "../src/utils/file-utils";
import GitHubDialog from "../src/components/dialogs/GitHubDialog";
import { downloadAndStoreRepo, parseGitHubURL } from "../utils/gitHub-utils";
import { Link, useNavigate } from "react-router-dom";

export default function PageHome() {
  useSEO("drift.codes - AI powered code editor", "Create apps with AI.");

  const [showGitHubDialog, setShowGitHubDialog] = useState(false);
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadDBs() {
      setProjects(await listIndexedDBs());
    }

    loadDBs();
  }, []);

  return (
    <Box>
      <GitHubDialog
        open={showGitHubDialog}
        onClose={() => setShowGitHubDialog(false)}
        onConfirm={(url) => {
          setShowGitHubDialog(false);
          const { owner, repo, branch } = parseGitHubURL(url);

          downloadAndStoreRepo(owner, repo, branch).then((projectName) => {
            navigate(`/editor/${projectName}`);
          });
        }}
      />

      <Box
        minHeight="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Box maxWidth="1000px" mx="auto" textAlign="center" p={10}>
          <Typography variant="h2">Welcome to drift.codes</Typography>

          <Typography variant="body1" color="text.secondary" mt={2}>
            Create apps with AI.
          </Typography>

          <Stack direction="row" justifyContent="center" mt={4} spacing={2}>
            {projects.map((project, i) => (
              <Button key={i} component={Link} to={`/editor/${project}`}>
                {project}
              </Button>
            ))}

            <Button
              onClick={() => {
                setShowGitHubDialog(true);
              }}
            >
              GitHub
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
