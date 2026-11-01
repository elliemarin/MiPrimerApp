import type { TransformationIdea } from '../../data/transformations';

/** A placement diagram, intentionally distinct from the photographic catalogue. */
export function TransformationDiagram({ idea, compact = false }: { idea: TransformationIdea; compact?: boolean }) {
  const pants = idea.garment === 'pantalon';
  const skirt = idea.garment === 'falda';
  const dress = idea.garment === 'vestido';
  const shape = pants ? 'M34 24 H106 L117 190 H82 L70 81 L58 190 H23 Z' : skirt ? 'M43 35 H97 L125 185 H15 Z' : dress ? 'M42 25 L58 15 Q70 31 82 15 L98 25 L108 65 L95 70 L87 55 L88 92 L124 189 H16 L52 92 L53 55 L45 70 L32 65 Z' : 'M42 30 L57 22 Q70 40 83 22 L98 30 L126 96 L104 105 L90 72 L94 166 H46 L50 72 L36 105 L14 96 Z';
  const change = () => {
    switch (idea.construction) {
      case 'panel': return <><path d="M32 62 H43 L36 174 H24 Z"/><path d="M97 62 H108 L116 174 H104 Z"/></>;
      case 'cuna': return pants ? <><path d="M31 111 L16 190 H47 Z"/><path d="M109 111 L93 190 H124 Z"/></> : <><path d="M46 110 L26 181 H66 Z"/><path d="M94 110 L74 181 H114 Z"/></>;
      case 'volante': return <path d={idea.id.includes('manga') ? 'M13 87 L38 96 L28 122 Q17 115 2 110 Z M102 96 L127 87 L138 110 Q122 115 112 122 Z' : skirt || dress ? 'M17 164 H123 L135 192 Q125 184 114 192 Q102 184 90 192 Q78 184 66 192 Q54 184 42 192 Q30 184 5 192 Z' : 'M45 147 H95 L110 181 Q98 173 86 181 Q74 173 62 181 Q50 173 30 181 Z'}/>;
      case 'puno': return <><path d="M14 90 L36 99 L29 117 L7 108 Z"/><path d="M104 99 L126 90 L133 108 L111 117 Z"/></>;
      case 'banda': return pants ? <><path d="M24 170 H60 L58 190 H23 Z"/><path d="M80 170 H116 L117 190 H82 Z"/></> : <path d={dress || skirt ? 'M19 170 H121 L125 190 H15 Z' : 'M46 148 H94 V168 H46 Z'}/>;
      case 'trabilla': return <path d="M103 70 Q125 91 104 111 L100 101 Q111 91 101 80 Z"/>;
      case 'parche': return pants ? <><rect x="29" y="108" width="29" height="38" rx="3"/><rect x="82" y="108" width="29" height="38" rx="3"/></> : <rect x="53" y="78" width="34" height="49" rx="3"/>;
      default: return <>{[false, true].slice(0, Number(idea.params.cantidad) > 1 ? 2 : 1).map((second) => {
        const x = pants ? (second ? 83 : 28) : second ? 75 : 48, y = pants ? 80 : 110;
        return <g key={String(second)}><rect x={x} y={y} width={pants ? 27 : 24} height="31" rx="2"/>{idea.construction === 'bolsillo-tapa' && <path d={`M${x} ${y} h24 v9 l-12 3 l-12 -3 Z`}/>} {idea.construction === 'bolsillo-fuelle' && <path d={`M${x + 4} ${y + 2} v25 h19`} fill="none"/>}</g>;
      })}</>;
    }
  };
  return <figure className={`transform-diagram${compact ? ' compact' : ''}`}>
    <svg viewBox="0 0 340 230" role="img" aria-label={`Esquema orientativo antes y después: ${idea.name}`}>
      <g transform="translate(8 5)" fill="#d8dfda" stroke="#46534b" strokeWidth="1.5" strokeLinejoin="round"><path d={shape}/>{pants && <path d="M34 36 H106 M70 24 V80" fill="none"/>}</g>
      <path d="M157 105 H181 M175 99 L181 105 L175 111" fill="none" stroke="#46534b" strokeWidth="1.5"/>
      <g transform="translate(192 5)" fill="#d8dfda" stroke="#46534b" strokeWidth="1.5" strokeLinejoin="round"><path d={shape}/>{pants && <path d="M34 36 H106 M70 24 V80" fill="none"/>}<g fill="#c08b57" stroke="#744b2d">{change()}</g></g>
      <g fill="currentColor" textAnchor="middle" fontSize="12"><text x="78" y="220">Tu prenda</text><text x="262" y="220">La transformación</text></g>
    </svg>
    {!compact && <figcaption>Esquema de colocación. Las piezas del PDF se calculan con tus medidas.</figcaption>}
  </figure>;
}
