"use client"
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { useAnalysisStore, HistoryItem } from "@/store/useAnalysisStore";
import { useAgentStore } from "@/store/useAgentStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronUp, ChevronDown, ChevronsUpDown, Download, Trash2, ExternalLink, UserSearch, TrendingUp, ArrowLeft } from "lucide-react";
import ReportCard from "@/components/ReportCard";
import AgentReportCard from "@/components/AgentReportCard";

// ────────────────────────────────────────────────────────────
// 계정 분석 열 정의
// ────────────────────────────────────────────────────────────

interface ColDef {
  key: string;
  label: string;
  group: string;
  numeric?: boolean;
  width?: string;
  get: (item: HistoryItem) => string | number | null;
}

function avgLikes(item: HistoryItem) {
  const posts = item.data?.posts ?? [];
  if (!posts.length) return null;
  return Math.round(posts.reduce((a: number, p: any) => a + (p.likes_count ?? 0), 0) / posts.length);
}
function avgComments(item: HistoryItem) {
  const posts = item.data?.posts ?? [];
  if (!posts.length) return null;
  return Math.round(posts.reduce((a: number, p: any) => a + (p.comments_count ?? 0), 0) / posts.length);
}

function formatProfileStats(item: HistoryItem) {
  const p = item.data?.profile;
  if (!p) return null;
  const followers = p.followers_count >= 10000 ? (p.followers_count / 10000).toFixed(1) + '만' : p.followers_count.toLocaleString();
  const posts = p.posts_count.toLocaleString();
  return `팔로워 ${followers} • 게시물 ${posts}`;
}

const COLS: ColDef[] = [
  { key: "username",       label: "계정",        group: "기본",    width: "140px", get: i => `@${i.username}` },
  { key: "analyzed_at",    label: "분석일시",     group: "기본",    width: "130px", get: i => i.analyzed_at },
  { key: "followers",      label: "팔로워",       group: "프로필",  numeric: true, width: "90px",  get: i => i.data?.profile?.followers_count ?? null },
  { key: "following",      label: "팔로잉",       group: "프로필",  numeric: true, width: "80px",  get: i => i.data?.profile?.following_count  ?? null },
  { key: "posts_count",    label: "게시물",       group: "프로필",  numeric: true, width: "80px",  get: i => i.data?.profile?.posts_count       ?? null },
  { key: "avg_likes",      label: "평균 좋아요",  group: "참여",    numeric: true, width: "100px", get: avgLikes },
  { key: "avg_comments",   label: "평균 댓글",    group: "참여",    numeric: true, width: "90px",  get: avgComments },
  { key: "visual_score",   label: "비주얼 점수",  group: "비주얼",  numeric: true, width: "100px", get: i => i.data?.visual_analysis?.visual_identity?.score ?? null },
  { key: "palette",        label: "색감 팔레트",  group: "비주얼",  width: "160px", get: i => i.data?.visual_analysis?.feed_tone?.palette ?? null },
  { key: "grid_pattern",   label: "그리드 패턴",  group: "비주얼",  width: "100px", get: i => { const v = i.data?.visual_analysis?.grid_strategy?.has_pattern; return v == null ? null : v ? "있음" : "없음"; }},
  { key: "single_image",   label: "단일이미지%",  group: "비주얼",  numeric: true, width: "100px", get: i => i.data?.visual_analysis?.grid_strategy?.content_ratio?.single_image ?? null },
  { key: "carousel",       label: "카루셀%",      group: "비주얼",  numeric: true, width: "80px",  get: i => i.data?.visual_analysis?.grid_strategy?.content_ratio?.carousel ?? null },
  { key: "reels",          label: "릴스%",        group: "비주얼",  numeric: true, width: "70px",  get: i => i.data?.visual_analysis?.grid_strategy?.content_ratio?.reels ?? null },
  { key: "speech_style",   label: "화법 스타일",  group: "캡션",    width: "140px", get: i => i.data?.caption_analysis?.tone_manner?.speech_style ?? null },
  { key: "top_themes",     label: "주력 테마",    group: "캡션",    width: "180px", get: i => (i.data?.caption_analysis?.content_categories?.top_themes ?? []).join(", ") || null },
  { key: "hook_style",     label: "훅 전략",      group: "캡션",    width: "160px", get: i => i.data?.caption_analysis?.caption_strategy?.hook_style ?? null },
  { key: "ai_summary",     label: "AI 요약",      group: "리포트",  width: "240px", get: i => i.data?.report?.summary ?? null },
  { key: "growth_engine",  label: "성장 동력",    group: "리포트",  width: "180px", get: i => i.data?.report?.growth_strategy?.engine ?? null },
  { key: "differentiation",label: "차별화 포인트",group: "리포트",  width: "180px", get: i => i.data?.report?.branding?.differentiation ?? null },
];

