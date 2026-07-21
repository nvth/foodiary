"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./suggestions.module.css";

type SuggestionStatus = "unread" | "read";
type SuggestionFilter = "all" | SuggestionStatus;

type AdminSuggestion = {
  id: string;
  username: string | null;
  message: string;
  status: SuggestionStatus;
  createdAt: string;
  updatedAt: string;
};

type SuggestionsResponse = {
  suggestions?: AdminSuggestion[];
  error?: string;
};

type PendingAction = "status" | "delete";

const FILTERS: Array<{ label: string; value: SuggestionFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Chưa đọc", value: "unread" },
  { label: "Đã đọc", value: "read" },
];

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

async function responseData(response: Response): Promise<SuggestionsResponse> {
  try {
    return await response.json() as SuggestionsResponse;
  } catch {
    return {};
  }
}

async function requestSuggestions(signal?: AbortSignal): Promise<AdminSuggestion[]> {
  const response = await fetch("/admin/api/suggestions?limit=100", {
    cache: "no-store",
    signal,
  });
  const data = await responseData(response);
  if (!response.ok || !Array.isArray(data.suggestions)) {
    throw new Error(data.error ?? "Không thể tải hộp thư góp ý.");
  }
  return data.suggestions;
}

function displayName(username: string | null) {
  return username?.trim() || "Ẩn danh";
}

function displayInitial(username: string | null) {
  return Array.from(displayName(username))[0]?.toLocaleUpperCase("vi-VN") ?? "?";
}

function parseSuggestionDate(value: string) {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  return new Date(normalized);
}

function suggestionTime(value: string) {
  const date = parseSuggestionDate(value);
  if (Number.isNaN(date.getTime())) return null;
  return { dateTime: date.toISOString(), label: dateFormatter.format(date) };
}

function newestFirst(left: AdminSuggestion, right: AdminSuggestion) {
  const leftTime = parseSuggestionDate(left.createdAt).getTime();
  const rightTime = parseSuggestionDate(right.createdAt).getTime();
  return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
}

