import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, XCircle, CheckCircle2, Trash2, Star, Zap, Clock, Award, ChevronDown, ChevronUp, MessageCircle, Pencil, Sparkles, AlertCircle, TrendingUp, CalendarClock, RotateCcw, CalendarPlus, Upload, Download, Settings } from 'lucide-react';

// Helper function to generate unique IDs
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

// Constants for UI and Logic
const IMPORTANCE_LEVELS = { 1: "Very Low", 2: "Low", 3: "Medium", 4: "High", 5: "Very High" };
const URGENCY_LEVELS = { 1: "Later", 2: "Soon", 3: "Normal", 4: "Quickly", 5: "ASAP" };
const ANIMATION_DURATION = 300; // ms, for list transitions
const SPARKLE_ANIMATION_TOTAL_DURATION = 800; // ms, for completion sparkle effect

// Tailwind Class Constants for consistent styling
const primaryButtonClasses = "bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-3 px-5 sm:px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:scale-105 flex items-center space-x-2 text-base sm:text-lg focus:outline-none focus:ring-4 focus:ring-sky-700/70";
const secondaryButtonClasses = "bg-slate-700/80 hover:bg-slate-600/90 text-slate-200 font-medium py-2.5 px-4 sm:px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105 flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800";
const modalInputClasses = "w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-400 text-sm sm:text-base";
const iconButtonClasses = "p-2 rounded-full transition-colors duration-150 z-10 relative";

/**
 * Helper function to get a date string in 'YYYY-MM-DDTHH:mm' format suitable for datetime-local input.
 * @param {string} [isoDateString] - Optional ISO date string (UTC).
 * @returns {string} Formatted local date-time string.
 */
const getLocalDateTimeStringForInput = (isoDateString) => {
  const dateToFormat = isoDateString ? new Date(isoDateString) : new Date();
  const tempDate = new Date(dateToFormat.getTime() - (dateToFormat.getTimezoneOffset() * 60000));
  return tempDate.toISOString().slice(0, 16);
};

/**
 * Main application component for Supercharged Tasks.
 */
