import { useState } from 'react'
import type { DesignDecision } from '../types'

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  superseded: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  deprecated: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}

function DecisionCard({
  decision,
  isExpanded,
  onToggle,
}: {
  decision: DesignDecision
  isExpanded: boolean
  onToggle: () => void
}) {
  const sc = statusColors[decision.status] || statusColors.active

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50/50 transition-colors"
      >
        <span className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${sc.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-800">{decision.title}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${sc.bg} ${sc.text}`}>
              {decision.status}
            </span>
            <span className="text-[11px] text-slate-400">{decision.date}</span>
          </div>
        </div>
        <span className="mt-1 text-slate-400 text-xs flex-shrink-0">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Context</div>
            <div className="text-xs text-slate-600 leading-relaxed">{decision.context}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Options Considered</div>
            <div className="flex flex-wrap gap-1.5">
              {decision.options.map((opt) => (
                <span
                  key={opt}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    opt === decision.chosen
                      ? 'border-orange-300 bg-orange-50 text-orange-700 font-medium'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  {opt === decision.chosen && '✓ '}{opt}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Rationale</div>
            <div className="text-xs text-slate-600 leading-relaxed">{decision.rationale}</div>
          </div>
          {decision.supersededBy && (
            <div className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Superseded by: {decision.supersededBy}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function DecisionPanel({
  decisions,
  onClose,
}: {
  decisions: DesignDecision[]
  onClose: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const active = decisions.filter((d) => d.status === 'active')
  const inactive = decisions.filter((d) => d.status !== 'active')

  return (
    <div className="absolute top-0 right-0 h-full w-[360px] bg-white/95 backdrop-blur-[18px] border-l border-slate-200 shadow-[-4px_0_24px_rgba(0,0,0,0.06)] z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div>
          <div className="text-sm font-semibold text-slate-800">Design Decisions</div>
          <div className="text-[11px] text-slate-400">{decisions.length} recorded</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {decisions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-300 text-3xl mb-3">📋</div>
            <div className="text-sm text-slate-400">No decisions recorded</div>
            <div className="text-xs text-slate-300 mt-1">Use /archviber:decide in Claude Code</div>
          </div>
        )}

        {active.length > 0 && (
          <>
            {active.map((d) => (
              <DecisionCard
                key={d.id}
                decision={d}
                isExpanded={expandedId === d.id}
                onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
              />
            ))}
          </>
        )}

        {inactive.length > 0 && (
          <>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 px-1 pt-2">
              Superseded / Deprecated
            </div>
            {inactive.map((d) => (
              <DecisionCard
                key={d.id}
                decision={d}
                isExpanded={expandedId === d.id}
                onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
