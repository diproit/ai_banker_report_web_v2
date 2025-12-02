import React from "react";
import { MaterialReactTable } from "material-react-table";

/**
 * Isolated table component that only re-renders when table-specific props change.
 * This prevents re-renders when parent state (like headings/footer) changes.
 */
const DataTableSection = React.memo(
  ({
    memoizedColumns,
    filteredData,
    tableData,
    displayColumnDefOptions,
    muiTableContainerProps,
    muiTableBodyRowProps,
    muiTablePaperProps,
    muiTableHeadCellProps,
    muiTableBodyCellProps,
    muiTableBodyProps,
    handleColumnOrderChange,
    handleColumnFiltersChange,
    handleSortingChange,
    handlePaginationChange,
    handleColumnVisibilityChange,
    tableState,
  }) => {
    console.log(
      "DataTableSection rendering with data length:",
      (filteredData || tableData)?.length
    );

    return (
      <div className="table-container">
        <MaterialReactTable
          columns={memoizedColumns}
          data={filteredData || tableData}
          enableStickyHeader={true}
          enableColumnResizing={true}
          enableColumnActions={false}
          enablePagination={true}
          enableColumnOrdering={true}
          enableColumnDragging={true}
          manualFiltering={true}
          manualPagination={false}
          manualSorting={false}
          enableColumnSorting={true}
          enableGlobalFilter={false}
          enableColumnFilters={false}
          enableBottomToolbar={true}
          enableTopToolbar={false}
          layoutMode="grid"
          displayColumnDefOptions={displayColumnDefOptions}
          columnResizeMode="fit"
          enableColumnResizeToFit={true}
          muiTableContainerProps={{
            ...muiTableContainerProps,
            sx: {
              ...muiTableContainerProps?.sx,
              maxHeight: "calc(100vh - 300px)",
            },
          }}
          muiTableBodyRowProps={{
            ...muiTableBodyRowProps,
            sx: {
              "& td": {
                padding: "6px 8px",
                fontSize: "12px",
                lineHeight: "1.4",
              },
              height: "36px",
            },
          }}
          muiTablePaperProps={{
            ...muiTablePaperProps,
            elevation: 0,
            sx: {
              ...muiTablePaperProps?.sx,
              boxShadow: "none",
              border: "1px solid #e5e7eb",
            },
          }}
          muiTableHeadCellProps={{
            ...muiTableHeadCellProps,
            sx: {
              padding: "8px 8px",
              fontSize: "12px",
              fontWeight: "600",
              backgroundColor: "#f9fafb",
              borderBottom: "2px solid #e5e7eb",
              lineHeight: "1.4",
              "& .Mui-TableHeadCell-Content": {
                fontSize: "12px",
                fontWeight: "600",
              },
              "& .Mui-TableHeadCell-Content-Wrapper": {
                fontSize: "12px",
              },
            },
          }}
          muiTableBodyCellProps={{
            ...muiTableBodyCellProps,
            sx: {
              padding: "6px 8px",
              fontSize: "12px",
              borderBottom: "1px solid #f3f4f6",
              lineHeight: "1.4",
            },
          }}
          muiTableBodyProps={{
            ...muiTableBodyProps,
            sx: {
              "& tr:hover": {
                backgroundColor: "#f9fafb",
              },
            },
          }}
          muiBottomToolbarProps={{
            sx: {
              minHeight: "48px",
              padding: "8px 16px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #e5e7eb",
              "& .MuiBox-root": {
                gap: "8px",
              },
              "& .MuiTablePagination-root": {
                fontSize: "12px",
              },
              "& .MuiTablePagination-selectLabel": {
                display: "none !important",
              },
              "& .MuiTablePagination-select": {
                display: "none !important",
              },
              "& .MuiTablePagination-selectIcon": {
                display: "none !important",
              },
              "& .MuiTablePagination-displayedRows": {
                fontSize: "12px",
                margin: 0,
              },
              "& .MuiIconButton-root": {
                padding: "4px",
              },
            },
          }}
          muiTablePaginationProps={{
            rowsPerPageOptions: [],
            showFirstButton: false,
            showLastButton: false,
            labelRowsPerPage: "",
          }}
          onColumnOrderChange={handleColumnOrderChange}
          onColumnFiltersChange={handleColumnFiltersChange}
          onSortingChange={handleSortingChange}
          onPaginationChange={handlePaginationChange}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          state={tableState}
        />
      </div>
    );
  }
);

export default DataTableSection;
