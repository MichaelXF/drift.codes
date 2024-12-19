import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import { RiQuestionLine, RiSparklingLine } from "react-icons/ri";

export default function ChatLanding({ onSelectPrompt, model }) {
  var prompts = useMemo(() => {
    const tailwindPrompts = [
      "Tailwind flex classes explained",
      "How to center with Tailwind CSS?",
      "Tailwind responsive breakpoints guide",
      "Tailwind grid vs flexbox differences",
      "Custom colors in Tailwind CSS",
      "Tailwind dark mode implementation",
      "Animation classes in Tailwind",
      "Tailwind spacing utilities explained",
      "Create navbar with Tailwind CSS",
      "Tailwind hover and focus states",
    ];

    // Function to get 3 random prompts
    const getRandomPrompts = (arr, num) => {
      const shuffled = [...arr].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, num);
    };

    return getRandomPrompts(tailwindPrompts, 3);
  }, []);

  return (
    <Box textAlign="center">
      <Box color="primary.main" fontSize="2rem"></Box>

      <Typography variant="h4" color="primary.main" className="GradientText">
        Chat with {model?.displayName}
      </Typography>

      <Box my={4} maxWidth="500px" mx="auto">
        <Divider />
      </Box>

      <Typography
        variant="body2"
        fontStyle="italic"
        color="text.secondary_darker"
        mb={2}
      >
        Try these examples:
      </Typography>

      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="center"
        spacing={1}
        width="100%"
        justifyContent="center"
      >
        {prompts.map((message, index) => (
          <Box key={index} pb={1}>
            <Button
              color="inherit"
              sx={{
                color: "text.secondary_darker",
                fontWeight: "normal",
                display: "flex",
              }}
              onClick={() => {
                onSelectPrompt(message);
              }}
            >
              <RiQuestionLine
                style={{
                  fontSize: "1.125rem",
                  marginRight: "6px",
                  marginBottom: "-1px",
                }}
              />
              {message}
            </Button>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
