export type OutputType     = "text" | "json" | "image" | "audio" | "slides" | "video";
export type PlaygroundMode = "story" | "code" | "art" | "quiz" | "free";
export type AgeGroup       = "5-7" | "8-10" | "11-13" | "14+";
export type CreationType   = "story" | "code" | "art" | "quiz" | "chat" | "mixed";

export interface Profile {
  id:                string;
  clerk_user_id:     string;
  display_name:      string;
  avatar_emoji:      string;
  age_group:         AgeGroup;
  interests:         string[];
  xp:                number;
  level:             number;
  active_arena:      number;
  streak_days:       number;
  last_active_date?: string;
  badges:            { id: string; earned_at: string }[];
  created_at:        string;
  updated_at:        string;
}

export interface Creation {
  id:           string;
  profile_id:   string;
  title:        string;
  type:         CreationType;
  output_type:  OutputType;
  content:      string;
  file_url?:    string;
  tags:         string[];
  is_favourite: boolean;
  project_id?:  string;
  session_id?:  string;
  prompt_used?: string;
  created_at:   string;
  updated_at:   string;
}

export interface Session {
  id:            string;
  profile_id:    string;
  mode:          PlaygroundMode;
  title?:        string;
  message_count: number;
  started_at:    string;
  ended_at?:     string;
}

export interface Project {
  id:              string;
  profile_id:      string;
  name:            string;
  creation_count?: number;
  created_at:      string;
}

export interface ChatRequest {
  message:      string;
  sessionId:    string;
  mode:         PlaygroundMode;
  outputType?:  OutputType;
  profile:      Pick<Profile, "display_name" | "age_group" | "interests">;
  history:      Array<{ role: "user" | "assistant"; content: string }>;
  attachments?: Array<{ data: string; mimeType: string; name: string }>;
}