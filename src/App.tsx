import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchMonitors } from './services/sheetsParser';
import { Monitor, ParseResult, Rating, RATING_CONFIG } from './types';

/* ───── Utility functions ───── */

function extractLinks(text: string): { label: string; url: string }[] {
  const links: { label: string; url: string }[] = [];
  const urlRegex = /https?:\/\/[^\s,)»"]+/g;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const before = text.substring(Math.max(0, match.index - 80), match.index);
    const labelMatch = before.match(/(?:\d+\)\s*)?([А-Яа-яёЁA-Za-z\s.+:]+?)\s*[-–—:]?\s*$/);
    const label = labelMatch ? labelMatch[1].trim() : '';
    links.push({ label: label || `Ссылка ${links.length + 1}`, url });
  }
  return links;
}

function cleanComment(text: string): string {
  return text
    .replace(/https?:\/\/[^\s,)»"]+/g, '')
    .replace(/\d+\)\s*[-–—:]?\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* ───── Sub-components ───── */

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.25)',
      borderRadius: '8px',
      padding: '6px 10px',
    }}>
      <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value}>
        {value}
      </div>
    </div>
  );
}

function ColorBadge({ label, value, bg, textColor, borderColor }: {
  label: string; value: string; bg: string; textColor: string; borderColor: string;
}) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '10px',
      fontWeight: 500,
      background: bg,
      color: textColor,
      border: `1px solid ${borderColor}`,
    }}>
      {label}: {value}
    </span>
  );
}

