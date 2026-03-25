"use client"
import { useAnalysisStore, HistoryItem } from "@/store/useAnalysisStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { History, Trash2, ExternalLink, Download, Loader2, GitMerge } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useState } from "react";
import * as XLSX from "xlsx";

function buildAccountRow(item: HistoryItem): Record<string, string | number> {
  const d = item.data ?? {};
  const profile = d.profile ?? {};
  const report = d.report ?? {};
  const va = d.visual_analysis ?? d.visuals ?? {};
  const posts: any[] = d.posts ?? [];

  const followers = Number(profile.followers_count ?? 0);
  const avgLikes = posts.length
    ? Math.round(posts.reduce((s: number, p: any) => s + (p.likes_count ?? 0), 0) / posts.length)
    : 0;
  const er = followers > 0 ? parseFloat((avgLikes / followers * 100).toFixed(2)) : 0;

  const reels    = posts.filter((p: any) => p.is_reel);
  const carousel = posts.filter((p: any) => !p.is_reel && p.is_carousel);
  const single   = posts.filter((p: any) => !p.is_reel && !p.is_carousel);
  const avgL = (arr: any[]) => arr.length ? Math.round(arr.reduce((s, p) => s + (p.likes_count ?? 0), 0) / arr.length) : 0;

  const swot = report.swot ?? {};
  const kp: any[] = report.keyPatterns ?? [];
  const join = (arr: string[]) => arr?.join('; ') ?? '';
  const topHT = (d.captions ?? []).flatMap((c: any) => c.hashtags ?? []).slice(0, 20).join(', ');

  return {
    '계정명': item.username,
    '분석일시': item.analyzed_at,
    '팔로워': followers,
    '팔로잉': Number(profile.following_count ?? 0),
    '게시물수': Number(profile.posts_count ?? 0),
    '인증여부': profile.is_verified ? 'Y' : 'N',
    '바이오': profile.biography ?? profile.bio ?? '',
    '평균좋아요': avgLikes,
    '인게이지먼트율(%)': er,
    '비주얼점수': va.visual_identity?.score ?? '',
    '색감팔레트': join(va.feed_palette ?? va.dominant_palette ?? []),
    '릴스비율(%)': posts.length ? Math.round(reels.length / posts.length * 100) : 0,
    '캐러셀비율(%)': posts.length ? Math.round(carousel.length / posts.length * 100) : 0,
    '단일이미지비율(%)': posts.length ? Math.round(single.length / posts.length * 100) : 0,
    '릴스평균좋아요': avgL(reels),
    '캐러셀평균좋아요': avgL(carousel),
    '단일이미지평균좋아요': avgL(single),
    'AI요약': report.summary ?? '',
    '콘텐츠전략_믹스': report.content_strategy?.mix ?? '',
    '콘텐츠전략_루틴': report.content_strategy?.routine ?? '',
    '브랜딩_비주얼강도': report.branding?.visual_strength ?? '',
    '브랜딩_보이스일관성': report.branding?.voice_consistency ?? '',
    '브랜딩_차별화': report.branding?.differentiation ?? '',
    '성장전략_엔진': report.growth_strategy?.engine ?? '',
    'SWOT_강점': join(swot.strengths ?? []),
    'SWOT_약점': join(swot.weaknesses ?? []),
    'SWOT_기회': join(swot.opportunities ?? []),
    'SWOT_위협': join(swot.threats ?? []),
    '핵심패턴': kp.map((p: any) => `[${p.pattern}] ${p.observed} / ${p.implication}`).join(' | '),
    '주요해시태그': topHT,
    '추천액션': join(report.recommendations ?? []),
  };
}

function buildTrendRow(item: HistoryItem): Record<string, string | number>[] {
  const d = item.data ?? {};
  const report = d.report ?? {};
  const accounts: any[] = d.accounts ?? d.scrapedData ?? [];

  return accounts.map((acc: any) => {
    const profile = acc.profile ?? {};
    const posts: any[] = acc.posts ?? [];
    const followers = Number(profile.followers_count ?? 0);
    const avgLikes = posts.length
      ? Math.round(posts.reduce((s: number, p: any) => s + (p.likes_count ?? 0), 0) / posts.length)
      : 0;
    const er = followers > 0 ? parseFloat((avgLikes / followers * 100).toFixed(2)) : 0;

    return {
      '리서치주제': item.username,
      '분석일시': item.analyzed_at,
      '계정명': profile.username ?? '',
      '팔로워': followers,
      '평균좋아요': avgLikes,
      '인게이지먼트율(%)': er,
      '비주얼점수': acc.visual_analysis?.visual_identity?.score ?? '',
      'AI종합요약': report.summary ?? '',
      '비주얼트렌드': (report.visualTrends ?? []).map((t: any) =>
        typeof t === 'string' ? t : `${t.title}: ${t.description}`).join(' | '),
      '캡션트렌드': (report.captionTrends ?? []).map((t: any) =>
        typeof t === 'string' ? t : `${t.title}: ${t.description}`).join(' | '),
      'SWOT_강점': (report.swot?.strengths ?? []).join('; '),
      'SWOT_약점': (report.swot?.weaknesses ?? []).join('; '),
      '추천액션': (report.recommendations ?? []).join(' | '),
    };
  });
}

