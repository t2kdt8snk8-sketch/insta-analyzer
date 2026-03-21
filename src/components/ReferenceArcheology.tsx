'use client';

import React from 'react';
import { ExternalLink, Heart, MessageCircle, BarChart3 } from 'lucide-react';

interface AnalyzedAccountData {
  profile: { username: string; followers_count?: number; posts_count?: number; biography?: string };
  posts?: { image_url?: string; likes_count?: number; comments_count?: number }[];
  captions?: {
    hashtag_strategy?: { examples?: string[] };
    tone_manner?: { speech_style?: string; dominant_tone?: string };
    caption_strategy?: { hook_style?: string };
    content_categories?: { top_themes?: string[] };
  };
  visuals?: {
    visual_identity?: { score: number; mood_board?: string; description?: string };
    feed_tone?: { palette: string[] };
    grid_strategy?: { content_ratio?: { single_image?: number; carousel?: number; reels?: number } };
  };
  report?: { summary?: string };
}

interface Props {
  analyzedData: AnalyzedAccountData[];
}

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '만';
  return num.toLocaleString();
}

const ReferenceArcheology: React.FC<Props> = ({ analyzedData }) => {
  if (!analyzedData || analyzedData.length === 0) return null;

  return (
    <div className="mt-8 font-sans">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">레퍼런스 계정</h2>
        <p className="text-sm text-muted-foreground mt-1">분석에 핵심 근거가 된 대표 계정들</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analyzedData.map((data, index) => {
          if (!data) return null;
          const username = data.profile?.username || `unknown_${index}`;
          const summaryText = data.report?.summary || data.visuals?.visual_identity?.description || data.profile?.biography || "계정 요약 정보를 불러올 수 없습니다.";
          
          const followers = data.profile?.followers_count || 0;
          const validPosts = Array.isArray(data.posts) && data.posts.length > 0 ? data.posts : [];
          const avgLikes = Math.round(validPosts.reduce((acc, curr) => acc + (curr.likes_count || 0), 0) / Math.max(1, validPosts.length));
          const avgComments = Math.round(validPosts.reduce((acc, curr) => acc + (curr.comments_count || 0), 0) / Math.max(1, validPosts.length));

          const score = data.visuals?.visual_identity?.score || 0;
          const moodBoard = data.visuals?.visual_identity?.mood_board || "주요 비주얼 무드 보드";

          const single = data.visuals?.grid_strategy?.content_ratio?.single_image || 0;
          const carousel = data.visuals?.grid_strategy?.content_ratio?.carousel || 0;
          const reels = data.visuals?.grid_strategy?.content_ratio?.reels || 0;

          const speechStyle = data.captions?.tone_manner?.speech_style || data.captions?.tone_manner?.dominant_tone;
          const hashtags = data.captions?.hashtag_strategy?.examples || [];
          const hookStyle = data.captions?.caption_strategy?.hook_style || "훅 스타일에 대한 분석결과를 불러올 수 없습니다.";
          const topThemes = data.captions?.content_categories?.top_themes || [];

          return (
            <div key={username} className="bg-[#121212] border border-[#222] rounded-2xl flex flex-col overflow-hidden">
              <div className="p-6 pb-4">
                {/* Header */}
                <div className="flex gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#1a2b2b] text-[#2dd4bf] text-xl font-bold border border-[#2dd4bf]/20 shrink-0">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-[#2dd4bf] truncate">@{username}</h3>
                      <a href={`https://instagram.com/${username}`} target="_blank" rel="noreferrer" className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-300 bg-[#222] hover:bg-[#333] rounded-md border border-[#333] transition-colors">
                        <ExternalLink className="w-3 h-3" /> 상세 보기
                      </a>
                    </div>
                    <p className="text-[13px] text-gray-400 line-clamp-2 leading-relaxed">
                      {summaryText}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 divide-x divide-[#222] py-4 border-y border-[#222] mb-6 -mx-6 px-6">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[11px] text-gray-500 mb-1.5">팔로워</span>
                    <span className="text-[15px] font-semibold text-white">{formatNumber(followers)}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[11px] text-gray-500 mb-1.5 flex items-center gap-1"><Heart className="w-3 h-3"/> 평균</span>
                    <span className="text-[15px] font-semibold text-red-500">{formatNumber(avgLikes)}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[11px] text-gray-500 mb-1.5 flex items-center gap-1"><MessageCircle className="w-3 h-3"/> 평균</span>
                    <span className="text-[15px] font-semibold text-blue-500">{formatNumber(avgComments)}</span>
                  </div>
                </div>

                {/* Visuals */}
                <div className="flex items-start mb-5 gap-3">
                  <div className="flex items-center gap-1.5 w-[60px] shrink-0 pt-0.5">
                    <BarChart3 className="w-4 h-4 text-gray-500" />
                    <span className="text-[13px] text-gray-400 font-medium">비주얼</span>
                  </div>
                  <span className="text-[13px] font-bold text-white shrink-0 pt-0.5 w-10">{score}/10</span>
                  <div className="flex-1">
                    <div className="inline-flex items-center px-2 py-0.5 rounded border border-orange-500/20 bg-orange-500/10 text-orange-400 text-[11px] leading-snug">
                      🎨 {moodBoard}
                    </div>
                  </div>
                </div>

                {/* Content Ratio */}
                <div className="mb-6">
                  <div className="text-[11px] text-gray-500 mb-2">콘텐츠 비율</div>
                  <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-2.5">
                    {single > 0 && <div style={{ width: `${single}%` }} className="bg-blue-600" />}
                    {carousel > 0 && <div style={{ width: `${carousel}%` }} className="bg-fuchsia-600" />}
                    {reels > 0 && <div style={{ width: `${reels}%` }} className="bg-red-600" />}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-gray-400">
                    {single > 0 && <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"/>단일 {single}%</span>}
                    {carousel > 0 && <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-fuchsia-600"/>카루셀 {carousel}%</span>}
                    {reels > 0 && <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-600"/>릴스 {reels}%</span>}
                  </div>
                </div>

                {/* Speech Style & Hashtags */}
                <div className="mb-6 space-y-3">
                  {speechStyle && (
                    <div className="inline-flex px-2 py-1 rounded border border-blue-500/20 bg-blue-500/10 text-blue-400 text-[11px] leading-snug">
                      ✍️ {speechStyle}
                    </div>
                  )}
                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {hashtags.slice(0, 5).map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-[#222] text-gray-300 text-[11px] border border-[#333]">
                          #{tag.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hook Style */}
                <div className="mb-2">
                  <div className="text-[11px] text-gray-500 mb-1.5">훅 스타일</div>
                  <p className="text-[13px] text-gray-300 leading-relaxed">
                    {hookStyle}
                  </p>
                </div>
              </div>

              {/* Bottom Tags */}
              <div className="mt-auto p-4 md:px-6 bg-[#181818] border-t border-[#222] flex flex-wrap gap-2">
                {topThemes.map(theme => (
                  <span key={theme} className="px-2 py-0.5 flex items-center gap-1.5 rounded-full border border-green-500/30 text-green-400 text-[10px] font-medium bg-green-500/5">
                    <div className="w-1 h-1 rounded-full bg-green-500" />
                    {theme}
                  </span>
                ))}
                {topThemes.length === 0 && (
                  <span className="text-[10px] text-gray-500">주요 테마 정보 없음</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReferenceArcheology;