function MonitorCard({ monitor }: { monitor: Monitor }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = RATING_CONFIG[monitor.rating];
  const links = extractLinks(monitor.comment);
  const commentText = cleanComment(monitor.comment);

  const borderColors: Record<Rating, string> = {
    S: '#d97706', A: '#10b981', B: '#06b6d4', C: '#4b5563',
    D: '#ca8a04', E: '#374151', F: '#dc2626',
  };
  const bgColors: Record<Rating, string> = {
    S: 'rgba(120,53,15,0.25)', A: 'rgba(6,78,59,0.2)', B: 'rgba(8,51,68,0.2)',
    C: 'rgba(31,41,55,0.3)', D: 'rgba(113,63,18,0.15)', E: 'rgba(31,41,55,0.2)',
    F: 'rgba(127,29,29,0.15)',
  };

  const hasDetails = monitor.panel || commentText || links.length > 0 || (monitor.overdrive && monitor.overdrive !== '?') || (monitor.gtg100 && monitor.gtg100 !== '?');

  return (
    <div style={{
      borderRadius: '12px',
      border: `2px solid ${borderColors[monitor.rating]}`,
      background: bgColors[monitor.rating],
      transition: 'transform 0.15s, box-shadow 0.15s',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <h3 style={{ color: '#fff', fontWeight: 600, fontSize: '14px', lineHeight: '1.4', flex: 1, whiteSpace: 'pre-line' }}>
            {monitor.name}
          </h3>
          <span style={{
            flexShrink: 0,
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            border: `1px solid ${borderColors[monitor.rating]}`,
            background: bgColors[monitor.rating],
            color: borderColors[monitor.rating],
          }}>
            {cfg.emoji} {monitor.rating}
          </span>
        </div>
        <p style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px', color: borderColors[monitor.rating] }}>
          {cfg.label}
        </p>

        {/* Key specs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
          <SpecItem label="Разрешение" value={monitor.resolutionCategory} />
          <SpecItem label="Диагональ" value={monitor.diagonal ? `${monitor.diagonal}"` : '—'} />
          <SpecItem label="Матрица" value={monitor.matrixType || '—'} />
          <SpecItem label="Частота" value={monitor.refreshRate ? `${monitor.refreshRate} Гц` : '—'} />
          <SpecItem label="Контраст" value={monitor.contrast || '—'} />
          <SpecItem label="GtG 80%" value={monitor.gtg80 || '—'} />
        </div>

        {/* Color coverage badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
          {monitor.srgb && monitor.srgb !== '?' && (
            <ColorBadge label="sRGB" value={monitor.srgb} bg="rgba(59,130,246,0.15)" textColor="#93c5fd" borderColor="rgba(59,130,246,0.25)" />
          )}
          {monitor.dciP3 && monitor.dciP3 !== '?' && (
            <ColorBadge label="DCI-P3" value={monitor.dciP3} bg="rgba(168,85,247,0.15)" textColor="#c4b5fd" borderColor="rgba(168,85,247,0.25)" />
          )}
          {monitor.adobe && monitor.adobe !== '?' && (
            <ColorBadge label="Adobe" value={monitor.adobe} bg="rgba(249,115,22,0.15)" textColor="#fdba74" borderColor="rgba(249,115,22,0.25)" />
          )}
          {monitor.maxBrightness && monitor.maxBrightness !== '?' && (
            <ColorBadge label="Ярк." value={`${monitor.maxBrightness} нит`} bg="rgba(234,179,8,0.15)" textColor="#fde68a" borderColor="rgba(234,179,8,0.25)" />
          )}
        </div>
      </div>

      {/* Expandable details */}
      {hasDetails && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: '100%',
              padding: '8px 16px',
              fontSize: '12px',
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span>{expanded ? 'Скрыть подробности' : 'Подробнее'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              {monitor.panel && (
                <div>
                  <span style={{ color: '#6b7280' }}>Панель: </span>
                  <span style={{ color: '#d1d5db', whiteSpace: 'pre-line' }}>{monitor.panel}</span>
                </div>
              )}
              {monitor.overdrive && monitor.overdrive !== '?' && (
                <div>
                  <span style={{ color: '#6b7280' }}>Overdrive: </span>
                  <span style={{ color: '#d1d5db' }}>{monitor.overdrive}</span>
                </div>
              )}
              {monitor.gtg100 && monitor.gtg100 !== '?' && (
                <div>
                  <span style={{ color: '#6b7280' }}>GtG 100%: </span>
                  <span style={{ color: '#d1d5db' }}>{monitor.gtg100}</span>
                </div>
              )}
              {monitor.minBrightness && monitor.minBrightness !== '?' && (
                <div>
                  <span style={{ color: '#6b7280' }}>Мин. яркость: </span>
                  <span style={{ color: '#d1d5db' }}>~{monitor.minBrightness} нит</span>
                </div>
              )}
              {commentText && (
                <div>
                  <span style={{ color: '#6b7280' }}>Комментарий: </span>
                  <p style={{ color: '#d1d5db', marginTop: '4px', whiteSpace: 'pre-line', lineHeight: '1.5' }}>{commentText}</p>
                </div>
              )}
              {links.length > 0 && (
                <div>
                  <span style={{ color: '#6b7280' }}>Ссылки:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {links.map((l, i) => (
                      <a
                        key={i}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'rgba(59,130,246,0.1)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59,130,246,0.2)',
                          textDecoration: 'none',
                          fontSize: '11px',
                        }}
                      >
                        🔗 {l.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SelectFilter({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '4px' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '13px',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ───── Main App ───── */

export default function App() {
  const [data, setData] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [resFilter, setResFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('recommended');
  const [matrixFilter, setMatrixFilter] = useState('all');
  const [diagonalFilter, setDiagonalFilter] = useState('all');
  const [refreshFilter, setRefreshFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [showErrors, setShowErrors] = useState(false);
  const [showLastMonitor, setShowLastMonitor] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMonitors();
      setData(result);
      if (result.monitors.length === 0 && result.errors.length > 0) {
        setError(result.errors[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка загрузки');
      setData({
        monitors: [],
        errors: ['Критическая ошибка при загрузке данных'],
        lastMonitor: '',
        timestamp: new Date(),
        totalRows: 0,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ratingOrder: Record<Rating, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };

  const filterOptions = useMemo(() => {
    if (!data) return { resolutions: [] as string[], diagonals: [] as string[], matrices: [] as string[] };
    const resolutions = [...new Set(data.monitors.map(m => m.resolutionCategory))].filter(Boolean).sort();
    const diagonals = [...new Set(data.monitors.map(m => m.diagonal))].filter(Boolean).sort((a, b) => parseFloat(a) - parseFloat(b));
    const matrices = [...new Set(data.monitors.map(m => {
      const t = (m.matrixType || '').split('\n')[0].trim().toUpperCase();
      if (t.includes('IPS')) return 'IPS';
      if (t.includes('VA')) return 'VA';
      if (t.includes('TN')) return 'TN';
      if (t.includes('OLED')) return 'OLED';
      return t;
    }))].filter(v => v && v !== '?' && v !== '—').sort();
    return { resolutions, diagonals, matrices };
  }, [data]);

  const filteredMonitors = useMemo(() => {
    if (!data) return [];
    let result = [...data.monitors];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.panel.toLowerCase().includes(q) ||
        m.comment.toLowerCase().includes(q) ||
        m.matrixType.toLowerCase().includes(q)
      );
    }

    if (resFilter !== 'all') result = result.filter(m => m.resolutionCategory === resFilter);

    if (ratingFilter === 'recommended') {
      result = result.filter(m => ['S', 'A', 'B'].includes(m.rating));
    } else if (ratingFilter !== 'all') {
      result = result.filter(m => m.rating === ratingFilter);
    }

    if (matrixFilter !== 'all') {
      result = result.filter(m => (m.matrixType || '').toUpperCase().includes(matrixFilter));
    }

    if (diagonalFilter !== 'all') result = result.filter(m => m.diagonal === diagonalFilter);

    if (refreshFilter !== 'all') {
      result = result.filter(m => {
        const hz = parseInt(m.refreshRate);
        if (isNaN(hz)) return refreshFilter === 'unknown';
        switch (refreshFilter) {
          case '60-75': return hz >= 60 && hz <= 75;
          case '144': return hz >= 100 && hz <= 144;
          case '165-180': return hz >= 165 && hz <= 180;
          case '200-280': return hz >= 200 && hz <= 280;
          case '300+': return hz >= 300;
          default: return true;
        }
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'rating': return ratingOrder[a.rating] - ratingOrder[b.rating];
        case 'refresh': return (parseInt(b.refreshRate) || 0) - (parseInt(a.refreshRate) || 0);
        case 'diagonal': return (parseFloat(a.diagonal) || 0) - (parseFloat(b.diagonal) || 0);
        case 'name': return a.name.localeCompare(b.name, 'ru');
        default: return 0;
      }
    });

    return result;
  }, [data, search, resFilter, ratingFilter, matrixFilter, diagonalFilter, refreshFilter, sortBy]);

  const ratingCounts = useMemo(() => {
    if (!data) return {} as Record<Rating, number>;
    const counts: Record<string, number> = {};
    for (const m of data.monitors) {
      counts[m.rating] = (counts[m.rating] || 0) + 1;
    }
    return counts as Record<Rating, number>;
  }, [data]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #030712, #0f172a, #020617)' }}>
      {/* ═══ HEADER ═══ */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0 }}>
                🖥️ Гайд по мониторам
              </h1>
              <p style={{ fontSize: '14px', color: '#9ca3af', margin: '2px 0 0' }}>
                by <span style={{ color: '#22d3ee', fontWeight: 500 }}>Гоша</span>, <span style={{ color: '#22d3ee', fontWeight: 500 }}>djun</span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href="https://t.me/djun1"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: 'rgba(59,130,246,0.1)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59,130,246,0.2)',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                ✈️ Telegram
              </a>
              <a
                href="https://www.youtube.com/@djunn"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                ▶️ YouTube
              </a>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {/* ═══ STATUS BAR ═══ */}
        <div style={{
          marginBottom: '24px',
          background: 'rgba(17,24,39,0.6)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
              {/* Status */}
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#facc15' }}>
                  ⏳ Загрузка данных из таблицы...
                </div>
              ) : error ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#f87171' }}>
                  ❌ {error}
                </div>
              ) : data && data.errors.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#34d399' }}>
                  ✅ Данные загружены
                </div>
              ) : data && data.errors.length > 0 ? (
                <button
                  onClick={() => setShowErrors(!showErrors)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: '#fb923c',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  ⚠️ Загружено, ошибок: <span style={{ color: '#f87171', fontWeight: 700 }}>{data.errors.length}</span>
                </button>
              ) : null}

              {/* Count */}
              {data && !loading && (
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                  Мониторов: <span style={{ color: '#fff', fontWeight: 600 }}>{data.monitors.length}</span>
                </div>
              )}

              {/* Timestamp */}
              {data && !loading && (
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                  Обновлено: <span style={{ color: '#d1d5db' }}>{data.timestamp.toLocaleString('ru-RU')}</span>
                </div>
              )}
            </div>

            {/* Refresh button */}
            <button
              onClick={loadData}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(6,182,212,0.1)',
                color: '#22d3ee',
                border: '1px solid rgba(6,182,212,0.2)',
                fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              🔄 Обновить из таблицы
            </button>
          </div>

          {/* Last monitor spoiler */}
          {data && data.lastMonitor && !loading && (
            <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <button
                onClick={() => setShowLastMonitor(!showLastMonitor)}
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <span style={{ transition: 'transform 0.2s', transform: showLastMonitor ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>▶</span>
                Проверить актуальность: последний монитор в таблице
              </button>
              {showLastMonitor && (
                <div style={{
                  marginTop: '8px',
                  paddingLeft: '16px',
                  borderLeft: '2px solid rgba(6,182,212,0.3)',
                  fontSize: '13px',
                  color: '#d1d5db',
                }}>
                  <strong style={{ color: '#22d3ee' }}>{data.lastMonitor}</strong>
                  <span style={{ color: '#6b7280', marginLeft: '8px' }}>(строка ~{data.totalRows} в таблице)</span>
                </div>
              )}
            </div>
          )}

          {/* Errors detail */}
          {showErrors && data && data.errors.length > 0 && (
            <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <div style={{
                background: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: '8px',
                padding: '12px',
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                <p style={{ fontSize: '12px', color: '#f87171', fontWeight: 600, marginBottom: '8px', marginTop: 0 }}>
                  Ошибки парсинга:
                </p>
                {data.errors.map((err, i) => (
                  <p key={i} style={{ fontSize: '11px', color: 'rgba(252,165,165,0.7)', margin: '2px 0' }}>{err}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ RATING LEGEND ═══ */}
        {data && !loading && (
          <div style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={() => setRatingFilter(ratingFilter === 'recommended' ? 'all' : 'recommended')}
              style={{
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border: ratingFilter === 'recommended' ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(75,85,99,0.5)',
                background: ratingFilter === 'recommended' ? 'rgba(6,182,212,0.15)' : 'rgba(31,41,55,0.5)',
                color: ratingFilter === 'recommended' ? '#22d3ee' : '#9ca3af',
                cursor: 'pointer',
              }}
            >
              ⭐ Рекомендуемые
            </button>
            {(['S', 'A', 'B', 'C', 'D', 'E', 'F'] as Rating[]).map(r => {
              const c = RATING_CONFIG[r];
              const count = ratingCounts[r] || 0;
              if (count === 0) return null;
              const isActive = ratingFilter === r;
              return (
                <button
                  key={r}
                  onClick={() => setRatingFilter(isActive ? 'all' : r)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    border: isActive ? `1px solid ${borderColorMap[r]}` : '1px solid rgba(75,85,99,0.4)',
                    background: isActive ? bgColorMap[r] : 'rgba(31,41,55,0.4)',
                    color: isActive ? borderColorMap[r] : '#9ca3af',
                    cursor: 'pointer',
                  }}
                >
                  {c.emoji} {c.label} <span style={{ opacity: 0.6 }}>({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ═══ FILTERS ═══ */}
        <div style={{
          marginBottom: '24px',
          background: 'rgba(17,24,39,0.4)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '16px',
        }}>
          {/* Search */}
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="🔍 Поиск по названию, панели, комментарию..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '12px',
          }}>
            <SelectFilter
              label="Разрешение"
              value={resFilter}
              onChange={setResFilter}
              options={[
                { value: 'all', label: 'Все' },
                ...filterOptions.resolutions.map(r => ({ value: r, label: r })),
              ]}
            />
            <SelectFilter
              label="Оценка"
              value={ratingFilter}
              onChange={setRatingFilter}
              options={[
                { value: 'recommended', label: '⭐ Рекомендуемые (S/A/B)' },
                { value: 'all', label: 'Все оценки' },
                { value: 'S', label: '👑 S-Tier' },
                { value: 'A', label: '✅ Лучший выбор' },
                { value: 'B', label: '👍 Хороший вариант' },
                { value: 'C', label: '➖ Нормально' },
                { value: 'D', label: '⚠️ Лучше избегать' },
                { value: 'E', label: '❓ Нет информации' },
                { value: 'F', label: '🚫 Не рекомендуется' },
              ]}
            />
            <SelectFilter
              label="Матрица"
              value={matrixFilter}
              onChange={setMatrixFilter}
              options={[
                { value: 'all', label: 'Все' },
                ...filterOptions.matrices.map(m => ({ value: m, label: m })),
              ]}
            />
            <SelectFilter
              label="Диагональ"
              value={diagonalFilter}
              onChange={setDiagonalFilter}
              options={[
                { value: 'all', label: 'Все' },
                ...filterOptions.diagonals.map(d => ({ value: d, label: `${d}"` })),
              ]}
            />
            <SelectFilter
              label="Частота"
              value={refreshFilter}
              onChange={setRefreshFilter}
              options={[
                { value: 'all', label: 'Все' },
                { value: '60-75', label: '60–75 Гц' },
                { value: '144', label: '100–144 Гц' },
                { value: '165-180', label: '165–180 Гц' },
                { value: '200-280', label: '200–280 Гц' },
                { value: '300+', label: '300+ Гц' },
              ]}
            />
            <SelectFilter
              label="Сортировка"
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'rating', label: 'По оценке' },
                { value: 'refresh', label: 'По частоте ↓' },
                { value: 'diagonal', label: 'По диагонали ↑' },
                { value: 'name', label: 'По названию' },
              ]}
            />
          </div>
        </div>

        {/* ═══ RESULTS COUNT ═══ */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
            {loading ? 'Загрузка...' : (
              <>
                Найдено: <span style={{ color: '#fff', fontWeight: 600 }}>{filteredMonitors.length}</span>
                {data && <span style={{ color: '#6b7280' }}> из {data.monitors.length}</span>}
              </>
            )}
          </p>
        </div>

        {/* ═══ LOADING SKELETON ═══ */}
        {loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(17,24,39,0.4)',
                padding: '16px',
              }}>
                <div style={{ height: '20px', background: 'rgba(75,85,99,0.3)', borderRadius: '6px', width: '70%', marginBottom: '12px' }} />
                <div style={{ height: '14px', background: 'rgba(75,85,99,0.2)', borderRadius: '6px', width: '40%', marginBottom: '16px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} style={{ height: '40px', background: 'rgba(75,85,99,0.15)', borderRadius: '8px' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ MONITOR GRID ═══ */}
        {!loading && (
          <>
            {filteredMonitors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 16px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                <p style={{ color: '#9ca3af', fontSize: '18px', margin: '0 0 4px' }}>Мониторы не найдены</p>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Попробуйте изменить фильтры или поисковый запрос</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '16px',
              }}>
                {filteredMonitors.map((m, i) => (
                  <MonitorCard key={`${m.name}-${m.rowIndex}-${i}`} monitor={m} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '64px', padding: '24px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
            Данные из{' '}
            <a
              href="https://docs.google.com/spreadsheets/d/1wTcNBG28l6VL7BXuO_vIlj0ncRNvrCEExy-iGrNFARU/edit?gid=1877328082"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#06b6d4', textDecoration: 'underline' }}
            >
              таблицы Гоши
            </a>
            {' '}• Сайт создан для удобного подбора монитора
          </p>
        </div>
      </footer>
    </div>
  );
}

const borderColorMap: Record<Rating, string> = {
  S: '#d97706', A: '#10b981', B: '#06b6d4', C: '#6b7280',
  D: '#ca8a04', E: '#4b5563', F: '#dc2626',
};

const bgColorMap: Record<Rating, string> = {
  S: 'rgba(120,53,15,0.3)', A: 'rgba(6,78,59,0.25)', B: 'rgba(8,51,68,0.25)',
  C: 'rgba(31,41,55,0.4)', D: 'rgba(113,63,18,0.2)', E: 'rgba(31,41,55,0.3)',
  F: 'rgba(127,29,29,0.2)',
};
