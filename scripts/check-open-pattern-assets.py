#!/usr/bin/env python3
"""Verifica las copias CC locales. --remote contrasta además la descarga oficial.

Solo usa la biblioteca estándar. No descarga ni publica otros archivos y no
modifica los PDF ni el manifiesto. Una respuesta PDF no valida su confección.
"""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / 'public' / 'pattern-library' / 'bikes-and-bloomers'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--remote', action='store_true')
    args = parser.parse_args()
    manifest = json.loads((DIRECTORY / 'manifest.json').read_text())
    total = 0
    for item in manifest:
        target = (DIRECTORY / item['file']).resolve()
        assert target.parent == DIRECTORY.resolve(), 'Ruta ajena a la carpeta permitida'
        data = target.read_bytes()
        assert data.startswith(b'%PDF-'), f"Firma PDF inválida: {item['file']}"
        assert len(data) == item['bytes'], f"Tamaño diferente: {item['file']}"
        assert hashlib.sha256(data).hexdigest() == item['sha256'], f"SHA-256 diferente: {item['file']}"
        assert item['license'] == 'CC-BY-NC-SA-4.0'
        assert item['permissionSource'] == 'https://bikesandbloomers.com/patterns/'
        if args.remote:
            request = urllib.request.Request(item['downloadUrl'], headers={'User-Agent': 'Hilvana-source-check/1.0'})
            with urllib.request.urlopen(request, timeout=90) as response:
                remote = response.read()
            assert remote.startswith(b'%PDF-'), f"La fuente ya no devuelve PDF: {item['downloadUrl']}"
            assert hashlib.sha256(remote).hexdigest() == item['sha256'], f"El autor actualizó el PDF: revisar {item['downloadUrl']}"
        total += len(data)
        print(f"OK {item['file']} ({item['pages']} páginas)")
    print(f'{len(manifest)} PDF originales; {total:,} bytes; integridad comprobada.')


if __name__ == '__main__':
    main()
