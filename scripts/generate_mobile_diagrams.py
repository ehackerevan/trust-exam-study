"""從教材圖解擷取校訂後文字，產生可離線閱讀的 HTML/CSS 圖表。"""
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
    blocks = []
    def add_group(child):
        lines = []
        for element in child:
            if element.tag != SVG_NS + 'text':
                continue
            value = text_of(element)
            if value:
                lines.append({'text': value, 'emphasis': element.get('font-weight', '').isdigit()
                              and int(element.get('font-weight')) >= 600})
        if lines:
            blocks.append({'title': lines[0]['text'], 'lines': lines[1:]})
        for nested in child:
            if nested.tag == SVG_NS + 'g' and any(
                shape.tag in (SVG_NS + 'rect', SVG_NS + 'polygon') for shape in nested
            ):
                add_group(nested)

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
    return {'kind': LAYOUTS[svg_path.name], 'blocks': blocks}


LAYOUTS = {
    'chart_00_01.svg': 'classification',
    'chart_01_01.svg': 'flow',
    'chart_01_02.svg': 'classification',
    'chart_01_03.svg': 'decision',
    'chart_01_04.svg': 'decision',
    'chart_01_05.svg': 'flow',
    'chart_01_06.svg': 'compare',
    'chart_01_07.svg': 'flow',
    'chart_02_01.svg': 'classification',
    'chart_02_02.svg': 'compare',
    'chart_02_03.svg': 'compare',
    'chart_02_04.svg': 'flow',
    'chart_02_05.svg': 'flow',
    'chart_03_01.svg': 'flow',
    'chart_03_02.svg': 'timeline',
    'chart_03_03.svg': 'flow',
    'chart_03_04.svg': 'compare',
    'chart_03_05.svg': 'compare',
    'chart_04_01.svg': 'classification',
    'chart_04_02.svg': 'flow',
    'chart_04_03.svg': 'compare',
    'chart_05_01.svg': 'compare',
    'chart_05_02.svg': 'flow',
    'chart_05_03.svg': 'flow',
    'chart_05_04.svg': 'compare',
    'chart_05_05.svg': 'flow',
    'chart_06_01.svg': 'compare',
    'chart_06_02.svg': 'flow',
    'chart_06_03.svg': 'compare',
    'chart_06_04.svg': 'flow',
    'chart_06_05.svg': 'flow',
    'chart_07_01.svg': 'compare',
    'chart_07_02.svg': 'flow',
    'chart_07_03.svg': 'compare',
    'chart_07_04.svg': 'flow',
    'chart_08_01.svg': 'timeline',
    'chart_08_02.svg': 'compare',
    'chart_08_03.svg': 'flow',
}


references = set()
for markdown in MATERIAL.glob('*.md'):
    references.update(re.findall(r'images/(chart_[0-9_]+\.svg)', markdown.read_text()))

data = {name: diagram_data(ROOT / 'images' / name) for name in sorted(references)}
if len(data) != 38:
    raise ValueError(f'預期 38 張教材圖解，實際找到 {len(data)} 張')
if set(data) != set(LAYOUTS):
    raise ValueError('圖解排版設定未涵蓋全部教材圖')

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
    html = re.sub(r'\s*/\* ==================== 核心圖解卡片[\s\S]*?(?=\s*/\* topic-statistics:styles:start \*/)',
                  '\n', html, count=1)
    render_block = f'    // mobile-diagrams:renderer:start\n{renderer}\n    // mobile-diagrams:renderer:end'
    if '// mobile-diagrams:renderer:start' in html:
        html = re.sub(r'^[ \t]*// mobile-diagrams:renderer:start[\s\S]*?^[ \t]*// mobile-diagrams:renderer:end',
                      lambda _: render_block, html, count=1, flags=re.MULTILINE)
    else:
        html = html.replace('    const renderer = new marked.Renderer();',
                            render_block + '\n    const renderer = new marked.Renderer();', 1)
    image_renderer = '''    renderer.image = function(href, title, text) {
      return renderStudyDiagram(href, title || text || '圖解') || originalImageRenderer(href, title, text);
    };

'''
    html = re.sub(r'^[ \t]*renderer\.image = function\(href, title, text\) \{[\s\S]*?(?=    // 表格包裹器)',
                  lambda _: image_renderer, html, count=1, flags=re.MULTILINE)
    index.write_text(html)

print(f'已同步 {len(data)} 張 HTML/CSS 教材圖解至兩份網站。')
