import { h } from "preact";
import "./Disclaimer.css";

const Disclaimer = ({ onAccept, isDarkMode }) => {
  return (
    <div className={`disclaimer-overlay ${isDarkMode ? 'dark' : ''}`}>
      <div className="disclaimer-modal">
        <h2>Disclaimer</h2>
        <div className="disclaimer-content">
        This software operates based on the data provided by users and the actions performed. Unexpected actions by users, improper use, or unforeseen circumstances may cause the console to behave unexpectedly or become bricked.
        <br/>
        <br/>
        The developer cannot be held responsible for any data loss, service interruptions, or other adverse outcomes that may occur during the use of the software.<br/> By using this software, you agree to this disclaimer of liability.
        We would like to explicitly state that this software does not support piracy and cannot be used for such purposes. The use of the software for illegal activities is strictly prohibited, and the developer accepts no responsibility for such misuse.
        <br/>
        <br/>
        In certain cases, improper use of this software may render your hardware inoperable ('bricked'). The developer is not liable for such outcomes.
        </div>
        <div className="disclaimer-actions">
          <button onClick={onAccept}>I Accept</button>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer; 