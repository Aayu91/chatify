import React from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

function ActiveTabSwitch() {
  const { activeTab, setActiveTab, unreadCounts } = useChatStore();
  const { authUser } = useAuthStore();

  // Total unread messages across all users
  const totalUnreadMessages = Object.values(unreadCounts || {}).reduce(
    (total, count) => total + count,
    0
  );

  // Total pending incoming friend requests
  const pendingRequestsCount =
    authUser?.friendRequests?.filter((r) => r.status === "pending")?.length || 0;

  return (
    <div className="flex bg-slate-800/60 p-1 rounded-xl border border-slate-700/50 mb-4">
      {/* Chats Tab Button with Unread Message Count */}
      <button
        onClick={() => setActiveTab("chats")}
        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          activeTab === "chats"
            ? "bg-cyan-500 text-white shadow"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <span>Chats</span>
        {totalUnreadMessages > 0 && (
          <span
            className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full shadow-sm ${
              activeTab === "chats"
                ? "bg-slate-900 text-cyan-400"
                : "bg-cyan-500 text-slate-900 animate-pulse"
            }`}
          >
            {totalUnreadMessages}
          </span>
        )}
      </button>

      {/* Contacts Tab Button with Pending Friend Request Count */}
      <button
        onClick={() => setActiveTab("contacts")}
        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          activeTab === "contacts"
            ? "bg-cyan-500 text-white shadow"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <span>Contacts</span>
        {pendingRequestsCount > 0 && (
          <span className="bg-pink-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
            {pendingRequestsCount}
          </span>
        )}
      </button>
    </div>
  );
}

export default ActiveTabSwitch;