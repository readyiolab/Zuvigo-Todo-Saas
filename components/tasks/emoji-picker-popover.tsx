"use client";

import { useMemo, useState, type ReactElement } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATEGORIES: Array<{ id: string; label: string; emojis: string[] }> = [
  {
    id: "smileys",
    label: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌",
      "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨",
      "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁",
      "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬",
      "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭",
      "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲",
      "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒",
      "🤕", "🤑", "🤠",
    ],
  },
  {
    id: "gestures",
    label: "Gestures",
    emojis: [
      "👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘",
      "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐", "🖖",
      "👋", "🤙", "💪", "🦾", "🖕", "✍️", "🤳", "💅", "🙇", "🙋", "🤷", "🤦",
    ],
  },
  {
    id: "people",
    label: "People",
    emojis: [
      "👶", "🧒", "👦", "👧", "🧑", "👨", "👩", "🧔", "🧓", "👴", "👵", "👤",
      "👥", "🫂", "👪", "👨‍👩‍👧", "👩‍💻", "👨‍💻", "🧑‍💼", "👮", "👷", "🕵️", "👩‍🚀", "🦸",
    ],
  },
  {
    id: "animals",
    label: "Nature",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮",
      "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞",
      "🌸", "💮", "🌹", "🌺", "🌻", "🌼", "🌷", "🌱", "🌲", "🌳", "🌴", "🌵",
      "🍀", "🍁", "🍂", "🍃", "🌍", "🌎", "🌏", "⭐", "🌟", "✨", "⚡", "🔥",
      "💧", "🌊", "☀️", "🌙", "☁️", "⛅", "🌈", "❄️",
    ],
  },
  {
    id: "food",
    label: "Food",
    emojis: [
      "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑",
      "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🍆", "🥔", "🥕", "🌽", "🌶️", "🫑",
      "🥒", "🥬", "🥦", "🧄", "🧅", "🍄", "🥜", "🌰", "🍞", "🥐", "🥖", "🫓",
      "🥨", "🥯", "🥞", "🧇", "🧀", "🍖", "🍗", "🥩", "🥓", "🍔", "🍟", "🍕",
      "🌭", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆", "🥚", "🍳", "🥘", "🍲", "🫕",
      "🥣", "🥗", "🍿", "🧈", "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜",
      "🍝", "🍠", "🍢", "🍣", "🍤", "🍥", "🥮", "🍡", "🥟", "🥠", "🥡", "🦪",
      "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭",
      "🍮", "🍯", "🍼", "🥛", "☕", "🫖", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺",
      "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🍾",
    ],
  },
  {
    id: "activity",
    label: "Activity",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓",
      "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿",
      "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸", "🥌", "🎿", "⛷", "🏂", "🪂",
      "🏋️", "🤼", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "🤽",
      "🚣", "🧗", "🚵", "🚴", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖", "🏵", "🎗",
      "🎫", "🎟", "🎪", "🤹", "🎭", "🩰", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹",
      "🥁", "🪘", "🎷", "🎺", "🪗", "🎸", "🪕", "🎻", "🎲", "♟", "🎯", "🎳",
      "🎮", "🎰", "🧩",
    ],
  },
  {
    id: "objects",
    label: "Objects",
    emojis: [
      "⌚", "📱", "📲", "💻", "⌨️", "🖥", "🖨", "🖱", "🖲", "🕹", "🗜", "💾",
      "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽", "🎞", "📞", "☎️", "📟",
      "📠", "📺", "📻", "🎙", "🎚", "🎛", "🧭", "⏱", "⏲", "⏰", "🕰", "⌛",
      "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯", "🪔", "🧯", "🛢", "💸", "💵",
      "💴", "💶", "💷", "🪙", "💰", "💳", "💎", "⚖️", "🪜", "🧰", "🪛", "🔧",
      "🔨", "⚒", "🛠", "⛏", "🪚", "🔩", "⚙️", "🪤", "🧱", "⛓", "🧲", "🔫",
      "💣", "🧨", "🪓", "🔪", "🗡", "⚔️", "🛡", "🚬", "⚰️", "🪦", "⚱️", "🏺",
      "🔮", "📿", "🧿", "💈", "⚗️", "🔭", "🔬", "🕳", "🩹", "🩺", "💊", "💉",
      "🩸", "🧬", "🦠", "🧫", "🧪", "🌡", "🧹", "🪠", "🧺", "🧻", "🚽", "🚰",
      "🚿", "🛁", "🛀", "🧼", "🪥", "🪒", "🧽", "🪣", "🧴", "🛎", "🔑", "🗝",
      "🚪", "🪑", "🛋", "🛏", "🛌", "🧸", "🪆", "🖼", "🪞", "🪟", "🛍", "🛒",
      "🎁", "🎈", "🎏", "🎀", "🎊", "🎉", "🎎", "🏮", "🎐", "🧧", "✉️", "📩",
      "📨", "📧", "💌", "📥", "📤", "📦", "🏷", "🪧", "📪", "📫", "📬", "📭",
      "📮", "📯", "📜", "📃", "📄", "📑", "🧾", "📊", "📈", "📉", "🗒", "🗓",
      "📆", "📅", "🗑", "📇", "🗃", "🗳", "🗄", "📋", "📁", "📂", "🗂", "🗞",
      "📰", "📓", "📔", "📒", "📕", "📗", "📘", "📙", "📚", "📖", "🔖", "🧷",
      "🔗", "📎", "🖇", "📐", "📏", "🧮", "📌", "📍", "✂️", "🖊", "🖋", "✒️",
      "🖌", "🖍", "📝", "✏️", "🔍", "🔎", "🔏", "🔐", "🔒", "🔓",
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
      "💞", "💓", "💗", "💖", "💘", "💝", "✅", "❌", "❓", "❗", "❕", "⁉️",
      "💯", "💢", "💥", "💫", "💦", "💨", "🕳", "💬", "🗨", "🗯", "💭", "💤",
      "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤", "⚫", "⚪", "🟥", "🟧", "🟨",
      "🟩", "🟦", "🟪", "🟫", "⬛", "⬜", "◼️", "◻️", "◾", "◽", "▪️", "▫️",
      "🔶", "🔷", "🔸", "🔹", "🔺", "🔻", "💠", "🔘", "🔳", "🔲", "🏁", "🚩",
      "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️", "海盗",
    ],
  },
];

export function EmojiPickerPopover({
  value,
  onSelect,
  disabled,
  imageSrc,
  children,
  align = "start",
}: {
  value?: string;
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  imageSrc?: string | null;
  children?: ReactElement;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].id);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) {
      return CATEGORIES.find((c) => c.id === category)?.emojis ?? [];
    }
    return CATEGORIES.flatMap((c) => c.emojis).filter((e) => e.includes(q));
  }, [category, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {children ? (
        <PopoverTrigger disabled={disabled} render={children} />
      ) : (
        <PopoverTrigger
          disabled={disabled}
          render={
            <button
              type="button"
              disabled={disabled}
              aria-label="Choose emoji"
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-md text-xl transition-colors",
                "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                disabled && "pointer-events-none opacity-50"
              )}
            />
          }
        >
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt=""
              className="size-full rounded-lg object-cover"
            />
          ) : (
            <span>{value || "😊"}</span>
          )}
        </PopoverTrigger>
      )}
      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-[min(20rem,calc(100vw-2rem))] gap-2 p-2"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji…"
          className="h-8"
          aria-label="Search emoji"
        />
        {!query.trim() ? (
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  "rounded-md px-2 py-1 text-caption",
                  category === c.id
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto">
          {filtered.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-lg hover:bg-muted"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
                setQuery("");
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
