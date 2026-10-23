import { NavLink, Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

const LINKS = [['/', 'Home'], ['/console', 'Console'], ['/beacon', 'Beacon app'], ['/eval', 'Evaluation']]

export default function NavBar({ right }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-night px-5 text-white">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent"><ShieldCheck size={16} /></span>
          <span className="text-[15px] font-semibold tracking-tight">Sach<span className="text-saffron">Verify</span></span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px]">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `rounded-md px-3 py-1.5 ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">{right}</div>
    </header>
  )
}
