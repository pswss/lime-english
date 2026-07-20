// LIME.app — WKWebView 래퍼. 번들 Resources/web/의 SPA를 커스텀 스킴(lime://)으로 서빙.
// file://가 아닌 커스텀 스킴을 쓰는 이유: WKWebView의 file:// 오리진은 ES 모듈 임포트를
// CORS로 막는다. WKURLSchemeHandler는 Content-Type을 직접 지정할 수 있어 모듈이 정상 동작.
import Cocoa
import WebKit

final class SchemeHandler: NSObject, WKURLSchemeHandler {
  static let mime: [String: String] = [
    "html": "text/html", "js": "text/javascript", "mjs": "text/javascript",
    "css": "text/css", "json": "application/json", "svg": "image/svg+xml",
    "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp",
    "woff": "font/woff", "woff2": "font/woff2", "ico": "image/x-icon",
    "mp3": "audio/mpeg", "wav": "audio/wav", "txt": "text/plain",
  ]

  func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
    guard let url = task.request.url else { return }
    var path = url.path
    if path.isEmpty || path == "/" { path = "/index.html" }

    // 에러 비컨(POST /__err)은 로컬 앱에선 수집 안 함 — 조용히 204
    if path == "/__err" {
      finish(task, url: url, status: 204, mime: nil, data: Data())
      return
    }

    guard !path.contains(".."),
          let root = Bundle.main.resourceURL?.appendingPathComponent("web"),
          let data = try? Data(contentsOf: root.appendingPathComponent(String(path.dropFirst())))
    else {
      finish(task, url: url, status: 404, mime: nil, data: Data())
      return
    }
    let ext = (path as NSString).pathExtension.lowercased()
    finish(task, url: url, status: 200, mime: Self.mime[ext] ?? "application/octet-stream", data: data)
  }

  func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

  private func finish(_ task: WKURLSchemeTask, url: URL, status: Int, mime: String?, data: Data) {
    var headers = ["Content-Length": String(data.count), "Cache-Control": "no-store"]
    if let mime { headers["Content-Type"] = mime }
    let resp = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers)!
    task.didReceive(resp)
    if !data.isEmpty { task.didReceive(data) }
    task.didFinish()
  }
}

// localStorage 영속 브리지 — WebKit은 커스텀 스킴 오리진의 localStorage를 디스크에
// 남기지 않는다(실측: 정상 종료 후에도 WebsiteData/LocalStorage 비어 있음). 진행도
// (duo.profile.v1)가 날아가므로, documentStart에서 localStorage를 파일 기반 심으로
// 교체하고 변경분을 네이티브로 받아 Application Support에 저장한다.
final class StoreHandler: NSObject, WKScriptMessageHandler {
  static let file: URL = {
    let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("LIME", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir.appendingPathComponent("localStorage.json")
  }()

  static func loadInitialJSON() -> String {
    guard let data = try? Data(contentsOf: file),
          (try? JSONSerialization.jsonObject(with: data)) is [String: Any],
          let text = String(data: data, encoding: .utf8)
    else { return "{}" }  // 없거나 손상 → 빈 저장소로 시작
    return text
  }

  func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
    guard let body = message.body as? String, let data = body.data(using: .utf8) else { return }
    try? data.write(to: Self.file, options: .atomic)
  }
}

func storageShimScript() -> WKUserScript {
  let source = """
  (() => {
    const data = new Map(Object.entries(\(StoreHandler.loadInitialJSON())));
    const flush = () => {
      try { webkit.messageHandlers.store.postMessage(JSON.stringify(Object.fromEntries(data))); } catch (e) {}
    };
    const shim = {
      getItem: k => data.has(String(k)) ? data.get(String(k)) : null,
      setItem: (k, v) => { data.set(String(k), String(v)); flush(); },
      removeItem: k => { data.delete(String(k)); flush(); },
      clear: () => { data.clear(); flush(); },
      key: i => [...data.keys()][i] ?? null,
      get length() { return data.size; },
    };
    Object.defineProperty(window, 'localStorage', { value: shim });
  })();
  """
  return WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
}

final class AppDelegate: NSObject, NSApplicationDelegate {
  var window: NSWindow!
  var webView: WKWebView!

  func applicationDidFinishLaunching(_ note: Notification) {
    let config = WKWebViewConfiguration()
    config.setURLSchemeHandler(SchemeHandler(), forURLScheme: "lime")
    config.mediaTypesRequiringUserActionForPlayback = []  // 효과음·TTS 자동 재생 허용
    config.userContentController.addUserScript(storageShimScript())
    config.userContentController.add(StoreHandler(), name: "store")

    webView = WKWebView(frame: .zero, configuration: config)
    webView.underPageBackgroundColor = NSColor(red: 0x16 / 255.0, green: 0x19 / 255.0, blue: 0x0e / 255.0, alpha: 1)

    window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 1240, height: 840),
      styleMask: [.titled, .closable, .miniaturizable, .resizable],
      backing: .buffered, defer: false)
    window.title = "라임 LIME"
    window.minSize = NSSize(width: 900, height: 620)
    window.backgroundColor = webView.underPageBackgroundColor
    window.contentView = webView
    window.center()
    window.setFrameAutosaveName("LIMEMainWindow")
    window.makeKeyAndOrderFront(nil)

    webView.load(URLRequest(url: URL(string: "lime://app/index.html")!))
  }

  func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }
}

// 최소 메뉴 — Cmd+Q/W, 편집(복사·붙여넣기: 타이핑 문제에 필요)
func buildMenu() -> NSMenu {
  let main = NSMenu()

  let appItem = NSMenuItem()
  let appMenu = NSMenu()
  appMenu.addItem(withTitle: "라임 숨기기", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
  appMenu.addItem(NSMenuItem.separator())
  appMenu.addItem(withTitle: "라임 종료", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
  appItem.submenu = appMenu
  main.addItem(appItem)

  let editItem = NSMenuItem()
  let editMenu = NSMenu(title: "편집")
  editMenu.addItem(withTitle: "실행 취소", action: Selector(("undo:")), keyEquivalent: "z")
  editMenu.addItem(withTitle: "잘라내기", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
  editMenu.addItem(withTitle: "복사", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
  editMenu.addItem(withTitle: "붙여넣기", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
  editMenu.addItem(withTitle: "모두 선택", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
  editItem.submenu = editMenu
  main.addItem(editItem)

  let windowItem = NSMenuItem()
  let windowMenu = NSMenu(title: "윈도우")
  windowMenu.addItem(withTitle: "닫기", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
  windowMenu.addItem(withTitle: "최소화", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
  windowItem.submenu = windowMenu
  main.addItem(windowItem)

  return main
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.mainMenu = buildMenu()
app.activate(ignoringOtherApps: true)
app.run()
