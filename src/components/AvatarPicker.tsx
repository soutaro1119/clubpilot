import { useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
import type { Profile } from "@/lib/app-store";
import { toast } from "sonner";

// Resize to ~256px square and return dataURL (keeps localStorage small)
async function fileToCompressedDataUrl(file: File, max = 256): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = max; canvas.height = max;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, max, max);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function AvatarPicker({
  profile,
  size = 72,
  onChange,
}: {
  profile?: Pick<Profile, "name" | "avatarUrl"> | null;
  size?: number;
  onChange: (dataUrl: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const libRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const handle = async (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("画像ファイルを選んでください");
    try {
      const url = await fileToCompressedDataUrl(f);
      onChange(url);
      toast.success("アイコンを更新しました");
      setOpen(false);
    } catch {
      toast.error("画像の読み込みに失敗しました");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-border transition hover:ring-primary"
        style={{ width: size, height: size }}
        aria-label="アイコンを変更"
      >
        <Avatar profile={profile} size={size} />
        <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow">
          <Camera className="h-3.5 w-3.5" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">アイコン写真</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Button className="w-full justify-start" variant="outline" onClick={() => libRef.current?.click()}>
              <ImagePlus className="h-4 w-4" />写真ライブラリから選ぶ
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => camRef.current?.click()}>
              <Camera className="h-4 w-4" />その場で撮影する
            </Button>
            {profile?.avatarUrl && (
              <Button
                className="w-full justify-start text-rose-400"
                variant="ghost"
                onClick={() => { onChange(undefined); setOpen(false); toast.success("アイコンを削除しました"); }}
              >
                <Trash2 className="h-4 w-4" />現在のアイコンを削除
              </Button>
            )}
          </div>
          <input
            ref={libRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handle(e.target.files?.[0])}
          />
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => handle(e.target.files?.[0])}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
