const postDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Ho_Chi_Minh",
});

export type FormattedPostDate = {
  dateTime: string;
  label: string;
};

export function formatPostDate(value: string | null | undefined): FormattedPostDate | null {
  if (!value) return null;

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;

  const parts = Object.fromEntries(
    postDateFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    dateTime: date.toISOString(),
    label: `${parts.day}.${parts.month}.${parts.year} · ${parts.hour}:${parts.minute}`,
  };
}
