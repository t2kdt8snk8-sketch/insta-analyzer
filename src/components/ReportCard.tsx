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
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Radar, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, RadialLinearScale, PointElement, LineElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Tab = "overview" | "visual" | "caption" | "strategy";

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
  if (p.includes("베이지") || p.includes("크림") || p.includes("어스") || p.includes("earth") || p.includes("내추럴") || p.includes("natural") || p.includes("뉴트럴") || p.includes("neutral") || p.includes("오프화이트")) return ["#D4C4A8", "#C8B89A", "#E8DCC8", "#B8A88A"];
  if (p.includes("브라운") || p.includes("brown") || p.includes("카멜") || p.includes("camel") || p.includes("탄") || p.includes("tan")) return ["#8B6914", "#A08040", "#C4A882", "#D4BC9A"];
  if (p.includes("오렌지") || p.includes("orange") || p.includes("주황")) return ["#E67E22", "#F39C12", "#FAB73B", "#FDE0A0"];
  if (p.includes("레드") || p.includes("red") || p.includes("빨강")) return ["#C0392B", "#E74C3C", "#F08080", "#FADBD8"];
  if (p.includes("옐로") || p.includes("yellow") || p.includes("노랑")) return ["#F1C40F", "#F7DC6F", "#FAE29F", "#FDF2CB"];
  return ["#94A3B8", "#CBD5E1", "#E2E8F0", "#F1F5F9"];
}

// ────────────────────────────────────────────────────────────
// 공용 UI 컴포넌트
// ────────────────────────────────────────────────────────────

function MagazineHeader({ num, sub, title }: { num: string; sub: string; title: string }) {
  return (
    <div className="mb-12">
      <span className="block text-8xl leading-none font-black text-slate-100 tracking-tighter mb-1">{num}</span>
      <span className="block text-xs font-black text-indigo-600 uppercase tracking-widest mb-3">{sub}</span>
      <h2 className="text-4xl font-black text-slate-900">{title}</h2>
    </div>
  );
}

function InfoHeadline({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`pl-4 border-l-4 border-indigo-600 font-black text-xl text-slate-900 mb-6 ${className ?? ""}`}>
      {children}
    </h3>
  );
}

function DataLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ${className ?? ""}`}>
      {children}
    </span>
  );
}

function SubTabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
        active ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function PaletteSwatch({ palette }: { palette: string }) {
  const colors = getPaletteColors(palette);
  return (
    <div className="flex items-center mt-2">
      {colors.map((c, i) => (
        <div
          key={i}
          className="w-10 h-10 rounded-full border-2 border-white shadow-md shrink-0"
          style={{ background: c, marginLeft: i > 0 ? "-10px" : "0", zIndex: colors.length - i }}
        />
      ))}
      <span className="ml-4 text-base font-black text-slate-700">{palette}</span>
    </div>
  );
}

// 포스트별 좋아요 바 차트
function PostLikesChart({ posts }: { posts: any[] }) {
  const labels = posts.map((_: any, i: number) => `#${i + 1}`);
  const data = {
    labels,
    datasets: [{
      data: posts.map((p: any) => p.likes_count ?? 0),
      backgroundColor: posts.map((p: any) =>
        p.is_reel ? "#14b8a6" : p.is_carousel ? "#4f46e5" : "#94a3b8"
      ),
      borderRadius: 6,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: {
      label: (ctx: any) => ` ${ctx.raw.toLocaleString()} 좋아요`,
    }}},
    scales: {
      y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };
  return <Bar data={data} options={options} />;
}

// 포맷별 평균 좋아요 비교 바 차트
function FormatAvgLikesChart({ posts }: { posts: any[] }) {
  const reels = posts.filter((p: any) => p.is_reel);
  const carousels = posts.filter((p: any) => p.is_carousel);
  const singles = posts.filter((p: any) => !p.is_reel && !p.is_carousel);
  const avg = (arr: any[]) =>
    arr.length ? Math.round(arr.reduce((a, p) => a + (p.likes_count ?? 0), 0) / arr.length) : 0;
  const vals = [avg(reels), avg(carousels), avg(singles)];
  const data = {
    labels: [`릴스\n(${reels.length}개)`, `캐러셀\n(${carousels.length}개)`, `단일\n(${singles.length}개)`],
    datasets: [{
      data: vals,
      backgroundColor: ["#14b8a6", "#4f46e5", "#94a3b8"],
      borderRadius: 8,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: {
      label: (ctx: any) => ` 평균 ${ctx.raw.toLocaleString()} 좋아요`,
    }}},
    scales: {
      y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 12, weight: "bold" as const } } },
    },
  };
  return <Bar data={data} options={options} />;
}

