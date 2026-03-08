//  Chat Input Component
import React, { useState, useRef, useEffect } from "react";
import "./ChatInput.css";

function ChatInput({ onSendMessage, onTyping, currentUser, userAvatar }) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState("0:00");
  const [showSend, setShowSend] = useState(false);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    setShowSend(message.trim().length > 0);
  }, [message]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage({ text: message, type: 'text' });
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const lastTypingTimeRef = useRef(0);

  const handleMessageChange = (e) => {
    setMessage(e.target.value);

    // Throttle typing events (max once every 2 seconds)
    const now = Date.now();
    if (now - lastTypingTimeRef.current > 2000) {
      onTyping();
      lastTypingTimeRef.current = now;
    }
  };

  const compressImage = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1000;

        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }

      compressImage(file, (base64Image) => {
        onSendMessage({
          text: 'Shared a photo',
          image: base64Image,
          type: 'image'
        });
      });
      e.target.value = '';
    }
  };

  const startRecording = async () => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      alert("Microphone requires a secure connection (HTTPS).");
      return;
    }

    const getSupportedMimeType = () => {
      const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/aac',
        'audio/wav'
      ];
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      }
      return '';
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();

      mediaRecorderRef.current = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const actualMimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result;
          onSendMessage({
            text: 'Voice message',
            voice: base64Audio,
            type: 'voice'
          });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      clearInterval(timerIntervalRef.current);
      setIsRecording(false);
      setRecordingTime("0:00");
    }
  };

  const updateTimer = () => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    setRecordingTime(`${mins}:${secs.toString().padStart(2, '0')}`);
  };

  return (
    <div className="chat-input-container">
      <div className="input-wrapper">
        <button
          className="attach-button"
          onClick={() => fileInputRef.current.click()}
          title="Attach Photo"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5V5c0-2.48-2.02-4.5-4.5-4.5S8 2.52 8 5v12.5c0 3.59 2.91 6.5 6.5 6.5s6.5-2.91 6.5-6.5V6h-1.5z" />
          </svg>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />

        {isRecording ? (
          <div className="recording-ui">
            <div className="recording-dot"></div>
            <span className="recording-timer">{recordingTime}</span>
          </div>
        ) : (
          <input
            type="text"
            className="message-input"
            placeholder="Type a message..."
            value={message}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
          />
        )}
      </div>

      {showSend ? (
        <button
          className="send-button"
          onClick={handleSend}
          disabled={!message.trim()}
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z" />
          </svg>
        </button>
      ) : (
        <button
          className={`mic-button ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? "Stop Recording" : "Record Voice"}
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path fill="currentColor" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ChatInput;