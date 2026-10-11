export const DEFAULT_TITLE = 'dvndrk';
export const DEFAULT_SUBTITLE = 'Study Tracker';

export const State = {
  subjects: [],
  activeSubjectId: null, // null = dashboard is showing
  config: { startDate: '', targetDate: '', brandTitle: '', brandSubtitle: '' },
};

export const findSubject = id => State.subjects.find(s => s.id === id);
export const activeSubject = () => findSubject(State.activeSubjectId);
