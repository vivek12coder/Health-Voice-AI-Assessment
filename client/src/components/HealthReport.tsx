import type { HealthReport as HealthReportType } from "../types";
import "./HealthReport.css";

interface HealthReportProps {
  report: HealthReportType;
  onNewCall: () => void;
}

export function HealthReport({ report, onNewCall }: HealthReportProps) {
  const isComplete = report.status === "complete";

  return (
    <div className="report-screen">
      <div className="report-container">
        <div className="report-header">
          <div className="report-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <h1>Health Screening Report</h1>
          <div className={`report-badge ${isComplete ? "badge-complete" : "badge-incomplete"}`}>
            {isComplete ? "✓ Complete" : "⚠ Incomplete"}
          </div>
        </div>

        <div className="report-grid">
          <div className="report-card">
            <div className="card-icon">👤</div>
            <div className="card-label">Patient Name</div>
            <div className="card-value">{report.patientName}</div>
          </div>

          <div className="report-card">
            <div className="card-icon">🩺</div>
            <div className="card-label">Main Concern</div>
            <div className="card-value">{report.mainConcern}</div>
          </div>

          <div className="report-card">
            <div className="card-icon">⏱️</div>
            <div className="card-label">Duration</div>
            <div className="card-value">{report.duration}</div>
          </div>

          <div className="report-card">
            <div className="card-icon">📊</div>
            <div className="card-label">Severity</div>
            <div className="card-value severity-value">
              {report.severity}
              {report.severity !== "Not provided" && renderSeverityBar(report.severity)}
            </div>
          </div>
        </div>

        {report.symptoms.length > 0 && (
          <div className="report-section">
            <h3>Symptoms</h3>
            <div className="symptom-tags">
              {report.symptoms.map((symptom, index) => (
                <span key={index} className="symptom-tag">
                  {symptom}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="report-section">
          <h3>Follow-up Recommendation</h3>
          <div className="followup-card">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <p>{report.followUp}</p>
          </div>
        </div>

        {report.conversationSummary && (
          <div className="report-section">
            <h3>Conversation Summary</h3>
            <p className="summary-text">{report.conversationSummary}</p>
          </div>
        )}

        <div className="report-actions">
          <button className="btn-new-call" onClick={onNewCall}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2z"/>
            </svg>
            Start New Call
          </button>
        </div>

        <div className="report-disclaimer">
          <p>
            ⚕️ This is a preliminary health screening and does not constitute a medical diagnosis.
            Please consult a healthcare professional for proper medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}

function renderSeverityBar(severity: string): React.ReactNode {
  // Try to parse numeric severity
  const match = severity.match(/(\d+)/);
  if (!match) return null;
  const level = Math.min(10, Math.max(1, parseInt(match[1])));
  const percentage = level * 10;

  let barColor = "#4ade80"; // green
  if (level >= 7) barColor = "#ef4444"; // red
  else if (level >= 4) barColor = "#fbbf24"; // amber

  return (
    <div className="severity-bar-container">
      <div className="severity-bar">
        <div
          className="severity-bar-fill"
          style={{ width: `${percentage}%`, background: barColor }}
        />
      </div>
      <span className="severity-label">{level}/10</span>
    </div>
  );
}
