import React, { useEffect, useRef } from "react";
import { useCallStore } from "../store/useCallStore";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone } from "lucide-react";

// Web Audio Ringtone Generator (Classic Phone Ring Pattern)
function createRingtone() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let intervalId = null;

  const playBurst = () => {
    try {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.value = 440; // Tone 1 (Hz)
      osc2.frequency.value = 480; // Tone 2 (Hz)

      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.8);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 1.8);
      osc2.stop(audioCtx.currentTime + 1.8);
    } catch (e) {
      console.log("Ringtone error:", e);
    }
  };

  return {
    start: () => {
      playBurst();
      intervalId = setInterval(playBurst, 3000); // Rings every 3 seconds
    },
    stop: () => {
      if (intervalId) clearInterval(intervalId);
      audioCtx.close().catch(() => {});
    },
  };
}

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
  const ringtoneRef = useRef(null);

  // Play ringing sound on incoming call and stop when answered/rejected/ended
  useEffect(() => {
    if (callStatus === "incoming") {
      const ringtone = createRingtone();
      ringtone.start();
      ringtoneRef.current = ringtone;
    } else {
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
        ringtoneRef.current = null;
      }
    }

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
        ringtoneRef.current = null;
      }
    };
  }, [callStatus]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callStatus === "idle") return null;

  // Incoming Call Popup with Ringtone
  if (callStatus === "incoming") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
        <div className="bg-slate-900 border border-slate-700/60 rounded-3xl p-6 flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full mx-4 animate-bounce-short">
          <div className="relative">
            <img
              src={callerData?.callerAvatar || "/avatar.png"}
              alt="caller"
              className="w-24 h-24 rounded-full border-4 border-cyan-500 animate-pulse object-cover shadow-lg"
            />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
            </span>
          </div>

          <div className="text-center">
            <h3 className="font-semibold text-lg text-white">
              {callerData?.callerName || "Unknown User"}
            </h3>
            <p className="text-xs text-cyan-400 flex items-center justify-center gap-1.5 mt-1">
              <span className="animate-pulse">Incoming {callType} call...</span>
            </p>
          </div>

          <div className="flex gap-8 mt-4">
            <button
              onClick={rejectCall}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
              title="Decline"
            >
              <PhoneOff size={24} />
            </button>
            <button
              onClick={answerCall}
              className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center shadow-lg animate-pulse transition-all active:scale-95"
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
      {/* Remote Video / Audio View */}
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
            <div className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-500/40 flex items-center justify-center animate-pulse">
              <Phone size={40} className="text-cyan-400" />
            </div>
            <p className="text-lg font-medium text-slate-200">
              {callStatus === "calling" ? "Calling..." : "Audio Connected"}
            </p>
          </div>
        )}

        {/* Local Video Thumbnail */}
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

      {/* Floating Call Action Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/80 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-white/10">
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-all ${
            isAudioMuted ? "bg-red-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"
          }`}
          title={isAudioMuted ? "Unmute" : "Mute"}
        >
          {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {callType === "video" && (
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-all ${
              isVideoPaused ? "bg-red-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"
            }`}
            title={isVideoPaused ? "Turn Video On" : "Turn Video Off"}
          >
            {isVideoPaused ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
        )}

        <button
          onClick={endCall}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all active:scale-95"
          title="End Call"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}