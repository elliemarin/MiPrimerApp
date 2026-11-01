import { ReactNode } from 'react';
import { PageHead } from '../../ui/components';
import { MEASURES } from '../../lib/sizes/measurements';
import { BodyGuide } from '../profiles/BodyGuide';
import { CATALOG } from '../../data/catalog';

function Topic({ id, title, open, children }: { id: string; title: string; open?: boolean; children: ReactNode }) {
  return (
    <details id={id} className="panel" open={open} style={{ padding: '4px 16px' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 17, padding: '12px 0', listStylePosition: 'outside' }}>{title}</summary>
      <div className="stack small" style={{ paddingBottom: 16, lineHeight: 1.55 }}>{children}</div>
    </details>
  );
}

export function HelpPage({ topic }: { topic?: string }) {
  const implemented = CATALOG.filter((m) => m.status === 'implementado');
  return (
    <div className="page">
      <PageHead title="Ayuda" sub="Guías breves para medir, patronar, diseñar, imprimir y guardar tus proyectos." />
      <div className="stack" style={{ maxWidth: 780 }}>
        <Topic id="inicio" title="Primeros pasos" open={!topic || topic === 'inicio'}>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li><strong>Busca una base</strong> al abrir la app. Filtra por persona, tipo de prenda o accesorio y colección. Elige Obtener patrón para descargarlo, o Intervenir para personalizar.</li>
            <li><strong>Elige las medidas</strong>: Chica, Mediana, Grande o A medida. Las tallas de Hilvana muestran sus contornos; no son conversiones de marcas. En bebé elige meses y en accesorios puedes ajustar las medidas del objeto.</li>
            <li><strong>Coloca extras</strong>: busca un bolsillo, organizador o portacelular y arrastra su asa a la pieza. Luego arrastra el propio extra para moverlo. Acercar zona ayuda en piezas largas; Ajustar medidas permite cambiar tamaño, canales o ventana de cámara.</li>
            <li><strong>Elige telas y bordados</strong>: confirma color o tela en cada parte. Puedes aplicar explícitamente el mismo material a todas. Después añade figuras multicolor, letras o números, cambia su tamaño y arrástralos para colocarlos.</li>
            <li><strong>Genera los patrones</strong>: el PDF reúne piezas, medidas, materiales, instrucciones, colores de bordado y una cuadrícula de colocación de 10 mm. Usa las plantillas de corte y la guía de colocación según su título; imprime al 100 %.</li>
          </ol>
          <p>La barra Base → Extras → Acabados → PDF conserva el mismo proyecto. Más opciones contiene el estudio y patronaje avanzados para trabajos anteriores. Los patrones experimentales necesitan una muestra impresa y cosida; el bordado del PDF es una guía vectorial, no un archivo de puntadas.</p>
        </Topic>
        <Topic id="medir" title="Cómo tomar medidas" open={topic === 'medir'}>
          <p>Usa una cinta flexible, sin apretar, sobre ropa ligera. En bebés y toddlers mide sobre el pañal; la edad solo sirve de referencia.</p>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {MEASURES.map((m) => (
              <div key={m.key} className="row" style={{ alignItems: 'flex-start' }}>
                <BodyGuide measure={m.guide} size={54} />
                <div>
                  <strong>{m.label}</strong>
                  <div className="muted">{m.how}</div>
                </div>
              </div>
            ))}
          </div>
        </Topic>
        <Topic id="holgura" title="Medidas corporales, holgura, márgenes y dobladillos">
          <p><strong>Medida corporal</strong>: la del cuerpo. <strong>Holgura</strong>: espacio de diseño y movimiento que agrega cada patrón una sola vez. <strong>Prenda terminada</strong>: cuerpo + holgura, medida sobre la línea de costura.</p>
          <p><strong>Margen de costura</strong> y <strong>dobladillo</strong> se agregan por borde, por fuera de la línea de costura. Nunca cambian la medida terminada. En los dobladillos y jaretas, las esquinas del margen se reflejan para que al doblar coincidan con el costado.</p>
          <p>Las tablas de tallas son propias y explícitas. No se convierten entre sistemas (CH/M/G, EU, US).</p>
        </Topic>
        <Topic id="imprimir" title="Imprimir el patrón a escala real" open={topic === 'imprimir'}>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li>Imprime al <strong>100 %</strong> o «tamaño real». Desactiva «ajustar a la página».</li>
            <li>Imprime primero la portada y mide el <strong>cuadrado de 5 × 5 cm</strong> y la <strong>barra de 10 cm</strong>. Si no miden exacto, revisa la configuración de la impresora.</li>
            <li>Ordena las hojas con el mapa de montaje: filas por letra (A, B…) y columnas por número.</li>
            <li>Recorta el borde marcado «Recorta por esta línea» y pega cada hoja sobre la anterior hasta la línea «Borde de la hoja siguiente», haciendo coincidir los rombos.</li>
            <li>Corta por la línea continua. La discontinua es la costura; la de trazo y punto, doblez o dobladillo.</li>
          </ol>
          <p>Cada PDF registra la versión de medidas y de patrón que lo generó, y en Exportaciones verás si quedó desactualizado.</p>
        </Topic>
        <Topic id="proyector" title="Proyectar el patrón sobre la tela (sin imprimir)" open={topic === 'proyector'}>
          <p>Hilvana puede mostrar las piezas a <strong>tamaño real</strong> sobre la mesa de corte con un proyector. Ábrelo desde el PDF de confección con <strong>Proyectar en la mesa</strong>. Funciona con los mismos patrones del PDF: márgenes incluidos, piquetes, doblez y flecha de hilo.</p>
          <strong>Qué necesitas</strong>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            <li>Un proyector montado encima de la mesa, mirando hacia abajo (soporte de techo, brazo o tripié). Mientras más resolución, más finas las líneas.</li>
            <li>Una computadora, tableta o teléfono conectado al proyector (cable HDMI o duplicado inalámbrico).</li>
            <li>Regla o escuadra de al menos 30 cm, o un tapete de corte con cuadrícula.</li>
          </ul>
          <strong>1. Montaje</strong>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            <li>Coloca el proyector lo más perpendicular posible a la mesa y enfoca hasta que las líneas se vean nítidas.</li>
            <li>Muestra Hilvana en el proyector a <strong>pantalla completa</strong> (en iPhone o iPad, añade la app a la pantalla de inicio y duplica la pantalla).</li>
            <li>Si el proyector tiene corrección trapezoidal automática, déjala fija antes de calibrar. No cambies después el zoom, la altura, la resolución ni el tamaño de la ventana.</li>
          </ol>
          <strong>2. Calibración</strong>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            <li><strong>Rápida con regla</strong> (proyector recto): aparece un cuadro que debe medir 10 cm. Mide su ancho y su alto y escribe los milímetros reales; la app corrige la escala. Repite hasta que mida 100 mm.</li>
            <li><strong>Precisa con 4 esquinas</strong> (proyector inclinado o girado): elige un rectángulo de medidas conocidas en tu tapete, por ejemplo 40 × 30 cm. Arrastra las cruces 1 → 2 → 3 → 4 hasta sus esquinas y afina con las flechas. Corrige escala, giro e inclinación a la vez.</li>
          </ul>
          <strong>3. Comprobación</strong>
          <p style={{ margin: 0 }}>Mide el cuadro de 10 cm y los de 5 cm, y compara la cuadrícula de 10 cm con tu tapete en el centro y en las orillas. Si algo difiere más de 1–2 mm, recalibra. Mientras proyectas, el <strong>cuadro de control de 5 cm</strong> de la esquina permite revisar la escala en cualquier momento. La calibración se guarda en este dispositivo.</p>
          <strong>4. Cortar</strong>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            <li>Usa el <strong>fondo negro</strong>: no ilumina la tela y las líneas se ven mejor. En telas muy oscuras sube el grosor de línea en Opciones.</li>
            <li>Extiende la tela sin arrugas con el orillo paralelo al borde de la mesa. Arrastra las piezas o usa Girar 90° hasta que la <strong>flecha de hilo</strong> quede paralela al orillo.</li>
            <li>Las piezas «al doblez» van con la línea de doblez exactamente sobre el doblez de la tela. Para la segunda pieza de un par en espejo, pulsa <strong>Voltear</strong>.</li>
            <li>Pulsa Bloquear para no mover las piezas por accidente y Ocultar controles para cortar sin botones; toca la pantalla para volver a verlos.</li>
            <li>Marca con tiza o lápiz textil, o corta directamente con cortador circular y pesas; marca los piquetes.</li>
          </ol>
          <p style={{ margin: 0 }}>En telas gruesas (polar, acolchado) la superficie queda más cerca del proyector: comprueba el cuadro de 5 cm sobre la propia tela. No mires directamente al haz del proyector.</p>
          <p style={{ margin: 0 }}><strong>PDF para proyector</strong>: si prefieres otra app de proyección, descarga una hoja grande a escala 1:1 con fondo negro, cuadrícula de 10 cm y un cuadro de calibración de 10 × 10 cm. Ábrela en esa app y calibra con la cuadrícula. No es para imprimir en hojas carta.</p>
        </Topic>
        <Topic id="estudio" title="Estudio de diseño">
          <p>Trabaja sobre el dibujo técnico de un modelo, fotos de tu prenda, piezas del patrón o un parche independiente. Cada vista tiene zonas (delantero, mangas, piernas…) y una línea de referencia compartida.</p>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            <li><strong>Máscara</strong>: limita un elemento a una zona, como si terminara en la costura.</li>
            <li><strong>Continuidad</strong>: si un elemento cruza un costado, crea su continuación en la vista lateral y revisa que las alturas coincidan.</li>
            <li><strong>Técnica</strong>: aplicación, collage, patchwork, parche, vinil, pintura, bordado o costura visible. Las de recorte generan plantillas con margen separado del tamaño final.</li>
            <li><strong>Apariencia y técnica</strong>: la apariencia muestra telas y acabados; la técnica, contornos y medidas. Ninguna simula caída o ajuste del tejido.</li>
          </ul>
        </Topic>
        <Topic id="telas" title="Fotografiar y calibrar telas">
          <p>Fotografía la tela de frente, plana y con luz pareja. Coloca al lado una regla o una hoja carta: al recortar, alinea las esquinas con ella e indica su medida real para calibrar el estampado.</p>
          <p>Una <strong>muestra calibrada</strong> se ve a su tamaño real en el estudio; una <strong>textura visual</strong> solo es aproximada. Registra el hilo (urdimbre) y si la tela tiene pelo o dirección.</p>
        </Topic>
        <Topic id="referencias" title="Patrones existentes y fotos de prendas">
          <p>Sube JPG, PNG o PDF. Los PDF conservan su escala física. Para fotos de un patrón, corrige la perspectiva marcando un rectángulo conocido (por ejemplo, una hoja carta) y luego traza las piezas en el editor con el modo asistido.</p>
          <p>Para fotos de una prenda, indica qué detalles se ven y mide la prenda real. La app separa lo confirmado de lo que necesita revisión y propone un patrón base compatible que debes comprobar con una muestra.</p>
        </Topic>
        <Topic id="guardar" title="Guardado, versiones, ZIP y sincronización">
          <p>Todo se guarda automáticamente en este dispositivo; el indicador dice «Guardado» solo cuando terminó de escribirse. También puedes guardar manualmente desde el menú del proyecto.</p>
          <p>Guarda <strong>versiones</strong> del patrón y del diseño para comparar, aprobar y restaurar. Las versiones aprobadas no se reemplazan sin confirmación.</p>
          <p>El <strong>ZIP del proyecto</strong> contiene referencias originales, medidas, patrón, diseño, telas, exportaciones, avances y un resumen en PDF. Ábrelo en otro dispositivo con «Importar ZIP».</p>
          <p>La <strong>sincronización</strong> (experimental) guarda tus datos en un repositorio privado de tu cuenta de GitHub para retomarlos en otro dispositivo. Configúrala en Ajustes.</p>
        </Topic>
        <Topic id="iphone" title="Instalar en iPhone">
          <p>En Safari, toca Compartir → «Agregar a pantalla de inicio». Se abre como una app, funciona sin conexión y el sistema protege mejor tus datos.</p>
        </Topic>
        <Topic id="estado" title="Qué está disponible y qué no" open={topic === 'estado'}>
          <p><strong>Patrones que se generan hoy:</strong> {[...new Set(implemented.filter((m) => m.generatorId).map((m) => m.name))].join(', ')}.</p>
          <p><strong>Flujos completos de estudio:</strong> {implemented.filter((m) => m.studioOnly).map((m) => m.name).join(', ')}.</p>
          <p><strong>Experimental:</strong> sincronización con GitHub y archivo de puntadas DST (solo puntada recta; revisa en tu software de bordado).</p>
          <p><strong>No disponible:</strong> vista 3D (requiere geometría y simulación física reales), reconocimiento automático de vistas o medidas en fotos y los patrones marcados como «Solo inspiración».</p>
        </Topic>
      </div>
    </div>
  );
}
