import { useEffect, useRef, useState, useCallback } from "react";
import { Room, createLocalAudioTrack, RoomEvent } from "livekit-client";
import "./App.css";

function useLiveKit() {
  const [status, setStatus] = useState("Ready to Connect");
  const [room, setRoom] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const audioRef = useRef(null);

  const addTranscript = useCallback((sender, text) => {
    setTranscript(prev => [...prev, { sender, text, timestamp: Date.now() }]);
  }, []);

  const cleanupRoom = useCallback(() => {
    setRoom(prevRoom => {
      if (prevRoom) prevRoom.disconnect();
      return null;
    });
    document.body.classList.remove("agent-speaking");
    setStatus("Disconnected");
  }, []);

  const connect = useCallback(async () => {
    if (status.includes("Connecting") || status === "Connected") return;

    setStatus("Connecting...");
    let livekitRoom = new Room();

    try {
      const response = await fetch("http://localhost:8000/token");
      const data = await response.json();
      const token = data.token;

      await livekitRoom.connect(process.env.REACT_APP_LIVEKIT_URL, token, {
        autoSubscribe: true,
      });

      // Attach remote audio tracks
      livekitRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === "audio" && participant.identity !== livekitRoom.localParticipant.identity) {
          track.attach(audioRef.current);
          // Force play after attaching track
          audioRef.current.play().catch(() => {
            console.warn("Audio playback blocked, will resume on user gesture.");
          });
        }
      });

      // Active speakers handling
      livekitRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const isAgentSpeaking = speakers.some(p => p.identity !== livekitRoom.localParticipant.identity && p.isSpeaking);
        document.body.classList.toggle("agent-speaking", isAgentSpeaking);
      });

      // Data channel messages (transcripts)
      livekitRoom.on(RoomEvent.DataReceived, (payload, participant) => {
        const data = new TextDecoder().decode(payload);
        try {
          const message = JSON.parse(data);
          if (message.text) {
            const sender = participant.identity === livekitRoom.localParticipant.identity ? "user" : "agent";
            addTranscript(sender, message.text);
          }
        } catch (e) {
          console.error("Failed to parse data message:", e);
        }
      });

      // Request mic on user gesture
      try {
        const micTrack = await createLocalAudioTrack();
        await livekitRoom.localParticipant.publishTrack(micTrack, { name: 'mic' });
      } catch (err) {
        console.error("Mic access failed:", err);
        addTranscript("system", `Mic access failed: ${err.message}`);
      }

      setRoom(livekitRoom);
      setStatus("Connected");
      addTranscript("system", "Connected to AI Agent. Speak now!");

      // Force audio playback after user gesture
      if (audioRef.current) {
        audioRef.current.play().catch(() => {
          console.warn("Audio playback blocked, waiting for user gesture.");
        });
      }

    } catch (error) {
      console.error("LiveKit connection failed:", error);
      setStatus(`Failed: ${error.message}`);
      addTranscript("system", `Connection failed: ${error.message}`);
      livekitRoom.disconnect();
    }
  }, [addTranscript, status]);

  useEffect(() => {
    return () => {
      document.body.classList.remove("agent-speaking");
    };
  }, []);

  return { audioRef, status, transcript, connect, room, cleanupRoom };
}

export default function VoiceChat() {
  const { audioRef, status, transcript, connect, room, cleanupRoom } = useLiveKit();
  const transcriptRef = useRef(null);

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript]);

  const isConnected = status === "Connected";
  const isConnecting = status.includes("Connecting");

  let buttonText = "Start Voice Chat";
  let buttonDisabled = false;

  if (isConnecting) {
    buttonText = "Connecting...";
    buttonDisabled = true;
  } else if (isConnected) {
    buttonText = "End Voice Chat";
  } else if (status.includes("Failed")) {
    buttonText = "Retry Connection";
  }

  return (
    <div className="voice-chat-container">
      <div className="header">
        <h2>🎤 AI Voice Assistant</h2>
        <div className={`status ${status.toLowerCase().replace(/[^a-z]/g, '')}`}>{status}</div>
      </div>

      <div className="transcript-log" ref={transcriptRef}>
        {transcript.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            <span className="sender">{msg.sender === "agent" ? "AI:" : msg.sender === "user" ? "You:" : ""}</span>
            <span className="text">{msg.text}</span>
          </div>
        ))}
      </div>

      <div className="controls">
        <button className={isConnected ? "disconnect-button" : "connect-button"} onClick={isConnected ? cleanupRoom : connect} disabled={buttonDisabled}>
          {buttonText}
        </button>

        <div className="mic-indicator">
          <span className="icon">🎙️</span>
          <p>Agent Status: {document.body.classList.contains("agent-speaking") ? "Speaking..." : "Listening..."}</p>
        </div>
      </div>

      <audio ref={audioRef} autoPlay />
    </div>
  );
}
