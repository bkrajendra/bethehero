"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, CalendarDays, ScanLine, Droplets, Users, FileBarChart } from "lucide-react";

interface Event { id: string; name: string; status: string }
interface Admin { name: string; role: string }

interface Props {
  admin: Admin;
  events: Event[];
  currentEventId: string | null;
}

const NAV = [
  { href: "/admin",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin/events",    label: "Events",     icon: CalendarDays },
  { href: "/admin/scan",      label: "Scanner",    icon: ScanLine },
  { href: "/admin/attendees", label: "Attendees",  icon: Droplets },
  { href: "/admin/users",     label: "Donors",     icon: Users },
  { href: "/admin/reports",   label: "Reports",    icon: FileBarChart },
];

export function AdminSidebar({ admin, events, currentEventId }: Props) {
  const pathname = usePathname();
  const activeEvent = events.find(e => e.id === currentEventId);
  const [open, setOpen] = useState(false);

  const navContent = (
    <>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#c8102e] flex items-center justify-center text-white font-bold text-sm">
            {admin.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{admin.name}</p>
            <p className="text-xs text-gray-400 capitalize">{admin.role}</p>
          </div>
        </div>
      </div>

      {activeEvent && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
          <p className="text-[10px] text-red-400 uppercase tracking-widest font-medium">Active Drive</p>
          <p className="text-xs font-semibold mt-0.5 text-[#c8102e] truncate">{activeEvent.name}</p>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-0.5 mt-2">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${pathname === href
                ? "bg-red-50 text-[#c8102e]"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}>
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <Link href="/" className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <span>←</span> Public site
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="BeTheHero" width={26} height={26} className="object-contain" />
          <span className="font-bold text-gray-900 text-sm">BeTheHero Admin</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/30" onClick={() => setOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={`md:hidden fixed top-14 left-0 bottom-0 z-20 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-gray-100 bg-white shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Image src="/logo.png" alt="BeTheHero" width={28} height={28} className="object-contain" />
            <span className="font-bold text-gray-900">BeTheHero</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#c8102e] flex items-center justify-center text-white font-bold text-sm shrink-0">
              {admin.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">{admin.name}</p>
              <p className="text-xs text-gray-400 capitalize">{admin.role}</p>
            </div>
          </div>
        </div>

        {activeEvent && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
            <p className="text-[10px] text-red-400 uppercase tracking-widest font-medium">Active Drive</p>
            <p className="text-xs font-semibold mt-0.5 text-[#c8102e] truncate">{activeEvent.name}</p>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-0.5 mt-2">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${pathname === href
                  ? "bg-red-50 text-[#c8102e]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}>
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <Link href="/" className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <span>←</span> Public site
          </Link>
        </div>
      </aside>
    </>
  );
}
