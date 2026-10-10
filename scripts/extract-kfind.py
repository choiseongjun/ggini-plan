"""Read-only XLSX extraction. Original workbooks remain authoritative and unchanged.

Usage: bundled-python scripts/extract-kfind.py [input directory] [output directory]
Blank cells are omitted; the manifest retains every header. Zero is never omitted.
"""
import datetime
import gzip
import hashlib
import json
import pathlib
import sys

import openpyxl


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def extract(source, destination):
    destination.mkdir(parents=True, exist_ok=True)
    entries = []
    for path in sorted(source.glob('*.xlsx')):
        sha = digest(path)
        output = destination / (sha + '.jsonl.gz')
        metadata = destination / (sha + '.json')
        if output.exists() and metadata.exists():
            entry = json.loads(metadata.read_text(encoding='utf-8'))
            if entry.get('output_sha256') == digest(output):
                entries.append(entry)
                print(f'Cached: {path.name}: {entry["rows"]}', flush=True)
                continue
        workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
        if len(workbook.worksheets) != 1:
            raise ValueError(f'Expected one source sheet: {path.name}')
        sheet = workbook.active
        rows = sheet.iter_rows(values_only=True)
        headers = next(rows)
        if any(not h for h in headers) or len(set(headers)) != len(headers):
            raise ValueError(f'Invalid headers: {path.name}')
        seen = set()
        count = 0
        temporary = output.with_suffix('.partial')
        with gzip.open(temporary, 'wt', encoding='utf-8', compresslevel=3) as stream:
            for row in rows:
                if not any(v is not None and v != '' for v in row):
                    continue
                record = {}
                for key, value in zip(headers, row):
                    if value is None or value == '':
                        continue
                    if isinstance(value, (datetime.date, datetime.datetime)):
                        value = value.strftime('%Y-%m-%d')
                    record[key] = value
                code = str(record.get('식품코드', '')).strip()
                if not code or code in seen:
                    raise ValueError(f'Missing/duplicate food code: {path.name}: {code}')
                seen.add(code)
                stream.write(json.dumps(record, ensure_ascii=False, separators=(',', ':')) + '\n')
                count += 1
                if count % 25000 == 0:
                    print(f'{path.name}: {count:,}', flush=True)
        workbook.close()
        temporary.replace(output)
        entry = dict(file=path.name, source_sha256=sha, output=output.name,
                     output_sha256=digest(output), sheet=sheet.title, headers=headers, rows=count)
        metadata.write_text(json.dumps(entry, ensure_ascii=False, indent=2), encoding='utf-8')
        entries.append(entry)
        print(f'Extracted: {path.name}: {count:,}', flush=True)
    if not entries:
        raise ValueError('No XLSX inputs')
    (destination / 'manifest.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    extract(pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'data/tempdata'),
            pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else '.cache/kfind'))