// ────────────────────────────────────────────────────────────
// 트렌드 리서치 열 정의
// ────────────────────────────────────────────────────────────

interface TrendColDef {
  key: string;
  label: string;
  width?: string;
  get: (item: HistoryItem) => string | number | null;
}

const TREND_COLS: TrendColDef[] = [
  { key: "query",     label: "질문 내용",    width: "240px", get: i => i.username.replace("[트렌드] ", "") },
  { key: "analyzed_at", label: "분석일시",   width: "130px", get: i => i.analyzed_at },
  { key: "acc_count", label: "분석 계정 수", width: "100px", get: i => i.data?.trend_accounts?.length ?? null },
  { key: "pattern1",  label: "핵심 패턴",    width: "280px", get: i => i.data?.report?.keyPatterns?.[0] ?? null },
  { key: "summary",   label: "AI 요약",      width: "300px", get: i => i.data?.report?.summary ?? null },
];

// ────────────────────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

function formatCell(col: ColDef | TrendColDef, value: string | number | null): string {
  if (value == null || value === "") return "-";
  if (col.key === "analyzed_at") return formatDate(value as string);
  if ("numeric" in col && col.numeric && typeof value === "number") return value.toLocaleString();
  return String(value);
}

type SortDir = "asc" | "desc" | null;

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === "asc")  return <ChevronUp className="w-3 h-3 ml-1 inline" />;
  if (dir === "desc") return <ChevronDown className="w-3 h-3 ml-1 inline" />;
  return <ChevronsUpDown className="w-3 h-3 ml-1 inline opacity-30" />;
}

// ────────────────────────────────────────────────────────────
// 계정 분석 테이블
// ────────────────────────────────────────────────────────────

