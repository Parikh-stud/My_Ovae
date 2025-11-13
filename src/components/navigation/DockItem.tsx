'use client';

import React, { useState, forwardRef, useCallback, type MouseEvent, type TouchEvent, useEffect, CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DockTooltip } from './DockTooltip';
import { useDock } from './Dock';

export interface DockItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}

const dockIconStyle: CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, background-color 0.2s ease',
  background: 'rgba(255, 255, 255, 0.05)'
};

const activeStyle: CSSProperties = {
  background: 'rgba(147, 51, 234, 0.4)'
};

const dockIconHoverStyle: CSSProperties = {
  transform: 'scale(1.15) translateY(-8px)',
  background: 'rgba(147, 51, 234, 0.2)'
};


const MemoizedDockItem = forwardRef<HTMLDivElement, DockItemProps>(
  ({ href, icon: Icon, label, onClick }, ref) => {
    const pathname = usePathname();
    const { setHoveredItem, setTappedItem, isMobile, hoveredItem } = useDock();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // This effect runs only on the client, after the initial render.
        setMounted(true);
    }, []);

    const isActive = mounted && pathname === href;
    const isHovered = mounted && hoveredItem === label && !isMobile;

    const handleClick = useCallback(() => {
        if (onClick) {
            onClick();
        }
    }, [onClick]);

    const handleMouseEnter = useCallback(() => {
        if (!isMobile) {
            setHoveredItem(label);
        }
    }, [isMobile, setHoveredItem, label]);
    
    const handleMouseLeave = useCallback(() => {
        if (!isMobile) {
            setHoveredItem(null);
        }
    }, [isMobile, setHoveredItem]);
    
    const handleContextMenu = useCallback((e: TouchEvent | MouseEvent) => {
        if (isMobile) {
            e.preventDefault();
            setTappedItem(label);
        }
    }, [isMobile, setTappedItem, label]);
    
    const handleTouchEnd = useCallback(() => {
        setTimeout(() => setTappedItem(null), 2000);
    }, [setTappedItem]);
    
    const finalStyle = {
      ...dockIconStyle,
      ...(isActive ? activeStyle : {}),
      ...(isHovered ? dockIconHoverStyle : {}),
    };

    // Render null on the server and on the initial client render
    if (!mounted) {
      return null;
    }

    return (
      <div 
        ref={ref} 
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave} 
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        <DockTooltip label={label} />
        <Link
          href={href}
          onClick={handleClick}
          aria-label={label}
        >
          <div style={finalStyle}>
            <Icon style={{ width: '60%', height: '60%', color: isActive ? 'white' : 'rgba(255, 255, 255, 0.6)' }} />
          </div>
        </Link>
      </div>
    );
  }
);
MemoizedDockItem.displayName = 'DockItem';
export const DockItem = React.memo(MemoizedDockItem);
