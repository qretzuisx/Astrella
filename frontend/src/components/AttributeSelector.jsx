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
    <div className="relative flex-none w-1/2 lg:w-auto lg:flex-1 min-w-0" ref={dropdownRef} style={{ zIndex: isOpen ? 100 : 10 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 sm:px-5 md:px-6 lg:px-7 py-3 sm:py-4 bg-transparent text-sm text-primary font-black focus:outline-none transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 sm:gap-1.5 touch-target rounded-xl sm:rounded-[40px] ${isOpen ? 'bg-gray-50' : 'hover:bg-gray-50/30'}`}
      >
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="uppercase tracking-wider whitespace-nowrap text-[10px] sm:text-xs md:text-sm">{value || label}</span>
          <svg className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Active Visual Indicator */}
        {value && type === 'shape' && shapes?.[value] && (
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary mt-1" viewBox="0 0 24 24" fill="currentColor">
            <path d={shapes[value]} />
          </svg>
        )}
        {value && type === 'color' && colors?.[value] && (
          <div className="flex gap-1 mt-1">
            {colors[value].map((c, i) => (
              <div key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }}></div>
            ))}
          </div>
        )}
      </button>

      {/* Custom Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 sm:mt-2 w-48 sm:w-64 bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.2)] border border-gray-100 overflow-hidden z-[200] animate-in zoom-in slide-in-from-top-2 duration-300">
          <div className="p-1 sm:p-2">
            <button
              type="button"
              onClick={() => { onSelect(''); setIsOpen(false); }}
              className="w-full px-4 py-2 sm:py-2 text-left text-[10px] sm:text-[11px] font-black uppercase text-gray-400 sm:hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <span>Reset {label}</span>
              <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="h-[1px] bg-gray-50 mx-4 mb-1 sm:mb-0"></div>

            <div className="max-h-[50vh] sm:max-h-[60vh] overflow-y-auto no-scrollbar">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onSelect(opt); setIsOpen(false); }}
                  className={`w-full px-4 py-2.5 sm:py-2.5 text-left flex items-center justify-between group/item hover:bg-primary active:bg-primary transition-all rounded-xl sm:rounded-xl mb-0.5 sm:mb-0 ${value === opt ? 'bg-primary text-white' : 'text-primary'}`}
                >
                  <span className={`text-[12px] sm:text-xs font-black transition-colors ${value === opt ? 'text-white' : 'group-hover/item:text-white'}`}>{opt}</span>

                  {/* Visuals in Dropdown */}
                  {type === 'shape' && shapes?.[opt] && (
                    <svg className={`w-5 h-5 transition-colors ${value === opt ? 'text-white' : 'text-primary/10 group-hover/item:text-white'}`} viewBox="0 0 24 24" fill="currentColor">
                      <path d={shapes[opt]} />
                    </svg>
                  )}
                  {type === 'color' && colors?.[opt] && (
                    <div className="flex gap-1">
                      {colors[opt].map((c, i) => (
                        <div key={i} className={`w-3 h-3 rounded-full border shadow-sm transition-colors ${value === opt ? 'border-white' : 'border-white/50 group-hover/item:border-white'}`} style={{ backgroundColor: c }}></div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isLast && <div className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-6 bg-primary/10"></div>}
    </div>
  );
};

export default AttributeSelector;
