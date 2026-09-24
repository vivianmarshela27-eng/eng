export const formatRupiah = (value) => {
  if (value == null || value === "" || isNaN(value)) return "Rp 0";
  return "Rp " + Number(value).toLocaleString("id-ID");
};

export const formatDate = (s) => {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
};

export const HIDDEN = "*** (Akses Terbatas)";
