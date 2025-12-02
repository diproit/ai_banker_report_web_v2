import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  MessageSquare,
  Bot,
  User,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useChatLanguage } from "../../contexts/ChatLanguageContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../css/ChatUI.css";
import chatClient from "../../clients/chatClient";
import { get } from "../../clients/apiClient";

const ChatUI = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState([]);
  const [error, setError] = useState(null);
  const [promptsDisabled, setPromptsDisabled] = useState(false);
  const [placeholderInputs, setPlaceholderInputs] = useState({});
  const messagesEndRef = useRef(null);
  const { t } = useTranslation();
  const { chatLanguage } = useChatLanguage();

  // Utility function to extract placeholders from text
  const extractPlaceholders = (text) => {
    if (!text) return [];
    const matches = text.match(/\{(\w+)\}/g);
    return matches ? matches.map((match) => match.slice(1, -1)) : [];
  };

  // Utility function to get display text with placeholders removed
  const getDisplayText = (text, placeholders) => {
    if (!text || !placeholders.length) return text;
    let displayText = text;
    placeholders.forEach((placeholder) => {
      displayText = displayText.replace(`{${placeholder}}`, "");
    });
    return displayText.trim();
  };

  // Utility function to format placeholder name for display
  const formatPlaceholderName = (placeholder) => {
    return placeholder
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!chatLanguage) return;

    const fetchQuickPrompts = async () => {
      try {
        const response = await get(
          `/chat/quick-prompts/${encodeURIComponent(chatLanguage)}`
        );

        // Handle different response formats for quick prompts
        let prompts = [];

        if (response?.prompts && Array.isArray(response.prompts)) {
          prompts = response.prompts;
        } else if (
          response?.quick_prompts &&
          Array.isArray(response.quick_prompts)
        ) {
          prompts = response.quick_prompts;
        } else if (Array.isArray(response)) {
          prompts = response;
        } else if (response && typeof response === "object") {
          // Try to find any array property that might contain prompts
          const possiblePromptKeys = [
            "prompts",
            "quick_prompts",
            "data",
            "items",
          ];
          for (const key of possiblePromptKeys) {
            if (response[key] && Array.isArray(response[key])) {
              prompts = response[key];
              break;
            }
          }
        }

        // Ensure prompts have the expected structure with id and prompt_text
        const formattedPrompts = prompts
          .map((prompt, index) => {
            if (typeof prompt === "string") {
              return {
                id: `prompt-${index}`,
                prompt_text: prompt,
                prompt: prompt,
              };
            } else if (prompt.prompt_text || prompt.text || prompt.prompt) {
              // Preserve all fields from the original prompt
              return {
                ...prompt,
                id: prompt.id || `prompt-${index}`,
                prompt_text:
                  prompt.prompt_text || prompt.text || prompt.prompt || "",
              };
            }
            return prompt;
          })
          .filter((prompt) => prompt.prompt_text);

        setQuickPrompts(formattedPrompts);
      } catch (err) {
        console.error(
          "Error fetching quick prompts for",
          chatLanguage,
          ":",
          err
        );

        // Try English as fallback if not already English
        if (chatLanguage !== "English") {
          try {
            const englishResponse = await get("/chat/quick-prompts/English");

            let englishPrompts = [];

            if (
              englishResponse?.prompts &&
              Array.isArray(englishResponse.prompts)
            ) {
              englishPrompts = englishResponse.prompts;
            } else if (
              englishResponse?.quick_prompts &&
              Array.isArray(englishResponse.quick_prompts)
            ) {
              englishPrompts = englishResponse.quick_prompts;
            } else if (Array.isArray(englishResponse)) {
              englishPrompts = englishResponse;
            }

            // Format English prompts
            const formattedEnglishPrompts = englishPrompts
              .map((prompt, index) => {
                if (typeof prompt === "string") {
                  return {
                    id: `prompt-${index}`,
                    prompt_text: prompt,
                    prompt: prompt,
                  };
                } else if (prompt.prompt_text || prompt.text || prompt.prompt) {
                  // Preserve all fields from the original prompt
                  return {
                    ...prompt,
                    id: prompt.id || `prompt-${index}`,
                    prompt_text:
                      prompt.prompt_text || prompt.text || prompt.prompt || "",
                  };
                }
                return prompt;
              })
              .filter((prompt) => prompt.prompt_text);

            setQuickPrompts(formattedEnglishPrompts);
          } catch (engErr) {
            console.error("Error fetching English prompts:", engErr);
            setQuickPrompts([]);
          }
        } else {
          setQuickPrompts([]);
        }
      }
    };

    fetchQuickPrompts();
  }, [chatLanguage]);

  const handleSendMessage = async (message = inputValue) => {
    if (!message.trim()) return;

    const userMessage = {
      text: message,
      sender: "user",
      isMarkdown: false,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);
    setPromptsDisabled(true);

    // Send user-typed message to /chat/send for instant response
    const requestData = {
      user_message: message,
      selected_language: chatLanguage,
    };
    try {
      const response = await chatClient.send(requestData);
      const aiResponse = {
        text:
          response?.response ||
          "I couldn't generate a response. Please try again.",
        sender: "ai",
        isMarkdown: true,
        timestamp: new Date(),
        hasError: !response?.response,
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error fetching AI response:", error);
      let errorMessage = "Sorry, I encountered an error. ";
      if (error.code === "ECONNABORTED") {
        errorMessage += "Request timed out.";
      } else if (error.response?.status === 401) {
        errorMessage = "Session expired. Please login again.";
        setError(errorMessage);
      } else if (error.response?.status === 429) {
        errorMessage += "Too many requests. Please wait a moment.";
      } else if (error.response?.status >= 500) {
        errorMessage += "Server error. Please try again.";
      } else {
        errorMessage += "Please try again.";
      }
      setMessages((prev) => [
        ...prev,
        {
          text: errorMessage,
          sender: "ai",
          isMarkdown: false,
          timestamp: new Date(),
          hasError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      setPromptsDisabled(false);
    }
  };

  const handleRetryMessage = async (messageIndex) => {
    const messageToRetry = messages[messageIndex - 1];
    if (!messageToRetry || messageToRetry.sender !== "user") return;

    setIsLoading(true);
    setError(null);
    setPromptsDisabled(true);

    // Remove the failed AI response
    const updatedMessages = messages.slice(0, messageIndex);
    setMessages(updatedMessages);

    try {
      const response = await chatClient.send({
        prompt: messageToRetry.text,
      });

      const aiResponse = {
        text:
          response?.response ||
          "I couldn't generate a response. Please try again.",
        sender: "ai",
        isMarkdown: true,
        timestamp: new Date(),
        hasError: !response.data?.response,
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error fetching AI response:", error);

      if (error.response?.status === 401) {
        setError("Session expired. Please login again.");
      } else {
        setError("Sorry, I encountered an error. Please try again.");
      }

      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, I encountered an error. Please try again.",
          sender: "ai",
          isMarkdown: false,
          timestamp: new Date(),
          hasError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      setPromptsDisabled(false);
    }
  };

  const handleQuickPromptClick = (promptId) => {
    if (isLoading || promptsDisabled) return;

    executeQuickPrompt(promptId);
  };

  const handlePlaceholderSubmit = (promptId, placeholders, inputValues) => {
    // Validate that all required placeholders have values
    const missingValues = placeholders.filter(
      (placeholder) =>
        !inputValues[placeholder] || !inputValues[placeholder].trim()
    );

    if (missingValues.length > 0) {
      setError(
        `Please enter values for: ${missingValues.map(formatPlaceholderName).join(", ")}`
      );
      return;
    }

    if (isLoading || promptsDisabled) return;

    // Create form_data object with all placeholder values
    const formData = {};
    placeholders.forEach((placeholder) => {
      formData[placeholder] = inputValues[placeholder].trim();
    });

    executeQuickPrompt(promptId, formData);

    // Clear the inputs after submission
    setPlaceholderInputs((prev) => ({
      ...prev,
      [promptId]: {},
    }));
  };

  const executeQuickPrompt = (promptId, formData = null) => {
    const selectedPrompt = quickPrompts.find((p) => p.id === promptId);
    let promptText = selectedPrompt?.prompt_text || "Quick prompt";
    // Replace placeholders in prompt text with actual values for display
    if (formData) {
      Object.keys(formData).forEach((key) => {
        promptText = promptText.replace(`{${key}}`, formData[key]);
      });
    }

    setIsLoading(true);
    setError(null);
    setPromptsDisabled(true);

    const requestData = {
      prompt_id: promptId,
      selected_language: chatLanguage,
      form_data: formData || {},
    };

    // Add user message immediately
    const userMessage = {
      text: promptText,
      sender: "user",
      isMarkdown: false,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send quick prompt to /chat/send for instant response
    (async () => {
      try {
        const response = await chatClient.send(requestData);
        const aiResponse = {
          text:
            response?.response ||
            "I couldn't generate a response. Please try again.",
          sender: "ai",
          isMarkdown: true,
          timestamp: new Date(),
          hasError: !response?.response,
        };
        setMessages((prev) => [...prev, aiResponse]);
      } catch (error) {
        console.error("Error fetching AI response:", error);
        let errorMessage = "Sorry, I encountered an error. ";
        if (error.code === "ECONNABORTED") {
          errorMessage += "Request timed out.";
        } else if (error.response?.status === 401) {
          errorMessage = "Session expired. Please login again.";
          setError(errorMessage);
        } else if (error.response?.status === 429) {
          errorMessage += "Too many requests. Please wait a moment.";
        } else if (error.response?.status >= 500) {
          errorMessage += "Server error. Please try again.";
        } else {
          errorMessage += "Please try again.";
        }
        setMessages((prev) => [
          ...prev,
          {
            text: errorMessage,
            sender: "ai",
            isMarkdown: false,
            timestamp: new Date(),
            hasError: true,
          },
        ]);
      } finally {
        setIsLoading(false);
        setPromptsDisabled(false);
      }
    })();
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMessageContent = (message, index) => {
    if (message.isMarkdown) {
      return (
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Headings
              h1: ({ node, ...props }) => (
                <h1
                  className="markdown-heading markdown-h1"
                  aria-label={
                    props.children && props.children.length > 0
                      ? undefined
                      : "Heading"
                  }
                  {...props}
                >
                  {props.children && props.children.length > 0 ? (
                    props.children
                  ) : (
                    <span aria-hidden="true">Heading</span>
                  )}
                </h1>
              ),
              h2: ({ node, ...props }) => (
                <h2
                  className="markdown-heading markdown-h2"
                  aria-label={
                    props.children && props.children.length > 0
                      ? undefined
                      : "Subheading"
                  }
                  {...props}
                >
                  {props.children && props.children.length > 0 ? (
                    props.children
                  ) : (
                    <span aria-hidden="true">Subheading</span>
                  )}
                </h2>
              ),
              h3: ({ node, ...props }) => (
                <h3
                  className="markdown-heading markdown-h3"
                  aria-label={
                    props.children && props.children.length > 0
                      ? undefined
                      : "Section"
                  }
                  {...props}
                >
                  {props.children && props.children.length > 0 ? (
                    props.children
                  ) : (
                    <span aria-hidden="true">Section</span>
                  )}
                </h3>
              ),
              h4: ({ node, ...props }) => (
                <h4
                  className="markdown-heading markdown-h4"
                  aria-label={
                    props.children && props.children.length > 0
                      ? undefined
                      : "Subsection"
                  }
                  {...props}
                >
                  {props.children && props.children.length > 0 ? (
                    props.children
                  ) : (
                    <span aria-hidden="true">Subsection</span>
                  )}
                </h4>
              ),
              h5: ({ node, ...props }) => (
                <h5
                  className="markdown-heading markdown-h5"
                  aria-label={
                    props.children && props.children.length > 0
                      ? undefined
                      : "Heading"
                  }
                  {...props}
                >
                  {props.children && props.children.length > 0 ? (
                    props.children
                  ) : (
                    <span aria-hidden="true">Heading</span>
                  )}
                </h5>
              ),
              h6: ({ node, ...props }) => (
                <h6
                  className="markdown-heading markdown-h6"
                  aria-label={
                    props.children && props.children.length > 0
                      ? undefined
                      : "Heading"
                  }
                  {...props}
                >
                  {props.children && props.children.length > 0 ? (
                    props.children
                  ) : (
                    <span aria-hidden="true">Heading</span>
                  )}
                </h6>
              ),

              // Paragraphs
              p: ({ node, ...props }) => (
                <p className="markdown-paragraph" {...props} />
              ),

              // Lists
              ul: ({ node, ...props }) => (
                <ul className="markdown-list" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="markdown-ordered-list" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="markdown-list-item" {...props} />
              ),

              // Blockquotes
              blockquote: ({ node, ...props }) => (
                <blockquote className="markdown-blockquote" {...props} />
              ),

              // Code blocks
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <div className="markdown-code-block">
                    <div className="code-language">{match[1]}</div>
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </div>
                ) : (
                  <code className="markdown-inline-code" {...props}>
                    {children}
                  </code>
                );
              },

              // Tables
              table: ({ node, ...props }) => (
                <div className="markdown-table-container">
                  <table className="markdown-table" {...props} />
                </div>
              ),
              thead: ({ node, ...props }) => (
                <thead className="markdown-table-head" {...props} />
              ),
              tbody: ({ node, ...props }) => (
                <tbody className="markdown-table-body" {...props} />
              ),
              tr: ({ node, ...props }) => (
                <tr className="markdown-table-row" {...props} />
              ),
              th: ({ node, ...props }) => (
                <th className="markdown-table-header" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="markdown-table-cell" {...props} />
              ),

              // Links
              a: ({ node, ...props }) => {
                const children =
                  props.children && props.children.length > 0 ? (
                    props.children
                  ) : (
                    <span aria-hidden="true">Link</span>
                  );
                return (
                  <a
                    className="markdown-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={
                      props.children && props.children.length > 0
                        ? undefined
                        : "Link"
                    }
                    {...props}
                  >
                    {children}
                  </a>
                );
              },

              // Emphasis
              strong: ({ node, ...props }) => (
                <strong className="markdown-strong" {...props} />
              ),
              em: ({ node, ...props }) => (
                <em className="markdown-emphasis" {...props} />
              ),

              // Horizontal rule
              hr: ({ node, ...props }) => (
                <hr className="markdown-hr" {...props} />
              ),
            }}
          >
            {message.text}
          </ReactMarkdown>
        </div>
      );
    }
    return <p className="message-text">{message.text}</p>;
  };

  return (
    <div className="chat-container">
      <div className="messages-container">
        <div className="messages-content">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Sparkles size={20} />
              </div>
              <h3 className="empty-state-title">
                {t("chat.empty_title", "How can I help you today?")}
              </h3>
              <p className="empty-state-subtitle">
                {t(
                  "chat.empty_subtitle",
                  "Ask me anything about microfinance in Sri Lanka"
                )}
              </p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg, index) => (
                <div key={index} className={`message-wrapper ${msg.sender}`}>
                  <div className={`message-bubble ${msg.sender}`}>
                    <div className="message-avatar">
                      {msg.sender === "user" ? (
                        <User size={12} />
                      ) : (
                        <Bot size={12} />
                      )}
                    </div>
                    <div className="message-body">
                      <div
                        className={`message-content ${msg.streaming ? "streaming" : ""} ${msg.streamingComplete ? "streaming-complete" : ""}`}
                      >
                        {renderMessageContent(msg, index)}
                        {msg.hasError && (
                          <button
                            className="retry-button"
                            onClick={() => handleRetryMessage(index)}
                            disabled={isLoading}
                            title={t("chat.retry", "Retry")}
                            type="button"
                          >
                            <RefreshCw size={12} />
                          </button>
                        )}
                      </div>
                      {msg.timestamp && (
                        <p
                          className={`message-timestamp ${msg.streaming ? "streaming-active" : ""}`}
                        >
                          {formatTime(msg.timestamp)}
                          {msg.streaming && (
                            <span className="streaming-indicator">
                              streaming
                              <span className="streaming-dots">
                                <span className="streaming-dot"></span>
                                <span className="streaming-dot"></span>
                                <span className="streaming-dot"></span>
                              </span>
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && !messages.some((msg) => msg.streaming) && (
                <div className="message-wrapper ai">
                  <div className="message-bubble ai">
                    <div className="message-avatar">
                      <Bot size={12} />
                    </div>
                    <div className="message-body">
                      <div className="message-content">
                        <div className="typing-indicator">
                          <div className="typing-dots">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                          </div>
                          <span className="typing-text">
                            {t("chat.ai_thinking", "AI is thinking...")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {error && (
            <div className="error-message">
              <AlertCircle className="error-icon" size={14} />
              <div className="error-content">
                <p className="error-title">{t("chat.error_title", "Error")}</p>
                <p className="error-text">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="quick-prompts-container">
        <div className="quick-prompts">
          <div className="prompts-grid">
            {quickPrompts.length > 0 ? (
              quickPrompts.slice(0, 6).map((prompt) => {
                const placeholders = extractPlaceholders(prompt.prompt_text);
                const hasPlaceholders = placeholders.length > 0;

                if (hasPlaceholders) {
                  const displayText = getDisplayText(
                    prompt.prompt_text,
                    placeholders
                  );
                  const promptInputs = placeholderInputs[prompt.id] || {};

                  return (
                    <div
                      key={prompt.id}
                      className={`prompt-card placeholder-card ${isLoading || promptsDisabled ? "disabled" : ""}`}
                    >
                      <div className="prompt-content">
                        <MessageSquare className="prompt-icon" size={12} />
                        <div className="placeholder-content-inline">
                          <span className="prompt-text">{displayText}</span>
                          {placeholders.map((placeholder, index) => (
                            <input
                              key={placeholder}
                              type="text"
                              value={promptInputs[placeholder] || ""}
                              onChange={(e) =>
                                setPlaceholderInputs((prev) => ({
                                  ...prev,
                                  [prompt.id]: {
                                    ...prev[prompt.id],
                                    [placeholder]: e.target.value,
                                  },
                                }))
                              }
                              placeholder={`Enter ${formatPlaceholderName(placeholder)}`}
                              className="placeholder-input-inline"
                              onKeyPress={(e) => {
                                if (e.key === "Enter" && !isLoading) {
                                  handlePlaceholderSubmit(
                                    prompt.id,
                                    placeholders,
                                    promptInputs
                                  );
                                }
                              }}
                              disabled={isLoading || promptsDisabled}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ))}
                          <button
                            className="send-button-one"
                            onClick={() => {
                              if (!isLoading) {
                                handlePlaceholderSubmit(
                                  prompt.id,
                                  placeholders,
                                  promptInputs
                                );
                              }
                            }}
                            disabled={
                              isLoading ||
                              promptsDisabled ||
                              placeholders.some(
                                (ph) =>
                                  !promptInputs[ph] || !promptInputs[ph].trim()
                              )
                            }
                            type="button"
                          >
                            <Send size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={prompt.id}
                      onClick={() =>
                        !isLoading &&
                        !promptsDisabled &&
                        handleQuickPromptClick(prompt.id)
                      }
                      className={`prompt-card ${isLoading || promptsDisabled ? "disabled" : ""}`}
                    >
                      <div className="prompt-content">
                        <MessageSquare className="prompt-icon" size={12} />
                        <span className="prompt-text">
                          {prompt.prompt_text}
                        </span>
                      </div>
                    </div>
                  );
                }
              })
            ) : (
              <div className="no-prompts-message">
                {t(
                  "chat.no_quick_prompts",
                  "No quick prompts available for {{lang}}",
                  { lang: chatLanguage }
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="input-area">
        <div className="input-container">
          <div className="input-wrapper">
            <div className="input-field">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t(
                  "chat.input_placeholder",
                  "Type your message here..."
                )}
                onKeyPress={(e) =>
                  e.key === "Enter" &&
                  !isLoading &&
                  inputValue.trim() &&
                  handleSendMessage()
                }
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() =>
                !isLoading && inputValue.trim() && handleSendMessage()
              }
              disabled={isLoading || !inputValue.trim()}
              className="send-button"
              type="button"
            >
              {isLoading ? (
                <div className="loading-spinner"></div>
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatUI;
