with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = '<div class="modal-content glass-effect" style="max-width: 600px; text-align: left;">'
new_str = '<div class="modal-content glass-effect options-modal-content">'

# Also replace the old h1 margin (make it a bit smaller)
old_h1 = '<h1 style="text-align: center;" data-i18n="options_title">OPTIONS</h1>'
new_h1 = '<h1 style="text-align: center; margin-bottom: 16px;" data-i18n="options_title">OPTIONS</h1>'

if old_str in content:
    content = content.replace(old_str, new_str, 1)
    print('Step 1 OK: replaced modal class')
else:
    # Try to diagnose
    idx = content.find('options-modal')
    print('Step 1 FAIL, nearby content:')
    print(repr(content[idx:idx+300]))

content = content.replace(old_h1, new_h1, 1)

# Add tab bar + wrap sections into panels
# Find the options modal content start and rewrite the inner content
import re

# Pattern: everything between the h1 and the save-options-btn closing div
old_inner_pattern = r'(<h1[^>]*>OPTIONS</h1>\s*\n)(.*?)(\s*<div style="text-align: center; margin-top: 20px;">\s*\n\s*<button id="save-options-btn")'
new_inner = r'''\1
            <!-- Tab Bar -->
            <div class="options-tab-bar">
                <button class="options-tab active" data-tab="general" data-i18n="tab_general">일반</button>
                <button class="options-tab" data-tab="controls" data-i18n="tab_controls">조작</button>
                <button class="options-tab" data-tab="sound" data-i18n="tab_sound">사운드</button>
            </div>

            <!-- ── General Tab ── -->
            <div class="options-tab-panel active" id="tab-general">
                <div class="options-section">
                    <h3 data-i18n="opt_theme">테마 변경</h3>
                    <div class="audio-control-row">
                        <select id="theme-select" class="custom-input" style="width: 100%;">
                            <option value="dark"  data-i18n="theme_dark">다크 모드</option>
                            <option value="light" data-i18n="theme_light">라이트 모드</option>
                        </select>
                    </div>
                </div>
                <div class="options-section">
                    <h3 data-i18n="opt_language">언어 변경</h3>
                    <div class="audio-control-row">
                        <select id="language-select" class="custom-input" style="width: 100%;">
                            <option value="KR">한국</option>
                            <option value="US">USA</option>
                            <option value="JP">日本</option>
                            <option value="CN">中国</option>
                            <option value="GB">UK</option>
                            <option value="DE">Deutschland</option>
                            <option value="FR">France</option>
                            <option value="IT">Italia</option>
                            <option value="CA">Canada</option>
                            <option value="AU">Australia</option>
                            <option value="BR">Brasil</option>
                            <option value="IN">भारत</option>
                            <option value="RU">Россия</option>
                            <option value="MX">México</option>
                            <option value="ES">España</option>
                            <option value="ID">Indonesia</option>
                            <option value="NL">Nederland</option>
                            <option value="SA">السعودية</option>
                            <option value="TR">Türkiye</option>
                            <option value="CH">Schweiz</option>
                            <option value="SE">Sverige</option>
                            <option value="PL">Polska</option>
                            <option value="AR">Argentina</option>
                            <option value="BE">België</option>
                            <option value="TH">ไทย</option>
                            <option value="AT">Österreich</option>
                            <option value="IR">ایران</option>
                            <option value="AE">الإمارات</option>
                            <option value="NO">Norge</option>
                            <option value="IL">ישראל</option>
                            <option value="IE">Éire</option>
                            <option value="PH">Pilipinas</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- ── Controls Tab ── -->
            <div class="options-tab-panel" id="tab-controls">
                <div class="options-section">
                    <h3 data-i18n="opt_mode_change">모드 변경</h3>
                    <select id="shape-select" style="display:none">
                        <option value="default">default</option>
                        <option value="swapped">swapped</option>
                    </select>
                    <div class="mode-toggle-group">
                        <button class="mode-toggle-btn active" id="mode-btn-default" data-mode="default" data-i18n="shape_default">왼손: 네모 / 오른손: 세모</button>
                        <button class="mode-toggle-btn" id="mode-btn-swapped" data-mode="swapped" data-i18n="shape_swapped">왼손: 세모 / 오른손: 네모</button>
                    </div>
                </div>
                <div class="options-section">
                    <h3 data-i18n="opt_key_bind">키 변경</h3>
                    <div class="key-bind-group">
                        <div class="hand-keys" id="opt-left-container"></div>
                        <div class="hand-keys" id="opt-right-container"></div>
                    </div>
                </div>
            </div>

            <!-- ── Sound Tab ── -->
            <div class="options-tab-panel" id="tab-sound">
                <div class="options-section">
                    <h3 data-i18n="opt_audio">음악</h3>
                    <div class="audio-control-row">
                        <label data-i18n="opt_master_vol">전체 볼륨</label>
                        <input type="range" id="vol-master" min="0" max="1" step="0.01" value="1">
                        <button id="mute-master" class="mute-btn">🔊</button>
                    </div>
                    <div class="audio-control-row">
                        <label data-i18n="opt_sfx">효과음</label>
                        <input type="range" id="vol-sfx" min="0" max="1" step="0.01" value="1">
                        <button id="mute-sfx" class="mute-btn">🔊</button>
                    </div>
                    <div class="audio-control-row">
                        <label data-i18n="opt_bgm">배경음악</label>
                        <input type="range" id="vol-bgm" min="0" max="1" step="0.01" value="0.5">
                        <button id="mute-bgm" class="mute-btn">🔊</button>
                    </div>
                </div>
            </div>

            \3'''

result = re.sub(old_inner_pattern, new_inner, content, count=1, flags=re.DOTALL)
if result == content:
    print('Step 2 FAIL: inner pattern not matched, writing class-only fix')
else:
    content = result
    print('Step 2 OK: inserted tab structure')

# Fix save button margin
content = content.replace(
    '<div style="text-align: center; margin-top: 20px;">',
    '<div style="text-align: center; margin-top: 16px; flex-shrink: 0;">',
    1
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Saved index.html')
