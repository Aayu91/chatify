import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import { useAuthStore } from "../store/useAuthStore";

function ChatsList() {
  const { getMyChatPartners, chats, isUsersLoading, setSelectedUser, selectedUser, unreadCounts } =
    useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getMyChatPartners();
  }, [getMyChatPartners]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;

  return (
    <div className="space-y-2">
      {chats.map((chat) => {
        const isOnline = onlineUsers.includes(chat._id);
        const isSelected = selectedUser?._id === chat._id;
        const unread = unreadCounts?.[chat._id] || 0;

        return (
          <div
            key={chat._id}
            onClick={() => setSelectedUser(chat)}
            className={`p-4 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
              isSelected
                ? "bg-cyan-500/20 border border-cyan-500/40"
                : "bg-cyan-500/10 hover:bg-cyan-500/20"
            }`}
          >
            {/* User Details */}
            <div className="flex items-center gap-3">
              <div className={`avatar ${isOnline ? "online" : "offline"}`}>
                <div className="size-12 rounded-full">
                  <img src={chat.profilePic || "/avatar.png"} alt={chat.fullName} />
                </div>
              </div>
              <div className="text-left">
                <h4 className="text-slate-200 font-medium">{chat.fullName}</h4>
                <p className="text-xs text-slate-400">{isOnline ? "Online" : "Offline"}</p>
              </div>
            </div>

            {/* UNREAD BADGE */}
            {unread > 0 && (
              <span className="bg-cyan-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">
                {unread}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ChatsList;