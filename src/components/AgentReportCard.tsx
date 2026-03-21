'use client';

import { useState } from 'react';
import { AgentReport } from '@/lib/scraper/types';
import { CheckCircle, XCircle } from 'lucide-react';
import { useAgentStore } from '@/store/useAgentStore';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type TrendTab = 'discovery' | 'deepdive' | 'synthesis' | 'execution';

function fmt(n: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ────────────────────────────────────────────────────────────
// 공용 UI 컴포넌트
// ────────────────────────────────────────────────────────────

function MagazineHeader({ num, sub, title }: { num: string; sub: string; title: string }) {
  return (
    <div className="mb-12">
      <span className="block text-7xl leading-none font-black text-slate-100 tracking-tighter mb-1">{num}</span>
      <span className="block text-xs font-black text-indigo-600 uppercase tracking-widest mb-3">{sub}</span>
      <h2 className="text-4xl font-black text-slate-900">{title}</h2>
    </div>
  );
}

function InfoHeadline({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`pl-4 border-l-4 border-indigo-600 font-black text-xl text-slate-900 mb-6 ${className ?? ''}`}>
      {children}
    </h3>
  );
}

function DataLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ${className ?? ''}`}>
      {children}
    </span>
  );
}

function SubTabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
        active ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// 차트 컴포넌트
// ────────────────────────────────────────────────────────────

function ToneDistributionChart({ analyzedData }: { analyzedData: any[] }) {
  const counts: Record<string, number> = {};
  analyzedData.forEach((acc) => {
    const palette = (acc.visuals?.feed_tone?.palette ?? '기타').toLowerCase();
    const key = palette.includes('웜') ? '웜/저채도'
      : palette.includes('쿨') || palette.includes('모노') ? '쿨/모노크롬'
      : palette.includes('파스텔') ? '파스텔톤'
      : palette.includes('팝') || palette.includes('비비드') ? '고채도/팝'
      : '기타';
    counts[key] = (counts[key] ?? 0) + 1;
  });

  const labels = Object.keys(counts);
  const data = {
    labels,
    datasets: [
      {
        data: Object.values(counts),
        backgroundColor: ['#d97706', '#64748b', '#ec4899', '#6366f1', '#e2e8f0'],
        borderWidth: 0,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%' as const,
    plugins: {
      legend: { position: 'right' as const, labels: { font: { size: 12 }, boxWidth: 12 } },
      tooltip: { enabled: true },
    },
  };

  return (
    <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-lg">
      <InfoHeadline className="text-center mb-8">비주얼 톤 분포</InfoHeadline>
      <div className="w-full h-64 flex items-center justify-center">
        <Doughnut data={data} options={options} />
      </div>
      <p className="text-center mt-6 text-xs font-bold text-slate-500 bg-slate-50 py-3 rounded-xl border border-slate-100">
        {labels[0] ? `${labels[0]}(${Math.round((Object.values(counts)[0] / analyzedData.length) * 100)}%)가 시장 트렌드 주도 중` : '톤 분포 분석 완료'}
      </p>
    </div>
  );
}

function FormatDistributionChart({ analyzedData }: { analyzedData: any[] }) {
  let carousel = 0, reels = 0, single = 0, count = 0;
  analyzedData.forEach((acc) => {
    const ratio = acc.visuals?.grid_strategy?.content_ratio ?? {};
    if (ratio.carousel != null || ratio.reels != null || ratio.single_image != null) {
      carousel += ratio.carousel ?? 0;
      reels += ratio.reels ?? 0;
      single += ratio.single_image ?? 0;
      count++;
    }
  });
  const total = carousel + reels + single;
  const vals = total > 0
    ? [Math.round((carousel / total) * 100), Math.round((reels / total) * 100), Math.round((single / total) * 100)]
    : [33, 33, 34];

  const data = {
    labels: ['카루셀(다중)', '릴스(숏폼)', '단일 이미지'],
    datasets: [
      {
        data: vals,
        backgroundColor: ['#4f46e5', '#14b8a6', '#cbd5e1'],
        borderRadius: 8,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 12, weight: 'bold' as const } } },
    },
  };

  return (
    <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-lg">
      <InfoHeadline className="text-center mb-8">주력 포맷 점유율</InfoHeadline>
      <div className="w-full h-64 flex items-center justify-center">
        <Bar data={data} options={options} />
      </div>
      <p className="text-center mt-6 text-xs font-bold text-slate-500 bg-slate-50 py-3 rounded-xl border border-slate-100">
        {vals[0] >= vals[1] && vals[0] >= vals[2]
          ? `카루셀(${vals[0]}%) 스토리텔링형 강세`
          : vals[1] >= vals[2]
          ? `릴스(${vals[1]}%) 숏폼 콘텐츠 주도`
          : `단일 이미지(${vals[2]}%) 중심`}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 탭 1: 탐색 및 요약 (Discovery)
// ────────────────────────────────────────────────────────────

function DiscoveryPane({
  report,
  prompt,
  discoveryResult,
  analyzedData,
}: {
  report: AgentReport;
  prompt: string;
  discoveryResult: any;
  analyzedData: any[];
}) {
  return (
    <div className="space-y-14 pb-20">
      <MagazineHeader num="STEP 1" sub="Discovery & Persona" title="리서치 탐색 조건 및 전체 요약" />

      {/* 핵심 답변 히어로 */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-900 p-12 lg:p-16 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-[500px] h-[500px] bg-indigo-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30 pointer-events-none" />
        <span className="bg-white/10 border border-white/20 text-[10px] px-4 py-2 rounded-full font-bold uppercase tracking-wider mb-8 inline-block relative z-10">
          질문에 대한 핵심 답변
        </span>
        <h3 className="text-2xl md:text-3xl font-black mb-6 leading-tight relative z-10 text-indigo-50 mt-4">
          "{prompt}"
        </h3>
        <p className="text-lg text-indigo-100 leading-relaxed max-w-4xl relative z-10 font-medium">
          {report.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* 탐색 조건 */}
        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-lg border-t-[8px] border-t-indigo-500">
          <InfoHeadline>탐색 조건 (Discovery Criteria)</InfoHeadline>
          <div className="space-y-8">
            {discoveryResult?.persona && (
              <div>
                <DataLabel>분석 페르소나 정의</DataLabel>
                <p className="text-xl font-black text-slate-900 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  "{discoveryResult.persona}"
                </p>
              </div>
            )}
            {discoveryResult?.analysis_criteria?.length > 0 && (
              <div>
                <DataLabel>핵심 분석 기준</DataLabel>
                <ul className="text-base text-slate-700 font-bold space-y-4">
                  {discoveryResult.analysis_criteria.map((c: string, i: number) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm shrink-0">
                        {i + 1}
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 분석 완료 계정 */}
        <div className="bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] p-10 rounded-3xl border border-slate-200">
          <InfoHeadline>관련 계정 추천 및 분석 완료</InfoHeadline>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg">
            <ul className="space-y-3 text-sm font-medium">
              {analyzedData.map((acc: any, i: number) => (
                <li
                  key={i}
                  className={`flex justify-between items-center px-5 py-4 rounded-xl ${
                    i === 0 ? 'bg-indigo-50 text-indigo-900 border border-indigo-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`font-black ${i === 0 ? 'text-lg' : 'text-slate-800'}`}>
                    {i + 1}. @{acc.profile?.username}
                  </span>
                  <span className={`font-bold text-xs ${i === 0 ? 'bg-white px-3 py-1.5 rounded-lg shadow-sm border border-indigo-100' : 'text-slate-500'}`}>
                    {acc.profile?.followers_count ? fmt(acc.profile.followers_count) : '-'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <span className="inline-block bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-full">
                총 {analyzedData.length}개 계정 데이터 병합 분석 완료
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 탭 2: 심층 매트릭스 (Deep Dive)
// ────────────────────────────────────────────────────────────

function DeepDivePane({ analyzedData }: { analyzedData: any[] }) {
  return (
    <div className="space-y-14 pb-20">
      <MagazineHeader num="STEP 2" sub="Deep Dive & Cross Matrix" title="계정별 심층 분석 데이터 및 매트릭스" />

      {/* 차트 2개 */}
      {analyzedData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ToneDistributionChart analyzedData={analyzedData} />
          <FormatDistributionChart analyzedData={analyzedData} />
        </div>
      )}

      {/* 교차 분석 테이블 */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <InfoHeadline className="mb-0 text-xl">주요 계정 교차 분석 매트릭스</InfoHeadline>
          <span className="text-[10px] font-bold text-white bg-slate-900 px-3 py-1.5 rounded-lg">
            {analyzedData.length} SAMPLES
          </span>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left text-sm text-slate-700 min-w-[900px]">
            <thead className="text-[11px] text-slate-500 uppercase bg-white border-b-2 border-slate-200">
              <tr>
                <th className="px-8 py-5 font-black">계정명</th>
                <th className="px-8 py-5 font-black">메인 팔레트</th>
                <th className="px-8 py-5 font-black">텍스트 오버레이</th>
                <th className="px-8 py-5 font-black">1순위 포맷</th>
                <th className="px-8 py-5 font-black">아이덴티티 점수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {analyzedData.map((acc: any, i: number) => {
                const v = acc.visuals ?? {};
                const score = v.visual_identity?.score;
                const palette = v.feed_tone?.palette ?? '—';
                const textOverlay = v.composition?.text_overlay ?? '—';
                const ratio = v.grid_strategy?.content_ratio ?? {};
                const topFormat =
                  (ratio.carousel ?? 0) >= (ratio.reels ?? 0) && (ratio.carousel ?? 0) >= (ratio.single_image ?? 0)
                    ? `카루셀 (${ratio.carousel}%)`
                    : (ratio.reels ?? 0) >= (ratio.single_image ?? 0)
                    ? `릴스 (${ratio.reels}%)`
                    : `단일 (${ratio.single_image ?? 0}%)`;

                return (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="px-8 py-6 font-black text-indigo-600 text-base">@{acc.profile?.username}</td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-xs font-bold leading-tight inline-block max-w-[160px]">
                        {palette}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-xs text-slate-600 leading-relaxed max-w-[200px]">
                      {textOverlay.length > 50 ? textOverlay.slice(0, 50) + '…' : textOverlay}
                    </td>
                    <td className="px-8 py-6 text-xs font-bold">{topFormat}</td>
                    <td className="px-8 py-6">
                      {score != null ? (
                        <div className="flex items-center gap-3">
                          <span className="font-black text-lg w-6">{score}</span>
                          <div className="w-32 bg-slate-200 h-3 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${score * 10}%` }} />
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 계정별 캡션 전략 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analyzedData.map((acc: any, i: number) => {
          const c = acc.captions ?? {};
          const avgLikes =
            acc.posts?.length > 0
              ? Math.round(acc.posts.reduce((a: number, p: any) => a + (p.likes_count ?? 0), 0) / acc.posts.length)
              : null;
          return (
            <div key={i} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-black text-sm">{i + 1}</span>
                  <span className="font-black text-slate-900 text-base">@{acc.profile?.username}</span>
                </div>
                {avgLikes != null && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    평균 ♥ {fmt(avgLikes)}
                  </span>
                )}
              </div>
              {c.tone_manner?.speech_style && (
                <div className="mb-4">
                  <DataLabel>말투 스타일</DataLabel>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 inline-block">
                    {c.tone_manner.speech_style}
                  </span>
                </div>
              )}
              {c.caption_strategy?.hook_style && (
                <div className="mb-4">
                  <DataLabel>훅 전략</DataLabel>
                  <p className="text-xs text-slate-600 leading-relaxed">{c.caption_strategy.hook_style}</p>
                </div>
              )}
              {c.caption_strategy?.cta_pattern && (
                <div className="mb-4">
                  <DataLabel>CTA 패턴</DataLabel>
                  <p className="text-xs text-slate-600 leading-relaxed">{c.caption_strategy.cta_pattern}</p>
                </div>
              )}
              {c.content_categories?.top_themes?.length > 0 && (
                <div className="mb-4">
                  <DataLabel>주력 테마</DataLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {c.content_categories.top_themes.map((t: string, j: number) => (
                      <span key={j} className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {c.summary && (
                <div>
                  <DataLabel>요약</DataLabel>
                  <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{c.summary}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 탭 3: 종합 & 무드보드 (Synthesis)
// ────────────────────────────────────────────────────────────

function SynthesisPane({ report, analyzedData }: { report: AgentReport; analyzedData: any[] }) {
  return (
    <div className="space-y-14 pb-20">
      <MagazineHeader num="STEP 3" sub="Synthesis & Moodboard" title="핵심 패턴 종합 및 시각적 무드보드" />

      {/* 핵심 패턴 Top */}
      {report.keyPatterns?.length > 0 && (
        <div className="bg-white p-10 lg:p-14 rounded-3xl border border-slate-200 shadow-xl">
          <InfoHeadline className="text-2xl mb-10">계정들을 가로지르는 핵심 공통 패턴</InfoHeadline>
          <div className="space-y-5">
            {report.keyPatterns.map((p, i) => (
              <div
                key={i}
                className="flex flex-col md:flex-row gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 items-start md:items-center hover:bg-white hover:shadow-md transition"
              >
                <span
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 shadow-lg ${
                    i < 2 ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {i + 1}
                </span>
                <p className="text-base text-slate-700 leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 비주얼 트렌드 / 캡션 트렌드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {report.visualTrends?.length > 0 && (
          <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl border-t-[8px] border-t-indigo-400">
            <InfoHeadline className="text-xl mb-8">공통 비주얼 트렌드</InfoHeadline>
            <ul className="text-sm text-slate-700 space-y-5">
              {report.visualTrends.map((t, i) => (
                <li key={i} className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                  <strong className="text-indigo-900 block text-base mb-1.5">{i + 1}. {t.split('：')[0] || t.split(':')[0] || t}</strong>
                  {t.includes('：') ? <p className="text-slate-600 leading-relaxed">{t.split('：').slice(1).join('：')}</p>
                   : t.includes(':') ? <p className="text-slate-600 leading-relaxed">{t.split(':').slice(1).join(':')}</p>
                   : null}
                </li>
              ))}
            </ul>
          </div>
        )}
        {report.captionTrends?.length > 0 && (
          <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl border-t-[8px] border-t-teal-400">
            <InfoHeadline className="text-xl mb-8">공통 캡션/화법 트렌드</InfoHeadline>
            <ul className="text-sm text-slate-700 space-y-5">
              {report.captionTrends.map((t, i) => (
                <li key={i} className="bg-teal-50 p-5 rounded-2xl border border-teal-100">
                  <strong className="text-teal-900 block text-base mb-1.5">{i + 1}. {t.split('：')[0] || t.split(':')[0] || t}</strong>
                  {t.includes('：') ? <p className="text-slate-600 leading-relaxed">{t.split('：').slice(1).join('：')}</p>
                   : t.includes(':') ? <p className="text-slate-600 leading-relaxed">{t.split(':').slice(1).join(':')}</p>
                   : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 무드보드 갤러리 — Pinterest 마스너리 */}
      {analyzedData.some((acc) => acc.posts?.some((p: any) => p.image_urls?.[0])) && (
        <div className="bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] p-12 rounded-3xl border border-slate-200">
          <InfoHeadline className="text-2xl mb-10">시각적 트렌드 증거 모음 (무드보드)</InfoHeadline>
          <div className="columns-2 md:columns-3 lg:columns-4 gap-5 space-y-5">
            {analyzedData
              .flatMap((acc: any) =>
                (acc.posts ?? []).map((p: any) => ({
                  url: p.image_urls?.[0],
                  username: acc.profile?.username,
                  palette: acc.visuals?.feed_tone?.palette,
                }))
              )
              .filter((item) => item.url)
              .slice(0, 12)
              .map((item, i) => (
                <div key={i} className="break-inside-avoid relative group rounded-3xl overflow-hidden shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt=""
                    className="w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    style={{ minHeight: '120px', background: '#f1f5f9' }}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-300 flex items-end justify-center pb-4">
                    <span className="text-white text-xs font-bold border border-white px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                      @{item.username}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 분석 근거 계정 */}
      {report.supportingAccounts?.length > 0 && (
        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
          <InfoHeadline>분석 근거 계정 (AI 선정 이유)</InfoHeadline>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.supportingAccounts.map((acc, i) => (
              <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4 items-start">
                <span className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm shrink-0">{i + 1}</span>
                <div>
                  <p className="font-black text-sm text-indigo-600 mb-1.5">@{acc.username}</p>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{acc.reasonToInclude}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 탭 4: SWOT & 실행 (Execution)
// ────────────────────────────────────────────────────────────

function ExecutionPane({ report }: { report: AgentReport }) {
  const swot = report.swot ?? { strengths: [], weaknesses: [], opportunities: [], threats: [] };

  return (
    <div className="space-y-14 pb-20">
      <MagazineHeader num="CONCLUSION" sub="SWOT & Action Strategy" title="트렌드 적용 리스크 및 최종 실행 권고" />

      {/* 트렌드 SWOT */}
      <div className="bg-slate-900 p-10 lg:p-14 rounded-3xl shadow-2xl">
        <h3 className="pl-4 border-l-4 border-indigo-500 font-black text-3xl text-white mb-12">
          트렌드 자체의 SWOT (도입 시 장단점)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-white">
          {[
            { key: 'strengths', label: 'S (트렌드 강점)', color: 'text-blue-400' },
            { key: 'weaknesses', label: 'W (트렌드 약점)', color: 'text-red-400' },
            { key: 'opportunities', label: 'O (트렌드 기회)', color: 'text-green-400' },
            { key: 'threats', label: 'T (트렌드 위협)', color: 'text-orange-400' },
          ].map(({ key, label, color }) => (
            <div key={key} className="bg-white/10 p-8 rounded-3xl border border-white/20">
              <span className={`${color} font-black text-xl mb-5 block`}>{label}</span>
              <ul className="space-y-3 text-sm font-medium text-slate-200 list-disc pl-5">
                {((swot as any)[key] ?? []).map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* 한계점 & 실행 전략 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* 분석 한계점 */}
        {report.limitations && (
          <div className="lg:col-span-1 bg-red-50 p-10 rounded-3xl border border-red-200 flex flex-col justify-center">
            <InfoHeadline className="text-red-800 border-l-red-600 text-xl mb-6">⚠️ 분석 한계점 및 편향성</InfoHeadline>
            <p className="text-base text-red-900 leading-relaxed mb-6 font-medium">{report.limitations}</p>
            <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm">
              <strong className="block text-red-800 mb-2 text-sm">해석 주의사항</strong>
              <p className="text-xs text-slate-700 leading-relaxed">
                트렌드는 브랜드 '무드' 베이스로만 적용하되, 신규 유입을 위한 퍼포먼스 콘텐츠를 병행하는 듀얼 트랙 전략을 권장합니다.
              </p>
            </div>
          </div>
        )}

        {/* 실행 전략 */}
        {report.recommendations?.length > 0 && (
          <div className={`${report.limitations ? 'lg:col-span-2' : 'lg:col-span-3'} bg-indigo-50 p-10 lg:p-14 rounded-3xl border border-indigo-100`}>
            <InfoHeadline className="text-indigo-900 border-l-indigo-600 text-2xl mb-10">
              트렌드 활용을 위한 실행 전략
            </InfoHeadline>
            <div className="space-y-6">
              {report.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="bg-white p-8 rounded-2xl shadow-lg border border-indigo-50 flex flex-col md:flex-row gap-6 items-start md:items-center"
                >
                  <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-lg shadow-indigo-500/30">
                    A{i + 1}
                  </div>
                  <p className="text-base text-slate-700 leading-relaxed font-medium">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────

interface Props {
  report: AgentReport;
  analyzedData?: any[];
  failedAccounts?: string[];
}

export default function AgentReportCard({ report, analyzedData = [], failedAccounts = [] }: Props) {
  const [activeTab, setActiveTab] = useState<TrendTab>('discovery');
  const { prompt, discoveryResult } = useAgentStore();

  if (!report) return null;

  const tabs: { key: TrendTab; label: string }[] = [
    { key: 'discovery', label: '1단계: 탐색 및 요약' },
    { key: 'deepdive', label: '2단계: 심층 매트릭스' },
    { key: 'synthesis', label: '3단계: 종합 & 무드보드' },
    { key: 'execution', label: '결론: SWOT & 실행' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mt-10">
      {/* 분석 현황 */}
      {(analyzedData.length > 0 || failedAccounts.length > 0) && (
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Status:</span>
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-100">
            <CheckCircle className="w-2.5 h-2.5" />{analyzedData.length} SUCCESS
          </span>
          {failedAccounts.length > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded border border-red-100">
              <XCircle className="w-2.5 h-2.5" />{failedAccounts.length} FAILED
            </span>
          )}
        </div>
      )}

      {/* 서브 탭 네비게이션 */}
      <div className="flex flex-wrap gap-2 mb-10 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm w-full overflow-x-auto scrollbar-hide">
        {tabs.map((t) => (
          <SubTabBtn
            key={t.key}
            active={activeTab === t.key}
            onClick={() => {
              setActiveTab(t.key);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            {t.label}
          </SubTabBtn>
        ))}
      </div>

      <div className="animate-in fade-in duration-700">
        {activeTab === 'discovery' && (
          <DiscoveryPane report={report} prompt={prompt} discoveryResult={discoveryResult} analyzedData={analyzedData} />
        )}
        {activeTab === 'deepdive' && <DeepDivePane analyzedData={analyzedData} />}
        {activeTab === 'synthesis' && <SynthesisPane report={report} analyzedData={analyzedData} />}
        {activeTab === 'execution' && <ExecutionPane report={report} />}
      </div>
    </div>
  );
}
