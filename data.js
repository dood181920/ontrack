const today = new Date();
today.setHours(0, 0, 0, 0);

function daysFromToday(n) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d;
}

function getDefaultData() {
  return {
    dailyAvailability: 2,
    assignments: [
      {
        id: 1,
        name: 'Romeo & Juliet Essay',
        subject: 'English',
        type: 'Essay',
        size: 'Medium',
        dateAssigned: daysFromToday(-7).toISOString(),
        dueDate: daysFromToday(2).toISOString(),
        estimatedHours: 5,
        hoursLogged: 1.5,
        sessions: [
          { date: daysFromToday(-3).toISOString(), durationHours: 1.5 }
        ],
        completed: false
      },
      {
        id: 2,
        name: 'Calculus Problem Set',
        subject: 'Mathematics',
        type: 'Problem set',
        size: 'Short',
        dateAssigned: daysFromToday(-2).toISOString(),
        dueDate: daysFromToday(1).toISOString(),
        estimatedHours: 3,
        hoursLogged: 0,
        sessions: [],
        completed: false
      },
      {
        id: 3,
        name: 'Biology Lab Report',
        subject: 'Science',
        type: 'Lab report',
        size: 'Long',
        dateAssigned: daysFromToday(-10).toISOString(),
        dueDate: daysFromToday(10).toISOString(),
        estimatedHours: 10,
        hoursLogged: 6,
        sessions: [
          { date: daysFromToday(-5).toISOString(), durationHours: 3 },
          { date: daysFromToday(-2).toISOString(), durationHours: 3 }
        ],
        completed: false
      }
    ],
    nextId: 4
  };
}

function loadData() {
  try {
    var saved = localStorage.getItem('ontrack_data');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return getDefaultData();
}

function saveData() {
  try {
    localStorage.setItem('ontrack_data', JSON.stringify(appData));
  } catch (e) {}
}

var appData = loadData();

var timerState = {
  assignmentId: null,
  startTime: null,
  intervalId: null
};
