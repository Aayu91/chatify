import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  unreadCounts: {}, // { [userId]: number }
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

setActiveTab: (tab) => set({ activeTab: tab }),

  setSelectedUser: (selectedUser) => {
  if (selectedUser) {
    const userId = (selectedUser._id || selectedUser).toString();
    set((state) => ({
      selectedUser,
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: 0,
      },
    }));
  } else {
    set({ selectedUser: null });
  }
},

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },

 getMyChatPartners: async () => {
  // Only show skeleton loader if chats are completely empty (initial load)
  if (get().chats.length === 0) {
    set({ isUsersLoading: true });
  }
  try {
    const res = await axiosInstance.get("/messages/chats");
    const chatsData = res.data;
    // Merge database unread counts with current state so nothing disappears
    set((state) => {
      const mergedCounts = { ...state.unreadCounts };
      chatsData.forEach((partner) => {
        const partnerId = partner._id.toString();
        // If state already has unread count, keep the higher number
        if (partner.unreadCount) {
          mergedCounts[partnerId] = Math.max(
            mergedCounts[partnerId] || 0,
            partner.unreadCount
          );
        }
      });
      return {
        chats: chatsData,
        unreadCounts: mergedCounts,
      };
    });
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to load chats");
  } finally {
    set({ isUsersLoading: false });
  }
},

  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    set({ messages: [...messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: messages.concat(res.data) });
      // Refresh chat list to update latest order
      get().getMyChatPartners();
    } catch (error) {
      set({ messages: messages });
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

subscribeToMessages: () => {
  const socket = useAuthStore.getState().socket;
  if (!socket) return;
  socket.off("newMessage"); // Avoid duplicate listeners
  socket.on("newMessage", (newMessage) => {
    const { selectedUser, isSoundEnabled, chats } = get();
    const senderId = newMessage.senderId.toString();
    const isFromCurrentChat =
      selectedUser && selectedUser._id.toString() === senderId;
    if (isFromCurrentChat) {
      set((state) => ({ messages: [...state.messages, newMessage] }));
    } else {
      // 1. Permanently increment unread badge
      set((state) => ({
        unreadCounts: {
          ...state.unreadCounts,
          [senderId]: (state.unreadCounts[senderId] || 0) + 1,
        },
      }));
      // 2. Move sender to the top of the chat list instantly without an HTTP reload
      const senderIndex = chats.findIndex((c) => c._id.toString() === senderId);
      if (senderIndex > -1) {
        const updatedChats = [...chats];
        const [senderChat] = updatedChats.splice(senderIndex, 1);
        updatedChats.unshift(senderChat);
        set({ chats: updatedChats });
      } else {
        // If first time receiving a message from this person, fetch once
        get().getMyChatPartners();
      }
    }
    if (isSoundEnabled) {
      const sound = new Audio("/sounds/notification.mp3");
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  });
},

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.off("newMessage");
  },

  sendFriendRequest: async (userId) => {
    try {
      await axiosInstance.post(`/friends/send/${userId}`);
      toast.success("Friend request sent!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send request");
    }
  },

  acceptFriendRequest: async (userId) => {
    try {
      await axiosInstance.post(`/friends/accept/${userId}`);
      toast.success("Friend request accepted!");
      get().getAllContacts();
      get().getMyChatPartners();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept request");
    }
  },

  rejectFriendRequest: async (userId) => {
    try {
      await axiosInstance.post(`/friends/reject/${userId}`);
      toast.success("Friend request rejected");
      get().getAllContacts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject request");
    }
  },
}));