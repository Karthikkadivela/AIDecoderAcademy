import { synthLine, mergeMp3, uploadAudio, type VoiceSpec } from "@/lib/classroomAudio";
import { HOST_VOICE, type PodcastPersona } from "@/lib/podcastPersonas";

export interface Turn { speaker: "host" | "guest"; text: string; }
export interface Segment { speaker: "host" | "guest"; text: string; audioUrl: string; }

const BATCH = 4;

function voiceFor(speaker: "host" | "guest", persona: PodcastPersona): VoiceSpec {
  return speaker === "host" ? HOST_VOICE : persona.voice;
}

/** Synthesize each turn, upload individually, return ordered segments.
 *  onProgress fires after each line finishes (for live loading progress). */
export async function synthesizeTurns(
  turns: Turn[],
  persona: PodcastPersona,
  userId: string,
  keyPrefix = "podcast",
  onProgress?: (done: number, total: number) => void,
): Promise<Segment[]> {
  const stamp = Date.now();
  const segments: Segment[] = new Array(turns.length);
  let done = 0;
  for (let i = 0; i < turns.length; i += BATCH) {
    const slice = turns.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (t, j) => {
        const idx = i + j;
        const buf = await synthLine(t.text, voiceFor(t.speaker, persona));
        const url = await uploadAudio(buf, `${keyPrefix}/${userId}/${stamp}/line-${idx}.mp3`);
        segments[idx] = { speaker: t.speaker, text: t.text, audioUrl: url };
        onProgress?.(++done, turns.length);
      }),
    );
  }
  return segments;
}

/** Full episode: per-line segments PLUS a merged track for save/download. */
export async function synthesizeEpisode(
  turns: Turn[],
  persona: PodcastPersona,
  userId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ segments: Segment[]; audioUrl: string }> {
  const segments = await synthesizeTurns(turns, persona, userId, "podcast", onProgress);
  const bufs = await Promise.all(
    segments.map(async (s) =>
      Buffer.from(await (await fetch(s.audioUrl)).arrayBuffer()),
    ),
  );
  // mergeMp3 is sync (Buffer[] → Buffer); uploadAudio takes Buffer.
  const merged = mergeMp3(bufs);
  const audioUrl = await uploadAudio(merged, `podcast/${userId}/${Date.now()}-full.mp3`);
  return { segments, audioUrl };
}
