import { motion } from 'motion/react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { IconBook, IconCards, IconHome, IconPencil } from './icons';
import { spring } from './motion';

const TABS: { to: string; label: string; Icon: ComponentType; end?: boolean }[] = [
  { to: '/', label: 'Today', Icon: IconHome, end: true },
  { to: '/learn', label: 'Learn', Icon: IconBook },
  { to: '/practice', label: 'Practice', Icon: IconPencil },
  { to: '/cards', label: 'Cards', Icon: IconCards },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="tab-pill" className="tab-pill" transition={spring} />}
              <Icon />
              <span className="tab-label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
