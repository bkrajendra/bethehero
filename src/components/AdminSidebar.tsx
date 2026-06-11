"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Event { id: string; name: string; status: string }
interface Admin { name: string; role: string }

interface Props {
  admin: Admin;
  events: Event[];
  currentEventId: string | null;
}

const NAV = [
  { href: "/admin",           label: "Dashboard" },
  { href: "/admin/events",    label: "Events" },
  { href: "/admin/scan",      label: "Scanner" },
  { href: "/admin/attendees", label: "Attendees" },
  { href: "/admin/users",     label: "Donors" },
  { href: "/admin/reports",   label: "Reports" },
];

export function AdminSidebar({ admin, events, currentEventId }: Props) {
  const pathname = usePathname();
  const activeEvent = events.find(e => e.id === currentEventId);

  return (
    <aside className="w-56 flex flex-col border-r border-[rgba(200,16,46,0.15)] bg-[#0a0109]">
      <div className="p-4 border-b border-[rgba(200,16,46,0.15)]">
        <p className="text-xs text-[rgba(253,240,238,0.3)] uppercase tracking-widest">Admin</p>
        <p className="font-semibold text-sm mt-0.5 text-[#fdf0ee]">{admin.name}</p>
        <p className="text-xs text-[rgba(253,240,238,0.3)]">{admin.role}</p>
      </div>

      {activeEvent && (
        <div className="p-3 mx-3 mt-3 rounded-lg bg-[rgba(200,16,46,0.1)] border border-[rgba(200,16,46,0.2)]">
          <p className="text-[10px] text-[rgba(253,240,238,0.3)] uppercase tracking-widest">Active Drive</p>
          <p className="text-xs font-medium mt-0.5 text-[#ff2442]">{activeEvent.name}</p>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 mt-2">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href}
            className={`block px-3 py-2 rounded-lg text-sm transition-colors
              ${pathname === href
                ? "bg-[rgba(200,16,46,0.2)] text-[#ff2442]"
                : "text-[rgba(253,240,238,0.55)] hover:text-[#fdf0ee] hover:bg-[rgba(200,16,46,0.08)]"
              }`}>
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-[rgba(200,16,46,0.15)]">
        <Link href="/" className="text-xs text-[rgba(253,240,238,0.3)] hover:text-[rgba(253,240,238,0.55)]">
          ← Public site
        </Link>
      </div>
    </aside>
  );
}
