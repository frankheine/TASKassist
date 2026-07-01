import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  subtasks: SubTask[];
}

export type EditSubMode = 'text' | 'drag';

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'user' | 'dev';
  description: string;
  tasksSnapshot: Task[];
}

interface CaseState {
  tasks: Task[];
  viewMode: 'project' | 'task';
  editMode: boolean;
  editSubMode: EditSubMode;
  developerMode: boolean;
  
  // Custom History
  pastStates: LogEntry[];
  futureStates: LogEntry[];
  changeLog: LogEntry[]; // Append-only chronological ledger
  appVersion: string;
  
  commitChange: (description: string, type?: 'user' | 'dev') => void;
  undo: () => void;
  redo: () => void;
  revertToLog: (logEntry: LogEntry) => void;

  toggleSubTask: (taskId: string, subTaskId: string) => void;
  setViewMode: (mode: 'project' | 'task') => void;
  setEditMode: (mode: boolean) => void;
  setEditSubMode: (mode: EditSubMode) => void;
  setDeveloperMode: (mode: boolean) => void;
  setAppVersion: (version: string) => void;
  addTask: () => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  moveTask: (id: string, direction: 'up' | 'down') => void;
  reorderTasks: (oldIndex: number, newIndex: number) => void;
  addSubTask: (taskId: string) => void;
  removeSubTask: (taskId: string, subTaskId: string) => void;
  updateSubTask: (taskId: string, subTaskId: string, title: string) => void;
  moveSubTask: (taskId: string, subTaskId: string, direction: 'up' | 'down') => void;
  reorderSubTasks: (taskId: string, oldIndex: number, newIndex: number) => void;
  addDevChange: (description: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const initialTasks: Task[] = [
  {
    id: 't1',
    title: 'Character & Baseline Proof',
    description: 'Assemble all documents establishing previous stability and reliability.',
    subtasks: [
      { id: 'st1', title: 'High School & College Records', completed: false },
      { id: 'st2', title: 'Union Construction Certifications', completed: false },
      { id: 'st3', title: 'SC2 Performance Evaluations', completed: false },
      { id: 'st4', title: 'Character Letters', completed: false },
    ]
  },
  {
    id: 't2',
    title: 'Financial & Community Ties',
    description: 'Provide evidence contradicting intent-to-distribute assumptions.',
    subtasks: [
      { id: 'st5', title: 'Tax Returns (Last 3 Years)', completed: false },
      { id: 'st6', title: 'Bank Statements (6 Months)', completed: false },
      { id: 'st7', title: 'House Deed & Mortgage Docs', completed: false },
    ]
  },
  {
    id: 't3',
    title: 'Medical & Psychological Context',
    description: 'Establish the clinical reality of the PTSD trigger and executive dysfunction.',
    subtasks: [
      { id: 'st8', title: 'Midwest Academy Abuse Records', completed: false },
      { id: 'st9', title: 'Prior Adderall Rx & Discharge Notice', completed: false },
      { id: 'st10', title: 'Confirmation of New Mental Health Intake', completed: false },
    ]
  },
  {
    id: 't4',
    title: 'Future Prospects & Tech Capability',
    description: 'Demonstrate advanced technical skills and upcoming AI ventures.',
    subtasks: [
      { id: 'st11', title: 'Compile AI Development Portfolios', completed: false },
      { id: 'st12', title: 'Print 3D Architecture Evidence', completed: false },
      { id: 'st13', title: 'Draft Startup Business Plan', completed: false },
    ]
  }
];

export const useCaseStore = create<CaseState>()(
  persist(
    (set, get) => ({
      tasks: initialTasks,
      viewMode: 'project',
      editMode: false,
      editSubMode: 'text',
      developerMode: false,
      
      pastStates: [],
      futureStates: [],
      changeLog: [],
      appVersion: '',

      commitChange: (description, type = 'user') => set((state) => {
        const newEntry: LogEntry = {
          id: generateId(),
          timestamp: Date.now(),
          type,
          description,
          tasksSnapshot: JSON.parse(JSON.stringify(state.tasks))
        };
        return {
          pastStates: [newEntry, ...state.pastStates],
          futureStates: [],
          changeLog: [newEntry, ...state.changeLog]
        };
      }),

      undo: () => set((state) => {
        if (state.pastStates.length === 0) return state;
        
        const { developerMode, pastStates, futureStates, changeLog, tasks } = state;
        
        let targetIndex = -1;
        if (developerMode) {
          targetIndex = 0; // Take the immediate last state
        } else {
          // Find the most recent 'user' state
          targetIndex = pastStates.findIndex(entry => entry.type === 'user');
        }

        if (targetIndex === -1) return state; // No suitable state to undo to

        const entriesToMove = pastStates.slice(0, targetIndex + 1);
        const targetEntry = entriesToMove[entriesToMove.length - 1];
        
        const currentEntry: LogEntry = {
          id: generateId(),
          timestamp: Date.now(),
          type: targetEntry.type,
          description: `Undo: ${targetEntry.description}`,
          tasksSnapshot: JSON.parse(JSON.stringify(tasks))
        };

        return {
          tasks: JSON.parse(JSON.stringify(targetEntry.tasksSnapshot)),
          pastStates: pastStates.slice(targetIndex + 1),
          futureStates: [...entriesToMove.reverse(), ...futureStates],
          changeLog: [
            {
              ...currentEntry,
              description: `Undo: ${targetEntry.description}`
            },
            ...changeLog
          ]
        };
      }),

      redo: () => set((state) => {
        if (state.futureStates.length === 0) return state;
        
        const { developerMode, pastStates, futureStates, changeLog, tasks } = state;
        
        let targetIndex = -1;
        if (developerMode) {
          targetIndex = 0;
        } else {
          targetIndex = futureStates.findIndex(entry => entry.type === 'user');
        }

        if (targetIndex === -1) return state;

        const entriesToMove = futureStates.slice(0, targetIndex + 1);
        const targetEntry = entriesToMove[entriesToMove.length - 1];
        
        const currentEntry: LogEntry = {
          id: generateId(),
          timestamp: Date.now(),
          type: targetEntry.type,
          description: `Redo: ${targetEntry.description}`,
          tasksSnapshot: JSON.parse(JSON.stringify(tasks))
        };

        return {
          tasks: JSON.parse(JSON.stringify(targetEntry.tasksSnapshot)),
          pastStates: [...entriesToMove.reverse(), ...pastStates],
          futureStates: futureStates.slice(targetIndex + 1),
          changeLog: [
            {
              ...currentEntry,
              description: `Redo: ${targetEntry.description}`,
              tasksSnapshot: JSON.parse(JSON.stringify(targetEntry.tasksSnapshot))
            },
            ...changeLog
          ]
        };
      }),

      revertToLog: (logEntry) => set((state) => {
        const newEntry: LogEntry = {
          id: generateId(),
          timestamp: Date.now(),
          type: logEntry.type,
          description: `Reverted to: ${logEntry.description}`,
          tasksSnapshot: JSON.parse(JSON.stringify(logEntry.tasksSnapshot))
        };
        
        // Push the current state to past before reverting so it's undoable via normal undo
        const currentStateEntry: LogEntry = {
            id: generateId(),
            timestamp: Date.now(),
            type: logEntry.type,
            description: `Auto-save before reverting to: ${logEntry.description}`,
            tasksSnapshot: JSON.parse(JSON.stringify(state.tasks))
        };

        return {
          tasks: JSON.parse(JSON.stringify(logEntry.tasksSnapshot)),
          pastStates: [currentStateEntry, ...state.pastStates],
          futureStates: [],
          changeLog: [newEntry, ...state.changeLog]
        };
      }),

      addDevChange: (description) => {
        const state = get();
        state.commitChange(description, 'dev');
      },

      setViewMode: (mode) => set({ viewMode: mode }),
      setEditMode: (mode) => set({ editMode: mode }),
      setEditSubMode: (mode) => set({ editSubMode: mode }),
      setDeveloperMode: (mode) => set({ developerMode: mode }),
      setAppVersion: (version) => set({ appVersion: version }),
      
      addTask: () => {
        get().commitChange('Added New Task');
        set((state) => ({
          tasks: [...state.tasks, { id: generateId(), title: 'New Task', description: 'Task Description', subtasks: [] }]
        }));
      },
      
      removeTask: (id) => {
        get().commitChange(`Removed Task`);
        set((state) => ({
          tasks: state.tasks.filter(t => t.id !== id)
        }));
      },
      
      updateTask: (id, updates) => {
        get().commitChange(`Updated Task Text`);
        set((state) => ({
          tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
        }));
      },
      
      moveTask: (id, direction) => {
        get().commitChange(`Moved Task ${direction}`);
        set((state) => {
          const idx = state.tasks.findIndex(t => t.id === id);
          if (idx < 0) return state;
          if (direction === 'up' && idx === 0) return state;
          if (direction === 'down' && idx === state.tasks.length - 1) return state;
          const newTasks = [...state.tasks];
          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          [newTasks[idx], newTasks[targetIdx]] = [newTasks[targetIdx], newTasks[idx]];
          return { tasks: newTasks };
        });
      },

      reorderTasks: (oldIndex, newIndex) => {
        get().commitChange(`Reordered Task`);
        set((state) => {
          const newTasks = [...state.tasks];
          const [moved] = newTasks.splice(oldIndex, 1);
          newTasks.splice(newIndex, 0, moved);
          return { tasks: newTasks };
        });
      },
      
      addSubTask: (taskId) => {
        get().commitChange(`Added Subtask`);
        set((state) => ({
          tasks: state.tasks.map(t => t.id === taskId ? { 
            ...t, 
            subtasks: [...t.subtasks, { id: generateId(), title: 'New Subtask', completed: false }] 
          } : t)
        }));
      },
      
      removeSubTask: (taskId, subTaskId) => {
        get().commitChange(`Removed Subtask`);
        set((state) => ({
          tasks: state.tasks.map(t => t.id === taskId ? {
            ...t,
            subtasks: t.subtasks.filter(st => st.id !== subTaskId)
          } : t)
        }));
      },
      
      updateSubTask: (taskId, subTaskId, title) => {
        get().commitChange(`Updated Subtask Text`);
        set((state) => ({
          tasks: state.tasks.map(t => t.id === taskId ? {
            ...t,
            subtasks: t.subtasks.map(st => st.id === subTaskId ? { ...st, title } : st)
          } : t)
        }));
      },
      
      moveSubTask: (taskId, subTaskId, direction) => {
        get().commitChange(`Moved Subtask ${direction}`);
        set((state) => ({
          tasks: state.tasks.map(t => {
            if (t.id !== taskId) return t;
            const idx = t.subtasks.findIndex(st => st.id === subTaskId);
            if (idx < 0) return t;
            if (direction === 'up' && idx === 0) return t;
            if (direction === 'down' && idx === t.subtasks.length - 1) return t;
            const newSubtasks = [...t.subtasks];
            const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
            [newSubtasks[idx], newSubtasks[targetIdx]] = [newSubtasks[targetIdx], newSubtasks[idx]];
            return { ...t, subtasks: newSubtasks };
          })
        }));
      },

      reorderSubTasks: (taskId, oldIndex, newIndex) => {
        get().commitChange(`Reordered Subtask`);
        set((state) => ({
          tasks: state.tasks.map(t => {
            if (t.id === taskId) {
              const newSubtasks = [...t.subtasks];
              const [moved] = newSubtasks.splice(oldIndex, 1);
              newSubtasks.splice(newIndex, 0, moved);
              return { ...t, subtasks: newSubtasks };
            }
            return t;
          })
        }));
      },

      toggleSubTask: (taskId, subTaskId) => {
        get().commitChange(`Toggled Subtask Status`);
        set((state) => ({
          tasks: state.tasks.map((task) => 
            task.id === taskId 
              ? {
                  ...task,
                  subtasks: task.subtasks.map((st) => 
                    st.id === subTaskId ? { ...st, completed: !st.completed } : st
                  )
                }
              : task
          )
        }));
      }
    }),
    {
      name: 'taskassist-storage-v2',
      partialize: (state) => ({ 
        tasks: state.tasks, 
        viewMode: state.viewMode, 
        editSubMode: state.editSubMode,
        developerMode: state.developerMode,
        pastStates: state.pastStates,
        futureStates: state.futureStates,
        changeLog: state.changeLog,
        appVersion: state.appVersion
      })
    }
  )
);



