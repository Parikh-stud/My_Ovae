'use client';

import React, { createContext, useContext, useState, useRef, type ReactNode, type Dispatch, type SetStateAction, type CSSProperties } from 'react';
import { m } from 'framer-motion';
import { DockItem, type DockItemProps as DockItemType } from './DockItem';
import { Bot, Carrot, Dumbbell, HeartPulse, LayoutDashboard, Moon, NotebookText, TrendingUp, Users } from 'lucide-react';
import { useMobile } from '@/hooks/use-mobile';


// --- Configuration ---

export const dockItems: DockItemType[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/cycle-tracker", icon: Moon, label: "Cycle Tracker" },
  { href: "/symptom-log", icon: HeartPulse, label: "Symptom Log" },
  { href: "/insights", icon: TrendingUp, label: "Insights" },
  { href: "/coaching", icon: Bot, label: "AI Coach" },
  { href: "/community", icon: Users, label: "Sisterhood" },
  { href: "/nutrition", icon: Carrot, label: "Nutrition" },
  { href: "/fitness", icon: Dumbbell, label: "Fitness" },
  { href: "/lab-results", icon: NotebookText, label: "Lab Results" },
];


// --- Context & Provider ---

interface DockContextType {
  hoveredItem: string | null;
  setHoveredItem: Dispatch<SetStateAction<string | null>>;
  tappedItem: string | null;
  setTappedItem: Dispatch<SetStateAction<string | null>>;
  activeItem: string | null;
  setActiveItem: Dispatch<SetStateAction<string | null>>;
  isMobile: boolean;
}

const DockContext = createContext<DockContextType | null>(null);

export const useDock = (): DockContextType => {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('useDock must be used within a DockProvider');
  }
  return context;
};

export const DockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [tappedItem, setTappedItem] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const isMobile = useMobile();


  const value: DockContextType = {
    hoveredItem,
    setHoveredItem,
    tappedItem,
    setTappedItem,
    activeItem,
    setActiveItem,
    isMobile,
  };

  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
};
DockProvider.displayName = 'DockProvider';

// --- Main Dock Component ---

interface DockProps {
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const dockContainerStyle: CSSProperties = {
  position: 'fixed',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
  padding: '12px',
  background: 'rgba(30, 20, 40, 0.6)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  display: 'flex',
  gap: '8px',
  alignItems: 'flex-end',
  height: '72px'
};

const DockComponent: React.FC<DockProps> = ({
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <m.div
      ref={ref}
      style={dockContainerStyle}
    >
      {children}
    </m.div>
  );
};
DockComponent.displayName = 'Dock';


// --- Component Composition ---

type DockComposition = React.FC<DockProps> & {
    Item: typeof DockItem;
}

export const Dock: DockComposition = Object.assign(DockComponent, {
  Item: DockItem,
});
