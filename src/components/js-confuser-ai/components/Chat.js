import {
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { getRandomString } from "../../../utils/random-utils";
import { InfoOutlined, Send, StopCircle } from "@mui/icons-material";
import { RiSparklingLine } from "react-icons/ri";
import ChatContent from "./ChatContent";

export default function Chat({ maxHeight = "100vh", fullScreen, model }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef();

  const typingAnimationRef = useRef({});

  const [messages, setMessages] = useState([]);

  const containerRef = useRef();
  const flexRef = useRef();
  const shouldAutoScrollRef = useRef(true);

  // When the user manually scrolls - release auto scroll
  useEffect(() => {
    if (!flexRef.current) return;
    const cb = (e) => {
      shouldAutoScrollRef.current = false;

      // Re enable auto scroll if the user is at the bottom
      if (e.target.scrollTop >= e.target.scrollHeight - e.target.clientHeight) {
        shouldAutoScrollRef.current = true;
      }
    };
    flexRef.current.addEventListener("scroll", cb);

    return () => {
      if (!flexRef.current) return;
      flexRef.current.removeEventListener("scroll", cb);
    };
  }, [flexRef.current]);

  // Scroll to bottom on new message
  function scrollToBottom() {
    const flex = flexRef.current;
    if (!flex) return;

    flex.scrollTop = flex.scrollHeight;
    setTimeout(() => {
      flex.scrollTop = flex.scrollHeight;
    }, 20);
  }

  function stopGenerating() {
    // TODO:
  }

  function sendMessageFromEvent() {
    const target = inputRef.current;
    if (!target) return;

    sendMessage(target.value);

    target.value = "";
  }

  async function sendMessage(content) {
    const sentMessageId = getRandomString();
    const message = { role: "user", content: content, id: sentMessageId };
    const sentMessages = [...messages, message];

    const responseId = getRandomString();
    const responseMessages = [
      ...sentMessages,
      { role: "assistant", content: "", loading: true, id: responseId },
    ];

    scrollToBottom();
    setMessages(responseMessages);
    setGenerating(true);
    setError(null);

    /**
     * @param {object} partMessage
     */
    function onReceivePart(partMessageContent) {
      // Only update the last message
      const lastMessage = responseMessages.at(-1);
      lastMessage.content += partMessageContent;
      lastMessage.loading = false;

      setMessages([...responseMessages]);
    }

    // Send message to backend server
    var stream = await model.sendMessageStream(content);

    for await (const part of stream) {
      const textPart = model.getPartText(part);
      if (!textPart) {
        continue;
      }

      onReceivePart(textPart);
    }

    setGenerating(false);
  }

  const combinedMessages = [];
  for (var i = 0; i < messages.length; i += 2) {
    combinedMessages.push({
      user: messages[i],
      assistant: messages[i + 1],
    });
  }

  const [justifyContent, setJustifyContent] = useState("center");

  useEffect(() => {
    const element = flexRef.current;

    if (!element) return;

    const cb = () => {
      const clientHeight = element.clientHeight;
      const elementHeight = element.scrollHeight;

      // console.log(clientHeight, elementHeight);

      if (elementHeight > clientHeight) {
        setJustifyContent("flex-start");

        cleanup();
      } else {
        setJustifyContent("center");
      }
    };
    const observer = new ResizeObserver(cb);

    observer.observe(element);

    const mutationObserver = new MutationObserver(cb);

    mutationObserver.observe(element, {
      childList: true,
      subtree: true,
    });

    cb();

    var disposed = false;

    function cleanup() {
      if (disposed) return;
      disposed = true;

      observer.disconnect();
      mutationObserver.disconnect();
    }

    // Cleanup observer on unmount
    return () => {
      cleanup();
    };
  }, [maxHeight]);

  const ContentWrapperElement =
    justifyContent === "center" ? React.Fragment : "div";

  return (
    <Box>
      {/* <Box className="CustomBGContainer">
        <Box className="CustomBGGrid"></Box>
      </Box> */}

      <Box>
        <Box
          height={maxHeight}
          // pt="100px"
          display="flex"
          flexDirection="column"
        >
          <Box
            sx={{
              overflowY: "auto",
              overflowX: "hidden",
              height: `calc(${maxHeight} - 120px)`,
              maxHeight: `calc(${maxHeight} - 120px)`,
            }}
            ref={containerRef}
            display="flex"
            flexDirection="column"
          >
            <Stack
              flexShrink={1}
              flexGrow={1}
              spacing={0}
              justifyContent={justifyContent}
              minHeight="100%"
              ref={flexRef}
              sx={
                justifyContent === "center"
                  ? {
                      overflow: "hidden",
                      display: "flex",
                    }
                  : {
                      overflow: "auto",
                      display: "flex",
                      flexDirection: "column-reverse",
                    }
              }
            >
              <ContentWrapperElement key="content">
                <ChatContent
                  model={model}
                  typingAnimationRef={typingAnimationRef}
                  combinedMessages={combinedMessages}
                  error={error}
                  loading={loading}
                  generating={generating}
                  sendMessage={sendMessage}
                  retryConnection={() => {}}
                />
              </ContentWrapperElement>
            </Stack>
          </Box>

          <Box py={fullScreen ? 5 : 2} flexShrink={0}>
            <Stack direction="row" spacing={2}>
              <TextField
                autoFocus={true}
                placeholder={`Message ${model?.displayName}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    sendMessageFromEvent();

                    event.preventDefault();
                    event.stopPropagation();
                  }
                }}
                inputRef={inputRef}
                multiline
                maxRows={10}
                sx={{
                  maxWidth: "100%",
                  width: "100%",

                  "& > .MuiOutlinedInput-root": {
                    bgcolor: "divider_opaque",
                  },

                  "& > .MuiInputBase-formControl > .MuiOutlinedInput-notchedOutline, & > .MuiInputBase-formControl:hover:not(:focus-within) > .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "divider",
                      transition: "border-color 0.2s ease",
                    },
                }}
                size="small"
                variant="outlined"
                InputProps={{
                  sx: {
                    bgcolor: "divider_opaque",
                  },
                  startAdornment: (
                    <InputAdornment position="start">
                      <RiSparklingLine />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (generating) {
                            stopGenerating();
                          } else {
                            sendMessageFromEvent();
                          }
                        }}
                      >
                        {generating ? (
                          <StopCircle className="blinking" />
                        ) : (
                          <Send />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            <Box mt={1} textAlign="center">
              <Typography variant="caption" color="text.secondary">
                <InfoOutlined
                  sx={{ fontSize: "0.9rem", mb: "-2.75px", mr: "2.5px" }}
                />
                AI can make mistakes. Please verify the information provided.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
