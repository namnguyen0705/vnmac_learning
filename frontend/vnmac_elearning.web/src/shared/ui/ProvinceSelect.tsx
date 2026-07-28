import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProvinceOptions } from "../api/auth";

export function ProvinceSelect({ value, onChange, allowAll = false }: {
  value: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
}) {
  const query = useQuery({ queryKey: ["public", "provinces"], queryFn: getProvinceOptions });
  return (
    <Select value={value || (allowAll ? "all" : undefined)} onValueChange={(next) => onChange(next === "all" ? "" : next)}>
      <SelectTrigger className="h-11 rounded-2xl">
        <SelectValue placeholder="Chọn Tỉnh/Thành phố" />
      </SelectTrigger>
      <SelectContent>
        {allowAll ? <SelectItem value="all">Tất cả Tỉnh/Thành phố</SelectItem> : null}
        {(query.data ?? []).map((province) => <SelectItem key={province} value={province}>{province}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
