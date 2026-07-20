#!/bin/zsh
# LIME.app + DMG 빌드
# 사용: ./packaging/build-dmg.sh   (저장소 루트 기준 어디서 실행해도 됨)
# 산출: packaging/build/LIME.app, packaging/build/LIME.dmg
set -e
cd "$(dirname "$0")"
ROOT=$(cd .. && pwd)
BUILD=build
APP=$BUILD/LIME.app

rm -rf "$BUILD"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/web"

# 1) 웹 자산 복사 (서버·패키징·문서 제외)
cp "$ROOT/index.html" "$ROOT/styles.css" "$APP/Contents/Resources/web/"
cp -R "$ROOT/src" "$APP/Contents/Resources/web/src"

# 2) 아이콘
swift make-icon.swift "$BUILD/icon-1024.png"
ICONSET=$BUILD/AppIcon.iconset
mkdir -p "$ICONSET"
for sz in 16 32 128 256 512; do
  sips -z $sz $sz "$BUILD/icon-1024.png" --out "$ICONSET/icon_${sz}x${sz}.png" >/dev/null
  sips -z $((sz*2)) $((sz*2)) "$BUILD/icon-1024.png" --out "$ICONSET/icon_${sz}x${sz}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"

# 3) Info.plist
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>LIME</string>
  <key>CFBundleIdentifier</key><string>com.pysw.lime.app</string>
  <key>CFBundleName</key><string>LIME</string>
  <key>CFBundleDisplayName</key><string>라임 LIME</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>© 2026 pysw</string>
</dict>
</plist>
PLIST

# 4) 유니버설 바이너리 (Apple Silicon + Intel)
swiftc -O main.swift -o "$BUILD/LIME-arm64" -target arm64-apple-macosx12.0 -framework Cocoa -framework WebKit
swiftc -O main.swift -o "$BUILD/LIME-x86_64" -target x86_64-apple-macosx12.0 -framework Cocoa -framework WebKit
lipo -create "$BUILD/LIME-arm64" "$BUILD/LIME-x86_64" -output "$APP/Contents/MacOS/LIME"

# 5) ad-hoc 서명 (배포 공증 아님 — 다른 맥에선 우클릭→열기 필요)
xattr -cr "$APP"   # 복사된 파일의 quarantine 등 확장 속성 제거 (있으면 서명 거부됨)
codesign --force --deep -s - "$APP"

# 6) DMG (끌어넣기용 /Applications 심링크 포함)
STAGE=$BUILD/dmg-stage
mkdir -p "$STAGE"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname "LIME" -srcfolder "$STAGE" -ov -format UDZO "$BUILD/LIME.dmg" >/dev/null

echo "완료: $(cd "$BUILD" && pwd)/LIME.dmg"
