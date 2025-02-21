import { h } from "preact";
import elfIcon from "../assets/elf-icon.svg";

const IconService = {
  getFileIcon: (type, name) => {
    if (type === "folder") return "📁";

    const extension = name.split(".").pop().toLowerCase();

    switch (extension) {
      // Documents
      case "pdf":
        return "📕";
      case "doc":
      case "docx":
        return "📘";
      case "txt":
        return "📄";

      // Tables and Presentations
      case "xls":
      case "xlsx":
        return "📊";
      case "ppt":
      case "pptx":
        return "📑";

      // Images
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "bmp":
        return "🖼️";

      // Media
      case "mp3":
      case "wav":
      case "ogg":
        return "🎵";
      case "mp4":
      case "avi":
      case "mkv":
        return "🎬";

      // Archives and Packages
      case "zip":
      case "rar":
      case "7z":
        return "📦";
      case "pkg":
        return "🍺";

      // Code
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return "⚡";
      case "html":
        return "🌐";
      case "css":
        return "🎨";
      case "json":
        return "📋";

      // Executables
      case "elf":
      case "self":
      case "sprx":
      case "prx":
        return (
          <img
            src={elfIcon}
            alt="ELF"
            style={{ width: "48px", height: "48px" }}
          />
        );

      default:
        return "📄";
    }
  },
};

export default IconService;