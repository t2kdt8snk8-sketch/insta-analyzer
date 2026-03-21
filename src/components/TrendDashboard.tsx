'use client';

import React from 'react';
import { AgentReport } from '@/lib/scraper/types';

interface AnalyzedAccountData {
  profile: { username: string };
  posts: { image_url?: string }[];
  captions?: { hashtag_strategy?: { examples: string[] } };
  visuals?: {
    visual_identity?: { score: number };
    feed_tone?: { palette: string[] };
  };
}

interface Props {
  report: AgentReport;
  analyzedData?: AnalyzedAccountData[];
  failedAccounts?: string[];
}

// ── Sub-components ────────────────────────────────────────────

function SemiGauge({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.min(value / max, 1);
  const arcLen = Math.PI * 55;
  return (
    <svg width="130" height="75" viewBox="0 0 130 75">
      <path d="M 10 70 A 55 55 0 0 1 120 70" fill="none" stroke="#111" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M 10 70 A 55 55 0 0 1 120 70"
        fill="none"
        stroke="#00FFFF"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${pct * arcLen} ${arcLen}`}
        style={{ filter: 'drop-shadow(0 0 6px #00FFFF)' }}
      />
      <text x="65" y="58" textAnchor="middle" fill="#00FFFF" fontSize="22" fontWeight="900" fontFamily="monospace">
        {value}
      </text>
      <text x="65" y="70" textAnchor="middle" fill="#334155" fontSize="9" fontFamily="monospace">
        / {max}
      </text>
    </svg>
  );
}

function VisualAnchor({ text }: { text: string }) {
  return (
    <span
      className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
      aria-hidden="true"
    >
      <span
        className="text-[15rem] font-black italic leading-none text-white whitespace-nowrap"
        style={{ opacity: 0.03 }}
      >
        {text}
      </span>
    </span>
  );
}

function PatternRow({ text, index }: { text: string; index: number }) {
  const summary = text.length > 80 ? text.substring(0, 77) + '…' : text;
  const hasMore = text.length > 80;
  return (
    <div className="group border-b border-[#0d0d0d] last:border-0">
      <div className="flex gap-5 py-4 items-start">
        <span className="font-mono text-[10px] text-slate-800 shrink-0 pt-0.5">
          {String(index).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
          {hasMore && (
            <div className="overflow-hidden max-h-0 group-hover:max-h-32 transition-[max-height] duration-500 ease-out">
              <p className="text-xs text-slate-500 leading-relaxed pt-2">{text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SwotCard({
  title,
  items,
  variant,
}: {
  title: string;
  items?: string[];
  variant: 'strength' | 'weakness' | 'opportunity' | 'threat';
}) {
  const accent = {
    strength: '#00FFFF',
    weakness: '#FF6B6B',
    opportunity: '#51CF66',
    threat: '#FF4500',
  }[variant];

  return (
    <div
      className={`relative p-6 bg-[#050505] overflow-hidden ${variant === 'threat' ? 'glitch-card' : ''}`}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
      />
      <p
        className="text-[10px] font-mono tracking-[0.3em] mb-5 uppercase"
        style={{ color: accent }}
      >
        {title}
      </p>
      <ul className="space-y-3">
        {items?.map((s, i) => (
          <li key={i} className="text-sm text-slate-400 leading-relaxed">
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AccountCard({ data }: { data: AnalyzedAccountData }) {
  const username = data.profile.username;
  const image = data.posts[0]?.image_url;
  const score = data.visuals?.visual_identity?.score ?? 0;
  const rawPalette = data.visuals?.feed_tone?.palette;
  const palette = Array.isArray(rawPalette) ? rawPalette : [];
  const rawHashtags = data.captions?.hashtag_strategy?.examples;
  const hashtags = Array.isArray(rawHashtags) ? rawHashtags : [];

  return (
    <div className="bg-[#050505] p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 shrink-0 bg-[#111] overflow-hidden flex items-center justify-center">
          {image ? (
            <img src={image} alt={username} className="w-full h-full object-cover grayscale" />
          ) : (
            <span className="text-xl font-black text-slate-700">
              {username.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p className="text-[10px] font-mono text-slate-700">// ACCOUNT</p>
          <h3 className="text-lg font-black text-[#E2E8F0] tracking-tighter">@{username}</h3>
        </div>
      </div>

      {/* Score gauge */}
      {score > 0 && (
        <div className="flex flex-col items-center">
          <SemiGauge value={score} max={10} />
          <p className="text-[10px] font-mono text-slate-700 tracking-widest uppercase mt-1">
            Visual Score
          </p>
        </div>
      )}

      {/* Color swatches */}
      {palette.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-slate-700 tracking-widest uppercase">Palette</p>
          <div className="flex gap-1 flex-wrap">
            {palette.map((clr, i) => (
              <div key={i} className="group/swatch relative">
                <div
                  className="w-8 h-8 border border-[#1a1a1a]"
                  style={{ backgroundColor: clr }}
                  title={clr}
                />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[8px] font-mono text-[#00FFFF] opacity-0 group-hover/swatch:opacity-100 transition-opacity whitespace-nowrap bg-black px-1 pointer-events-none">
                  {clr}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hashtags */}
      {hashtags.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-slate-700 tracking-widest uppercase">Hashtags</p>
          <div className="flex flex-wrap gap-1.5">
            {hashtags.slice(0, 6).map((tag, i) => (
              <span
                key={i}
                className="text-[10px] font-mono px-2 py-0.5 border border-[#1a1a1a] text-slate-500"
              >
                #{tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function TrendDashboard({ report, analyzedData = [], failedAccounts = [] }: Props) {
  const avgScore = (() => {
    const scores = analyzedData
      .map((d) => d.visuals?.visual_identity?.score)
      .filter((s): s is number => typeof s === 'number');
    if (!scores.length) return null;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  })();

  return (
    <div className="bg-black text-[#E2E8F0] font-sans">
      <style>{`
        @keyframes glitch {
          0%, 85%, 100% { transform: translate(0); filter: none; }
          86% { transform: translate(-3px, 1px); filter: hue-rotate(90deg); }
          87% { transform: translate(3px, -2px); clip-path: inset(15% 0 70% 0); }
          88% { transform: translate(0); filter: none; clip-path: none; }
          92% { transform: translate(2px, 1px); }
          93% { clip-path: inset(60% 0 8% 0); color: #FF4500; }
          94% { transform: translate(-1px, 0); clip-path: none; color: inherit; }
        }
        .glitch-card { animation: glitch 5s infinite; }
      `}</style>

      {/* ── Hero: Summary ── */}
      <section className="relative p-12 border-b border-[#0d0d0d] overflow-hidden">
        <VisualAnchor text="INSIGHT" />
        <div className="relative z-10">
          <p className="text-[10px] font-mono tracking-[0.4em] mb-6 uppercase" style={{ color: '#00FFFF' }}>
            // TREND_ANALYSIS_REPORT
          </p>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-white italic uppercase leading-none mb-8">
            Trend<br />
            <span style={{ color: '#00FFFF' }}>Intelligence</span>
          </h1>
          <p className="text-base text-slate-400 leading-relaxed max-w-3xl">{report.summary}</p>
          {failedAccounts.length > 0 && (
            <p className="mt-6 text-[10px] font-mono text-slate-700">
              FAILED_ACCOUNTS: {failedAccounts.join(', ')}
            </p>
          )}
        </div>
      </section>

      {/* ── Bento Row 1: Key Patterns (70%) + Stats (30%) ── */}
      <section className="grid grid-cols-10 border-b border-[#0d0d0d]">
        <div className="col-span-10 lg:col-span-7 relative p-10 border-r border-[#0d0d0d] overflow-hidden">
          <VisualAnchor text="PATTERN" />
          <div className="relative z-10">
            <p className="text-[10px] font-mono tracking-[0.4em] mb-2 uppercase" style={{ color: '#00FFFF' }}>
              // 01_KEY_PATTERNS
            </p>
            <h2 className="text-4xl font-black tracking-tighter text-white italic mb-8">핵심 공통 패턴</h2>
            <div>
              {report.keyPatterns?.map((p, i) => (
                <PatternRow key={i} text={p} index={i + 1} />
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-10 lg:col-span-3 p-10 flex flex-col gap-10">
          <div>
            <p className="text-[10px] font-mono text-slate-700 tracking-widest uppercase mb-3">Analyzed</p>
            <p className="text-7xl font-black text-white leading-none">{analyzedData.length}</p>
            <p className="text-[10px] font-mono text-slate-700 mt-2">ACCOUNTS</p>
          </div>
          {avgScore !== null && (
            <div>
              <p className="text-[10px] font-mono text-slate-700 tracking-widest uppercase mb-3">
                Avg Visual Score
              </p>
              <SemiGauge value={avgScore} max={10} />
            </div>
          )}
        </div>
      </section>

      {/* ── Visual Trends (70%) + Palette Overview (30%) ── */}
      <section className="grid grid-cols-10 border-b border-[#0d0d0d]">
        <div className="col-span-10 lg:col-span-7 relative p-10 border-r border-[#0d0d0d] overflow-hidden">
          <VisualAnchor text="VISUAL" />
          <div className="relative z-10">
            <p className="text-[10px] font-mono tracking-[0.4em] mb-2 uppercase" style={{ color: '#00FFFF' }}>
              // 02_VISUAL_TRENDS
            </p>
            <h2 className="text-4xl font-black tracking-tighter text-white italic mb-8">비주얼 트렌드</h2>
            <div>
              {report.visualTrends?.map((t, i) => (
                <PatternRow key={i} text={t} index={i + 1} />
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-10 lg:col-span-3 p-10">
          <p className="text-[10px] font-mono text-slate-700 tracking-widest uppercase mb-6">
            // Collected Palettes
          </p>
          <div className="space-y-6">
            {analyzedData.map((d, i) => {
              const rawP = d.visuals?.feed_tone?.palette;
              const pal = Array.isArray(rawP) ? rawP : [];
              if (!pal.length) return null;
              return (
                <div key={i} className="space-y-1.5">
                  <p className="text-[10px] font-mono text-slate-700">@{d.profile.username}</p>
                  <div className="flex gap-0.5">
                    {pal.map((clr, j) => (
                      <div key={j} className="flex-1 h-3" style={{ backgroundColor: clr }} title={clr} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Caption Trends ── */}
      <section className="relative p-10 border-b border-[#0d0d0d] overflow-hidden">
        <VisualAnchor text="CAPTION" />
        <div className="relative z-10">
          <p className="text-[10px] font-mono tracking-[0.4em] mb-2 uppercase" style={{ color: '#00FFFF' }}>
            // 03_CAPTION_TRENDS
          </p>
          <h2 className="text-4xl font-black tracking-tighter text-white italic mb-8">캡션 전략 트렌드</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16">
            {report.captionTrends?.map((t, i) => (
              <PatternRow key={i} text={t} index={i + 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SWOT ── */}
      <section className="relative p-10 border-b border-[#0d0d0d] overflow-hidden">
        <VisualAnchor text="SWOT" />
        <div className="relative z-10">
          <p className="text-[10px] font-mono tracking-[0.4em] mb-2 uppercase" style={{ color: '#00FFFF' }}>
            // 04_SWOT_MATRIX
          </p>
          <h2 className="text-4xl font-black tracking-tighter text-white italic mb-8">트렌드 SWOT</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#0d0d0d]">
            <SwotCard title="STRENGTHS" items={report.swot?.strengths} variant="strength" />
            <SwotCard title="WEAKNESSES" items={report.swot?.weaknesses} variant="weakness" />
            <SwotCard title="OPPORTUNITIES" items={report.swot?.opportunities} variant="opportunity" />
            <SwotCard title="THREATS" items={report.swot?.threats} variant="threat" />
          </div>
        </div>
      </section>

      {/* ── Recommendations (70%) + Limitations + Supporting (30%) ── */}
      <section className="grid grid-cols-10 border-b border-[#0d0d0d]">
        <div className="col-span-10 lg:col-span-7 relative p-10 border-r border-[#0d0d0d] overflow-hidden">
          <VisualAnchor text="STRATEGY" />
          <div className="relative z-10">
            <p className="text-[10px] font-mono tracking-[0.4em] mb-2 uppercase" style={{ color: '#00FFFF' }}>
              // 05_RECOMMENDATIONS
            </p>
            <h2 className="text-4xl font-black tracking-tighter text-white italic mb-8">실행 전략</h2>
            <div>
              {report.recommendations?.map((rec, i) => (
                <div key={i} className="flex gap-5 border-b border-[#0d0d0d] last:border-0 py-4">
                  <span className="font-mono text-[10px] text-slate-800 shrink-0 pt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-10 lg:col-span-3 p-10 space-y-10">
          {report.limitations && (
            <div>
              <p className="text-[10px] font-mono text-slate-700 tracking-widest uppercase mb-4">
                // Limitations
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">{report.limitations}</p>
            </div>
          )}

          {report.supportingAccounts?.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-slate-700 tracking-widest uppercase mb-4">
                // Supporting Accounts
              </p>
              <div className="space-y-4">
                {report.supportingAccounts.map((acc, i) => (
                  <div key={i} className="border-l border-[#1a1a1a] pl-3">
                    <p className="text-xs font-mono font-bold" style={{ color: '#00FFFF' }}>
                      @{acc.username}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">
                      {acc.reasonToInclude}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Reference Accounts ── */}
      {analyzedData.length > 0 && (
        <section className="relative p-10 overflow-hidden">
          <VisualAnchor text="ACCOUNTS" />
          <div className="relative z-10">
            <p className="text-[10px] font-mono tracking-[0.4em] mb-2 uppercase" style={{ color: '#00FFFF' }}>
              // 06_REFERENCE_ACCOUNTS
            </p>
            <h2 className="text-4xl font-black tracking-tighter text-white italic mb-8">레퍼런스 계정</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#0d0d0d]">
              {analyzedData.map((d, i) => (
                <AccountCard key={i} data={d} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
