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
    <div className="relative flex-1 min-w-fit" ref={dropdownRef} style={{ zIndex: isOpen ? 100 : 10 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 sm:px-6 py-3 bg-transparent text-sm text-primary font-black focus:outline-none transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 group/btn touch-target ${isOpen ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center gap-1.5">
           <span className="uppercase tracking-widest whitespace-nowrap text-[10px] sm:text-sm">{value || label}</span>
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
        <div className="fixed sm:absolute top-[auto] bottom-0 sm:bottom-[auto] sm:top-full left-0 sm:left-1/2 sm:-translate-x-1/2 w-full sm:w-56 bg-white sm:bg-white/95 backdrop-blur-3xl rounded-t-[32px] sm:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] sm:shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-t sm:border border-gray-100 overflow-hidden z-[100] animate-in slide-in-from-bottom sm:zoom-in duration-300 pb-safe sm:pb-0">
          <div className="p-2 sm:py-2">
            {/* Mobile handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto my-3 sm:hidden"></div>
            
            <button
              type="button"
              onClick={() => { onSelect(''); setIsOpen(false); }}
              className="w-full px-5 py-4 sm:py-3 text-left text-[11px] font-black uppercase text-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <span>Reset {label}</span>
              <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="h-[1px] bg-gray-50 mx-4 mb-2 sm:mb-0"></div>
            
            <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onSelect(opt); setIsOpen(false); }}
                  className={`w-full px-5 py-4 sm:py-3 text-left flex items-center justify-between group/item hover:bg-primary transition-all rounded-xl sm:rounded-none mb-1 sm:mb-0 ${value === opt ? 'bg-primary text-white' : 'text-primary'}`}
                >
                  <span className={`text-[13px] sm:text-xs font-black transition-colors ${value === opt ? 'text-white' : 'group-hover/item:text-white'}`}>{opt}</span>
                  
                  {/* Visuals in Dropdown */}
                  {type === 'shape' && shapes?.[opt] && (
                    <svg className={`w-6 h-6 transition-colors ${value === opt ? 'text-white' : 'text-primary/20 group-hover/item:text-white'}`} viewBox="0 0 24 24" fill="currentColor">
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
