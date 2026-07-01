import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { toast } from "sonner";
import { LegalLinks } from "@/components/LegalLinks";

export function SettingsPanel() {
  const { categories, setCategories, eventTypes, setEventTypes } = useApp();
  const [newCat, setNewCat] = useState("");
  const [newType, setNewType] = useState("");

  const addCategory = () => {
    const label = newCat.trim();
    if (!label) return;
    const id = `c-${Date.now()}`;
    setCategories((prev) => [...prev, { id, label }]);
    setNewCat("");
    toast.success("カテゴリーを追加しました");
  };

  const removeCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCategory = (id: string, label: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));
  };

  const addType = () => {
    const v = newType.trim();
    if (!v) return;
    setEventTypes((prev) => [...prev, v]);
    setNewType("");
    toast.success("イベント種別を追加しました");
  };

  const removeType = (v: string) => setEventTypes((prev) => prev.filter((t) => t !== v));

  return (
    <div className="space-y-5">
      <section
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-sm font-semibold">送信先カテゴリーの編集</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          チームに合わせて自由に追加・編集・削除できます。
        </p>
        <ul className="mt-3 space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <Input
                value={c.label}
                onChange={(e) => updateCategory(c.id, e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => removeCategory(c.id)} aria-label="削除">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <Input
            value={newCat}
            placeholder="新しいカテゴリー名"
            onChange={(e) => setNewCat(e.target.value)}
          />
          <Button onClick={addCategory} size="sm">
            <Plus className="h-3.5 w-3.5" />追加
          </Button>
        </div>
      </section>

      <section
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-sm font-semibold">イベント種別の編集</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {eventTypes.map((t) => (
            <li
              key={t}
              className="flex items-center gap-1 rounded-full border border-border bg-secondary/40 py-1 pl-3 pr-1 text-xs font-medium"
            >
              <span>{t}</span>
              <button
                onClick={() => removeType(t)}
                className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                aria-label={`${t} を削除`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <Input
            value={newType}
            placeholder="新しいイベント種別"
            onChange={(e) => setNewType(e.target.value)}
          />
          <Button onClick={addType} size="sm">
            <Plus className="h-3.5 w-3.5" />追加
          </Button>
        </div>
      </section>

      <LegalLinks className="pt-2" />
    </div>
  );
}
