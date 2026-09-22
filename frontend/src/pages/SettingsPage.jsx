import { useState } from "react";
import { api, ApiError } from "../api/client";
import { useAnnouncement } from "../accessibility/AnnouncementContext";
import { useAccessibility } from "../accessibility/AccessibilityContext";
import { useTTS } from "../hooks/useTTS";
import { useVoices } from "../hooks/useVoices";
import { usePageAnnouncement } from "../hooks/usePageAnnouncement";
import { useVoiceGuide } from "../hooks/useVoiceGuide";
import { useNavigation, NAV_MODES } from "../navigation/NavigationContext";
import { useVoiceNav } from "../navigation/VoiceNavProvider";
import { useVoiceNavActions } from "../navigation/useVoiceNavActions";

const FONT_SIZES = [
  { value: "small",   label: "Standard (100%)" },
  { value: "medium",  label: "Large (120%)"   },
  { value: "large",   label: "Extra Large (150%)" },
  { value: "x-large", label: "Max (175%)"     },
];

const RATES = [
  { value: 5,  label: "0.5x" },
  { value: 8,  label: "0.8x" },
  { value: 10, label: "1.0x" },
  { value: 13, label: "1.3x" },
  { value: 20, label: "2.0x" },
];

export default function SettingsPage() {
  usePageAnnouncement(
    "Accessibility Settings page. Configure text size, contrast, text-to-speech voice and speed, and voice input. Press Save when done."
  );

  useVoiceGuide({
    intro:
      "Accessibility Settings page. Here you can change how MathAble looks and sounds to suit your needs.",
    actions:
      "Section one is Visual and Display. Choose your preferred contrast theme and font size using Tab and the arrow keys or by clicking. " +
      "Section two is Text-to-Speech. Enable or disable spoken narration, choose your preferred speech speed and voice, then press the Test Speech button to hear a preview. " +
      "Section three is Navigation Mode. Choose Voice Navigation, Keyboard Navigation, or Voice and Keyboard combined. " +
      "When you have finished making changes, press the Save Accessibility Profile button or press Enter. " +
      "Your settings are saved to your account and will be restored every time you sign in. " +
      "To go back to the dashboard, say: Home.",
  });
  const { settings, updateSetting } = useAccessibility();
  const { announce }                = useAnnouncement();
  const { speak, supported: ttsSupported } = useTTS();
  const { voices }                  = useVoices();
  const { navMode, setNavMode }     = useNavigation();
  const { navListening, navSpeak }  = useVoiceNav();

  // Register settings voice commands
  useVoiceNavActions({
    setNavMode: (mode) => {
      setNavMode(mode);
      const labels = { voice: "Voice Navigation", keyboard: "Keyboard Navigation", combined: "Voice and Keyboard" };
      announce(`Navigation mode changed to ${labels[mode] || mode}.`);
    },
    setTTS: (enabled) => {
      updateSetting({ tts_enabled: enabled });
      announce(`Text to speech ${enabled ? "enabled" : "disabled"}.`);
    },
    setTTSRate: (rate) => {
      updateSetting({ tts_rate: rate });
      const label = { 5: "slow", 10: "normal", 16: "fast" }[rate] ?? `${rate / 10}x`;
      announce(`Speech rate set to ${label}.`);
    },
    saveSettings: () => save(),
  });
  const [saving, setSaving]         = useState(false);
  const [message, setMessage]       = useState("");
  const [msgType, setMsgType]       = useState("success");

  const save = async (e) => {
    if (e) e.preventDefault();
    setSaving(true); setMessage("");
    try {
      const data = await api.put("/accessibility/settings", settings);
      updateSetting(data);
      const rateStr = `${(data.tts_rate / 10).toFixed(1)}x`;
      const msg = `Accessibility settings saved. Text size: ${data.text_size}. Contrast: ${data.contrast}. Speech rate: ${rateStr}. Text-to-speech is ${data.tts_enabled ? "enabled" : "disabled"}.`;
      setMessage(msg);
      setMsgType("success");
      announce(msg);
      if (data.tts_enabled && ttsSupported) speak("Settings saved.");
    } catch (exc) {
      const detail = exc instanceof ApiError ? exc.detail : "Could not save settings.";
      setMessage(detail); setMsgType("error");
      announce(detail, true);
    } finally { setSaving(false); }
  };

  const rateLabel = (v) => `${(v / 10).toFixed(1)}x`;

  return (
    <div>
      <div className="context-banner" role="note">
        This Index is Settings active. Configure Screen Readers, Visual Feedback, Focus &amp; Keyboard Controls
      </div>

      <div className="page-grid page-grid-sidebar" style={{ marginTop: "1.5rem", gap: "2rem" }}>
        {/* ── Left: settings form ── */}
        <section aria-labelledby="settings-heading">
          <span className="section-label">Preferences Panel</span>
          <h1 id="settings-heading">Accessibility &amp; TTS Profiles</h1>

          <form onSubmit={save}>

            {/* 1. Visual */}
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h2 style={{ marginTop: 0, fontSize: "0.95rem" }}>1. Visual &amp; Display Configurations</h2>

              <div style={{ marginBottom: "1rem" }}>
                <span className="field-label">High Contrast Display Theme</span>
                <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
                  {[
                    { value: "high",   label: "AAA Darkest Dark [Alt+C]" },
                    { value: "normal", label: "Aero Light Mode" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={settings.contrast === value}
                      onClick={() => updateSetting({ contrast: value })}
                      className={`btn btn-sm${settings.contrast === value ? " btn-primary" : " btn-secondary"}`}
                    >
                      {settings.contrast === value && <span aria-hidden="true">● </span>}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="field-label">Global Base Font Size</span>
                <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
                  {FONT_SIZES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={settings.text_size === value}
                      onClick={() => updateSetting({ text_size: value })}
                      className={`btn btn-sm${settings.text_size === value ? " btn-primary" : " btn-secondary"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. TTS */}
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h2 style={{ marginTop: 0, fontSize: "0.95rem" }}>2. Acoustic Engine &amp; Speech (TTS)</h2>

              <div style={{ marginBottom: "1rem" }}>
                <span className="field-label">Speech Rate Multiplier</span>
                <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
                  {RATES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={settings.tts_rate === value}
                      onClick={() => updateSetting({ tts_rate: value })}
                      className={`btn btn-sm${settings.tts_rate === value ? " btn-primary" : " btn-secondary"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label htmlFor="tts-enabled-check" className="field-label">Text-to-Speech</label>
                <div className="radio">
                  <input
                    id="tts-enabled-check"
                    type="checkbox"
                    checked={settings.tts_enabled}
                    onChange={(e) => updateSetting({ tts_enabled: e.target.checked })}
                  />
                  <label htmlFor="tts-enabled-check" style={{ textTransform: "none", letterSpacing: 0 }}>
                    Enable TTS narration across the platform
                  </label>
                </div>
              </div>

              {voices.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="tts-voice" className="field-label">Acoustic Voice Profile</label>
                  <select
                    id="tts-voice"
                    value={settings.tts_voice || ""}
                    onChange={(e) => updateSetting({ tts_voice: e.target.value })}
                    className="w-full"
                    style={{ maxWidth: "32rem" }}
                  >
                    <option value="">Default system voice</option>
                    {voices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!ttsSupported && (
                <div className="alert alert-warning" role="status">
                  <span aria-hidden="true">⚠</span>
                  <span>Text-to-speech is not supported in this browser.</span>
                </div>
              )}
            </div>

            {/* 3. Keyboard */}
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h2 style={{ marginTop: 0, fontSize: "0.95rem" }}>3. Keyboard Focus &amp; Navigation Assist</h2>
              <div className="toggle-row">
                <span className="toggle-label">Always display keyboard shortcut tags on interactive controls</span>
                <div className="radio" style={{ margin: 0 }}>
                  <input
                    id="voice-input-enabled"
                    type="checkbox"
                    checked={settings.voice_input_enabled}
                    onChange={(e) => updateSetting({ voice_input_enabled: e.target.checked })}
                    style={{ accentColor: "var(--color-primary)", width: "2rem", height: "1.25rem" }}
                  />
                  <label htmlFor="voice-input-enabled" className="sr-only">Enable voice input</label>
                </div>
              </div>
            </div>

            {/* 4. Navigation Mode */}
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h2 style={{ marginTop: 0, fontSize: "0.95rem" }}>4. Navigation Mode</h2>
              <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                Choose how you prefer to navigate MathAble. Voice Navigation is the default.
              </p>
              <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                <legend className="sr-only">Navigation mode</legend>
                {[
                  { value: NAV_MODES.VOICE,    label: "Voice Navigation",    desc: "Navigate by speaking commands like 'Open Practice'." },
                  { value: NAV_MODES.KEYBOARD, label: "Keyboard Navigation", desc: "Use Tab, Enter, and arrow keys." },
                  { value: NAV_MODES.COMBINED, label: "Voice + Keyboard",    desc: "Use both freely at any time." },
                ].map(({ value, label, desc }) => (
                  <div key={value} className="radio" style={{ alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <input
                      id={`nav-mode-${value}`}
                      type="radio"
                      name="nav_mode"
                      value={value}
                      checked={navMode === value}
                      onChange={() => {
                        setNavMode(value);
                        announce(`Navigation mode changed to ${label}.`);
                      }}
                      style={{ marginTop: "0.15rem" }}
                    />
                    <label htmlFor={`nav-mode-${value}`} style={{ textTransform: "none", letterSpacing: 0 }}>
                      <strong>{label}</strong>
                      <span style={{ display: "block", fontSize: "0.82rem", color: "var(--color-text-muted)", fontWeight: 400 }}>
                        {desc}
                      </span>
                    </label>
                  </div>
                ))}
              </fieldset>

              {navMode !== NAV_MODES.KEYBOARD && (
                <div style={{ marginTop: "0.75rem" }}>
                  <button
                    type="button"
                    className="audio-btn"
                    onClick={() => navSpeak("Voice navigation is working. Try saying: Open Math Solver.")}
                    aria-label="Test voice navigation"
                  >
                    🎤 Test Voice Navigation
                  </button>
                  <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.35rem" }}>
                    Status: {navListening ? "Listening for commands" : "Voice navigation paused"}
                  </p>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={saving} aria-busy={saving}>
              {saving ? "Saving…" : "Save Accessibility Profile"}
            </button>
          </form>        </section>

        {/* ── Right: preview & test ── */}
        <aside>
          {message && (
            <div className={`alert alert-${msgType}`} role="status" aria-live="polite" style={{ marginBottom: "1.5rem" }}>
              <span className="alert-icon" aria-hidden="true">{msgType === "success" ? "✓" : "⚠"}</span>
              <div className="alert-content">
                {msgType === "success" && <p className="alert-title" style={{ marginBottom: "0.25rem" }}>Accessibility Profile Loaded Successfully</p>}
                <p style={{ margin: 0, fontSize: "0.85rem" }}>{message}</p>
              </div>
            </div>
          )}

          <div className="card">
            <span className="section-label">Test Acoustic Profile</span>
            <h2 style={{ marginTop: "0.25rem", fontSize: "1.1rem", fontFamily: "var(--font-mono)" }}>
              Sample: rac(x)(y)
            </h2>
            <button
              type="button"
              className="audio-btn"
              onClick={() => speak("The fraction x over y. x divided by y equals the result.")}
              disabled={!settings.tts_enabled || !ttsSupported}
              aria-label="Preview narration for sample fraction"
              style={{ marginBottom: "0.75rem" }}
            >
              🔊 Read Sample Narration [Alt+P]
            </button>
            <div className="step-audio-row">
              <span className="step-audio-icon" aria-hidden="true">🔊</span>
              <span style={{ fontStyle: "italic", fontSize: "0.82rem" }}>
                Narration Preview: "fraction x over y, x denominator y"
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
