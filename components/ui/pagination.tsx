import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showSizeChanger?: boolean;
  showTotal?: (total: number) => string;
}

export function Pagination({
  current,
  total,
  pageSize,
  onChange,
  onPageSizeChange,
  showSizeChanger = true,
  showTotal,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);

  const handlePageSizeChange = (value: string) => {
    const newPageSize = parseInt(value);
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  return (
    <div className="flex items-center justify-between mt-8">
      <div className="flex items-center gap-2">
        {showTotal && <span className="text-sm text-gray-500">{showTotal(total)}</span>}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(current - 1)}
          disabled={current === 1}
        >
          上一页
        </Button>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={current === page ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(page)}
            >
              {page}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(current + 1)}
          disabled={current === totalPages}
        >
          下一页
        </Button>
        {showSizeChanger && (
          <Select
            value={pageSize.toString()}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10条/页</SelectItem>
              <SelectItem value="20">20条/页</SelectItem>
              <SelectItem value="50">50条/页</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
} 