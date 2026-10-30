import { PageHead, SaveIndicator } from '../../ui/components';
import { Icon } from '../../ui/Icon';

const ITEMS = [
  { href: '#/telas', icon: 'telas', t: 'Telas y materiales', s: 'Muestras calibradas, hilos, botones, cierres y más' },
  { href: '#/medidas', icon: 'medidas', t: 'Perfiles de medidas', s: 'Personas, tallas y versiones de medidas' },
  { href: '#/ayuda', icon: 'ayuda', t: 'Ayuda', s: 'Cómo medir, imprimir a escala y usar el estudio' },
  { href: '#/ajustes', icon: 'settings', t: 'Ajustes y cuenta', s: 'Unidades, sincronización, privacidad y datos' }
];

export function MorePage() {
  return (
    <div className="page">
      <PageHead title="Más" sub={<SaveIndicator />} />
      <div className="group">
        {ITEMS.map((i) => (
          <a key={i.href} className="list-row" href={i.href}>
            <span className="lead"><Icon name={i.icon} /></span>
            <span className="grow">
              <span className="t" style={{ display: 'block' }}>{i.t}</span>
              <span className="s">{i.s}</span>
            </span>
            <Icon name="chev" className="chev" />
          </a>
        ))}
      </div>
    </div>
  );
}
