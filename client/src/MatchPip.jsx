// frontend/src/MatchPip.js  (make sure path same as your import)
import { createRoot } from "react-dom/client";

/**
 * Open Document Picture-in-Picture window (Chrome/Edge)
 * Returns: { pipWin, close() }
 */
export async function openMatchPiP(ReactComponent, props = {}, options = {}) {
  const dpp = window.documentPictureInPicture;
  if (!dpp) throw new Error("PiP not supported. Use Chrome/Edge.");

  const pipWin = await dpp.requestWindow({
    width: options.width ?? 420,
    height: options.height ?? 280,
  });

  // copy styles (best effort)
  [...document.styleSheets].forEach((sheet) => {
    try {
      const rules = sheet.cssRules;
      if (!rules) return;
      const style = pipWin.document.createElement("style");
      style.textContent = [...rules].map((r) => r.cssText).join("\n");
      pipWin.document.head.appendChild(style);
    } catch {
      // ignore cross origin
    }
  });

  const mount = pipWin.document.createElement("div");
  pipWin.document.body.style.margin = "0";
  pipWin.document.body.appendChild(mount);

  const root = createRoot(mount);
  root.render(<ReactComponent {...props} pipWindow={pipWin} />);

  return {
    pipWin,
    close: () => pipWin.close(),
  };
}
