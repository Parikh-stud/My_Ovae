
'use client';

import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { useDock } from './Dock';

interface DockTooltipProps {
  label: string;
}

export const DockTooltip: React.FC<DockTooltipProps> = ({ label }) => {
    const { hoveredItem, tappedItem, isMobile } = useDock();
    
    // Tooltip is visible if it's hovered on desktop OR tapped on mobile
    const isVisible = (isMobile && tappedItem === label) || (!isMobile && hoveredItem === label);
    
    const shouldReduceMotion = useReducedMotion();

    const tooltipStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '100%',
        marginBottom: '12px',
        padding: '6px 12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(20, 15, 30, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'none',
        zIndex: 1100,
    };

    return (
        <m.div
            style={tooltipStyle}
            initial={{ opacity: 0, y: 10 }}
            animate={{
                opacity: isVisible && !shouldReduceMotion ? 1 : 0,
                y: isVisible && !shouldReduceMotion ? 0 : 10,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30, duration: 0.15, delay: isVisible ? 0.2 : 0 }}
            aria-hidden={!isVisible}
        >
            {label}
        </m.div>
    );
};

DockTooltip.displayName = 'DockTooltip';
