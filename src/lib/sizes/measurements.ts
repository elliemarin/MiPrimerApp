// Definiciones de medidas corporales. Todas se guardan en milímetros.

export type MeasureKey =
  | 'estatura'
  | 'pecho'
  | 'bajoBusto'
  | 'cintura'
  | 'cadera'
  | 'hombros'
  | 'espalda'
  | 'cuello'
  | 'talleDelantero'
  | 'talleEspalda'
  | 'largoManga'
  | 'brazo'
  | 'muneca'
  | 'tiro'
  | 'tiroTotal'
  | 'entrepierna'
  | 'largoExterior'
  | 'muslo'
  | 'rodilla'
  | 'tobillo'
  | 'talon'
  | 'cabeza';

export type MeasureGroup = 'general' | 'torso' | 'brazos' | 'piernas' | 'cabeza';

export interface MeasureDef {
  key: MeasureKey;
  label: string;
  group: MeasureGroup;
  how: string;
  /** Identificador de la guía visual (línea dibujada sobre la figura). */
  guide: string;
}

export const MEASURES: MeasureDef[] = [
  { key: 'estatura', label: 'Estatura', group: 'general', guide: 'estatura', how: 'De pie, descalzo, de la coronilla al suelo. En bebés que no se sostienen, acostado de la coronilla al talón.' },
  { key: 'pecho', label: 'Pecho o busto', group: 'torso', guide: 'pecho', how: 'Contorno horizontal por la parte más prominente del pecho o busto, bajo las axilas, sin apretar.' },
  { key: 'bajoBusto', label: 'Bajo busto', group: 'torso', guide: 'bajoBusto', how: 'Contorno justo debajo del busto, horizontal.' },
  { key: 'cintura', label: 'Cintura', group: 'torso', guide: 'cintura', how: 'Contorno en la parte más estrecha del torso, o donde se usará la cintura de la prenda. En bebés, a la altura del ombligo, sobre el pañal.' },
  { key: 'cadera', label: 'Cadera', group: 'torso', guide: 'cadera', how: 'Contorno horizontal por la parte más prominente de los glúteos. En bebés y toddlers, sobre el pañal.' },
  { key: 'hombros', label: 'Ancho de hombros', group: 'torso', guide: 'hombros', how: 'Por la espalda, de la punta de un hombro a la otra, siguiendo la curva.' },
  { key: 'espalda', label: 'Ancho de espalda', group: 'torso', guide: 'espalda', how: 'Por la espalda, de pliegue de axila a pliegue de axila, a media altura del omóplato.' },
  { key: 'cuello', label: 'Contorno de cuello', group: 'torso', guide: 'cuello', how: 'Contorno en la base del cuello, dejando un dedo de holgura.' },
  { key: 'talleDelantero', label: 'Talle delantero', group: 'torso', guide: 'talleDelantero', how: 'Del punto alto del hombro, junto al cuello, pasando por el busto, hasta la cintura.' },
  { key: 'talleEspalda', label: 'Talle de espalda', group: 'torso', guide: 'talleEspalda', how: 'De la vértebra prominente de la nuca hasta la cintura, por el centro de la espalda.' },
  { key: 'largoManga', label: 'Largo de manga', group: 'brazos', guide: 'largoManga', how: 'Con el brazo ligeramente doblado, de la punta del hombro, pasando por el codo, hasta el hueso de la muñeca.' },
  { key: 'brazo', label: 'Contorno de brazo', group: 'brazos', guide: 'brazo', how: 'Contorno en la parte más ancha del brazo, por encima del codo.' },
  { key: 'muneca', label: 'Muñeca', group: 'brazos', guide: 'muneca', how: 'Contorno sobre el hueso de la muñeca.' },
  { key: 'tiro', label: 'Tiro (altura de asiento)', group: 'piernas', guide: 'tiro', how: 'Sentado en una superficie dura, por el costado, de la cintura a la superficie del asiento. En bebés, acostado, de la cintura a la entrepierna sobre el pañal.' },
  { key: 'tiroTotal', label: 'Tiro total', group: 'piernas', guide: 'tiroTotal', how: 'De la cintura delantera, pasando entre las piernas, hasta la cintura trasera.' },
  { key: 'entrepierna', label: 'Entrepierna', group: 'piernas', guide: 'entrepierna', how: 'Por la cara interna de la pierna, de la entrepierna al hueso del tobillo.' },
  { key: 'largoExterior', label: 'Largo exterior', group: 'piernas', guide: 'largoExterior', how: 'Por el costado, de la cintura al hueso del tobillo.' },
  { key: 'muslo', label: 'Contorno de muslo', group: 'piernas', guide: 'muslo', how: 'Contorno en la parte más ancha del muslo, justo debajo de la entrepierna.' },
  { key: 'rodilla', label: 'Contorno de rodilla', group: 'piernas', guide: 'rodilla', how: 'Contorno a la altura de la rodilla, con la pierna recta.' },
  { key: 'tobillo', label: 'Tobillo', group: 'piernas', guide: 'tobillo', how: 'Contorno sobre el hueso del tobillo.' },
  { key: 'talon', label: 'Talón–empeine', group: 'piernas', guide: 'talon', how: 'Contorno diagonal del talón al empeine. Indica por dónde debe pasar un puño o bajo cerrado.' },
  { key: 'cabeza', label: 'Contorno de cabeza', group: 'cabeza', guide: 'cabeza', how: 'Contorno por la frente y la parte más saliente de la nuca.' }
];

export const MEASURE_BY_KEY: Record<MeasureKey, MeasureDef> = Object.fromEntries(MEASURES.map((m) => [m.key, m])) as Record<MeasureKey, MeasureDef>;

export const GROUP_LABEL: Record<MeasureGroup, string> = {
  general: 'General',
  torso: 'Torso',
  brazos: 'Brazos',
  piernas: 'Piernas',
  cabeza: 'Cabeza'
};

export type MeasureValues = Partial<Record<MeasureKey, number>>;