const App = () => {
  const [tasks, setTasks] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [, setForceUpdate] = useState(0); 
  const [feedbackMessage, setFeedbackMessage] = useState({ text: '', type: '' });
  
  const [justCompletedTaskId, setJustCompletedTaskId] = useState(null);
  const [taskAnimatingOutId, setTaskAnimatingOutId] = useState(null);
  const [taskAnimatingInId, setTaskAnimatingInId] = useState(null);
  const fileInputRef = useRef(null); // Ref for the hidden file input, now managed by App

  useEffect(() => {
    const interval = setInterval(() => setForceUpdate(prev => prev + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (justCompletedTaskId) {
      const timer = setTimeout(() => setJustCompletedTaskId(null), SPARKLE_ANIMATION_TOTAL_DURATION);
      return () => clearTimeout(timer);
    }
  }, [justCompletedTaskId]);

  useEffect(() => {
    if (taskAnimatingInId) {
      const timer = setTimeout(() => setTaskAnimatingInId(null), ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [taskAnimatingInId]);
  
  useEffect(() => { 
    if (feedbackMessage.text) {
      const timer = setTimeout(() => setFeedbackMessage({ text: '', type: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('superchargedTasks_v12');
      if (storedTasks) setTasks(JSON.parse(storedTasks));
    } catch (error) { console.error("LS Load Error:", error); localStorage.removeItem('superchargedTasks_v12');}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('superchargedTasks_v12', JSON.stringify(tasks)); }
    catch (error) { console.error("LS Save Error:", error); }
  }, [tasks]);

  const calculateValue = useCallback((task) => task.importance * task.urgency, []);
  const calculateEfficiency = useCallback((task) => {
    const value = calculateValue(task);
    if (!task.estimatedTime || task.estimatedTime <= 0) return 0;
    return value / task.estimatedTime;
  }, [calculateValue]);

  const baseMappedTasks = useMemo(() => {
    return tasks.map(task => ({
        ...task,
        value: calculateValue(task),
        efficiency: calculateEfficiency(task),
      }));
  }, [tasks, calculateValue, calculateEfficiency]);

  const pendingTasks = useMemo(() => {
    return baseMappedTasks.filter(task => !task.isCompleted)
      .sort((a, b) => {
        if (b.efficiency !== a.efficiency) return b.efficiency - a.efficiency;
        if (b.value !== a.value) return b.value - a.value;
        if (a.scheduledAt && b.scheduledAt) { const diff = new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(); if (diff !== 0) return diff; }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [baseMappedTasks]);

  const completedTasks = useMemo(() => {
    return baseMappedTasks.filter(task => task.isCompleted)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }, [baseMappedTasks]);

  const addTask = (taskData) => { 
    const newTask = { id: generateId(), ...taskData, createdAt: new Date().toISOString(), isCompleted: false, completedAt: null };
    setTasks(prevTasks => [...prevTasks, newTask]);
    setTaskAnimatingInId(newTask.id);
  };
  const openEditModal = (task) => { setEditingTask(task); setIsEditModalOpen(true); };
  const updateTask = (updatedData) => {
    setTasks(prevTasks => prevTasks.map(task => task.id === editingTask.id ? { ...task, ...updatedData, updatedAt: new Date().toISOString() } : task));
    setEditingTask(null); setIsEditModalOpen(false);
  };
  const toggleCompleteTask = (taskId) => { 
    const taskToToggle = tasks.find(t => t.id === taskId); if (!taskToToggle) return;
    const isNowCompleting = !taskToToggle.isCompleted; setTaskAnimatingOutId(taskId); 
    setTimeout(() => {
      setTasks(prevTasks => prevTasks.map(task => {
        if (task.id === taskId) {
          const completedTimestamp = new Date();
          if (isNowCompleting) {
            const originalValue = calculateValue(task); let bonusPoints = 0;
            if (task.estimatedTime > 0 && task.scheduledAt) {
              const scheduledTime = new Date(task.scheduledAt).getTime(); const completionTime = completedTimestamp.getTime();
              const timeDifferenceMs = completionTime - scheduledTime; const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);
              if (timeDifferenceHours >= 0 && timeDifferenceHours <= task.estimatedTime * 2) bonusPoints = Math.round(originalValue * 0.20);
            }
            const achievedValue = originalValue + bonusPoints;
            return { ...task, isCompleted: true, completedAt: completedTimestamp.toISOString(), originalValue, bonusPoints, achievedValue };
          } else { const { originalValue, bonusPoints, achievedValue, completedAt, ...rest } = task; return { ...rest, isCompleted: false, completedAt: null }; }
        } return task;
      }));
      setTaskAnimatingInId(taskId); if (isNowCompleting) setJustCompletedTaskId(taskId); setTaskAnimatingOutId(null); 
    }, ANIMATION_DURATION);
  };
  const deleteTask = (taskId) => {
    setTaskAnimatingOutId(taskId); setTimeout(() => { setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId)); setTaskAnimatingOutId(null); }, ANIMATION_DURATION);
  };
  const clearCompletedTasks = () => setTasks(prevTasks => prevTasks.filter(task => !task.isCompleted));

  const totalPendingValue = useMemo(() => pendingTasks.reduce((sum, task) => sum + task.value, 0), [pendingTasks]);
  const valueCompletedToday = useMemo(() => {
    const today = new Date().toDateString();
    return completedTasks.filter(task => task.completedAt && new Date(task.completedAt).toDateString() === today)
      .reduce((sum, task) => sum + (task.achievedValue !== undefined ? task.achievedValue : calculateValue(task)), 0);
  }, [completedTasks, calculateValue]);

  const handleExportCSV = () => {
    if (tasks.length === 0) {
      setFeedbackMessage({ text: "No tasks to export.", type: "error" }); return;
    }
    const headers = ["id", "text", "importance", "urgency", "estimatedTime", "scheduledAt", "createdAt", "isCompleted", "completedAt", "originalValue", "bonusPoints", "achievedValue", "updatedAt"];
    const csvRows = [headers.join(",")];
    tasks.forEach(task => {
      const row = headers.map(header => {
        let value = task[header];
        if (typeof value === 'boolean') value = value ? 'TRUE' : 'FALSE';
        if (value === null || value === undefined) value = '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(row.join(","));
    });
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url); link.setAttribute("download", "supercharged_tasks_export.csv");
      link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
      setFeedbackMessage({ text: "Tasks exported successfully!", type: "success" });
    } else {
      setFeedbackMessage({ text: "CSV export not supported by your browser.", type: "error" });
    }
  };

  const handleImportCSVChange = (event) => { // Renamed from handleImportCSV to avoid conflict if used elsewhere
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvString = e.target.result; const rows = csvString.split(/\r\n|\n/);
        if (rows.length < 2) throw new Error("CSV file is empty or has no data rows.");
        const headerRow = rows[0].split(","); const importedTasks = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]; if (!row.trim()) continue;
          const values = row.split(","); 
          if (values.length !== headerRow.length) { console.warn(`Skipping row ${i+1}: Mismatched column count.`); continue; }
          const taskData = {};
          headerRow.forEach((header, index) => {
            let value = values[index];
            if (value && value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1).replace(/""/g, '"');
            taskData[header.trim()] = value;
          });
          const validatedTask = {
            id: generateId(), text: taskData.text || "Untitled Task",
            importance: parseInt(taskData.importance) || 3, urgency: parseInt(taskData.urgency) || 3,
            estimatedTime: parseFloat(taskData.estimatedTime) || 1,
            scheduledAt: taskData.scheduledAt && !isNaN(new Date(taskData.scheduledAt)) ? new Date(taskData.scheduledAt).toISOString() : new Date().toISOString(),
            createdAt: taskData.createdAt && !isNaN(new Date(taskData.createdAt)) ? new Date(taskData.createdAt).toISOString() : new Date().toISOString(),
            isCompleted: taskData.isCompleted === 'TRUE' || taskData.isCompleted === 'true',
            completedAt: taskData.completedAt && !isNaN(new Date(taskData.completedAt)) ? new Date(taskData.completedAt).toISOString() : null,
            originalValue: taskData.originalValue ? parseInt(taskData.originalValue) : null,
            bonusPoints: taskData.bonusPoints ? parseInt(taskData.bonusPoints) : null,
            achievedValue: taskData.achievedValue ? parseInt(taskData.achievedValue) : null,
            updatedAt: taskData.updatedAt && !isNaN(new Date(taskData.updatedAt)) ? new Date(taskData.updatedAt).toISOString() : null,
          };
          importedTasks.push(validatedTask);
        }
        setTasks(importedTasks);
        setFeedbackMessage({ text: `${importedTasks.length} tasks imported successfully!`, type: "success" });
      } catch (error) {
        console.error("CSV Import Error:", error);
        setFeedbackMessage({ text: `Error importing CSV: ${error.message}`, type: "error" });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => { setFeedbackMessage({ text: "Error reading file.", type: "error" }); if (fileInputRef.current) fileInputRef.current.value = ""; };
    reader.readAsText(file);
  };

  const triggerImportClick = () => {
    fileInputRef.current && fileInputRef.current.click();
  };


  const RatingSelector = ({ label, value, onChange, levels, icon }) => { 
    const IconComponent = icon; return ( <div> <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center"> {IconComponent && <IconComponent size={16} className="mr-2 text-slate-400" />} {label} </label> <div className="flex space-x-1.5 sm:space-x-2"> {[1, 2, 3, 4, 5].map(level => ( <button key={level} type="button" title={levels[level]} onClick={() => onChange(level)} className={`flex-1 py-2.5 px-1 text-xs sm:text-sm rounded-md transition-all duration-150 ease-in-out border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${value === level ? 'bg-sky-500 text-white border-sky-400 shadow-md focus:ring-sky-500' : 'bg-slate-700 hover:bg-slate-600/70 text-slate-300 border-slate-600 hover:border-slate-500 focus:ring-sky-600'}`} >{level}</button> ))} </div> </div> );
  };
  const TaskForm = ({ onSave, onClose, existingTask }) => { 
    const [text, setText] = useState(''); const [importance, setImportance] = useState(3); const [urgency, setUrgency] = useState(3); const [estimatedTime, setEstimatedTime] = useState(1); const [scheduledAtForm, setScheduledAtForm] = useState(getLocalDateTimeStringForInput()); const [error, setError] = useState('');
    useEffect(() => { if (existingTask) { setText(existingTask.text); setImportance(existingTask.importance); setUrgency(existingTask.urgency); setEstimatedTime(existingTask.estimatedTime); setScheduledAtForm(existingTask.scheduledAt ? getLocalDateTimeStringForInput(existingTask.scheduledAt) : getLocalDateTimeStringForInput()); } else { setText(''); setImportance(3); setUrgency(3); setEstimatedTime(1); setScheduledAtForm(getLocalDateTimeStringForInput()); } }, [existingTask]);
    const handleSubmit = (e) => { e.preventDefault(); if (!text.trim()) { setError('Task description cannot be empty.'); return; } if (estimatedTime <= 0) { setError('Estimated time must be greater than 0 hours.'); return; } if (!scheduledAtForm) { setError('Scheduled date and time cannot be empty.'); return; } setError(''); onSave({ text, importance: parseInt(importance), urgency: parseInt(urgency), estimatedTime: parseFloat(estimatedTime), scheduledAt: new Date(scheduledAtForm).toISOString() }); if (!existingTask) { setText(''); setImportance(3); setUrgency(3); setEstimatedTime(1); setScheduledAtForm(getLocalDateTimeStringForInput()); } onClose(); };
    const formTitle = existingTask ? "Edit Task" : "Add New Task"; const buttonText = existingTask ? "Save Changes" : "Add Task";
    return ( <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-opacity duration-300"> <div className="bg-slate-800 p-5 sm:p-6 rounded-xl shadow-2xl w-full max-w-md sm:max-w-lg border border-slate-700/80"> <div className="flex justify-between items-center mb-6"> <h2 className="text-xl sm:text-2xl font-semibold text-sky-400">{formTitle}</h2> <button onClick={onClose} className="text-slate-400 hover:text-sky-300 transition-colors"><XCircle size={24} sm:size={28} /></button> </div> {error && <p className="text-red-400 bg-red-900/40 p-3 rounded-md mb-4 text-xs sm:text-sm border border-red-700/60 flex items-center"><AlertCircle size={16} className="mr-2 shrink-0"/>{error}</p>} <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5"> <div> <label htmlFor="taskText" className="block text-sm font-medium text-slate-300 mb-1.5">Task Description</label> <input id="taskText" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g., Finalize Q3 report" className={modalInputClasses}/> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5"> <RatingSelector label="Importance" value={importance} onChange={setImportance} levels={IMPORTANCE_LEVELS} icon={TrendingUp} /> <RatingSelector label="Urgency" value={urgency} onChange={setUrgency} levels={URGENCY_LEVELS} icon={CalendarClock} /> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5"> <div> <label htmlFor="estimatedTime" className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center"> <Clock size={16} className="mr-2 text-slate-400 shrink-0"/>Est. Time (hrs) </label> <input id="estimatedTime" type="number" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} min="0.1" step="0.1" placeholder="e.g., 0.5" className={modalInputClasses}/> </div> <div> <label htmlFor="scheduledAtForm" className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center"> <CalendarPlus size={16} className="mr-2 text-slate-400 shrink-0"/>Scheduled For </label> <input id="scheduledAtForm" type="datetime-local" value={scheduledAtForm} onChange={(e) => setScheduledAtForm(e.target.value)} className={`${modalInputClasses} appearance-none`} /> </div> </div> <button type="submit" className={`${primaryButtonClasses} w-full mt-2 !text-base`}> {existingTask ? <Pencil size={18} /> : <Plus size={20} />} <span>{buttonText}</span> </button> </form> </div> </div> );
  };
  const TaskItem = ({ task, onToggleComplete, onDelete, onOpenEditModal, isJustCompleted, isAnimatingOut, isAnimatingIn }) => { 
    const { id, text, importance, urgency, estimatedTime, scheduledAt, isCompleted, value, efficiency, createdAt, completedAt, originalValue, bonusPoints, achievedValue } = task; const [animationClass, setAnimationClass] = useState('task-item-initial');
    useEffect(() => { if (isAnimatingIn) { setAnimationClass('task-item-entering'); const timer = setTimeout(() => setAnimationClass('task-item-entered'), 20); return () => clearTimeout(timer); } else if (isAnimatingOut) { setAnimationClass('task-item-exiting'); } else { setAnimationClass(isCompleted ? 'task-item-completed-settled' : 'task-item-entered'); } }, [isAnimatingIn, isAnimatingOut, isCompleted]);
    const getImportanceBadge = (level) => { const styles = { 1: { label: "V.Low", bgColor: "bg-slate-600/80", textColor: "text-slate-200" }, 2: { label: "Low", bgColor: "bg-blue-700/80", textColor: "text-blue-100" }, 3: { label: "Medium", bgColor: "bg-sky-700/80", textColor: "text-sky-100" }, 4: { label: "High", bgColor: "bg-amber-600/80", textColor: "text-amber-100" }, 5: { label: "V.High", bgColor: "bg-red-600/80", textColor: "text-red-100" }, }; const style = styles[level] || styles[3]; return <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${style.bgColor} ${style.textColor}`}>{style.label}</span>; };
    const getUrgencyBadge = (level) => { const styles = { 1: { label: "Later", bgColor: "bg-slate-600/80", textColor: "text-slate-200" }, 2: { label: "Soon", bgColor: "bg-indigo-700/80", textColor: "text-indigo-100" }, 3: { label: "Normal", bgColor: "bg-blue-700/80", textColor: "text-blue-100" }, 4: { label: "Quickly",bgColor: "bg-orange-600/80", textColor: "text-orange-100" }, 5: { label: "ASAP", bgColor: "bg-pink-600/80", textColor: "text-pink-100" }, }; const style = styles[level] || styles[3]; return <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${style.bgColor} ${style.textColor}`}>{style.label}</span>; };
    let bonusTimeRemainingPercent = 0; let bonusPossible = false; let progressColorClass = 'bg-green-500'; let timeToBonusStartMs = 0;
    if (task.scheduledAt && task.estimatedTime > 0 && !isCompleted) { const scheduledAtTimeMs = new Date(task.scheduledAt).getTime(); const bonusWindowDurationMs = task.estimatedTime * 2 * 60 * 60 * 1000; const bonusDeadlineMs = scheduledAtTimeMs + bonusWindowDurationMs; const currentTimeMs = Date.now(); bonusPossible = currentTimeMs < bonusDeadlineMs; if (bonusPossible) { if (currentTimeMs < scheduledAtTimeMs) { bonusTimeRemainingPercent = 100; progressColorClass = 'bg-green-500'; timeToBonusStartMs = scheduledAtTimeMs - currentTimeMs; } else { const timeRemainingInBonusWindowMs = Math.max(0, bonusDeadlineMs - currentTimeMs); bonusTimeRemainingPercent = (timeRemainingInBonusWindowMs / bonusWindowDurationMs) * 100; if (bonusTimeRemainingPercent < 20) progressColorClass = 'bg-red-500'; else if (bonusTimeRemainingPercent < 50) progressColorClass = 'bg-yellow-500'; else progressColorClass = 'bg-green-500'; } } }
    const sparkleEffectClass = isJustCompleted && isCompleted && animationClass.includes('entered') ? 'animate-sparkle-burst' : ''; const checkmarkEffectClass = isJustCompleted && isCompleted && animationClass.includes('entered') ? 'animate-checkmark-pop' : '';
    const formattedScheduledDate = scheduledAt ? new Date(scheduledAt).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Not scheduled';
    return ( <li className={`relative bg-slate-800/80 backdrop-blur-sm p-4 sm:p-5 rounded-xl shadow-xl border border-slate-700/60 task-item-base ${animationClass} ${sparkleEffectClass} ${isCompleted && !animationClass.includes('exiting') ? 'task-item-completed-settled-opacity' : ''} ${!isCompleted && !animationClass.includes('exiting') ? 'hover:shadow-sky-600/20 hover:border-sky-600/70' : ''} `}> <div className="flex items-start justify-between"> <div className="flex-1 pr-3 space-y-2 sm:space-y-2.5"> <p className={`text-base sm:text-lg font-semibold ${isCompleted ? 'line-through text-slate-500' : 'text-slate-100'}`}>{text}</p> {!isCompleted && ( <> <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-2 items-center text-[11px] sm:text-xs text-slate-400"> <span className="flex items-center" title={`Value: ${value}`}><Star size={13} sm:size={14} className="mr-1 sm:mr-1.5 text-sky-400 shrink-0" /><span className="font-medium text-sky-300">{value} pts</span></span> <span className="text-slate-600 hidden sm:inline">|</span> <span className="flex items-center" title={`Efficiency: ${efficiency?.toFixed(2)} pts/hr`}><Zap size={13} sm:size={14} className="mr-1 sm:mr-1.5 text-amber-400 shrink-0" /><span className="font-medium text-amber-300">{efficiency?.toFixed(2)} pts/hr</span></span> </div> <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center"> <span title={`Importance: ${IMPORTANCE_LEVELS[importance]}`}>{getImportanceBadge(importance)}</span> <span title={`Urgency: ${URGENCY_LEVELS[urgency]}`}>{getUrgencyBadge(urgency)}</span> </div> <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 items-center text-[11px] sm:text-xs text-slate-400 pt-0.5 sm:pt-1"> <span className="flex items-center" title={`Estimated Time: ${estimatedTime}h`}><Clock size={13} sm:size={14} className="mr-1 sm:mr-1.5 text-slate-500 shrink-0" /><span>{estimatedTime}h est.</span></span> <span className="flex items-center" title="Scheduled Date/Time"><CalendarClock size={13} sm:size={14} className="mr-1 sm:mr-1.5 text-slate-500 shrink-0" /><span>{formattedScheduledDate}</span></span> </div> {bonusPossible && scheduledAt && ( <div className="mt-1.5 sm:mt-2"> <div className="text-[10px] sm:text-xs text-sky-300/80 mb-0.5 sm:mb-1 flex justify-between items-center"> <span>Bonus Timer:</span> {timeToBonusStartMs > 0 ? ( <span className="text-green-400/90">Starts in {(timeToBonusStartMs / (1000 * 60 * 60)).toFixed(1)}h</span> ) : ( <span className={`${bonusTimeRemainingPercent < 20 ? 'text-red-400/90' : bonusTimeRemainingPercent < 50 ? 'text-yellow-400/90' : 'text-green-400/90'}`}> {((new Date(task.scheduledAt).getTime() + (task.estimatedTime * 2 * 60 * 60 * 1000) - Date.now()) / (1000 * 60 * 60)).toFixed(1)}h left </span> )} </div> <div className="w-full bg-slate-700/70 rounded-full h-1 sm:h-1.5 overflow-hidden"><div className={`h-full rounded-full ${progressColorClass} transition-all duration-500 ease-linear`} style={{ width: `${bonusTimeRemainingPercent}%` }}></div></div> </div> )} </> )} {isCompleted && completedAt && ( <div className="text-[11px] sm:text-xs text-slate-400/90 mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1"> <p>Completed: {new Date(completedAt).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p> <p className="flex items-center flex-wrap gap-x-1 sm:gap-x-1.5"> Value: <span className="font-semibold text-green-400">{originalValue}</span> {bonusPoints > 0 && (<span className="ml-1 flex items-center text-yellow-400"><Sparkles size={13} sm:size={14} className="mr-0.5 text-yellow-400/90 fill-yellow-500/70" /> +{bonusPoints} Bonus!</span>)} <span className="font-semibold text-green-300/90"> = {achievedValue} pts</span> </p> </div> )} </div> <div className="flex flex-col items-end space-y-1.5 sm:space-y-2 ml-2 shrink-0"> <button onClick={() => onToggleComplete(id)} title={isCompleted ? "Mark as Incomplete" : "Mark as Complete"} className={`${iconButtonClasses} ${isCompleted ? 'text-slate-500 hover:text-amber-400 hover:bg-amber-700/20' : 'text-slate-400 hover:text-green-400 hover:bg-green-700/20'}`}> <CheckCircle2 size={20} sm:size={22} className={`${isCompleted ? "text-green-500 fill-green-500/40" : "text-slate-500"} ${checkmarkEffectClass}`} /> </button> {!isCompleted && (<button onClick={() => onOpenEditModal(task)} title="Edit Task" className={`${iconButtonClasses} text-slate-400 hover:text-sky-400 hover:bg-sky-700/20`}><Pencil size={16} sm:size={18} /></button>)} {isCompleted && (<button onClick={() => onToggleComplete(id)} title="Mark as Incomplete" className={`${iconButtonClasses} text-slate-400 hover:text-amber-400 hover:bg-amber-700/20`}><RotateCcw size={16} sm:size={18} /></button>)} <button onClick={() => onDelete(id)} title="Delete Task" className={`${iconButtonClasses} text-slate-400 hover:text-red-400 hover:bg-red-700/20`}><Trash2 size={16} sm:size={18} /></button> </div> </div> <p className="text-[10px] sm:text-[11px] text-slate-500/80 mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-slate-700/50"> Created: {new Date(createdAt).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short' })} {task.updatedAt && <span className="italic"> | Updated: {new Date(task.updatedAt).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short' })}</span>} </p> </li> );
  };

  /**
   * Settings Modal Component
   */
  const SettingsModal = ({ isOpen, onClose, onTriggerImport, onExport, feedback }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-opacity duration-300">
        <div className="bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-md border border-slate-700/80">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-sky-400">App Settings</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-sky-300 transition-colors">
              <XCircle size={24} sm:size={28} />
            </button>
          </div>

          {feedback.text && (
            <div className={`mb-4 p-3 rounded-md text-sm font-medium
              ${feedback.type === 'success' ? 'bg-green-600/30 text-green-300 border border-green-500/50' : ''}
              ${feedback.type === 'error' ? 'bg-red-600/30 text-red-300 border border-red-500/50' : ''}
            `}>
              {feedback.text}
            </div>
          )}

          <div className="space-y-4">
            <button onClick={onTriggerImport} className={`${secondaryButtonClasses} w-full justify-center`}>
                <Upload size={16} sm:size={18} /> Import Tasks (CSV)
            </button>
            <button onClick={onExport} className={`${secondaryButtonClasses} w-full justify-center`}>
                <Download size={16} sm:size={18} /> Export Tasks (CSV)
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Note: Importing tasks will replace all current tasks in the application.
          </p>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-poppins flex flex-col items-center p-3 sm:p-4 md:p-6 selection:bg-sky-600 selection:text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Poppins', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(0.6) brightness(100%); }
        @keyframes sparkle-burst-anim { 0% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0); } 30% { box-shadow: 0 0 25px 12px rgba(0, 255, 255, 0.75), 0 0 40px 22px rgba(56, 189, 248, 0.55), 0 0 55px 32px rgba(14, 165, 233, 0.35); } 100% { box-shadow: 0 0 90px 65px rgba(56, 189, 248, 0); } }
        .animate-sparkle-burst { animation: sparkle-burst-anim ${SPARKLE_ANIMATION_TOTAL_DURATION}ms ease-out forwards; }
        @keyframes checkmark-fill-pop-anim { 0% { transform: scale(1); filter: brightness(1); } 30% { transform: scale(1.5); filter: brightness(1.75) drop-shadow(0 0 4px #ccfbf1); } 60% { transform: scale(0.9); filter: brightness(1.2); } 100% { transform: scale(1); filter: brightness(1); } }
        .animate-checkmark-pop { animation: checkmark-fill-pop-anim 0.6s ease-out forwards; }
        .task-item-base { transition: opacity ${ANIMATION_DURATION}ms ease-out, transform ${ANIMATION_DURATION}ms ease-out; }
        .task-item-initial { opacity: 1; transform: scale(1) translateX(0); }
        .task-item-entering { opacity: 0; transform: scale(0.95) translateX(30px); }
        .task-item-entered { opacity: 1; transform: scale(1) translateX(0); }
        .task-item-exiting { opacity: 0 !important; transform: scale(0.95) translateX(-30px) !important; }
        .task-item-completed-settled { opacity: 1; transform: scale(1) translateX(0); }
        .task-item-completed-settled-opacity { opacity: 0.65; }
      `}</style>

      {/* Hidden file input, managed by App component */}
      <input type="file" ref={fileInputRef} onChange={handleImportCSVChange} accept=".csv" className="hidden" />

      {(isAddModalOpen || isEditModalOpen) && ( <TaskForm onSave={isEditModalOpen ? updateTask : addTask} onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); setEditingTask(null); }} existingTask={editingTask} /> )}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)}
        onTriggerImport={triggerImportClick} // Pass the trigger function
        onExport={handleExportCSV}
        feedback={feedbackMessage}
        // fileInputRef is no longer passed here
      />
      
      <header className="w-full max-w-4xl mb-8 sm:mb-10 text-center relative">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-500 py-2 tracking-tight">
          Supercharged Tasks
        </h1>
        <p className="text-slate-400/90 mt-2 sm:mt-3 text-xs sm:text-sm md:text-base">Maximize your impact by focusing on what truly matters.</p>
        <button 
            onClick={() => setIsSettingsModalOpen(true)} 
            className="absolute top-0 right-0 mt-1 mr-1 sm:mt-2 sm:mr-2 p-2 text-slate-400 hover:text-sky-400 transition-colors"
            title="App Settings"
        >
            <Settings size={20} sm:size={24} />
        </button>
      </header>

      {feedbackMessage.text && !isSettingsModalOpen && (
        <div className={`w-full max-w-4xl mb-4 p-3 rounded-md text-sm font-medium
          ${feedbackMessage.type === 'success' ? 'bg-green-600/30 text-green-300 border border-green-500/50' : ''}
          ${feedbackMessage.type === 'error' ? 'bg-red-600/30 text-red-300 border border-red-500/50' : ''}
        `}>
          {feedbackMessage.text}
        </div>
      )}

      <section className="w-full max-w-4xl mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
        <div className="bg-slate-800/70 backdrop-blur-sm p-4 sm:p-5 rounded-xl shadow-lg border border-slate-700/60">
          <h3 className="text-xs sm:text-sm font-medium text-sky-400/90 mb-1 sm:mb-1.5 flex items-center"><Star size={16} sm:size={18} className="mr-1.5 sm:mr-2 text-sky-500/80 shrink-0" /> Total Value (Pending)</h3>
          <p className="text-2xl sm:text-3xl font-bold text-slate-100">{totalPendingValue} pts</p>
        </div>
        <div className="bg-slate-800/70 backdrop-blur-sm p-4 sm:p-5 rounded-xl shadow-lg border border-slate-700/60">
          <h3 className="text-xs sm:text-sm font-medium text-green-400/90 mb-1 sm:mb-1.5 flex items-center"><Award size={16} sm:size={18} className="mr-1.5 sm:mr-2 text-green-500/80 shrink-0" /> Value Achieved Today</h3>
          <p className="text-2xl sm:text-3xl font-bold text-slate-100">{valueCompletedToday} pts</p>
        </div>
      </section>

      <div className="w-full max-w-4xl">
        <div className="mb-6 sm:mb-8 flex justify-center">
          <button onClick={() => { setEditingTask(null); setIsAddModalOpen(true);}} className={primaryButtonClasses}>
            <Plus size={20} sm:size={22} /> <span>Add New Task</span>
          </button>
        </div>
                
        <section className="mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-200/90 mb-4 sm:mb-5 pb-2 sm:pb-2.5 border-b-2 border-sky-800/50">Prioritized Tasks ({pendingTasks.length})</h2>
          {pendingTasks.length > 0 ? ( <ul className="space-y-3 sm:space-y-4"> {pendingTasks.map(task => ( <TaskItem key={task.id} task={task} onToggleComplete={toggleCompleteTask} onDelete={deleteTask} onOpenEditModal={openEditModal} isJustCompleted={justCompletedTaskId === task.id} isAnimatingOut={taskAnimatingOutId === task.id} isAnimatingIn={taskAnimatingInId === task.id} /> ))} </ul> ) : ( <div className="text-center py-10 sm:py-12 bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50"> <MessageCircle size={48} sm:size={52} className="mx-auto text-slate-500/80 mb-3 sm:mb-4" /> <p className="text-slate-300/90 text-base sm:text-lg">No pending tasks!</p> <p className="text-slate-400/80 text-xs sm:text-sm mt-1">Add a new task to get started.</p> </div> )}
        </section>

        <section>
          <div className="flex justify-between items-center mb-4 sm:mb-5 pb-2 sm:pb-2.5 border-b-2 border-slate-700/50"> <h2 className="text-xl sm:text-2xl font-semibold text-slate-200/90">Completed Tasks ({completedTasks.length})</h2> <div className="flex items-center space-x-2 sm:space-x-3"> {completedTasks.length > 0 && (<button onClick={clearCompletedTasks} className="text-xs sm:text-sm text-red-400/90 hover:text-red-300 hover:bg-red-700/20 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-md transition-colors flex items-center space-x-1 sm:space-x-1.5" title="Clear all completed tasks"><Trash2 size={12} sm:size={14} /> <span>Clear All</span></button>)} <button onClick={() => setShowCompleted(!showCompleted)} className="text-xs sm:text-sm text-slate-400/90 hover:text-sky-300 transition-colors flex items-center" title={showCompleted ? "Hide completed tasks" : "Show completed tasks"}>{showCompleted ? <ChevronUp size={18} sm:size={20} /> : <ChevronDown size={18} sm:size={20} />}<span className="ml-1">{showCompleted ? "Hide" : "Show"}</span></button> </div> </div>
          {showCompleted && completedTasks.length > 0 && ( <ul className="space-y-3 sm:space-y-3.5"> {completedTasks.map(task => ( <TaskItem key={task.id} task={task} onToggleComplete={toggleCompleteTask} onDelete={deleteTask} onOpenEditModal={openEditModal} isJustCompleted={justCompletedTaskId === task.id} isAnimatingOut={taskAnimatingOutId === task.id} isAnimatingIn={taskAnimatingInId === task.id} /> ))} </ul> )}
          {showCompleted && completedTasks.length === 0 && ( <div className="text-center py-10 sm:py-12 bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50"><CheckCircle2 size={48} sm:size={52} className="mx-auto text-slate-500/80 mb-3 sm:mb-4" /><p className="text-slate-300/90 text-base sm:text-lg">No tasks completed yet.</p><p className="text-slate-400/80 text-xs sm:text-sm mt-1">Keep up the great work!</p></div> )}
        </section>
      </div>
      
      <footer className="w-full max-w-4xl mt-12 sm:mt-16 text-center text-xs sm:text-sm text-slate-500/90">
        <p>&copy; {new Date().getFullYear()} Supercharged Tasks. Focus on impact.</p>
      </footer>
    </div>
  );
};

export default App;

