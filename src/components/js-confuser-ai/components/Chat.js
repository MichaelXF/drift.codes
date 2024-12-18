import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { getRandomString } from "../../../utils/random-utils";
import {
  InfoOutlined,
  Key,
  KeyboardArrowRight,
  Send,
  StopCircle,
} from "@mui/icons-material";
import Message from "./Message";
import {
  RiErrorWarningLine,
  RiSignalWifiErrorLine,
  RiSparklingLine,
  RiWifiOffLine,
} from "react-icons/ri";
import ChatLanding from "./ChatLanding";

/**
 * @returns
 */
export default function Chat({ agent, immediateMessage, fullScreen }) {
  const webSocketRef = useRef();
  const incomingMessageCallbackRef = useRef();
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef();

  const hasSentImmediateMessage = useRef(false); // Send the immediate message only once

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
  function scrollToBottom(forceScroll = false) {
    const flex = flexRef.current;
    if (!flex) return;

    if (forceScroll) {
      shouldAutoScrollRef.current = true;
    }

    // Scroll to bottom if the user was already at the bottom
    if (shouldAutoScrollRef.current || forceScroll) {
      setTimeout(() => {
        flex.scrollTop = flex.scrollHeight;
      }, 16);
    }
  }

  function stopGenerating() {
    const websocket = webSocketRef.current;
    if (!websocket) return;

    // TODO: Find way to stop generating on backend
    // websocket.send(JSON.stringify({ stop: true }));

    setGenerating(false);
    incomingMessageCallbackRef.current = null;
  }

  function sendMessageFromEvent() {
    const target = inputRef.current;
    if (!target) return;

    sendMessage(target.value);

    target.value = "";
  }

  const [justifyContent, setJustifyContent] = useState("center");

  useEffect(() => {
    const element = flexRef.current;

    if (!element) return;

    // One time force scroll
    let didForceScroll = false;

    const cb = () => {
      const clientHeight = element.clientHeight;
      const elementHeight = element.scrollHeight;

      // console.log(clientHeight, elementHeight);

      if (elementHeight > clientHeight) {
        if (!didForceScroll) {
          scrollToBottom(true);
          didForceScroll = true;
        }
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
  }, [flexRef.current]);

  const [combinedMessages, setCombinedMessages] = useState([]);

  async function sendMessage(message) {
    const userMessage = {
      role: "user",
      content: message,
    };

    const assistantMessage = {
      role: "assistant",
      content: "",
    };

    const newMessageID = getRandomString();

    const newMessage = {
      id: newMessageID,
      user: userMessage,
      assistant: assistantMessage,
    };

    setCombinedMessages((combinedMessages) => [
      ...combinedMessages,
      newMessage,
    ]);

    setGenerating(true);

    const iter = agent.ai.run(message);
    for await (const part of iter) {
      assistantMessage.content += part;
      setCombinedMessages((combinedMessages) => [...combinedMessages]);
    }

    setGenerating(false);
  }

  return (
    <Box sx={{ height: "100%" }}>
      {/* <Box className="CustomBGContainer">
        <Box className="CustomBGGrid"></Box>
      </Box> */}

      <Box sx={{ height: "100%" }}>
        <Box
          height={"100%"}
          // pt="100px"
          display="flex"
          flexDirection="column"
        >
          <Box
            sx={{
              overflowY: "auto",
              overflowX: "hidden",
              height: "100%",
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
              overflow={justifyContent === "center" ? "hidden" : "auto"}
              display={justifyContent === "center" ? "flex" : "block"}
              minHeight="100%"
              height="100%"
              ref={flexRef}
            >
              {
                <>
                  {combinedMessages.map((message, index) => (
                    <Message
                      key={index}
                      userMessage={message.user}
                      assistantMessage={message.assistant}
                      showIncompleteTools={
                        generating && index === combinedMessages.length - 1
                      }
                      scrollToBottom={scrollToBottom}
                    />
                  ))}

                  {error ? (
                    <Stack
                      direction="row"
                      spacing={2}
                      p={2}
                      boxShadow="2"
                      bgcolor="background.paper"
                      border="1px solid"
                      borderColor="custom_error_alpha"
                      borderRadius="8px"
                    >
                      <Box>
                        <Box
                          sx={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            fontSize: "1.25rem",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: "custom_error_alpha",
                            color: "custom_error",
                          }}
                        >
                          <RiErrorWarningLine />
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="h6" color="text.primary">
                          Connection Failed
                        </Typography>

                        <Typography variant="body1" color="text.secondary">
                          {typeof error === "string"
                            ? error
                            : "The connection to the server has been lost. Please try again later."}
                        </Typography>

                        <Button
                          onClick={() => {
                            setError(null);

                            // Reconnect
                            setTimeout(() => {
                              // Hacky way to get rerender but maintaining truthy/falsy value
                            }, 300);
                          }}
                          sx={{ mt: 2 }}
                          endIcon={<KeyboardArrowRight />}
                        >
                          Try Again
                        </Button>
                      </Box>
                    </Stack>
                  ) : null}
                </>
              }
            </Stack>
          </Box>

          <Box pt={4} flexShrink={0}>
            <Stack direction="row" spacing={2}>
              <TextField
                autoFocus={true}
                placeholder="Send a message"
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
