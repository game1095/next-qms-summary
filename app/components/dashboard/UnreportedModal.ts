import React, { useEffect } from "react";
import Swal from "sweetalert2";
import { SummaryMetrics } from "../../types";

// This component uses SweetAlert2 directly as in the original code,
// but wrapped in a function to be called from the parent.
// In the original code, it was a function `handleShowUnreportedOffices`.
// Here we can keep it as a utility function or a component that helps trigger it.
// Since the original used Swal, we'll export a helper function instead of a component
// to maintain the exact same UI behavior (SweetAlert popup).

export const showUnreportedModal = (
  summaryKPIs: SummaryMetrics,
  unreportedListHTML: string,
) => {
  if (summaryKPIs.I === 0) {
    Swal.fire({
      icon: "success",
      title: "ยอดเยี่ยม!",
      text: "ไม่มีที่ทำการใดมียอดไม่รายงานผล (I)",
      timer: 2000,
      showConfirmButton: false,
    });
    return;
  }

  const htmlContent = `
      <div class="overflow-y-auto max-h-[60vh]">
        <table class="w-full text-sm">
          <thead class="bg-gray-100 text-gray-600 font-bold sticky top-0">
            <tr>
              <td class="text-left py-2 px-4">ที่ทำการ</td>
              <td class="text-right py-2 px-4">จำนวน (ชิ้น)</td>
            </tr>
          </thead>
          <tbody>${unreportedListHTML}</tbody>
        </table>
      </div>
    `;

  Swal.fire({
    title: `<span class="text-red-600 font-bold">⚠️ ที่ทำการไม่รายงานผล</span>`,
    html: htmlContent,
    width: 600,
    showCloseButton: true,
    focusConfirm: false,
    confirmButtonText: "ปิด",
  });
};
