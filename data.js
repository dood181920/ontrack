const today = new Date();
today.setHours(0, 0, 0, 0);

function daysFromToday(n) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d;
}

const appData = {
  dailyAvailability: 2,
  assignments: [
    {
      id: 1,
      name: 'Romeo & Juliet Essay',
      subject: 'English',
      type: 'Essay',
      size: 'Medium',
      dateAssigned: daysFromToday(-7),
      dueDate: daysFromToday(2),
      estimatedHours: 5,
      hoursLogged: 1.5,
      sessions: [
        { date: daysFromToday(-3), durationHours: 1.5 }
      ],
      completed: false
    },
    {
      id: 2,
      name: 'Calculus Problem Set',
      subject: 'Mathematics',
      type: 'Problem set',
      size: 'Short',
      dateAssigned: daysFromToday(-2),
      dueDate: daysFromToday(1),
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
      dateAssigned: daysFromToday(-10),
      dueDate: daysFromToday(10),
      estimatedHours: 10,
      hoursLogged: 6,
      sessions: [
        { date: daysFromToday(-5), durationHours: 3 },
        { date: daysFromToday(-2), durationHours: 3 }
      ],
      completed: false
    }
  ],
  nextId: 4
};

const timerState = {
  assignmentId: null,
  startTime: null,
  intervalId: null
};
