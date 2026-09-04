import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
  } = useChatStore();
  const { authUser } = useAuthStore();
  
  // Ref to the actual scrollable messages container
  const scrollContainerRef = useRef(null);

  // Fetch messages when selected user changes
  useEffect(() => {
    if (selectedUser?._id) {
      getMessagesByUserId(selectedUser._id);
    }
  }, [selectedUser, getMessagesByUserId]);

  // Guaranteed Auto-Scroll on new messages or image render
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    };

    scrollToBottom();
    // Second pass after 60ms to account for image renders
    const timeout = setTimeout(scrollToBottom, 60);
    return () => clearTimeout(timeout);
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessagesLoadingSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <ChatHeader />

      {/* Attach ref to this overflow-y-auto container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        ) : (
          messages.map((message) => {
            const isMe = message.senderId === authUser._id;
            return (
              <div
                key={message._id}
                className={`chat ${isMe ? "chat-end" : "chat-start"}`}
              >
                <div className="chat-image avatar">
                  <div className="size-8 rounded-full">
                    <img
                      src={
                        isMe
                          ? authUser.profilePic || "/avatar.png"
                          : selectedUser.profilePic || "/avatar.png"
                      }
                      alt="avatar"
                    />
                  </div>
                </div>

                <div
                  className={`chat-bubble flex flex-col gap-1 text-sm ${
                    isMe
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-800 text-slate-200"
                  }`}
                >
                  {message.image && (
                    <img
                      src={message.image}
                      alt="attachment"
                      className="rounded-lg max-h-60 object-cover my-1"
                      onLoad={() => {
                        if (scrollContainerRef.current) {
                          scrollContainerRef.current.scrollTop =
                            scrollContainerRef.current.scrollHeight;
                        }
                      }}
                    />
                  )}
                  {message.text && <p>{message.text}</p>}
                </div>

                <div className="chat-footer opacity-50 text-[10px] mt-1">
                  {message.createdAt
                    ? new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </div>
              </div>
            );
          })
        )}
      </div>

      <MessageInput />
    </div>
  );
}

export default ChatContainer;