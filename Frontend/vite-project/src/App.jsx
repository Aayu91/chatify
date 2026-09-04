import React, { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router";
import ChatPage from "./pages/ChatPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import { useAuthStore } from "./store/useAuthStore.js";
import PageLoader from "./components/PageLoader.jsx";
import { Toaster } from "react-hot-toast";
import CallModal from "./components/CallModal.jsx";
import { useCallStore } from "./store/useCallStore.js";

function App() {
  const { checkAuth, isCheckingAuth, authUser, socket } = useAuthStore();
  const { initCallListeners } = useCallStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Initialize WebRTC calling listeners whenever the socket connects
  useEffect(() => {
    if (socket) {
      initCallListeners();
    }
  }, [socket, initCallListeners]);

  useEffect(() => {
  if (socket) {
    initCallListeners();

    // Listen for live incoming friend requests
    socket.on("friend:new-request", ({ from }) => {
      // Play existing notification sound
      const sound = new Audio("/sounds/notification.mp3");
      sound.play().catch(() => {});
      
      // Show notification toast
      toast.success(`${from.fullName} sent you a friend request!`, {
        icon: "👋",
      });

      // Refresh auth user data so badge and list update immediately
      checkAuth();
    });

    return () => {
      socket.off("friend:new-request");
    };
  }
}, [socket, initCallListeners, checkAuth]);

  if (isCheckingAuth) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-slate-900 relative flex items-center justify-center p-4 overflow-hidden">
      {/* DECORATORS - GRID BG & GLOW SHAPES */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
      <div className="absolute top-0 -left-4 size-96 bg-pink-500 opacity-20 blur-[100px]" />
      <div className="absolute bottom-0 -right-4 size-96 bg-cyan-500 opacity-20 blur-[100px]" />

      <Routes>
        <Route path="/" element={authUser ? <ChatPage /> : <Navigate to={"/login"} />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to={"/"} />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to={"/"} />} />
      </Routes>

      {/* Global Call Overlay/Modal */}
      <CallModal />

      <Toaster />
    </div>
  );
}

export default App;