import React from 'react'

export default function DetailTable({ title, data, columns }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-sm text-gray-500 text-center py-8">No data available</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-5">
      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{title}</h3>
      <div className="overflow-x-auto -mx-3 sm:-mx-4 lg:-mx-5 px-3 sm:px-4 lg:px-5">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="py-2 sm:py-2.5 lg:py-3 pr-3 sm:pr-4 lg:pr-5 text-[10px] sm:text-xs lg:text-sm font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {columns.map((column) => (
                  <td key={column.key} className="py-2 sm:py-2.5 lg:py-3 pr-3 sm:pr-4 lg:pr-5">
                    <span className="text-[10px] sm:text-xs lg:text-sm text-gray-700 whitespace-nowrap">
                      {row[column.key]}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

