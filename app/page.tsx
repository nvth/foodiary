"use client";

/* eslint-disable @next/next/no-img-element -- Review photos are served directly from R2 with immutable caching. */

import { ClipboardEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { BlogAbout } from "@/db";

type StoredPhoto = {
  objectKey: string;
  url: string;
  caption: string;
  contentType: string;
  sizeBytes: number;
};

type ReviewDish = { id?: string; name: string; photoIndex: number };

export type Spot = {
  id: number | string;
  categoryId?: string | null;
  name: string;
  area: string;
  address: string;
  cuisine: string;
  dish: string;
  rating: number;
  price: string;
  excerpt: string;
  review: string;
  image: string;
  gallery?: string[];
  galleryCaptions?: string[];
  photos?: StoredPhoto[];
  date: string;
  favorite?: boolean;
  featured?: boolean;
  dishes?: ReviewDish[];
  hashtags?: string[];
};

type ReviewsResponse = { spots?: Spot[] };
export type CategoryOption = { id: string; name: string; usageCount: number };
type CategoriesResponse = { categories?: CategoryOption[] };
type AboutResponse = { about?: BlogAbout; mode?: "cloudflare" | "demo" };
type SessionResponse = { isAdmin?: boolean };
type UploadResponse = {
  error?: string;
  objectKey?: string;
  contentType?: string;
  sizeBytes?: number;
};
type MutationResponse = { error?: string; id?: string; deleted?: boolean; updated?: boolean };
type SuggestionResponse = {
  accepted?: boolean;
  error?: string;
  suggestion?: { id: string; username: string | null; message: string };
};

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const maxImageBytes = 8 * 1024 * 1024;
const maxSuggestionUsernameLength = 60;
const maxSuggestionMessageLength = 1_200;
const fallbackAbout: BlogAbout = {
  title: "Mỗi tuần một câu chuyện ngon.",
  body: "Một email nhỏ về quán mới, món ngon và những góc phố mình vừa đi qua.",
};

function imageSelectionError(files: File[], totalFiles = files.length): string | null {
  if (totalFiles > 5) return "Chỉ được dùng tối đa 5 ảnh.";
  if (files.some((file) => !acceptedImageTypes.has(file.type))) {
    return "Chỉ nhận ảnh JPG, PNG, WebP hoặc AVIF.";
  }
  if (files.some((file) => file.size < 1 || file.size > maxImageBytes)) {
    return "Mỗi ảnh phải nhỏ hơn 8 MB.";
  }
  return null;
}

const spots: Spot[] = [
  {
    id: 1,
    name: "Bếp Nhà Xứ Quảng",
    area: "Quận 3",
    address: "16 Trần Cao Vân, Phường 6, Quận 3, TP.HCM",
    cuisine: "Miền Trung",
    dish: "Mì Quảng tôm thịt",
    rating: 4.8,
    price: "85K",
    excerpt: "Sợi mì mềm vừa, nước dùng đậm đà và chén mắm ớt khiến mình nhớ mãi.",
    review:
      "Mình ghé vào một chiều mưa và gọi tô đặc biệt. Nước dùng ít đúng kiểu Quảng, vị ngọt tự nhiên từ xương chứ không gắt. Tôm tươi, thịt mềm, bánh tráng giòn và rau sống rất sạch. Không gian nhỏ nhưng ấm cúng, nhân viên dễ thương. Đây là quán mình chắc chắn sẽ quay lại.",
    image:
      "https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=1400&q=85",
    date: "18.07.2026",
    favorite: true,
    hashtags: ["mì quảng", "miền trung"],
  },
  {
    id: 2,
    name: "Phở Thìn 13 Lò Đúc",
    area: "Quận 1",
    address: "13 Nguyễn Thiệp, Bến Nghé, Quận 1, TP.HCM",
    cuisine: "Món Việt",
    dish: "Phở bò tái lăn",
    rating: 4.6,
    price: "75K",
    excerpt: "Nước phở béo thơm, thịt bò xào săn cạnh và rất nhiều hành lá.",
    review:
      "Một tô phở có cá tính rất riêng: thơm mùi bò xào, nước dùng đậm và béo hơn kiểu phở truyền thống. Mình thích nhất phần thịt tái lăn mềm nhưng vẫn có cạnh xém thơm. Quán khá đông vào buổi trưa nên nên đi sớm một chút.",
    image:
      "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1000&q=85",
    date: "12.07.2026",
    hashtags: ["phở", "ăn sáng"],
  },
  {
    id: 3,
    name: "Pizza 4P's",
    area: "Thảo Điền",
    address: "48/1 Xuân Thủy, Thảo Điền, TP. Thủ Đức, TP.HCM",
    cuisine: "Âu · Nhật",
    dish: "Burrata Parma Ham",
    rating: 4.9,
    price: "320K",
    excerpt: "Burrata làm tại chỗ, đế bánh mỏng cháy cạnh và cân bằng hoàn hảo.",
    review:
      "Chiếc pizza nửa burrata nửa parma ham vẫn luôn là lựa chọn an toàn của mình. Phô mai tươi mát, béo nhẹ; cà chua có độ chua vừa đủ để tổng thể không bị ngấy. Không gian bếp mở tạo cảm giác rất vui và gần gũi.",
    image:
      "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1000&q=85",
    date: "05.07.2026",
    hashtags: ["pizza", "hẹn hò"],
  },
  {
    id: 4,
    name: "Sushi Hokkaido Sachi",
    area: "Quận 7",
    address: "101 Tôn Dật Tiên, Tân Phú, Quận 7, TP.HCM",
    cuisine: "Nhật Bản",
    dish: "Sashimi moriawase",
    rating: 4.7,
    price: "450K",
    excerpt: "Cá tươi, cắt miếng dày vừa phải và trình bày tinh tế như một khu vườn nhỏ.",
    review:
      "Set sashimi có độ tươi tốt, đặc biệt là cá hồi và sò điệp. Cơm sushi nắm vừa tay, hạt cơm còn ấm. Giá hơi cao nhưng tương xứng với chất lượng nguyên liệu và phong cách phục vụ chỉn chu.",
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1000&q=85",
    date: "28.06.2026",
  },
  {
    id: 5,
    name: "Ramen Danbo",
    area: "Bình Thạnh",
    address: "14 Phan Văn Hân, Phường 19, Bình Thạnh, TP.HCM",
    cuisine: "Nhật Bản",
    dish: "Tonkotsu ramen",
    rating: 4.5,
    price: "145K",
    excerpt: "Nước tonkotsu sánh, thơm; sợi mì chọn được độ cứng đúng sở thích.",
    review:
      "Tô ramen nóng hổi với nước dùng xương heo đậm vị nhưng không quá mặn. Mì cứng vừa, thịt chashu mỏng và tan khá nhanh. Một địa chỉ hợp cho những tối muốn ăn gì đó thật ấm bụng.",
    image:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1000&q=85",
    date: "22.06.2026",
  },
  {
    id: 6,
    name: "Every Half Coffee",
    area: "Phú Nhuận",
    address: "22/2 Nguyễn Văn Trỗi, Phường 15, Phú Nhuận, TP.HCM",
    cuisine: "Café",
    dish: "Cold brew cam",
    rating: 4.4,
    price: "65K",
    excerpt: "Một góc cà phê nhiều nắng, cold brew thanh và mùi cam rất dịu.",
    review:
      "Mình thích khoảng sân xanh và ánh sáng buổi sáng ở đây. Cold brew có vị chua sáng, thêm cam nên dễ uống kể cả với người mới thử cà phê đặc sản. Bánh chuối ẩm, không quá ngọt.",
    image:
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1000&q=85",
    date: "15.06.2026",
  },
];

const demoCategories: CategoryOption[] = Array.from(new Set(spots.map((spot) => spot.cuisine))).map((name, index) => ({
  id: `demo-category-${index + 1}`,
  name,
  usageCount: spots.filter((spot) => spot.cuisine === name).length,
}));

const galleryPhoto = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=85`;

const galleryExtras: Record<number, string[]> = {
  1: [
    "photo-1504674900247-0877df9cc836",
    "photo-1547592180-85f173990554",
    "photo-1555126634-323283e090fa",
    "photo-1601050690117-94f5f6fa8bd7",
  ].map(galleryPhoto),
  2: [
    "photo-1591814468924-caf88d1232e1",
    "photo-1557872943-16a5ac26437e",
    "photo-1559847844-5315695dadae",
    "photo-1559339352-11d035aa65de",
  ].map(galleryPhoto),
  3: [
    "photo-1565299624946-b28f40a0ae38",
    "photo-1513104890138-7c749659a591",
    "photo-1574071318508-1cdbab80d002",
    "photo-1593560708920-61dd98c46a4e",
  ].map(galleryPhoto),
  4: [
    "photo-1553621042-f6e147245754",
    "photo-1563612116625-3012372fccce",
    "photo-1564489563601-c53cfc451e93",
    "photo-1617196034183-421b4917c92d",
  ].map(galleryPhoto),
  5: [
    "photo-1591814468924-caf88d1232e1",
    "photo-1557872943-16a5ac26437e",
    "photo-1547592166-23ac45744acd",
    "photo-1614563637806-1d0e645e0940",
  ].map(galleryPhoto),
  6: [
    "photo-1495474472287-4d71bcdd2085",
    "photo-1493857671505-72967e2e2760",
    "photo-1442512595331-e89e73853f31",
    "photo-1511081692775-05d0f180a065",
  ].map(galleryPhoto),
};

function galleryFor(spot: Spot) {
  if (spot.gallery?.length) return spot.gallery;
  const extras = typeof spot.id === "number" ? galleryExtras[spot.id] ?? [] : [];
  return [spot.image, ...extras];
}

function galleryCaptionsFor(spot: Spot, gallery: string[]) {
  return gallery.map((_, index) => spot.galleryCaptions?.[index]?.trim() || spot.dish);
}

function Stars({ rating }: { rating: number }) {
  return <span className="rating"><span aria-hidden="true">★</span> {rating.toFixed(1)}</span>;
}

type FoodBlogProps = {
  adminMode?: boolean;
  editorOnly?: boolean;
  initialEditorSpot?: Spot | null;
  initialCategories?: CategoryOption[];
};

export function FoodBlog({ adminMode = false, editorOnly = false, initialEditorSpot = null, initialCategories }: FoodBlogProps) {
  const [categoryId, setCategoryId] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Spot | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const lightboxTouchStart = useRef<number | null>(null);
  const [showAdd, setShowAdd] = useState(editorOnly);
  const [editingSpot, setEditingSpot] = useState<Spot | null>(initialEditorSpot);
  const [saved, setSaved] = useState(false);
  const [draftRating, setDraftRating] = useState(initialEditorSpot?.rating ?? 4.5);
  const [allSpots, setAllSpots] = useState<Spot[]>(spots);
  const [managedCategories, setManagedCategories] = useState<CategoryOption[]>(
    initialCategories ?? (adminMode ? [] : demoCategories),
  );
  const [about, setAbout] = useState<BlogAbout>(fallbackAbout);
  const [categoriesLoaded, setCategoriesLoaded] = useState(Boolean(initialCategories));
  const [isAdmin, setIsAdmin] = useState(adminMode);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [photoCaptions, setPhotoCaptions] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<StoredPhoto[]>(initialEditorSpot?.photos ?? []);
  const [draftDishes, setDraftDishes] = useState<ReviewDish[]>(
    initialEditorSpot?.dishes?.length
      ? initialEditorSpot.dishes.map((dish) => ({ ...dish }))
      : initialEditorSpot
        ? [{ name: initialEditorSpot.dish, photoIndex: 0 }]
        : [{ name: "", photoIndex: 0 }],
  );
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggestionSending, setIsSuggestionSending] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const [suggestionSuccess, setSuggestionSuccess] = useState("");
  const selectedPreviews = useMemo(
    () => selectedFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [selectedFiles],
  );
  const selectedGallery = selected ? galleryFor(selected) : [];
  const selectedCaptions = selected ? galleryCaptionsFor(selected, selectedGallery) : [];
  const selectedDishes = selected
    ? selected.dishes?.length ? selected.dishes : [{ name: selected.dish, photoIndex: 0 }]
    : [];
  const formPhotoLabels = [
    ...existingPhotos.map((photo, index) => photo.caption.trim() || `Ảnh ${index + 1}`),
    ...photoCaptions.map((caption, index) => caption.trim() || `Ảnh ${existingPhotos.length + index + 1}`),
  ];
  const featuredSpot = allSpots[0] ?? spots[0];
  const stats = useMemo(() => ({
    places: String(allSpots.length).padStart(2, "0"),
    areas: String(new Set(allSpots.map((spot) => spot.area)).size).padStart(2, "0"),
  }), [allSpots]);
  useEffect(() => {
    let cancelled = false;
    const sessionRequest: Promise<SessionResponse> = adminMode
      ? fetch("/api/admin/session", { headers: { accept: "application/json" } }).then((response) => response.json() as Promise<SessionResponse>)
      : Promise.resolve({ isAdmin: false });
    const aboutRequest: Promise<AboutResponse> = adminMode
      ? Promise.resolve({})
      : fetch("/api/about", { headers: { accept: "application/json" } })
          .then((response) => {
            if (!response.ok) throw new Error("Không thể tải phần giới thiệu blog.");
            return response.json() as Promise<AboutResponse>;
          })
          .catch(() => ({}));
    Promise.all([
      fetch("/api/reviews", { headers: { accept: "application/json" } }).then((response) => response.json() as Promise<ReviewsResponse>),
      fetch("/api/categories", { headers: { accept: "application/json" } }).then((response) => {
        if (!response.ok) throw new Error("Không thể tải loại món.");
        return response.json() as Promise<CategoriesResponse>;
      }).catch(() => ({} as CategoriesResponse)),
      sessionRequest,
      aboutRequest,
    ])
      .then(([reviewsData, categoriesData, sessionData, aboutData]) => {
        if (cancelled) return;
        if (Array.isArray(reviewsData.spots) && reviewsData.spots.length > 0) {
          setAllSpots(reviewsData.spots);
        }
        if (Array.isArray(categoriesData.categories)) {
          if (adminMode || categoriesData.categories.length > 0) {
            setManagedCategories(categoriesData.categories);
            setCategoryId((current) => current === "all" || categoriesData.categories?.some((item) => item.id === current) ? current : "all");
          }
        }
        setCategoriesLoaded(true);
        setIsAdmin(adminMode && Boolean(sessionData.isAdmin));
        if (aboutData.about?.title?.trim() && aboutData.about.body?.trim()) {
          setAbout(aboutData.about);
        }
      })
      .catch(() => {
        // The static demo remains usable when Cloudflare bindings are not active yet.
        setCategoriesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [adminMode]);

  useEffect(
    () => () => selectedPreviews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [selectedPreviews],
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") {
        setPhotoIndex((current) => (current - 1 + selectedGallery.length) % selectedGallery.length);
      }
      if (event.key === "ArrowRight") {
        setPhotoIndex((current) => (current + 1) % selectedGallery.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxOpen, selectedGallery.length]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const selectedCategory = managedCategories.find((item) => item.id === categoryId);
    return allSpots.filter((spot) => {
      const inCategory = categoryId === "all"
        || spot.categoryId === categoryId
        || (!spot.categoryId && spot.cuisine === selectedCategory?.name);
      const hashtagText = (spot.hashtags ?? []).flatMap((tag) => [tag, `#${tag}`]).join(" ");
      const inSearch = !normalized
        || `${spot.name} ${spot.dish} ${spot.area} ${spot.cuisine} ${hashtagText}`.toLowerCase().includes(normalized);
      return inCategory && inSearch;
    });
  }, [allSpots, categoryId, managedCategories, query]);

  function selectImages(files: File[], append = false): boolean {
    const nextFiles = append ? [...selectedFiles, ...files] : files;
    const error = imageSelectionError(nextFiles, existingPhotos.length + nextFiles.length);
    if (error) {
      setFormError(error);
      return false;
    }
    setFormError("");
    setSelectedFiles(nextFiles);
    setPhotoCaptions((current) => append ? [...current, ...files.map(() => "")] : files.map(() => ""));
    return true;
  }

  function handlePaste(event: ClipboardEvent<HTMLFormElement>) {
    const pastedImages = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (!pastedImages.length) return;
    event.preventDefault();
    selectImages(pastedImages, true);
  }

  async function handleSuggestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const username = String(fields.get("username") ?? "").trim();
    const message = String(fields.get("message") ?? "").trim();

    if (username.length > maxSuggestionUsernameLength) {
      setSuggestionError(`Tên hiển thị không được quá ${maxSuggestionUsernameLength} ký tự.`);
      setSuggestionSuccess("");
      return;
    }
    if (!message) {
      setSuggestionError("Bạn hãy nhập nội dung góp ý nhé.");
      setSuggestionSuccess("");
      return;
    }
    if (message.length > maxSuggestionMessageLength) {
      setSuggestionError(`Nội dung không được quá ${maxSuggestionMessageLength} ký tự.`);
      setSuggestionSuccess("");
      return;
    }

    setIsSuggestionSending(true);
    setSuggestionError("");
    setSuggestionSuccess("");
    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username || null,
          message,
          website: String(fields.get("website") ?? ""),
        }),
      });
      const data = await response.json() as SuggestionResponse;
      if (!response.ok || !data.accepted) {
        throw new Error(data.error ?? "Chưa thể gửi góp ý lúc này.");
      }
      form.reset();
      setSuggestionSuccess("Đã gửi rồi — cảm ơn bạn đã gợi ý một quán mới!");
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : "Chưa thể gửi góp ý lúc này.");
    } finally {
      setIsSuggestionSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const selectedCategoryId = String(fields.get("categoryId") ?? "");
    if (!selectedCategoryId || !managedCategories.some((item) => item.id === selectedCategoryId)) {
      setFormError("Hãy chọn một loại món đã được tạo trong phần quản lý loại món.");
      return;
    }
    const hashtags = String(fields.get("hashtags") ?? "")
      .split(/[,\n]/u)
      .map((tag) => tag.trim().replace(/^#+/u, "").replace(/\s+/gu, " "))
      .filter((tag, index, tags) => Boolean(tag) && tags.findIndex((item) => item.toLocaleLowerCase("vi") === tag.toLocaleLowerCase("vi")) === index);
    if (hashtags.length > 10 || hashtags.some((tag) => tag.length > 32)) {
      setFormError("Dùng tối đa 10 hashtag, mỗi hashtag không quá 32 ký tự.");
      return;
    }
    const totalPhotos = existingPhotos.length + selectedFiles.length;
    if (totalPhotos < 1 || totalPhotos > 5) {
      setFormError("Hãy chọn từ 1 đến 5 ảnh cho bài review.");
      return;
    }
    if (existingPhotos.some((photo) => !photo.caption.trim())) {
      setFormError("Hãy nhập caption cho từng ảnh để người đọc biết đây là món gì.");
      return;
    }
    if (photoCaptions.length !== selectedFiles.length || photoCaptions.some((caption) => !caption.trim())) {
      setFormError("Hãy nhập caption cho từng ảnh để người đọc biết đây là món gì.");
      return;
    }
    if (
      draftDishes.length < 1
      || draftDishes.length > 12
      || draftDishes.some((dish) => !dish.name.trim() || dish.photoIndex < 0 || dish.photoIndex >= totalPhotos)
    ) {
      setFormError("Hãy thêm tên món và chọn đúng ảnh minh họa cho từng món.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);
    const uploadedKeys: string[] = [];
    let reviewSaved = false;

    try {
      const photoKeys = existingPhotos.map((photo) => ({
        objectKey: photo.objectKey,
        contentType: photo.contentType,
        sizeBytes: photo.sizeBytes,
        altText: photo.caption.trim(),
      }));
      for (const [photoIndex, file] of selectedFiles.entries()) {
        const upload = new FormData();
        upload.set("file", file);
        const response = await fetch("/api/admin/media", { method: "POST", body: upload });
        const data = (await response.json()) as UploadResponse;
        if (!response.ok) throw new Error(data.error ?? "Không thể tải ảnh lên.");
        if (!data.objectKey || !data.contentType || !data.sizeBytes) {
          throw new Error("Phản hồi tải ảnh không đầy đủ.");
        }
        uploadedKeys.push(data.objectKey);
        photoKeys.push({
          objectKey: data.objectKey,
          contentType: data.contentType,
          sizeBytes: data.sizeBytes,
          altText: photoCaptions[photoIndex].trim(),
        });
      }

      const isEditing = editingSpot && typeof editingSpot.id === "string";
      const endpoint = isEditing
        ? `/api/admin/reviews?id=${encodeURIComponent(editingSpot.id as string)}`
        : "/api/admin/reviews";
      const response = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.get("name"),
          area: fields.get("area"),
          address: fields.get("address"),
          categoryId: selectedCategoryId,
          priceLabel: fields.get("priceLabel"),
          dish: draftDishes[0].name.trim(),
          dishes: draftDishes.map((dish) => ({ name: dish.name.trim(), photoIndex: dish.photoIndex })),
          rating: draftRating,
          excerpt: fields.get("excerpt"),
          content: fields.get("content"),
          visitedAt: fields.get("visitedAt"),
          isFavorite: fields.get("isFavorite") === "on",
          isFeatured: fields.get("isFeatured") === "on",
          hashtags,
          photoKeys,
        }),
      });
      const data = (await response.json()) as MutationResponse;
      if (!response.ok) throw new Error(data.error ?? "Không thể lưu bài review.");
      reviewSaved = true;

      const refreshed = await fetch("/api/reviews", { cache: "no-store" }).then((result) => result.json() as Promise<ReviewsResponse>);
      if (Array.isArray(refreshed.spots)) setAllSpots(refreshed.spots);
      form.reset();
      setDraftRating(4.5);
      setSelectedFiles([]);
      setPhotoCaptions([]);
      setExistingPhotos([]);
      setDraftDishes([{ name: "", photoIndex: 0 }]);
      setSaved(true);
      window.setTimeout(() => {
        setSaved(false);
        setEditingSpot(null);
        if (editorOnly) window.location.assign("/admin");
        else setShowAdd(false);
      }, 650);
    } catch (error) {
      if (!reviewSaved && uploadedKeys.length) {
        await Promise.allSettled(
          uploadedKeys.map((key) =>
            fetch(`/api/admin/media?key=${encodeURIComponent(key)}`, { method: "DELETE" }),
          ),
        );
      }
      setFormError(error instanceof Error ? error.message : "Đã có lỗi xảy ra.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(reviewId: string) {
    if (!window.confirm("Xóa bài review này và toàn bộ ảnh?")) return;
    const response = await fetch(`/api/admin/reviews?id=${encodeURIComponent(reviewId)}`, { method: "DELETE" });
    const data = (await response.json()) as MutationResponse;
    if (!response.ok) {
      window.alert(data.error ?? "Không thể xóa bài review.");
      return;
    }
    setSelected(null);
    setAllSpots((current) => current.filter((spot) => String(spot.id) !== reviewId));
  }

  function startCreate() {
    setEditingSpot(null);
    setExistingPhotos([]);
    setSelectedFiles([]);
    setPhotoCaptions([]);
    setDraftDishes([{ name: "", photoIndex: 0 }]);
    setDraftRating(4.5);
    setFormError("");
    setSaved(false);
    setShowAdd(true);
  }

  function startEdit(spot: Spot) {
    if (typeof spot.id !== "string") return;
    setEditingSpot(spot);
    setExistingPhotos(spot.photos ?? []);
    setSelectedFiles([]);
    setPhotoCaptions([]);
    setDraftDishes(spot.dishes?.length ? spot.dishes.map((dish) => ({ ...dish })) : [{ name: spot.dish, photoIndex: 0 }]);
    setDraftRating(spot.rating);
    setFormError("");
    setSaved(false);
    setSelected(null);
    setShowAdd(true);
  }

  function closeEditor() {
    if (isSubmitting) return;
    if (editorOnly) {
      window.location.assign("/admin");
      return;
    }
    setShowAdd(false);
    setEditingSpot(null);
    setExistingPhotos([]);
    setSelectedFiles([]);
    setPhotoCaptions([]);
    setDraftDishes([{ name: "", photoIndex: 0 }]);
    setFormError("");
  }

  function adjustDishesAfterPhotoRemoval(removedIndex: number) {
    setDraftDishes((current) => current.map((dish) => ({
      ...dish,
      photoIndex: dish.photoIndex === removedIndex
        ? 0
        : dish.photoIndex > removedIndex
          ? dish.photoIndex - 1
          : dish.photoIndex,
    })));
  }

  function removeExistingPhoto(index: number) {
    setExistingPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index));
    adjustDishesAfterPhotoRemoval(index);
  }

  function removeNewPhoto(index: number) {
    const globalIndex = existingPhotos.length + index;
    setSelectedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPhotoCaptions((current) => current.filter((_, itemIndex) => itemIndex !== index));
    adjustDishesAfterPhotoRemoval(globalIndex);
  }

  function openSpot(spot: Spot) {
    setPhotoIndex(0);
    setSelected(spot);
  }

  function closeReview() {
    setLightboxOpen(false);
    setSelected(null);
  }

  function openMobileLightbox() {
    if (window.matchMedia("(max-width: 680px)").matches) setLightboxOpen(true);
  }

  function finishLightboxSwipe(clientX: number) {
    const startX = lightboxTouchStart.current;
    lightboxTouchStart.current = null;
    if (startX === null || Math.abs(clientX - startX) < 45) return;
    changePhoto(clientX < startX ? 1 : -1);
  }

  function changePhoto(direction: number) {
    setPhotoIndex((current) =>
      (current + direction + selectedGallery.length) % selectedGallery.length,
    );
  }

  return (
    <main className={[adminMode ? "admin-mode" : "", editorOnly ? "editor-only" : ""].filter(Boolean).join(" ") || undefined}>
      {adminMode && (
        <div className="admin-strip">
          <span>Trang quản trị · Chỉ dành cho tác giả</span>
          <Link href="/">Xem trang công khai ↗</Link>
        </div>
      )}
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Ăn đâu hôm nay - Trang chủ">
          <img className="brand-mark" src="/frog-logo.png" alt="" aria-hidden="true" />
          <span>Ăn đâu hôm nay?</span>
        </a>
        <nav aria-label="Điều hướng chính">
          <a href="#reviews">Quán đã ăn</a>
          <a href="#suggestions">Gửi góp ý</a>
          <a href="#about">Về blog</a>
        </nav>
        {!adminMode && (
          <nav className="mobile-public-nav" aria-label="Điều hướng nhanh">
            <a href="#suggestions">Góp ý quán</a>
            <a href="#about">Về blog</a>
          </nav>
        )}
        {adminMode && isAdmin ? (
          <button className="add-button" onClick={startCreate}>
            <span aria-hidden="true">＋</span> Thêm quán mới
          </button>
        ) : (
          <span className="journal-label">Food journal · 2026</span>
        )}
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Nhật ký vị giác của mình</p>
          <h1>Đi ăn,<br /><em>rồi kể lại.</em></h1>
          <p className="hero-intro">
            Những quán mình đã ghé, những món khiến mình nhớ và vài câu chuyện nhỏ quanh bàn ăn.
          </p>
          <a className="explore" href="#reviews">Khám phá các quán <span aria-hidden="true">↘</span></a>
          <dl className="stats" aria-label="Thống kê blog">
            <div><dt>{stats.places}</dt><dd>Quán đã ăn</dd></div>
            <div><dt>{stats.areas}</dt><dd>Khu vực</dd></div>
          </dl>
        </div>
        <button className="hero-feature" onClick={() => openSpot(featuredSpot)} aria-label={`Đọc review ${featuredSpot.name}`}>
          <img src={featuredSpot.image} alt={`${featuredSpot.dish} tại ${featuredSpot.name}`} />
          <span className="image-shade" />
          <span className="featured-label">Bài mới nhất</span>
          <span className="featured-content">
            <span>{featuredSpot.area} · {featuredSpot.date}</span>
            <strong>{featuredSpot.name}</strong>
            <small>{featuredSpot.excerpt}</small>
          </span>
          <span className="round-arrow" aria-hidden="true">↗</span>
        </button>
      </section>

      <section className="collection" id="reviews">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> Bộ sưu tập quán</p>
            <h2>Những nơi mình đã ăn</h2>
          </div>
          <label className="search">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Tìm quán, món ăn hoặc hashtag</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm quán, món hoặc #hashtag..." />
          </label>
        </div>

        <div className="filters" aria-label="Lọc theo loại món">
          <button type="button" className={categoryId === "all" ? "active" : ""} aria-pressed={categoryId === "all"} onClick={() => setCategoryId("all")}>
            Tất cả
          </button>
          {managedCategories.map((item) => (
            <button type="button" key={item.id} className={categoryId === item.id ? "active" : ""} aria-pressed={categoryId === item.id} onClick={() => setCategoryId(item.id)}>
              {item.name}
            </button>
          ))}
        </div>

        {filtered.length ? (
          <div className="card-grid">
            {filtered.map((spot, index) => (
              <article className={`food-card ${index === 0 ? "wide" : ""}`} key={spot.id}>
                <button className="card-image" onClick={() => openSpot(spot)} aria-label={`Đọc review ${spot.name}`}>
                  <img src={spot.image} alt={`${spot.dish} tại ${spot.name}`} loading={index > 2 ? "lazy" : "eager"} />
                  {spot.favorite && <span className="favorite">Yêu thích</span>}
                  <span className="image-number">{String(index + 1).padStart(2, "0")}</span>
                </button>
                <div className="card-meta">
                  <span>{spot.area} · {spot.cuisine}</span>
                  <Stars rating={spot.rating} />
                </div>
                <button className="card-title" onClick={() => openSpot(spot)}>{spot.name}</button>
                <p>{spot.excerpt}</p>
                {!!spot.hashtags?.length && (
                  <div className="post-hashtags" aria-label="Hashtag bài viết">
                    {spot.hashtags.map((tag) => <span key={tag}>#{tag}</span>)}
                  </div>
                )}
                <div className="card-footer">
                  <span>Món nên thử: <strong>{spot.dish}</strong></span>
                  <span>~ {spot.price}/người</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><span>🍜</span><h3>Chưa tìm thấy quán phù hợp</h3><p>Thử một từ khóa hoặc nhóm món khác nhé.</p></div>
        )}
      </section>

      {!adminMode && (
        <section className="suggestion-section" id="suggestions" aria-labelledby="suggestion-title">
          <div className="suggestion-copy">
            <p className="eyebrow"><span /> Góp ý quán mới</p>
            <h2 id="suggestion-title">Quán nào mình nên ghé tiếp?</h2>
            <p>Để lại một cái tên bất kỳ và quán bạn muốn mình thử. Mình sẽ đọc trong trang quản trị.</p>
          </div>
          <form className="suggestion-form" onSubmit={handleSuggestionSubmit}>
            <label htmlFor="suggestion-username">
              <span>Username <small>không bắt buộc</small></span>
              <input
                id="suggestion-username"
                name="username"
                maxLength={maxSuggestionUsernameLength}
                autoComplete="nickname"
                disabled={isSuggestionSending}
                placeholder="Ví dụ: một người mê bún"
              />
            </label>
            <label htmlFor="suggestion-message">
              <span>Nội dung góp ý</span>
              <textarea
                id="suggestion-message"
                name="message"
                required
                maxLength={maxSuggestionMessageLength}
                rows={5}
                disabled={isSuggestionSending}
                placeholder="Tên quán, địa chỉ hoặc món bạn nghĩ mình nên thử..."
              />
            </label>
            <div className="suggestion-honeypot" aria-hidden="true">
              <label htmlFor="suggestion-website">Website</label>
              <input id="suggestion-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <div className="suggestion-form-footer">
              <div className="suggestion-feedback" aria-live="polite">
                {suggestionError && <p className="error" role="alert">{suggestionError}</p>}
                {!suggestionError && suggestionSuccess && <p className="success" role="status">{suggestionSuccess}</p>}
              </div>
              <button type="submit" disabled={isSuggestionSending}>
                {isSuggestionSending ? "Đang gửi..." : "Gửi góp ý →"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="about-section" id="about" aria-labelledby="about-title">
        <div className="about-heading">
          <p className="eyebrow light"><span /> Về blog</p>
          <h2 id="about-title">{about.title}</h2>
        </div>
        <p className="about-body">{about.body}</p>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><img className="brand-mark" src="/frog-logo.png" alt="" aria-hidden="true" /><span>Ăn đâu hôm nay?</span></a>
        <p>Ăn thật lòng, kể thật vui. © 2026</p>
        <a href="#top">Lên đầu trang ↑</a>
      </footer>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeReview}>
          <article className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title" onMouseDown={(e) => e.stopPropagation()}>
            <button className="close" onClick={closeReview} aria-label="Đóng bài review">×</button>
            <div className="review-gallery">
              <div className="gallery-stage">
                <button className="gallery-image-button" type="button" onClick={openMobileLightbox} aria-label="Mở ảnh toàn màn hình">
                  <img
                    key={selectedGallery[photoIndex]}
                    src={selectedGallery[photoIndex]}
                    alt={selectedCaptions[photoIndex]}
                  />
                </button>
                <span className="gallery-count">{photoIndex + 1} / {selectedGallery.length}</span>
                <span className="gallery-caption">{selectedCaptions[photoIndex]}</span>
                <button className="gallery-arrow previous" onClick={() => changePhoto(-1)} aria-label="Xem ảnh trước">‹</button>
                <button className="gallery-arrow next" onClick={() => changePhoto(1)} aria-label="Xem ảnh tiếp theo">›</button>
              </div>
              <div className="gallery-thumbnails" aria-label="Chọn ảnh món ăn">
                {selectedGallery.map((photo, index) => (
                  <button
                    key={photo}
                    className={photoIndex === index ? "active" : ""}
                    onClick={() => setPhotoIndex(index)}
                    aria-label={`Xem ảnh ${index + 1}`}
                    aria-current={photoIndex === index ? "true" : undefined}
                  >
                    <img src={photo} alt="" />
                  </button>
                ))}
              </div>
            </div>
            <div className="review-body">
              <div className="post-author">
                <img className="author-avatar" src="/frog-logo.png" alt="" aria-hidden="true" />
                <span><strong>andauhomnay</strong><small>{selected.area} · Nhật ký vị giác</small></span>
                <button aria-label="Lưu bài viết">♡</button>
              </div>
              <div className="review-kicker"><span>{selected.area} · {selected.date}</span><Stars rating={selected.rating} /></div>
              <h2 id="review-title">{selected.name}</h2>
              {!!selected.hashtags?.length && (
                <div className="post-hashtags review-hashtags" aria-label="Hashtag bài viết">
                  {selected.hashtags.map((tag) => <span key={tag}>#{tag}</span>)}
                </div>
              )}
              <div className="review-menu">
                <span>Menu món đã thử</span>
                <div>
                  {selectedDishes.map((dish, index) => (
                    <button
                      type="button"
                      key={dish.id ?? `${dish.name}-${index}`}
                      className={photoIndex === dish.photoIndex ? "active" : ""}
                      onClick={() => setPhotoIndex(Math.min(dish.photoIndex, selectedGallery.length - 1))}
                    >
                      <strong>{dish.name}</strong>
                      <small>Ảnh {dish.photoIndex + 1} →</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="restaurant-address">
                <span className="address-pin" aria-hidden="true">⌖</span>
                <span>
                  <small>Địa chỉ chi tiết</small>
                  <strong>{selected.address}</strong>
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Mở địa chỉ ${selected.name} trên Google Maps`}
                >
                  Bản đồ ↗
                </a>
              </div>
              <p className="review-text">{selected.review}</p>
              <div className="post-actions" aria-label="Tương tác bài viết">
                <span aria-hidden="true">♡</span>
                <span aria-hidden="true">◌</span>
                <strong>128 lượt thích</strong>
              </div>
              <div className="review-summary"><span>Chi phí khoảng</span><strong>{selected.price} / người</strong><span>Mình sẽ quay lại</span><strong>Có, chắc chắn!</strong></div>
              {adminMode && isAdmin && typeof selected.id === "string" && (
                <div className="review-admin-actions">
                  <button className="edit-review" onClick={() => startEdit(selected)}>Chỉnh sửa bài</button>
                  <button className="delete-review" onClick={() => handleDelete(selected.id as string)}>Xóa bài review</button>
                </div>
              )}
            </div>
          </article>
          {lightboxOpen && (
            <div
              className="mobile-photo-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="Ảnh món ăn toàn màn hình"
              onMouseDown={(event) => {
                event.stopPropagation();
                if (event.target === event.currentTarget) setLightboxOpen(false);
              }}
            >
              <div className="mobile-lightbox-top">
                <span>{photoIndex + 1} / {selectedGallery.length}</span>
                <button type="button" onClick={() => setLightboxOpen(false)} aria-label="Đóng ảnh toàn màn hình">×</button>
              </div>
              <div
                className="mobile-lightbox-stage"
                onTouchStart={(event) => { lightboxTouchStart.current = event.touches[0]?.clientX ?? null; }}
                onTouchEnd={(event) => finishLightboxSwipe(event.changedTouches[0]?.clientX ?? 0)}
              >
                <img key={`lightbox-${selectedGallery[photoIndex]}`} src={selectedGallery[photoIndex]} alt={selectedCaptions[photoIndex]} />
                {selectedGallery.length > 1 && (
                  <>
                    <button className="mobile-lightbox-arrow previous" type="button" onClick={() => changePhoto(-1)} aria-label="Ảnh trước">‹</button>
                    <button className="mobile-lightbox-arrow next" type="button" onClick={() => changePhoto(1)} aria-label="Ảnh tiếp theo">›</button>
                  </>
                )}
              </div>
              <div className="mobile-lightbox-thumbnails" aria-label="Danh sách ảnh">
                {selectedGallery.map((photo, index) => (
                  <button type="button" key={`lightbox-thumb-${photo}`} className={photoIndex === index ? "active" : ""} onClick={() => setPhotoIndex(index)} aria-label={`Mở ảnh ${index + 1}`}>
                    <img src={photo} alt="" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {adminMode && showAdd && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeEditor}>
          <section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-title" onMouseDown={(e) => e.stopPropagation()}>
            <button className="close dark" onClick={closeEditor} aria-label="Đóng form">×</button>
            <p className="eyebrow"><span /> {editingSpot ? "Chỉnh sửa nhật ký" : "Nhật ký mới"}</p>
            <h2 id="add-title">{editingSpot ? "Chỉnh sửa bài review" : "Thêm một quán vừa ăn"}</h2>
            <p className="form-intro">{editingSpot ? "Cập nhật lại thông tin, ảnh và câu chuyện của quán." : "Ghi lại ngay khi hương vị vẫn còn mới nhé."}</p>
            <form className="add-form" onSubmit={handleSubmit} onPaste={handlePaste}>
              <label>Tên quán<input name="name" required maxLength={120} defaultValue={editingSpot?.name} placeholder="Ví dụ: Bếp Nhà" /></label>
              <div className="form-row">
                <label>Khu vực<input name="area" required maxLength={80} defaultValue={editingSpot?.area} placeholder="Hà Nội" /></label>
                <label className="rating-field">
                  <span className="rating-label-row">
                    <span>Điểm đánh giá</span>
                    <output htmlFor="rating-slider">{draftRating.toFixed(1)} ★</output>
                  </span>
                  <span className="rating-slider-wrap">
                    <span>1</span>
                    <input
                      id="rating-slider"
                      name="rating"
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={draftRating}
                      onChange={(event) => setDraftRating(Number(event.target.value))}
                      aria-label="Điểm đánh giá từ 1 đến 5"
                    />
                    <span>5</span>
                  </span>
                </label>
              </div>
              <label>Địa chỉ chi tiết<input name="address" required maxLength={240} defaultValue={editingSpot?.address} placeholder="Số nhà, tên đường, phường/xã..." /></label>
              <div className="form-row">
                <label>
                  <span className="category-field-heading"><span>Loại món</span><Link href="/admin/categories">Quản lý loại món ↗</Link></span>
                  <select
                    name="categoryId"
                    required
                    disabled={!managedCategories.length}
                    defaultValue={editingSpot?.categoryId ?? ""}
                  >
                    <option value="" disabled>
                      {categoriesLoaded ? "Chọn loại món" : "Đang tải loại món..."}
                    </option>
                    {managedCategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                  </select>
                  {categoriesLoaded && !managedCategories.length && (
                    <small className="category-empty-note">Chưa có loại món. Hãy tạo một loại món trước khi lưu bài.</small>
                  )}
                </label>
                <label>Mức giá<input name="priceLabel" required maxLength={40} defaultValue={editingSpot?.price} placeholder="Khoảng 85K/người" /></label>
              </div>
              <label>Ngày ghé quán<input name="visitedAt" type="date" required defaultValue={editingSpot?.date ?? new Date().toISOString().slice(0, 10)} /></label>
              <label>Mô tả ngắn<textarea name="excerpt" required maxLength={320} rows={2} defaultValue={editingSpot?.excerpt} placeholder="Một câu ngắn hiển thị trên trang chủ..." /></label>
              <label>Bài review<textarea name="content" required maxLength={8000} rows={6} defaultValue={editingSpot?.review} placeholder="Kể kỹ hơn về món ăn, không gian và trải nghiệm..." /></label>
              <label className="hashtag-field">
                Hashtag
                <input
                  name="hashtags"
                  maxLength={400}
                  defaultValue={editingSpot?.hashtags?.map((tag) => `#${tag}`).join(", ")}
                  placeholder="#bún riêu, #Hà Nội, #ăn sáng"
                />
                <small>Tối đa 10 hashtag, ngăn cách bằng dấu phẩy. Người đọc có thể nhập hashtag vào ô tìm kiếm.</small>
              </label>
              <label className="photo-upload">
                <span>Ảnh món ăn · từ 1 đến 5 ảnh</span>
                <input
                  name="photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (!selectImages(files)) {
                      event.target.value = "";
                    }
                  }}
                />
                <small>
                  {existingPhotos.length + selectedFiles.length
                    ? `Đang có ${existingPhotos.length + selectedFiles.length}/5 ảnh · có thể dán thêm bằng Ctrl+V`
                    : "Chọn ảnh từ máy hoặc copy ảnh ở nơi khác rồi nhấn Ctrl+V · tối đa 8 MB/ảnh"}
                </small>
              </label>
              {(existingPhotos.length > 0 || selectedPreviews.length > 0) && (
                <div className="photo-previews" aria-label="Ảnh sẽ đăng">
                  {existingPhotos.map((photo, index) => (
                    <div className="photo-preview" key={photo.objectKey}>
                      <figure>
                        <img src={photo.url} alt={photo.caption} />
                        <figcaption>{index + 1}</figcaption>
                        <button
                          type="button"
                          onClick={() => removeExistingPhoto(index)}
                          aria-label={`Bỏ ảnh ${index + 1}`}
                        >
                          ×
                        </button>
                      </figure>
                      <label>
                        <span>Caption ảnh {index + 1}</span>
                        <input
                          value={photo.caption}
                          onChange={(event) => setExistingPhotos((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, caption: event.target.value } : item))}
                          maxLength={240}
                          required
                          placeholder="Ví dụ: Bún riêu cua đặc biệt"
                        />
                      </label>
                    </div>
                  ))}
                  {selectedPreviews.map(({ file, url }, index) => (
                    <div className="photo-preview" key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
                      <figure>
                        <img src={url} alt={photoCaptions[index] || `Ảnh món ăn ${index + 1}`} />
                        <figcaption>{existingPhotos.length + index + 1}</figcaption>
                        <button
                          type="button"
                          onClick={() => removeNewPhoto(index)}
                          aria-label={`Bỏ ảnh ${existingPhotos.length + index + 1}`}
                        >
                          ×
                        </button>
                      </figure>
                      <label>
                        <span>Caption ảnh {existingPhotos.length + index + 1}</span>
                        <input
                          value={photoCaptions[index] ?? ""}
                          onChange={(event) => setPhotoCaptions((current) => current.map((caption, itemIndex) => itemIndex === index ? event.target.value : caption))}
                          maxLength={240}
                          required
                          placeholder="Ví dụ: Bún riêu cua đặc biệt"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              )}
              <section className="dish-editor" aria-labelledby="dish-editor-title">
                <div className="dish-editor-heading">
                  <span id="dish-editor-title">Menu món đã ăn</span>
                  <button
                    type="button"
                    onClick={() => setDraftDishes((current) => [...current, { name: "", photoIndex: 0 }])}
                    disabled={draftDishes.length >= 12}
                  >
                    ＋ Thêm món
                  </button>
                </div>
                <p>Mỗi món chọn một ảnh đại diện. Người đọc bấm món nào thì gallery sẽ chuyển tới ảnh đó.</p>
                <div className="dish-editor-list">
                  {draftDishes.map((dish, index) => (
                    <div className="dish-editor-row" key={dish.id ?? `draft-dish-${index}`}>
                      <label>
                        <span>Tên món {index + 1}</span>
                        <input
                          value={dish.name}
                          onChange={(event) => setDraftDishes((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))}
                          required
                          maxLength={120}
                          placeholder="Ví dụ: Bún riêu giò trứng"
                        />
                      </label>
                      <label>
                        <span>Ảnh minh họa</span>
                        <select
                          value={Math.min(dish.photoIndex, Math.max(formPhotoLabels.length - 1, 0))}
                          onChange={(event) => setDraftDishes((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, photoIndex: Number(event.target.value) } : item))}
                          required
                          disabled={!formPhotoLabels.length}
                        >
                          {!formPhotoLabels.length && <option value="0">Thêm ảnh trước</option>}
                          {formPhotoLabels.map((label, photoOptionIndex) => (
                            <option value={photoOptionIndex} key={`${photoOptionIndex}-${label}`}>Ảnh {photoOptionIndex + 1} · {label}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="remove-dish"
                        type="button"
                        onClick={() => setDraftDishes((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        disabled={draftDishes.length === 1}
                        aria-label={`Xóa món ${index + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              <div className="form-options">
                <label><input name="isFavorite" type="checkbox" defaultChecked={editingSpot?.favorite} /> Quán yêu thích</label>
                <label><input name="isFeatured" type="checkbox" defaultChecked={editingSpot?.featured} /> Đưa lên bài nổi bật</label>
              </div>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <button className="submit-button" type="submit" disabled={isSubmitting || saved || !managedCategories.length}>
                {saved
                  ? editingSpot ? "Đã cập nhật bài review ✓" : "Đã lưu vào nhật ký ✓"
                  : isSubmitting ? "Đang tải ảnh và lưu bài..."
                  : editingSpot ? "Cập nhật bài review" : "Lưu bài review"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return <FoodBlog />;
}
