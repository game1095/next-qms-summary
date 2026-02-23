import re

with open("app/components/views/ComparisonView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# I will find the precise strings to split the file
# 1. start of activeTab === "chart" block
start_marker = '{/* --- Chart View (Executive Dashboard) --- */}'

# Let's find index
start_idx = content.find(start_marker)

# Then we find the end of the chart view
# The next section is {/* --- Detailed Table --- */}
end_marker = '{/* --- Detailed Table --- */}'
end_idx = content.find(end_marker)

chart_view_content = content[start_idx:end_idx]

# Let's split chart_view_content into its logical pieces:
# We know the markers:
marker_cards = "{/* Feature 1: Top Performers & Need Attention Cards */}"
marker_scatter_1_2 = "{/* Advanced Charts Grid */}"
marker_scatter_3 = "{/* Feature 4: Correlation Chart: Call Efficiency vs. Delivery Success */}"
marker_bar_123 = "{/* 1x3 Grid for Executive Charts */}"
marker_bar_45 = '<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">'

# Wait, let's just extract them precisely
# To ensure no missed brackets, we will use index slicing, since we know their order.

c1_start = chart_view_content.find(marker_cards)
c2_start = chart_view_content.find(marker_scatter_1_2)
c3_start = chart_view_content.find(marker_scatter_3)
c4_start = chart_view_content.find(marker_bar_123)
c5_start = chart_view_content.find(marker_bar_45)
# closing of chart view block
c_end = chart_view_content.find('      )}', c5_start)

cards_chunk = chart_view_content[c1_start:c2_start].strip()
scatters_1_2_chunk = chart_view_content[c2_start:c3_start].strip()
# remove the closing divs for the previous wrapper
wrapper_close_idx = chart_view_content.find('            </div>', c3_start)
wrap_end_idx = chart_view_content.find('          )}', wrapper_close_idx)

scatter_3_chunk = chart_view_content[c3_start:wrap_end_idx].strip()
bar_123_chunk = chart_view_content[c4_start:c5_start].strip()
bar_45_chunk = chart_view_content[c5_start:c_end].strip()

# Clean up scatter chunks (scatters 1,2 are in a 1x2 grid, we want to put 1,2,3 in a 1x3 grid)
# So let's extract the actual children of scatters_1_2_chunk
# Wait, scatters_1_2_chunk starts with:
# {/* Advanced Charts Grid */}
# <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
# We can regex out the wrapper and just get the two chart divs inside it.

new_chart_view = f'''{{/* --- Chart View (Executive Dashboard) --- */}}
      {{activeTab === "chart" && !isLoading && (
        <div className="flex flex-col gap-12 mb-8 slide-up delay-200">
          
          {{/* --- Section 1: Provincial Overview --- */}}
          {{comparisonList.length > 0 && (
            <div className="flex flex-col gap-6 slide-up delay-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner text-xl">📊</div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">สรุปภาพรวมรายพื้นที่ (Provincial Overview)</h2>
                  <p className="text-sm text-slate-500">เปรียบเทียบปริมาณงานและประสิทธิภาพในแต่ละเขตรับผิดชอบ</p>
                </div>
              </div>
              {bar_123_chunk}
            </div>
          )}}

          {{/* --- Section 2: Performance Rankings --- */}}
          {{comparisonList.length > 0 && (
            <div className="flex flex-col gap-6 slide-up delay-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner text-xl">🏆</div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">จัดอันดับการเปลี่ยนแปลง (Performance Rankings)</h2>
                  <p className="text-sm text-slate-500">พื้นที่ที่มีการพัฒนาและถดถอยมากที่สุดเมื่อเทียบกับอดีต</p>
                </div>
              </div>
              
              {cards_chunk}

              {bar_45_chunk}
            </div>
          )}}

          {{/* --- Section 3: Correlation Matrix --- */}}
          {{comparisonList.length > 0 && (
            <div className="flex flex-col gap-6 slide-up delay-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-inner text-xl">🧠</div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">วิเคราะห์ความสัมพันธ์เชิงลึก (Correlation Matrix)</h2>
                  <p className="text-sm text-slate-500">เจาะลึกความเชื่อมโยงระหว่างปริมาณงานและประสิทธิภาพ</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                 {scatters_1_2_chunk.replace('<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">', '').replace('{/* Advanced Charts Grid */}', '').rsplit('</div>', 1)[0].strip()}
                 
                 {scatter_3_chunk.replace('{/* Feature 4: Correlation Chart: Call Efficiency vs. Delivery Success */}', '{/* Feature 4 */}').strip()}
              </div>
            </div>
          )}}

        </div>
      )}}

      '''

# Write logic to assemble the new file content safely
new_content = content[:start_idx] + new_chart_view + content[end_idx:]

with open("app/components/views/ComparisonView.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("SUCCESS")
