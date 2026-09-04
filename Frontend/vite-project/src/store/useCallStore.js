import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

let queuedCandidates = [];
let pendingRemoteCandidates = [];

export const useCallStore = create((set, get) => ({
  callStatus: "idle", // 'idle' | 'calling' | 'incoming' | 'connected'
  callType: "video",
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
      pendingRemoteCandidates = [];
      set({
        callStatus: "incoming",
        callType: callType || "video",
        peerSocketId: fromSocketId,
        callerData: { callerName, callerAvatar, signalData },
      });
    });

    socket.on("call:accepted", async ({ signalData, fromSocketId }) => {
      const pc = get().peerConnection;
      if (pc) {
        set({ peerSocketId: fromSocketId, callStatus: "connected" });
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));

          // Flush caller's queued candidates
          queuedCandidates.forEach((candidate) => {
            socket.emit("call:ice-candidate", {
              toSocketId: fromSocketId,
              candidate,
            });
          });
          queuedCandidates = [];
        } catch (err) {
          console.error("Error setting remote description on caller:", err);
        }
      }
    });

    socket.on("call:ice-candidate", async ({ candidate }) => {
      const pc = get().peerConnection;
      if (!candidate) return;

      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Failed adding ICE candidate:", err);
        }
      } else {
        // Queue candidates until peer connection is initialized and remote description is set
        pendingRemoteCandidates.push(candidate);
      }
    });

    socket.on("call:rejected", () => {
      alert("Call declined");
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

    queuedCandidates = [];
    pendingRemoteCandidates = [];

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true,
      });
    } catch (err) {
      console.warn("Could not get requested media, trying audio only:", err);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      } catch (audioErr) {
        alert("Microphone/Camera permission denied or device busy.");
        return get().cleanupCall();
      }
    }

    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          set({ remoteStream: event.streams[0] });
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const peerId = get().peerSocketId;
          if (peerId) {
            socket.emit("call:ice-candidate", {
              toSocketId: peerId,
              candidate: event.candidate,
            });
          } else {
            queuedCandidates.push(event.candidate);
          }
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
      console.error("Call initialization error:", err);
      get().cleanupCall();
    }
  },

  answerCall: async () => {
    const { callerData, callType, peerSocketId } = get();
    const socket = useAuthStore.getState().socket;
    if (!callerData || !socket) return;

    // Transition UI to connected immediately so screen never disappears
    set({ callStatus: "connected" });

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true,
      });
    } catch (err) {
      console.warn("Camera occupied on same device, falling back to audio:", err);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      } catch (audioErr) {
        console.error("Audio fallback failed:", audioErr);
      }
    }

    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          set({ remoteStream: event.streams[0] });
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && peerSocketId) {
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
      });

      socket.emit("call:accept", {
        toSocketId: peerSocketId,
        signalData: answer,
      });

      // Process any queued incoming ICE candidates
      pendingRemoteCandidates.forEach(async (candidate) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {}
      });
      pendingRemoteCandidates = [];
    } catch (err) {
      console.error("Error establishing answer connection:", err);
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
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isAudioMuted;
      });
      set({ isAudioMuted: !isAudioMuted });
    }
  },

  toggleVideo: () => {
    const { localStream, isVideoPaused } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoPaused;
      });
      set({ isVideoPaused: !isVideoPaused });
    }
  },

  cleanupCall: () => {
    const { localStream, peerConnection } = get();
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }
    queuedCandidates = [];
    pendingRemoteCandidates = [];
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