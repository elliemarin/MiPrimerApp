import type { CatalogReference } from '../data/catalogArtwork';

/** Original vector still-life objects, separate from editable garment surfaces. */
export function CatalogObject({ reference }: { reference: CatalogReference }) {
  const { subject, x, y, width, height } = reference;
  const ink = '#6c716c', paper = '#f3f0e6', grey = '#c3c8c3', dark = '#66756f';
  const device = ['portatil', 'tableta', 'telefono', 'lector'].includes(subject);
  const book = ['libro', 'cuaderno', 'pasaporte', 'patrones'].includes(subject);
  return <svg x={x} y={y} width={width} height={height} viewBox="0 0 100 100" aria-hidden="true" className="catalog-reference" data-reference-subject={subject}>
    <g stroke={ink} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="50" cy="86" rx="38" ry="6" fill="#384b3c" opacity=".09" stroke="none" />
      {device && (subject === 'portatil' ? <>
        <path d="M16 16Q16 12 20 12H80Q84 12 84 16V67H16Z" fill={dark} />
        <path d="M21 18H79V61H21Z" fill="#dde4de" />
        <path d="M22 59L78 20V59Z" fill="#c4d3cb" stroke="none" />
        <path d="M16 67H84L96 82Q50 88 4 82Z" fill={grey} />
        <path d="M33 72H67L70 79H30Z" fill="#b0bbb4" />
        <path d="M7 82Q50 91 93 82" fill="none" />
      </> : <>
        <rect x={subject === 'telefono' ? 27 : 14} y="6" width={subject === 'telefono' ? 46 : 72} height="84" rx="7" fill={dark} />
        <rect x={subject === 'telefono' ? 31 : 19} y="12" width={subject === 'telefono' ? 38 : 62} height="67" rx="2" fill={subject === 'lector' ? paper : '#d7e2dc'} />
        {subject === 'lector' ? <path d="M27 26H72M27 33H72M27 40H67M27 47H72M27 54H62M27 61H72" stroke="#abb2a7" /> : <path d={subject === 'telefono' ? 'M32 70L68 22V77H32Z' : 'M20 66L80 20V78H20Z'} fill="#b9d0c4" stroke="none" />}
        <circle cx="50" cy="84" r="2" fill="#b5beb8" stroke="none" />
      </>)}
      {book && <>
        <path d="M18 12L72 7Q79 7 81 14L87 81Q86 87 78 88L23 93Z" fill={subject === 'pasaporte' ? '#798a80' : subject === 'patrones' ? '#d4c3a2' : '#9cafa3'} />
        <path d="M23 21L78 14L84 80L30 87Z" fill={paper} />
        <path d="M19 12L72 7L79 76L25 84Z" fill={subject === 'pasaporte' ? '#798a80' : '#aabbb0'} />
        <path d="M25 14L31 80M33 83L80 77M34 86L82 80" fill="none" strokeOpacity=".5" />
        {subject === 'pasaporte' ? <><circle cx="49" cy="40" r="12" fill="none" stroke="#e3d5ae" /><path d="M37 40H61M49 28Q39 40 49 52Q59 40 49 28M39 33Q49 38 59 33M39 47Q49 42 59 47" fill="none" stroke="#e3d5ae" /></> : subject === 'patrones' ? <path d="M40 29L46 31Q51 36 56 29L66 37L61 46L57 43L61 63L39 66L38 45L34 47L30 39Z" fill="none" stroke="#718277" /> : <path d="M36 31L62 28M37 37L63 34M39 65L63 62" fill="none" />}
        {subject === 'cuaderno' && Array.from({ length: 7 }, (_, i) => <path key={i} d={`M15 ${21 + i * 8} Q28 ${16 + i * 8} 23 ${26 + i * 8}`} fill="none" />)}
      </>}
      {subject === 'lentes' && <>
        <path d="M10 46L14 26L42 20M90 46L86 26L58 20" fill="none" strokeWidth="2.4" />
        <path d="M6 47Q22 39 43 47L40 64Q24 73 11 63Z M57 47Q78 39 94 47L89 63Q76 73 60 64Z" fill="#c5d6d2" fillOpacity=".7" strokeWidth="2" />
        <path d="M43 49Q50 45 57 49M7 47H3M94 47H98" fill="none" strokeWidth="2.3" />
        <path d="M16 48L29 65M63 48L77 65" stroke="#f8faf6" strokeWidth="3" opacity=".7" />
      </>}
      {subject === 'consola' && <>
        <rect x="3" y="25" width="94" height="52" rx="13" fill={dark} />
        <rect x="20" y="30" width="60" height="42" rx="2" fill="#ceded6" />
        <path d="M22 65L77 32V70H22Z" fill="#adc9bb" stroke="none" />
        <circle cx="12" cy="41" r="4" fill={grey} /><path d="M8 58H16M12 54V62" stroke={grey} strokeWidth="2.6" />
        <circle cx="88" cy="43" r="2" fill={grey} /><circle cx="84" cy="48" r="2" fill={grey} /><circle cx="92" cy="48" r="2" fill={grey} /><circle cx="88" cy="53" r="2" fill={grey} />
      </>}
      {subject === 'tarjetas' && <>
        <rect x="15" y="23" width="69" height="44" rx="4" transform="rotate(-13 50 45)" fill="#b9c7b2" />
        <rect x="12" y="38" width="74" height="45" rx="4" fill={paper} />
        <rect x="22" y="49" width="11" height="9" rx="1" fill="#d8c69c" />
        <path d="M22 68H48M22 74H68M60 48H76" stroke="#acb9ab" strokeWidth="2" />
      </>}
      {subject === 'bastidor' && <>
        <circle cx="50" cy="54" r="35" fill={paper} stroke="#ad8c5c" strokeWidth="4" />
        <circle cx="50" cy="54" r="31" fill="none" stroke="#c6ab7d" />
        <path d="M42 16V8H58V16M46 8V16M54 8V16" stroke="#a38d6c" strokeWidth="3" fill="none" />
        <path d="M49 77Q45 53 58 31M48 62Q26 57 34 42Q51 44 48 62M51 48Q62 38 70 47Q67 58 51 54" stroke="#95ad93" fill="#cfdbc6" />
      </>}
      {subject === 'cables' && <>
        {[0, 1, 2].map(i => <ellipse key={i} cx="50" cy={44 + i * 8} rx="30" ry="19" fill="none" stroke="#7b8981" strokeWidth="3" />)}
        <path d="M24 62Q9 79 27 88M77 46Q91 28 80 16" fill="none" stroke="#7b8981" strokeWidth="3" />
        <rect x="21" y="81" width="13" height="12" rx="2" fill={grey} /><rect x="74" y="7" width="13" height="14" rx="2" fill={grey} /><path d="M78 4V9M83 4V9" />
      </>}
      {subject === 'muestrario' && <>
        {['#d8cbaa', '#a8b9a1', '#c9a19b', '#8d9eae'].map((color, i) => <path key={color} d="M31 13H67V84L63 80L59 84L55 80L51 84L47 80L43 84L39 80L35 84L31 80Z" transform={`rotate(${(i - 1.5) * 13} 49 19)`} fill={color} />)}
        <circle cx="49" cy="19" r="3" fill="#e8dbbd" />
      </>}
      {subject === 'plato' && <>
        <circle cx="47" cy="49" r="35" fill={paper} /><circle cx="47" cy="49" r="27" fill="#e1e4d9" stroke="#d2d5cb" /><circle cx="47" cy="49" r="24" fill={paper} stroke="none" />
        <path d="M91 19V80M88 19V37Q91 43 94 37V19M5 80V19Q-2 42 5 49" fill="none" stroke="#9ca79f" strokeWidth="2" />
      </>}
      {subject === 'taza' && <>
        <ellipse cx="47" cy="71" rx="39" ry="15" fill={paper} />
        <path d="M72 36Q99 30 94 51Q91 65 73 62" fill="none" stroke="#bdc2b7" strokeWidth="6" />
        <path d="M20 33H74L70 63Q47 83 24 63Z" fill="#e5e7dc" /><ellipse cx="47" cy="34" rx="27" ry="9" fill={paper} /><ellipse cx="47" cy="34" rx="22" ry="6" fill="#9c7f66" stroke="none" />
        <path d="M39 21Q30 12 39 5M54 20Q63 11 54 4" fill="none" strokeOpacity=".35" />
      </>}
      {subject === 'bandeja' && <>
        <path d="M13 22H87L94 80H6Z" fill="#cab99b" /><path d="M19 29H81L86 72H14Z" fill={paper} />
        <path d="M7 42H1V58H8M92 42H99V58H94" fill="none" strokeWidth="3" />
        <ellipse cx="38" cy="51" rx="16" ry="12" fill="#d7dfd1" /><ellipse cx="64" cy="52" rx="12" ry="9" fill="#e1c8b7" />
      </>}
      {subject === 'maquina' && <>
        <path d="M14 74H88L94 84H7Z" fill={grey} />
        <path d="M12 20Q12 12 22 12H77Q88 12 88 22V74H57V39H30V55H12Z" fill={paper} />
        <path d="M30 39H57V47H30Z" fill="#d8ded2" /><path d="M18 56V71M14 72H31" strokeWidth="2" />
        <circle cx="76" cy="32" r="8" fill={grey} /><circle cx="76" cy="32" r="4" fill={paper} /><path d="M43 9V2M47 9V2M40 2H50M43 9H50" />
        <path d="M64 52H79M64 58H79M64 64H79" stroke="#b5bdb0" />
      </>}
      {subject === 'raton' && <>
        <path d="M47 23Q46 8 67 9Q80 10 78 2" fill="none" stroke="#a5afa4" />
        <path d="M20 51Q20 21 49 21Q79 21 79 51V65Q78 88 50 88Q20 88 20 65Z" fill={paper} />
        <path d="M20 51H79M49 22V46" fill="none" stroke="#b2bbaa" /><rect x="45" y="31" width="8" height="13" rx="4" fill="#a9b5a6" />
      </>}
      {subject === 'teclado' && <>
        <path d="M7 25H93L98 78H2Z" fill={paper} />
        {Array.from({ length: 4 }, (_, row) => Array.from({ length: 9 }, (_, col) => <rect key={`${row}-${col}`} x={10 + col * 9} y={32 + row * 9} width="6" height="6" rx="1" fill="#d5ddcf" stroke="#b5c0af" strokeWidth=".6" />))}
        <rect x="28" y="69" width="44" height="5" rx="1" fill="#d5ddcf" stroke="#b5c0af" strokeWidth=".6" />
      </>}
      {subject === 'florero' && <>
        <path d="M50 50Q48 21 27 10M50 48Q65 16 74 8M50 40L48 3" fill="none" stroke="#819379" strokeWidth="2" />
        <path d="M41 29Q22 31 21 17Q39 13 41 29M57 28Q58 12 73 13Q77 28 57 28" fill="#b1c19f" stroke="#92a781" />
        <path d="M37 42H64Q61 56 69 72Q73 91 50 91Q27 91 31 72Q39 56 37 42Z" fill="#d3c0ab" />
        <path d="M40 48Q43 60 36 76" stroke="#f5e5d2" strokeWidth="3" opacity=".5" fill="none" />
      </>}
      {subject === 'marco' && <>
        <path d="M10 6H90V94H10Z" fill="#c8b18d" /><path d="M16 12H84V88H16Z" fill={paper} />
        <path d="M24 75Q39 56 52 75Q61 44 78 75Z" fill="#bdcbb5" stroke="none" /><circle cx="38" cy="34" r="11" fill="#d5b58e" stroke="none" />
      </>}
    </g>
  </svg>;
}
