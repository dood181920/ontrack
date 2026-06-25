const ESTIMATE_TABLE = {
  'Essay':        { Short: 2,   Medium: 5,  Long: 10 },
  'Problem set':  { Short: 1,   Medium: 3,  Long: 6  },
  'Lab report':   { Short: 3,   Medium: 6,  Long: 10 },
  'Reading':      { Short: 0.5, Medium: 1.5, Long: 3 },
  'Exam prep':    { Short: 2,   Medium: 5,  Long: 12 },
  'Project':      { Short: 5,   Medium: 15, Long: 30 },
  'Presentation': { Short: 2,   Medium: 4,  Long: 8  },
  'Other':        { Short: 1,   Medium: 3,  Long: 6  }
};

const SUBJECT_COLORS = {
  'Mathematics':      { bg: '#EDE9FE', text: '#6D28D9' },
  'English':          { bg: '#FEF3C7', text: '#B45309' },
  'History':          { bg: '#FEE2E2', text: '#B91C1C' },
  'Science':          { bg: '#D1FAE5', text: '#047857' },
  'Geography':        { bg: '#DBEAFE', text: '#1D4ED8' },
  'Economics':        { bg: '#E0E7FF', text: '#4338CA' },
  'Psychology':       { bg: '#FCE7F3', text: '#BE185D' },
  'Art':              { bg: '#FFF7ED', text: '#C2410C' },
  'Computer Science': { bg: '#ECFDF5', text: '#059669' },
  'Other':            { bg: '#F3F4F6', text: '#4B5563' }
};
