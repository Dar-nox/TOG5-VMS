import { useState } from "react";
import { useAuth } from "../../app/providers/authContext";
import { useConfirm } from "../../app/providers/confirmContext";
import { cn } from "../../lib/cn";

/** Who is signed in, and the way out. */
export function AccountBlock({ collapsed = false }: { collapsed?: boolean }) {
  const { user, signOut } = useAuth();
  const confirm = useConfirm();
  const [signingOut, setSigningOut] = useState(false);

  const name = user?.displayName ?? "Signed in";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  async function handleSignOut() {
    const confirmed = await confirm({
      title: "Sign out of TOG 5 VMS?",
      body: "You will need your email and password to get back in.",
      confirmLabel: "Sign out",
      tone: "primary",
    });

    if (!confirmed) {
      return;
    }

    setSigningOut(true);

    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className={cn("flex items-center gap-2 border-t border-navy-800 pt-3", collapsed && "flex-col")}>
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-700 text-xs font-semibold text-gold-400"
      >
        {initials || "?"}
      </span>

      {collapsed ? null : (
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-200">{name}</span>
      )}

      <button
        className={cn(
          "shrink-0 rounded-md px-2 py-1.5 text-xs font-semibold",
          "text-ink-300 hover:bg-navy-800 hover:text-inverse",
        )}
        disabled={signingOut}
        onClick={() => void handleSignOut()}
        type="button"
      >
        {collapsed ? <span className="sr-only">Sign out</span> : null}
        {collapsed ? "↩" : "Sign out"}
      </button>
    </div>
  );
}
