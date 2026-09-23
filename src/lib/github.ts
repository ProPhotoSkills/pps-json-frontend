/**
 * Minimaler GitHub-REST-Client, der direkt im Browser läuft.
 * Der Token kommt zur Laufzeit aus dem UI und wird nur lokal gehalten.
 */

export type RepoConfig = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
};

export type TreeEntry = {
  path: string;
  type: "blob" | "tree";
  sha: string;
};

const API = "https://api.github.com";

export class GitHubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "GitHubError";
  }
}

async function request<T>(cfg: RepoConfig, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      // Öffentliche Repos funktionieren auch ohne Token (nur Lesen).
      ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}),
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try {
      detail = (JSON.parse(body).message as string) ?? body;
    } catch {
      /* Text belassen */
    }
    if (res.status === 401) throw new GitHubError(401, "Token ungültig oder abgelaufen.");
    if (res.status === 404)
      throw new GitHubError(404, `Nicht gefunden: ${path}. Owner, Repo oder Branch prüfen.`);
    if (res.status === 409)
      throw new GitHubError(409, "Konflikt: Die Datei wurde zwischenzeitlich geändert.");
    if (res.status === 403 && /rate limit/i.test(detail))
      throw new GitHubError(403, "GitHub-Rate-Limit erreicht. Bitte kurz warten.");
    throw new GitHubError(res.status, detail || res.statusText);
  }

  return (await res.json()) as T;
}

export async function verifyToken(cfg: RepoConfig) {
  return request<{ login: string }>(cfg, "/user");
}

export async function fetchTree(cfg: RepoConfig): Promise<TreeEntry[]> {
  // Immer frisch laden – kein Browser-/CDN-Cache.
  const data = await request<{ tree: TreeEntry[]; truncated: boolean }>(
    cfg,
    `/repos/${cfg.owner}/${cfg.repo}/git/trees/${encodeURIComponent(cfg.branch)}?recursive=1&ts=${Date.now()}`,
    { cache: "no-store" },
  );
  return data.tree ?? [];
}

export type FileContent = { text: string; sha: string };

export async function fetchFile(cfg: RepoConfig, path: string): Promise<FileContent> {
  const data = await request<{ content: string; encoding: string; sha: string }>(
    cfg,
    `/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(cfg.branch)}`,
  );
  const binary = atob(data.content.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return { text: new TextDecoder().decode(bytes), sha: data.sha };
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/** Aktuellen sha holen (falls vorhanden) und Datei als neuen Commit schreiben. */
export async function commitFile(
  cfg: RepoConfig,
  path: string,
  content: string,
  message: string,
): Promise<{ commitSha: string }> {
  let sha: string | undefined;
  try {
    sha = (await fetchFile(cfg, path)).sha;
  } catch (err) {
    if (!(err instanceof GitHubError && err.status === 404)) throw err;
  }

  const data = await request<{ commit: { sha: string } }>(
    cfg,
    `/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(path)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: toBase64(content),
        branch: cfg.branch,
        ...(sha ? { sha } : {}),
      }),
    },
  );
  return { commitSha: data.commit.sha };
}
