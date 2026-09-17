import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RepoConfig } from "@/lib/github";

type Props = {
  initial: Omit<RepoConfig, "token">;
  busy: boolean;
  onConnect: (cfg: RepoConfig) => void;
};

export function ConnectCard({ initial, busy, onConnect }: Props) {
  const [owner, setOwner] = useState(initial.owner);
  const [repo, setRepo] = useState(initial.repo);
  const [branch, setBranch] = useState(initial.branch);
  const [token, setToken] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="panel w-full max-w-lg p-10">
        <p className="label-eyebrow">Redaktionssystem</p>
        <h1 className="mt-2 text-4xl">pps-json</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Verbinde dich mit dem Inhalts-Repository. Der Token bleibt ausschließlich in diesem
          Browser-Tab und wird nirgendwo gespeichert.
        </p>

        <form
          className="mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onConnect({ owner: owner.trim(), repo: repo.trim(), branch: branch.trim(), token: token.trim() });
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Input id="owner" value={owner} onChange={(e) => setOwner(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repo">Repository</Label>
              <Input id="repo" value={repo} onChange={(e) => setRepo(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="token">GitHub Personal Access Token</Label>
            <Input
              id="token"
              type="password"
              autoComplete="off"
              placeholder="ghp_… oder github_pat_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Benötigt Lese- und Schreibrechte auf den Repository-Inhalt.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Verbinde…" : "Verbinden & Repo scannen"}
          </Button>
        </form>
      </div>
    </div>
  );
}
