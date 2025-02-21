import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/monokai.css";
import "codemirror/mode/javascript/javascript";
import ApiService from "../../services/ApiService";
import "./Scheduler.css";

const FREQUENCY_OPTIONS = [
  { label: "1 Minute", value: 60 },
  { label: "5 Minutes", value: 300 },
  { label: "15 Minutes", value: 900 },
  { label: "30 Minutes", value: 1800 },
  { label: "1 Hour", value: 3600 },
  { label: "3 Hours", value: 10800 },
  { label: "6 Hours", value: 21600 },
  { label: "12 Hours", value: 43200 },
  { label: "1 Day", value: 86400 },
  { label: "1 Week", value: 604800 }
];

const Scheduler = ({ isDarkMode }) => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const editorRef = useRef(null);
  const cmRef = useRef(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [currentScript, setCurrentScript] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [runningTask, setRunningTask] = useState(null);

  const fetchTasks = async () => {
    try {
      const data = await ApiService.getTaskList();
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error("Tasks yüklenemedi:", err);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskDetail = async (id) => {
    try {
      if (selectedTask && currentScript !== selectedTask.script) {
        if (!window.confirm('You have unsaved changes. Do you want to discard them?')) {
          return;
        }
      }

      const data = await ApiService.getTaskDetail(id);
      setSelectedTask(data);
      setCurrentScript(data.script || '');
      setEditedName('');
      setIsEditingName(false);
      setShowLogs(false);
    } catch (err) {
      console.error("Task detayı alınamadı:", err);
    }
  };

  const handleEnabledChange = async (taskId, enabled) => {
    try {
      await ApiService.updateTask(taskId, { enabled });
      
      setSelectedTask(prev => ({
        ...prev,
        enabled,
        script: currentScript
      }));
      setTasks(tasks.map(task => 
        task.id === taskId ? {...task, enabled} : task
      ));
    } catch (err) {
      console.error("Task enable/disable edilemedi:", err);
      setSelectedTask(prev => ({ 
        ...prev, 
        enabled: !enabled,
        script: currentScript
      }));
    }
  };

  const handleFrequencyChange = async (taskId, newFrequency) => {
    try {
      const frequency = parseInt(newFrequency);
      await ApiService.updateTask(taskId, { frequency });
      
      setSelectedTask(prev => ({
        ...prev,
        frequency,
        script: currentScript
      }));
      setTasks(tasks.map(task => 
        task.id === taskId ? {...task, frequency} : task
      ));
    } catch (err) {
      console.error("Frequency güncellenemedi:", err);
    }
  };

  const handleLogsChange = async (taskId, logs) => {
    try {
      await ApiService.updateTask(taskId, { logs });
      
      setSelectedTask(prev => ({
        ...prev,
        logs,
        script: currentScript
      }));
      setTasks(tasks.map(task => 
        task.id === taskId ? {...task, logs} : task
      ));
    } catch (err) {
      console.error("Log ayarı güncellenemedi:", err);
      setSelectedTask(prev => ({ 
        ...prev, 
        logs: !logs,
        script: currentScript
      }));
    }
  };

  const getFrequencyLabel = (seconds) => {
    const option = FREQUENCY_OPTIONS.find(opt => opt.value === seconds);
    return option ? option.label : `${seconds} seconds`;
  };

  useEffect(() => {
    // Get task list and status for initial installation
    const init = async () => {
      await Promise.all([
        fetchTasks(),
        pollTaskStatus()
      ]);
    };
    
    init();

    // Check task status every 3 seconds
    const interval = setInterval(pollTaskStatus, 3000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedTask && editorRef.current) {
      if (cmRef.current) {
        cmRef.current.toTextArea();
      }

      cmRef.current = CodeMirror.fromTextArea(editorRef.current, {
        mode: "haxe",
        theme: isDarkMode ? "monokai" : "default",
        lineNumbers: true,
        matchBrackets: true,
        indentUnit: 4,
        indentWithTabs: true,
        readOnly: false,
        autofocus: true,
      });

      // Update currentScript first, then set the editor
      setCurrentScript(selectedTask.script || '');
      cmRef.current.setValue(selectedTask.script || '');

      const handleChange = (cm) => {
        const value = cm.getValue();
        setCurrentScript(value);
      };

      cmRef.current.on('change', handleChange);

      return () => {
        if (cmRef.current) {
          cmRef.current.off('change', handleChange);
          cmRef.current.toTextArea();
          cmRef.current = null;
        }
      };
    }
  }, [selectedTask, isDarkMode]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  };

  const handleTryScript = async () => {
    try {
      const script = currentScript; // Get from state instead of cmRef.current.getValue()
      setSelectedTask(prev => ({ ...prev, output: '' }));
      
      await ApiService.executeScriptStream(script, (chunk) => {
        setSelectedTask(prev => ({ 
          ...prev, 
          output: prev.output ? prev.output + chunk : chunk,
          script: currentScript // update script
        }));
      });
    } catch (err) {
      console.error("Script çalıştırılamadı:", err);
      setSelectedTask(prev => ({ 
        ...prev, 
        output: `Error: ${err.message}`,
        script: currentScript // update the script in case of error
      }));
    }
  };

  const handleSaveScript = async () => {
    try {
      await ApiService.updateTask(selectedTask.id, { script: currentScript });
      
      setSelectedTask(prev => ({
        ...prev, 
        script: currentScript,
        output: 'Task saved successfully!'
      }));
      setTasks(tasks.map(task => 
        task.id === selectedTask.id ? {...task, script: currentScript} : task
      ));
    } catch (err) {
      console.error("Script kaydedilemedi:", err);
      
      let errorMessage = err.message;
      if (errorMessage.includes('rulescript:')) {
        errorMessage = errorMessage.split('\n')[0]
          .replace('rulescript:', 'Line ')
          .replace('Unexpected token:', 'Syntax error:');
      }
      
      setSelectedTask(prev => ({ 
        ...prev, 
        output: `Error saving task: ${errorMessage}`
      }));
    }
  };

  const handleNameEdit = () => {
    setEditedName(selectedTask.name);
    setIsEditingName(true);
  };

  const handleNameSave = async () => {
    try {
      await ApiService.updateTask(selectedTask.id, { name: editedName });
      
      setSelectedTask(prev => ({
        ...prev,
        name: editedName,
        script: currentScript
      }));
      setTasks(tasks.map(task => 
        task.id === selectedTask.id ? {...task, name: editedName} : task
      ));
      setIsEditingName(false);
    } catch (err) {
      console.error("İsim güncellenemedi:", err);
    }
  };

  const handleCreateTask = async () => {
    try {
      const newTask = await ApiService.createTask("New Task");
      setTasks([...tasks, newTask]);
      // Use data directly from create instead of calling the Detail API
      setSelectedTask(newTask);
    } catch (err) {
      console.error("Task oluşturulamadı:", err);
    }
  };

  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const result = await ApiService.deleteTask(taskId);
      if (result.success) {
        setTasks(prev => prev.filter(task => task.id !== taskId));
        if (selectedTask?.id === taskId) {
          setSelectedTask(null);
          setCurrentScript('');
          if (cmRef.current) {
            cmRef.current.setValue('');
          }
        }
      }
    } catch (err) {
      console.error("Task silinemedi:", err);
      alert('Failed to delete task: ' + err.message);
    }
  };

  const handleViewLogs = async () => {
    if (!selectedTask) return;
    
    try {
      setShowLogs(true);
      setSelectedTask(prev => ({ 
        ...prev, 
        logContent: '',
        output: prev.output // Keep current output
      }));
      
      await ApiService.streamTaskLog(selectedTask.id, (chunk) => {
        setSelectedTask(prev => ({ 
          ...prev, 
          logContent: (prev.logContent || '') + chunk
        }));
      });
    } catch (err) {
      console.error("Loglar alınamadı:", err);
      setSelectedTask(prev => ({ 
        ...prev, 
        logContent: `Error loading logs: ${err.message}`
      }));
    }
  };

  const pollTaskStatus = async () => {
    try {
      const taskStatuses = await ApiService.getTaskStatus();
      
      // Find the running task (with status 1)
      const runningTask = taskStatuses.find(task => task.status === 1);
      setRunningTask(runningTask || null);
      
      // Update the last runtime of all tasks
      setTasks(prevTasks => prevTasks.map(task => {
        const statusInfo = taskStatuses.find(s => s.id === task.id);
        if (statusInfo) {
          return {
            ...task,
            lastRun: statusInfo.lastRun,
            status: statusInfo.status
          };
        }
        return task;
      }));
      
      // Update the information of the selected task
      if (selectedTask) {
        const selectedStatusInfo = taskStatuses.find(s => s.id === selectedTask.id);
        if (selectedStatusInfo) {
          setSelectedTask(prev => ({
            ...prev,
            lastRun: selectedStatusInfo.lastRun,
            status: selectedStatusInfo.status,
            script: currentScript // Important: protect the script
          }));
        }
      }
      
    } catch (err) {
      console.error("Task status alınamadı:", err);
      setRunningTask(null);
    }
  };

  return (
    <div className={`scheduler ${isDarkMode ? "dark" : ""}`}>
      <div className="task-list">
        <div className="task-list-header">
          <h2>Tasks</h2>
          <div className="task-list-actions">
            <button 
              className="create-task"
              onClick={handleCreateTask}
              title="Create New Task"
            >
              +
            </button>
            <button 
              onClick={fetchTasks} 
              className="refresh-button"
              title="Refresh Tasks"
            >
              🔄
            </button>
          </div>
        </div>
        {loading ? (
          <div className="loading">Loading tasks...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="task-items">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`task-item ${
                  selectedTask?.id === task.id ? "selected" : ""
                } ${runningTask?.id === task.id ? "running" : ""}`}
                onClick={() => fetchTaskDetail(task.id)}
              >
                <div className="task-item-header">
                  <span className="task-name">
                    {task.name}
                  </span>
                  <div className="task-item-actions">
                    <label className="task-enabled-toggle" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={task.enabled}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleEnabledChange(task.id, !task.enabled);
                        }}
                      />
                      <span className="checkmark"></span>
                    </label>
                    <button 
                      className="delete-task"
                      onClick={(e) => handleDeleteTask(task.id, e)}
                      title="Delete Task"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="task-item-footer">
                  <span className="task-last-run">
                    Last Run: {formatDate(task.lastRun)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="task-detail">
        {selectedTask ? (
          <>
            <div className="task-header">
              {isEditingName ? (
                <div className="name-edit">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameSave();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    autoFocus
                  />
                  <button className="name-save" onClick={handleNameSave}>✓</button>
                  <button className="name-cancel" onClick={() => setIsEditingName(false)}>✕</button>
                </div>
              ) : (
                <h2 onClick={handleNameEdit}>{selectedTask.name}</h2>
              )}
            </div>
            <div className="script-section">
              <div className="script-header">
                <h3>Script</h3>
                <div className="script-actions">
                  <button 
                    className="script-button try"
                    onClick={handleTryScript}
                  >
                    Try
                  </button>
                  <button 
                    className="script-button save"
                    onClick={handleSaveScript}
                  >
                    Save
                  </button>
                  <button 
                    className="script-button logs"
                    onClick={handleViewLogs}
                  >
                    Logs
                  </button>
                </div>
              </div>
              <div className="editor-container">
                <textarea ref={editorRef}></textarea>
              </div>
              {selectedTask.output && (
                <div className="script-output">
                  <div className="output-header">
                    <h3>Output</h3>
                    <button 
                      className="close-output"
                      onClick={() => setSelectedTask(prev => ({ ...prev, output: null }))}
                    >
                      ×
                    </button>
                  </div>
                  <pre className="output-content">{selectedTask.output}</pre>
                </div>
              )}
              {showLogs && selectedTask.logContent && (
                <div className="script-output logs">
                  <div className="output-header">
                    <h3>Logs</h3>
                    <button 
                      className="close-output"
                      onClick={() => {
                        setShowLogs(false);
                        setSelectedTask(prev => ({ ...prev, logContent: null }));
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <pre className="output-content">{selectedTask.logContent}</pre>
                </div>
              )}
            </div>
            <div className="detail-section">
              <div className="detail-row">
                <span>Status:</span>
                <span className={`status-${selectedTask.status}`}>
                  {selectedTask.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="detail-row">
                <span>Created:</span>
                <span>{formatDate(selectedTask.createdAt)}</span>
              </div>
              <div className="detail-row">
                <span>Last Run:</span>
                <span>{formatDate(selectedTask.lastRun)}</span>
              </div>
              <div className="detail-row">
                <span>Frequency:</span>
                <select 
                  className="frequency-select"
                  value={selectedTask.frequency}
                  onChange={(e) => handleFrequencyChange(selectedTask.id, e.target.value)}
                >
                  {FREQUENCY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="detail-row">
                <span>Success/Failed:</span>
                <span>
                  {selectedTask.success}/{selectedTask.failed}
                </span>
              </div>
              <div className="detail-row">
                <span>Save Logs:</span>
                <label className="task-logs-toggle">
                  <input
                    type="checkbox"
                    checked={selectedTask.logs}
                    onChange={() => handleLogsChange(selectedTask.id, !selectedTask.logs)}
                  />
                  <span className="checkmark"></span>
                </label>
              </div>
            </div>
          </>
        ) : (
          <div className="no-selection">Select a task to view details</div>
        )}
      </div>
    </div>
  );
};

export default Scheduler; 