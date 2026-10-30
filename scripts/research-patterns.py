#!/usr/bin/env python3
"""Audit Hilvana's public source index. No account, purchase, upload or email submission.

Default: validate metadata and the explicitly licensed local files, offline.
--network: fetch official sources and direct PDFs into memory, compare SHA-256.
--ids id1,id2: restrict the audit. --output /tmp/report.json: save a review report.
--discover-choly /tmp/candidates.json: collect candidate article URLs from official
free indexes. Candidates are NOT automatically imported; paid-base hacks must be
excluded after reading the complete source/PDF. Optional PyMuPDF adds page counts.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'public/pattern-library/free-patterns.json'
MAX_BYTES = 25 * 1024 * 1024
CHOLY_INDEXES = ['free-projects', 'accessories', 'bagscarryalls', 'archive-patterns', 'plushies']


def fetch(url):
    if urllib.parse.urlsplit(url).scheme != 'https':
        raise ValueError('Only HTTPS source URLs are accepted')
    with urllib.request.urlopen(url, timeout=45) as response:
        data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError('File exceeds review limit; inspect manually')
        return response.status, data


def audit(row, network=False):
    result = {'id': row['id'], 'sourceUrl': row['sourceUrl'], 'issues': []}
    issues = result['issues']
    for field in ['sourceUrl', 'patternUrl', 'instructionsUrl']:
        if urllib.parse.urlsplit(row[field]).scheme != 'https':
            issues.append(field + ': HTTPS required')
    if row.get('editableInHilvana') is not False:
        issues.append('External pattern must not be advertised as native editable geometry')
    if row['patternKind'] == 'pdf' and not re.fullmatch(r'[a-f0-9]{64}', row.get('verification', {}).get('pdfSha256', '')):
        issues.append('Direct PDF lacks reviewed fingerprint')
    if row.get('assets'):
        for kind, value in row['assets'].items():
            path = value.split('#')[0]
            if not path.startswith('pattern-library/') or '..' in Path(path).parts:
                issues.append('Invalid local ' + kind + ' path')
                continue
            local = ROOT / 'public' / path
            if not local.exists():
                issues.append('Missing local file: ' + path)
                continue
            data = local.read_bytes()
            if not data.startswith(b'%PDF-'):
                issues.append('Invalid local PDF signature: ' + path)
            if hashlib.sha256(data).hexdigest() != row['verification']['pdfSha256']:
                issues.append('Local original bytes changed: ' + path)
    if not network:
        return result
    for field in ['sourceUrl', 'patternUrl', 'instructionsUrl']:
        url = row[field]
        previous = next((result.get(key) for key in ['sourceUrlCheck', 'patternUrlCheck'] if result.get(key, {}).get('url') == url), None)
        if previous:
            result[field + 'Check'] = previous
            continue
        try:
            status, data = fetch(url)
            check = {'url': url, 'httpStatus': status, 'bytes': len(data)}
            if field == 'patternUrl' and row['patternKind'] == 'pdf':
                if not data.startswith(b'%PDF-'):
                    issues.append('Expected PDF but received another file')
                else:
                    check['sha256'] = hashlib.sha256(data).hexdigest()
                    check['matchesReviewedPdf'] = check['sha256'] == row['verification']['pdfSha256']
                    if not check['matchesReviewedPdf']:
                        issues.append('PDF changed; review author update before refreshing fingerprint')
                    try:
                        import fitz
                        with fitz.open(stream=data, filetype='pdf') as document:
                            check['pages'] = len(document)
                    except ImportError:
                        check['pagesNote'] = 'Install PyMuPDF for structural PDF reading'
            result[field + 'Check'] = check
        except (urllib.error.URLError, OSError, ValueError) as error:
            # A server's bot restriction is a failed automated check, not a broken
            # user link. Preserve the last review date and inspect in a browser.
            result[field + 'Check'] = {'url': url, 'error': str(error)}
            issues.append(field + ': automatic retrieval failed; review in browser')
        time.sleep(0.15)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--network', action='store_true')
    parser.add_argument('--ids', default='')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--discover-choly', type=Path)
    args = parser.parse_args()
    if args.discover_choly:
        candidates = set()
        for page in CHOLY_INDEXES:
            _, data = fetch('https://cholyknight.com/' + page + '/')
            candidates.update(url.rstrip('/') + '/' for url in re.findall(r'href=["\'](https://cholyknight.com/\d{4}/\d{2}/\d{2}/[^"\'#?]+)', data.decode('utf-8')))
            time.sleep(0.5)
        args.discover_choly.write_text(json.dumps(sorted(candidates), indent=2) + '\n')
        print('Candidate articles:', len(candidates), '(not approved patterns)')
        return
    rows = json.loads(INDEX.read_text())
    if args.ids:
        chosen = set(args.ids.split(','))
        rows = [row for row in rows if row['id'] in chosen]
        missing = chosen - {row['id'] for row in rows}
        if missing:
            parser.error('Unknown IDs: ' + ', '.join(sorted(missing)))
    with concurrent.futures.ThreadPoolExecutor(max_workers=3 if args.network else 1) as pool:
        results = list(pool.map(lambda row: audit(row, args.network), rows))
    report = {'index': str(INDEX.relative_to(ROOT)), 'mode': 'network' if args.network else 'offline', 'reviewed': len(results), 'needsReview': sum(bool(row['issues']) for row in results), 'items': results}
    if args.output:
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: value for key, value in report.items() if key != 'items'}, ensure_ascii=False))
    for result in results:
        if result['issues']:
            print(result['id'] + ': ' + '; '.join(result['issues']))
    raise SystemExit(1 if report['needsReview'] else 0)


if __name__ == '__main__':
    main()
