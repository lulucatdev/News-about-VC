"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Article } from "@/lib/db";

interface Props {
  initialArticles: Article[];
  initialCounts: Record<string, number>;
  initialTotal: number;
  initialLastCrawl: string | null;
}

const SOURCES = [
  "Paul Graham",
  "Hacker News",
  "Sam Altman",
  "Fred Wilson",
  "Benedict Evans",
] as const;

const STORAGE_KEY = "vc_radar_last_articles";
const WELCOME_KEY = "vc_radar_welcome_shown";

function getSourceDotColor(source: string): string {
  if (source.includes("Paul")) return "var(--source-pg)";
  if (source.includes("Hacker")) return "var(--source-hn)";
  if (source.includes("Sam") || source.includes("Altman"))
    return "var(--source-sa)";
  if (source.includes("Fred") || source.includes("Wilson"))
    return "var(--source-fw)";
  if (source.includes("Benedict") || source.includes("Evans"))
    return "var(--source-be)";
  return "var(--accent)";
}

function getArticleId(item: { title: string; source: string }): string {
  return (item.title + "|" + item.source).toLowerCase().trim();
}

function formatLastCrawl(crawlTime: string | null): string {
  if (!crawlTime) return "";
  return crawlTime.slice(0, 16).replace("T", " ");
}

