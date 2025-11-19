import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/monokai.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/lua/lua";
import "codemirror/mode/haxe/haxe";
import ApiService from "../../services/ApiService";
import "./Script.css";

interface ScriptProps {
  isDarkMode: boolean;
  language?: string;
}

interface Translations {
  [key: string]: {
    run: string;
    placeholder: {
      rulescript: string;
      lua: string;
    };
    executedCode: string;
    result: string;
    switchToRuleScript: string;
    switchToLua: string;
    currentMode: string;
  };
}

const translations: Translations = {
  en: {
    run: "▶ Run",
    placeholder: {
      rulescript: "// Write your HScript code here",
      lua: "-- Write your Lua code here"
    },
    executedCode: "Executed code:",
    result: "Result:",
    switchToRuleScript: "Switch to RuleScript",
    switchToLua: "Switch to Lua",
    currentMode: "Current mode:"
  },
};

const Script = ({ isDarkMode, language = "en" }: ScriptProps) => {
  const [content, setContent] = useState(
    'sceKernelSendNotificationRequest("Hello World");'
  );
  const [output, setOutput] = useState("");
  const [scriptMode, setScriptMode] = useState("rulescript"); // Default to rulescript
  const editorRef = useRef<HTMLDivElement>(null);
  const cmRef = useRef<CodeMirror.EditorFromTextArea | null>(null);
  const t = translations[language] || translations.en;

  // Sample templates for each language
  const templates: Record<string, string> = {
    rulescript: 'sceKernelSendNotificationRequest("Hello World");',
    lua: 'function main()\n' +
        '\tsceKernelSendNotificationRequest("Hello World")\n' +
        'end'
  };

  const switchLanguage = (newMode: string) => {
    if (newMode === scriptMode) return;
    
    // Ask for confirmation if there's content
    if (content.trim() !== '' && content !== templates[scriptMode]) {
      if (!confirm("Switching language will reset your current code. Continue?")) {
        return;
      }
    }
    
    setScriptMode(newMode);
    
    // Set template for the selected language
    setContent(templates[newMode]);
    
    // Update CodeMirror mode
    if (cmRef.current) {

      if(newMode === "rulescript")
        cmRef.current.setOption("mode", "haxe");
      else
        cmRef.current.setOption("mode", newMode);

      cmRef.current.setValue(templates[newMode]);
      cmRef.current.setOption("placeholder", t.placeholder[newMode as keyof typeof t.placeholder]);
    }
  };

  useEffect(() => {
    if (!cmRef.current && editorRef.current) {
      const textarea = document.createElement("textarea");
      editorRef.current.appendChild(textarea);

      cmRef.current = CodeMirror.fromTextArea(textarea, {
        value: content,
        mode: scriptMode === "rulescript" ? "haxe" : scriptMode,
        theme: isDarkMode ? "monokai" : "default",
        lineNumbers: true,
        matchBrackets: true,
        indentUnit: 4,
        indentWithTabs: true,
        placeholder: t.placeholder[scriptMode as keyof typeof t.placeholder],
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
      }, scriptMode); // Pass the current script mode to the API
    } catch (error) {
      setOutput("Error: " + (error as Error).message);
    }
  };

  return (
    <div className={`script-editor ${isDarkMode ? "dark" : ""}`}>
      <div className="script-content">
        <div className="language-selector">
          <span>{t.currentMode} </span>
          <div className="language-buttons">
            <button 
              className={`language-btn ${scriptMode === 'rulescript' ? 'active' : ''}`}
              onClick={() => switchLanguage('rulescript')}
            >
              RuleScript
            </button>
            <button 
              className={`language-btn ${scriptMode === 'lua' ? 'active' : ''}`} 
              onClick={() => switchLanguage('lua')}
            >
              Lua
            </button>
          </div>
        </div>
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

