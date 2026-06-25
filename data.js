var currentUser = null;

var today = new Date();
today.setHours(0, 0, 0, 0);

function daysFromToday(n) {
  var d = new Date(today);
  d.setDate(d.getDate() + n);
  return d;
}

function getDefaultData() {
  return {
    dailyAvailability: 2,
    assignments: [
      {
        id: 'sample-1',
        name: 'Romeo & Juliet Essay',
        subject: 'English',
        type: 'Essay',
        size: 'Medium',
        dateAssigned: daysFromToday(-7).toISOString(),
        dueDate: daysFromToday(2).toISOString(),
        estimatedHours: 5,
        hoursLogged: 1.5,
        sessions: [{ date: daysFromToday(-3).toISOString(), durationHours: 1.5 }],
        completed: false
      },
      {
        id: 'sample-2',
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
        id: 'sample-3',
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

var appData = (typeof supabaseReady !== 'undefined' && supabaseReady)
  ? { dailyAvailability: 2, assignments: [], nextId: 1 }
  : getDefaultData();

var timerState = {
  assignmentId: null,
  startTime: null,
  intervalId: null
};

async function loadUserData(userId) {
  if (!supabaseReady) return;
  try {
    var profileRes = await supabaseClient
      .from('profiles')
      .select('daily_availability')
      .eq('id', userId)
      .single();
    if (profileRes.data) {
      appData.dailyAvailability = profileRes.data.daily_availability || 2;
    }

    var assignRes = await supabaseClient
      .from('assignments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (assignRes.error) throw assignRes.error;

    var assignments = assignRes.data || [];

    for (var i = 0; i < assignments.length; i++) {
      var a = assignments[i];
      var sessRes = await supabaseClient
        .from('sessions')
        .select('*')
        .eq('assignment_id', a.id)
        .order('date', { ascending: false });

      assignments[i] = {
        id: a.id,
        name: a.name,
        subject: a.subject,
        type: a.type,
        size: a.size,
        dateAssigned: a.date_assigned,
        dueDate: a.due_date,
        estimatedHours: a.estimated_hours,
        hoursLogged: a.hours_logged,
        completed: a.completed,
        sessions: (sessRes.data || []).map(function (s) {
          return { id: s.id, date: s.date, durationHours: s.duration_hours };
        })
      };
    }

    appData.assignments = assignments;
  } catch (e) {
    console.error('Failed to load user data:', e);
  }
}

async function saveAssignment(assignment) {
  if (!supabaseReady) return assignment.id || 'local-' + Date.now();
  try {
    var row = {
      user_id: currentUser.id,
      name: assignment.name,
      subject: assignment.subject,
      type: assignment.type,
      size: assignment.size,
      date_assigned: assignment.dateAssigned,
      due_date: assignment.dueDate,
      estimated_hours: assignment.estimatedHours,
      hours_logged: assignment.hoursLogged,
      completed: assignment.completed
    };

    if (typeof assignment.id === 'string' && assignment.id.length > 10) {
      row.id = assignment.id;
      var res = await supabaseClient.from('assignments').upsert(row).select().single();
      if (res.error) throw res.error;
      return res.data.id;
    } else {
      var res = await supabaseClient.from('assignments').insert(row).select().single();
      if (res.error) throw res.error;
      return res.data.id;
    }
  } catch (e) {
    console.error('Failed to save assignment:', e);
    return assignment.id;
  }
}

async function saveSession(assignmentId, session) {
  if (!supabaseReady) return null;
  try {
    var res = await supabaseClient.from('sessions').insert({
      assignment_id: assignmentId,
      user_id: currentUser.id,
      date: session.date,
      duration_hours: session.durationHours
    }).select().single();
    if (res.error) throw res.error;
    return res.data.id;
  } catch (e) {
    console.error('Failed to save session:', e);
    return null;
  }
}

async function updateAssignmentHours(assignmentId, hoursLogged) {
  if (!supabaseReady) return;
  try {
    var res = await supabaseClient.from('assignments')
      .update({ hours_logged: hoursLogged })
      .eq('id', assignmentId);
    if (res.error) throw res.error;
  } catch (e) {
    console.error('Failed to update hours:', e);
  }
}

async function markAssignmentComplete(assignmentId) {
  if (!supabaseReady) return;
  try {
    var res = await supabaseClient.from('assignments')
      .update({ completed: true })
      .eq('id', assignmentId);
    if (res.error) throw res.error;
  } catch (e) {
    console.error('Failed to mark complete:', e);
  }
}

var availabilityDebounce = null;
async function updateDailyAvailability(userId, hours) {
  clearTimeout(availabilityDebounce);
  availabilityDebounce = setTimeout(async function () {
    if (!supabaseReady) return;
    try {
      var res = await supabaseClient.from('profiles')
        .update({ daily_availability: hours })
        .eq('id', userId);
      if (res.error) throw res.error;
    } catch (e) {
      console.error('Failed to update availability:', e);
    }
  }, 500);
}
