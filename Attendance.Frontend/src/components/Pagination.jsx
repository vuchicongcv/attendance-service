export default function Pagination({ page, pageSize, totalCount, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="pagination">
      <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        &laquo; Trước
      </button>
      {start > 1 && (
        <>
          <button className="btn btn-sm btn-outline" onClick={() => onPageChange(1)}>1</button>
          {start > 2 && <span className="pagination-dots">...</span>}
        </>
      )}
      {pages.map(p => (
        <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`} onClick={() => onPageChange(p)}>
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="pagination-dots">...</span>}
          <button className="btn btn-sm btn-outline" onClick={() => onPageChange(totalPages)}>{totalPages}</button>
        </>
      )}
      <button className="btn btn-sm btn-outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Sau &raquo;
      </button>
      <span className="pagination-info">Tổng: {totalCount} bản ghi</span>
    </div>
  );
}
