export type ConnectionState =
  | "IDLE"
  | "CONNECTING"
  | "CONNECTED"
  | "LISTENING"
  | "TEACHER_SPEAKING"
  | "MUTED"
  | "RECONNECTING"
  | "ERROR"
  | "DISCONNECTED";

export type GeminiVoice = "Leda" | "Puck" | "Aoede" | "Charon" | "Fenrir" | "Kore";

export interface TranscriptItem {
  id: string;
  sender: "user" | "teacher";
  text: string;
  timestamp: number;
}

export interface SessionConfig {
  model: string;
  voiceName?: GeminiVoice;
  systemInstruction?: string;
}

export interface GeminiLiveError {
  message: string;
  code?: string;
  details?: unknown;
}
