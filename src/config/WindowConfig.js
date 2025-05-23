import Applications from "../components/Applications/Applications";
import FileManager from "../components/FileManager/FileManager";
import MediaGallery from "../components/MediaGallery/MediaGallery";
import MediaPlayer from "../components/MediaPlayer/MediaPlayer";
import ImageViewer from "../components/ImageViewer/ImageViewer";
import ProcessList from "../components/ProcessList/ProcessList";
import Profiles from "../components/Profiles/Profiles";
import Scheduler from "../components/Scheduler/Scheduler";
import Script from "../components/Script/Script";
import ScriptStore from "../components/ScriptStore/ScriptStore";
import ScriptDetail from "../components/ScriptDetail/ScriptDetail";
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
    scriptStore: {
      id: 'scriptStore',
      title: 'Script Store',
      icon: '📦',
      defaultWidth: 850,
      defaultHeight: 600,
      minWidth: 400,
      minHeight: 300,
      component: ScriptStore
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
    },
    mediaPlayer: {
      id: 'mediaPlayer',
      title: 'Media Player',
      icon: '🎬',
      defaultWidth: 800,
      defaultHeight: 500,
      minWidth: 400,
      minHeight: 300,
      visible: false,
      component: MediaPlayer
    },
    imageViewer: {
      id: 'imageViewer',
      title: 'Image Viewer',
      icon: '🖼️',
      defaultWidth: 800,
      defaultHeight: 600,
      minWidth: 400,
      minHeight: 300,
      visible: false,
      component: ImageViewer
    },
    scriptDetail: {
      id: 'scriptDetail',
      title: 'Script Detail',
      icon: '📝',
      defaultWidth: 700,
      defaultHeight: 500,
      minWidth: 400,
      minHeight: 350,
      visible: false,
      component: ScriptDetail
    }
  };

  static getConfig(windowId) {
    return this.windows[windowId];
  }

  static getDesktopItems() {
    return [
      ...Object.values(this.windows).filter(config => config.visible !== false).map((config, index) => ({
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