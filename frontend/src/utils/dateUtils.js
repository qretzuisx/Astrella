export const toIsoDate = (dateObj) => {
  if (!dateObj) return '';
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const formatDate = (dateString, options = {}) => {
  if (!dateString) return options.fallback || 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return options.fallback || 'N/A';
  
  const defaultOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  };
  
  return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

export const formatTime = (timeValue) => {
  if (!timeValue) return '';
  const parts = String(timeValue).trim().split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
  if (Number.isNaN(hours)) return timeValue;
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
};

export const combineDateAndTime = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) return null;
  return new Date(`${dateValue}T${timeValue}`);
};