export default function SuggestionsInbox() {
  const [suggestions, setSuggestions] = useState<AdminSuggestion[]>([]);
  const [filter, setFilter] = useState<SuggestionFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingActions, setPendingActions] = useState<Record<string, PendingAction>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSuggestions = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      setSuggestions(await requestSuggestions(signal));
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Đã có lỗi xảy ra khi tải góp ý.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void requestSuggestions(controller.signal)
      .then(setSuggestions)
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Đã có lỗi xảy ra khi tải góp ý.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const counts = useMemo(() => {
    const unread = suggestions.filter((suggestion) => suggestion.status === "unread").length;
    return { all: suggestions.length, unread, read: suggestions.length - unread };
  }, [suggestions]);

  const filteredSuggestions = useMemo(() => suggestions
    .filter((suggestion) => filter === "all" || suggestion.status === filter)
    .sort(newestFirst), [filter, suggestions]);

  function beginAction(id: string, action: PendingAction) {
    setPendingActions((current) => ({ ...current, [id]: action }));
    setError("");
    setMessage("");
  }

  function endAction(id: string) {
    setPendingActions((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function toggleStatus(suggestion: AdminSuggestion) {
    const nextStatus: SuggestionStatus = suggestion.status === "unread" ? "read" : "unread";
    beginAction(suggestion.id, "status");

    try {
      const response = await fetch(`/admin/api/suggestions?id=${encodeURIComponent(suggestion.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await responseData(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Không thể cập nhật trạng thái góp ý.");
      }

      setSuggestions((current) => current.map((item) => (
        item.id === suggestion.id ? { ...item, status: nextStatus } : item
      )));
      setMessage(nextStatus === "read" ? "Đã đánh dấu góp ý là đã đọc." : "Đã chuyển góp ý về trạng thái chưa đọc.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Đã có lỗi xảy ra khi cập nhật góp ý.");
    } finally {
      endAction(suggestion.id);
    }
  }

  async function deleteSuggestion(suggestion: AdminSuggestion) {
    const username = displayName(suggestion.username);
    if (!window.confirm(`Xóa góp ý của “${username}”? Hành động này không thể hoàn tác.`)) return;

    beginAction(suggestion.id, "delete");
    try {
      const response = await fetch(`/admin/api/suggestions?id=${encodeURIComponent(suggestion.id)}`, {
        method: "DELETE",
      });
      const data = await responseData(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Không thể xóa góp ý.");
      }

      setSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
      setMessage(`Đã xóa góp ý của “${username}”.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Đã có lỗi xảy ra khi xóa góp ý.");
    } finally {
      endAction(suggestion.id);
    }
  }

  const initialLoading = isLoading && suggestions.length === 0;
  const loadFailed = Boolean(error) && suggestions.length === 0 && !isLoading;

  return (
    <section className="admin-workspace">
      <header className="admin-page-header">
        <div>
          <p>Hộp thư từ độc giả</p>
          <h1>Góp ý quán</h1>
        </div>
        <div className={styles.headerSummary} aria-live="polite">
          <strong>{initialLoading ? "Đang tải…" : `${counts.unread} góp ý chưa đọc`}</strong>
          <span>Góp ý mới nhất luôn được xếp lên đầu.</span>
        </div>
      </header>

      <div className={styles.stats} aria-label="Thống kê góp ý">
        <article>
          <span>Tổng góp ý</span>
          <strong>{initialLoading ? "—" : counts.all}</strong>
        </article>
        <article className={styles.unreadStat}>
          <span>Chưa đọc</span>
          <strong>{initialLoading ? "—" : counts.unread}</strong>
        </article>
        <article>
          <span>Đã đọc</span>
          <strong>{initialLoading ? "—" : counts.read}</strong>
        </article>
      </div>

      <section className={`admin-panel ${styles.panel}`} aria-labelledby="suggestion-list-title" aria-busy={isLoading}>
        <div className={styles.toolbar}>
          <div>
            <h2 id="suggestion-list-title">Danh sách góp ý</h2>
            <p>Đọc, phân loại và dọn dẹp phản hồi về những quán độc giả muốn giới thiệu.</p>
          </div>
          <button className={styles.refreshButton} type="button" onClick={() => void loadSuggestions()} disabled={isLoading}>
            {isLoading ? "Đang tải…" : "Tải lại"}
          </button>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.filters} role="group" aria-label="Lọc góp ý theo trạng thái">
            {FILTERS.map((option) => (
              <button
                className={styles.filterButton}
                type="button"
                key={option.value}
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
                <span aria-hidden="true">{counts[option.value]}</span>
              </button>
            ))}
          </div>
          {!initialLoading && !loadFailed && (
            <p aria-live="polite">Hiển thị {filteredSuggestions.length} góp ý</p>
          )}
        </div>

        {(suggestions.length > 0 || message) && (
          <div className={styles.feedback} aria-live="polite">
            {error && <p className={styles.error} role="alert">{error}</p>}
            {!error && message && <p className={styles.success} role="status">{message}</p>}
          </div>
        )}

        {initialLoading ? (
          <div className={styles.loading} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            <strong>Đang tải hộp thư…</strong>
            <span>Các góp ý sẽ xuất hiện trong giây lát.</span>
          </div>
        ) : loadFailed ? (
          <div className={styles.empty} role="alert">
            <strong>Chưa thể mở hộp thư</strong>
            <span>{error}</span>
            <button type="button" onClick={() => void loadSuggestions()}>Thử lại</button>
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className={styles.empty}>
            <strong>{suggestions.length === 0 ? "Chưa có góp ý nào" : "Không có góp ý ở trạng thái này"}</strong>
            <span>{suggestions.length === 0 ? "Góp ý mới từ trang chủ sẽ được lưu tại đây." : "Chọn bộ lọc khác để xem các góp ý còn lại."}</span>
          </div>
        ) : (
          <div className={styles.listRegion}>
            <div className={styles.columnHeadings} aria-hidden="true">
              <span>Người gửi</span>
              <span>Nội dung góp ý</span>
              <span>Ngày gửi</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>
            <ul className={styles.list}>
              {filteredSuggestions.map((suggestion) => {
                const username = displayName(suggestion.username);
                const time = suggestionTime(suggestion.createdAt);
                const pendingAction = pendingActions[suggestion.id];
                const unread = suggestion.status === "unread";

                return (
                  <li className={`${styles.row} ${unread ? styles.unreadRow : ""}`} key={suggestion.id}>
                    <div className={styles.sender}>
                      <span className={styles.mobileLabel}>Người gửi</span>
                      <span className={styles.avatar} aria-hidden="true">{displayInitial(suggestion.username)}</span>
                      <strong>{username}</strong>
                    </div>

                    <div className={styles.messageCell}>
                      <span className={styles.mobileLabel}>Nội dung góp ý</span>
                      <p>{suggestion.message}</p>
                    </div>

                    <div className={styles.dateCell}>
                      <span className={styles.mobileLabel}>Ngày gửi</span>
                      {time ? <time dateTime={time.dateTime}>{time.label}</time> : <span>Không rõ</span>}
                    </div>

                    <div className={styles.statusCell}>
                      <span className={styles.mobileLabel}>Trạng thái</span>
                      <span className={`${styles.status} ${unread ? styles.unreadStatus : styles.readStatus}`}>
                        <span aria-hidden="true" />
                        {unread ? "Chưa đọc" : "Đã đọc"}
                      </span>
                    </div>

                    <div className={styles.actions}>
                      <button
                        className={styles.statusButton}
                        type="button"
                        onClick={() => void toggleStatus(suggestion)}
                        disabled={Boolean(pendingAction)}
                        aria-label={`${unread ? "Đánh dấu đã đọc" : "Đánh dấu chưa đọc"} góp ý của ${username}`}
                      >
                        {pendingAction === "status" ? "Đang lưu…" : unread ? "Đánh dấu đã đọc" : "Đánh dấu chưa đọc"}
                      </button>
                      <button
                        className={styles.deleteButton}
                        type="button"
                        onClick={() => void deleteSuggestion(suggestion)}
                        disabled={Boolean(pendingAction)}
                        aria-label={`Xóa góp ý của ${username}`}
                      >
                        {pendingAction === "delete" ? "Đang xóa…" : "Xóa"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </section>
  );
}
