// 앱 아이콘 렌더러 — index.html 파비콘(라임 단면 와이어프레임)과 동일한 자체 디자인을 1024px PNG로.
// 사용: swift make-icon.swift <출력.png>
import Cocoa

let size: CGFloat = 1024
let s = size / 100.0  // 파비콘 viewBox(100) → 1024 스케일

let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocusFlipped(true)

let bg = NSColor(red: 0x16 / 255.0, green: 0x19 / 255.0, blue: 0x0e / 255.0, alpha: 1)
let lime = NSColor(red: 0xC9 / 255.0, green: 0xF1 / 255.0, blue: 0x58 / 255.0, alpha: 1)
let paper = NSColor(red: 0xF2 / 255.0, green: 0xEF / 255.0, blue: 0xE3 / 255.0, alpha: 1)

// 배경 라운드 사각 (macOS 아이콘 그리드에 맞춰 약간 인셋)
let inset: CGFloat = size * 0.08
let rect = NSRect(x: inset, y: inset, width: size - inset * 2, height: size - inset * 2)
bg.setFill()
NSBezierPath(roundedRect: rect, xRadius: size * 0.185, yRadius: size * 0.185).fill()

func circle(cx: CGFloat, cy: CGFloat, r: CGFloat) -> NSBezierPath {
  NSBezierPath(ovalIn: NSRect(x: cx * s - r * s, y: cy * s - r * s, width: r * s * 2, height: r * s * 2))
}

// 라임 원판
lime.setFill()
circle(cx: 50, cy: 50, r: 34).fill()

// 안쪽 링 + 과육 칸막이 3선
paper.setStroke()
let ring = circle(cx: 50, cy: 50, r: 27)
ring.lineWidth = 3 * s
ring.stroke()
for (x1, y1, x2, y2): (CGFloat, CGFloat, CGFloat, CGFloat) in
  [(50, 23, 50, 77), (27, 36.5, 73, 63.5), (73, 36.5, 27, 63.5)] {
  let p = NSBezierPath()
  p.move(to: NSPoint(x: x1 * s, y: y1 * s))
  p.line(to: NSPoint(x: x2 * s, y: y2 * s))
  p.lineWidth = 3 * s
  p.stroke()
}

// 중심 씨
bg.setFill()
circle(cx: 50, cy: 50, r: 4.5).fill()

image.unlockFocus()

let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "icon.png"
guard let tiff = image.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff),
      let png = rep.representation(using: .png, properties: [:]) else {
  fatalError("PNG 인코딩 실패")
}
try! png.write(to: URL(fileURLWithPath: out))
print("아이콘 저장: \(out)")
