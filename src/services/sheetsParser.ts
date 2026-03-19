import { Monitor, Rating, ParseResult } from '../types';

const SPREADSHEET_ID = '1wTcNBG28l6VL7BXuO_vIlj0ncRNvrCEExy-iGrNFARU';
const GID = '1877328082';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  const lines: string[] = [];

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.trim()) {
        lines.push(current);
      }
      current = '';
      if (ch === '\r' && i + 1 < csvText.length && csvText[i + 1] === '\n') {
        i++;
      }
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    lines.push(current);
  }

  for (const line of lines) {
    rows.push(parseCSVLine(line));
  }

  return rows;
}

function extractResolutionCategory(res: string): string {
  const lower = res.toLowerCase().replace(/\s/g, '');
  if (lower.includes('3840') || lower.includes('uhd') || lower.includes('4k')) return 'UHD/4K';
  if (lower.includes('3440x1440') || lower.includes('wqhd') || lower.includes('uwqhd')) return 'UWQHD';
  if (lower.includes('2560x1440') || lower.includes('qhd')) return 'QHD';
  if (lower.includes('2560x1080') || lower.includes('wfhd') || lower.includes('uwfhd')) return 'UWFHD';
  if (lower.includes('5120') || lower.includes('5k')) return '5K';
  if (lower.includes('1920x1080') || lower.includes('fullhd') || lower.includes('fhd')) return 'FullHD';
  if (lower.includes('1920') && lower.includes('1080')) return 'FullHD';
  if (lower.includes('2560') && lower.includes('1440')) return 'QHD';
  return res.split('\n')[0].trim() || '?';
}

function isValidRating(r: string): r is Rating {
  return ['S', 'A', 'B', 'C', 'D', 'E', 'F'].includes(r.trim().toUpperCase());
}

function isHeaderOrSeparator(name: string, row: string[]): boolean {
  const n = name.toUpperCase();
  if (n === 'МАНИТОР' || n === 'МОНИТОР' || n === 'MONITOR') return true;
  // Section headers like "FullHD мониторы" etc.
  if (/^(FULLHD|QHD|UHD|WFHD|WQHD|4K|5K)\s/i.test(n) && !(row[3] || '').trim()) return true;
  return false;
}

export async function fetchMonitors(): Promise<ParseResult> {
  const errors: string[] = [];
  const monitors: Monitor[] = [];
  let csvText = '';

  const directUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

  const urls = [
    directUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(directUrl)}`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (response.ok) {
        csvText = await response.text();
        // Validate we got actual CSV data
        if (csvText.length > 100 && (csvText.includes('МАНИТОР') || csvText.includes('Разрешение') || csvText.includes('Матрица'))) {
          break;
        }
        csvText = '';
      }
    } catch {
      continue;
    }
  }

  if (!csvText) {
    return {
      monitors: [],
      errors: ['Не удалось загрузить данные из Google Sheets. Проверьте подключение к интернету и доступность таблицы.'],
      lastMonitor: '',
      timestamp: new Date(),
      totalRows: 0,
    };
  }

  const rows = parseCSV(csvText);

  if (rows.length < 2) {
    return {
      monitors: [],
      errors: ['Таблица пуста или имеет неверный формат.'],
      lastMonitor: '',
      timestamp: new Date(),
      totalRows: 0,
    };
  }

  // Find header row and column mapping
  let headerIndex = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    const joined = row.join(' ').toLowerCase();
    if (joined.includes('манитор') || joined.includes('монитор') || joined.includes('разрешение')) {
      headerIndex = i;
      break;
    }
  }

  const dataRows = rows.slice(headerIndex + 1);
  let lastValidMonitor = '';

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    try {
      const name = (row[0] || '').trim();
      if (!name) continue;
      if (isHeaderOrSeparator(name, row)) continue;

      const resolution = (row[1] || '').trim();
      const ratingRaw = (row[16] || row[15] || '').trim().toUpperCase();

      // Try to find rating in column 16 first, then others
      let rating = '';
      for (const col of [16, 17, 15]) {
        const val = (row[col] || '').trim().toUpperCase();
        if (isValidRating(val)) {
          rating = val;
          break;
        }
      }

      if (!rating) {
        // It could be a data row without a rating column — skip silently if no resolution either
        if (resolution && name.length > 2) {
          errors.push(`Строка ${headerIndex + i + 2}: «${name}» — оценка не найдена (значение: "${ratingRaw}")`);
        }
        continue;
      }

      const comment = (row[15] || '').trim();

      const monitor: Monitor = {
        name,
        resolution: resolution.replace(/\n/g, ' '),
        resolutionCategory: extractResolutionCategory(resolution),
        diagonal: (row[2] || '').trim(),
        panel: (row[3] || '').trim(),
        matrixType: (row[4] || '').trim(),
        refreshRate: (row[5] || '').trim(),
        contrast: (row[6] || '').trim(),
        gtg80: (row[7] || '').trim(),
        gtg100: (row[8] || '').trim(),
        overdrive: (row[9] || '').trim(),
        srgb: (row[10] || '').trim(),
        adobe: (row[11] || '').trim(),
        dciP3: (row[12] || '').trim(),
        minBrightness: (row[13] || '').trim(),
        maxBrightness: (row[14] || '').trim(),
        comment,
        rating: rating as Rating,
        rowIndex: headerIndex + i + 2,
      };

      monitors.push(monitor);
      lastValidMonitor = name;
    } catch (e) {
      errors.push(`Строка ${headerIndex + i + 2}: ошибка парсинга — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    monitors,
    errors,
    lastMonitor: lastValidMonitor,
    timestamp: new Date(),
    totalRows: dataRows.length,
  };
}