export default function ClientApp({
  initialArticles,
  initialCounts,
  initialTotal,
  initialLastCrawl,
}: Props) {
  const [articles, setArticles] = useState(initialArticles);
  const [counts, setCounts] = useState(initialCounts);
  const [total, setTotal] = useState(initialTotal);
  const [lastCrawl, setLastCrawl] = useState(initialLastCrawl);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasNewDot, setHasNewDot] = useState(false);
  const [newArticles, setNewArticles] = useState<Article[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Check welcome modal on mount
  useEffect(() => {
    try {
      if (!localStorage.getItem(WELCOME_KEY)) {
        setShowWelcome(true);
      }
    } catch {
      setShowWelcome(true);
    }
  }, []);

  // Check for new articles on mount
  useEffect(() => {
    if (articles.length === 0) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // First visit, save current
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(articles.map(getArticleId))
        );
        return;
      }
      const lastIds = new Set<string>(JSON.parse(stored));
      const fresh = articles.filter((a) => !lastIds.has(getArticleId(a)));
      if (fresh.length > 0) {
        setNewArticles(fresh);
        setHasNewDot(true);
      }
    } catch {
      // ignore
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = articles.filter((a) => {
    if (sourceFilter !== "all" && a.source !== sourceFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const handleBellClick = useCallback(() => {
    setShowNotification(true);
    if (newArticles.length > 0) {
      setHasNewDot(false);
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(articles.map(getArticleId))
        );
      } catch {
        // ignore
      }
      setNewArticles([]);
    }
  }, [newArticles.length, articles]);

  const closeWelcome = useCallback(() => {
    setShowWelcome(false);
    try {
      localStorage.setItem(WELCOME_KEY, "true");
    } catch {
      // ignore
    }
  }, []);

  return (
    <>
      <div className="accent-bar" />

      <div className="app">
        {/* Nav */}
        <nav className="nav">
          <div className="nav-brand">
            <span className="nav-logo" />
            <span className="nav-title">VC Radar</span>
            <span className="nav-version">v3.0</span>
            <div
              className="notification-bell"
              onClick={handleBellClick}
              title="检查新文章"
            >
              <span
                className="bell-icon"
                style={{
                  color: "var(--accent)",
                  filter: "drop-shadow(0 1px 2px rgba(243, 128, 32, 0.3))",
                }}
              >
                🔔
              </span>
              {hasNewDot && <span className="notification-dot" />}
            </div>
          </div>
          <div className="nav-controls">
            <select
              className="nav-select"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">全部来源</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              className="nav-input"
              type="text"
              placeholder="搜索标题..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {lastCrawl && (
              <span className="last-update">
                最后更新: {formatLastCrawl(lastCrawl)}
              </span>
            )}
          </div>
        </nav>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{filtered.length}</div>
            <div className="stat-label">总计</div>
          </div>
          {SOURCES.map((s) => (
            <div className="stat-card" key={s}>
              <div className="stat-value">{counts[s] ?? 0}</div>
              <div className="stat-label">
                <span
                  className="stat-dot"
                  style={{ background: getSourceDotColor(s) }}
                />
                {s}
              </div>
            </div>
          ))}
        </div>

        {/* Info Bar */}
        <div className="info-bar">
          <span className="info-text">
            📡 每小时自动更新 5 大 VC 源最新内容
          </span>
          <span className="db-info">
            <span style={{ color: "var(--text-muted)", marginRight: 12 }}>
              上次更新: {lastCrawl ? formatLastCrawl(lastCrawl) : "--"}
            </span>
            已抓取 <strong>{total}</strong> 条
          </span>
        </div>

        {/* Table */}
        <div className="table-card">
          {filtered.length === 0 ? (
            <div className="loading-msg">暂无数据</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>来源</th>
                  <th>标题</th>
                  <th style={{ width: "35%" }}>时间</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-source">
                      <span
                        className="source-dot"
                        style={{
                          background: getSourceDotColor(item.source),
                        }}
                      />
                      <span className="source-name">{item.source}</span>
                    </td>
                    <td>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="title-link"
                      >
                        {item.title}
                      </a>
                    </td>
                    <td className="cell-time">
                      {item.publish_time?.slice(0, 10) ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <footer className="footer">Product By Chen Zihui</footer>
      </div>

      {/* Notification Modal */}
      {showNotification && (
        <div
          className="notification-modal active"
          ref={notificationRef}
          onClick={(e) => {
            if (e.target === notificationRef.current)
              setShowNotification(false);
          }}
        >
          <div className="notification-content">
            <div className="notification-header">
              <span className="notification-title">📬 新内容通知</span>
              <button
                className="notification-close"
                onClick={() => setShowNotification(false)}
              >
                ×
              </button>
            </div>
            <div>
              {newArticles.length === 0 ? (
                <div className="notification-empty">🔍 暂无新内容更新</div>
              ) : (
                <>
                  <ul className="notification-list">
                    {newArticles.map((item, i) => (
                      <li
                        key={i}
                        className="notification-item"
                        onClick={() => window.open(item.url, "_blank")}
                      >
                        <span
                          className="notification-dot-small"
                          style={{
                            background: getSourceDotColor(item.source),
                          }}
                        />
                        <div className="notification-text">
                          <div
                            className="notification-article-title"
                            style={{
                              color: "var(--accent)",
                              textDecoration: "underline",
                            }}
                          >
                            {item.title}
                          </div>
                          <div className="notification-article-source">
                            {item.source}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: "1px solid var(--border)",
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      textAlign: "center",
                    }}
                  >
                    点击标题可查看文章
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Welcome Modal */}
      {showWelcome && (
        <div className="welcome-modal active">
          <div className="welcome-content">
            <div className="welcome-header">
              <span className="welcome-icon">📡</span>
              <span className="welcome-title">欢迎使用 VC Radar</span>
            </div>
            <div className="welcome-body">
              <div className="welcome-section">
                <h3>📡 这是什么？</h3>
                <p>
                  VC Radar
                  是一个聚合型资讯平台，为你实时追踪全球顶级 VC
                  和科技领袖的最新动态。
                </p>
              </div>
              <div className="welcome-section">
                <h3>🔍 我们追踪的 5 大信源：</h3>
                <ul className="welcome-sources">
                  <li>
                    <strong>Paul Graham</strong> -{" "}
                    <span>Y Combinator 创始人，创业教父</span>
                  </li>
                  <li>
                    <strong>Sam Altman</strong> -{" "}
                    <span>OpenAI CEO，AI 领域先锋</span>
                  </li>
                  <li>
                    <strong>Fred Wilson</strong> -{" "}
                    <span>知名 VC 投资人，AVC 博客主</span>
                  </li>
                  <li>
                    <strong>Benedict Evans</strong> -{" "}
                    <span>科技行业分析师，趋势洞察者</span>
                  </li>
                  <li>
                    <strong>Hacker News</strong> -{" "}
                    <span>全球技术社区热点资讯</span>
                  </li>
                </ul>
              </div>
              <div className="welcome-section">
                <h3>✨ 主要功能：</h3>
                <ul className="welcome-features">
                  <li>
                    <span className="feature-icon">📬</span>{" "}
                    <strong>自动更新</strong> - 每小时自动抓取 5 个网站的最新内容
                  </li>
                  <li>
                    <span className="feature-icon">🔔</span>{" "}
                    <strong>新内容提醒</strong> -
                    自动检测上次访问后的更新，铃铛提示
                  </li>
                  <li>
                    <span className="feature-icon">🔑</span>{" "}
                    <strong>智能关键词</strong> - 自动提取文章核心主题
                  </li>
                  <li>
                    <span className="feature-icon">📊</span>{" "}
                    <strong>按主题浏览</strong> - 相似内容自动归类排列
                  </li>
                  <li>
                    <span className="feature-icon">⚡</span>{" "}
                    <strong>极速体验</strong> - 并行爬取，10 秒内获取 160+
                    条资讯
                  </li>
                </ul>
              </div>
              <div className="welcome-section">
                <h3>💡 使用提示：</h3>
                <ul className="welcome-tips">
                  <li>内容每小时自动更新，无需手动刷新</li>
                  <li>关注铃铛 🔔 图标，橙色圆点表示有新内容</li>
                  <li>点击文章标题即可跳转到原文阅读</li>
                </ul>
              </div>
            </div>
            <div className="welcome-footer">
              <button className="welcome-btn" onClick={closeWelcome}>
                I got it.
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
