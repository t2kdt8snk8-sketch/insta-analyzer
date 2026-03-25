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
  PointElement,
  ScatterController,
  RadarController,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Bar, Scatter, Radar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, ScatterController, RadarController, RadialLinearScale, Filler, Tooltip, Legend);

type TrendTab = 'discovery' | 'deepdive' | 'synthesis' | 'execution';

// ── Utils ──────────────────────────────────────────────────────

function fmt(n: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getPaletteColors(palette: string): string[] {
  const p = (palette ?? '').toLowerCase();
  if (p.includes('웜') || p.includes('warm')) return ['#C8956A', '#D4A87A', '#E8C99A', '#B8852A'];
  if (p.includes('쿨') || p.includes('cool') || p.includes('블루') || p.includes('blue')) return ['#6490B8', '#94B0C8', '#7C92AC', '#4A6890'];
  if (p.includes('파스텔') || p.includes('pastel') || p.includes('핑크') || p.includes('pink')) return ['#F5C6D0', '#F5A0B0', '#E88090', '#FFC8D0'];
  if (p.includes('모노') || p.includes('흑백') || p.includes('mono') || p.includes('다크') || p.includes('dark')) return ['#1A1A1A', '#555', '#AAA', '#E8E8E8'];
  if (p.includes('팝') || p.includes('비비드') || p.includes('vivid')) return ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF'];
  if (p.includes('그린') || p.includes('green') || p.includes('올리브')) return ['#4A7C59', '#78A86B', '#A8C89B', '#D4E8CC'];
  if (p.includes('퍼플') || p.includes('purple') || p.includes('라벤더')) return ['#7C5C9A', '#A07CC0', '#C4A0E0', '#E0D0F5'];
  if (p.includes('베이지') || p.includes('크림') || p.includes('어스') || p.includes('뉴트럴')) return ['#D4C4A8', '#C8B89A', '#E8DCC8', '#B8A88A'];
  return ['#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9'];
}

const KO_STOPWORDS = new Set([
  '그리고','하지만','또한','따라서','때문에','그러나','또는','그래서',
  '있는','있으며','이며','이다','이고','가장','매우','특히','주로',
  '전반적으로','상당히','통해','으로서','에서','에는','있어서','하고',
  '합니다','됩니다','보입니다','활용','사용','보여','강조','구성',
  '방식','스타일','느낌','분위기','계정','포스팅','일관성','전략',
]);


function KeywordText({
  text, keywords = [],
  baseClass = 'text-base text-slate-500 leading-relaxed',
  keyClass = 'text-2xl text-slate-900 leading-tight',
}: { text: string; keywords?: string[]; baseClass?: string; keyClass?: string }) {
  if (!text) return null;
  const kwSet = new Set(keywords.map(k => k.toLowerCase()));
  return (
    <>
      {text.split(' ').map((word, i, arr) => {
        const clean = word.replace(/[,.\!?:；。]/g, '').toLowerCase();
        const isKeyword = kwSet.size > 0 && kwSet.has(clean);
        return (
          <span key={i} className={isKeyword ? keyClass : baseClass}>
            {word}{i < arr.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </>
  );
}

function SectionHeader({ tag, title, tagColor = '#5E81F4', titleClass }: {
  tag: string; title: string; tagColor?: string; titleClass?: string;
}) {
  return (
    <div className="mb-10">
      <span
        className="inline-block text-[11px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-4"
        style={{ background: `${tagColor}15`, color: tagColor }}
      >
        {tag}
      </span>
      <h2 className={titleClass ?? 'text-4xl font-black tracking-tight text-slate-900 leading-tight'}>{title}</h2>
      <div className="h-px bg-slate-100 mt-5" />
    </div>
  );
}

function PostImg({ src, className }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={`bg-slate-100 ${className ?? ''}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`object-cover ${className ?? ''}`}
      referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  );
}

// ── Tab Nav ────────────────────────────────────────────────────

function TabNav({ active, onChange }: { active: TrendTab; onChange: (t: TrendTab) => void }) {
  const tabs: { key: TrendTab; label: string }[] = [
    { key: 'discovery', label: '탐색 & 요약' },
    { key: 'deepdive', label: '심층 매트릭스' },
    { key: 'synthesis', label: '패턴 종합' },
    { key: 'execution', label: 'SWOT & 실행' },
  ];
  return (
    <div className="flex border-b border-slate-200 mt-5">
      {tabs.map(({ key, label }) => (
        <button key={key}
          onClick={() => { onChange(key); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className={`px-5 py-3.5 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
            active === key
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Tab 1: Discovery ───────────────────────────────────────────

function DiscoveryPane({ report, prompt, discoveryResult, analyzedData }: {
  report: AgentReport; prompt: string; discoveryResult: any; analyzedData: any[];
}) {
  const summaryKeywords = report.summary_keywords ?? [];
  return (
    <div className="space-y-20 pt-12">

      {/* ① AI 핵심 답변 — 에디토리얼 히어로 */}
      <section>
        <span
          className="inline-block text-[11px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-6"
          style={{ background: '#5E81F415', color: '#5E81F4' }}
        >
          AI Analysis — Trend Research
        </span>
        <p className="text-[100px] font-black text-slate-100 leading-none select-none -mb-6">&ldquo;</p>
        <p className="text-slate-500 text-sm font-medium mb-4 italic">&quot;{prompt}&quot;</p>
        <p className="max-w-4xl leading-loose">
          <KeywordText
            text={report.summary}
            keywords={summaryKeywords}
            baseClass="text-xl text-slate-500"
            keyClass="text-3xl text-slate-900"
          />
        </p>
      </section>

      {/* ② 탐색 조건 */}
      {discoveryResult && (
        <section>
          <SectionHeader tag="Discovery Criteria" title="리서치 탐색 조건" tagColor="#9698D6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {discoveryResult.persona && (
              <div className="rounded-2xl p-8" style={{ background: '#1C1D21' }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">분석 페르소나</p>
                <p className="text-xl font-black text-white leading-snug">&ldquo;{discoveryResult.persona}&rdquo;</p>
              </div>
            )}
            {discoveryResult.analysis_criteria?.length > 0 && (
              <div className="rounded-2xl border border-slate-100 p-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">핵심 분석 기준</p>
                <ol className="space-y-4">
                  {discoveryResult.analysis_criteria.map((c: string, i: number) => (
                    <li key={i} className="flex items-start gap-4">
                      <span className="text-4xl font-black leading-none shrink-0" style={{ color: '#E2E8F0' }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="text-base font-medium text-slate-700 leading-relaxed pt-2">{c}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ③ 분석 계정 카드 — 이미지 썸네일 포함 */}
      {analyzedData.length > 0 && (
        <section>
          <SectionHeader tag="Analyzed Accounts" title={`분석 완료 계정 ${analyzedData.length}개`} tagColor="#16B1FF" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analyzedData.map((acc: any, i: number) => {
              const avgLikes = acc.posts?.length > 0
                ? Math.round(acc.posts.reduce((a: number, p: any) => a + (p.likes_count ?? 0), 0) / acc.posts.length)
                : 0;
              const followers = acc.profile?.followers_count ?? 0;
              const er = followers > 0 ? (avgLikes / followers * 100).toFixed(2) : '0.00';
              const topPosts = [...(acc.posts ?? [])].sort((a: any, b: any) => (b.likes_count ?? 0) - (a.likes_count ?? 0)).slice(0, 3);
              return (
                <div key={i} className="rounded-2xl overflow-hidden border border-slate-100">
                  {/* 썸네일 3장 — 4:5 비율로 세로 여유 확보 */}
                  <div className="grid grid-cols-3 gap-0.5 bg-slate-100">
                    {[0, 1, 2].map(j => (
                      <div key={j} className="relative overflow-hidden bg-slate-100 aspect-[4/5]">
                        <PostImg src={topPosts[j]?.image_urls?.[0]} className="absolute inset-0 w-full h-full" />
                        {j === 0 && (
                          <div className="absolute top-1.5 left-1.5 bg-yellow-400 text-yellow-900 text-[7px] font-black px-1.5 py-0.5 rounded uppercase">TOP</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* 프로필 정보 */}
                  <div className="p-5" style={{ background: '#1C1D21' }}>
                    <div className="flex items-center gap-3 mb-4">
                      {/* 프로필 사진 */}
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 shrink-0">
                        <PostImg src={acc.profile?.profile_image_url ?? acc.profile?.profile_pic_url} className="w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-black text-white truncate">@{acc.profile?.username}</p>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0"
                        style={{ background: '#5E81F415', color: '#5E81F4' }}>
                        #{i + 1}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '팔로워', value: fmt(followers), color: '#5E81F4' },
                        { label: '평균 ♥', value: fmt(avgLikes), color: '#16B1FF' },
                        { label: '참여율', value: `${er}%`, color: '#7CE7AC' },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 mb-0.5">{label}</p>
                          <p className="text-lg font-black leading-none" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Tab 2: Deep Dive ───────────────────────────────────────────

function DeepDivePane({ analyzedData }: { analyzedData: any[] }) {

  // 포지셔닝 매트릭스 데이터
  const points = analyzedData.map((acc: any) => {
    const avgLikes = acc.posts?.length > 0
      ? acc.posts.reduce((a: number, p: any) => a + (p.likes_count ?? 0), 0) / acc.posts.length : 0;
    const followers = acc.profile?.followers_count ?? 0;
    const er = followers > 0 ? parseFloat((avgLikes / followers * 100).toFixed(2)) : 0;
    const vs = acc.visuals?.visual_identity?.score ?? 0;
    return { x: vs, y: er, label: acc.profile?.username ?? '?' };
  });

  const scatterData = {
    datasets: [{
      label: '계정 포지셔닝',
      data: points.map(p => ({ x: p.x, y: p.y })),
      backgroundColor: points.map((_, i) => ['#5E81F4', '#16B1FF', '#7CE7AC', '#F4BE5E', '#9698D6', '#F87171'][i % 6]),
      pointRadius: 12, pointHoverRadius: 15,
    }],
  };

  // 톤 분포 도넛
  const toneCounts: Record<string, number> = {};
  analyzedData.forEach((acc) => {
    const palette = (acc.visuals?.feed_tone?.palette ?? '기타').toLowerCase();
    const key = palette.includes('웜') ? '웜/저채도'
      : palette.includes('쿨') || palette.includes('모노') ? '쿨/모노크롬'
      : palette.includes('파스텔') ? '파스텔톤'
      : palette.includes('팝') || palette.includes('비비드') ? '고채도/팝'
      : '기타';
    toneCounts[key] = (toneCounts[key] ?? 0) + 1;
  });
  const toneData = {
    labels: Object.keys(toneCounts),
    datasets: [{ data: Object.values(toneCounts), backgroundColor: ['#C8956A', '#6490B8', '#F5C6D0', '#FF6B6B', '#94A3B8'], borderWidth: 0 }],
  };

  // 포맷 분포
  const formatArr = analyzedData.map((acc: any) => {
    const posts = acc.posts ?? [];
    const r = posts.filter((p: any) => p.is_reel).length;
    const c = posts.filter((p: any) => !p.is_reel && p.is_carousel).length;
    const s = posts.filter((p: any) => !p.is_reel && !p.is_carousel).length;
    return { username: acc.profile?.username ?? '?', r, c, s };
  });
  const formatData = {
    labels: formatArr.map(a => `@${a.username}`),
    datasets: [
      { label: '릴스', data: formatArr.map(a => a.r), backgroundColor: '#16B1FF', borderRadius: 4 },
      { label: '캐러셀', data: formatArr.map(a => a.c), backgroundColor: '#5E81F4', borderRadius: 4 },
      { label: '단일', data: formatArr.map(a => a.s), backgroundColor: '#CBD5E1', borderRadius: 4 },
    ],
  };

  // 인게이지먼트 순위 계산
  const statsArr = analyzedData.map((acc: any) => {
    const avgLikes = acc.posts?.length > 0
      ? acc.posts.reduce((a: number, p: any) => a + (p.likes_count ?? 0), 0) / acc.posts.length : 0;
    const followers = acc.profile?.followers_count ?? 0;
    const er = followers > 0 ? parseFloat((avgLikes / followers * 100).toFixed(2)) : 0;
    const vs = acc.visuals?.visual_identity?.score ?? 0;
    return { er, vs };
  });
  const erRanks = statsArr.map(s => statsArr.filter(o => o.er > s.er).length + 1);
  const vsRanks = statsArr.map(s => statsArr.filter(o => o.vs > s.vs).length + 1);

  return (
    <div className="space-y-20 pt-12">

      {/* ① 포지셔닝 매트릭스 — 전체 너비 */}
      {analyzedData.length >= 2 && (
        <section>
          <SectionHeader tag="Positioning Matrix" title="비주얼 점수 vs 인게이지먼트율" tagColor="#5E81F4" />
          <p className="text-sm text-slate-400 -mt-6 mb-8">우상단: 비주얼도 강하고 성과도 높음 / 좌상단: 비주얼은 평범하지만 팬덤 강함</p>
          <div className="rounded-2xl bg-slate-50 p-8 h-96">
            <Scatter data={scatterData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx: any) => `@${points[ctx.dataIndex].label}  비주얼 ${points[ctx.dataIndex].x}점 / 참여율 ${points[ctx.dataIndex].y}%` } },
              },
              scales: {
                x: { title: { display: true, text: '비주얼 아이덴티티 점수 (0~10)', font: { size: 12 } }, min: 0, max: 10, grid: { color: '#F1F5F9' } },
                y: { title: { display: true, text: '인게이지먼트율 (%)', font: { size: 12 } }, min: 0, grid: { color: '#F1F5F9' } },
              },
            }} />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {points.map((p, i) => (
              <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600">
                @{p.label} — 비주얼 {p.x}pt / 참여율 {p.y}%
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ② 톤 분포 + 포맷별 현황 */}
      {analyzedData.length > 1 && (
        <section>
          <SectionHeader tag="Visual & Format Analysis" title="비주얼 톤 분포 & 포맷 현황" tagColor="#F4BE5E" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-4">색감 톤 분포</p>
              <div className="h-64 bg-slate-50 rounded-2xl p-6">
                <Doughnut data={toneData} options={{
                  responsive: true, maintainAspectRatio: false, cutout: '65%',
                  plugins: { legend: { position: 'right', labels: { font: { size: 12 }, boxWidth: 10, padding: 12 } }, tooltip: { enabled: true } },
                }} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-4">계정별 포맷 구성</p>
              <div className="h-64 bg-slate-50 rounded-2xl p-6">
                <Bar data={formatData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 11 } } } },
                  scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { stacked: true, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
                  },
                }} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ③ 계정별 상세 카드 */}
      <section>
        <SectionHeader tag="Account Deep Dive" title="계정별 상세 분석" tagColor="#16B1FF" />
        <div className="space-y-8">
          {analyzedData.map((acc: any, i: number) => {
            const posts = acc.posts ?? [];
            const avgLikes = posts.length > 0
              ? Math.round(posts.reduce((a: number, p: any) => a + (p.likes_count ?? 0), 0) / posts.length) : 0;
            const followers = acc.profile?.followers_count ?? 0;
            const er = followers > 0 ? (avgLikes / followers * 100).toFixed(2) : '0.00';
            const topPosts = [...posts].sort((a: any, b: any) => (b.likes_count ?? 0) - (a.likes_count ?? 0)).slice(0, 6);
            const palette = acc.visuals?.feed_tone?.palette ?? '';
            const paletteColors = getPaletteColors(palette);
            const score = acc.visuals?.visual_identity?.score;

            return (
              <div key={i} className="rounded-2xl border border-slate-100 overflow-hidden">
                {/* 헤더 — 다크 */}
                <div className="px-8 pt-7 pb-5 grid grid-cols-[1fr_auto] gap-4 items-center" style={{ background: '#1C1D21' }}>
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-2xl font-black text-white">@{acc.profile?.username}</h3>
                      {acc.profile?.is_verified && (
                        <span className="text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full uppercase">인증</span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-6">
                      {[
                        { label: '팔로워', value: fmt(followers), color: '#5E81F4' },
                        { label: '평균 좋아요', value: fmt(avgLikes), color: '#16B1FF' },
                        { label: '참여율', value: `${er}%`, color: '#7CE7AC' },
                        { label: '비주얼 점수', value: score != null ? `${score}/10` : '—', color: '#F4BE5E' },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1">{label}</p>
                          <p className="text-2xl font-black leading-none" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1">인게이지먼트 순위</p>
                    <p className="text-4xl font-black text-white">{erRanks[i]}<span className="text-lg text-white/30">/{analyzedData.length}</span></p>
                    <p className="text-[9px] text-white/30 mt-1">비주얼 {vsRanks[i]}위</p>
                  </div>
                </div>

                {/* 팔레트 스와치 */}
                {palette && (
                  <div className="flex h-10">
                    {paletteColors.map((c, j) => (
                      <div key={j} className="flex-1" style={{ background: c }} />
                    ))}
                  </div>
                )}

                {/* 게시물 썸네일 6장 */}
                {topPosts.length > 0 && (
                  <div className="grid grid-cols-6 gap-0.5 bg-slate-100">
                    {topPosts.map((p: any, j: number) => (
                      <a key={j} href={p.post_url} target="_blank" rel="noopener noreferrer" className="group relative block aspect-square">
                        <PostImg src={p.image_urls?.[0]} className="w-full h-full group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                          <span className="text-white font-black text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            ♥ {fmt(p.likes_count)}
                          </span>
                        </div>
                        {j === 0 && <div className="absolute top-1.5 left-1.5 bg-yellow-400 text-yellow-900 text-[7px] font-black px-1.5 py-0.5 rounded uppercase">TOP</div>}
                        {(p.is_reel || p.is_carousel) && (
                          <span className="absolute top-1.5 right-1.5 text-[7px] font-black text-white px-1.5 py-0.5 rounded"
                            style={{ background: p.is_reel ? '#16B1FF' : '#5E81F4' }}>
                            {p.is_reel ? 'R' : 'C'}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}

                {/* 캡션 전략 요약 */}
                {acc.captions?.summary && (
                  <div className="px-8 py-5 border-t border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">캡션 전략 요약</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{acc.captions.summary}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ── Tab 3: Synthesis ───────────────────────────────────────────

function SynthesisPane({ report, analyzedData }: { report: AgentReport; analyzedData: any[] }) {
  return (
    <div className="space-y-20 pt-12">

      {/* ① 핵심 공통 패턴 */}
      {report.keyPatterns?.length > 0 && (
        <section>
          <SectionHeader tag="Key Patterns" title="계정들을 가로지르는 핵심 공통 패턴" tagColor="#5E81F4" />
          <div className="space-y-5">
            {report.keyPatterns.map((p, i) => (
              <div key={i} className="grid grid-cols-[80px_1fr] gap-6 items-center rounded-2xl border border-slate-100 p-6 hover:bg-slate-50 transition">
                <span className="text-7xl font-black leading-none text-slate-100 text-center">{i + 1}</span>
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <p className="text-lg font-black text-slate-900">{p.pattern}</p>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: '#5E81F415', color: '#5E81F4' }}>{p.observed}</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{p.implication}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ② 무드보드 — 마스너리 이미지 그리드 */}
      {analyzedData.some(acc => acc.posts?.some((p: any) => p.image_urls?.[0])) && (
        <section>
          <SectionHeader tag="Visual Moodboard" title="시각적 트렌드 증거 모음" tagColor="#F4BE5E" />
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {analyzedData
              .flatMap((acc: any) =>
                (acc.posts ?? []).map((p: any) => ({
                  url: p.image_urls?.[0],
                  username: acc.profile?.username,
                  likes: p.likes_count,
                }))
              )
              .filter(item => item.url)
              .slice(0, 16)
              .map((item, i) => (
                <div key={i} className="break-inside-avoid relative group rounded-2xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt="" className="w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    style={{ minHeight: '100px', background: '#f1f5f9' }}
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col items-end justify-end pb-3 px-3 gap-1"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }}>
                    <span className="text-white text-[10px] font-bold">@{item.username}</span>
                    <span className="text-white/70 text-[9px]">♥ {fmt(item.likes ?? 0)}</span>
                  </div>
                </div>
              ))}
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">마우스를 올리면 컬러로 전환됩니다</p>
        </section>
      )}

      {/* ③ 비주얼 트렌드 + 캡션 트렌드 */}
      {(report.visualTrends?.length > 0 || report.captionTrends?.length > 0) && (
        <section>
          <SectionHeader tag="Trends" title="비주얼 & 캡션 트렌드" tagColor="#7CE7AC" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {report.visualTrends?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-5">비주얼 트렌드</p>
                <ol className="space-y-6">
                  {report.visualTrends.map((t, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <span className="text-4xl font-black leading-none shrink-0 text-slate-100">{String(i + 1).padStart(2, '0')}</span>
                      <div className="pt-1">
                        <p className="text-xl font-black text-slate-900 leading-tight mb-1.5">{t.title}</p>
                        <p className="text-sm text-slate-500 leading-relaxed">{t.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {report.captionTrends?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-5">캡션 트렌드</p>
                <ol className="space-y-6">
                  {report.captionTrends.map((t, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <span className="text-4xl font-black leading-none shrink-0 text-slate-100">{String(i + 1).padStart(2, '0')}</span>
                      <div className="pt-1">
                        <p className="text-xl font-black text-slate-900 leading-tight mb-1.5">{t.title}</p>
                        <p className="text-sm text-slate-500 leading-relaxed">{t.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ④ 분석 근거 계정 */}
      {report.supportingAccounts?.length > 0 && (
        <section>
          <SectionHeader tag="Supporting Evidence" title="분석 근거 계정" tagColor="#9698D6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.supportingAccounts.map((acc, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl border border-slate-100 p-6 hover:bg-slate-50 transition">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0"
                  style={{ background: '#1C1D21' }}>{i + 1}</span>
                <div>
                  <p className="font-black text-sm mb-1.5" style={{ color: '#5E81F4' }}>@{acc.username}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{acc.reasonToInclude}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Tab 4: Execution ───────────────────────────────────────────

function ExecutionPane({ report }: { report: AgentReport }) {
  const swot = report.swot ?? { strengths: [], weaknesses: [], opportunities: [], threats: [] };

  const radarData = {
    labels: ['Strength', 'Opportunity', 'Weakness', 'Threat'],
    datasets: [{
      data: [
        Math.min((swot.strengths?.length ?? 0) * 3, 10) || 7,
        Math.min((swot.opportunities?.length ?? 0) * 3, 10) || 6,
        Math.min((swot.weaknesses?.length ?? 0) * 3, 10) || 4,
        Math.min((swot.threats?.length ?? 0) * 3, 10) || 3,
      ],
      backgroundColor: 'rgba(94,129,244,0.10)',
      borderColor: '#5E81F4', borderWidth: 2,
      pointBackgroundColor: '#5E81F4', pointRadius: 4,
    }],
  };

  const swotConfig = [
    { key: 'strengths', letter: 'S', title: '강점', bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', accent: '#22C55E' },
    { key: 'weaknesses', letter: 'W', title: '약점', bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', accent: '#F97316' },
    { key: 'opportunities', letter: 'O', title: '기회', bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', accent: '#3B82F6' },
    { key: 'threats', letter: 'T', title: '위협', bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C', accent: '#F43F5E' },
  ];

  return (
    <div className="space-y-20 pt-12">

      {/* ① SWOT 2×2 */}
      <section>
        <SectionHeader tag="Strategic Analysis" title="트렌드 SWOT 분석" tagColor="#5E81F4" />
        <div className="grid grid-cols-2 gap-4">
          {swotConfig.map(({ key, letter, title, bg, border, text, accent }) => (
            <div key={key} className="rounded-2xl p-8" style={{ background: bg, border: `1px solid ${border}` }}>
              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-7xl font-black leading-none" style={{ color: accent }}>{letter}</span>
                <span className="text-xl font-black" style={{ color: text }}>{title}</span>
              </div>
              <ul className="space-y-3">
                {((swot as any)[key] ?? []).map((item: string, i: number) => {
                  const parts = item.split(/[:：]/);
                  return (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="w-1 h-4 rounded-full shrink-0 mt-1" style={{ background: accent }} />
                      <p className="text-sm leading-relaxed" style={{ color: text }}>
                        {parts.length > 1 ? <><strong className="font-black">{parts[0]}</strong>: {parts.slice(1).join(':')}</> : item}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ② Radar + 실행 전략 */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-10 items-start">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-4">SWOT 레이더</p>
          <div className="h-80 bg-slate-50 rounded-2xl p-6">
            <Radar data={radarData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { enabled: false } },
              scales: {
                r: {
                  beginAtZero: true, max: 10, ticks: { display: false },
                  grid: { color: '#F1F5F9' }, angleLines: { color: '#E2E8F0' },
                  pointLabels: { color: '#1E293B', font: { size: 11, weight: 'bold' as const } },
                },
              },
            }} />
          </div>
        </div>
        {report.recommendations?.length > 0 && (
          <div>
            <SectionHeader tag="Action Strategy" title="즉시 적용 가능한 실행 전략" tagColor="#7CE7AC" />
            <ol className="space-y-5">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-5">
                  <span className="text-5xl font-black leading-none shrink-0 text-slate-100">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-base text-slate-700 leading-relaxed font-medium pt-2">{rec}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* ③ 분석 한계점 */}
      {report.limitations && (
        <section>
          <SectionHeader tag="Limitations" title="분석 한계점 및 편향성" tagColor="#F43F5E" />
          <div className="rounded-2xl bg-red-50 border border-red-100 p-8">
            <p className="text-base text-red-900 leading-relaxed">{report.limitations}</p>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────

interface Props {
  report: AgentReport;
  analyzedData?: any[];
  failedAccounts?: string[];
  metaInfo?: { sessionCount: number; totalAccounts: number } | null;
}

export default function AgentReportCard({ report, analyzedData = [], failedAccounts = [], metaInfo }: Props) {
  const [activeTab, setActiveTab] = useState<TrendTab>('discovery');
  const { prompt, discoveryResult } = useAgentStore();

  if (!report) return null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mt-10">

      {/* 메타 분석 배너 */}
      {metaInfo && (
        <div className="rounded-2xl px-6 py-4 flex items-center gap-4" style={{ background: '#1C1D21' }}>
          <div className="w-2 h-8 rounded-full shrink-0" style={{ background: '#5E81F4' }} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#5E81F4' }}>Meta Analysis</p>
            <p className="text-sm font-bold text-white">
              이 분석은 <span style={{ color: '#7CE7AC' }}>{metaInfo.sessionCount}번의 리서치</span>,{' '}
              <span style={{ color: '#16B1FF' }}>{metaInfo.totalAccounts}개 계정</span> 데이터를 종합한 결과입니다
            </p>
          </div>
        </div>
      )}

      {/* 분석 현황 배지 */}
      {!metaInfo && (analyzedData.length > 0 || failedAccounts.length > 0) && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Status:</span>
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-100">
            <CheckCircle className="w-2.5 h-2.5" /> {analyzedData.length} SUCCESS
          </span>
          {failedAccounts.length > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded border border-red-100">
              <XCircle className="w-2.5 h-2.5" /> {failedAccounts.length} FAILED
            </span>
          )}
        </div>
      )}

      <TabNav active={activeTab} onChange={setActiveTab} />

      <div className="min-h-[400px]">
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
