import { useEffect, useRef } from "react";
import AI from "../../old_unused/agent/AI";
import Database from "../../old_unused/agent/Database";

export default function useAgent(options) {
  const ref = useRef({
    ai: null,
    db: null,
  });

  useEffect(() => {
    if (!options.apiKey) return;
    // gemini-2.0-flash-exp
    const ai = new AI(options);
    const db = new Database(options);

    var agent = {
      ai: ai,
      db: db,
    };
    ref.current = agent;
    options.editorComponent.setAgent(agent);

    window.ai = ai;
    window.db = db;
  }, [options.apiKey, options.projectName]);

  return {
    get ai() {
      return ref.current.ai;
    },
    get db() {
      return ref.current.db;
    },
  };
}
