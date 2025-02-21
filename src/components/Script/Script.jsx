import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/monokai.css";
import "codemirror/mode/javascript/javascript";
import ApiService from "../../services/ApiService";
import "./Script.css";
  

const translations = {
  tr: {
    run: "▶ Execute",
    placeholder: "// Write your HScript code here",
    executedCode: "Çalıştırılan kod:",
    result: "Sonuç:",
  },
  en: {
    run: "▶ Run",
    placeholder: "// Write your HScript code here",
    executedCode: "Executed code:",
    result: "Result:",
  },
};

const Script = ({ isDarkMode, language = "en" }) => {
  const [content, setContent] = useState(
    'sceKernelSendNotificationRequest("Hello World");'
  );
  const [output, setOutput] = useState("");
  const editorRef = useRef(null);
  const cmRef = useRef(null);
  const t = translations[language] || translations.en;

  useEffect(() => {
    if (!cmRef.current && editorRef.current) {
      const textarea = document.createElement("textarea");
      editorRef.current.appendChild(textarea);

      cmRef.current = CodeMirror.fromTextArea(textarea, {
        value: content,
        mode: "haxe",
        theme: isDarkMode ? "monokai" : "default",
        lineNumbers: true,
        matchBrackets: true,
        indentUnit: 4,
        indentWithTabs: true,
        placeholder: t.placeholder,
      });

      cmRef.current.on("change", (cm) => {
        setContent(cm.getValue());
      });

      cmRef.current.setValue(content);
    }

    return () => {
      if (cmRef.current) {
        cmRef.current.toTextArea();
        cmRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (cmRef.current) {
      cmRef.current.setOption("theme", isDarkMode ? "monokai" : "default");
    }
  }, [isDarkMode]);

  const handleRunScript = async () => {
    setOutput(""); // Clear output

    try {
      await ApiService.executeScriptStream(content, (chunk) => {
        setOutput((prev) => prev + chunk);
      });
    } catch (error) {
      setOutput("Error: " + error.message);
    }
  };

  return (
    <div className={`script-editor ${isDarkMode ? "dark" : ""}`}>
      <div className="script-content">
        <div className="editor-container" ref={editorRef}></div>
        <div className="script-output">
          <div className="output-toolbar">
            <button className="run-btn" onClick={handleRunScript}>
              {t.run}
            </button>
          </div>
          <div className="output-content">
            <pre>
              {typeof output === "string"
                ? output
                : JSON.stringify(output, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Script;