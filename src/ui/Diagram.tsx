import type { Diagram } from '../content/schema';

export function DiagramView({ diagram }: { diagram: Diagram }) {
  return (
    <figure className="diagram">
      {diagram.kind === 'segmented-bar' ? (
        <div className="dg-bar">
          {diagram.segments.map((s, i) => (
            <div key={i} className={`dg-seg dg-${s.tone}`} style={{ flexGrow: s.weight }}>
              <strong>{s.label}</strong>
              {s.sublabel && <span>{s.sublabel}</span>}
            </div>
          ))}
        </div>
      ) : (
        <ol className="dg-flow">
          {diagram.steps.map((s, i) => (
            <li key={i} className="dg-step">
              <strong>{s.label}</strong>
              {s.sublabel && <span>{s.sublabel}</span>}
            </li>
          ))}
        </ol>
      )}
      {diagram.caption && <figcaption>{diagram.caption}</figcaption>}
    </figure>
  );
}
