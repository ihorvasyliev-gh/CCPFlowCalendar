import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
    onClick: () => void;
    ariaLabel?: string;
    className?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
    onClick,
    ariaLabel = "Create new event",
    className = ""
}) => {
    return (
        <button
            onClick={onClick}
            className={`fixed bottom-20 right-4 md:hidden z-50 p-4 bg-brand-600 text-white rounded-full shadow-lg hover:bg-brand-700 active:scale-95 transition-all duration-200 flex items-center justify-center ${className}`}
            aria-label={ariaLabel}
            style={{
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
        >
            <Plus className="h-6 w-6" />
        </button>
    );
};

export default FloatingActionButton;
