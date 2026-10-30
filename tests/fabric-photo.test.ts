import { describe, expect, it } from 'vitest';
import { fabricPhotoSize, validateFabricPhoto } from '../src/lib/fabricPhoto';

describe('Fotos usadas como materiales textiles', () => {
  it('conserva la proporción y evita ampliar fotos pequeñas', () => {
    expect(fabricPhotoSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fabricPhotoSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(fabricPhotoSize(600, 400)).toEqual({ width: 600, height: 400 });
    expect(() => fabricPhotoSize(0, 300)).toThrow('tamaño válido');
  });
  it('acepta fotos de cámara y archivos sin MIME reconocibles', () => {
    expect(() => validateFabricPhoto({ type: 'image/heic', name: 'IMG_01.HEIC', size: 3000 })).not.toThrow();
    expect(() => validateFabricPhoto({ type: '', name: 'tela.JPG', size: 3000 })).not.toThrow();
  });
  it('explica imágenes vacías, formatos ajenos y fotos excesivas', () => {
    expect(() => validateFabricPhoto({ type: 'image/png', name: 'foto.png', size: 0 })).toThrow('vacía');
    expect(() => validateFabricPhoto({ type: 'application/pdf', name: 'patron.pdf', size: 100 })).toThrow('foto');
    expect(() => validateFabricPhoto({ type: 'image/png', name: 'foto.png', size: 41 * 1024 * 1024 })).toThrow('40 MB');
  });
});
