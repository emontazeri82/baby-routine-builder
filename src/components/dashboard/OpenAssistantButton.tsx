"use client";

export default function OpenAssistantButton() {
  return (
    <button
      type="button"
      onClick={() => {
        // 🔥 TOGGLE instead of only open
        window.dispatchEvent(new CustomEvent("toggle-assistant"));
      }}
      className="
        group relative
        flex items-center justify-center
        gap-2
        px-3 py-2
        rounded-full
        bg-gradient-to-r from-indigo-500 via-pink-500 to-cyan-500
        text-white
        shadow-[0_6px_20px_rgba(0,0,0,0.15)]
        hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]
        hover:scale-[1.03]
        active:scale-95
        transition-all duration-200
      "
    >
      {/* Icon */}
      <span className="text-sm">✨</span>

      {/* Text (hidden on small screens) */}
      <span className="hidden sm:inline text-sm font-medium">
        Assistant
      </span>

      {/* Glow */}
      <span
        className="
          pointer-events-none
          absolute inset-0 rounded-full
          bg-white/30 blur-xl opacity-0
          group-hover:opacity-40 transition
        "
      />
    </button>
  );
}