function AccountTable({ items, onLoad, onRemove }: {
  items: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onRemove: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function handleSort(key: string) {
    if (sortKey !== key) { setSortKey(key); setSortDir("desc"); return; }
    if (sortDir === "desc") { setSortDir("asc"); return; }
    setSortKey(null); setSortDir(null);
  }

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return items;
    const col = COLS.find(c => c.key === sortKey);
    if (!col) return items;
    return [...items].sort((a, b) => {
      const av = col.get(a) ?? (col.numeric ? -Infinity : "");
      const bv = col.get(b) ?? (col.numeric ? -Infinity : "");
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, sortKey, sortDir]);

  const groups = COLS.reduce<{ group: string; span: number }[]>((acc, col) => {
    const last = acc[acc.length - 1];
    if (last && last.group === col.group) { last.span++; }
    else { acc.push({ group: col.group, span: 1 }); }
    return acc;
  }, []);

  const allSelected = sorted.length > 0 && sorted.every(i => selected.has(i.id));
  const someSelected = sorted.some(i => selected.has(i.id)) && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); sorted.forEach(i => n.delete(i.id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); sorted.forEach(i => n.add(i.id)); return n; });
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function deleteSelected() {
    if (!confirm(`선택한 ${selected.size}개를 삭제할까요?`)) return;
    selected.forEach(id => onRemove(id));
    setSelected(new Set());
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <span className="text-4xl opacity-20">🔍</span>
        <p className="text-sm">아직 계정 분석 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 선택 액션 툴바 */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-200 ${
        selected.size > 0
          ? "border-primary/40 bg-primary/5 backdrop-blur-sm shadow-md"
          : "border-transparent bg-transparent"
      }`}>
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <>
              <span className="text-sm font-semibold text-primary">{selected.size}개 선택됨</span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                선택 해제
              </button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">행을 클릭하거나 체크박스로 선택하세요</span>
          )}
        </div>
        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />선택 삭제
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-lg overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 transition-colors">
        <table className="text-sm border-collapse" style={{ minWidth: "max-content", width: "100%" }}>
          <thead>
            <tr className="border-b bg-muted/50">
              {/* 체크박스 + 액션 col */}
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground border-r whitespace-nowrap sticky left-0 bg-muted/70 z-10" rowSpan={2}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 accent-primary cursor-pointer"
                  />
                  액션
                </div>
              </th>
              {groups.map((g, i) => (
                <th key={i} colSpan={g.span} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 text-center border-r last:border-r-0">
                  {g.group}
                </th>
              ))}
            </tr>
            <tr className="border-b bg-muted/30">
              {COLS.map((col) => (
                <th key={col.key}
                  className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap cursor-pointer hover:bg-muted border-r last:border-r-0 select-none"
                  style={{ minWidth: col.width ?? "120px" }}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}<SortIcon dir={sortKey === col.key ? sortDir : null} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const isSelected = selected.has(item.id);
              return (
                <tr
                  key={item.id}
                  className={`border-b last:border-b-0 transition-colors group cursor-pointer ${
                    isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                  }`}
                  onClick={() => toggleOne(item.id)}
                >
                  <td className={`px-3 py-2 border-r whitespace-nowrap sticky left-0 z-10 transition-colors ${
                    isSelected ? "bg-primary/5" : "bg-card group-hover:bg-muted/30"
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(item.id)}
                        onClick={e => e.stopPropagation()}
                        className="w-3.5 h-3.5 accent-primary cursor-pointer"
                      />
                      <button
                        className="flex items-center gap-1 h-6 text-[11px] px-2 rounded-md border border-border bg-background hover:bg-muted transition-colors"
                        onClick={e => { e.stopPropagation(); onLoad(item); }}
                      >
                        <ExternalLink className="w-3 h-3" />보기
                      </button>
                      <button
                        className="flex items-center h-6 text-[11px] px-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={e => { e.stopPropagation(); onRemove(item.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  {COLS.map((col) => {
                    const raw = col.get(item);
                    const display = formatCell(col, raw);
                    const isEmpty = display === "-";
                    return (
                      <td key={col.key}
                        className={`px-3 py-2 border-r last:border-r-0 whitespace-nowrap max-w-[240px] truncate ${isEmpty ? "text-muted-foreground/40" : ""} ${col.numeric ? "text-right tabular-nums" : ""}`}
                        title={display !== "-" ? display : undefined}
                      >
                        {col.key === "visual_score" && raw != null ? (
                          <span className="font-semibold">{raw}<span className="text-muted-foreground font-normal">/10</span></span>
                        ) : col.key === "grid_pattern" && raw != null ? (
                          <Badge variant={raw === "있음" ? "default" : "secondary"} className="text-[10px] py-0 h-4">{raw as string}</Badge>
                        ) : col.key === "username" ? (
                          <span className="font-medium">{display}</span>
                        ) : display}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 트렌드 리서치 테이블
// ────────────────────────────────────────────────────────────

function TrendTable({ items, onLoad, onRemove }: {
  items: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onRemove: (id: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = items.length > 0 && items.every(i => selected.has(i.id));
  const someSelected = items.some(i => selected.has(i.id)) && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); items.forEach(i => n.delete(i.id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); items.forEach(i => n.add(i.id)); return n; });
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function deleteSelected() {
    if (!confirm(`선택한 ${selected.size}개를 삭제할까요?`)) return;
    selected.forEach(id => onRemove(id));
    setSelected(new Set());
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <span className="text-4xl opacity-20">📊</span>
        <p className="text-sm">아직 트렌드 리서치 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 선택 액션 툴바 */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-200 ${
        selected.size > 0
          ? "border-teal-500/40 bg-teal-500/5 backdrop-blur-sm shadow-md"
          : "border-transparent bg-transparent"
      }`}>
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <>
              <span className="text-sm font-semibold text-teal-500">{selected.size}개 선택됨</span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                선택 해제
              </button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">행을 클릭하거나 체크박스로 선택하세요</span>
          )}
        </div>
        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />선택 삭제
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-lg overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 transition-colors">
        <table className="text-sm border-collapse" style={{ minWidth: "max-content", width: "100%" }}>
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground border-r whitespace-nowrap sticky left-0 bg-muted/70 z-10">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 accent-teal-500 cursor-pointer"
                  />
                  액션
                </div>
              </th>
              {TREND_COLS.map((col) => (
                <th key={col.key}
                  className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap border-r last:border-r-0"
                  style={{ minWidth: col.width ?? "120px" }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isSelected = selected.has(item.id);
              return (
                <tr
                  key={item.id}
                  className={`border-b last:border-b-0 transition-colors group cursor-pointer ${
                    isSelected ? "bg-teal-500/5 hover:bg-teal-500/10" : "hover:bg-muted/30"
                  }`}
                  onClick={() => toggleOne(item.id)}
                >
                  <td className={`px-3 py-2 border-r whitespace-nowrap sticky left-0 z-10 transition-colors ${
                    isSelected ? "bg-teal-500/5" : "bg-card group-hover:bg-muted/30"
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(item.id)}
                        onClick={e => e.stopPropagation()}
                        className="w-3.5 h-3.5 accent-teal-500 cursor-pointer"
                      />
                      <button
                        className="flex items-center gap-1 h-6 text-[11px] px-2 rounded-md border border-border bg-background hover:bg-muted transition-colors"
                        onClick={e => { e.stopPropagation(); onLoad(item); }}
                      >
                        <ExternalLink className="w-3 h-3" />보기
                      </button>
                      <button
                        className="flex items-center h-6 text-[11px] px-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={e => { e.stopPropagation(); onRemove(item.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  {TREND_COLS.map((col) => {
                    const raw = col.get(item);
                    const display = formatCell(col, raw);
                    const isEmpty = display === "-";
                    return (
                      <td key={col.key}
                        className={`px-3 py-2 border-r last:border-r-0 max-w-[300px] truncate ${isEmpty ? "text-muted-foreground/40" : ""}`}
                        title={display !== "-" ? display : undefined}
                      >
                        {col.key === "query" ? <span className="font-medium">{display}</span> : display}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 메인 페이지
// ────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const router = useRouter();
  const { history, loadFromHistory, removeFromHistory, clearHistory } = useAnalysisStore();
  const loadTrendFromHistory = useAgentStore(s => s.loadFromHistory);
  const agentStore = useAgentStore();
  const [viewItem, setViewItem] = useState<HistoryItem | null>(null);

  const accountItems = useMemo(() => history.filter(h => h.type === 'account' || !h.type), [history]);
  const trendItems   = useMemo(() => history.filter(h => h.type === 'trend'), [history]);

  function handleLoad(item: HistoryItem) {
    if (item.type === 'trend') {
      loadTrendFromHistory(item.data.report, item.data.trend_accounts ?? []);
    } else {
      loadFromHistory(item);
    }
    setViewItem(item);
  }

  function handleBack() {
    setViewItem(null);
  }

  function exportExcel() {
    const rows = accountItems.map(item => {
      const row: Record<string, string | number> = {};
      COLS.forEach(col => {
        const val = col.get(item);
        if (col.key === "analyzed_at") row[col.label] = formatDate(val as string);
        else row[col.label] = val == null ? "" : val;
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "계정분석");
    XLSX.writeFile(wb, `instagram-analysis-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  if (viewItem) {
    const isTrend = viewItem.type === 'trend';
    return (
      <div className="space-y-6 w-full animate-in fade-in duration-500 pb-32">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="gap-2 text-slate-500 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4" />
            기록으로 돌아가기
          </Button>
          <span className="text-sm text-slate-400">
            {isTrend ? viewItem.username.replace("[트렌드] ", "") : `@${viewItem.username}`}
          </span>
        </div>
        {isTrend ? (
          <AgentReportCard
            report={viewItem.data.report}
            analyzedData={viewItem.data.trend_accounts ?? []}
            failedAccounts={[]}
          />
        ) : (
          <ReportCard />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 pb-32">
      <div className="max-w-full mx-auto space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">분석 기록</h1>
              <p className="text-sm text-muted-foreground mt-1">
                계정 {accountItems.length}개 · 트렌드 {trendItems.length}개 · 오프라인 저장이 지원됩니다
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {accountItems.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={exportExcel}>
                <Download className="w-3.5 h-3.5" />엑셀 내보내기
              </Button>
            )}
            {history.length > 0 && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive"
                onClick={() => { if (confirm("모든 기록을 삭제할까요?")) clearHistory(); }}
              >
                <Trash2 className="w-3.5 h-3.5" />전체 삭제
              </Button>
            )}
          </div>
        </div>

        {history.length === 0 && (
          <div className="p-12 sm:p-24 rounded-[2rem] border border-border/50 bg-card/30 backdrop-blur-md shadow-xl flex flex-col items-center justify-center text-muted-foreground gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
              <span className="text-3xl">📂</span>
            </div>
            <p className="text-sm font-medium">아직 분석 기록이 없습니다. 계정을 분석해보세요!</p>
            <Button variant="outline" className="mt-2" onClick={() => router.push("/")}>대시보드로 가기</Button>
          </div>
        )}

        {history.length > 0 && (
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="h-14 p-1.5 bg-card/60 border border-border/50 rounded-2xl backdrop-blur-md mb-8 inline-flex overflow-x-auto custom-scrollbar max-w-full">
              <TabsTrigger value="account" className="gap-2 px-4 sm:px-6 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all text-sm font-semibold">
                <UserSearch className="w-4 h-4" /> 계정 분석
                {accountItems.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] py-0 h-4 px-1.5 ml-1 bg-background/50">{accountItems.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="trend" className="gap-2 px-4 sm:px-6 rounded-xl data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-500 transition-all text-sm font-semibold">
                <TrendingUp className="w-4 h-4" /> 트렌드 리서치
                {trendItems.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] py-0 h-4 px-1.5 ml-1 bg-background/50">{trendItems.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <AccountTable items={accountItems} onLoad={handleLoad} onRemove={removeFromHistory} />
            </TabsContent>

            <TabsContent value="trend" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <TrendTable items={trendItems} onLoad={handleLoad} onRemove={removeFromHistory} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
