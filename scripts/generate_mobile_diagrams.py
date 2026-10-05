"""從教材 SVG 的節點位置與文字產生手機互動導覽，嵌入兩份離線網站。"""
import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
MATERIAL = ROOT / '信託業務人員重點教材'
SVG_NS = '{http://www.w3.org/2000/svg}'


def text_of(element):
    return ''.join(element.itertext()).strip()


def diagram_data(svg_path):
    root = ET.parse(svg_path).getroot()
    _, _, view_width, view_height = (float(value) for value in root.get('viewBox').split())
    blocks = []
    def add_group(child, parent_x=0, parent_y=0):
        lines = []
        for element in child:
            if element.tag != SVG_NS + 'text':
                continue
            value = text_of(element)
            if value:
                lines.append({'text': value, 'emphasis': element.get('font-weight', '').isdigit()
                              and int(element.get('font-weight')) >= 600})
        transform = re.fullmatch(r'translate\(([\d.]+)[, ]+([\d.]+)\)', child.get('transform', ''))
        if not transform:
            raise ValueError(f'{svg_path.name} 節點位置格式無法判讀')
        local_x, local_y = map(float, transform.groups())
        x, y = parent_x + local_x, parent_y + local_y
        shape = next(shape for shape in child if shape.tag in (SVG_NS + 'rect', SVG_NS + 'polygon'))
        if shape.tag == SVG_NS + 'rect':
            x += float(shape.get('x', 0))
            y += float(shape.get('y', 0))
            width = float(shape.get('width'))
            height = float(shape.get('height'))
        else:
            points = [tuple(map(float, pair.split(','))) for pair in shape.get('points').split()]
            min_x, max_x = min(p[0] for p in points), max(p[0] for p in points)
            min_y, max_y = min(p[1] for p in points), max(p[1] for p in points)
            x += min_x
            y += min_y
            width, height = max_x - min_x, max_y - min_y
        if lines:
            blocks.append({'title': lines[0]['text'], 'lines': lines[1:],
                           'bounds': [x, y, width, height]})
        for nested in child:
            if nested.tag == SVG_NS + 'g' and any(
                shape.tag in (SVG_NS + 'rect', SVG_NS + 'polygon') for shape in nested
            ):
                add_group(nested, parent_x + local_x, parent_y + local_y)

    for child in root:
        if child.tag == SVG_NS + 'g' and any(
            shape.tag in (SVG_NS + 'rect', SVG_NS + 'polygon') for shape in child
        ):
            add_group(child)

    # 兩張圖另有寫在圖形外的關係標籤，補入相應節點以保留流程意義。
    if svg_path.name == 'chart_01_01.svg':
        blocks[0]['relation'] = '移轉財產權 → 受託人'
        blocks[1]['relation'] = '管理處分 → 受益人'
        blocks[2]['relation'] = '信託財產由受託人管理'
    elif svg_path.name == 'chart_01_04.svg':
        blocks[1]['relation'] = '一般債務：原則不得強制執行'
        blocks[2]['relation'] = '法定例外：依信託法第 12 條判斷'
    if not blocks:
        raise ValueError(f'{svg_path.name} 缺少可顯示的圖解文字')
    return {'size': [view_width, view_height], 'blocks': blocks}


references = set()
for markdown in MATERIAL.glob('*.md'):
    references.update(re.findall(r'images/(chart_[0-9_]+\.svg)', markdown.read_text()))

data = {name: diagram_data(ROOT / 'images' / name) for name in sorted(references)}
if len(data) != 38:
    raise ValueError(f'預期 38 張教材圖解，實際找到 {len(data)} 張')

payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
styles = (ROOT / 'scripts' / 'mobile_diagrams.css').read_text().rstrip()
renderer = (ROOT / 'scripts' / 'mobile_diagrams.js').read_text().rstrip()
for directory in (ROOT, MATERIAL):
    index = directory / 'index.html'
    html = index.read_text()
    declaration = f'const mobileDiagramData = {payload};'
    if re.search(r'const mobileDiagramData = .*?;', html):
        html = re.sub(r'const mobileDiagramData = .*?;', lambda _: declaration, html, count=1)
    else:
        html = html.replace('const courseData = ', declaration + '\nconst courseData = ', 1)
    style_block = f'    /* mobile-diagrams:styles:start */\n{styles}\n    /* mobile-diagrams:styles:end */'
    if '/* mobile-diagrams:styles:start */' in html:
        html = re.sub(r'^[ \t]*/\* mobile-diagrams:styles:start \*/[\s\S]*?^[ \t]*/\* mobile-diagrams:styles:end \*/',
                      lambda _: style_block, html, count=1, flags=re.MULTILINE)
    else:
        html = html.replace('  </style>', style_block + '\n  </style>', 1)
    html = re.sub(
        r'\s*/\* 手機/平板響應式優化（寬度 <= 768px） \*/[\s\S]*?(?=\s*/\* topic-statistics:styles:start \*/)',
        '\n', html, count=1,
    )
    render_block = f'    // mobile-diagrams:renderer:start\n{renderer}\n    // mobile-diagrams:renderer:end'
    if '// mobile-diagrams:renderer:start' in html:
        html = re.sub(r'^[ \t]*// mobile-diagrams:renderer:start[\s\S]*?^[ \t]*// mobile-diagrams:renderer:end',
                      lambda _: render_block, html, count=1, flags=re.MULTILINE)
    else:
        html = html.replace('    const renderer = new marked.Renderer();',
                            render_block + '\n    const renderer = new marked.Renderer();', 1)
    html = html.replace('👈 手機左右滑動看清全圖 👉', '手機版逐項閱讀')
    html = html.replace('手機版逐項閱讀', '點圖選區塊看重點')
    if '${renderMobileDiagram(encodedHref, rawTitle)}' not in html:
        html = html.replace('          <div class="diagram-card-canvas" onclick=',
                            '          ${renderMobileDiagram(encodedHref, rawTitle)}\n          <div class="diagram-card-canvas" onclick=', 1)
    html = html.replace('🔍 全螢幕放大檢視', '🔍 查看完整架構圖')
    index.write_text(html)

print(f'已同步 {len(data)} 張圖解的手機互動導覽資料至兩份網站。')