function exportToExcel(history: HistoryItem[]) {
  const wb = XLSX.utils.book_new();

  const accountItems = history.filter(h => h.type === 'account');
  const trendItems = history.filter(h => h.type === 'trend');

  if (accountItems.length > 0) {
    const rows = accountItems.map(buildAccountRow);
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '단일계정분석');
  }

  if (trendItems.length > 0) {
    const rows = trendItems.flatMap(buildTrendRow);
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '트렌드리서치');
  }

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `insta-analysis-${date}.xlsx`);
}

function formatDate(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ko });
  } catch {
    return iso;
  }
}

function HistoryRow({
  item,
  onLoad,
  onDelete,
  selectable,
  selected,
  onToggle,
  disabled,
}: {
  item: HistoryItem;
  onLoad: () => void;
  onDelete: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}) {
  const profile = item.data?.profile;
  const report = item.data?.report;
  const va = item.data?.visual_analysis;
  const isTrend = item.type === 'trend';
  const trendPrompt = isTrend ? item.username.replace('[트렌드] ', '') : null;
  const trendAccountCount = item.data?.trend_accounts?.length ?? 0;

  return (
    <div
      className={`flex items-start gap-3 py-3 px-1 rounded-lg transition-colors group
        ${selectable && isTrend ? 'cursor-pointer hover:bg-muted/40' : 'hover:bg-muted/40'}
        ${selected ? 'bg-muted/60 ring-1 ring-primary/30' : ''}`}
      onClick={selectable && isTrend && onToggle ? onToggle : undefined}
    >
      {/* 체크박스 (트렌드 항목만) */}
      {selectable && isTrend && (
        <div className={`flex-shrink-0 mt-1 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
          ${selected ? 'bg-primary border-primary' : 'border-muted-foreground/40'}
          ${disabled && !selected ? 'opacity-30' : ''}`}>
          {selected && <div className="w-2 h-2 bg-white rounded-sm" />}
        </div>
      )}

      {/* 아이콘/프로필 이미지 */}
      {!isTrend && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold overflow-hidden">
          {profile?.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span>{item.username.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
      )}
      {isTrend && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <GitMerge className="w-4 h-4" />
        </div>
      )}

      {/* 정보 */}
      <div className="flex-1 min-w-0 space-y-1">
        {isTrend ? (
          <>
            <span className="text-xs font-black uppercase tracking-wider text-primary">트렌드 리서치</span>
            <p className="text-sm font-semibold leading-snug line-clamp-2">{trendPrompt}</p>
            <div className="flex gap-2 text-[11px] text-muted-foreground">
              <span>{trendAccountCount}개 계정 분석</span>
              <span>·</span>
              <span>{formatDate(item.analyzed_at)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold truncate">@{item.username}</span>
              {va?.visual_identity?.score != null && (
                <Badge variant="outline" className="text-[10px] py-0 h-4 shrink-0">
                  일관성 {va.visual_identity.score}/10
                </Badge>
              )}
            </div>
            <div className="flex gap-3 text-[11px] text-muted-foreground">
              {profile?.followers_count != null && (
                <span>팔로워 {Number(profile.followers_count).toLocaleString()}</span>
              )}
              {profile?.posts_count != null && (
                <span>게시물 {profile.posts_count}</span>
              )}
            </div>
            {report?.summary && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{report.summary}</p>
            )}
            <p className="text-[10px] text-muted-foreground/60">{formatDate(item.analyzed_at)}</p>
          </>
        )}
      </div>

      {/* 액션 버튼 (체크박스 모드일 때는 숨김) */}
      {!selectable && (
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button size="sm" variant="default" className="h-7 text-xs px-2" onClick={onLoad}>
            <ExternalLink className="w-3 h-3 mr-1" />
            보기
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
      {selectable && !isTrend && (
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button size="sm" variant="default" className="h-7 text-xs px-2" onClick={(e) => { e.stopPropagation(); onLoad(); }}>
            <ExternalLink className="w-3 h-3 mr-1" />
            보기
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function HistoryPanel() {
  const { history, loadFromHistory, removeFromHistory, clearHistory } = useAnalysisStore();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMetaLoading, setIsMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const MAX_SELECT = 3;
  const trendItems = history.filter(h => h.type === 'trend');
  const hasTrendItems = trendItems.length >= 2;

  function handleLoad(item: HistoryItem) {
    loadFromHistory(item);
    setOpen(false);
    setSelectedIds([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, id];
    });
  }

  async function handleMetaSynthesize() {
    const selected = history.filter(h => selectedIds.includes(h.id));
    if (selected.length < 2) return;

    setIsMetaLoading(true);
    setMetaError(null);

    try {
      const sessions = selected.map(item => ({
        prompt: item.username.replace('[트렌드] ', ''),
        analyzed_at: item.analyzed_at,
        accounts: item.data?.trend_accounts ?? [],
      }));

      const res = await fetch('/api/agent/meta-synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '종합 분석 중 오류가 발생했습니다.');

      const { useAgentStore } = await import('@/store/useAgentStore');
      useAgentStore.getState().loadMetaResult(
        data.report,
        sessions.flatMap(s => s.accounts),
        data.metaInfo,
      );

      setOpen(false);
      setSelectedIds([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: unknown) {
      setMetaError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setIsMetaLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5" />}>
        <History className="w-3.5 h-3.5" />
        분석 기록
        {history.length > 0 && (
          <Badge variant="secondary" className="text-[10px] py-0 h-4 px-1.5 ml-0.5">
            {history.length}
          </Badge>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">분석 기록</SheetTitle>
            {history.length > 0 && (
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => exportToExcel(history)}
                >
                  <Download className="w-3 h-3 mr-1" />
                  엑셀 내보내기
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm("모든 기록을 삭제할까요?")) clearHistory();
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  전체 삭제
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {history.length > 0
              ? `최근 ${history.length}개 분석 저장됨 · 새로고침해도 유지됩니다`
              : "아직 분석 기록이 없습니다"}
          </p>
        </SheetHeader>

        {history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3 text-muted-foreground">
            <History className="w-10 h-10 opacity-20" />
            <p className="text-sm">계정을 분석하면 여기에 자동으로 저장됩니다.</p>
          </div>
        ) : (
          <>
            {/* 요약 테이블 헤더 */}
            <div className="px-5 pt-3">
              <div className="grid text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-1"
                style={{ gridTemplateColumns: "1fr auto" }}>
                <span>계정</span>
                <span>액션</span>
              </div>
              <Separator className="mt-2" />
            </div>

            {/* 종합 분석 안내 */}
            {hasTrendItems && (
              <div className="px-5 pb-2 pt-1">
                <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 flex items-center justify-between">
                  <p className="text-[11px] text-primary font-medium">
                    트렌드 항목 선택 후 종합 분석 (최대 {MAX_SELECT}개)
                  </p>
                  {selectedIds.length > 0 && (
                    <span className="text-[11px] font-black text-primary">{selectedIds.length}/{MAX_SELECT}</span>
                  )}
                </div>
              </div>
            )}

            <ScrollArea className="flex-1 px-3">
              <div className="py-2 space-y-0.5">
                {history.map((item) => (
                  <HistoryRow
                    key={item.id}
                    item={item}
                    onLoad={() => handleLoad(item)}
                    onDelete={() => removeFromHistory(item.id)}
                    selectable={hasTrendItems}
                    selected={selectedIds.includes(item.id)}
                    onToggle={() => toggleSelect(item.id)}
                    disabled={selectedIds.length >= MAX_SELECT && !selectedIds.includes(item.id)}
                  />
                ))}
              </div>
            </ScrollArea>

            {/* 하단 */}
            <div className="px-5 py-3 border-t bg-muted/30 space-y-2">
              {selectedIds.length >= 2 && (
                <>
                  {metaError && (
                    <p className="text-[11px] text-destructive text-center">{metaError}</p>
                  )}
                  <Button
                    className="w-full h-9 text-sm font-bold"
                    onClick={handleMetaSynthesize}
                    disabled={isMetaLoading}
                  >
                    {isMetaLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />종합 분석 중...</>
                    ) : (
                      <><GitMerge className="w-3.5 h-3.5 mr-2" />{selectedIds.length}개 항목 종합 분석</>
                    )}
                  </Button>
                </>
              )}
              {selectedIds.length < 2 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {hasTrendItems ? '트렌드 항목을 2~3개 선택하면 종합 분석이 가능합니다' : '항목을 클릭하면 해당 분석 결과를 불러옵니다'}
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