// 채도/밝기 dot 인디케이터
function LevelDots({ label, value }: { label: string; value: string }) {
  const v = value?.toLowerCase() ?? "";
  const level = v.includes("높") || v.includes("high") || v.includes("선명") || v.includes("vibrant") ? 4
    : v.includes("중") || v.includes("mid") || v.includes("보통") ? 2
    : v.includes("낮") || v.includes("low") || v.includes("무") || v.includes("soft") || v.includes("muted") ? 1
    : 3;
  return (
    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
      <span className="block text-[10px] text-slate-400 font-black mb-2 uppercase tracking-tighter">{label}</span>
      <div className="flex items-center gap-2">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full ${i <= level ? "bg-indigo-600" : "bg-slate-200"}`} />
        ))}
        <span className="ml-2 text-sm font-black text-slate-700">{value}</span>
      </div>
    </div>
  );
}

function IdentityGauge({ score }: { score: number }) {
  const data = {
    datasets: [
      {
        data: [score, 10 - score],
        backgroundColor: ["#4f46e5", "#1e293b"],
        borderWidth: 0,
      },
    ],
  };
  const options = {
    cutout: "85%" as const,
    rotation: -135,
    circumference: 270,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
  };
  return (
    <div className="relative w-44 h-44 mx-auto">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black text-white leading-none">{score}</span>
        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">/ 10</span>
      </div>
    </div>
  );
}

function SwotRadarChart({ swot }: { swot: any }) {
  const s = Math.min((swot.strengths?.length ?? 0) * 3, 10) || 7;
  const o = Math.min((swot.opportunities?.length ?? 0) * 3, 10) || 6;
  const w = Math.min((swot.weaknesses?.length ?? 0) * 3, 10) || 4;
  const t = Math.min((swot.threats?.length ?? 0) * 3, 10) || 3;

  const data = {
    labels: ["Strength", "Opportunity", "Weakness", "Threat"],
    datasets: [
      {
        data: [s, o, w, t],
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        borderColor: "#fff",
        borderWidth: 2,
        pointBackgroundColor: "#4f46e5",
        pointRadius: 5,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        ticks: { display: false },
        grid: { color: "rgba(255,255,255,0.2)" },
        angleLines: { color: "rgba(255,255,255,0.2)" },
        pointLabels: { color: "#fff", font: { size: 14, weight: "bold" as const } },
      },
    },
  };
  return <Radar data={data} options={options} />;
}

// ────────────────────────────────────────────────────────────
// 탭 1: 오버뷰
// ────────────────────────────────────────────────────────────

function OverviewPane({ profile, posts, summary }: { profile: any; posts: any[]; summary?: string }) {
  const avgLikes = posts.length > 0 ? Math.round(posts.reduce((a: number, p: any) => a + (p.likes_count ?? 0), 0) / posts.length) : 0;
  const avgComments = posts.length > 0 ? Math.round(posts.reduce((a: number, p: any) => a + (p.comments_count ?? 0), 0) / posts.length) : 0;
  const reelsCount = posts.filter((p: any) => p.is_reel).length;
  const carouselCount = posts.filter((p: any) => p.is_carousel).length;
  const singleCount = posts.filter((p: any) => !p.is_reel && !p.is_carousel).length;

  return (
    <div className="space-y-14 pb-20">
      <MagazineHeader num="01" sub="Account Overview" title="데이터 수집 및 계정 개요" />

      {/* 프로필 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <div className="pt-4">
          <p className="text-lg text-slate-600 leading-relaxed">
            수집된 프로필 데이터와 최근 게시물을 기반으로 분석한 브랜드 포지셔닝 요약입니다.
          </p>
        </div>
        <div className="p-10 bg-white rounded-3xl border border-slate-200 shadow-lg border-t-[8px] border-t-indigo-500">
          <DataLabel>계정 프로필</DataLabel>
          <div className="mt-5 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-28 h-28 rounded-2xl bg-slate-100 border border-slate-200 shadow-sm shrink-0 overflow-hidden flex items-center justify-center text-slate-400 font-black text-4xl">
              {profile.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profile_image_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                profile.username?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap justify-center sm:justify-start">
                <h3 className="text-2xl font-black text-slate-900">@{profile.username}</h3>
                {profile.is_verified && (
                  <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase">인증됨</span>
                )}
              </div>
              {profile.full_name && <p className="text-base font-bold text-slate-700 mb-3">{profile.full_name}</p>}
              {profile.bio && (
                <p className="text-sm text-slate-600 mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                {[
                  { label: "팔로워", val: fmt(profile.followers_count) },
                  { label: "팔로잉", val: fmt(profile.following_count) },
                  { label: "게시물", val: fmt(profile.posts_count) },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 text-center min-w-[90px]">
                    <span className="block text-[10px] text-slate-400 font-black mb-0.5 uppercase tracking-tighter">{label}</span>
                    <span className="font-black text-slate-900 text-xl">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 참여 지표 */}
      {posts.length > 0 && (
        <div>
          <InfoHeadline>수집 게시물 참여 지표 ({posts.length}개 기준)</InfoHeadline>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "평균 좋아요", val: fmt(avgLikes), sub: "게시물당" },
              { label: "평균 댓글", val: fmt(avgComments), sub: "게시물당" },
              { label: "단일 이미지", val: `${singleCount}개`, sub: `전체 ${posts.length}개 중` },
              { label: "카루셀", val: `${carouselCount}개`, sub: `전체 ${posts.length}개 중` },
              { label: "릴스", val: `${reelsCount}개`, sub: `전체 ${posts.length}개 중` },
            ].map(({ label, val, sub }) => (
              <div key={label} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                <span className="font-black text-3xl text-slate-900 block">{val}</span>
                <span className="block text-[10px] text-slate-400 font-black mt-2 uppercase tracking-tighter">{label}</span>
                <span className="text-[9px] text-slate-300">{sub}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 포스트 퍼포먼스 차트 */}
      {posts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg">
            <InfoHeadline>포스트별 좋아요</InfoHeadline>
            <div className="flex gap-4 text-[10px] font-black text-slate-400 mb-4 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-500 inline-block" />릴스</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />캐러셀</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-400 inline-block" />단일</span>
            </div>
            <div className="h-52">
              <PostLikesChart posts={posts} />
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg">
            <InfoHeadline>포맷별 평균 좋아요</InfoHeadline>
            <p className="text-xs text-slate-400 mb-4">어떤 포맷이 가장 반응이 좋은지</p>
            <div className="h-52">
              <FormatAvgLikesChart posts={posts} />
            </div>
          </div>
        </div>
      )}

      {/* 게시물 갤러리 */}
      {posts.length > 0 && (
        <div className="bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] p-10 rounded-3xl border border-slate-200">
          <InfoHeadline className="mb-8">최근 게시물 갤러리</InfoHeadline>
          <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
            {posts.map((p: any, i: number) => (
              <div key={i} className="min-w-[190px] max-w-[190px] bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100 shrink-0">
                <div className="aspect-square w-full bg-slate-100 rounded-xl relative overflow-hidden mb-3">
                  {p.image_urls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_urls[0]}
                      alt=""
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  {(p.is_reel || p.is_carousel) && (
                    <span className="absolute top-2 right-2 bg-slate-900/90 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase">
                      {p.is_reel ? "REELS" : "CAROUSEL"}
                    </span>
                  )}
                </div>
                <div className="text-[11px] space-y-1 px-1">
                  {p.caption && (
                    <p className="text-slate-700 font-medium leading-tight line-clamp-2">
                      {p.caption.slice(0, 60)}
                      {p.caption.length > 60 ? "…" : ""}
                    </p>
                  )}
                  {p.hashtags?.length > 0 && (
                    <p className="text-[10px] text-indigo-500 font-bold">{p.hashtags.slice(0, 3).join(" ")}</p>
                  )}
                  <div className="flex gap-2 text-[10px] font-black text-slate-400 pt-1.5 border-t border-slate-50 mt-1.5">
                    <span>♥ {fmt(p.likes_count)}</span>
                    {p.comments_count > 0 && <span>✦ {fmt(p.comments_count)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 브랜드 포지셔닝 요약 */}
      {summary && (
        <div className="bg-gradient-to-br from-slate-900 to-indigo-900 p-12 lg:p-16 rounded-3xl shadow-2xl relative overflow-hidden text-white">
          <div className="absolute right-0 bottom-0 w-[500px] h-[500px] bg-indigo-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30 pointer-events-none" />
          <span className="bg-white/10 border border-white/20 text-[10px] px-4 py-2 rounded-full font-bold uppercase tracking-wider mb-8 inline-block relative z-10">
            Brand Positioning Summary
          </span>
          <p className="text-2xl md:text-3xl font-black leading-snug relative z-10 text-indigo-50 mt-4">"{summary}"</p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 탭 2: 비주얼
// ────────────────────────────────────────────────────────────

function VisualPane({ v }: { v: any }) {
  const score = v.visual_identity?.score;
  const ratio = v.grid_strategy?.content_ratio ?? {};
  const singlePct = ratio.single_image ?? 0;
  const carouselPct = ratio.carousel ?? 0;
  const reelsPct = ratio.reels ?? 0;

  return (
    <div className="space-y-14 pb-20">
      <MagazineHeader num="02" sub="Visual Analysis" title="비주얼 정체성 분석" />

      {v.summary && (
        <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200">
          <DataLabel>비주얼 종합 진단</DataLabel>
          <p className="text-base text-slate-700 leading-relaxed">{v.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 피드 톤 */}
        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-lg border-t-[8px] border-t-indigo-500">
          <InfoHeadline>피드 톤 (Feed Tone)</InfoHeadline>
          <div className="space-y-6">
            {v.feed_tone?.palette && (
              <div>
                <DataLabel>색감 팔레트</DataLabel>
                <PaletteSwatch palette={v.feed_tone.palette} />
              </div>
            )}
            <div className="grid grid-cols-1 gap-4">
              {v.feed_tone?.saturation && <LevelDots label="채도" value={v.feed_tone.saturation} />}
              {v.feed_tone?.brightness && <LevelDots label="밝기" value={v.feed_tone.brightness} />}
            </div>
            {v.feed_tone?.filter_consistency && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <span className="block text-[10px] text-slate-400 font-black mb-1.5 uppercase tracking-tighter">필터 / 보정 일관성</span>
                <p className="text-sm text-slate-900 font-medium leading-relaxed">{v.feed_tone.filter_consistency}</p>
              </div>
            )}
          </div>
        </div>

        {/* 콘텐츠 유형 */}
        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-lg border-t-[8px] border-t-teal-500">
          <InfoHeadline>콘텐츠 유형</InfoHeadline>
          {/* 포맷 비율 대형 숫자 */}
          {(singlePct > 0 || carouselPct > 0 || reelsPct > 0) && (
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { label: "단일 이미지", val: singlePct, color: "text-slate-700" },
                { label: "카루셀", val: carouselPct, color: "text-indigo-600" },
                { label: "릴스", val: reelsPct, color: "text-teal-600" },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className={`text-4xl font-black ${color} block leading-none mb-1`}>{val}%</span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{label}</span>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-4">
            {v.content_types?.primary_subjects?.length > 0 && (
              <div>
                <DataLabel>주요 피사체</DataLabel>
                <div className="flex flex-wrap gap-2">
                  {v.content_types.primary_subjects.map((s: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {v.content_types?.person_frequency && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="block text-[10px] text-slate-400 font-black mb-1 uppercase tracking-tighter">인물 등장 방식</span>
                <p className="text-sm text-slate-900 font-medium">{v.content_types.person_frequency}</p>
              </div>
            )}
            {v.content_types?.product_style && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="block text-[10px] text-slate-400 font-black mb-1 uppercase tracking-tighter">제품 촬영 스타일</span>
                <p className="text-sm text-slate-900 font-medium">{v.content_types.product_style}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 구도 & 레이아웃 */}
      <div className="bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] p-10 lg:p-14 rounded-3xl border border-slate-200">
        <InfoHeadline>구도 & 레이아웃</InfoHeadline>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          <div className="flex flex-col items-center gap-4">
            <div className="aspect-square bg-slate-900 rounded-2xl p-3 grid grid-cols-3 gap-1.5 shadow-xl w-full max-w-[200px] relative">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`rounded-md ${i === 4 ? "bg-indigo-500 shadow-lg shadow-indigo-500/50" : "bg-slate-800"}`} />
              ))}
              {v.composition?.whitespace && (
                <div className="absolute -top-3 -right-3 bg-indigo-600 text-white text-[9px] font-black px-2.5 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                  여백 활용 ✓
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Grid Preview</span>
          </div>

          <div className="lg:col-span-2 space-y-5">
            {v.composition?.dominant_patterns?.length > 0 && (
              <div>
                <DataLabel>주요 구도 패턴</DataLabel>
                <div className="flex flex-wrap gap-2">
                  {v.composition.dominant_patterns.map((p: string, i: number) => (
                    <span key={i} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {v.composition?.whitespace && (
              <div>
                <DataLabel>여백 활용</DataLabel>
                <p className="text-sm text-slate-800 bg-white p-5 rounded-xl border border-slate-100 shadow-sm leading-relaxed">{v.composition.whitespace}</p>
              </div>
            )}
            {v.composition?.text_overlay && (
              <div>
                <DataLabel>텍스트 오버레이</DataLabel>
                <p className="text-sm text-slate-800 bg-white p-5 rounded-xl border border-slate-100 shadow-sm leading-relaxed">{v.composition.text_overlay}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 그리드 전략 */}
        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-lg">
          <InfoHeadline>그리드 전략</InfoHeadline>
          <div className="space-y-6">
            {v.grid_strategy?.has_pattern != null && (
              <span
                className={`inline-block px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider ${
                  v.grid_strategy.has_pattern ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {v.grid_strategy.has_pattern ? "그리드 패턴 있음" : "패턴 없음 (자유 구성)"}
              </span>
            )}
            {v.grid_strategy?.pattern_description && (
              <div>
                <DataLabel>패턴 설명</DataLabel>
                <p className="text-sm text-slate-700 bg-slate-50 p-5 rounded-xl border border-slate-100 leading-relaxed">{v.grid_strategy.pattern_description}</p>
              </div>
            )}
            <div>
              <DataLabel>포맷 비율 (단일 / 카루셀 / 릴스)</DataLabel>
              <div className="flex h-5 rounded-full overflow-hidden mb-4 bg-slate-100">
                {singlePct > 0 && <div className="bg-slate-400 transition-all" style={{ width: `${singlePct}%` }} />}
                {carouselPct > 0 && <div className="bg-indigo-500 transition-all" style={{ width: `${carouselPct}%` }} />}
                {reelsPct > 0 && <div className="bg-teal-500 transition-all" style={{ width: `${reelsPct}%` }} />}
              </div>
              <div className="flex gap-5 text-xs font-black text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-400 inline-block" />단일 {singlePct}%</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />카루셀 {carouselPct}%</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-500 inline-block" />릴스 {reelsPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 아이덴티티 점수 - 게이지 차트 */}
        <div className="bg-slate-900 p-10 rounded-3xl shadow-xl text-white flex flex-col justify-center items-center text-center gap-6">
          <DataLabel className="text-slate-500">Visual Identity Strength</DataLabel>
          {score != null ? (
            <IdentityGauge score={score} />
          ) : (
            <span className="text-7xl font-black text-white">–</span>
          )}
          {v.visual_identity?.recognizability && (
            <p className="text-sm text-slate-300 font-medium bg-white/5 p-5 rounded-2xl border border-white/10 italic leading-relaxed max-w-xs">
              "{v.visual_identity.recognizability}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 탭 3: 캡션
// ────────────────────────────────────────────────────────────

function CaptionPane({ c, posts }: { c: any; posts: any[] }) {
  const categories: { name: string; percentage: number }[] = c.content_categories?.categories ?? [];
  const colorMap: Record<string, string> = {
    교육형: "bg-blue-500",
    감성형: "bg-indigo-500",
    소통형: "bg-teal-500",
    정보형: "bg-slate-400",
    프로모션형: "bg-amber-500",
  };
  const hashtagExamples: string[] = c.hashtag_strategy?.examples ?? [];
  const hashtagTypes: string[] = c.hashtag_strategy?.types ?? [];
  const topThemes: string[] = c.content_categories?.top_themes ?? [];

  // 포스트에서 해시태그 빈도 계산
  const hashtagFreq: Record<string, number> = {};
  posts.forEach((p: any) => {
    (p.hashtags ?? []).forEach((tag: string) => {
      const t = tag.toLowerCase();
      hashtagFreq[t] = (hashtagFreq[t] ?? 0) + 1;
    });
  });
  const topHashtags = Object.entries(hashtagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-14 pb-20">
      <MagazineHeader num="03" sub="Caption & Text Strategy" title="캡션 및 텍스트 전략 분석" />

      {c.summary && (
        <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200">
          <DataLabel>캡션 전략 종합 진단</DataLabel>
          <p className="text-base text-slate-700 leading-relaxed">{c.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="space-y-8">
          {/* 콘텐츠 카테고리 */}
          <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-lg border-t-[8px] border-t-indigo-500">
            <InfoHeadline>카테고리 분포</InfoHeadline>
            <div className="space-y-5 mb-8">
              {categories.map((cat, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="w-24 text-xs font-black text-slate-500 uppercase tracking-tighter shrink-0">{cat.name}</span>
                  <div className="flex-1 h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div className={`h-full ${colorMap[cat.name] ?? "bg-slate-300"} transition-all`} style={{ width: `${cat.percentage}%` }} />
                  </div>
                  <span className="text-sm font-black text-slate-900 w-10 text-right">{cat.percentage}%</span>
                </div>
              ))}
            </div>
            {topThemes.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <DataLabel>주력 콘텐츠 테마 TOP {topThemes.length}</DataLabel>
                <div className="flex flex-wrap gap-2 mt-2 items-end">
                  {topThemes.map((theme, i) => {
                    const size = i === 0 ? "text-lg px-4 py-2.5" : i === 1 ? "text-sm px-3 py-2" : "text-xs px-2.5 py-1.5";
                    const weight = i === 0 ? "font-black" : "font-bold";
                    return (
                      <span key={i} className={`flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl ${size} ${weight}`}>
                        <span className="font-black text-indigo-400 text-[10px]">#{i + 1}</span> {theme}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 톤 & 매너 */}
          <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-lg border-t-[8px] border-t-teal-500">
            <InfoHeadline>톤 & 매너</InfoHeadline>
            <div className="space-y-6">
              {c.tone_manner?.speech_style && (
                <div className="bg-slate-900 p-6 rounded-2xl">
                  <DataLabel className="text-slate-500">말투 스타일</DataLabel>
                  <p className="text-3xl font-black text-white leading-tight">"{c.tone_manner.speech_style}"</p>
                </div>
              )}
              {c.tone_manner?.emotional_keywords?.length > 0 && (
                <div>
                  <DataLabel>감성 키워드</DataLabel>
                  <div className="flex gap-2 flex-wrap">
                    {c.tone_manner.emotional_keywords.map((k: string, i: number) => (
                      <span key={i} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600">{k}</span>
                    ))}
                  </div>
                </div>
              )}
              {(c.tone_manner?.emoji?.frequency || c.tone_manner?.emoji?.types?.length > 0) && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <DataLabel>이모지 패턴</DataLabel>
                  {c.tone_manner.emoji?.frequency && (
                    <p className="text-sm font-bold text-slate-700 mb-2">
                      사용 빈도: <span className="text-slate-900">{c.tone_manner.emoji.frequency}</span>
                    </p>
                  )}
                  {c.tone_manner.emoji?.types?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.tone_manner.emoji.types.map((t: string, i: number) => (
                        <span key={i} className="px-2.5 py-1.5 bg-white border border-slate-100 rounded-lg text-base">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 우측: 캡션 전략 + 해시태그 */}
        <div className="space-y-8">
          <div className="bg-slate-50 p-10 rounded-3xl border border-slate-200">
            <InfoHeadline>캡션 작성 전략</InfoHeadline>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
              {c.caption_strategy?.hook_style && (
                <div className="flex">
                  <div className="w-1.5 bg-indigo-500 shrink-0" />
                  <div className="p-6 flex-1">
                    <span className="text-[10px] font-black text-indigo-500 uppercase mb-2 block">01 Hook Style — 첫 줄 훅 전략</span>
                    <p className="text-base font-black text-slate-900 leading-snug mb-1">
                      {c.caption_strategy.hook_style.split(/[.:。]/)[0]}
                    </p>
                    {c.caption_strategy.hook_style.split(/[.:。]/).slice(1).join(".").trim() && (
                      <p className="text-xs text-slate-500 leading-relaxed">{c.caption_strategy.hook_style.split(/[.:。]/).slice(1).join(".").trim()}</p>
                    )}
                  </div>
                </div>
              )}
              {c.caption_strategy?.cta_pattern && (
                <div className="flex border-t border-slate-100">
                  <div className="w-1.5 bg-teal-500 shrink-0" />
                  <div className="p-6 flex-1">
                    <span className="text-[10px] font-black text-teal-500 uppercase mb-2 block">02 CTA Pattern — 행동 유도 방식</span>
                    <p className="text-base font-black text-slate-900 leading-snug mb-1">
                      {c.caption_strategy.cta_pattern.split(/[.:。]/)[0]}
                    </p>
                    {c.caption_strategy.cta_pattern.split(/[.:。]/).slice(1).join(".").trim() && (
                      <p className="text-xs text-slate-500 leading-relaxed">{c.caption_strategy.cta_pattern.split(/[.:。]/).slice(1).join(".").trim()}</p>
                    )}
                  </div>
                </div>
              )}
              {c.caption_strategy?.formatting && (
                <div className="flex border-t border-slate-100">
                  <div className="w-1.5 bg-purple-500 shrink-0" />
                  <div className="p-6 flex-1">
                    <span className="text-[10px] font-black text-purple-500 uppercase mb-2 block">03 Formatting — 줄바꿈 / 단락 스타일</span>
                    <p className="text-base font-black text-slate-900 leading-snug mb-1">
                      {c.caption_strategy.formatting.split(/[.:。]/)[0]}
                    </p>
                    {c.caption_strategy.formatting.split(/[.:。]/).slice(1).join(".").trim() && (
                      <p className="text-xs text-slate-500 leading-relaxed">{c.caption_strategy.formatting.split(/[.:。]/).slice(1).join(".").trim()}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 해시태그 전략 — 테이블 레이아웃 */}
          {(hashtagTypes.length > 0 || hashtagExamples.length > 0) && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-lg">
              <InfoHeadline>해시태그 전략</InfoHeadline>
              {hashtagTypes.length > 0 && hashtagExamples.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3 text-left font-black text-[10px] uppercase tracking-widest text-slate-400">TYPE</th>
                        <th className="px-5 py-3 text-left font-black text-[10px] uppercase tracking-widest text-slate-400">EXAMPLE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {hashtagTypes.map((type, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-3 font-bold text-slate-700">{type}</td>
                          <td className="px-5 py-3 text-indigo-600 font-bold">
                            {hashtagExamples[i] ? `#${hashtagExamples[i].replace("#", "")}` : "—"}
                          </td>
                        </tr>
                      ))}
                      {hashtagExamples.slice(hashtagTypes.length).map((ex, i) => (
                        <tr key={`ex-${i}`} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-3 text-slate-300">—</td>
                          <td className="px-5 py-3 text-indigo-600 font-bold">#{ex.replace("#", "")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[...hashtagTypes.map((t) => ({ isType: true, val: t })), ...hashtagExamples.map((e) => ({ isType: false, val: e }))].map(
                    ({ isType, val }, i) => (
                      <span
                        key={i}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                          isType ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                        }`}
                      >
                        {isType ? val : `#${val.replace("#", "")}`}
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 자주 쓴 해시태그 빈도 순위 */}
      {topHashtags.length > 0 && (
        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-lg">
          <InfoHeadline>자주 쓴 해시태그 TOP {topHashtags.length}</InfoHeadline>
          <div className="space-y-3">
            {topHashtags.map(([tag, count], i) => (
              <div key={tag} className="flex items-center gap-4">
                <span className="w-6 text-xs font-black text-slate-400 text-right shrink-0">{i + 1}</span>
                <span className="text-sm font-black text-indigo-600 w-40 shrink-0">{tag}</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${(count / (topHashtags[0]?.[1] ?? 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-black text-slate-500 w-12 text-right shrink-0">{count}회</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 소통 방식 & 커뮤니티 전략 */}
      {(c.engagement_style?.interaction_methods?.length > 0 || c.engagement_style?.community_building) && (
        <div className="bg-slate-900 p-10 lg:p-14 rounded-3xl shadow-2xl text-white">
          <InfoHeadline className="text-white border-l-indigo-400 text-2xl">소통 방식 & 커뮤니티 전략</InfoHeadline>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {c.engagement_style?.interaction_methods?.length > 0 && (
              <div>
                <DataLabel className="text-slate-500">팔로워 소통 유도 방식</DataLabel>
                <ul className="space-y-4 mt-3">
                  {c.engagement_style.interaction_methods.map((m: string, i: number) => (
                    <li key={i} className="flex items-start gap-4 text-base text-slate-200 font-medium leading-relaxed">
                      <span className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-xs font-black shrink-0 mt-0.5">{i + 1}</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {c.engagement_style?.community_building && (
              <div>
                <DataLabel className="text-slate-500">커뮤니티 형성 전략</DataLabel>
                <p className="text-lg text-white font-medium leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/10 mt-3">
                  {c.engagement_style.community_building}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 탭 4: 종합 리포트 & SWOT
// ────────────────────────────────────────────────────────────

function StrategyPane({ r }: { r: any }) {
  const swot = r.swot ?? {};

  return (
    <div className="space-y-14 pb-20">
      <MagazineHeader num="04" sub="Synthesis & Action Strategy" title="종합 분석 및 실행 전략" />

      {/* 3대 전략 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {[
          { title: "콘텐츠 전략", items: r.content_strategy, accentBorder: "border-t-indigo-500", labelColor: "text-indigo-600", leftBorder: "border-l-indigo-600" },
          { title: "브랜딩 전략", items: r.branding, accentBorder: "border-t-purple-500", labelColor: "text-purple-600", leftBorder: "border-l-purple-600" },
          { title: "성장 전략", items: r.growth_strategy, accentBorder: "border-t-teal-500", labelColor: "text-teal-600", leftBorder: "border-l-teal-600" },
        ].map((sec, idx) => (
          <div key={idx} className={`bg-white p-10 rounded-3xl border border-slate-200 shadow-lg border-t-[8px] ${sec.accentBorder}`}>
            <h4 className={`pl-4 border-l-4 ${sec.leftBorder} font-black text-lg mb-8 uppercase tracking-wider ${sec.labelColor}`}>{sec.title}</h4>
            <div className="space-y-4">
              {sec.items &&
                Object.entries(sec.items).map(([k, v]: [string, any], i) => {
                  const koLabel: Record<string, string> = {
                    primary_format: "주력 포맷", posting_frequency: "업로드 주기", content_mix: "콘텐츠 믹스",
                    hook_style: "첫 줄 훅 전략", cta_pattern: "행동 유도 방식", hashtag_use: "해시태그 활용",
                    visual_identity: "비주얼 정체성", tone_of_voice: "브랜드 화법", differentiation: "차별화 포인트",
                    target_audience: "타겟 오디언스", unique_value: "고유 가치",
                    short_term: "단기 전략", long_term: "중장기 전략", collaboration: "협업 전략",
                    engagement_tactics: "참여 유도 전술", growth_tactics: "성장 전술",
                  };
                  const label = koLabel[k] ?? k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                  const text = String(v ?? "");
                  const firstSentence = text.split(/[.。]/)[0];
                  const rest = text.split(/[.。]/).slice(1).join(".").trim();
                  return (
                    <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-black block mb-2 uppercase tracking-wider">{label}</span>
                      <p className="text-sm font-black text-slate-900 leading-snug">{firstSentence}{firstSentence && "."}</p>
                      {rest && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{rest}</p>}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* SWOT — 다크 카드 + 레이더 차트 */}
      <div className="bg-slate-900 p-10 lg:p-14 rounded-3xl shadow-2xl">
        <h3 className="pl-4 border-l-4 border-indigo-500 font-black text-3xl text-white mb-12">SWOT 분석</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-center">
          <div className="lg:col-span-1 bg-white/5 p-8 rounded-3xl border border-white/10 flex items-center justify-center aspect-square">
            <SwotRadarChart swot={swot} />
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
            {[
              { key: "strengths", label: "S", title: "Strength (강점)", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30" },
              { key: "weaknesses", label: "W", title: "Weakness (약점)", color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30" },
              { key: "opportunities", label: "O", title: "Opportunity (기회)", color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30" },
              { key: "threats", label: "T", title: "Threat (위협)", color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/30" },
            ].map(({ key, label, title, color, bg, border }) => (
              <div key={key} className={`bg-white/10 p-8 rounded-3xl border ${border}`}>
                <span className={`${color} font-black text-xl mb-5 flex items-center gap-3`}>
                  <span className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center text-sm font-black`}>{label}</span>
                  {title}
                </span>
                <ol className="list-decimal pl-5 space-y-3 text-sm leading-relaxed text-slate-200">
                  {(swot[key] ?? []).map((item: string, i: number) => {
                    const parts = item.split(/[:：]/);
                    return (
                      <li key={i}>
                        <span className="font-black text-white">{parts[0]}</span>
                        {parts.length > 1 && <span className="font-medium text-slate-300">: {parts.slice(1).join(":")}</span>}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 벤치마킹 & 실행 권고 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {r.benchmarking && (
          <div className="bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] p-10 rounded-3xl border border-slate-200">
            <InfoHeadline className="mb-8">벤치마킹 인사이트</InfoHeadline>
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl">
              {r.benchmarking.top_learnings?.map((l: string, i: number) => (
                <div key={i} className={i > 0 ? "border-t border-slate-100 pt-6 mt-6" : ""}>
                  <DataLabel className="text-indigo-600">인사이트 {i + 1}</DataLabel>
                  <p className="text-base font-medium text-slate-700 leading-relaxed">{l}</p>
                </div>
              ))}
              {r.benchmarking.actionable_tactics && (
                <div className="border-t border-slate-100 pt-6 mt-6">
                  <DataLabel className="text-indigo-600">즉시 실행 가능 전술</DataLabel>
                  <p className="text-base font-medium text-slate-700 leading-relaxed">{r.benchmarking.actionable_tactics}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {r.recommendations && (
          <div className="bg-indigo-50 p-10 rounded-3xl border border-indigo-100">
            <InfoHeadline className="text-indigo-900 border-l-indigo-600 mb-8">Action Items — 실행 권고</InfoHeadline>
            <div className="space-y-6">
              {r.recommendations.immediate?.length > 0 && (
                <div className="bg-white p-8 rounded-2xl border border-indigo-50 shadow-md">
                  <span className="inline-block bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider mb-5">
                    즉시 실행 — 이번 주 적용 가능
                  </span>
                  <ol className="space-y-5">
                    {r.recommendations.immediate.map((t: string, i: number) => (
                      <li key={i} className="flex items-start gap-4 text-base font-bold text-slate-800 leading-relaxed">
                        <span className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-base font-black shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {t}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {r.recommendations.long_term && (
                <div className="bg-slate-900 p-8 rounded-2xl shadow-xl text-white">
                  <span className="inline-block bg-slate-700 text-indigo-200 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider mb-5">
                    중장기 방향 — 3~6개월
                  </span>
                  <p className="text-base font-medium leading-relaxed text-slate-200">{r.recommendations.long_term}</p>
                </div>
              )}
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

export default function ReportCard() {
  const { currentReport, error, isAnalyzing, currentStep } = useAnalysisStore();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (isAnalyzing) {
    const stepLabel: Record<string, string> = {
      idle: '준비 중...',
      scraping: '게시물 및 프로필 데이터 수집 중...',
      analyzing: '비주얼 & 캡션 패턴 분석 중...',
      generating_report: '최종 인사이트 보고서 작성 중...',
    };
    return (
      <div className="mt-8 p-10 rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center gap-6 min-h-[320px]">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">분석 진행 중</p>
          <p className="text-base font-bold text-slate-800">{stepLabel[currentStep] ?? '처리 중...'}</p>
          <p className="text-xs text-slate-400 mt-2">인스타그램 데이터 수집 및 AI 분석에 1~2분 소요됩니다.</p>
        </div>
        <div className="w-full max-w-xs flex flex-col gap-2 mt-2">
          {(['scraping', 'analyzing', 'generating_report'] as const).map((step, i) => {
            const steps = ['scraping', 'analyzing', 'generating_report'];
            const currentIdx = steps.indexOf(currentStep);
            const isDone = i < currentIdx;
            const isActive = step === currentStep;
            return (
              <div key={step} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${isDone ? 'bg-indigo-600' : isActive ? 'bg-indigo-400 animate-pulse' : 'bg-slate-200'}`} />
                <span className={`text-xs font-bold ${isActive ? 'text-slate-800' : isDone ? 'text-indigo-500' : 'text-slate-300'}`}>
                  {['데이터 수집', 'AI 분석', '보고서 생성'][i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-8 rounded-3xl border border-red-200 bg-red-50">
        <p className="text-xs font-black text-red-700 uppercase mb-1">Analysis Error</p>
        <p className="text-sm text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  if (!currentReport || !currentReport.profile) return null;

  const { profile, posts = [], visual_analysis: v = {}, caption_analysis: c = {} } = currentReport;
  const r = currentReport.report ?? {};

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "01 오버뷰" },
    { key: "visual", label: "02 비주얼" },
    { key: "caption", label: "03 캡션" },
    { key: "strategy", label: "04 종합" },
  ];

  return (
    <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap gap-2 mb-10 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm w-full overflow-x-auto scrollbar-hide">
        {tabs.map((t) => (
          <SubTabBtn
            key={t.key}
            active={activeTab === t.key}
            onClick={() => {
              setActiveTab(t.key);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            {t.label}
          </SubTabBtn>
        ))}
      </div>

      <div className="animate-in fade-in duration-700">
        {activeTab === "overview" && <OverviewPane profile={profile} posts={posts} summary={r.summary} />}
        {activeTab === "visual" && <VisualPane v={v} />}
        {activeTab === "caption" && <CaptionPane c={c} posts={posts} />}
        {activeTab === "strategy" && <StrategyPane r={r} />}
      </div>
    </div>
  );
}
