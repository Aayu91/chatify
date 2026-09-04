import React, { useEffect, useRef } from "react";
import { useCallStore } from "../store/useCallStore";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone } from "lucide-react";

export default function CallModal() {
  const {
    callStatus,
    callType,
    callerData,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoPaused,
    answerCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Attach local stream preview (muted so you don't hear your own echo)
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // CRITICAL: Always attach remote audio to audio tag so voice works in both audio and video calls
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch((e) => console.log("Audio play allowed:", e));
    }
    if (remoteVideoRef.current && remoteStream && callType === "video") {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((e) => console.log("Video play allowed:", e));
    }
  }, [remoteStream, callType]);

  if (callStatus === "idle") return null;

  // Incoming Call Ring Screen
  if (callStatus === "incoming") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
        <div className="bg-slate-900 border border-slate-700/60 rounded-3xl p-6 flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full mx-4">
          <div className="relative">
            <img
              src={callerData?.callerAvatar || "/avatar.png"}
              alt="caller"
              className="w-24 h-24 rounded-full border-4 border-cyan-500 animate-pulse object-cover shadow-lg"
            />
          </div>

          <div className="text-center">
            <h3 className="font-semibold text-lg text-white">
              {callerData?.callerName || "Incoming Call"}
            </h3>
            <p className="text-xs text-cyan-400 capitalize">Incoming {callType} call...</p>
          </div>

          <div className="flex gap-8 mt-4">
            <button
              onClick={rejectCall}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer"
              title="Decline"
            >
              <PhoneOff size={24} />
            </button>
            <button
              onClick={answerCall}
              className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center shadow-lg animate-pulse transition-all active:scale-95 cursor-pointer"
              title="Answer"
            >
              <Phone size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active / Calling Screen
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4">
      {/* Hidden Audio element guarantees remote sound plays */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Main Remote Display */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950">
        {callType === "video" && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="w-28 h-28 rounded-full bg-cyan-500/20 border-2 border-cyan-500/40 flex items-center justify-center animate-pulse">
              <Phone size={48} className="text-cyan-400" />
            </div>
            <p className="text-xl font-medium text-slate-200">
              {callStatus === "calling" ? "Calling..." : "Audio Connected"}
            </p>
          </div>
        )}

        {/* Local Video Thumbnail (PIP) */}
        {callType === "video" && localStream && (
          <div className="absolute top-4 right-4 w-32 h-44 sm:w-48 sm:h-64 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Floating Control Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/80 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-white/10">
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-all cursor-pointer ${
            isAudioMuted ? "bg-red-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"
          }`}
          title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {callType === "video" && (
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-all cursor-pointer ${
              isVideoPaused ? "bg-red-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"
            }`}
            title={isVideoPaused ? "Turn Video On" : "Turn Video Off"}
          >
            {isVideoPaused ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
        )}

        <button
          onClick={endCall}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all active:scale-95 cursor-pointer"
          title="End Call"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}