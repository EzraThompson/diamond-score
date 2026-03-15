import fs from 'fs';
import path from 'path';

export interface FeedbackEntry {
  id: number;
  message: string;
  page: string | null;
  gameId: string | null;
  resolved: boolean;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'feedback.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAll(): FeedbackEntry[] {
  ensureDir();
  if (!fs.existsSync(FILE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeAll(entries: FeedbackEntry[]) {
  ensureDir();
  fs.writeFileSync(FILE_PATH, JSON.stringify(entries, null, 2));
}

export function createFeedback(message: string, page?: string | null, gameId?: string | null): FeedbackEntry {
  const entries = readAll();
  const maxId = entries.reduce((max, e) => Math.max(max, e.id), 0);
  const entry: FeedbackEntry = {
    id: maxId + 1,
    message,
    page: page ?? null,
    gameId: gameId ?? null,
    resolved: false,
    createdAt: new Date().toISOString(),
  };
  entries.push(entry);
  writeAll(entries);
  return entry;
}

export function listFeedback(filter?: { resolved?: boolean }): FeedbackEntry[] {
  let entries = readAll();
  if (filter?.resolved !== undefined) {
    entries = entries.filter((e) => e.resolved === filter.resolved);
  }
  return entries.sort((a, b) => b.id - a.id).slice(0, 100);
}

export function updateFeedback(id: number, data: { resolved?: boolean }): FeedbackEntry | null {
  const entries = readAll();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;
  if (data.resolved !== undefined) entry.resolved = data.resolved;
  writeAll(entries);
  return entry;
}

export function deleteFeedback(id: number): boolean {
  const entries = readAll();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  entries.splice(idx, 1);
  writeAll(entries);
  return true;
}
