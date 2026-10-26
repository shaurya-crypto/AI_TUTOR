"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ConnectionState, TranscriptItem, GeminiVoice } from "@/types/liveSession";
import { AudioPlayer } from "@/services/audioPlayer";
import { AudioStreamer } from "@/services/audioStreamer";
import { GeminiLiveClient, LiveAvatarConfig } from "@/services/geminiWebSocket";

export function useGeminiLive() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("IDLE");
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [teacherVolume, setTeacherVolume] = useState(0);
  const [userVolume, setUserVolume] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState<GeminiVoice>("Aoede");
  const [latestVideoFrame, setLatestVideoFrame] = useState<string | null>(null);
  const [videoMimeType, setVideoMimeType] = useState<string>("image/jpeg");

  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const geminiClientRef = useRef<GeminiLiveClient | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sharedAudioCtxRef = useRef<AudioContext | null>(null);
  const isMutedRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Volume visualizer loop for fluid UI animations
  const startVolumeLoop = useCallback(() => {
    const loop = () => {
      if (audioPlayerRef.current) {
        setTeacherVolume(audioPlayerRef.current.getVolumeLevel());
      }
      if (audioStreamerRef.current && !isMutedRef.current) {
        setUserVolume(audioStreamerRef.current.getMicVolume());
      } else {
        setUserVolume(0);
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
  }, []);

  const stopVolumeLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setTeacherVolume(0);
    setUserVolume(0);
  }, []);

  const addTranscript = useCallback((text: string, sender: "user" | "teacher") => {
    setTranscripts((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.sender === sender && Date.now() - last.timestamp < 3500) {
        return [
          ...prev.slice(0, -1),
          { ...last, text: `${last.text} ${text.trim()}` },
        ];
      }
      return [
        ...prev.slice(-8),
        { id: Math.random().toString(36).substring(7), sender, text: text.trim(), timestamp: Date.now() },
      ];
    });
  }, []);

  // Start Live Tutoring Session
  const startClass = useCallback(async (
    voiceOverride?: GeminiVoice,
    systemInstructionOverride?: string,
    kickoffPrompt?: string,
    onChalkboardToolCall?: (action: string, content: any, color?: string) => void,
    onVisualAction?: (action: string, params: Record<string, any>) => void,
    avatarConfig?: LiveAvatarConfig,
    onAudioOutputChunk?: (pcm16: Int16Array, sampleRate: number) => void,
    onSpeechInterrupted?: () => void
  ) => {
    setErrorMessage(null);
    setConnectionState("CONNECTING");

    try {
      // 1. Fetch live session config from backend
      const res = await fetch("/api/session");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to initialize live session configuration");
      }
      const config = await res.json();

      // 2. Initialize AudioPlayer with Web Audio API
      const player = new AudioPlayer((isPlaying) => {
        setConnectionState((prev) => {
          if (prev === "DISCONNECTED" || prev === "ERROR" || prev === "IDLE") return prev;
          if (isPlaying) {
            audioStreamerRef.current?.setTeacherSpeaking(true);
            return "TEACHER_SPEAKING";
          } else {
            audioStreamerRef.current?.setTeacherSpeaking(false);
            return isMutedRef.current ? "MUTED" : "LISTENING";
          }
        });
      });

      const audioCtx = await player.init(undefined, 24000);
      audioPlayerRef.current = player;
      sharedAudioCtxRef.current = audioCtx;

      // 3. Initialize AudioStreamer using the SAME AudioContext for hardware echo cancellation
      const streamer = new AudioStreamer(
        (base64Chunk) => {
          if (geminiClientRef.current) {
            geminiClientRef.current.sendAudioChunk(base64Chunk);
          }
        },
        () => {
          console.log("[useGeminiLive] Client barge-in detected: stopping teacher playback immediately");
          if (audioPlayerRef.current) {
            audioPlayerRef.current.stopAndClear();
          }
          onSpeechInterrupted?.();
          setConnectionState((prev) => (prev !== "MUTED" ? "LISTENING" : "MUTED"));
        },
        () => {
          console.log("[useGeminiLive] Student started speaking");
          // Non-destructive: do not stop teacher audio on general speech start. Deliberate barge-in is handled above.
          setConnectionState((prev) => (prev !== "MUTED" ? "LISTENING" : "MUTED"));
        },
        () => {
          console.log("[useGeminiLive] Student finished speaking: dispatching audioStreamEnd");
          if (geminiClientRef.current) {
            geminiClientRef.current.sendAudioStreamEnd();
          }
        }
      );
      await streamer.start(audioCtx);
      audioStreamerRef.current = streamer;

      const activeVoice = voiceOverride || selectedVoice || "Aoede";
      if (voiceOverride && voiceOverride !== selectedVoice) {
        setSelectedVoice(voiceOverride);
      }
      console.log("[useGeminiLive] Starting session with active voice:", activeVoice);

      const client = new GeminiLiveClient(
        config.token || config.apiKey,
        {
          onSetupComplete: () => {
            setConnectionState("CONNECTED");
            // Kick off spoken turn immediately so teacher starts teaching Concept 1
            if (kickoffPrompt) {
              client.sendKickoff(kickoffPrompt);
            }
            setTimeout(() => {
              setConnectionState((current) => (current === "CONNECTED" ? "LISTENING" : current));
            }, 400);
          },
          onAudioData: (pcm16, sampleRate) => {
            if (audioPlayerRef.current) {
              audioPlayerRef.current.playChunk(pcm16, sampleRate);
            }
            onAudioOutputChunk?.(pcm16, sampleRate);
          },
          onVideoData: (data, mimeType) => {
            setLatestVideoFrame(data);
            if (mimeType) {
              setVideoMimeType(mimeType);
            }
          },
          onUserSpeechStart: () => {
            console.log("[useGeminiLive] onUserSpeechStart: Server detected human voice activity, cutting off teacher playback");
            if (audioPlayerRef.current) {
              audioPlayerRef.current.stopAndClear();
            }
            onSpeechInterrupted?.();
            audioStreamerRef.current?.setTeacherSpeaking(false);
            setConnectionState((prev) => (prev !== "MUTED" ? "LISTENING" : "MUTED"));
          },
          onInterrupted: () => {
            console.log("[useGeminiLive] onInterrupted: Server confirmed barge-in");
            if (audioPlayerRef.current) {
              audioPlayerRef.current.stopAndClear();
            }
            onSpeechInterrupted?.();
            audioStreamerRef.current?.setTeacherSpeaking(false);
            setConnectionState((prev) => (prev !== "MUTED" ? "LISTENING" : "MUTED"));
          },
          onTurnComplete: () => {
            console.log("[useGeminiLive] onTurnComplete: Model finished generation");
            if (audioPlayerRef.current) {
              audioPlayerRef.current.onTurnComplete();
            }
          },
          onTranscript: (text, sender) => {
            addTranscript(text, sender);
          },
          onChalkboardToolCall: (action, content, color) => {
            onChalkboardToolCall?.(action, content, color);
          },
          onVisualAction: (action, params) => {
            onVisualAction?.(action, params);
          },
          onError: (err) => {
            console.error("[useGeminiLive] Connection error:", err);
            setErrorMessage("Connection to Gemini Live was interrupted. Please check your network and try again.");
            setConnectionState("ERROR");
            endCall();
          },
          onClose: (event) => {
            console.log("[useGeminiLive] onClose callback triggered, event:", event);
            setConnectionState((prev) => (prev === "ERROR" ? "ERROR" : "DISCONNECTED"));
            endCall();
          },
        },
        {
          model: config.model,
          voiceName: activeVoice,
          systemInstruction: systemInstructionOverride,
          enableFunctionCalling: true,
          avatarConfig,
        }
      );

      geminiClientRef.current = client;
      client.connect(kickoffPrompt);

      // 5. Start Volume Visualizer loop
      startVolumeLoop();
    } catch (err: unknown) {
      const error = err as Error;
      console.error("[useGeminiLive] Start error:", error);
      setErrorMessage(error.message || "Failed to start live class.");
      setConnectionState("ERROR");
      endCall();
    }
  }, [addTranscript, selectedVoice, startVolumeLoop]);

  const toggleMute = useCallback(() => {
    if (!audioStreamerRef.current) return;
    const nextMuted = !isMuted;
    audioStreamerRef.current.setMuted(nextMuted);
    setIsMuted(nextMuted);
    
    if (nextMuted && geminiClientRef.current) {
        geminiClientRef.current.sendAudioStreamEnd();
        geminiClientRef.current.sendTurnComplete();
    }

    setConnectionState((prev) => {
      if (prev === "TEACHER_SPEAKING") return prev;
      return nextMuted ? "MUTED" : "LISTENING";
    });
  }, [isMuted]);

  // End Live Call
  const endCall = useCallback(() => {
    stopVolumeLoop();

    if (audioStreamerRef.current) {
      audioStreamerRef.current.stop();
      audioStreamerRef.current = null;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.stopAndClear();
      audioPlayerRef.current.close().catch(() => {});
      audioPlayerRef.current = null;
    }

    if (sharedAudioCtxRef.current && sharedAudioCtxRef.current.state !== "closed") {
      try {
        sharedAudioCtxRef.current.close().catch(() => {});
      } catch {
        // Ignore close error
      }
      sharedAudioCtxRef.current = null;
    }

    if (geminiClientRef.current) {
      geminiClientRef.current.disconnect();
      geminiClientRef.current = null;
    }

    setLatestVideoFrame(null);
    setIsMuted(false);
    setConnectionState((prev) => (prev === "ERROR" ? "ERROR" : "DISCONNECTED"));
  }, [stopVolumeLoop]);

  // Reset to Idle
  const resetToIdle = useCallback(() => {
    endCall();
    setErrorMessage(null);
    setConnectionState("IDLE");
    setTranscripts([]);
    setLatestVideoFrame(null);
  }, [endCall]);

  const setTeacherAudioMuted = useCallback((muted: boolean) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.setOutputMuted(muted);
    }
  }, []);

  const sendBoardContext = useCallback((summary: string) => {
    if (geminiClientRef.current) {
      geminiClientRef.current.sendBoardContext(summary);
    }
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    if (geminiClientRef.current && text?.trim()) {
      geminiClientRef.current.sendTextMessage(text.trim());
      addTranscript(text.trim(), "user");
    }
  }, [addTranscript]);

  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    connectionState,
    isMuted,
    errorMessage,
    transcripts,
    teacherVolume,
    userVolume,
    selectedVoice,
    setSelectedVoice,
    latestVideoFrame,
    videoMimeType,
    startClass,
    toggleMute,
    setTeacherAudioMuted,
    endCall,
    resetToIdle,
    sendBoardContext,
    sendTextMessage,
  };
}
