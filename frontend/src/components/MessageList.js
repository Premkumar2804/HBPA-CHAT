//  Message List Component
import React, { useEffect, useRef, useState } from "react";
import "./MessageList.css";

const VoicePlayer = ({ src }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (audioRef.current.paused) {
      audioRef.current.play().catch(err => {
        console.error("Audio play failed:", err);
        alert("Playback failed. Please check your volume/mute settings.");
      });
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      const currentProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(currentProgress);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = pos * audioRef.current.duration;
    }
  };

  return (
    <div className="voice-player">
      <button className="play-btn" onClick={togglePlay}>
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="progress-container" onClick={handleSeek}>
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      </div>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
        preload="metadata"
        playsInline
      />
    </div>
  );
};

function MessageList({ messages, currentUser, onMarkAsSeen }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Logic to mark received messages as seen
    const markUnseenAsSeen = () => {
      messages.forEach((msg) => {
        if (msg.user !== currentUser && msg.status !== 'seen' && msg.id) {
          onMarkAsSeen(msg.id);
        }
      });
    };

    if (document.hasFocus()) {
      markUnseenAsSeen();
    }

    window.addEventListener('focus', markUnseenAsSeen);
    return () => window.removeEventListener('focus', markUnseenAsSeen);
  }, [messages, currentUser, onMarkAsSeen]);

  return (
    <div className="messages-container">
      {messages.length === 0 ? (
        <div className="no-messages">
          <div className="no-messages-icon">💬</div>
          <h3>No messages yet</h3>
          <p>Start the conversation! 👋</p>
        </div>
      ) : (
        messages.map((msg, index) => {
          const isSentByMe = msg.type !== "system" && msg.user === currentUser;

          return (
            <div
              key={msg.id || index}
              className={`message-wrapper ${isSentByMe ? "sent-wrapper" : "received-wrapper"} ${msg.type === "system" ? "system-wrapper" : ""}`}
            >
              {msg.type !== "system" && !isSentByMe && (
                <div className="message-avatar">
                  {msg.avatar ? (
                    <img src={msg.avatar} alt={msg.user} />
                  ) : (
                    (msg.user || "U").charAt(0).toUpperCase()
                  )}
                </div>
              )}

              <div
                className={`message ${msg.type === "system"
                  ? "system"
                  : isSentByMe
                    ? "sent"
                    : "received"
                  }`}
              >
                {msg.type === "system" ? (
                  <div className="message-text">{msg.text}</div>
                ) : (
                  <>
                    {!isSentByMe && <div className="message-user">{msg.user}</div>}

                    {msg.type === 'image' && (
                      <img
                        src={msg.image}
                        className="message-image"
                        alt="Shared"
                        onClick={() => window.open(msg.image, '_blank')}
                      />
                    )}

                    {msg.type === 'voice' && (
                      <VoicePlayer src={msg.voice} />
                    )}

                    {msg.type !== 'voice' && msg.type !== 'image' && (
                      <div className="message-text">{msg.text}</div>
                    )}

                    <div className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {isSentByMe && (
                        <div className={`status-tick ${msg.status === 'seen' ? 'seen' : ''}`}>
                          <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1.172-6.502l6.128-6.128-1.414-1.414-4.714 4.714-2.122-2.122-1.414 1.414 3.536 3.536z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;