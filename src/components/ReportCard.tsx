"use client"
import { useState } from "react";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import {
  Chart as ChartJS,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { Doughnut, Radar, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement, RadialLinearScale, PointElement, LineElement,
  CategoryScale, LinearScale, BarElement, ChartTooltip, Legend
);

type Tab = "overview" | "visual" | "caption" | "strategy";

// ── Utils ──────────────────────────────────────────────────────

function fmt(n: number) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getPaletteColors(palette: string): string[] {
  const p = (palette ?? "").toLowerCase();
  if (p.includes("웜") || p.includes("warm")) return ["#C8956A", "#D4A87A", "#E8C99A", "#B8852A"];
  if (p.includes("쿨") || p.includes("cool") || p.includes("블루") || p.includes("blue")) return ["#6490B8", "#94B0C8", "#7C92AC", "#4A6890"];
  if (p.includes("파스텔") || p.includes("pastel") || p.includes("핑크") || p.includes("pink") || p.includes("코랄") || p.includes("coral")) return ["#F5C6D0", "#F5A0B0", "#E88090", "#FFC8D0"];
  if (p.includes("모노") || p.includes("흑백") || p.includes("mono") || p.includes("블랙") || p.includes("black") || p.includes("다크") || p.includes("dark")) return ["#1A1A1A", "#555", "#AAA", "#E8E8E8"];
  if (p.includes("팝") || p.includes("비비드") || p.includes("vivid") || p.includes("컬러풀") || p.includes("colorful")) return ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF"];
  if (p.includes("그린") || p.includes("green") || p.includes("카키") || p.includes("khaki") || p.includes("올리브") || p.includes("olive")) return ["#4A7C59", "#78A86B", "#A8C89B", "#D4E8CC"];
  if (p.includes("퍼플") || p.includes("purple") || p.includes("바이올렛") || p.includes("violet") || p.includes("라벤더") || p.includes("lavender")) return ["#7C5C9A", "#A07CC0", "#C4A0E0", "#E0D0F5"];
  if (p.includes("베이지") || p.includes("크림") || p.includes("어스") || p.includes("earth") || p.includes("내추럴") || p.includes("natural") || p.includes("뉴트럴") || p.includes("neutral")) return ["#D4C4A8", "#C8B89A", "#E8DCC8", "#B8A88A"];
  if (p.includes("브라운") || p.includes("brown") || p.includes("카멜") || p.includes("camel")) return ["#8B6914", "#A08040", "#C4A882", "#D4BC9A"];
  if (p.includes("오렌지") || p.includes("orange") || p.includes("주황")) return ["#E67E22", "#F39C12", "#FAB73B", "#FDE0A0"];
  if (p.includes("레드") || p.includes("red") || p.includes("빨강")) return ["#C0392B", "#E74C3C", "#F08080", "#FADBD8"];
  if (p.includes("옐로") || p.includes("yellow") || p.includes("노랑")) return ["#F1C40F", "#F7DC6F", "#FAE29F", "#FDF2CB"];
  return ["#94A3B8", "#CBD5E1", "#E2E8F0", "#F1F5F9"];
}

// ── Keyword Highlight Text ─────────────────────────────────────
// 한 문장 안에서 의미있는 단어(4자+)만 크게, 조사/접속사는 작게

const KO_STOPWORDS = new Set([
  '그리고','하지만','또한','따라서','때문에','그러나','또는','그래서','그런데',
  '하여','있어','있는','있으며','있습니다','있습니다.','이며','이다','이고','이나',
  '가장','매우','조금','많이','다소','주로','특히','매우','대체로',
  '전반적으로','전체적으로','상당히','통해서','통해','으로서','으로',
  '에서','에도','에는','까지도','있어서','하고','하며','하는',
  '합니다','합니다.','됩니다','됩니다.','보입니다','보입니다.',
  '있으며','있으며,','이루고','이루며',
  // 추가 — 흔한 서술어/형용사/부사
  '활용','사용','보여','보여주','나타','나타나','강조','구성','형성',
  '방식','스타일','느낌','분위기','이미지','콘텐츠','계정','포스팅',
  '업로드','팔로워','팔로잉','좋아요','댓글','릴스','캐러셀',
  '일관','일관성','유지','통일','자연','자연스','편집','필터',
  '전략','마케팅','브랜드','브랜딩','포맷','형태','구조',
]);

function KeywordText({
  text,
  keywords = [],
  baseClass = "text-base text-slate-500 leading-relaxed",
  keyClass  = "text-2xl text-slate-900 leading-tight",
}: { text: string; keywords?: string[]; baseClass?: string; keyClass?: string }) {
  if (!text) return null;
  const kwSet = new Set(keywords.map(k => k.toLowerCase()));
  return (
    <>
      {text.split(" ").map((word, i, arr) => {
        const clean = word.replace(/[,.\!?:；。]/g, "").toLowerCase();
        const isKeyword = kwSet.size > 0 && kwSet.has(clean);
        return (
          <span key={i} className={isKeyword ? keyClass : baseClass}>
            {word}{i < arr.length - 1 ? " " : ""}
          </span>
        );
      })}
    </>
  );
}

// ── Magazine Section Header ────────────────────────────────────
// 작은 컬러 태그 → 큰 제목 → 얇은 룰. 스캔 가능한 계층 구조.

function SectionHeader({
  tag, title, tagColor = "#5E81F4", titleClass,
}: {
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
      <h2 className={titleClass ?? "text-4xl font-black tracking-tight text-slate-900 leading-tight"}>{title}</h2>
      <div className="h-px bg-slate-100 mt-5" />
    </div>
  );
}

// ── Profile Hero ───────────────────────────────────────────────

function ProfileAvatar({ src, imageData, fallback }: {
  src?: string;
  imageData?: { base64: string; mimeType: string };
  fallback: string;
}) {
  const [failed, setFailed] = useState(false);
  const imgSrc = imageData
    ? `data:${imageData.mimeType};base64,${imageData.base64}`
    : src;
  if (!imgSrc || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white/50">
        {fallback}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt=""
      className="w-full h-full object-cover"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function ProfileHero({ profile, posts }: { profile: any; posts: any[] }) {
  const avgLikes = posts.length
    ? Math.round(posts.reduce((a: number, p: any) => a + (p.likes_count ?? 0), 0) / posts.length)
    : 0;
  const engRate = profile.followers_count > 0
    ? ((avgLikes / profile.followers_count) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg,#1C1D21 0%,#23263a 100%)" }}>
      <div className="px-7 pt-7 pb-5 flex items-center gap-5">
        <div className="w-[68px] h-[68px] rounded-2xl overflow-hidden shrink-0 bg-white/10">
          <ProfileAvatar src={profile.profile_image_url} imageData={profile.profile_image_data} fallback={profile.username?.charAt(0).toUpperCase() ?? "?"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-black text-white tracking-tight">@{profile.username}</h1>
            {profile.is_verified && (
              <span className="text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full uppercase tracking-widest">인증</span>
            )}
          </div>
          {profile.bio && <p className="text-sm text-white/40 mt-1 line-clamp-1">{profile.bio}</p>}
        </div>
      </div>
      <div className="grid grid-cols-4 border-t border-white/5">
        {[
          { label: "팔로워", value: fmt(profile.followers_count), color: "#5E81F4" },
          { label: "평균 좋아요", value: fmt(avgLikes), color: "#16B1FF" },
          { label: "참여율", value: `${engRate}%`, color: "#7CE7AC" },
          { label: "총 게시물", value: fmt(profile.posts_count), color: "#F4BE5E" },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-6 py-4 border-r border-white/5 last:border-r-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-1">{label}</p>
            <p className="text-2xl font-black leading-none" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab Nav ────────────────────────────────────────────────────

function TabNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "오버뷰" },
    { key: "visual", label: "비주얼 전략" },
    { key: "caption", label: "캡션 전략" },
    { key: "strategy", label: "종합 전략" },
  ];
  return (
    <div className="flex border-b border-slate-200 mt-5">
      {tabs.map(({ key, label }) => (
        <button key={key}
          onClick={() => { onChange(key); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className={`px-5 py-3.5 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
            active === key
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Post Image with fallback ────────────────────────────────────

function PostImg({ src, className }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={`bg-slate-100 ${className ?? ""}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`object-cover ${className ?? ""}`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

// ── Overview Tab ───────────────────────────────────────────────

function OverviewTab({ profile, posts, summary, summaryKeywords, keyPatterns }: {
  profile: any; posts: any[]; summary?: string; summaryKeywords?: string[]; keyPatterns?: string[];
}) {
  const sortedByLikes = [...posts].sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0));
  const topPost = sortedByLikes[0];
  const avgLikes = posts.length
    ? Math.round(posts.reduce((a, p) => a + (p.likes_count ?? 0), 0) / posts.length)
    : 0;

  const engData = {
    labels: posts.map((_: any, i: number) => `#${i + 1}`),
    datasets: [{
      data: posts.map((p: any) => p.likes_count ?? 0),
      backgroundColor: posts.map((p: any) => p.is_reel ? "#16B1FF" : p.is_carousel ? "#5E81F4" : "#CBD5E1"),
      borderRadius: 4, borderWidth: 0, maxBarThickness: 28,
    }],
  };

  return (
    <div className="space-y-20 pt-12">

      {/* ① 포스트 그리드(좌) + TOP 포스트 & AI 요약(우) */}
      {posts.length > 0 && (
        <section className="grid grid-cols-[1fr_320px] gap-8 items-start">
          <div>
            <SectionHeader tag="Content Feed" title={`최근 게시물 ${posts.length}개`} tagColor="#5E81F4" />
            <div className="grid grid-cols-3 gap-2">
              {posts.map((p: any, i: number) => (
                <a key={i} href={p.post_url} target="_blank" rel="noopener noreferrer" className="group relative block">
                  <div className="aspect-square rounded-xl overflow-hidden relative">
                    <PostImg src={p.image_urls?.[0]} className="w-full h-full group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex flex-col items-center justify-center">
                      <span className="text-white font-black text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        ♥ {fmt(p.likes_count)}
                      </span>
                    </div>
                    {p === topPost && (
                      <div className="absolute top-1.5 left-1.5 bg-yellow-400 text-yellow-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">TOP</div>
                    )}
                    {(p.is_reel || p.is_carousel) && (
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-black text-white px-1.5 py-0.5 rounded"
                        style={{ background: p.is_reel ? "#16B1FF" : "#5E81F4" }}>
                        {p.is_reel ? "R" : "C"}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
            <div className="flex gap-4 mt-3">
              {[{ color: "#16B1FF", label: "릴스" }, { color: "#5E81F4", label: "캐러셀" }, { color: "#CBD5E1", label: "단일" }].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 우: TOP 포스트 + AI 요약 */}
          <div className="space-y-5 pt-[72px]">
            {topPost && (
              <div className="rounded-2xl overflow-hidden border border-slate-100">
                <div className="relative h-44">
                  <PostImg src={topPost.image_urls?.[0]} className="w-full h-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-0.5">최고 성과 게시물</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">♥ {fmt(topPost.likes_count)}</span>
                      <span className="text-xs text-white/50">
                        평균 대비 +{Math.round(((topPost.likes_count - avgLikes) / (avgLikes || 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                {topPost.caption && (
                  <div className="px-4 py-3 bg-white">
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{topPost.caption}</p>
                  </div>
                )}
              </div>
            )}

            {summary && (
              <div className="rounded-2xl bg-slate-900 p-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-white/40 mb-3">AI 브랜드 분석</p>
                <p className="leading-loose">
                  <KeywordText text={summary}
                    keywords={summaryKeywords}
                    baseClass="text-xs text-white/50"
                    keyClass="text-base text-white"
                  />
                </p>
              </div>
            )}

            {(keyPatterns ?? []).length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-3">핵심 패턴</p>
                <ul className="space-y-2.5">
                  {(keyPatterns ?? []).slice(0, 3).map((p: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-[9px] font-black bg-slate-900 text-white w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-xs text-slate-600 leading-relaxed">{p}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ② AI 풀 쿼트 — 매거진 에디토리얼 스타일 */}
      {summary && (
        <section className="border-y border-slate-100 py-14">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-8 inline-block"
            style={{ background: "#5E81F415", color: "#5E81F4" }}>
            AI Analysis
          </span>
          <p className="text-[100px] font-black text-slate-100 leading-none select-none -mb-6">&ldquo;</p>
          <p className="max-w-4xl leading-loose">
            <KeywordText text={summary}
              keywords={summaryKeywords}
              baseClass="text-xl text-slate-500"
              keyClass="text-3xl text-slate-900"
            />
          </p>
        </section>
      )}

      {/* ③ 인게이지먼트 차트 + 데이터 해석 */}
      {posts.length > 0 && (
        <section>
          <SectionHeader tag="Engagement Data" title="게시물별 좋아요 추이" tagColor="#16B1FF" />
          <div className="grid grid-cols-[1fr_220px] gap-8 items-start">
            <div className="h-56">
              <Bar data={engData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw.toLocaleString()} 좋아요` } },
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: "#F8FAFC" }, ticks: { font: { size: 10 }, color: "#94A3B8" } },
                  x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#94A3B8" } },
                },
              }} />
            </div>
            <div className="space-y-4">
              {[
                { label: "최고", value: fmt(sortedByLikes[0]?.likes_count ?? 0), sub: sortedByLikes[0]?.is_reel ? "릴스" : sortedByLikes[0]?.is_carousel ? "캐러셀" : "단일", color: "#5E81F4" },
                { label: "평균", value: fmt(avgLikes), sub: `${posts.length}개 기준`, color: "#16B1FF" },
                { label: "최저", value: fmt(sortedByLikes[sortedByLikes.length - 1]?.likes_count ?? 0), sub: "편차 참고", color: "#CBD5E1" },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="py-3 border-b border-slate-100 last:border-0">
                  <p className="text-xs font-bold text-slate-600 mb-1">{label}</p>
                  <p className="text-4xl font-black text-slate-900 leading-none">{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{sub}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-5 mt-4 justify-end">
            {[{ color: "#16B1FF", label: "릴스" }, { color: "#5E81F4", label: "캐러셀" }, { color: "#CBD5E1", label: "단일" }].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Visual Tab ─────────────────────────────────────────────────

function PaletteSwatch({ color, index }: { color: string; index: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex-1 relative transition-all duration-300 cursor-default"
      style={{ background: color }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] font-black px-2 py-1 rounded-lg whitespace-nowrap z-10 backdrop-blur-sm">
          {color.toUpperCase()}
        </div>
      )}
    </div>
  );
}

function VisualTab({ v, posts }: { v: any; posts: any[] }) {
  const palette = v.feed_tone?.palette ?? "";
  const paletteColors = getPaletteColors(palette);
  const score = v.visual_identity?.score ?? null;

  const reels = posts.filter((p: any) => p.is_reel);
  const carousels = posts.filter((p: any) => p.is_carousel);
  const singles = posts.filter((p: any) => !p.is_reel && !p.is_carousel);
  const avg = (arr: any[]) => arr.length ? Math.round(arr.reduce((a, p) => a + (p.likes_count ?? 0), 0) / arr.length) : 0;

  const formatData = {
    labels: [`릴스 (${reels.length})`, `캐러셀 (${carousels.length})`, `단일 (${singles.length})`],
    datasets: [{
      data: [avg(reels), avg(carousels), avg(singles)],
      backgroundColor: ["#16B1FF", "#5E81F4", "#CBD5E1"],
      borderRadius: 6, borderWidth: 0, maxBarThickness: 40,
    }],
  };

  const donutData = {
    labels: ["릴스", "캐러셀", "단일"],
    datasets: [{
      data: [reels.length, carousels.length, singles.length],
      backgroundColor: ["#16B1FF", "#5E81F4", "#CBD5E1"],
      borderWidth: 0,
    }],
  };

  return (
    <div className="space-y-20 pt-12">

      {/* ① 비주얼 정체성 점수 + 요약 */}
      {(score != null || v.summary) && (
        <section>
          <SectionHeader tag="Visual Identity" title="비주얼 정체성 분석" tagColor="#9698D6" />
          <div className="flex items-start gap-12">
            {score != null && (
              <div className="shrink-0">
                <p className="text-[110px] font-black leading-none text-slate-900">{score}</p>
                <p className="text-lg font-bold text-slate-500 -mt-2">/ 10</p>
              </div>
            )}
            <div className="pt-3">
              {v.summary && (
                <p className="leading-loose">
                  <KeywordText text={v.summary}
                    keywords={v.summary_keywords}
                    baseClass="text-base text-slate-500"
                    keyClass="text-xl text-slate-900"
                  />
                </p>
              )}
              {v.visual_identity?.recognizability && (
                <p className="text-base text-slate-400 italic mt-5 border-l-4 border-slate-200 pl-5 leading-relaxed">
                  &ldquo;{v.visual_identity.recognizability}&rdquo;
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ② 팔레트 — 호버 hex, 텍스트는 아래 별도 */}
      {palette && (
        <section>
          <SectionHeader tag="Color Palette" title={palette} tagColor="#F4BE5E" titleClass="text-2xl font-medium tracking-tight text-slate-900 leading-snug" />
          <div className="flex h-56 rounded-2xl overflow-hidden shadow-sm">
            {paletteColors.map((c, i) => (
              <PaletteSwatch key={i} color={c} index={i} />
            ))}
          </div>
          <div className="flex items-start gap-10 mt-6 flex-wrap">
            {v.feed_tone?.saturation && (
              <div className="shrink-0">
                <p className="text-xs font-bold text-slate-600 mb-1">채도</p>
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(i => {
                    const level = /높|hig/i.test(v.feed_tone.saturation) ? 4 : /낮|low|des/i.test(v.feed_tone.saturation) ? 1 : /중|mid/i.test(v.feed_tone.saturation) ? 3 : 2;
                    return <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: i <= level ? "#9698D6" : "#E2E8F0" }} />;
                  })}
                </div>
                <p className="text-sm font-bold text-slate-700">{v.feed_tone.saturation}</p>
              </div>
            )}
            {v.feed_tone?.brightness && (
              <div className="shrink-0">
                <p className="text-xs font-bold text-slate-600 mb-1">밝기</p>
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(i => {
                    const level = /높|밝|hig|bri/i.test(v.feed_tone.brightness) ? 4 : /낮|어두|low|dar/i.test(v.feed_tone.brightness) ? 1 : /중|mid/i.test(v.feed_tone.brightness) ? 3 : 2;
                    return <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: i <= level ? "#F4BE5E" : "#E2E8F0" }} />;
                  })}
                </div>
                <p className="text-sm font-bold text-slate-700">{v.feed_tone.brightness}</p>
              </div>
            )}
            {v.feed_tone?.filter_consistency && (
              <p className="text-sm text-slate-500 leading-relaxed flex-1">{v.feed_tone.filter_consistency}</p>
            )}
          </div>
        </section>
      )}

      {/* ③ 포맷별 대표 이미지 + 차트 */}
      {posts.length > 0 && (
        <section>
          <SectionHeader tag="Content Format" title="포맷별 성과 비교" tagColor="#16B1FF" />
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "릴스", items: reels, color: "#16B1FF", bg: "#EFF8FF" },
              { label: "캐러셀", items: carousels, color: "#5E81F4", bg: "#EEF2FF" },
              { label: "단일 이미지", items: singles, color: "#8181A5", bg: "#F5F5FA" },
            ].map(({ label, items, color, bg }) => {
              const sample = items[0];
              return (
                <div key={label} className="rounded-2xl overflow-hidden bg-slate-50">
                  <div className="h-36 relative" style={{ background: bg }}>
                    <PostImg src={sample?.image_urls?.[0]} className="w-full h-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white font-black text-xs">{label}</p>
                      <p className="font-black text-lg leading-none" style={{ color }}>{items.length}개</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-bold text-slate-600 mb-1">평균 좋아요</p>
                    <p className="text-3xl font-black text-slate-900">{fmt(avg(items))}</p>
                    {items.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1">최고 {fmt(Math.max(...items.map((p: any) => p.likes_count ?? 0)))}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-[1fr_240px] gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-3">포맷별 평균 좋아요</p>
              <div className="h-44">
                <Bar data={formatData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` 평균 ${ctx.raw.toLocaleString()} 좋아요` } } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: "#F8FAFC" }, ticks: { font: { size: 10 }, color: "#94A3B8" } },
                    x: { grid: { display: false }, ticks: { font: { size: 11, weight: "bold" as const }, color: "#1E293B" } },
                  },
                }} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-3">포맷 분포</p>
              <div className="h-44">
                <Doughnut data={donutData} options={{
                  cutout: "65%", responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: true, position: "bottom" as const, labels: { boxWidth: 8, padding: 10, font: { size: 11 }, color: "#475569" } },
                    tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw}개` } },
                  },
                }} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ④ 구도 & 피사체 — 이미지 3개 정상 비율 */}
      {(v.composition || v.content_types) && (
        <section>
          <SectionHeader tag="Composition" title="구도 & 콘텐츠 유형" tagColor="#7CE7AC" />
          <div className="grid grid-cols-[1fr_1fr] gap-8 items-start">
            <div className="grid grid-cols-3 gap-2 h-[300px]">
              {[posts[0], posts[1], posts[2]].map((p, i) => (
                <div key={i} className="rounded-xl overflow-hidden bg-slate-100 h-full">
                  <PostImg src={p?.image_urls?.[0]} className="w-full h-full" />
                </div>
              ))}
            </div>
            <div className="space-y-5">
              {v.composition?.dominant_patterns?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-2">주요 구도 패턴</p>
                  <div className="flex flex-wrap gap-2">
                    {v.composition.dominant_patterns.map((p: string, i: number) => (
                      <span key={i} className="text-xs font-bold px-3 py-1.5 bg-slate-900 text-white rounded-xl">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {v.composition?.whitespace && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-1">여백 활용</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{v.composition.whitespace}</p>
                </div>
              )}
              {v.content_types?.primary_subjects?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-2">주요 피사체</p>
                  <div className="flex flex-wrap gap-2">
                    {v.content_types.primary_subjects.map((s: string, i: number) => (
                      <span key={i} className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {v.content_types?.person_frequency && (
                <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-slate-200 pl-3">{v.content_types.person_frequency}</p>
              )}
              {v.visual_identity?.recognizability && (
                <p className="text-sm text-slate-400 italic leading-relaxed">&ldquo;{v.visual_identity.recognizability}&rdquo;</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ⑤ 그리드 전략 */}
      {v.grid_strategy?.pattern_description && (
        <section>
          <SectionHeader tag="Grid Strategy" title="그리드 전략" tagColor="#5E81F4" />
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-slate-50 rounded-xl p-1.5 grid grid-cols-3 gap-0.5 shrink-0 border border-slate-200">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`rounded-sm ${i === 4 ? "bg-slate-900" : "bg-slate-200"}`} />
              ))}
            </div>
            <div>
              <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-1 rounded-full mb-2 ${
                v.grid_strategy?.has_pattern ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
              }`}>
                {v.grid_strategy?.has_pattern ? "패턴 있음" : "자유 구성"}
              </span>
              <p className="text-sm text-slate-700 leading-relaxed">{v.grid_strategy.pattern_description}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Caption Tab ────────────────────────────────────────────────

function CaptionTab({ c, posts }: { c: any; posts: any[] }) {
  const categories: { name: string; percentage: number }[] = c.content_categories?.categories ?? [];
  const colorMap: Record<string, string> = {
    교육형: "#16B1FF", 감성형: "#5E81F4", 소통형: "#56CA00", 정보형: "#8181A5", 프로모션형: "#F4BE5E",
  };
  const topThemes: string[] = c.content_categories?.top_themes ?? [];
  const hashtagExamples: string[] = c.hashtag_strategy?.examples ?? [];
  const hashtagTypes: string[] = c.hashtag_strategy?.types ?? [];

  const hashtagFreq: Record<string, number> = {};
  posts.forEach((p: any) => {
    (p.hashtags ?? []).forEach((tag: string) => {
      const t = tag.toLowerCase().replace(/^#/, "");
      hashtagFreq[t] = (hashtagFreq[t] ?? 0) + 1;
    });
  });
  const topHashtags = Object.entries(hashtagFreq).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const maxFreq = topHashtags[0]?.[1] ?? 1;
  const topPost = [...posts].sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0))[0];

  return (
    <div className="space-y-20 pt-12">

      {/* ① 최고 성과 캡션 카드(좌) + 캡션 전략(우) */}
      {(topPost?.caption || c.summary) && (
        <section>
          <SectionHeader tag="Caption Strategy" title="캡션 전략 분석" tagColor="#5E81F4" />
          <div className="grid grid-cols-[2fr_3fr] gap-12 items-start">
            {topPost?.caption && (
              <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm flex flex-col">
                <div className="aspect-[4/5] overflow-hidden">
                  <PostImg src={topPost.image_urls?.[0]} className="w-full h-full object-cover" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">최고 성과 캡션</span>
                    <span className="text-sm font-black text-rose-500">♥ {fmt(topPost.likes_count)}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line line-clamp-8">{topPost.caption}</p>
                </div>
              </div>
            )}
            <div className="space-y-10">
              {c.summary && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-2">전략 요약</p>
                  <p className="leading-loose">
                    <KeywordText text={c.summary}
                      keywords={c.summary_keywords}
                      baseClass="text-sm text-slate-500"
                      keyClass="text-lg text-slate-900"
                    />
                  </p>
                </div>
              )}
              {c.caption_strategy && (
                <div className="space-y-10">
                  {[
                    { step: "01", label: "Hook", sublabel: "첫 줄 전략", value: c.caption_strategy.hook_style, color: "#5E81F4" },
                    { step: "02", label: "CTA", sublabel: "행동 유도", value: c.caption_strategy.cta_pattern, color: "#7CE7AC" },
                    { step: "03", label: "Format", sublabel: "단락 스타일", value: c.caption_strategy.formatting, color: "#F4BE5E" },
                  ].filter(item => item.value).map(({ step, label, sublabel, value, color }) => (
                    <div key={step} className="border-l-4 pl-5" style={{ borderColor: color }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-black text-white px-2 py-0.5 rounded" style={{ background: color }}>{step}</span>
                        <span className="text-xs font-bold text-slate-600">{label} — {sublabel}</span>
                      </div>
                      <p className="text-base font-normal text-slate-900 leading-relaxed">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ② 카테고리 분포 + 주력 테마 */}
      {(categories.length > 0 || topThemes.length > 0) && (
        <section>
          <SectionHeader tag="Content Categories" title="카테고리 & 테마 분포" tagColor="#16B1FF" />
          <div className="grid grid-cols-[3fr_2fr] gap-8 items-start">
            {categories.length > 0 && (
              <div className="space-y-4">
                {categories.map((cat, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-sm font-bold text-slate-700">{cat.name}</span>
                      <span className="text-3xl font-black text-slate-900 leading-none">{cat.percentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${cat.percentage}%`, backgroundColor: colorMap[cat.name] ?? "#8181A5" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {topThemes.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-3">주력 테마</p>
                <div className="flex flex-wrap gap-2">
                  {topThemes.map((theme, i) => (
                    <span key={i}
                      className="text-sm font-black rounded-xl px-3 py-2 text-white"
                      style={{ background: i === 0 ? "#1C1D21" : i === 1 ? "#334155" : "#64748B" }}
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ③ 해시태그 빈도 */}
      {topHashtags.length > 0 && (
        <section>
          <SectionHeader tag="Hashtag Analysis" title={`자주 쓴 해시태그 TOP ${topHashtags.length}`} tagColor="#9698D6" />
          <div className="space-y-2">
            {topHashtags.map(([tag, freq]) => (
              <div key={tag} className="flex items-center gap-2">
                <div className="w-full relative h-7 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 flex items-center px-4 rounded-xl"
                    style={{
                      width: `${Math.max((freq / maxFreq) * 100, 10)}%`,
                      background: freq / maxFreq > 0.7 ? "#1C1D21" : freq / maxFreq > 0.4 ? "#334155" : "#E2E8F0",
                    }}
                  >
                    <span className="text-xs font-black whitespace-nowrap" style={{ color: freq / maxFreq > 0.4 ? "white" : "#94A3B8" }}>
                      #{tag}
                    </span>
                  </div>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{freq}회</span>
                </div>
              </div>
            ))}
          </div>
          {hashtagTypes.length > 0 && (
            <div className="mt-5 rounded-xl border border-slate-200 overflow-hidden">
              {hashtagTypes.map((type, i) => (
                <div key={i} className="flex items-center px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-700 flex-1">{type}</span>
                  {hashtagExamples[i] && <span className="text-sm font-bold text-blue-500">#{hashtagExamples[i].replace("#", "")}</span>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ④ 톤 & 소통 */}
      {(c.tone_manner || c.engagement_style) && (
        <section>
          <SectionHeader tag="Brand Voice" title="톤 & 매너" tagColor="#7CE7AC" />
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1C1D21" }}>
            <div className="grid grid-cols-2 divide-x divide-white/5">
              {c.tone_manner && (
                <div className="p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-4">말투 스타일</p>
                  {c.tone_manner.speech_style && (
                    <p className="text-2xl font-medium text-white leading-relaxed mb-6">&ldquo;{c.tone_manner.speech_style}&rdquo;</p>
                  )}
                  {c.tone_manner.emotional_keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.tone_manner.emotional_keywords.map((k: string, i: number) => (
                        <span key={i} className="text-xs font-bold px-2.5 py-1 bg-white/10 text-white/70 rounded-lg">{k}</span>
                      ))}
                    </div>
                  )}
                  {c.tone_manner.emoji?.types?.length > 0 && (
                    <div className="flex gap-1 mt-3 text-lg">
                      {c.tone_manner.emoji.types.map((t: string, i: number) => <span key={i}>{t}</span>)}
                    </div>
                  )}
                </div>
              )}
              {c.engagement_style?.interaction_methods?.length > 0 && (
                <div className="p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-4">팔로워 소통 유도</p>
                  <ul className="space-y-3">
                    {c.engagement_style.interaction_methods.map((m: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded bg-[#5E81F4] flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-xs text-white/60 leading-relaxed">{m}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Strategy Tab ───────────────────────────────────────────────

function StrategyTab({ r }: { r: any }) {
  const swot = r.swot ?? {};
  const koLabel: Record<string, string> = {
    primary_format: "주력 포맷", posting_frequency: "업로드 주기", content_mix: "콘텐츠 믹스",
    hook_style: "첫 줄 훅", cta_pattern: "행동 유도", hashtag_use: "해시태그 활용",
    visual_identity: "비주얼 정체성", tone_of_voice: "브랜드 화법", differentiation: "차별화 포인트",
    target_audience: "타겟 오디언스", unique_value: "고유 가치",
    short_term: "단기 전략", long_term: "중장기 전략", collaboration: "협업 전략",
    engagement_tactics: "참여 유도", growth_tactics: "성장 전술",
  };

  const swotConfig = [
    { key: "strengths", letter: "S", title: "강점", bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D", accent: "#22C55E" },
    { key: "weaknesses", letter: "W", title: "약점", bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C", accent: "#F97316" },
    { key: "opportunities", letter: "O", title: "기회", bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8", accent: "#3B82F6" },
    { key: "threats", letter: "T", title: "위협", bg: "#FFF1F2", border: "#FECDD3", text: "#BE123C", accent: "#F43F5E" },
  ];

  const strategies = [
    { title: "콘텐츠 전략", items: r.content_strategy, accent: "#5E81F4" },
    { title: "브랜딩 전략", items: r.branding, accent: "#9698D6" },
    { title: "성장 전략", items: r.growth_strategy, accent: "#7CE7AC" },
  ].filter(s => s.items);

  const hasSwot = swot.strengths?.length || swot.weaknesses?.length || swot.opportunities?.length || swot.threats?.length;

  const radarData = {
    labels: ["Strength", "Opportunity", "Weakness", "Threat"],
    datasets: [{
      data: [
        Math.min((swot.strengths?.length ?? 0) * 3, 10) || 7,
        Math.min((swot.opportunities?.length ?? 0) * 3, 10) || 6,
        Math.min((swot.weaknesses?.length ?? 0) * 3, 10) || 4,
        Math.min((swot.threats?.length ?? 0) * 3, 10) || 3,
      ],
      backgroundColor: "rgba(94,129,244,0.10)",
      borderColor: "#5E81F4", borderWidth: 2,
      pointBackgroundColor: "#5E81F4", pointRadius: 4,
    }],
  };

  return (
    <div className="space-y-20 pt-12">

      {/* ① SWOT 2×2 */}
      {hasSwot && (
        <section>
          <SectionHeader tag="Strategic Analysis" title="SWOT 분석" tagColor="#5E81F4" />
          <div className="grid grid-cols-2 gap-3">
            {swotConfig.map(({ key, letter, title, bg, border, text, accent }) => (
              <div key={key} className="rounded-2xl p-7" style={{ background: bg, border: `1px solid ${border}` }}>
                <div className="flex items-baseline gap-3 mb-5">
                  <span className="text-7xl font-black leading-none" style={{ color: accent }}>{letter}</span>
                  <span className="text-xl font-black" style={{ color: text }}>{title}</span>
                </div>
                <ul className="space-y-3">
                  {(swot[key] ?? []).map((item: string, i: number) => {
                    const parts = item.split(/[:：]/);
                    return (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className="w-1 h-4 rounded-full shrink-0 mt-1" style={{ background: accent }} />
                        <p className="text-sm leading-relaxed" style={{ color: text }}>
                          {parts.length > 1 ? <><strong className="font-black">{parts[0]}</strong>: {parts.slice(1).join(":")}</> : item}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ② 레이더 + 액션 아이템 */}
      {(hasSwot || r.recommendations?.immediate?.length) && (
        <section className="grid grid-cols-[1fr_1.5fr] gap-10 items-start">
          {hasSwot && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-4">SWOT 레이더</p>
              <div className="h-80 bg-slate-50 rounded-2xl p-6">
                <Radar data={radarData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { enabled: false } },
                  scales: {
                    r: {
                      beginAtZero: true, max: 10, ticks: { display: false },
                      grid: { color: "#F1F5F9" }, angleLines: { color: "#E2E8F0" },
                      pointLabels: { color: "#1E293B", font: { size: 11, weight: "bold" as const } },
                    },
                  },
                }} />
              </div>
            </div>
          )}
          {r.recommendations?.immediate?.length > 0 && (
            <div>
              <SectionHeader tag="Action Items" title="이번 주 실행 아이템" tagColor="#7CE7AC" />
              <ol className="space-y-5">
                {r.recommendations.immediate.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-5">
                    <span className="text-5xl font-black leading-none shrink-0" style={{ color: "#E2E8F0" }}>{String(i + 1).padStart(2, "0")}</span>
                    <p className="text-base font-normal text-slate-800 leading-relaxed pt-2">{item}</p>
                  </li>
                ))}
              </ol>
              {r.recommendations.long_term && (
                <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-2">중장기 방향 (3~6개월)</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{r.recommendations.long_term}</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ③ 전략 카드 */}
      {strategies.length > 0 && (
        <section>
          <SectionHeader tag="Strategy" title="실행 전략" tagColor="#9698D6" />
          <div className="grid grid-cols-3 gap-4">
            {strategies.map(({ title, items, accent }) => (
              <div key={title} className="rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-5 py-3" style={{ borderTop: `3px solid ${accent}` }}>
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: accent }}>{title}</p>
                </div>
                <div className="p-4 space-y-2">
                  {Object.entries(items).map(([k, v]: [string, any], i) => (
                    <div key={i} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-1">{koLabel[k] ?? k.replace(/_/g, " ")}</p>
                      <p className="text-xs font-bold text-slate-800 leading-snug">{String(v ?? "").split(/[.。]/)[0]}.</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ④ 벤치마킹 */}
      {r.benchmarking && (
        <section>
          <SectionHeader tag="Benchmark" title="벤치마킹 인사이트" tagColor="#F4BE5E" />
          <div className="grid grid-cols-2 gap-6">
            {r.benchmarking.top_learnings?.length > 0 && (
              <div className="space-y-3">
                {r.benchmarking.top_learnings.map((l: string, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-slate-600 leading-relaxed">{l}</p>
                  </div>
                ))}
              </div>
            )}
            {r.benchmarking.actionable_tactics && (
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-2">즉시 실행 전술</p>
                <p className="text-sm text-slate-700 leading-relaxed">{r.benchmarking.actionable_tactics}</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Loading ────────────────────────────────────────────────────

function LoadingState({ currentStep }: { currentStep: string }) {
  const label: Record<string, string> = {
    idle: "준비 중...",
    scraping: "게시물 및 프로필 수집 중...",
    analyzing: "비주얼 & 캡션 패턴 분석 중...",
    generating_report: "최종 보고서 작성 중...",
  };
  const steps = [
    { key: "scraping", label: "데이터 수집" },
    { key: "analyzing", label: "AI 분석" },
    { key: "generating_report", label: "보고서 생성" },
  ];
  const idx = steps.findIndex(s => s.key === currentStep);
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 flex flex-col items-center gap-6">
      <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
      <div className="text-center">
        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">분석 진행 중</p>
        <p className="text-sm font-bold text-slate-700">{label[currentStep] ?? "처리 중..."}</p>
        <p className="text-xs text-slate-400 mt-1">1~2분 소요됩니다.</p>
      </div>
      <div className="flex gap-6">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${i < idx ? "bg-slate-900" : i === idx ? "bg-blue-500 animate-pulse" : "bg-slate-200"}`} />
            <span className={`text-xs font-bold ${i < idx ? "text-slate-900" : i === idx ? "text-slate-700" : "text-slate-300"}`}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────

export default function ReportCard() {
  const { currentReport, error, isAnalyzing, currentStep } = useAnalysisStore();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (isAnalyzing) return <LoadingState currentStep={currentStep} />;

  if (error) {
    return (
      <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-6">
        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">분석 오류</p>
        <p className="text-sm text-slate-700 font-medium">{error}</p>
      </div>
    );
  }

  if (!currentReport || !currentReport.profile) return null;

  const { profile, posts = [], visual_analysis: v = {}, caption_analysis: c = {} } = currentReport;
  const r = currentReport.report ?? {};

  return (
    <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ProfileHero profile={profile} posts={posts} />
      <TabNav active={activeTab} onChange={setActiveTab} />
      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <OverviewTab profile={profile} posts={posts} summary={r.summary} summaryKeywords={r.summary_keywords} keyPatterns={r.keyPatterns} />
        )}
        {activeTab === "visual" && <VisualTab v={v} posts={posts} />}
        {activeTab === "caption" && <CaptionTab c={c} posts={posts} />}
        {activeTab === "strategy" && <StrategyTab r={r} />}
      </div>
    </div>
  );
}
