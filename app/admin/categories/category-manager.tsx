"use client";

import { FormEvent, useState } from "react";

export type ManagedCategory = {
  id: string;
  name: string;
  usageCount: number;
};

type CategoriesResponse = {
  categories?: ManagedCategory[];
  error?: string;
};

async function responseData(response: Response): Promise<CategoriesResponse> {
  try {
    return await response.json() as CategoriesResponse;
  } catch {
    return {};
  }
}

export default function CategoryManager({ initialCategories }: { initialCategories: ManagedCategory[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refreshCategories() {
    const response = await fetch("/api/admin/categories", { cache: "no-store" });
    const data = await responseData(response);
    if (!response.ok || !Array.isArray(data.categories)) {
      throw new Error(data.error ?? "Không thể tải lại danh sách loại món.");
    }
    setCategories(data.categories);
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setPendingAction("create");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error ?? "Không thể thêm loại món.");
      await refreshCategories();
      setNewName("");
      setMessage(`Đã thêm loại món “${name}”.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Đã có lỗi xảy ra.");
    } finally {
      setPendingAction(null);
    }
  }

  function beginEdit(category: ManagedCategory) {
    setEditingId(category.id);
    setEditName(category.name);
    setError("");
    setMessage("");
  }

  async function updateCategory(event: FormEvent<HTMLFormElement>, category: ManagedCategory) {
    event.preventDefault();
    const name = editName.trim();
    if (!name) return;
    setPendingAction(`edit-${category.id}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/categories?id=${encodeURIComponent(category.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error ?? "Không thể cập nhật loại món.");
      await refreshCategories();
      setEditingId(null);
      setEditName("");
      setMessage(`Đã đổi tên thành “${name}”.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Đã có lỗi xảy ra.");
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteCategory(category: ManagedCategory) {
    const usageNote = category.usageCount > 0 ? ` Loại này đang được dùng trong ${category.usageCount} bài viết.` : "";
    if (!window.confirm(`Xóa loại món “${category.name}”?${usageNote}`)) return;
    setPendingAction(`delete-${category.id}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/categories?id=${encodeURIComponent(category.id)}`, { method: "DELETE" });
      const data = await responseData(response);
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(data.error ?? `“${category.name}” vẫn đang được dùng trong bài viết. Hãy đổi loại món của các bài đó trước khi xóa.`);
        }
        throw new Error(data.error ?? "Không thể xóa loại món.");
      }
      setCategories((current) => current.filter((item) => item.id !== category.id));
      if (editingId === category.id) setEditingId(null);
      setMessage(`Đã xóa loại món “${category.name}”.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Đã có lỗi xảy ra.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="admin-workspace">
      <header className="admin-page-header">
        <div><p>Phân loại nội dung</p><h1>Loại món</h1></div>
      </header>

      <section className="admin-panel category-panel" aria-labelledby="category-list-title">
        <div className="admin-panel-toolbar category-toolbar">
          <div>
            <h2 id="category-list-title">Danh sách loại món</h2>
            <p>Tên ở đây sẽ xuất hiện trong bộ lọc trang chủ và trình biên tập bài viết.</p>
          </div>
          <form className="category-create-form" onSubmit={createCategory}>
            <label htmlFor="new-category">Tên loại món mới</label>
            <div>
              <input
                id="new-category"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                maxLength={80}
                required
                placeholder="Ví dụ: Món Việt"
                disabled={pendingAction === "create"}
              />
              <button type="submit" disabled={pendingAction === "create" || !newName.trim()}>
                {pendingAction === "create" ? "Đang thêm..." : "＋ Thêm"}
              </button>
            </div>
          </form>
        </div>

        <div className="category-feedback" aria-live="polite">
          {error && <p className="category-error" role="alert">{error}</p>}
          {!error && message && <p className="category-success">{message}</p>}
        </div>

        {categories.length ? (
          <ul className="category-list">
            {categories.map((category) => {
              const editing = editingId === category.id;
              const saving = pendingAction === `edit-${category.id}`;
              const deleting = pendingAction === `delete-${category.id}`;
              return (
                <li className={editing ? "category-row editing" : "category-row"} key={category.id}>
                  {editing ? (
                    <form className="category-edit-form" onSubmit={(event) => updateCategory(event, category)}>
                      <label htmlFor={`category-${category.id}`}>Tên loại món</label>
                      <input
                        id={`category-${category.id}`}
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        maxLength={80}
                        required
                        autoFocus
                        disabled={saving}
                      />
                      <div className="category-actions">
                        <button className="save" type="submit" disabled={saving || !editName.trim()}>{saving ? "Đang lưu..." : "Lưu"}</button>
                        <button type="button" onClick={() => setEditingId(null)} disabled={saving}>Hủy</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <span className="category-name"><strong>{category.name}</strong><small>Hiển thị trong bộ lọc trang chủ</small></span>
                      <span className="category-usage"><strong>{category.usageCount}</strong> bài viết</span>
                      <div className="category-actions">
                        <button type="button" onClick={() => beginEdit(category)} disabled={Boolean(pendingAction)}>Sửa</button>
                        <button className="delete" type="button" onClick={() => deleteCategory(category)} disabled={Boolean(pendingAction)}>
                          {deleting ? "Đang xóa..." : "Xóa"}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="admin-empty">
            <strong>Chưa có loại món</strong>
            <span>Thêm loại món đầu tiên để bắt đầu tạo và phân loại bài review.</span>
          </div>
        )}
      </section>
    </section>
  );
}
