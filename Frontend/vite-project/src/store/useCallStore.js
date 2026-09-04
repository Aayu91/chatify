import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

const ICE_SERVERS = {
  iceServers: [
    { urls: import.meta.env.VITE_STUN_SERVER || "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useCallStore = create((set, get) => ({
  callStatus: "idle", // 'idle' | 'calling' | 'incoming' | 'connected'
  callType: "video", // 'audio' | 'video'
  peerSocketId: null,
  callerData: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  isAudioMuted: false,
  isVideoPaused: false,

  initCallListeners: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("call:incoming");
    socket.off("call:accepted");
    socket.off("call:ice-candidate");
    socket.off("call:rejected");
    socket.off("call:ended");
    socket.off("call:unavailable");

    socket.on("call:incoming", ({ fromSocketId, signalData, callType, callerName, callerAvatar }) => {
      set({
        callStatus: "incoming",
        callType,
        peerSocketId: fromSocketId,
        callerData: { callerName, callerAvatar, signalData },
      });
    });

    socket.on("call:accepted", async ({ signalData, fromSocketId }) => {
      const pc = get().peerConnection;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        set({ callStatus: "connected", peerSocketId: fromSocketId });
      }
    });

    socket.on("call:ice-candidate", async ({ candidate }) => {
      const pc = get().peerConnection;
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Failed adding ICE candidate", err);
        }
      }
    });

    socket.on("call:rejected", () => {
      alert("Call rejected");
      get().cleanupCall();
    });

    socket.on("call:ended", () => {
      get().cleanupCall();
    });

    socket.on("call:unavailable", () => {
      alert("User is offline or unavailable");
      get().cleanupCall();
    });
  },

  startCall: async (targetUserId, callType = "video") => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    if (!socket) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true,
      });

      const pc = new RTCPeerConnection(ICE_SERVERS);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        set({ remoteStream: event.streams[0] });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && get().peerSocketId) {
          socket.emit("call:ice-candidate", {
            toSocketId: get().peerSocketId,
            candidate: event.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      set({
        localStream: stream,
        peerConnection: pc,
        callStatus: "calling",
        callType,
      });

      socket.emit("call:user", {
        userToCall: targetUserId,
        signalData: offer,
        callType,
        callerName: authUser.fullName,
        callerAvatar: authUser.profilePic,
      });
    } catch (err) {
      console.error("Camera/mic permission error:", err);
      alert("Please allow camera and microphone access");
      get().cleanupCall();
    }
  },

  answerCall: async () => {
    const { callerData, callType, peerSocketId } = get();
    const socket = useAuthStore.getState().socket;
    if (!callerData || !socket) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true,
      });

      const pc = new RTCPeerConnection(ICE_SERVERS);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        set({ remoteStream: event.streams[0] });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:ice-candidate", {
            toSocketId: peerSocketId,
            candidate: event.candidate,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(callerData.signalData));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      set({
        localStream: stream,
        peerConnection: pc,
        callStatus: "connected",
      });

      socket.emit("call:accept", {
        toSocketId: peerSocketId,
        signalData: answer,
      });
    } catch (err) {
      console.error("Error answering call:", err);
      get().cleanupCall();
    }
  },

  rejectCall: () => {
    const { peerSocketId } = get();
    const socket = useAuthStore.getState().socket;
    if (socket && peerSocketId) {
      socket.emit("call:reject", { toSocketId: peerSocketId });
    }
    get().cleanupCall();
  },

  endCall: () => {
    const { peerSocketId } = get();
    const socket = useAuthStore.getState().socket;
    if (socket && peerSocketId) {
      socket.emit("call:end", { toSocketId: peerSocketId });
    }
    get().cleanupCall();
  },

  toggleAudio: () => {
    const { localStream, isAudioMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = isAudioMuted));
      set({ isAudioMuted: !isAudioMuted });
    }
  },

  toggleVideo: () => {
    const { localStream, isVideoPaused } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = isVideoPaused));
      set({ isVideoPaused: !isVideoPaused });
    }
  },

  cleanupCall: () => {
    const { localStream, peerConnection } = get();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }
    set({
      callStatus: "idle",
      peerSocketId: null,
      callerData: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      isAudioMuted: false,
      isVideoPaused: false,
    });
  },
}));