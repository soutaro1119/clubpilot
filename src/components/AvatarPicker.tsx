import { useRef } from "react";
import { Camera } from "lucide-react";
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
  const libRef = useRef<HTMLInputElement>(null);

  const handle = async (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("画像ファイルを選んでください");
    try {
      const url = await fileToCompressedDataUrl(f);
      onChange(url);
      toast.success("アイコンを更新しました");
    } catch {
      toast.error("画像の読み込みに失敗しました");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => libRef.current?.click()}
        className="group relative inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-border transition hover:ring-primary"
        style={{ width: size, height: size }}
        aria-label="アイコンを変更"
      >
        <Avatar profile={profile} size={size} />
        <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow">
          <Camera className="h-3.5 w-3.5" />
        </span>
      </button>
      <input
        ref={libRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
}
