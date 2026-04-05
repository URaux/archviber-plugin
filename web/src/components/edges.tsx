import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'

type EdgeVariant = 'sync' | 'async' | 'bidirectional'

interface RoutedEdgeProps extends EdgeProps {
  variant: EdgeVariant
}

function RoutedEdge({ variant, ...props }: RoutedEdgeProps) {
  const isIntraContainer = props.data?.isIntraContainer as boolean | undefined

  const [edgePath] = getSmoothStepPath({ ...props, borderRadius: 10 })

  let labelX: number
  let labelY: number

  if (isIntraContainer) {
    labelX = ((props.sourceX ?? 0) + (props.targetX ?? 0)) / 2
    labelY = ((props.sourceY ?? 0) + (props.targetY ?? 0)) / 2
  } else {
    labelX = (props.sourceX ?? 0) * 0.4 + (props.targetX ?? 0) * 0.6
    labelY = (props.sourceY ?? 0) * 0.4 + (props.targetY ?? 0) * 0.6
  }

  const baseStyle: React.CSSProperties = { stroke: '#94a3b8', strokeWidth: 1.25 }
  if (variant === 'async') baseStyle.strokeDasharray = '5 5'

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd="url(#arrow)"
        {...(variant === 'bidirectional' ? { markerStart: 'url(#arrow-reverse)' } : {})}
        style={baseStyle}
      />
      {props.label ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              zIndex: 1000,
            }}
          >
            {props.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}

export function SyncEdge(props: EdgeProps) {
  return <RoutedEdge {...props} variant="sync" />
}

export function AsyncEdge(props: EdgeProps) {
  return <RoutedEdge {...props} variant="async" />
}

export function BidirectionalEdge(props: EdgeProps) {
  return <RoutedEdge {...props} variant="bidirectional" />
}
