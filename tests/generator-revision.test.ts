import { describe,it,expect } from 'vitest';
import { projectFromModel } from '../src/store/projects';
import { findModel } from '../src/data/catalog';
import { exportRecord,freezeDeps } from '../src/store/exports';
import { exportOutdated } from '../src/features/projects/deps';
import { APP_VERSION } from '../src/store/app';

describe('revisión de geometría del pantalón publicado',()=>{
 it('identifica PDF antiguos aunque sus parámetros y medidas no hayan cambiado',()=>{
  const original=projectFromModel(findModel('pantalon-recto-elastico')!);
  const {project,deps}=freezeDeps(original,{}, {pattern:true});
  const current=exportRecord('pdf-patron','file','patron.pdf',{},deps);
  expect(APP_VERSION).not.toBe('0.1.0');
  expect(exportOutdated({...current,appVersion:'0.1.0'},project)).toContain('trazado del pantalón');
  expect(exportOutdated(current,project)).toEqual([]);
  const other=projectFromModel(findModel('cojin')!);
  const frozen=freezeDeps(other,{}, {pattern:true});
  const previous=exportRecord('pdf-patron','file','cojin.pdf',{},frozen.deps);
  expect(exportOutdated({...previous,appVersion:'0.1.0'},frozen.project)).toEqual([]);
 });
});
