import React, { useState, useEffect, useRef } from 'react';

const AttributeSelector = ({ label, value, options, onSelect, type, shapes, colors, symbols, isLast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative group" ref={dropdownRef} style={{ zIndex: isOpen ? 100 : 10 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-6 py-3 bg-transparent text-sm text-primary font-black focus:outline-none transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 group/btn ${isOpen ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center gap-1.5">
           <span className="uppercase tracking-widest whitespace-nowrap">{value || label}</span>
           <svg className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
           </svg>
        </div>
        
        {/* Active Visual Indicator */}
        {value && type === 'shape' && shapes?.[value] && (
          <svg className="w-6 h-6 text-primary mt-1" viewBox="0 0 24 24" fill="currentColor">
            <path d={shapes[value]} />
          </svg>
        )}
        {value && type === 'color' && colors?.[value] && (
          <div className="flex gap-1.5 mt-1">
            {colors[value].map((c, i) => (
              <div key={i} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }}></div>
            ))}
          </div>
        )}
        {value && type === 'symbol' && symbols?.[value] && (
          <span className="text-xl font-black text-gray-800 mt-1">{symbols[value]}</span>
        )}
      </button>

      {/* Custom Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-[100] animate-in fade-in zoom-in duration-300">
          <div className="py-2">
            <button
              type="button"
              onClick={() => { onSelect(''); setIsOpen(false); }}
              className="w-full px-5 py-3 text-left text-[11px] font-black uppercase text-gray-400 hover:bg-gray-50 transition-colors"
            >
              Reset {label}
            </button>
            <div className="h-[1px] bg-gray-50 mx-4"></div>
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onSelect(opt); setIsOpen(false); }}
                className={`w-full px-5 py-3 text-left flex items-center justify-between group/item hover:bg-primary transition-all ${value === opt ? 'bg-primary/5 text-primary' : 'text-primary'}`}
              >
                <span className={`text-xs font-black transition-colors ${value === opt ? 'text-primary' : 'group-hover/item:text-white'}`}>{opt}</span>
                
                {/* Visuals in Dropdown */}
                {type === 'shape' && shapes?.[opt] && (
                  <svg className={`w-6 h-6 transition-colors ${value === opt ? 'text-primary' : 'text-primary/20 group-hover/item:text-white'}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d={shapes[opt]} />
                  </svg>
                )}
                {type === 'color' && colors?.[opt] && (
                  <div className="flex gap-1.5">
                    {colors[opt].map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }}></div>
                    ))}
                  </div>
                )}
                {type === 'symbol' && symbols?.[opt] && (
                  <span className={`text-xl font-black transition-colors ${value === opt ? 'text-gray-800' : 'text-primary/20 group-hover/item:text-gray-800'}`}>{symbols[opt]}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isLast && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-6 bg-primary/10"></div>}
    </div>
  );
};

export default AttributeSelector;
