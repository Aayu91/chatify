import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { UserPlus, Clock, MessageSquare, Check, X } from "lucide-react";

function ContactList() {
  const {
    getAllContacts,
    allContacts,
    setSelectedUser,
    setActiveTab,
    isUsersLoading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
  } = useChatStore();
  const { authUser, checkAuth, onlineUsers } = useAuthStore();
  const [sentRequests, setSentRequests] = useState([]);

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  const handleSend = async (e, contactId) => {
    e.stopPropagation();
    if (sendFriendRequest) await sendFriendRequest(contactId);
    setSentRequests((prev) => [...prev, contactId.toString()]);
    if (checkAuth) checkAuth();
  };

  const handleAccept = async (e, contactId) => {
    e.stopPropagation();
    if (acceptFriendRequest) await acceptFriendRequest(contactId);
    getAllContacts();
    if (checkAuth) checkAuth();
  };

  const handleReject = async (e, contactId) => {
    e.stopPropagation();
    if (rejectFriendRequest) await rejectFriendRequest(contactId);
    getAllContacts();
    if (checkAuth) checkAuth();
  };

  const handleOpenChat = (contact) => {
    setSelectedUser(contact);
    setActiveTab("chats");
  };

  if (isUsersLoading) return <UsersLoadingSkeleton />;

  return (
    <div className="space-y-2">
      {allContacts.map((contact) => {
        const isOnline = onlineUsers.includes(contact._id);

        // Safe ID comparison
        const isFriend =
          authUser?.friends?.some((f) => (f?._id || f).toString() === contact._id.toString()) ||
          contact?.friends?.some((f) => (f?._id || f).toString() === authUser?._id.toString());

        // Check if current user sent a pending request
        const isPending =
          sentRequests.includes(contact._id.toString()) ||
          contact?.friendRequests?.some(
            (r) => (r.from?._id || r.from).toString() === authUser?._id.toString() && r.status === "pending"
          );

        // Check if this contact sent a pending request to current user
        const hasIncomingRequest = authUser?.friendRequests?.some(
          (r) => (r.from?._id || r.from).toString() === contact._id.toString() && r.status === "pending"
        );

        return (
          <div
            key={contact._id}
            onClick={() => isFriend && handleOpenChat(contact)}
            className={`p-4 rounded-lg flex items-center justify-between transition-colors ${
              isFriend
                ? "bg-cyan-500/10 hover:bg-cyan-500/20 cursor-pointer"
                : "bg-slate-800/40 hover:bg-slate-800/60"
            }`}
          >
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className={`avatar ${isOnline ? "online" : "offline"}`}>
                <div className="size-12 rounded-full">
                  <img src={contact.profilePic || "/avatar.png"} alt={contact.fullName} />
                </div>
              </div>
              <div>
                <h4 className="text-slate-200 font-medium">{contact.fullName}</h4>
                <p className="text-xs text-slate-400">
                  {isFriend ? (isOnline ? "Online" : "Offline") : "Not Friends"}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div>
              {isFriend ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenChat(contact);
                  }}
                  className="p-2 rounded-full hover:bg-cyan-500/20 text-cyan-400 transition-colors"
                  title="Open Chat"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              ) : hasIncomingRequest ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => handleAccept(e, contact._id)}
                    className="px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold flex items-center gap-1 shadow transition-all active:scale-95"
                    title="Accept Request"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept
                  </button>
                  <button
                    onClick={(e) => handleReject(e, contact._id)}
                    className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white text-xs flex items-center shadow transition-all active:scale-95"
                    title="Decline"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : isPending ? (
                <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5" /> Requested
                </span>
              ) : (
                <button
                  onClick={(e) => handleSend(e, contact._id)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium flex items-center gap-1.5 shadow transition-all active:scale-95"
                >
                  <UserPlus className="w-4 h-4" /> Add Friend
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ContactList;