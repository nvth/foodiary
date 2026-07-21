"use client";

import { FormEvent, useState } from "react";
import type { BlogAbout } from "@/db";

type AboutMutationResponse = {
  about?: BlogAbout;
  error?: string;
};

async function responseData(response: Response): Promise<AboutMutationResponse> {
  try {
    return await response.json() as AboutMutationResponse;
  } catch {
    return {};
  }
}

export default function AboutEditor({ initialAbout }: { initialAbout: BlogAbout }) {
  const [title, setTitle] = useState(initialAbout.title);
  const [body, setBody] = useState(initialAbout.body);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function updateTitle(value: string) {
    setTitle(value);
    setError("");
    setMessage("");
  }

  function updateBody(value: string) {
    setBody(value);
    setError("");
    setMessage("");
  }

  async function saveAbout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();
    const nextBody = body.trim();

    if (!nextTitle || !nextBody) {
      setError("Tiêu đề và nội dung Về blog không được để trống.");
      setMessage("");
      return;
    }
    if (nextTitle.length > 160 || nextBody.length > 2000) {
      setError("Nội dung vượt quá giới hạn cho phép.");
      setMessage("");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/admin/api/about", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle, body: nextBody }),
      });
      const data = await responseData(response);
      if (!response.ok || !data.about) {
        throw new Error(data.error ?? "Không thể cập nhật phần Về blog.");
      }
      setTitle(data.about.title);
      setBody(data.about.body);
      setMessage("Đã cập nhật phần Về blog trên trang chủ.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Đã có lỗi xảy ra.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-workspace">
      <header className="admin-page-header">
        <div><p>Nội dung giới thiệu</p><h1>Về blog</h1></div>
        <a className="admin-secondary-action" href="/#about" target="_blank" rel="noreferrer">
          Xem trên trang chủ ↗
        </a>
      </header>

      <section className="admin-panel about-admin-panel" aria-labelledby="about-editor-title">
        <div className="admin-panel-toolbar">
          <div>
            <h2 id="about-editor-title">Nội dung đang hiển thị</h2>
            <p>Thay đổi tiêu đề và lời giới thiệu ở khu vực màu đỏ cuối trang chủ.</p>
          </div>
        </div>

        <form className="about-editor-form" onSubmit={saveAbout}>
          <div className="about-editor-fields">
            <label className="about-editor-field" htmlFor="about-title-input">
              <span className="about-field-label"><strong>Tiêu đề</strong><small>{title.length}/160</small></span>
              <input
                id="about-title-input"
                value={title}
                onChange={(event) => updateTitle(event.target.value)}
                required
                maxLength={160}
                disabled={isSaving}
                placeholder="Tiêu đề phần Về blog"
              />
              <small>Tiêu đề lớn xuất hiện bên dưới nhãn “Về blog”.</small>
            </label>

            <label className="about-editor-field" htmlFor="about-body-input">
              <span className="about-field-label"><strong>Nội dung</strong><small>{body.length}/2000</small></span>
              <textarea
                id="about-body-input"
                value={body}
                onChange={(event) => updateBody(event.target.value)}
                required
                maxLength={2000}
                rows={9}
                disabled={isSaving}
                placeholder="Giới thiệu ngắn về blog..."
              />
              <small>Các dòng xuống hàng sẽ được giữ nguyên khi hiển thị trên trang chủ.</small>
            </label>
          </div>

          <div className="about-editor-feedback" aria-live="polite">
            {error && <p className="about-editor-error" role="alert">{error}</p>}
            {!error && message && <p className="about-editor-success" role="status">{message}</p>}
          </div>

          <div className="about-editor-actions">
            <button className="admin-primary-action" type="submit" disabled={isSaving || !title.trim() || !body.trim()}>
              {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <span>Nhãn “Về blog” được giữ cố định để người đọc luôn dễ nhận biết.</span>
          </div>
        </form>
      </section>
    </section>
  );
}
