import Applications from "../components/Applications/Applications";
import FileManager from "../components/FileManager/FileManager";
import MediaGallery from "../components/MediaGallery/MediaGallery";
import ProcessList from "../components/ProcessList/ProcessList";
import Profiles from "../components/Profiles/Profiles";
import Scheduler from "../components/Scheduler/Scheduler";
import Script from "../components/Script/Script";
import Statistics from "../components/Statistics/Statistics";
import SystemDetails from "../components/SystemDetails/SystemDetails";

class WindowConfig {
  static windows = {
    fileManager: {
      id: 'fileManager',
      title: 'File Manager',
      icon: '📁',
      defaultWidth: 800,
      defaultHeight: 600,
      minWidth: 400,
      minHeight: 300,
      component: FileManager
    },
    processList: {
      id: 'processList',
      title: 'Process List',
      icon: '📊',
      defaultWidth: 700,
      defaultHeight: 500,
      minWidth: 300,
      minHeight: 200,
      component: ProcessList
    },
    scriptEditor: {
      id: 'scriptEditor',
      title: 'Script Editor',
      icon: '📝',
      defaultWidth: 800,
      defaultHeight: 600,
      minWidth: 400,
      minHeight: 300,
      component: Script
    },
    systemInfo: {
      id: 'systemInfo',
      title: 'System Info',
      icon: '🖥️',
      defaultWidth: 600,
      defaultHeight: 400,
      minWidth: 300,
      minHeight: 200,
      component: SystemDetails
    },
    statistics: {
      id: 'statistics',
      title: 'Statistics',
      icon: '📈',
      defaultWidth: 800,
      defaultHeight: 600,
      minWidth: 400,
      minHeight: 300,
      component: Statistics
    },
    applications: {
      id: 'applications',
      title: 'Applications',
      icon: '🎮',
      defaultWidth: 800,
      defaultHeight: 600,
      minWidth: 400,
      minHeight: 300,
      component: Applications
    },
    profiles: {
      id: 'profiles',
      title: 'Profiles',
      icon: '👤',
      defaultWidth: 700,
      defaultHeight: 500,
      minWidth: 300,
      minHeight: 200,
      component: Profiles
    },
    scheduler: {
      id: 'scheduler',
      title: 'Scheduler',
      icon: '⏰',
      defaultWidth: 900,
      defaultHeight: 700,
      minWidth: 500,
      minHeight: 400,
      component: Scheduler
    },
    mediaGallery: {
      id: 'mediaGallery',
      title: 'Media Gallery',
      icon: '🖼️',
      defaultWidth: 900,
      defaultHeight: 700,
      minWidth: 400,
      minHeight: 300,
      component: MediaGallery
    }
  };

  static getConfig(windowId) {
    return this.windows[windowId];
  }

  static getDesktopItems() {
    return [
      ...Object.values(this.windows).map((config, index) => ({
        id: index + 1,
        name: config.title,
        type: config.id,
        app: config.id,
        icon: config.icon
      })),
      {
        id: Object.values(this.windows).length + 1,
        name: "GitHub",
        type: "link",
        app: "link",
        icon: "🐙",
        url: "https://github.com/barisyild/airpsx"
      }
    ];
  }

  static getComponent(windowId) {
    return this.windows[windowId]?.component;
  }
}

export default WindowConfig; 