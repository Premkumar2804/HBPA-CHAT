import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import Login from "./Login";
import "./Chat.css";

const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:5000", {
  transports: ["websocket"],
  withCredentials: true,
});

function Chat() {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('chat-username') || "");
  const [userAvatar, setUserAvatar] = useState(localStorage.getItem('chat-avatar') || null);
  const [theme, setTheme] = useState(localStorage.getItem('chat-theme') || 'dark');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const avatarInputRef = useRef(null);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('chat-theme', theme);
  }, [theme]);

  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to server");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Disconnected from server");
    });

    socket.on("message", (data) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { ...data, type: "system", id: Date.now() + Math.random() },
      ]);
    });

    socket.on("receiveMessage", (data) => {
      setMessages((prevMessages) => {
        // Handle optimistic update: if we already have this message (by temporary ID),
        // or if it matches the content/user/timestamp of a recently sent message, 
        // we replace the optimistic one with the server-confirmed one.
        const existingIndex = prevMessages.findIndex(m => m.id === data.id || m.tempId === data.tempId);
        if (existingIndex !== -1) {
          const newMessages = [...prevMessages];
          newMessages[existingIndex] = data;
          return newMessages;
        }
        return [...prevMessages, data];
      });

      if (data.user !== currentUser && document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(`New message from ${data.user}`, {
            body: data.type === 'text' ? data.text : `Sent a ${data.type}`,
            icon: '/favicon.ico'
          });
        } catch (err) {
          console.error("Notification creation failed:", err);
        }
      }
    });

    socket.on("messageStatusUpdate", (data) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === data.id ? { ...msg, status: data.status } : msg
        )
      );
    });

    socket.on("userTyping", (data) => {
      setTypingUser(data.user);
      setTimeout(() => setTypingUser(""), 2000);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("message");
      socket.off("receiveMessage");
      socket.off("messageStatusUpdate");
      socket.off("userTyping");
    };
  }, [currentUser]);

  const handleLogin = (name) => {
    setCurrentUser(name);
    localStorage.setItem('chat-username', name);
  };

  const sendMessage = (messageData) => {
    const { text, type, voice, image, avatar } = messageData;

    if (text?.trim() || type === 'voice' || type === 'image') {
      const tempId = Date.now() + Math.random();
      const optimisticMessage = {
        id: tempId, // Temporary ID
        tempId: tempId,
        text,
        user: currentUser,
        type: type || 'text',
        voice: voice || null,
        image: image || null,
        avatar: avatar || userAvatar || null,
        status: 'sending',
        timestamp: new Date().toISOString()
      };

      // Optimistic Update: Add to UI immediately
      setMessages(prev => [...prev, optimisticMessage]);

      socket.emit("sendMessage", {
        ...optimisticMessage,
        id: undefined, // Let server assign real ID
      });
    }
  };

  const handleTyping = () => {
    if (currentUser) {
      socket.emit("typing", { user: currentUser });
    }
  };

  const markAsSeen = (messageId) => {
    socket.emit("markAsSeen", messageId);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };


  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        setUserAvatar(base64);
        localStorage.setItem('chat-avatar', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('chat-username');
    localStorage.removeItem('chat-avatar');
    setCurrentUser("");
    setUserAvatar(null);
  };

  const requestNotifications = () => {
    if (typeof Notification === 'undefined') {
      showToast("Notifications are not supported on this browser.");
      return;
    }

    Notification.requestPermission().then(permission => {
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        showToast("Notifications enabled!");
      }
    }).catch(err => {
      console.error("Notification permission request failed:", err);
      showToast("Could not enable notifications.");
    });
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="chat-container">
      {toast && (
        <div className="toast-container">
          <div className="toast">
            <span>{toast}</span>
          </div>
        </div>
      )}
      <div className="chat-header">
        <div className="header-left">
          <div className="header-avatar" onClick={() => avatarInputRef.current.click()}>
            {userAvatar ? <img src={userAvatar} alt="Avatar" /> : (currentUser || 'G').charAt(0).toUpperCase()}
          </div>
          <input
            type="file"
            ref={avatarInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <div className="header-info">
            <h1>HBPA Chat</h1>
            <div className={`header-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-icon">🌐</span>
              <span className="status-text">{isConnected ? "Connected" : "Disconnected"}</span>
            </div>
          </div>
        </div>

        <div className="header-right">
          <button className="header-btn" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
              </svg>
            )}
          </button>
          <button className="header-btn" onClick={requestNotifications} title="Notifications">
            <svg viewBox="0 0 24 24" width="20" height="20" fill={notificationsEnabled ? '#25d366' : 'currentColor'}>
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
          </button>
          <button className="header-btn" onClick={handleLogout} title="Logout">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
          </button>
        </div>
      </div>

      <MessageList
        messages={messages}
        currentUser={currentUser}
        onMarkAsSeen={markAsSeen}
      />

      {typingUser && typingUser !== currentUser && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>{typingUser} is typing...</span>
        </div>
      )}

      <ChatInput
        onSendMessage={sendMessage}
        onTyping={handleTyping}
        currentUser={currentUser}
        userAvatar={userAvatar}
      />
    </div>
  );
}

export default Chat;
