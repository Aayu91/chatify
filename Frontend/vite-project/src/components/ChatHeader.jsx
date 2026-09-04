import { useEffect } from "react";
import { Phone, Video, XIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";

function ChatHeader() {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { startCall } = useCallStore();
  const isOnline = onlineUsers.includes(selectedUser?._id);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };

    window.addEventListener("keydown", handleEscKey);

    // cleanup function
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  return (
    <div
      className="flex justify-between items-center bg-slate-800/50 border-b
   border-slate-700/50 max-h-[84px] px-6 flex-1"
    >
      {/* User Info */}
      <div className="flex items-center space-x-3">
        <div className={`avatar ${isOnline ? "online" : "offline"}`}>
          <div className="w-12 rounded-full">
            <img src={selectedUser?.profilePic || "/avatar.png"} alt={selectedUser?.fullName} />
          </div>
        </div>

        <div>
          <h3 className="text-slate-200 font-medium">{selectedUser?.fullName}</h3>
          <p className="text-slate-400 text-sm">{isOnline ? "Online" : "Offline"}</p>
        </div>
      </div>

      {/* Action Buttons (Call, Video, Close) */}
      <div className="flex items-center gap-3">
        {isOnline && (
          <>
            <button
              onClick={() => startCall(selectedUser._id, "audio")}
              className="p-2 rounded-full hover:bg-slate-700/60 text-slate-400 hover:text-green-400 transition-colors cursor-pointer"
              title="Voice Call"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              onClick={() => startCall(selectedUser._id, "video")}
              className="p-2 rounded-full hover:bg-slate-700/60 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
              title="Video Call"
            >
              <Video className="w-5 h-5" />
            </button>
          </>
        )}

        <button
          onClick={() => setSelectedUser(null)}
          className="p-2 rounded-full hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title="Close chat"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;